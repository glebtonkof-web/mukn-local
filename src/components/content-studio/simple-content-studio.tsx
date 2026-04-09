'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Video, 
  Image as ImageIcon, 
  Loader2, 
  Download, 
  Play, 
  Zap, 
  CheckCircle, 
  XCircle,
  Sparkles,
  RefreshCw,
  Copy,
  ExternalLink,
  Mic,
  Headphones,
  Volume2
} from 'lucide-react';
import { toast } from 'sonner';

// ============== Types ==============
interface VideoTask {
  taskId: string;
  videoTaskId: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  duration: number;
  provider: string;
  createdAt: Date;
}

interface GeneratedImage {
  id: string;
  url: string;
  width: number;
  height: number;
  prompt: string;
}

interface Voice {
  id: string;
  name: string;
  description: string;
}

// ============== Video Prompts Library ==============
const VIDEO_PROMPTS = [
  'A cinematic aerial shot of tropical islands at golden hour, drone footage',
  'Ocean waves crashing on rocky cliffs at sunset, slow motion',
  'Northern lights dancing over snowy mountains, time lapse',
  'A mysterious forest with sunlight filtering through ancient trees',
  'Futuristic city skyline at night with flying cars and neon lights',
  'Abstract fluid art with gold and blue colors morphing smoothly',
  'A peaceful Japanese garden with cherry blossoms falling',
  'Space journey through colorful nebula and stars',
];

// ============== Main Component ==============
export function SimpleContentStudio() {
  // Video state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoDuration, setVideoDuration] = useState('5');
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  const [videoQuality, setVideoQuality] = useState<'speed' | 'quality'>('quality');
  const [videoWithAudio, setVideoWithAudio] = useState(false);
  const [videoTask, setVideoTask] = useState<VideoTask | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  // Image state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('cinematic');
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // TTS state
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('tongtong');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([
    { id: 'tongtong', name: 'Тонгтонг', description: 'Тёплый' },
    { id: 'chuichui', name: 'Чуйчуй', description: 'Живой' },
    { id: 'xiaochen', name: 'Сяочен', description: 'Профессиональный' },
    { id: 'jam', name: 'Джем', description: 'Английский' },
  ]);

  // Random prompt generator
  const generateRandomPrompt = useCallback(() => {
    const randomPrompt = VIDEO_PROMPTS[Math.floor(Math.random() * VIDEO_PROMPTS.length)];
    setVideoPrompt(randomPrompt);
    toast.success('Случайный промпт выбран');
  }, []);

  // Video generation
  const generateVideo = async () => {
    if (!videoPrompt.trim()) {
      toast.error('Введите промпт для генерации');
      return;
    }

    setIsGenerating(true);
    setVideoTask(null);

    try {
      const response = await fetch('/api/content-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          duration: parseInt(videoDuration),
          aspect_ratio: videoAspectRatio,
          quality: videoQuality,
          with_audio: videoWithAudio,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVideoTask({
          taskId: data.task_id,
          videoTaskId: data.video_task_id,
          prompt: videoPrompt,
          status: 'processing',
          progress: 0,
          duration: data.duration,
          provider: data.provider_name,
          createdAt: new Date(),
        });
        
        toast.success('Генерация видео запущена!');
        
        // Start polling
        pollVideoStatus(data.task_id, data.video_task_id);
      } else {
        toast.error(data.error || 'Ошибка создания задачи');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Poll video status
  const pollVideoStatus = async (taskId: string, videoTaskId: string) => {
    setPollingActive(true);
    const maxPolls = 120; // 10 minutes
    const pollInterval = 5000; // 5 seconds

    for (let i = 0; i < maxPolls; i++) {
      try {
        const response = await fetch(`/api/content-studio/generate?task_id=${taskId}&video_task_id=${videoTaskId}`);
        const data = await response.json();

        if (data.status === 'completed' && data.video_url) {
          setVideoTask(prev => prev ? {
            ...prev,
            status: 'completed',
            videoUrl: data.video_url,
            progress: 100,
          } : null);
          toast.success('Видео готово!');
          setPollingActive(false);
          return;
        }

        if (data.status === 'failed') {
          setVideoTask(prev => prev ? { ...prev, status: 'failed' } : null);
          toast.error('Ошибка генерации видео');
          setPollingActive(false);
          return;
        }

        // Update progress
        const progress = Math.min(95, Math.round((i / maxPolls) * 100));
        setVideoTask(prev => prev ? { ...prev, progress } : null);

      } catch (error) {
        console.error('Polling error:', error);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    toast.info('Генерация занимает больше времени. Проверьте статус позже.');
    setPollingActive(false);
  };

  // Image generation
  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Введите промпт для изображения');
      return;
    }

    setIsGeneratingImage(true);
    setGeneratedImages([]);

    try {
      const response = await fetch('/api/content-studio/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          style: imageStyle,
          aspect_ratio: imageAspectRatio,
          count: 1,
        }),
      });

      const data = await response.json();

      if (data.success && data.images) {
        setGeneratedImages(data.images);
        toast.success('Изображение сгенерировано!');
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
      console.error(error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // TTS generation
  const generateTTS = async () => {
    if (!ttsText.trim()) {
      toast.error('Введите текст для озвучки');
      return;
    }

    if (ttsText.length > 1024) {
      toast.error('Текст слишком длинный (максимум 1024 символа)');
      return;
    }

    setIsGeneratingTTS(true);
    setTtsAudioUrl(null);

    try {
      const response = await fetch('/api/content-studio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText,
          voice: ttsVoice,
          speed: ttsSpeed,
          format: 'wav',
        }),
      });

      if (response.ok) {
        // Get audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        setTtsAudioUrl(audioUrl);
        toast.success('Аудио сгенерировано!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
      console.error(error);
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  // Download helper
  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Загрузка началась');
  };

  // Copy prompt
  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Content Studio
          </h2>
          <p className="text-muted-foreground">Генерация видео, изображений и аудио с помощью AI</p>
        </div>
        <Button variant="outline" onClick={generateRandomPrompt} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Случайный промпт
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="video" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="video" className="gap-2">
            <Video className="h-4 w-4" />
            Видео
          </TabsTrigger>
          <TabsTrigger value="image" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Картинки
          </TabsTrigger>
          <TabsTrigger value="audio" className="gap-2">
            <Headphones className="h-4 w-4" />
            Аудио
          </TabsTrigger>
        </TabsList>

        {/* Video Tab */}
        <TabsContent value="video" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Генерация видео
                </CardTitle>
                <CardDescription>
                  Введите описание и получите AI-сгенерированное видео
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prompt */}
                <div className="space-y-2">
                  <Label>Промпт (описание видео)</Label>
                  <Textarea
                    placeholder="Опишите видео, которое хотите создать..."
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Settings Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Длительность</Label>
                    <Select value={videoDuration} onValueChange={setVideoDuration}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 сек</SelectItem>
                        <SelectItem value="10">10 сек</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Формат</Label>
                    <Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
                        <SelectItem value="9:16">9:16 (TikTok)</SelectItem>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Качество</Label>
                    <Select value={videoQuality} onValueChange={(v) => setVideoQuality(v as 'speed' | 'quality')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="speed">Быстро</SelectItem>
                        <SelectItem value="quality">Качество</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <Button 
                  onClick={generateVideo} 
                  disabled={isGenerating || pollingActive || !videoPrompt.trim()} 
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  {isGenerating || pollingActive ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Video className="h-5 w-5 mr-2" />
                      Сгенерировать видео
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Result Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {videoTask?.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : videoTask?.status === 'failed' ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : videoTask?.status === 'processing' ? (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5 text-muted-foreground" />
                  )}
                  Результат
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!videoTask ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Video className="h-16 w-16 mb-4 opacity-30" />
                    <p>Введите промпт и нажмите "Сгенерировать"</p>
                    <p className="text-sm mt-1">Видео появится здесь</p>
                  </div>
                ) : videoTask.status === 'processing' ? (
                  <div className="space-y-4 py-8">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                      <div>
                        <p className="font-medium">Генерация видео...</p>
                        <p className="text-sm text-muted-foreground">
                          Это может занять 2-5 минут
                        </p>
                      </div>
                    </div>
                    <Progress value={videoTask.progress} className="h-2" />
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{videoTask.provider}</Badge>
                      <Badge variant="outline">{videoTask.duration} сек</Badge>
                    </div>
                  </div>
                ) : videoTask.status === 'completed' && videoTask.videoUrl ? (
                  <div className="space-y-4">
                    <video 
                      src={videoTask.videoUrl} 
                      controls 
                      className="w-full rounded-lg bg-black"
                      style={{ maxHeight: '400px' }}
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => downloadFile(videoTask.videoUrl!, `video_${videoTask.taskId}.mp4`)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Скачать
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => window.open(videoTask.videoUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{videoTask.provider}</Badge>
                      <Badge variant="outline">{videoTask.duration} сек</Badge>
                      <Badge className="bg-green-500/20 text-green-500">Готово</Badge>
                    </div>
                  </div>
                ) : videoTask.status === 'failed' ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <XCircle className="h-16 w-16 text-red-500 mb-4" />
                    <p className="font-medium text-red-500">Ошибка генерации</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Попробуйте другой промпт или повторите попытку
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Image Tab */}
        <TabsContent value="image" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-blue-500" />
                  Генерация изображений
                </CardTitle>
                <CardDescription>
                  Создайте уникальное изображение по текстовому описанию
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prompt */}
                <div className="space-y-2">
                  <Label>Промпт (описание изображения)</Label>
                  <Textarea
                    placeholder="Опишите изображение, которое хотите создать..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Settings Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Стиль</Label>
                    <Select value={imageStyle} onValueChange={setImageStyle}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cinematic">Кинематографичный</SelectItem>
                        <SelectItem value="realistic">Реалистичный</SelectItem>
                        <SelectItem value="anime">Аниме</SelectItem>
                        <SelectItem value="fantasy">Фэнтези</SelectItem>
                        <SelectItem value="scifi">Sci-Fi</SelectItem>
                        <SelectItem value="portrait">Портрет</SelectItem>
                        <SelectItem value="landscape">Пейзаж</SelectItem>
                        <SelectItem value="artistic">Художественный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Формат</Label>
                    <Select value={imageAspectRatio} onValueChange={setImageAspectRatio}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        <SelectItem value="16:9">16:9 (Wide)</SelectItem>
                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                        <SelectItem value="4:5">4:5 (Instagram)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <Button 
                  onClick={generateImage} 
                  disabled={isGeneratingImage || !imagePrompt.trim()} 
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5 mr-2" />
                      Сгенерировать изображение
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Result Card */}
            <Card>
              <CardHeader>
                <CardTitle>Результат</CardTitle>
              </CardHeader>
              <CardContent>
                {generatedImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <ImageIcon className="h-16 w-16 mb-4 opacity-30" />
                    <p>Изображение появится здесь</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedImages.map((img) => (
                      <div key={img.id} className="space-y-3">
                        <img 
                          src={img.url} 
                          alt={img.prompt}
                          className="w-full rounded-lg"
                          style={{ maxHeight: '400px', objectFit: 'contain' }}
                        />
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = img.url;
                              a.download = `image_${img.id}.png`;
                              a.click();
                            }}
                            className="flex-1"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Скачать
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => copyPrompt(img.prompt)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline">{img.width}×{img.height}</Badge>
                          <Badge variant="secondary">{imageStyle}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audio Tab */}
        <TabsContent value="audio" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-green-500" />
                  Text-to-Speech
                </CardTitle>
                <CardDescription>
                  Преобразуйте текст в естественную речь
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Text */}
                <div className="space-y-2">
                  <Label>Текст для озвучки (макс. 1024 символов)</Label>
                  <Textarea
                    placeholder="Введите текст, который нужно озвучить..."
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {ttsText.length}/1024
                  </p>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Голос</Label>
                    <Select value={ttsVoice} onValueChange={setTtsVoice}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {voices.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Скорость: {ttsSpeed.toFixed(1)}x</Label>
                    <Slider
                      value={[ttsSpeed]}
                      onValueChange={([v]) => setTtsSpeed(v)}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <Button 
                  onClick={generateTTS} 
                  disabled={isGeneratingTTS || !ttsText.trim() || ttsText.length > 1024} 
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  {isGeneratingTTS ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-5 w-5 mr-2" />
                      Сгенерировать аудио
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Result Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-purple-500" />
                  Результат
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!ttsAudioUrl ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Headphones className="h-16 w-16 mb-4 opacity-30" />
                    <p>Аудио появится здесь</p>
                    <p className="text-sm mt-1">Введите текст и нажмите "Сгенерировать"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <audio 
                      src={ttsAudioUrl} 
                      controls 
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => downloadFile(ttsAudioUrl, `tts_${Date.now()}.wav`)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Скачать WAV
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{voices.find(v => v.id === ttsVoice)?.name}</Badge>
                      <Badge variant="outline">{ttsSpeed.toFixed(1)}x</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SimpleContentStudio;

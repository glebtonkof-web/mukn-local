'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Image as ImageIcon,
  Video,
  Music,
  Type,
  Languages,
  Droplet,
  Workflow,
  Sparkles,
  Loader2,
  Download,
  Copy,
  Trash2,
  Wand2,
} from 'lucide-react';

interface GeneratedContent {
  id: string;
  type: 'image' | 'video' | 'audio' | 'text';
  data: any;
  timestamp: Date;
}

export function ContentStudioPanel() {
  const [activeTab, setActiveTab] = useState('image');
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [progress, setProgress] = useState(0);

  // Image state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('cinematic');
  const [imageRatio, setImageRatio] = useState('1:1');
  const [imageCount, setImageCount] = useState(1);

  // Video state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoDuration, setVideoDuration] = useState('10');
  const [videoProvider, setVideoProvider] = useState('auto');

  // Audio state
  const [audioText, setAudioText] = useState('');
  const [audioType, setAudioType] = useState<'tts' | 'music'>('tts');
  const [audioVoice, setAudioVoice] = useState('ru-RU-SvetlanaNeural');
  const [musicStyle, setMusicStyle] = useState('chill');

  // Text state
  const [textPrompt, setTextPrompt] = useState('');
  const [textType, setTextType] = useState('article');
  const [textTone, setTextTone] = useState('casual');
  const [textLength, setTextLength] = useState('medium');

  // Translate state
  const [translateText, setTranslateText] = useState('');
  const [sourceLang, setSourceLang] = useState('ru');
  const [targetLang, setTargetLang] = useState('en');

  // Watermark state
  const [watermarkPath, setWatermarkPath] = useState('');
  const [watermarkType, setWatermarkType] = useState<'image' | 'video'>('image');
  const [removalMethod, setRemovalMethod] = useState('auto');

  // Generate image
  const generateImage = async () => {
    if (!imagePrompt.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/content-studio/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          style: { type: imageStyle },
          aspectRatio: imageRatio,
          numberOfImages: imageCount,
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        result.data.forEach((img: any) => {
          setGeneratedContent(prev => [{
            id: img.id,
            type: 'image',
            data: img,
            timestamp: new Date(),
          }, ...prev]);
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate video
  const generateVideo = async () => {
    if (!videoPrompt.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/content-studio/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          duration: parseInt(videoDuration),
          provider: videoProvider,
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        setGeneratedContent(prev => [{
          id: result.data.id,
          type: 'video',
          data: result.data,
          timestamp: new Date(),
        }, ...prev]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate audio
  const generateAudio = async () => {
    if (audioType === 'tts' && !audioText.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/content-studio/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: audioType,
          text: audioText,
          voice: audioVoice,
          style: { genre: musicStyle },
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        setGeneratedContent(prev => [{
          id: result.data.id,
          type: 'audio',
          data: result.data,
          timestamp: new Date(),
        }, ...prev]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate text
  const generateText = async () => {
    if (!textPrompt.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/content-studio/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textPrompt,
          type: textType,
          tone: textTone,
          length: textLength,
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        setGeneratedContent(prev => [{
          id: result.data.id,
          type: 'text',
          data: result.data,
          timestamp: new Date(),
        }, ...prev]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Translate
  const translateContent = async () => {
    if (!translateText.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/content-studio/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: translateText,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        setGeneratedContent(prev => [{
          id: Date.now().toString(),
          type: 'text',
          data: result.data,
          timestamp: new Date(),
        }, ...prev]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove watermark
  const removeWatermark = async () => {
    if (!watermarkPath.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/content-studio/watermark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: watermarkType,
          path: watermarkPath,
          options: { type: removalMethod },
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        setGeneratedContent(prev => [{
          id: result.data.id,
          type: watermarkType,
          data: result.data,
          timestamp: new Date(),
        }, ...prev]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Generation Panel */}
      <div className="lg:col-span-2 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="image"><ImageIcon className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="video"><Video className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="audio"><Music className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="text"><Type className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="translate"><Languages className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="watermark"><Droplet className="h-4 w-4" /></TabsTrigger>
          </TabsList>

          {/* Image Tab */}
          <TabsContent value="image">
            <Card>
              <CardHeader>
                <CardTitle>Генерация изображений</CardTitle>
                <CardDescription>AI-генерация картинок по описанию</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea placeholder="Beautiful sunset over mountains..." value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Стиль</Label>
                    <Select value={imageStyle} onValueChange={setImageStyle}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realistic">Реалистичный</SelectItem>
                        <SelectItem value="cinematic">Кинематографичный</SelectItem>
                        <SelectItem value="anime">Аниме</SelectItem>
                        <SelectItem value="3d">3D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Формат</Label>
                    <Select value={imageRatio} onValueChange={setImageRatio}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                        <SelectItem value="16:9">16:9</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Кол-во</Label>
                    <Select value={imageCount.toString()} onValueChange={(v) => setImageCount(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={generateImage} disabled={loading || !imagePrompt.trim()} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Сгенерировать
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Tab */}
          <TabsContent value="video">
            <Card>
              <CardHeader>
                <CardTitle>Генерация видео</CardTitle>
                <CardDescription>Бесплатно через Kling AI, Luma, Runway</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Описание видео</Label>
                  <Textarea placeholder="Cat playing with ball..." value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Длительность</Label>
                    <Select value={videoDuration} onValueChange={setVideoDuration}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 сек</SelectItem>
                        <SelectItem value="10">10 сек</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Провайдер</Label>
                    <Select value={videoProvider} onValueChange={setVideoProvider}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Авто</SelectItem>
                        <SelectItem value="kling">Kling AI</SelectItem>
                        <SelectItem value="luma">Luma</SelectItem>
                        <SelectItem value="runway">Runway</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={generateVideo} disabled={loading || !videoPrompt.trim()} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
                  Сгенерировать видео
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audio Tab */}
          <TabsContent value="audio">
            <Card>
              <CardHeader>
                <CardTitle>Генерация аудио</CardTitle>
                <CardDescription>TTS озвучка и фоновая музыка</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button variant={audioType === 'tts' ? 'default' : 'outline'} onClick={() => setAudioType('tts')}>Озвучка</Button>
                  <Button variant={audioType === 'music' ? 'default' : 'outline'} onClick={() => setAudioType('music')}>Музыка</Button>
                </div>
                {audioType === 'tts' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Текст</Label>
                      <Textarea placeholder="Текст для озвучки..." value={audioText} onChange={(e) => setAudioText(e.target.value)} rows={4} />
                    </div>
                    <div className="space-y-2">
                      <Label>Голос</Label>
                      <Select value={audioVoice} onValueChange={setAudioVoice}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ru-RU-SvetlanaNeural">Светлана</SelectItem>
                          <SelectItem value="ru-RU-DmitryNeural">Дмитрий</SelectItem>
                          <SelectItem value="en-US-JennyNeural">Jenny (EN)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Стиль</Label>
                    <Select value={musicStyle} onValueChange={setMusicStyle}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ambient">Эмбиент</SelectItem>
                        <SelectItem value="chill">Чилл</SelectItem>
                        <SelectItem value="cinematic">Кинематографичный</SelectItem>
                        <SelectItem value="lofi">Lo-Fi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={generateAudio} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Music className="h-4 w-4 mr-2" />}
                  {audioType === 'tts' ? 'Озвучить' : 'Сгенерировать'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Text Tab */}
          <TabsContent value="text">
            <Card>
              <CardHeader>
                <CardTitle>Генерация текста</CardTitle>
                <CardDescription>AI-генерация статей, постов, подписей</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Тема</Label>
                  <Textarea placeholder="Статья о AI в маркетинге..." value={textPrompt} onChange={(e) => setTextPrompt(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Select value={textType} onValueChange={setTextType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">Статья</SelectItem>
                      <SelectItem value="post">Пост</SelectItem>
                      <SelectItem value="caption">Подпись</SelectItem>
                      <SelectItem value="ad-copy">Реклама</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={textTone} onValueChange={setTextTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Дружелюбный</SelectItem>
                      <SelectItem value="formal">Формальный</SelectItem>
                      <SelectItem value="humorous">Юмор</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={textLength} onValueChange={setTextLength}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Короткий</SelectItem>
                      <SelectItem value="medium">Средний</SelectItem>
                      <SelectItem value="long">Длинный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={generateText} disabled={loading || !textPrompt.trim()} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Type className="h-4 w-4 mr-2" />}
                  Сгенерировать текст
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Translate Tab */}
          <TabsContent value="translate">
            <Card>
              <CardHeader>
                <CardTitle>Перевод контента</CardTitle>
                <CardDescription>AI-перевод с адаптацией</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Текст</Label>
                  <Textarea placeholder="Введите текст..." value={translateText} onChange={(e) => setTranslateText(e.target.value)} rows={5} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select value={sourceLang} onValueChange={setSourceLang}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={targetLang} onValueChange={setTargetLang}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={translateContent} disabled={loading || !translateText.trim()} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
                  Перевести
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Watermark Tab */}
          <TabsContent value="watermark">
            <Card>
              <CardHeader>
                <CardTitle>Удаление водяных знаков</CardTitle>
                <CardDescription>Только для легального контента</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-600">⚠️ Используйте только для легального контента</p>
                </div>
                <div className="flex gap-2 mb-4">
                  <Button variant={watermarkType === 'image' ? 'default' : 'outline'} onClick={() => setWatermarkType('image')}>Изображение</Button>
                  <Button variant={watermarkType === 'video' ? 'default' : 'outline'} onClick={() => setWatermarkType('video')}>Видео</Button>
                </div>
                <div className="space-y-2">
                  <Label>Путь к файлу</Label>
                  <Input placeholder="/path/to/file.jpg" value={watermarkPath} onChange={(e) => setWatermarkPath(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Метод</Label>
                  <Select value={removalMethod} onValueChange={setRemovalMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Авто</SelectItem>
                      <SelectItem value="crop">Обрезка</SelectItem>
                      <SelectItem value="blur">Размытие</SelectItem>
                      <SelectItem value="inpaint">AI-восстановление</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={removeWatermark} disabled={loading || !watermarkPath.trim()} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Droplet className="h-4 w-4 mr-2" />}
                  Удалить водяной знак
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {loading && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <Progress value={progress} className="flex-1 h-2" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Результаты</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setGeneratedContent([])}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[700px]">
            {generatedContent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Результаты появятся здесь</p>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedContent.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{item.type}</Badge>
                      <span className="text-xs text-muted-foreground">{item.timestamp.toLocaleTimeString()}</span>
                    </div>
                    {item.type === 'image' && item.data.base64 && (
                      <img src={`data:image/png;base64,${item.data.base64}`} alt="Generated" className="w-full rounded" />
                    )}
                    {item.type === 'text' && (
                      <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap">{item.data.content || item.data.translated}</div>
                    )}
                    {item.type === 'audio' && (
                      <audio src={item.data.url} controls className="w-full" />
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => item.data.url && window.open(item.data.url)}>
                        <Download className="h-3 w-3 mr-1" /> Скачать
                      </Button>
                      {item.type === 'text' && (
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(item.data.content || item.data.translated)}>
                          <Copy className="h-3 w-3 mr-1" /> Копировать
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ContentStudioPanel;

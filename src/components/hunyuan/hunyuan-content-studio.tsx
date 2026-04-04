'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Image as ImageIcon,
  Video,
  Bot,
  Palette,
  Clock,
  Sparkles,
  Download,
  Edit3,
  RefreshCw,
  Loader2,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

// Типы
type ContentType = 'image' | 'video' | 'audio' | 'avatar';
type Platform = 'telegram' | 'instagram' | 'tiktok' | 'youtube' | 'vk' | 'twitter';

interface GeneratedContent {
  id: string;
  type: ContentType;
  platform: Platform;
  prompt: string;
  mediaUrl?: string;
  status: string;
  createdAt: string;
  views?: number;
  likes?: number;
}

// Платформы
const PLATFORMS: { id: Platform; name: string; icon: string }[] = [
  { id: 'telegram', name: 'Telegram', icon: '📱' },
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'youtube', name: 'YouTube', icon: '▶️' },
  { id: 'vk', name: 'VK', icon: '💬' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦' },
];

// Размеры изображений
const IMAGE_SIZES = [
  { id: '1024x1024', name: 'Квадрат (1024×1024)' },
  { id: '768x1344', name: 'Портрет (768×1344)' },
  { id: '864x1152', name: 'Портрет (864×1152)' },
  { id: '1344x768', name: 'Ландшафт (1344×768)' },
  { id: '1152x864', name: 'Ландшафт (1152×864)' },
  { id: '1440x720', name: 'Широкий (1440×720)' },
  { id: '720x1440', name: 'Вертикальный (720×1440)' },
];

// Стили
const STYLES = [
  { id: 'realistic', name: 'Реалистичный' },
  { id: 'anime', name: 'Аниме' },
  { id: 'professional', name: 'Профессиональный' },
  { id: 'casual', name: 'Повседневный' },
  { id: 'neon', name: 'Неон' },
  { id: 'dark', name: 'Тёмный' },
  { id: 'vibrant', name: 'Яркий' },
  { id: 'minimalist', name: 'Минималистичный' },
];

// Голоса
const VOICES = [
  { id: 'female-ru', name: 'Женский (русский)' },
  { id: 'male-ru', name: 'Мужской (русский)' },
  { id: 'female-en', name: 'Женский (английский)' },
  { id: 'male-en', name: 'Мужской (английский)' },
];

// Аватары
const AVATARS = [
  { id: 'young-female-professional', name: 'Девушка, молодая, профессиональная' },
  { id: 'young-male-professional', name: 'Парень, молодой, профессиональный' },
  { id: 'young-female-casual', name: 'Девушка, молодая, повседневная' },
  { id: 'young-male-casual', name: 'Парень, молодой, повседневный' },
  { id: 'middle-female-friendly', name: 'Женщина, дружелюбная' },
  { id: 'middle-male-friendly', name: 'Мужчина, дружелюбный' },
];

export function HunyuanContentStudio() {
  // State
  const [contentType, setContentType] = useState<ContentType>('image');
  const [platform, setPlatform] = useState<Platform>('telegram');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [style, setStyle] = useState('realistic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  
  // Video state
  const [videoText, setVideoText] = useState('');
  const [videoAvatar, setVideoAvatar] = useState('young-female-professional');
  const [videoVoice, setVideoVoice] = useState('female-ru');
  
  // Avatar state
  const [avatarGender, setAvatarGender] = useState<'male' | 'female'>('female');
  const [avatarAge, setAvatarAge] = useState<'young' | 'middle' | 'senior'>('young');
  const [avatarStyle, setAvatarStyle] = useState('professional');
  const [avatarDescription, setAvatarDescription] = useState('');
  
  // Edit state
  const [editCommand, setEditCommand] = useState('');
  
  // Dialogs
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewContent, setPreviewContent] = useState<GeneratedContent | null>(null);
  const [editDialog, setEditDialog] = useState(false);

  // Загрузка истории
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/hunyuan/generate?limit=20');
      const data = await response.json();
      if (data.history) {
        setGeneratedContent(data.history);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  // Генерация изображения
  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Введите описание изображения');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const response = await fetch('/api/hunyuan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateImage',
          prompt,
          negativePrompt,
          style,
          size: imageSize,
        }),
      });

      const data = await response.json();
      
      clearInterval(progressInterval);
      setProgress(100);

      if (data.success) {
        toast.success('Изображение сгенерировано!');
        loadHistory();
        setPrompt('');
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast.error('Ошибка генерации');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 1000);
    }
  };

  // Генерация видео
  const handleGenerateVideo = async () => {
    if (!videoText.trim()) {
      toast.error('Введите текст для видео');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 85));
    }, 1000);

    try {
      const response = await fetch('/api/hunyuan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateVideo',
          text: videoText,
          avatar: videoAvatar,
          voice: videoVoice,
        }),
      });

      const data = await response.json();
      
      clearInterval(progressInterval);
      setProgress(100);

      if (data.success) {
        toast.success('Видео сгенерировано!');
        loadHistory();
        setVideoText('');
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast.error('Ошибка генерации');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 1000);
    }
  };

  // Генерация аватара
  const handleGenerateAvatar = async () => {
    setIsGenerating(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const response = await fetch('/api/hunyuan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateAvatar',
          gender: avatarGender,
          age: avatarAge,
          style: avatarStyle,
          description: avatarDescription,
        }),
      });

      const data = await response.json();
      
      clearInterval(progressInterval);
      setProgress(100);

      if (data.success) {
        toast.success('Аватар сгенерирован!');
        loadHistory();
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast.error('Ошибка генерации');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 1000);
    }
  };

  // Редактирование изображения
  const handleEditImage = async () => {
    if (!editCommand.trim()) {
      toast.error('Введите команду редактирования');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/hunyuan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editImage',
          imagePath: previewContent?.mediaUrl || '',
          command: editCommand,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Изображение отредактировано!');
        loadHistory();
        setEditDialog(false);
        setEditCommand('');
      } else {
        toast.error(data.error || 'Ошибка редактирования');
      }
    } catch (error) {
      toast.error('Ошибка редактирования');
    } finally {
      setIsGenerating(false);
    }
  };

  // Быстрые действия
  const quickActions = [
    { label: 'Аватар для аккаунта', prompt: 'Portrait photo, professional, friendly expression', icon: Bot },
    { label: 'Обложка для канала', prompt: 'Channel cover, crypto theme, modern design', icon: Palette },
    { label: 'Пост для Instagram', prompt: 'Instagram post, motivational quote background', icon: ImageIcon },
    { label: 'Превью для видео', prompt: 'YouTube thumbnail, eye-catching, professional', icon: Video },
  ];

  const handleQuickAction = (action: typeof quickActions[0]) => {
    setPrompt(action.prompt);
    setContentType('image');
  };

  // Рендер статуса
  const renderStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-[#00D26A]">Готово</Badge>;
      case 'generating':
        return <Badge className="bg-[#FFB800]">Генерация...</Badge>;
      case 'failed':
        return <Badge className="bg-[#FF4D4D]">Ошибка</Badge>;
      default:
        return <Badge className="bg-[#8A8A8A]">Ожидание</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#6C63FF]" />
            Hunyuan Content Studio
          </h1>
          <p className="text-[#8A8A8A]">Генерация изображений, видео и аудио с AI</p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadHistory()}
          className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Быстрые действия */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FFB800]" />
            Быстрые действия
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => handleQuickAction(action)}
                className="h-auto py-4 flex flex-col border-[#2A2B32] text-[#8A8A8A] hover:text-white hover:border-[#6C63FF]"
              >
                <action.icon className="w-6 h-6 mb-2" />
                <span className="text-sm">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Основной интерфейс */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Панель генерации */}
        <div className="lg:col-span-2">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
                  <TabsTrigger value="image" className="data-[state=active]:bg-[#6C63FF]">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Изображения
                  </TabsTrigger>
                  <TabsTrigger value="video" className="data-[state=active]:bg-[#6C63FF]">
                    <Video className="w-4 h-4 mr-2" />
                    Видео
                  </TabsTrigger>
                  <TabsTrigger value="avatar" className="data-[state=active]:bg-[#6C63FF]">
                    <Bot className="w-4 h-4 mr-2" />
                    Аватары
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Изображения */}
              {contentType === 'image' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Платформа</Label>
                    <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                      <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                        {PLATFORMS.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.icon} {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Описание изображения</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Опишите, что вы хотите создать..."
                      className="bg-[#1E1F26] border-[#2A2B32] min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Размер</Label>
                      <Select value={imageSize} onValueChange={setImageSize}>
                        <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                          {IMAGE_SIZES.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Стиль</Label>
                      <Select value={style} onValueChange={setStyle}>
                        <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                          {STYLES.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Негативный промпт (что исключить)</Label>
                    <Input
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="blur, low quality, distortion..."
                      className="bg-[#1E1F26] border-[#2A2B32]"
                    />
                  </div>

                  {isGenerating && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8A8A8A]">Генерация...</span>
                        <span className="text-[#6C63FF]">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  <Button
                    onClick={handleGenerateImage}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Генерация...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Сгенерировать изображение
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Видео */}
              {contentType === 'video' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Текст для озвучки</Label>
                    <Textarea
                      value={videoText}
                      onChange={(e) => setVideoText(e.target.value)}
                      placeholder="Введите текст, который произнесёт аватар..."
                      className="bg-[#1E1F26] border-[#2A2B32] min-h-[120px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Аватар</Label>
                      <Select value={videoAvatar} onValueChange={setVideoAvatar}>
                        <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                          {AVATARS.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Голос</Label>
                      <Select value={videoVoice} onValueChange={setVideoVoice}>
                        <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                          {VOICES.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isGenerating && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8A8A8A]">Генерация видео...</span>
                        <span className="text-[#6C63FF]">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  <Button
                    onClick={handleGenerateVideo}
                    disabled={isGenerating || !videoText.trim()}
                    className="w-full bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Генерация видео...
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4 mr-2" />
                        Сгенерировать видео
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Аватары */}
              {contentType === 'avatar' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Пол</Label>
                      <Select value={avatarGender} onValueChange={(v) => setAvatarGender(v as 'male' | 'female')}>
                        <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                          <SelectItem value="female">Женский</SelectItem>
                          <SelectItem value="male">Мужской</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Возраст</Label>
                      <Select value={avatarAge} onValueChange={(v) => setAvatarAge(v as any)}>
                        <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                          <SelectItem value="young">Молодой</SelectItem>
                          <SelectItem value="middle">Средний</SelectItem>
                          <SelectItem value="senior">Старший</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Стиль</Label>
                      <Select value={avatarStyle} onValueChange={setAvatarStyle}>
                        <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                          <SelectItem value="professional">Профессиональный</SelectItem>
                          <SelectItem value="casual">Повседневный</SelectItem>
                          <SelectItem value="friendly">Дружелюбный</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Дополнительное описание</Label>
                    <Input
                      value={avatarDescription}
                      onChange={(e) => setAvatarDescription(e.target.value)}
                      placeholder="Блондинка, голубые глаза, улыбается..."
                      className="bg-[#1E1F26] border-[#2A2B32]"
                    />
                  </div>

                  {isGenerating && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8A8A8A]">Генерация аватара...</span>
                        <span className="text-[#6C63FF]">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  <Button
                    onClick={handleGenerateAvatar}
                    disabled={isGenerating}
                    className="w-full bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Генерация...
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 mr-2" />
                        Сгенерировать аватар
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* История генераций */}
        <div className="lg:col-span-1">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#FFB800]" />
                История генераций
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {generatedContent.length === 0 ? (
                    <div className="text-center py-8 text-[#8A8A8A]">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Нет сгенерированного контента</p>
                    </div>
                  ) : (
                    generatedContent.map((content) => (
                      <div
                        key={content.id}
                        className="p-3 rounded-lg bg-[#1E1F26] hover:bg-[#2A2B32] transition-colors cursor-pointer"
                        onClick={() => {
                          setPreviewContent(content);
                          setPreviewDialog(true);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#2A2B32] flex items-center justify-center shrink-0">
                            {content.type === 'image' ? (
                              <ImageIcon className="w-5 h-5 text-[#6C63FF]" />
                            ) : content.type === 'video' ? (
                              <Video className="w-5 h-5 text-[#FFB800]" />
                            ) : (
                              <Bot className="w-5 h-5 text-[#00D26A]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{content.prompt}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {renderStatus(content.status)}
                              <span className="text-xs text-[#8A8A8A]">{content.platform}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Связка DeepSeek + Hunyuan */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#00D26A]" />
            DeepSeek + Hunyuan = Идеальная связка
          </CardTitle>
          <CardDescription className="text-[#8A8A8A]">
            DeepSeek генерирует текст, Hunyuan создаёт медиа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-[#1E1F26] border border-[#2A2B32]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-[#6C63FF]" />
                </div>
                <span className="text-white font-medium">DeepSeek (Текст)</span>
              </div>
              <ul className="text-sm text-[#8A8A8A] space-y-1">
                <li>✓ Генерация комментариев</li>
                <li>✓ Юридический риск-анализ</li>
                <li>✓ Создание промптов для Hunyuan</li>
                <li>✓ Понимание русского языка</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-[#1E1F26] border border-[#2A2B32]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-[#FFB800]" />
                </div>
                <span className="text-white font-medium">Hunyuan (Медиа)</span>
              </div>
              <ul className="text-sm text-[#8A8A8A] space-y-1">
                <li>✓ Генерация изображений</li>
                <li>✓ Создание видео с аватарами</li>
                <li>✓ Редактирование по тексту</li>
                <li>✓ AI-подкасты</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog превью */}
      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent className="max-w-2xl bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>Просмотр контента</DialogTitle>
          </DialogHeader>
          {previewContent && (
            <div className="space-y-4">
              <div className="aspect-square rounded-lg bg-[#1E1F26] flex items-center justify-center">
                {previewContent.mediaUrl ? (
                  <img
                    src={previewContent.mediaUrl}
                    alt={previewContent.prompt}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <ImageIcon className="w-16 h-16 text-[#8A8A8A]" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-[#8A8A8A]">Промпт:</p>
                <p className="text-white">{previewContent.prompt}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditDialog(true);
                    setPreviewDialog(false);
                  }}
                  className="border-[#2A2B32]"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Редактировать
                </Button>
                <Button variant="outline" className="border-[#2A2B32]">
                  <Download className="w-4 h-4 mr-2" />
                  Скачать
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog редактирования */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>Редактирование по тексту</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Команда редактирования</Label>
              <Textarea
                value={editCommand}
                onChange={(e) => setEditCommand(e.target.value)}
                placeholder="Сделай фон тёмным, добавь неоновые акценты..."
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
            <p className="text-sm text-[#8A8A8A]">
              Опишите изменения, которые хотите внести. AI поймёт вашу команду и применит изменения.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} className="border-[#2A2B32]">
              Отмена
            </Button>
            <Button onClick={handleEditImage} disabled={isGenerating} className="bg-[#6C63FF]">
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Edit3 className="w-4 h-4 mr-2" />
              )}
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

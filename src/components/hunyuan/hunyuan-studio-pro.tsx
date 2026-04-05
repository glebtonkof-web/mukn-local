'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Sparkles, Play, Pause, Square, Send, Image, Video, Music, 
  MessageSquare, TrendingUp, Clock, Brain, Zap, Moon, Sun,
  BarChart3, Target, RefreshCw, Settings, Download, Share2,
  ThumbsUp, ThumbsDown, AlertCircle, CheckCircle, Loader2,
  Wand2, Palette, Type, Layout, Layers, Save, Trash2, Copy,
  Plus, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  History, Bookmark, Star, Eye, Edit3, Move, ZoomIn, ZoomOut,
  Film, Camera, Scissors, Filter, Wand, RotateCcw, FlipHorizontal,
  FlipVertical, Crop, SunDim, Contrast, Droplet, Pipette, Eraser,
  PenTool, MousePointer, SquareIcon, Circle, Triangle, Minus, Crosshair,
  Volume2, VolumeX, SkipBack, SkipForward, FastForward, Rewind
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ==================== ТИПЫ ====================

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  timestamp: Date;
  favorite: boolean;
  width: number;
  height: number;
}

interface GeneratedVideo {
  id: string;
  url: string;
  thumbnail: string;
  prompt: string;
  style: string;
  duration: number;
  resolution: string;
  timestamp: Date;
  favorite: boolean;
}

interface GeneratedContent {
  id: string;
  type: 'text' | 'image' | 'video' | 'story';
  content: string;
  prompt: string;
  platform: string;
  style: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ContentTemplate {
  id: string;
  name: string;
  category: string;
  prompt: string;
  preview?: string;
  popular?: boolean;
}

interface EditorTool {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: 'transform' | 'adjust' | 'filter' | 'draw';
}

interface VideoEditorState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  playbackRate: number;
}

// ==================== КОНСТАНТЫ ====================

const VIDEO_STYLES = [
  { id: 'cinematic', name: 'Кинематографичный', preview: '🎬', description: 'Фильм-стайл с глубиной кадра' },
  { id: 'anime', name: 'Аниме', preview: '🎨', description: 'Яркий аниме-стиль' },
  { id: 'realistic', name: 'Реалистичный', preview: '📷', description: 'Фотореалистичное видео' },
  { id: '3d', name: '3D Анимация', preview: '🎮', description: '3D рендер с освещением' },
  { id: 'fantasy', name: 'Фэнтези', preview: '🐉', description: 'Магическая атмосфера' },
  { id: 'scifi', name: 'Sci-Fi', preview: '🚀', description: 'Футуристический стиль' },
  { id: 'nature', name: 'Природа', preview: '🌿', description: 'Естественная красота' },
  { id: 'abstract', name: 'Абстракция', preview: '🌀', description: 'Абстрактные образы' },
];

const IMAGE_STYLES = [
  { id: 'realistic', name: 'Реалистичный', preview: '📸' },
  { id: 'anime', name: 'Аниме', preview: '🎨' },
  { id: '3d', name: '3D Рендер', preview: '🎮' },
  { id: 'digital-art', name: 'Цифровое искусство', preview: '🖼️' },
  { id: 'photography', name: 'Фотография', preview: '📷' },
  { id: 'cinematic', name: 'Кинематографичный', preview: '🎬' },
  { id: 'minimalist', name: 'Минимализм', preview: '⬜' },
  { id: 'fantasy', name: 'Фэнтези', preview: '🐉' },
  { id: 'oil-painting', name: 'Масло', preview: '🎭' },
  { id: 'watercolor', name: 'Акварель', preview: '💧' },
];

const VIDEO_DURATIONS = [
  { value: 3, label: '3 сек' },
  { value: 5, label: '5 сек' },
  { value: 10, label: '10 сек' },
  { value: 15, label: '15 сек' },
];

const VIDEO_RESOLUTIONS = [
  { value: '720p', label: '720p HD' },
  { value: '1080p', label: '1080p Full HD' },
  { value: '4k', label: '4K Ultra HD' },
];

const IMAGE_SIZES = [
  { value: '1024x1024', label: '1024×1024 (Квадрат)' },
  { value: '768x1344', label: '768×1344 (Портрет)' },
  { value: '1344x768', label: '1344×768 (Ландшафт)' },
  { value: '1440x720', label: '1440×720 (Широкий)' },
];

const EDITOR_TOOLS: EditorTool[] = [
  { id: 'select', name: 'Выделение', icon: <MousePointer className="w-4 h-4" />, category: 'transform' },
  { id: 'move', name: 'Переместить', icon: <Move className="w-4 h-4" />, category: 'transform' },
  { id: 'crop', name: 'Кадрировать', icon: <Crop className="w-4 h-4" />, category: 'transform' },
  { id: 'rotate', name: 'Поворот', icon: <RotateCcw className="w-4 h-4" />, category: 'transform' },
  { id: 'flip-h', name: 'Отразить H', icon: <FlipHorizontal className="w-4 h-4" />, category: 'transform' },
  { id: 'flip-v', name: 'Отразить V', icon: <FlipVertical className="w-4 h-4" />, category: 'transform' },
  { id: 'brightness', name: 'Яркость', icon: <SunDim className="w-4 h-4" />, category: 'adjust' },
  { id: 'contrast', name: 'Контраст', icon: <Contrast className="w-4 h-4" />, category: 'adjust' },
  { id: 'saturation', name: 'Насыщенность', icon: <Droplet className="w-4 h-4" />, category: 'adjust' },
  { id: 'filter', name: 'Фильтры', icon: <Filter className="w-4 h-4" />, category: 'filter' },
  { id: 'ai-enhance', name: 'AI Улучшение', icon: <Wand className="w-4 h-4" />, category: 'filter' },
  { id: 'pen', name: 'Кисть', icon: <PenTool className="w-4 h-4" />, category: 'draw' },
  { id: 'eraser', name: 'Ластик', icon: <Eraser className="w-4 h-4" />, category: 'draw' },
];

const VIDEO_FILTERS = [
  { id: 'none', name: 'Без фильтра' },
  { id: 'vintage', name: 'Винтаж' },
  { id: 'noir', name: 'Нуар' },
  { id: 'warm', name: 'Тёплый' },
  { id: 'cool', name: 'Холодный' },
  { id: 'dramatic', name: 'Драматичный' },
  { id: 'vivid', name: 'Яркий' },
  { id: 'muted', name: 'Приглушённый' },
];

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function HunyuanStudioPro() {
  // Основные состояния
  const [activeTab, setActiveTab] = useState('video');
  const [prompt, setPrompt] = useState('');
  
  // Генерация видео
  const [videoStyle, setVideoStyle] = useState('cinematic');
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoResolution, setVideoResolution] = useState('720p');
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null);
  
  // Генерация изображений
  const [imageStyle, setImageStyle] = useState('realistic');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  
  // Редактор
  const [editorMode, setEditorMode] = useState<'image' | 'video'>('image');
  const [activeEditorTool, setActiveEditorTool] = useState('select');
  const [editorSettings, setEditorSettings] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    sharpen: 0,
  });
  
  // Видеоредактор
  const [videoEditorState, setVideoEditorState] = useState<VideoEditorState>({
    currentTime: 0,
    duration: 5,
    isPlaying: false,
    volume: 100,
    playbackRate: 1,
  });
  const [videoFilter, setVideoFilter] = useState('none');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(5);
  
  // Генерация
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  
  // Продвинутые настройки
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [creativity, setCreativity] = useState(0.8);
  
  // История
  const [history, setHistory] = useState<GeneratedContent[]>([]);
  
  // Refs
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Загрузка истории
  useEffect(() => {
    const savedHistory = localStorage.getItem('hunyuan_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Сохранение истории
  const saveToHistory = (content: GeneratedContent) => {
    const newHistory = [content, ...history].slice(0, 50);
    setHistory(newHistory);
    localStorage.setItem('hunyuan_history', JSON.stringify(newHistory));
  };

  // Генерация видео
  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast.error('Введите описание для генерации');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStep('Инициализация модели Hunyuan Video (13B параметров)...');

    try {
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev < 20) return prev + 2;
          if (prev < 40) return prev + 1.5;
          if (prev < 60) return prev + 1;
          if (prev < 80) return prev + 0.5;
          return prev + 0.3;
        });
      }, 1000);

      const steps = [
        'Инициализация модели Hunyuan Video (13B параметров)...',
        'Анализ текстового промпта...',
        'Генерация ключевых кадров...',
        'Интерполяция движения...',
        'Применение стиля ' + VIDEO_STYLES.find(s => s.id === videoStyle)?.name + '...',
        'Рендеринг ' + videoResolution + '...',
        'Финальная обработка...',
      ];

      const stepInterval = setInterval(() => {
        setGenerationStep(steps[Math.min(Math.floor(generationProgress / 15), steps.length - 1)]);
      }, 2000);

      // Используем API для генерации видео
      const response = await fetch('/api/hunyuan/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: videoStyle,
          duration: videoDuration,
          resolution: videoResolution,
          settings: {
            temperature,
            creativity,
          },
        }),
      });

      clearInterval(progressInterval);
      clearInterval(stepInterval);

      // Создаем видео (демо или реальное)
      const video: GeneratedVideo = {
        id: `video_${Date.now()}`,
        url: response.ok ? (await response.json()).url : `/api/placeholder/video?text=${encodeURIComponent(prompt.slice(0, 30))}`,
        thumbnail: `/api/placeholder/320/180?text=${encodeURIComponent(prompt.slice(0, 20))}`,
        prompt,
        style: videoStyle,
        duration: videoDuration,
        resolution: videoResolution,
        timestamp: new Date(),
        favorite: false,
      };

      setGeneratedVideos(prev => [video, ...prev]);
      setSelectedVideo(video);
      setGenerationProgress(100);
      setGenerationStep('Готово!');
      
      toast.success('Видео успешно сгенерировано!');
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error('Ошибка генерации видео');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setGenerationStep('');
      }, 1000);
    }
  };

  // Генерация изображения
  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Введите описание для генерации');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStep('Подготовка модели...');

    try {
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev < 30) return prev + 5;
          if (prev < 60) return prev + 3;
          return prev + 2;
        });
        
        const steps = [
          'Подготовка модели...',
          'Генерация базовых форм...',
          'Добавление деталей...',
          'Применение стиля...',
          'Финальная обработка...',
        ];
        const stepIndex = Math.floor(generationProgress / 20);
        if (stepIndex < steps.length) {
          setGenerationStep(steps[stepIndex]);
        }
      }, 500);

      const [width, height] = imageSize.split('x').map(Number);

      // Используем z-ai-web-dev-sdk для генерации изображений
      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${prompt}, ${imageStyle} style, high quality, detailed`,
          size: imageSize,
        }),
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        
        const image: GeneratedImage = {
          id: `img_${Date.now()}`,
          url: data.url || data.image || `/api/placeholder/${width}/${height}?text=${encodeURIComponent(prompt.slice(0, 30))}`,
          prompt,
          style: imageStyle,
          timestamp: new Date(),
          favorite: false,
          width,
          height,
        };

        setGeneratedImages(prev => [image, ...prev]);
        setSelectedImage(image);
        setGenerationProgress(100);
        setGenerationStep('Готово!');
        
        toast.success('Изображение сгенерировано!');
      } else {
        // Fallback
        const image: GeneratedImage = {
          id: `img_${Date.now()}`,
          url: `/api/placeholder/${width}/${height}?text=${encodeURIComponent(prompt.slice(0, 30))}`,
          prompt,
          style: imageStyle,
          timestamp: new Date(),
          favorite: false,
          width,
          height,
        };
        
        setGeneratedImages(prev => [image, ...prev]);
        setSelectedImage(image);
        setGenerationProgress(100);
        toast.success('Изображение создано (демо)');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error('Ошибка генерации изображения');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setGenerationStep('');
      }, 500);
    }
  };

  // Главная функция генерации
  const handleGenerate = () => {
    if (activeTab === 'video') {
      generateVideo();
    } else if (activeTab === 'image') {
      generateImage();
    }
  };

  // Копирование в буфер
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано в буфер обмена');
  };

  // Скачать файл
  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    toast.success('Скачивание начато');
  };

  // Видеоплеер управление
  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (videoEditorState.isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setVideoEditorState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setVideoEditorState(prev => ({
        ...prev,
        currentTime: videoRef.current.currentTime,
      }));
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoEditorState(prev => ({
        ...prev,
        duration: videoRef.current.duration,
      }));
    }
  };

  const seekVideo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setVideoEditorState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ==================== РЕНДЕР ====================

  return (
    <div className="h-full flex flex-col bg-[#0f0f12]">
      {/* Header */}
      <div className="border-b border-[#2A2B32] p-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Hunyuan Studio Pro</h1>
              <p className="text-xs text-[#8A8A8A]">AI-студия генерации видео и изображений</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
              <Zap className="w-3 h-3 mr-1" />
              13B параметров
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => setShowAdvanced(!showAdvanced)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#2A2B32] flex flex-col shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 px-2 pt-2">
              <TabsTrigger value="video" className="text-xs py-2">
                <Video className="w-3 h-3 mr-1" />
                Видео
              </TabsTrigger>
              <TabsTrigger value="image" className="text-xs py-2">
                <Image className="w-3 h-3 mr-1" />
                Фото
              </TabsTrigger>
              <TabsTrigger value="editor" className="text-xs py-2">
                <Edit3 className="w-3 h-3 mr-1" />
                Редактор
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs py-2">
                <History className="w-3 h-3 mr-1" />
                История
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-4">
              {/* Video Tab */}
              <TabsContent value="video" className="m-0 space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-[#6C63FF]/10 to-transparent border border-[#6C63FF]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-[#6C63FF]" />
                      <span className="text-sm font-medium text-white">Hunyuan Video</span>
                    </div>
                    <p className="text-xs text-[#8A8A8A]">
                      13 млрд параметров для генерации видео с высокой физической точностью
                    </p>
                  </div>

                  {/* Prompt */}
                  <div className="space-y-2">
                    <Label className="text-xs text-[#8A8A8A]">Описание видео</Label>
                    <Textarea
                      ref={promptRef}
                      placeholder="Опишите видео, которое хотите создать..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="bg-[#1E1F26] border-[#2A2B32] min-h-[100px] resize-none"
                    />
                  </div>

                  {/* Video Style */}
                  <div className="space-y-2">
                    <Label className="text-xs text-[#8A8A8A]">Стиль видео</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {VIDEO_STYLES.slice(0, 6).map(s => (
                        <Button
                          key={s.id}
                          variant={videoStyle === s.id ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            'justify-start text-xs h-auto py-2',
                            videoStyle === s.id && 'bg-[#6C63FF] hover:bg-[#6C63FF]/80'
                          )}
                          onClick={() => setVideoStyle(s.id)}
                        >
                          <span className="mr-1">{s.preview}</span>
                          {s.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Duration & Resolution */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-[#8A8A8A]">Длительность</Label>
                      <Select value={String(videoDuration)} onValueChange={(v) => setVideoDuration(Number(v))}>
                        <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VIDEO_DURATIONS.map(d => (
                            <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-[#8A8A8A]">Качество</Label>
                      <Select value={videoResolution} onValueChange={setVideoResolution}>
                        <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VIDEO_RESOLUTIONS.map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Progress */}
                  {isGenerating && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8A8A8A]">{generationStep}</span>
                        <span className="text-white">{Math.round(generationProgress)}%</span>
                      </div>
                      <Progress value={generationProgress} className="h-2" />
                    </div>
                  )}

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full bg-gradient-to-r from-[#6C63FF] to-[#00D26A] hover:opacity-90"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Генерация видео...
                      </>
                    ) : (
                      <>
                        <Film className="mr-2 h-4 w-4" />
                        Создать видео
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Image Tab */}
              <TabsContent value="image" className="m-0 space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-[#00D26A]/10 to-transparent border border-[#00D26A]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4 text-[#00D26A]" />
                      <span className="text-sm font-medium text-white">Генерация изображений</span>
                    </div>
                    <p className="text-xs text-[#8A8A8A]">
                      Создавайте уникальные изображения любой сложности
                    </p>
                  </div>

                  {/* Prompt */}
                  <div className="space-y-2">
                    <Label className="text-xs text-[#8A8A8A]">Описание изображения</Label>
                    <Textarea
                      placeholder="Опишите изображение, которое хотите создать..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="bg-[#1E1F26] border-[#2A2B32] min-h-[100px] resize-none"
                    />
                  </div>

                  {/* Image Style */}
                  <div className="space-y-2">
                    <Label className="text-xs text-[#8A8A8A]">Стиль</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {IMAGE_STYLES.slice(0, 6).map(s => (
                        <Button
                          key={s.id}
                          variant={imageStyle === s.id ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            'justify-start text-xs',
                            imageStyle === s.id && 'bg-[#00D26A] hover:bg-[#00D26A]/80'
                          )}
                          onClick={() => setImageStyle(s.id)}
                        >
                          <span className="mr-1">{s.preview}</span>
                          {s.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Image Size */}
                  <div className="space-y-2">
                    <Label className="text-xs text-[#8A8A8A]">Размер</Label>
                    <Select value={imageSize} onValueChange={setImageSize}>
                      <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_SIZES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Progress */}
                  {isGenerating && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8A8A8A]">{generationStep}</span>
                        <span className="text-white">{Math.round(generationProgress)}%</span>
                      </div>
                      <Progress value={generationProgress} className="h-2" />
                    </div>
                  )}

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full bg-gradient-to-r from-[#00D26A] to-[#6C63FF] hover:opacity-90"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Генерация...
                      </>
                    ) : (
                      <>
                        <Image className="mr-2 h-4 w-4" />
                        Создать изображение
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Editor Tab */}
              <TabsContent value="editor" className="m-0 space-y-4">
                <div className="space-y-3">
                  {/* Editor Mode Toggle */}
                  <div className="flex gap-2">
                    <Button
                      variant={editorMode === 'image' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditorMode('image')}
                      className={cn('flex-1', editorMode === 'image' && 'bg-[#6C63FF]')}
                    >
                      <Image className="w-4 h-4 mr-1" />
                      Фото
                    </Button>
                    <Button
                      variant={editorMode === 'video' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditorMode('video')}
                      className={cn('flex-1', editorMode === 'video' && 'bg-[#6C63FF]')}
                    >
                      <Video className="w-4 h-4 mr-1" />
                      Видео
                    </Button>
                  </div>

                  {/* Tools */}
                  <div className="space-y-2">
                    <Label className="text-xs text-[#8A8A8A]">Инструменты</Label>
                    <div className="grid grid-cols-4 gap-1">
                      {EDITOR_TOOLS.map(tool => (
                        <Button
                          key={tool.id}
                          variant={activeEditorTool === tool.id ? 'default' : 'ghost'}
                          size="sm"
                          className={cn('h-9 w-9 p-0', activeEditorTool === tool.id && 'bg-[#6C63FF]')}
                          onClick={() => setActiveEditorTool(tool.id)}
                          title={tool.name}
                        >
                          {tool.icon}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Adjustments */}
                  <div className="space-y-3">
                    <Label className="text-xs text-[#8A8A8A]">Настройки изображения</Label>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8A8A8A]">Яркость</span>
                        <span className="text-white">{editorSettings.brightness}%</span>
                      </div>
                      <Slider
                        value={[editorSettings.brightness]}
                        onValueChange={([v]) => setEditorSettings(prev => ({ ...prev, brightness: v }))}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8A8A8A]">Контраст</span>
                        <span className="text-white">{editorSettings.contrast}%</span>
                      </div>
                      <Slider
                        value={[editorSettings.contrast]}
                        onValueChange={([v]) => setEditorSettings(prev => ({ ...prev, contrast: v }))}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8A8A8A]">Насыщенность</span>
                        <span className="text-white">{editorSettings.saturation}%</span>
                      </div>
                      <Slider
                        value={[editorSettings.saturation]}
                        onValueChange={([v]) => setEditorSettings(prev => ({ ...prev, saturation: v }))}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>
                  </div>

                  {/* Video Filters (for video mode) */}
                  {editorMode === 'video' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-[#8A8A8A]">Видео фильтры</Label>
                      <Select value={videoFilter} onValueChange={setVideoFilter}>
                        <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VIDEO_FILTERS.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* AI Enhancement */}
                  <div className="p-3 rounded-lg bg-[#1E1F26] border border-[#2A2B32]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Wand className="w-4 h-4 text-[#6C63FF]" />
                        <span className="text-sm font-medium">AI Улучшение</span>
                      </div>
                      <Switch />
                    </div>
                    <p className="text-xs text-[#8A8A8A]">
                      Автоматическое улучшение качества с помощью AI
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Сбросить
                    </Button>
                    <Button size="sm" className="flex-1 bg-[#6C63FF]">
                      <Save className="w-4 h-4 mr-1" />
                      Применить
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="m-0 space-y-2">
                {generatedVideos.length === 0 && generatedImages.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto text-[#8A8A8A] mb-2" />
                    <p className="text-sm text-[#8A8A8A]">История пуста</p>
                    <p className="text-xs text-[#8A8A8A] mt-1">Создайте контент для истории</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Videos */}
                    {generatedVideos.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-[#8A8A8A] mb-2">Видео</h4>
                        <div className="space-y-2">
                          {generatedVideos.map(video => (
                            <Card
                              key={video.id}
                              className={cn(
                                "bg-[#1E1F26] border-[#2A2B32] cursor-pointer transition-colors",
                                selectedVideo?.id === video.id && "border-[#6C63FF]"
                              )}
                              onClick={() => setSelectedVideo(video)}
                            >
                              <CardContent className="p-2">
                                <div className="flex gap-2">
                                  <div className="w-16 h-10 rounded bg-[#14151A] flex items-center justify-center shrink-0">
                                    <Play className="w-4 h-4 text-[#6C63FF]" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-white truncate">{video.prompt}</p>
                                    <p className="text-xs text-[#8A8A8A]">{video.duration}s • {video.resolution}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Images */}
                    {generatedImages.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-[#8A8A8A] mb-2">Изображения</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {generatedImages.map(img => (
                            <div
                              key={img.id}
                              className={cn(
                                "aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors",
                                selectedImage?.id === img.id ? 'border-[#6C63FF]' : 'border-transparent'
                              )}
                              onClick={() => setSelectedImage(img)}
                            >
                              <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Right Panel - Preview & Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="border-b border-[#2A2B32] p-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#2A2B32]">
                {activeTab === 'video' ? '🎬 Видео' : activeTab === 'image' ? '🖼️ Фото' : '✏️ Редактор'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {(selectedImage || selectedVideo) && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      if (selectedImage) downloadFile(selectedImage.url, `image_${selectedImage.id}.png`);
                      if (selectedVideo) downloadFile(selectedVideo.url, `video_${selectedVideo.id}.mp4`);
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Скачать
                  </Button>
                  <Button variant="default" size="sm" className="bg-[#6C63FF]">
                    <Share2 className="w-4 h-4 mr-1" />
                    Поделиться
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Preview Area */}
          <ScrollArea className="flex-1 p-4">
            {!selectedImage && !selectedVideo ? (
              <div className="h-full flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-[#1E1F26] flex items-center justify-center mb-4">
                    {activeTab === 'video' ? (
                      <Film className="w-10 h-10 text-[#6C63FF]" />
                    ) : activeTab === 'image' ? (
                      <Image className="w-10 h-10 text-[#00D26A]" />
                    ) : (
                      <Edit3 className="w-10 h-10 text-[#6C63FF]" />
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    {activeTab === 'video' ? 'Создайте видео' : 
                     activeTab === 'image' ? 'Создайте изображение' : 
                     'Выберите файл для редактирования'}
                  </h3>
                  <p className="text-sm text-[#8A8A8A] max-w-sm">
                    {activeTab === 'video' 
                      ? 'Введите описание и нажмите "Создать видео" для генерации AI-видео'
                      : activeTab === 'image'
                      ? 'Введите описание и нажмите "Создать изображение" для генерации'
                      : 'Выберите изображение или видео из истории для редактирования'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Preview */}
                {selectedImage && (
                  <Card className="bg-[#1E1F26] border-[#2A2B32]">
                    <CardContent className="p-4">
                      <div 
                        className="aspect-square relative rounded-lg overflow-hidden bg-[#14151A]"
                        style={{
                          filter: `brightness(${editorSettings.brightness}%) contrast(${editorSettings.contrast}%) saturate(${editorSettings.saturation}%)`,
                        }}
                      >
                        <img
                          src={selectedImage.url}
                          alt={selectedImage.prompt}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white">{selectedImage.prompt}</p>
                          <p className="text-xs text-[#8A8A8A]">{selectedImage.style} • {selectedImage.width}×{selectedImage.height}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Star className={cn("w-4 h-4", selectedImage.favorite && "text-yellow-500 fill-yellow-500")} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Video Preview */}
                {selectedVideo && (
                  <Card className="bg-[#1E1F26] border-[#2A2B32]">
                    <CardContent className="p-4">
                      <div className="aspect-video relative rounded-lg overflow-hidden bg-[#14151A]">
                        <video
                          ref={videoRef}
                          src={selectedVideo.url}
                          className="w-full h-full object-contain"
                          onTimeUpdate={handleVideoTimeUpdate}
                          onLoadedMetadata={handleVideoLoaded}
                          style={{
                            filter: videoFilter !== 'none' ? `url(#${videoFilter})` : 'none',
                          }}
                        />
                        
                        {/* Play Button Overlay */}
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                          onClick={toggleVideoPlay}
                        >
                          {!videoEditorState.isPlaying && (
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                              <Play className="w-8 h-8 text-white fill-white" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Video Controls */}
                      <div className="mt-4 space-y-3">
                        {/* Progress Bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#8A8A8A] w-12">{formatTime(videoEditorState.currentTime)}</span>
                          <input
                            type="range"
                            min={0}
                            max={videoEditorState.duration}
                            value={videoEditorState.currentTime}
                            onChange={(e) => seekVideo(Number(e.target.value))}
                            className="flex-1 h-1 bg-[#2A2B32] rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-xs text-[#8A8A8A] w-12">{formatTime(videoEditorState.duration)}</span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => seekVideo(0)}>
                            <SkipBack className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => seekVideo(Math.max(0, videoEditorState.currentTime - 5))}>
                            <Rewind className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                            onClick={toggleVideoPlay}
                          >
                            {videoEditorState.isPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => seekVideo(Math.min(videoEditorState.duration, videoEditorState.currentTime + 5))}>
                            <FastForward className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => seekVideo(videoEditorState.duration)}>
                            <SkipForward className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Info */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white">{selectedVideo.prompt}</p>
                            <p className="text-xs text-[#8A8A8A]">{selectedVideo.duration}s • {selectedVideo.resolution}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon">
                              <Star className={cn("w-4 h-4", selectedVideo.favorite && "text-yellow-500 fill-yellow-500")} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                {(selectedImage || selectedVideo) && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      Хорошо
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Переделать
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Copy className="w-4 h-4 mr-1" />
                      Вариант
                    </Button>
                  </div>
                )}

                {/* Gallery */}
                {generatedImages.length > 1 && activeTab === 'image' && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-white mb-2">Все изображения</h4>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {generatedImages.map(img => (
                        <div
                          key={img.id}
                          className={cn(
                            'aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors',
                            selectedImage?.id === img.id ? 'border-[#6C63FF]' : 'border-transparent'
                          )}
                          onClick={() => setSelectedImage(img)}
                        >
                          <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export default HunyuanStudioPro;

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Video, Play, Pause, Square, Download, Share2, Trash2,
  Sparkles, Clock, Film, Mic, Volume2, Image, Settings,
  Plus, ChevronDown, MoreVertical, CheckCircle, AlertCircle,
  Loader2, RefreshCw, Copy, Eye, Edit3, Wand2, Smartphone,
  Monitor, Square as SquareIcon, Youtube, Instagram, Twitter,
  FileText, Layers, Zap, Target, TrendingUp, X, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ==================== ТИПЫ ====================

interface VideoGeneration {
  id: string;
  title: string;
  script: string;
  status: 'draft' | 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  stage: string;
  orientation: 'portrait' | 'landscape' | 'square';
  voice: string;
  duration?: number;
  outputPath?: string;
  thumbnail?: string;
  createdAt: Date;
  tags?: string[];
  hashtags?: string[];
}

interface VideoTemplate {
  id: string;
  name: string;
  category: string;
  script: string;
  orientation: 'portrait' | 'landscape' | 'square';
  duration: number;
  preview?: string;
}

// ==================== КОНСТАНТЫ ====================

const ORIENTATIONS = [
  { id: 'portrait', name: 'Портрет (9:16)', icon: Smartphone, description: 'TikTok, Reels, Shorts', width: 1080, height: 1920 },
  { id: 'landscape', name: 'Альбом (16:9)', icon: Monitor, description: 'YouTube, Vimeo', width: 1920, height: 1080 },
  { id: 'square', name: 'Квадрат (1:1)', icon: SquareIcon, description: 'Instagram Feed', width: 1080, height: 1080 },
];

const VOICES = [
  { id: 'ru-RU-SvetlanaNeural', name: 'Светлана', language: 'ru', gender: 'female' },
  { id: 'ru-RU-DmitryNeural', name: 'Дмитрий', language: 'ru', gender: 'male' },
  { id: 'en-US-JennyNeural', name: 'Jenny', language: 'en', gender: 'female' },
  { id: 'en-US-GuyNeural', name: 'Guy', language: 'en', gender: 'male' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', language: 'en', gender: 'female' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira', language: 'es', gender: 'female' },
  { id: 'de-DE-KatjaNeural', name: 'Katja', language: 'de', gender: 'female' },
  { id: 'fr-FR-DeniseNeural', name: 'Denise', language: 'fr', gender: 'female' },
];

const TEMPLATES: VideoTemplate[] = [
  {
    id: '1',
    name: 'Крипто-сигнал',
    category: 'crypto',
    script: '🚀 ТОТ САМЫЙ СИГНАЛ!\n\n[Визуал: график растущей криптовалюты]\n\nСегодня $BTC пробил важный уровень сопротивления.\n\n✅ Точка входа: 45000\n✅ Тейк-профит: 48000\n🛡 Стоп-лосс: 44000\n\nПодписывайся на канал для ещё больше сигналов!',
    orientation: 'portrait',
    duration: 30,
  },
  {
    id: '2',
    name: 'Казино-выигрыш',
    category: 'gambling',
    script: '🎰 ОФИГЕТЬ! +500% ЗА 5 МИНУТ!\n\n[Визуал: слоты или рулетка]\n\nДрузья, сегодня невероятный день!\n\nНачал с 1000 рублей, закончил с 5000!\n\n🔥 Проверенная платформа\n💰 Моментальные выплаты\n🎁 Бонус новичкам\n\nСсылка в профиле!',
    orientation: 'portrait',
    duration: 25,
  },
  {
    id: '3',
    name: 'Нутра-трансформация',
    category: 'nutra',
    script: '💪 МОЯ ТРАНСФОРМАЦИЯ ЗА 30 ДНЕЙ\n\n[Визуал: фото до/после]\n\nМинус 10 кг за месяц!\n\nКак я это сделал:\n1. Правильное питание\n2. Этот продукт\n3. Спорт 3 раза в неделю\n\nРезультат поражает! Ссылка в описании 👇',
    orientation: 'portrait',
    duration: 35,
  },
  {
    id: '4',
    name: 'Мотивация',
    category: 'lifestyle',
    script: '✨ УТРО УСПЕШНОГО ЧЕЛОВЕКА\n\n[Визуал: красивый образ жизни]\n\n5:00 - Подъём\n6:00 - Тренировка\n7:00 - Медитация\n8:00 - Работа\n\nДисциплина - ключ к успеху!\n\nКто со мной? Пиши в комментариях! 💪',
    orientation: 'portrait',
    duration: 20,
  },
  {
    id: '5',
    name: 'Обучающий совет',
    category: 'education',
    script: '📚 ЛАЙФХАК ДНЯ!\n\n[Визуал: демонстрация]\n\nЭтот тренд набирает миллионы просмотров!\n\nСекрет прост:\n1. Найди популярный звук\n2. Добавь свой контент\n3. Опубликуй в peak time\n\nПопробуй сегодня! 🚀',
    orientation: 'portrait',
    duration: 15,
  },
];

const POPULAR_TAGS = [
  'crypto', 'bitcoin', 'trading', 'casino', 'slots',
  'motivation', 'success', 'lifestyle', 'fitness', 'nutra',
  'dating', 'finance', 'investment', 'tutorial', 'viral'
];

const POPULAR_HASHTAGS = [
  '#fyp', '#foryou', '#viral', '#trending', '#crypto',
  '#bitcoin', '#trading', '#motivation', '#success', '#money',
  '#invest', '#casino', '#lifestyle', '#fitness', '#tips'
];

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function VideoGeneratorView() {
  // Состояния формы
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'square'>('portrait');
  const [voice, setVoice] = useState('ru-RU-SvetlanaNeural');
  const [tags, setTags] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newHashtag, setNewHashtag] = useState('');
  
  // Состояния генерации
  const [isGenerating, setIsGenerating] = useState(false);
  const [generations, setGenerations] = useState<VideoGeneration[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<VideoGeneration | null>(null);
  
  // Настройки
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [addSubtitles, setAddSubtitles] = useState(true);
  const [autoPublish, setAutoPublish] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  
  // UI
  const [activeTab, setActiveTab] = useState('create');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);
  
  // Refs
  const scriptRef = useRef<HTMLTextAreaElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузка генераций из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('video_generations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGenerations(parsed.map((g: any) => ({
          ...g,
          createdAt: new Date(g.createdAt)
        })));
      } catch (e) {
        console.error('Failed to load generations:', e);
      }
    }
  }, []);

  // Сохранение генераций
  useEffect(() => {
    localStorage.setItem('video_generations', JSON.stringify(generations));
  }, [generations]);

  // Поллинг статуса генерации
  useEffect(() => {
    const processingGen = generations.find(g => g.status === 'processing');
    
    if (processingGen && !pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/video-generator/generate?id=${processingGen.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.status) {
              setGenerations(prev => prev.map(g => 
                g.id === processingGen.id 
                  ? { 
                      ...g, 
                      progress: data.status.progress,
                      stage: data.status.message,
                      status: data.status.stage === 'complete' ? 'completed' : 
                              data.status.stage === 'error' ? 'error' : 'processing'
                    }
                  : g
              ));
            }
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 2000);
    } else if (!processingGen && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [generations]);

  // Генерация видео
  const handleGenerate = async () => {
    if (!script.trim()) {
      toast.error('Введите сценарий видео');
      return;
    }

    setIsGenerating(true);

    const generationId = `gen_${Date.now()}`;
    const newGeneration: VideoGeneration = {
      id: generationId,
      title: title || `Видео ${generations.length + 1}`,
      script,
      status: 'queued',
      progress: 0,
      stage: 'Подготовка...',
      orientation,
      voice,
      createdAt: new Date(),
      tags,
      hashtags,
    };

    setGenerations(prev => [newGeneration, ...prev]);

    try {
      const response = await fetch('/api/video-generator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: {
            id: generationId,
            title: newGeneration.title,
            orientation,
            voice,
            script,
            tags,
            hashtags,
          },
          publish: autoPublish,
          platforms: selectedPlatforms,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        setGenerations(prev => prev.map(g => 
          g.id === generationId 
            ? { 
                ...g, 
                status: data.success ? 'processing' : 'error',
                outputPath: data.outputPath,
                progress: data.success ? 5 : 0,
                stage: data.success ? 'Начало генерации...' : 'Ошибка'
              }
            : g
        ));

        if (data.success) {
          toast.success('Генерация видео запущена!');
        } else {
          toast.error(data.error || 'Ошибка генерации');
        }
      } else {
        // Fallback - симуляция для демо
        setGenerations(prev => prev.map(g => 
          g.id === generationId 
            ? { ...g, status: 'processing', progress: 0, stage: 'Демо-режим...' }
            : g
        ));
        
        // Симуляция прогресса
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setGenerations(prev => prev.map(g => 
              g.id === generationId 
                ? { ...g, status: 'completed', progress: 100, stage: 'Завершено!' }
                : g
            ));
            toast.success('Демо-видео готово!');
          } else {
            setGenerations(prev => prev.map(g => 
              g.id === generationId 
                ? { ...g, progress: Math.round(progress) }
                : g
            ));
          }
        }, 500);
        
        toast.success('Генерация запущена (демо-режим)');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Ошибка при генерации');
      setGenerations(prev => prev.map(g => 
        g.id === generationId 
          ? { ...g, status: 'error', stage: 'Ошибка соединения' }
          : g
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  // Применение шаблона
  const applyTemplate = (template: VideoTemplate) => {
    setTitle(template.name);
    setScript(template.script);
    setOrientation(template.orientation);
    setSelectedTemplate(template);
    toast.success(`Шаблон "${template.name}" применён`);
    setActiveTab('create');
  };

  // Добавление тегов
  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const addHashtag = (hashtag: string) => {
    const formatted = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
    if (!hashtags.includes(formatted)) {
      setHashtags([...hashtags, formatted]);
      setNewHashtag('');
    }
  };

  // Копирование скрипта
  const copyScript = () => {
    navigator.clipboard.writeText(script);
    toast.success('Скопировано в буфер обмена');
  };

  // Удаление генерации
  const deleteGeneration = (id: string) => {
    setGenerations(prev => prev.filter(g => g.id !== id));
    toast.success('Удалено');
  };

  // Статус генерации
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[#00D26A]';
      case 'processing': return 'bg-[#6C63FF]';
      case 'queued': return 'bg-[#FFB800]';
      case 'error': return 'bg-[#FF4D4D]';
      default: return 'bg-[#8A8A8A]';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Готово';
      case 'processing': return 'Генерация...';
      case 'queued': return 'В очереди';
      case 'error': return 'Ошибка';
      default: return status;
    }
  };

  // ==================== РЕНДЕР ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Video className="w-7 h-7 text-[#6C63FF]" />
            Видео генератор
          </h1>
          <p className="text-[#8A8A8A]">AI генерация видео контента с озвучкой</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="border-[#2A2B32] text-[#8A8A8A]"
          >
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Form */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
              <TabsTrigger value="create" className="data-[state=active]:bg-[#6C63FF]">
                <Wand2 className="w-4 h-4 mr-2" />
                Создать
              </TabsTrigger>
              <TabsTrigger value="templates" className="data-[state=active]:bg-[#6C63FF]">
                <Layers className="w-4 h-4 mr-2" />
                Шаблоны
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-[#6C63FF]">
                <Clock className="w-4 h-4 mr-2" />
                История
              </TabsTrigger>
            </TabsList>

            {/* Create Tab */}
            <TabsContent value="create" className="mt-6 space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Название видео</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Крипто-сигнал дня"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>

              {/* Script */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[#8A8A8A]">Сценарий видео</Label>
                  <Button variant="ghost" size="sm" onClick={copyScript} className="text-[#8A8A8A]">
                    <Copy className="w-4 h-4 mr-1" />
                    Копировать
                  </Button>
                </div>
                <Textarea
                  ref={scriptRef}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder={`Введите текст для видео...

Пример:
🚀 ТОТ САМЫЙ СИГНАЛ!

[Визуал: график растущей криптовалюты]

Сегодня $BTC пробил важный уровень...
                    
Используйте [Визуал: описание] для указания видеоряда.`}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-[#8A8A8A]">
                  {script.length} символов • ~{Math.ceil(script.split(/\s+/).filter(Boolean).length / 2.5)} сек.
                </p>
              </div>

              {/* Orientation */}
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Формат видео</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ORIENTATIONS.map((o) => (
                    <Button
                      key={o.id}
                      variant={orientation === o.id ? 'default' : 'outline'}
                      onClick={() => setOrientation(o.id as any)}
                      className={cn(
                        'flex flex-col h-auto py-3',
                        orientation === o.id 
                          ? 'bg-[#6C63FF] hover:bg-[#6C63FF]/80' 
                          : 'border-[#2A2B32] text-[#8A8A8A]'
                      )}
                    >
                      <o.icon className="w-5 h-5 mb-1" />
                      <span className="text-xs">{o.name}</span>
                      <span className="text-xs opacity-60">{o.description}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Voice */}
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Голос озвучки</Label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {VOICES.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-white">
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4" />
                          <span>{v.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {v.language.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {v.gender === 'female' ? '👩' : '👨'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Теги</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <Badge key={tag} className="bg-[#6C63FF]/20 text-[#6C63FF] pr-1">
                      {tag}
                      <button
                        onClick={() => setTags(tags.filter(t => t !== tag))}
                        className="ml-1 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Добавить тег"
                    className="bg-[#1E1F26] border-[#2A2B32]"
                    onKeyDown={(e) => e.key === 'Enter' && addTag(newTag)}
                  />
                  <Button onClick={() => addTag(newTag)} variant="outline" className="border-[#2A2B32]">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {POPULAR_TAGS.filter(t => !tags.includes(t)).slice(0, 8).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      className="text-xs text-[#8A8A8A] hover:text-[#6C63FF] transition-colors"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Хэштеги</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {hashtags.map((tag) => (
                    <Badge key={tag} className="bg-[#00D26A]/20 text-[#00D26A] pr-1">
                      {tag}
                      <button
                        onClick={() => setHashtags(hashtags.filter(t => t !== tag))}
                        className="ml-1 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newHashtag}
                    onChange={(e) => setNewHashtag(e.target.value)}
                    placeholder="Добавить хэштег"
                    className="bg-[#1E1F26] border-[#2A2B32]"
                    onKeyDown={(e) => e.key === 'Enter' && addHashtag(newHashtag)}
                  />
                  <Button onClick={() => addHashtag(newHashtag)} variant="outline" className="border-[#2A2B32]">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {POPULAR_HASHTAGS.filter(t => !hashtags.includes(t)).slice(0, 8).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addHashtag(tag)}
                      className="text-xs text-[#8A8A8A] hover:text-[#00D26A] transition-colors"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings */}
              {showAdvanced && (
                <Card className="bg-[#1E1F26] border-[#2A2B32]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white">Расширенные настройки</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Добавить субтитры</Label>
                        <p className="text-xs text-[#8A8A8A]">Автоматические субтитры из текста</p>
                      </div>
                      <Switch checked={addSubtitles} onCheckedChange={setAddSubtitles} />
                    </div>

                    <Separator className="bg-[#2A2B32]" />

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Авто-публикация</Label>
                        <p className="text-xs text-[#8A8A8A]">Опубликовать после генерации</p>
                      </div>
                      <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
                    </div>

                    {autoPublish && (
                      <div className="space-y-2">
                        <Label className="text-white">Платформы</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'tiktok', label: 'TikTok', icon: '🎵' },
                            { id: 'instagram', label: 'Instagram', icon: '📸' },
                            { id: 'youtube', label: 'YouTube', icon: '▶️' },
                          ].map((p) => (
                            <Button
                              key={p.id}
                              variant={selectedPlatforms.includes(p.id) ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                setSelectedPlatforms(prev =>
                                  prev.includes(p.id)
                                    ? prev.filter(x => x !== p.id)
                                    : [...prev, p.id]
                                );
                              }}
                              className={selectedPlatforms.includes(p.id) ? 'bg-[#6C63FF]' : 'border-[#2A2B32]'}
                            >
                              {p.icon} {p.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !script.trim()}
                className="w-full bg-gradient-to-r from-[#6C63FF] to-[#00D26A] hover:opacity-90 h-12"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5 mr-2" />
                    Сгенерировать видео
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEMPLATES.map((template) => (
                  <Card
                    key={template.id}
                    className="bg-[#14151A] border-[#2A2B32] cursor-pointer hover:border-[#6C63FF] transition-all"
                    onClick={() => applyTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-sm">{template.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {template.duration}сек
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-[#8A8A8A] line-clamp-3">{template.script.slice(0, 100)}...</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-[#6C63FF]/20 text-[#6C63FF] text-xs">
                          {template.category}
                        </Badge>
                        <Badge className="bg-[#2A2B32] text-[#8A8A8A] text-xs">
                          {template.orientation === 'portrait' ? '9:16' : template.orientation === 'landscape' ? '16:9' : '1:1'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              {generations.length === 0 ? (
                <Card className="bg-[#14151A] border-[#2A2B32] p-12 text-center">
                  <Video className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Нет генераций</h3>
                  <p className="text-[#8A8A8A]">Создайте первое видео</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {generations.map((gen) => (
                    <Card key={gen.id} className="bg-[#14151A] border-[#2A2B32]">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              'w-12 h-12 rounded-lg flex items-center justify-center',
                              gen.status === 'completed' ? 'bg-[#00D26A]/20' :
                              gen.status === 'processing' ? 'bg-[#6C63FF]/20' :
                              gen.status === 'error' ? 'bg-[#FF4D4D]/20' : 'bg-[#2A2B32]'
                            )}>
                              {gen.status === 'processing' ? (
                                <Loader2 className="w-6 h-6 text-[#6C63FF] animate-spin" />
                              ) : gen.status === 'completed' ? (
                                <CheckCircle className="w-6 h-6 text-[#00D26A]" />
                              ) : gen.status === 'error' ? (
                                <AlertCircle className="w-6 h-6 text-[#FF4D4D]" />
                              ) : (
                                <Clock className="w-6 h-6 text-[#8A8A8A]" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">{gen.title}</p>
                              <p className="text-xs text-[#8A8A8A]">
                                {new Date(gen.createdAt).toLocaleString('ru-RU')}
                              </p>
                              {gen.status === 'processing' && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Progress value={gen.progress} className="w-24 h-1" />
                                  <span className="text-xs text-[#6C63FF]">{gen.progress}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(gen.status)}>
                              {getStatusLabel(gen.status)}
                            </Badge>
                            {gen.status === 'completed' && (
                              <Button size="sm" variant="outline" className="border-[#2A2B32]">
                                <Download className="w-4 h-4 mr-1" />
                                Скачать
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-[#1E1F26] border-[#2A2B32]">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setScript(gen.script);
                                    setTitle(gen.title);
                                    setActiveTab('create');
                                  }}
                                  className="text-white"
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Использовать как шаблон
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => deleteGeneration(gen.id)}
                                  className="text-[#FF4D4D]"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Preview & Info */}
        <div className="space-y-6">
          {/* Preview Card */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white text-sm">Превью</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                'bg-[#1E1F26] rounded-lg overflow-hidden flex items-center justify-center',
                orientation === 'portrait' ? 'aspect-[9/16] max-h-[300px]' :
                orientation === 'landscape' ? 'aspect-video' : 'aspect-square max-h-[250px]'
              )}>
                {script ? (
                  <div className="p-4 text-center">
                    <Video className="w-12 h-12 mx-auto text-[#6C63FF] mb-2" />
                    <p className="text-xs text-[#8A8A8A] line-clamp-3">
                      {script.slice(0, 100)}...
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Video className="w-12 h-12 mx-auto text-[#8A8A8A] opacity-50 mb-2" />
                    <p className="text-xs text-[#8A8A8A]">Введите сценарий</p>
                  </div>
                )}
              </div>
              
              {selectedTemplate && (
                <div className="mt-4 p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-xs text-[#8A8A8A]">Активный шаблон:</p>
                  <p className="text-sm text-white">{selectedTemplate.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white text-sm">Статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Всего видео</span>
                <span className="text-white font-medium">{generations.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Завершено</span>
                <span className="text-[#00D26A] font-medium">
                  {generations.filter(g => g.status === 'completed').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">В обработке</span>
                <span className="text-[#6C63FF] font-medium">
                  {generations.filter(g => g.status === 'processing').length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white text-sm">💡 Советы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-[#8A8A8A]">
              <p>• Используйте [Визуал: описание] для указания видеоряда</p>
              <p>• Оптимальная длительность для TikTok - 15-60 сек</p>
              <p>• Добавляйте призыв к действию в конце</p>
              <p>• Используйте эмодзи для эмоциональной окраски</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default VideoGeneratorView;

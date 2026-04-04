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
  Plus, Minus, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  History, Bookmark, Star, Eye, Edit3, Move, ZoomIn, ZoomOut
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

interface StylePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: {
    temperature: number;
    creativity: number;
    formality: number;
  };
}

interface Workspace {
  id: string;
  name: string;
  contents: GeneratedContent[];
  createdAt: Date;
  updatedAt: Date;
}

// ==================== КОНСТАНТЫ ====================

const PLATFORMS = [
  { id: 'telegram', name: 'Telegram', icon: '📱', color: '#0088cc' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E4405F' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#000000' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#FF0000' },
  { id: 'vk', name: 'VK', icon: '💬', color: '#4A76A8' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: '#1DA1F2' },
];

const CONTENT_STYLES = [
  { id: 'professional', name: 'Профессиональный', icon: '💼' },
  { id: 'casual', name: 'Дружелюбный', icon: '😊' },
  { id: 'provocative', name: 'Провокационный', icon: '🔥' },
  { id: 'storytelling', name: 'Сторителлинг', icon: '📖' },
  { id: 'humor', name: 'Юмористический', icon: '😄' },
  { id: 'educational', name: 'Обучающий', icon: '📚' },
  { id: 'promotional', name: 'Продающий', icon: '💰' },
  { id: 'viral', name: 'Вирусный', icon: '🦠' },
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
];

const TEMPLATES: ContentTemplate[] = [
  { id: '1', name: 'Казино - Выигрыш', category: 'gambling', prompt: 'Пост о крупном выигрыше в казино, эмоциональный, с призывом к действию', popular: true },
  { id: '2', name: 'Крипта - Сигнал', category: 'crypto', prompt: 'Анализ криптовалюты с прогнозом и рекомендацией', popular: true },
  { id: '3', name: 'Нутра - До/После', category: 'nutra', prompt: 'История трансформации с результатами продукта' },
  { id: '4', name: 'Дейтинг - История', category: 'dating', prompt: 'Романтическая история с эмоциональным крючком' },
  { id: '5', name: 'Lifestyle - День', category: 'lifestyle', prompt: 'Рассказ о продуктивном дне успешного человека' },
  { id: '6', name: 'Обучающий пост', category: 'education', prompt: 'Полезный совет или лайфхак в нише' },
  { id: '7', name: 'Провокационный вопрос', category: 'engagement', prompt: 'Вопрос, вызывающий дискуссию в комментариях' },
  { id: '8', name: 'Story - Серия', category: 'stories', prompt: 'Серия из 5 сторис для Instagram с призывом' },
];

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function HunyuanStudioPro() {
  // Состояния
  const [activeTab, setActiveTab] = useState('create');
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState<'text' | 'image' | 'video' | 'story'>('text');
  const [platform, setPlatform] = useState('telegram');
  const [style, setStyle] = useState('casual');
  const [imageStyle, setImageStyle] = useState('realistic');
  
  // Генерация
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  
  // Результаты
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  
  // История
  const [history, setHistory] = useState<GeneratedContent[]>([]);
  
  // Продвинутые настройки
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [creativity, setCreativity] = useState(0.8);
  const [length, setLength] = useState('medium');
  
  // Редактор
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  // Preview
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  
  // Refs
  const promptRef = useRef<HTMLTextAreaElement>(null);

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

  // Генерация текста
  const generateText = async () => {
    if (!prompt.trim()) {
      toast.error('Введите описание для генерации');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStep('Анализ промпта...');

    try {
      // Симуляция прогресса
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/hunyuan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'text',
          prompt,
          platform,
          style,
          settings: {
            temperature,
            creativity,
            length,
          },
        }),
      });

      clearInterval(progressInterval);
      setGenerationProgress(95);
      setGenerationStep('Финализация...');

      if (response.ok) {
        const data = await response.json();
        
        const content: GeneratedContent = {
          id: `content_${Date.now()}`,
          type: 'text',
          content: data.content || data.result || generateFallbackText(),
          prompt,
          platform,
          style,
          timestamp: new Date(),
          metadata: { temperature, creativity, length },
        };

        setGeneratedContent(content);
        saveToHistory(content);
        setGenerationProgress(100);
        setGenerationStep('Готово!');
        
        toast.success('Контент успешно сгенерирован!');
      } else {
        // Fallback при ошибке API
        const content: GeneratedContent = {
          id: `content_${Date.now()}`,
          type: 'text',
          content: generateFallbackText(),
          prompt,
          platform,
          style,
          timestamp: new Date(),
        };
        
        setGeneratedContent(content);
        saveToHistory(content);
        setGenerationProgress(100);
        toast.success('Контент сгенерирован (локально)');
      }
    } catch (error) {
      console.error('Generation error:', error);
      
      // Fallback при ошибке
      const content: GeneratedContent = {
        id: `content_${Date.now()}`,
        type: 'text',
        content: generateFallbackText(),
        prompt,
        platform,
        style,
        timestamp: new Date(),
      };
      
      setGeneratedContent(content);
      saveToHistory(content);
      setGenerationProgress(100);
      toast.success('Контент сгенерирован (fallback)');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setGenerationStep('');
      }, 500);
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

      // Используем z-ai-web-dev-sdk для генерации изображений
      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${prompt}, ${imageStyle} style, high quality, detailed`,
          size: '1024x1024',
        }),
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        
        const image: GeneratedImage = {
          id: `img_${Date.now()}`,
          url: data.url || data.image || `/api/placeholder/1024/1024?text=${encodeURIComponent(prompt.slice(0, 30))}`,
          prompt,
          style: imageStyle,
          timestamp: new Date(),
          favorite: false,
        };

        setGeneratedImages(prev => [image, ...prev]);
        setSelectedImage(image);
        setGenerationProgress(100);
        setGenerationStep('Готово!');
        
        toast.success('Изображение сгенерировано!');
      } else {
        // Fallback - создаем placeholder
        const image: GeneratedImage = {
          id: `img_${Date.now()}`,
          url: `/api/placeholder/1024/1024?text=${encodeURIComponent(prompt.slice(0, 30))}`,
          prompt,
          style: imageStyle,
          timestamp: new Date(),
          favorite: false,
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

  // Fallback генератор текста
  const generateFallbackText = () => {
    const templates = {
      gambling: [
        '🎰 Друзья, сегодня невероятный день! +500% к депозиту за утро. Кто ещё не с нами - присоединяйтесь!\n\n✅ Проверенная платформа\n✅ Моментальные выплаты\n✅ Бонусы новичкам\n\nПереходи по ссылке в профиле 👆',
        '💰 Наконец-то сорвал куш! Сколько я ждал этого момента...\n\nСекрет прост - правильная стратегия и проверенное казино. Делюсь в личке, кто хочет повторить 🔥',
      ],
      crypto: [
        '📈 $BTC обновляет максимумы! А ты всё сомневаешься?\n\nМой портфель за неделю: +127%\n\nСигналы, которые работают:\n• Точный вход\n• Стоп-лосс\n• Профит\n\nПодписывайся на канал, завтра новый сигнал 🚀',
        '💎 HODL или продавать? Вот в чём вопрос...\n\nМой анализ показывает, что мы только в начале бычьего рынка. Аллигатор спит, MACD растёт.\n\nПолный разбор в закрепе 📊',
      ],
      lifestyle: [
        '✨ Утро успешного человека:\n\n5:00 - Подъём\n6:00 - Тренировка\n7:00 - Медитация\n8:00 - Работа\n\nДисциплина - ключ к успеху. Кто со мной? 💪',
      ],
      default: [
        '🔥 Новый пост на тему: ' + prompt + '\n\nЭто пример сгенерированного контента. Для полноценной генерации подключите API.\n\n#контент #маркетинг',
      ],
    };

    const category = prompt.toLowerCase().includes('казино') ? 'gambling' :
                     prompt.toLowerCase().includes('крипт') ? 'crypto' :
                     prompt.toLowerCase().includes('лайфстайл') ? 'lifestyle' : 'default';

    const categoryTemplates = templates[category as keyof typeof templates] || templates.default;
    return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  };

  // Главная функция генерации
  const handleGenerate = () => {
    if (contentType === 'image') {
      generateImage();
    } else {
      generateText();
    }
  };

  // Копирование в буфер
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано в буфер обмена');
  };

  // Редактирование
  const startEditing = () => {
    if (generatedContent) {
      setEditedContent(generatedContent.content);
      setIsEditing(true);
    }
  };

  const saveEditing = () => {
    if (generatedContent) {
      setGeneratedContent({ ...generatedContent, content: editedContent });
      setIsEditing(false);
      toast.success('Изменения сохранены');
    }
  };

  // Применить шаблон
  const applyTemplate = (template: ContentTemplate) => {
    setPrompt(template.prompt);
    promptRef.current?.focus();
    toast.info(`Шаблон "${template.name}" применён`);
  };

  // ==================== РЕНДЕР ====================

  return (
    <div className="h-full flex flex-col bg-[#0f0f12]">
      {/* Header */}
      <div className="border-b border-[#2A2B32] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Hunyuan Studio Pro</h1>
              <p className="text-xs text-[#8A8A8A]">AI-студия создания контента</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#00D26A] text-[#00D26A]">
              <Zap className="w-3 h-3 mr-1" />
              Pro
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => setShowAdvanced(!showAdvanced)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-80 border-r border-[#2A2B32] flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 px-2 pt-2">
              <TabsTrigger value="create" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Создать
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs">
                <Layout className="w-3 h-3 mr-1" />
                Шаблоны
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                <History className="w-3 h-3 mr-1" />
                История
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-4">
              {/* Create Tab */}
              <TabsContent value="create" className="m-0 space-y-4">
                {/* Content Type */}
                <div className="space-y-2">
                  <Label className="text-xs text-[#8A8A8A]">Тип контента</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'text', icon: MessageSquare, label: 'Текст' },
                      { type: 'image', icon: Image, label: 'Картинка' },
                      { type: 'video', icon: Video, label: 'Видео' },
                      { type: 'story', icon: Sparkles, label: 'Stories' },
                    ].map(({ type, icon: Icon, label }) => (
                      <Button
                        key={type}
                        variant={contentType === type ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'justify-start',
                          contentType === type && 'bg-[#6C63FF] hover:bg-[#6C63FF]/80'
                        )}
                        onClick={() => setContentType(type as any)}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Platform */}
                <div className="space-y-2">
                  <Label className="text-xs text-[#8A8A8A]">Платформа</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="mr-2">{p.icon}</span>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Style */}
                <div className="space-y-2">
                  <Label className="text-xs text-[#8A8A8A]">Стиль</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_STYLES.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="mr-2">{s.icon}</span>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Image Style (if image type) */}
                {contentType === 'image' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-[#8A8A8A]">Стиль изображения</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {IMAGE_STYLES.slice(0, 4).map(s => (
                        <Button
                          key={s.id}
                          variant={imageStyle === s.id ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            'justify-start text-xs',
                            imageStyle === s.id && 'bg-[#6C63FF] hover:bg-[#6C63FF]/80'
                          )}
                          onClick={() => setImageStyle(s.id)}
                        >
                          <span className="mr-1">{s.preview}</span>
                          {s.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompt */}
                <div className="space-y-2">
                  <Label className="text-xs text-[#8A8A8A]">Описание / Промпт</Label>
                  <Textarea
                    ref={promptRef}
                    placeholder="Опишите что хотите создать..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="bg-[#1E1F26] border-[#2A2B32] min-h-[120px] resize-none"
                  />
                </div>

                {/* Advanced Settings */}
                {showAdvanced && (
                  <div className="space-y-4 p-3 bg-[#1E1F26] rounded-lg">
                    <Label className="text-xs text-[#8A8A8A]">Продвинутые настройки</Label>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8A8A8A]">Температура</span>
                        <span className="text-white">{temperature.toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[temperature]}
                        onValueChange={([v]) => setTemperature(v)}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8A8A8A]">Креативность</span>
                        <span className="text-white">{creativity.toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[creativity]}
                        onValueChange={([v]) => setCreativity(v)}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-[#8A8A8A]">Длина</Label>
                      <Select value={length} onValueChange={setLength}>
                        <SelectTrigger className="bg-[#14151A] border-[#2A2B32]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Короткий</SelectItem>
                          <SelectItem value="medium">Средний</SelectItem>
                          <SelectItem value="long">Длинный</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

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
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Сгенерировать
                    </>
                  )}
                </Button>
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="m-0 space-y-2">
                <div className="flex gap-2 mb-4">
                  <Input placeholder="Поиск шаблонов..." className="bg-[#1E1F26] border-[#2A2B32]" />
                </div>
                
                {TEMPLATES.map(template => (
                  <Card
                    key={template.id}
                    className="bg-[#1E1F26] border-[#2A2B32] cursor-pointer hover:border-[#6C63FF] transition-colors"
                    onClick={() => applyTemplate(template)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-white">{template.name}</span>
                            {template.popular && (
                              <Badge variant="secondary" className="text-xs">🔥</Badge>
                            )}
                          </div>
                          <p className="text-xs text-[#8A8A8A] mt-1 line-clamp-2">{template.prompt}</p>
                        </div>
                        <Badge variant="outline" className="text-xs border-[#2A2B32]">
                          {template.category}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="m-0 space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto text-[#8A8A8A] mb-2" />
                    <p className="text-sm text-[#8A8A8A]">История пуста</p>
                  </div>
                ) : (
                  history.map(item => (
                    <Card
                      key={item.id}
                      className="bg-[#1E1F26] border-[#2A2B32] cursor-pointer hover:border-[#6C63FF] transition-colors"
                      onClick={() => {
                        setGeneratedContent(item);
                        setPrompt(item.prompt);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {item.type === 'text' ? '📝' : item.type === 'image' ? '🖼️' : '🎬'}
                          </Badge>
                          <span className="text-xs text-[#8A8A8A]">
                            {new Date(item.timestamp).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <p className="text-sm text-white line-clamp-2">{item.content}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Right Panel - Preview & Editor */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="border-b border-[#2A2B32] p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              {generatedContent && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent.content)}>
                    <Copy className="w-4 h-4 mr-1" />
                    Копировать
                  </Button>
                  <Button variant="ghost" size="sm" onClick={startEditing}>
                    <Edit3 className="w-4 h-4 mr-1" />
                    Редактировать
                  </Button>
                  <Button variant="default" size="sm">
                    <Send className="w-4 h-4 mr-1" />
                    Опубликовать
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Preview Area */}
          <ScrollArea className="flex-1 p-6">
            {!generatedContent && generatedImages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-[#1E1F26] flex items-center justify-center mb-4">
                    <Wand2 className="w-10 h-10 text-[#6C63FF]" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Создайте контент</h3>
                  <p className="text-sm text-[#8A8A8A] max-w-sm">
                    Введите описание в левой панели и нажмите "Сгенерировать" для создания контента с помощью AI
                  </p>
                </div>
              </div>
            ) : (
              <div className={cn(
                'mx-auto transition-all duration-300',
                previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-2xl'
              )}>
                {/* Content Preview */}
                {generatedContent && (
                  <Card className="bg-[#1E1F26] border-[#2A2B32]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {PLATFORMS.find(p => p.id === platform)?.icon} {platform}
                          </Badge>
                          <Badge variant="outline">
                            {CONTENT_STYLES.find(s => s.id === style)?.icon} {style}
                          </Badge>
                        </div>
                        <span className="text-xs text-[#8A8A8A]">
                          {new Date(generatedContent.timestamp).toLocaleString('ru-RU')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isEditing ? (
                        <div className="space-y-4">
                          <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-[200px] bg-[#14151A] border-[#2A2B32]"
                          />
                          <div className="flex gap-2">
                            <Button onClick={saveEditing} size="sm">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Сохранить
                            </Button>
                            <Button variant="ghost" onClick={() => setIsEditing(false)} size="sm">
                              Отмена
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <p className="whitespace-pre-wrap text-white leading-relaxed">
                            {generatedContent.content}
                          </p>
                        </div>
                      )}
                      
                      {/* Quick Actions */}
                      {!isEditing && (
                        <div className="flex gap-2 mt-4 pt-4 border-t border-[#2A2B32]">
                          <Button variant="outline" size="sm">
                            <ThumbsUp className="w-4 h-4 mr-1" />
                            Хорошо
                          </Button>
                          <Button variant="outline" size="sm">
                            <ThumbsDown className="w-4 h-4 mr-1" />
                            Переделать
                          </Button>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Вариант
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Image Preview */}
                {selectedImage && (
                  <Card className="bg-[#1E1F26] border-[#2A2B32] mt-4">
                    <CardContent className="p-4">
                      <div className="aspect-square relative rounded-lg overflow-hidden bg-[#14151A]">
                        <img
                          src={selectedImage.url}
                          alt={selectedImage.prompt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white">{selectedImage.prompt}</p>
                          <p className="text-xs text-[#8A8A8A]">{selectedImage.style}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Star className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Image Gallery */}
                {generatedImages.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-white mb-2">Галерея</h4>
                    <div className="grid grid-cols-4 gap-2">
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

// Добавляем недостающие иконки
function Smartphone({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function Monitor({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

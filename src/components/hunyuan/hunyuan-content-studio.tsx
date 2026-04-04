'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { 
  Sparkles, Play, Pause, Square, Send, Image, Video, Music, 
  MessageSquare, TrendingUp, Clock, Brain, Zap, Moon, Sun,
  BarChart3, Target, RefreshCw, Settings, Download, Share2,
  ThumbsUp, ThumbsDown, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';

// Интерфейсы для новых функций
interface GenerationProgress {
  step: string;
  content: string;
  progress: number;
  canEdit: boolean;
}

interface StyleRating {
  overallRating: number;
  toneMatch: number;
  styleMatch: number;
  audienceMatch: number;
  timingMatch: number;
  message: string;
}

interface ContentIdea {
  id: string;
  title: string;
  description: string;
  contentType: string;
  relevantDate: Date;
  priority: number;
  status: string;
}

export function HunyuanContentStudio() {
  // Состояния
  const [activeTab, setActiveTab] = useState('generate');
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState<'post' | 'image' | 'video' | 'story'>('post');
  const [platform, setPlatform] = useState('telegram');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Рейтинг стиля
  const [styleRating, setStyleRating] = useState<StyleRating | null>(null);
  
  // Полный авто-режим
  const [fullAutoEnabled, setFullAutoEnabled] = useState(false);
  const [autoConfig, setAutoConfig] = useState({
    postsPerDay: 5,
    storiesPerDay: 3,
    workHoursStart: '09:00',
    workHoursEnd: '22:00',
  });
  
  // Идеи контента
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  
  // Анализ времени
  const [bestTimeRecommendation, setBestTimeRecommendation] = useState<string>('');
  
  // Тренды
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  
  // Эмоции аудитории
  const [audienceEmotion, setAudienceEmotion] = useState<{
    primaryEmotion: string;
    mood: string;
    recommendedTone: string;
  } | null>(null);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadStyleRating();
    loadContentIdeas();
    loadBestTime();
    loadTrends();
    loadAudienceEmotion();
  }, []);

  // Загрузка рейтинга стиля
  const loadStyleRating = async () => {
    try {
      const response = await fetch('/api/ai/style-rating');
      if (response.ok) {
        const data = await response.json();
        setStyleRating(data);
      }
    } catch (error) {
      console.error('Failed to load style rating:', error);
    }
  };

  // Загрузка идей контента
  const loadContentIdeas = async () => {
    try {
      const response = await fetch('/api/content/ideas');
      if (response.ok) {
        const data = await response.json();
        setContentIdeas(data.ideas || []);
      }
    } catch (error) {
      console.error('Failed to load content ideas:', error);
    }
  };

  // Загрузка лучшего времени
  const loadBestTime = async () => {
    try {
      const response = await fetch('/api/content/best-time');
      if (response.ok) {
        const data = await response.json();
        setBestTimeRecommendation(data.recommendation || '');
      }
    } catch (error) {
      console.error('Failed to load best time:', error);
    }
  };

  // Загрузка трендов
  const loadTrends = async () => {
    try {
      const response = await fetch('/api/content/trends');
      if (response.ok) {
        const data = await response.json();
        setTrendingTopics(data.trends || []);
      }
    } catch (error) {
      console.error('Failed to load trends:', error);
    }
  };

  // Загрузка эмоций аудитории
  const loadAudienceEmotion = async () => {
    try {
      const response = await fetch('/api/audience/emotion');
      if (response.ok) {
        const data = await response.json();
        setAudienceEmotion(data);
      }
    } catch (error) {
      console.error('Failed to load audience emotion:', error);
    }
  };

  // Пошаговая генерация
  const handleStepByStepGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setGenerationProgress(null);
    
    try {
      const response = await fetch('/api/content/step-by-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          prompt,
          platform,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Следим за прогрессом
        pollGenerationStatus(data.id);
      }
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
    }
  };

  // Опрос статуса генерации
  const pollGenerationStatus = async (generationId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/content/step-by-step/${generationId}`);
        if (response.ok) {
          const data = await response.json();
          setGenerationProgress(data);
          
          if (data.status === 'generating' && !isPaused) {
            setTimeout(poll, 1000);
          } else if (data.status === 'completed') {
            setIsGenerating(false);
            setGeneratedContent(data.content || '');
          }
        }
      } catch (error) {
        console.error('Poll error:', error);
        setIsGenerating(false);
      }
    };
    
    poll();
  };

  // Пауза генерации
  const handlePause = async () => {
    setIsPaused(true);
    // API call to pause
  };

  // Продолжение генерации
  const handleResume = async () => {
    setIsPaused(false);
    // API call to resume
  };

  // Отмена генерации
  const handleCancel = async () => {
    setIsGenerating(false);
    setIsPaused(false);
    // API call to cancel
  };

  // Быстрая генерация
  const handleQuickGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/hunyuan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: contentType === 'video' ? 'video' : 'image',
          prompt,
          platform,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(data.content || data.mediaUrl || '');
      }
    } catch (error) {
      console.error('Quick generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Переключение полного авто-режима
  const toggleFullAuto = async () => {
    try {
      const response = await fetch('/api/content/full-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !fullAutoEnabled,
          config: autoConfig,
        }),
      });

      if (response.ok) {
        setFullAutoEnabled(!fullAutoEnabled);
      }
    } catch (error) {
      console.error('Failed to toggle full auto mode:', error);
    }
  };

  // Генерация идей на неделю
  const generateWeeklyIdeas = async () => {
    try {
      const response = await fetch('/api/content/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'general',
          platform,
          count: 7,
        }),
      });

      if (response.ok) {
        loadContentIdeas();
      }
    } catch (error) {
      console.error('Failed to generate ideas:', error);
    }
  };

  // Генерация Stories-слайдов
  const generateStories = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/content/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: prompt,
          platform: 'instagram',
          slidesCount: 5,
          includeCta: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Handle generated stories
      }
    } catch (error) {
      console.error('Stories generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Генерация мема
  const generateMeme = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/content/meme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: prompt,
          autoGenerate: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(data.imageUrl || '');
      }
    } catch (error) {
      console.error('Meme generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Генерация опроса
  const generatePoll = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/content/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          topic: prompt,
          optionsCount: 4,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(`📊 ${data.question}\n\n${data.options.map((o: any, i: number) => `${i + 1}. ${o.text}`).join('\n')}`);
      }
    } catch (error) {
      console.error('Poll generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Рендеринг вкладки генерации
  const renderGenerateTab = () => (
    <div className="space-y-6">
      {/* Тип контента */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { type: 'post', icon: MessageSquare, label: 'Пост' },
          { type: 'image', icon: Image, label: 'Изображение' },
          { type: 'video', icon: Video, label: 'Видео' },
          { type: 'story', icon: Sparkles, label: 'Stories' },
        ].map(({ type, icon: Icon, label }) => (
          <Button
            key={type}
            variant={contentType === type ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => setContentType(type as any)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Платформа */}
      <div className="space-y-2">
        <Label>Платформа</Label>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="telegram">Telegram</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="vk">VK</SelectItem>
            <SelectItem value="twitter">Twitter/X</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Промпт */}
      <div className="space-y-2">
        <Label>Описание / Промпт</Label>
        <Textarea
          placeholder="Опишите что хотите создать..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
        />
      </div>

      {/* Рейтинг стиля */}
      {styleRating && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              AI понимает вас на {styleRating.overallRating}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Тон: {styleRating.toneMatch}%</div>
              <div>Стиль: {styleRating.styleMatch}%</div>
              <div>Аудитория: {styleRating.audienceMatch}%</div>
              <div>Тайминг: {styleRating.timingMatch}%</div>
            </div>
            <Progress value={styleRating.overallRating} className="mt-2 h-2" />
          </CardContent>
        </Card>
      )}

      {/* Прогресс генерации */}
      {generationProgress && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {generationProgress.step} - {Math.round(generationProgress.progress)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={generationProgress.progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {generationProgress.content.substring(0, 200)}...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Кнопки управления */}
      <div className="flex flex-wrap gap-2">
        {!isGenerating ? (
          <>
            <Button onClick={handleStepByStepGenerate} className="flex-1">
              <Play className="mr-2 h-4 w-4" />
              Пошаговая генерация
            </Button>
            <Button onClick={handleQuickGenerate} variant="secondary" className="flex-1">
              <Zap className="mr-2 h-4 w-4" />
              Быстрая генерация
            </Button>
          </>
        ) : (
          <>
            {isPaused ? (
              <Button onClick={handleResume} variant="default">
                <Play className="mr-2 h-4 w-4" />
                Продолжить
              </Button>
            ) : (
              <Button onClick={handlePause} variant="secondary">
                <Pause className="mr-2 h-4 w-4" />
                Пауза
              </Button>
            )}
            <Button onClick={handleCancel} variant="destructive">
              <Square className="mr-2 h-4 w-4" />
              Отмена
            </Button>
          </>
        )}
      </div>

      {/* Специализированные генераторы */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button onClick={generateStories} variant="outline" size="sm">
          <Sparkles className="mr-2 h-4 w-4" />
          Stories
        </Button>
        <Button onClick={generatePoll} variant="outline" size="sm">
          <BarChart3 className="mr-2 h-4 w-4" />
          Опрос
        </Button>
        <Button onClick={generateMeme} variant="outline" size="sm">
          <Image className="mr-2 h-4 w-4" />
          Мем
        </Button>
        <Button variant="outline" size="sm">
          <Music className="mr-2 h-4 w-4" />
          GIF
        </Button>
      </div>

      {/* Результат */}
      {generatedContent && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Результат</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm">
              {generatedContent}
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline">
                <ThumbsUp className="mr-2 h-4 w-4" />
                Хорошо
              </Button>
              <Button size="sm" variant="outline">
                <ThumbsDown className="mr-2 h-4 w-4" />
                Исправить
              </Button>
              <Button size="sm" variant="default">
                <Send className="mr-2 h-4 w-4" />
                Опубликовать
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Рендеринг вкладки автоматизации
  const renderAutoTab = () => (
    <div className="space-y-6">
      {/* Полный авто-режим */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Moon className="mr-2 h-5 w-5" />
              Режим "Спи и зарабатывай"
            </span>
            <Switch checked={fullAutoEnabled} onCheckedChange={toggleFullAuto} />
          </CardTitle>
          <CardDescription>
            Софт сам: генерирует → публикует → анализирует → корректирует
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Постов в день</Label>
              <Input
                type="number"
                value={autoConfig.postsPerDay}
                onChange={(e) => setAutoConfig({ ...autoConfig, postsPerDay: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Stories в день</Label>
              <Input
                type="number"
                value={autoConfig.storiesPerDay}
                onChange={(e) => setAutoConfig({ ...autoConfig, storiesPerDay: parseInt(e.target.value) || 3 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Начало работы</Label>
              <Input
                type="time"
                value={autoConfig.workHoursStart}
                onChange={(e) => setAutoConfig({ ...autoConfig, workHoursStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Конец работы</Label>
              <Input
                type="time"
                value={autoConfig.workHoursEnd}
                onChange={(e) => setAutoConfig({ ...autoConfig, workHoursEnd: e.target.value })}
              />
            </div>
          </div>
          {fullAutoEnabled && (
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="mr-2 h-4 w-4" />
              Автоматический режим активен. Отчёт утром в Telegram.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Воронки постов */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <Target className="mr-2 h-4 w-4" />
            Авто-цепочки постов (воронки)
          </CardTitle>
          <CardDescription>
            Пост 1 → Пост 2 → Пост 3 → Конверсия
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Создать воронку
          </Button>
        </CardContent>
      </Card>

      {/* Вечнозелёный контент */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            Вечнозелёный контент
          </CardTitle>
          <CardDescription>
            Авто-обновление старых успешных постов (6+ месяцев)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Найти кандидатов
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Рендеринг вкладки аналитики
  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Лучшее время */}
      {bestTimeRecommendation && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Лучшее время публикации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{bestTimeRecommendation}</p>
          </CardContent>
        </Card>
      )}

      {/* Тренды */}
      {trendingTopics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              Трендовые темы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trendingTopics.map((topic, i) => (
                <Badge key={i} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Эмоции аудитории */}
      {audienceEmotion && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              Эмоциональный анализ аудитории
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>Основная эмоция: <Badge>{audienceEmotion.primaryEmotion}</Badge></div>
              <div>Настроение: <Badge variant="outline">{audienceEmotion.mood}</Badge></div>
              <div>Рекомендуемый тон: <strong>{audienceEmotion.recommendedTone}</strong></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Идеи контента */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center">
              <Sparkles className="mr-2 h-4 w-4" />
              Идеи на неделю
            </span>
            <Button size="sm" variant="outline" onClick={generateWeeklyIdeas}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Сгенерировать
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contentIdeas.length > 0 ? (
            <div className="space-y-2">
              {contentIdeas.slice(0, 7).map((idea, i) => (
                <div key={idea.id || i} className="p-2 border rounded text-sm">
                  <div className="font-medium">{idea.title}</div>
                  <div className="text-xs text-muted-foreground">{idea.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Нажмите "Сгенерировать" для создания идей
            </p>
          )}
        </CardContent>
      </Card>

      {/* Анализ провалов */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <AlertCircle className="mr-2 h-4 w-4" />
            Анализ "почему пост провалился"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Выберите пост для анализа причин неудачи
          </p>
          <Button variant="outline" size="sm">
            Анализировать пост
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">
            <Sparkles className="mr-2 h-4 w-4" />
            Генерация
          </TabsTrigger>
          <TabsTrigger value="auto">
            <Zap className="mr-2 h-4 w-4" />
            Автоматизация
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Аналитика
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 mt-4">
          <TabsContent value="generate" className="m-0">
            {renderGenerateTab()}
          </TabsContent>
          <TabsContent value="auto" className="m-0">
            {renderAutoTab()}
          </TabsContent>
          <TabsContent value="analytics" className="m-0">
            {renderAnalyticsTab()}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export default HunyuanContentStudio;

// Добавляем недостающий импорт
function Plus({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

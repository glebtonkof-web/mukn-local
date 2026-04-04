'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, Video, Sparkles, Image, FileText, 
  Plus, Clock, CheckCircle, AlertTriangle, Loader2, Trash2, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Типы данных
interface ContentCalendarItem {
  id: string;
  type: 'post' | 'comment' | 'dm' | 'story';
  status: 'pending' | 'scheduled' | 'executing' | 'completed' | 'failed' | 'cancelled';
  scheduledAt: string;
  priority: number;
  influencer?: {
    id: string;
    name: string;
    niche?: string;
  };
  offer?: {
    id: string;
    name: string;
  };
}

interface StorySlide {
  id: string;
  name: string;
  platform: string;
  slidesCount: number;
  status: string;
  createdAt: string;
  scheduledAt?: string;
}

interface ContentIdea {
  id: string;
  title: string;
  description?: string;
  contentType: string;
  relevantDate: string;
  status: string;
  niche?: string;
}

interface AIGeneration {
  id: string;
  contentType: string;
  generatedText: string;
  style?: string;
  niche?: string;
  createdAt: string;
  aiModel?: string;
}

// Состояния загрузки
interface LoadingStates {
  calendar: boolean;
  stories: boolean;
  ideas: boolean;
  aiGenerations: boolean;
  action: boolean;
}

// Статусы для Badge
const statusColors: Record<string, string> = {
  published: 'bg-[#00D26A]',
  completed: 'bg-[#00D26A]',
  scheduled: 'bg-[#FFB800]',
  pending: 'bg-[#8A8A8A]',
  processing: 'bg-[#FFB800]',
  queued: 'bg-[#6C63FF]',
  draft: 'bg-[#8A8A8A]',
  failed: 'bg-[#FF4444]',
  cancelled: 'bg-[#FF4444]',
  generating: 'bg-[#FFB800]',
};

const statusLabels: Record<string, string> = {
  published: 'Опубликован',
  completed: 'Готово',
  scheduled: 'Запланирован',
  pending: 'Ожидает',
  processing: 'В процессе',
  queued: 'В очереди',
  draft: 'Черновик',
  failed: 'Ошибка',
  cancelled: 'Отменен',
  generating: 'Генерация',
};

export function ContentView() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [loading, setLoading] = useState<LoadingStates>({
    calendar: true,
    stories: true,
    ideas: true,
    aiGenerations: true,
    action: false,
  });
  
  // Данные
  const [calendarItems, setCalendarItems] = useState<ContentCalendarItem[]>([]);
  const [stories, setStories] = useState<StorySlide[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [aiGenerations, setAiGenerations] = useState<AIGeneration[]>([]);
  
  // Ошибки
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Загрузка календаря контента
  const fetchContentCalendar = useCallback(async () => {
    setLoading(prev => ({ ...prev, calendar: true }));
    setErrors(prev => ({ ...prev, calendar: '' }));
    
    try {
      const response = await fetch('/api/content-calendar?limit=20');
      if (!response.ok) throw new Error('Ошибка загрузки календаря');
      
      const data = await response.json();
      setCalendarItems(data.contentQueue || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setErrors(prev => ({ ...prev, calendar: message }));
      toast.error('Не удалось загрузить календарь');
    } finally {
      setLoading(prev => ({ ...prev, calendar: false }));
    }
  }, []);

  // Загрузка сторис
  const fetchStories = useCallback(async () => {
    setLoading(prev => ({ ...prev, stories: true }));
    setErrors(prev => ({ ...prev, stories: '' }));
    
    try {
      const response = await fetch('/api/content/stories?limit=10');
      if (!response.ok) throw new Error('Ошибка загрузки сторис');
      
      const data = await response.json();
      setStories(data.stories || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setErrors(prev => ({ ...prev, stories: message }));
      toast.error('Не удалось загрузить сторис');
    } finally {
      setLoading(prev => ({ ...prev, stories: false }));
    }
  }, []);

  // Загрузка идей контента
  const fetchIdeas = useCallback(async () => {
    setLoading(prev => ({ ...prev, ideas: true }));
    setErrors(prev => ({ ...prev, ideas: '' }));
    
    try {
      const response = await fetch('/api/content/ideas');
      if (!response.ok) throw new Error('Ошибка загрузки идей');
      
      const data = await response.json();
      setIdeas(data.ideas || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setErrors(prev => ({ ...prev, ideas: message }));
      toast.error('Не удалось загрузить идеи');
    } finally {
      setLoading(prev => ({ ...prev, ideas: false }));
    }
  }, []);

  // Загрузка AI генераций
  const fetchAiGenerations = useCallback(async () => {
    setLoading(prev => ({ ...prev, aiGenerations: true }));
    setErrors(prev => ({ ...prev, aiGenerations: '' }));
    
    try {
      const response = await fetch('/api/ai/generate-content');
      if (!response.ok) throw new Error('Ошибка загрузки генераций');
      
      const data = await response.json();
      // API возвращает шаблоны, для реальных генераций нужен другой endpoint
      setAiGenerations([]);
    } catch {
      // Игнорируем ошибку для AI генераций
      setAiGenerations([]);
    } finally {
      setLoading(prev => ({ ...prev, aiGenerations: false }));
    }
  }, []);

  // Начальная загрузка данных
  useEffect(() => {
    fetchContentCalendar();
    fetchStories();
    fetchIdeas();
    fetchAiGenerations();
  }, [fetchContentCalendar, fetchStories, fetchIdeas, fetchAiGenerations]);

  // Создание контента
  const handleCreateContent = async () => {
    setLoading(prev => ({ ...prev, action: true }));
    
    try {
      const response = await fetch('/api/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'post',
          influencerId: 'default',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          priority: 5,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания');
      }
      
      toast.success('Контент создан');
      fetchContentCalendar();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast.error(`Ошибка: ${message}`);
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  // Удаление контента
  const handleDeleteContent = async (id: string) => {
    try {
      const response = await fetch(`/api/content-calendar?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Ошибка удаления');
      
      toast.success('Удалено');
      setCalendarItems(prev => prev.filter(item => item.id !== id));
    } catch {
      toast.error('Не удалось удалить');
    }
  };

  // Создание сторис
  const handleCreateStory = async () => {
    setLoading(prev => ({ ...prev, action: true }));
    
    try {
      const response = await fetch('/api/content/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Новая сторис',
          platform: 'instagram',
          slidesCount: 5,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания сторис');
      }
      
      toast.success('Сторис создана');
      fetchStories();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast.error(`Ошибка: ${message}`);
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  // Создание видео
  const handleCreateVideo = async () => {
    setLoading(prev => ({ ...prev, action: true }));
    
    try {
      const response = await fetch('/api/video-generator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: {
            title: 'Новое видео',
            scenes: [
              { text: 'Вступление', duration: 5 },
              { text: 'Основная часть', duration: 10 },
              { text: 'Заключение', duration: 5 },
            ],
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания видео');
      }
      
      toast.success('Видео создается...');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast.error(`Ошибка: ${message}`);
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  // Генерация идей
  const handleGenerateIdeas = async () => {
    setLoading(prev => ({ ...prev, action: true }));
    
    try {
      const response = await fetch('/api/content/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'lifestyle',
          platform: 'telegram',
          count: 7,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка генерации идей');
      }
      
      const data = await response.json();
      toast.success(`Сгенерировано ${data.count || 0} идей`);
      fetchIdeas();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast.error(`Ошибка: ${message}`);
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  // AI генерация контента
  const handleAIGenerate = async (contentType: 'post' | 'comment' | 'dm' | 'story') => {
    setLoading(prev => ({ ...prev, action: true }));
    
    try {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default',
          contentType,
          style: 'casual',
          niche: 'lifestyle',
          language: 'ru',
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка генерации');
      }
      
      const data = await response.json();
      toast.success('Контент сгенерирован');
      
      // Добавляем в список
      if (data.content) {
        setAiGenerations(prev => [{
          id: data.content.id || Date.now().toString(),
          contentType,
          generatedText: data.content.content,
          style: data.content.style,
          niche: data.content.metadata?.niche,
          createdAt: new Date().toISOString(),
          aiModel: data.content.ai?.model,
        }, ...prev]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast.error(`Ошибка: ${message}`);
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-[#6C63FF]" />
            Контент
          </h1>
          <p className="text-[#8A8A8A]">Календарь, видео и AI генерация</p>
        </div>
        <Button 
          className="bg-[#6C63FF]"
          onClick={handleCreateContent}
          disabled={loading.action}
        >
          {loading.action ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Создать контент
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="calendar" className="data-[state=active]:bg-[#6C63FF]">Календарь</TabsTrigger>
          <TabsTrigger value="video" className="data-[state=active]:bg-[#6C63FF]">Видео</TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-[#6C63FF]">AI Генерация</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Расписание публикаций</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchContentCalendar}>
                Обновить
              </Button>
            </CardHeader>
            <CardContent>
              {loading.calendar ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
                </div>
              ) : errors.calendar ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#FF4444]">
                  <AlertTriangle className="w-8 h-8 mb-2" />
                  <p>{errors.calendar}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={fetchContentCalendar}>
                    Повторить
                  </Button>
                </div>
              ) : calendarItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#8A8A8A]">
                  <Calendar className="w-8 h-8 mb-2" />
                  <p>Нет запланированного контента</p>
                  <Button className="mt-4 bg-[#6C63FF]" onClick={handleCreateContent}>
                    <Plus className="w-4 h-4 mr-2" />
                    Создать
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {calendarItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-[#1E1F26] rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs text-[#8A8A8A]">{formatDate(item.scheduledAt)}</p>
                          <p className="text-white font-medium">{formatTime(item.scheduledAt)}</p>
                        </div>
                        <div>
                          <p className="text-white capitalize">{item.type}</p>
                          <p className="text-xs text-[#8A8A8A]">
                            {item.influencer?.name || 'Без автора'}
                            {item.offer && ` • ${item.offer.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(statusColors[item.status] || 'bg-[#8A8A8A]')}>
                          {statusLabels[item.status] || item.status}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-[#8A8A8A] hover:text-[#FF4444]"
                          onClick={() => handleDeleteContent(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Stories и Видео</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchStories}>
                  Обновить
                </Button>
                <Button 
                  className="bg-[#6C63FF]" 
                  size="sm"
                  onClick={handleCreateStory}
                  disabled={loading.action}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Сторис
                </Button>
                <Button 
                  className="bg-[#6C63FF]" 
                  size="sm"
                  onClick={handleCreateVideo}
                  disabled={loading.action}
                >
                  <Video className="w-4 h-4 mr-1" />
                  Видео
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading.stories ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
                </div>
              ) : errors.stories ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#FF4444]">
                  <AlertTriangle className="w-8 h-8 mb-2" />
                  <p>{errors.stories}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={fetchStories}>
                    Повторить
                  </Button>
                </div>
              ) : stories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#8A8A8A]">
                  <Video className="w-8 h-8 mb-2" />
                  <p>Нет созданных сторис</p>
                  <Button className="mt-4 bg-[#6C63FF]" onClick={handleCreateStory}>
                    <Plus className="w-4 h-4 mr-2" />
                    Создать сторис
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {stories.map((story) => (
                    <Card key={story.id} className="bg-[#1E1F26] border-[#2A2B32]">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-[#8A8A8A] capitalize">{story.platform}</span>
                          <Badge className={cn(statusColors[story.status] || 'bg-[#8A8A8A]')}>
                            {statusLabels[story.status] || story.status}
                          </Badge>
                        </div>
                        <h4 className="text-white font-medium mb-2 truncate">{story.name}</h4>
                        <div className="flex items-center justify-between text-sm text-[#8A8A8A]">
                          <span>{story.slidesCount} слайдов</span>
                          <span>{formatDate(story.createdAt)}</span>
                        </div>
                        {story.scheduledAt && (
                          <div className="mt-2 text-xs text-[#FFB800] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(story.scheduledAt)} {formatTime(story.scheduledAt)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">AI Генерация контента</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateIdeas}
                  disabled={loading.action}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Идеи
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Кнопки генерации */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Button 
                  className="bg-[#6C63FF]"
                  onClick={() => handleAIGenerate('post')}
                  disabled={loading.action}
                >
                  {loading.action ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Пост
                </Button>
                <Button 
                  className="bg-[#6C63FF]"
                  onClick={() => handleAIGenerate('comment')}
                  disabled={loading.action}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Комментарий
                </Button>
                <Button 
                  className="bg-[#6C63FF]"
                  onClick={() => handleAIGenerate('dm')}
                  disabled={loading.action}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  DM
                </Button>
                <Button 
                  className="bg-[#6C63FF]"
                  onClick={() => handleAIGenerate('story')}
                  disabled={loading.action}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Сторис
                </Button>
              </div>

              {/* Список идей */}
              {ideas.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-medium mb-3">Идеи контента</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                    {ideas.slice(0, 6).map((idea) => (
                      <div 
                        key={idea.id} 
                        className="p-3 bg-[#1E1F26] rounded-lg border border-[#2A2B32]"
                      >
                        <p className="text-white text-sm truncate">{idea.title}</p>
                        <p className="text-xs text-[#8A8A8A] capitalize">{idea.contentType}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* История генераций */}
              {loading.aiGenerations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
                </div>
              ) : aiGenerations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#8A8A8A]">
                  <Sparkles className="w-8 h-8 mb-2" />
                  <p>Нажмите кнопку выше для генерации</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {aiGenerations.map((gen) => (
                    <Card key={gen.id} className="bg-[#1E1F26] border-[#2A2B32]">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                              {gen.contentType === 'story' ? (
                                <Image className="w-5 h-5 text-[#6C63FF]" />
                              ) : (
                                <FileText className="w-5 h-5 text-[#6C63FF]" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium capitalize">{gen.contentType}</p>
                              <p className="text-xs text-[#8A8A8A] truncate max-w-[300px]">
                                {gen.generatedText?.slice(0, 50)}...
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-[#00D26A]">Готово</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

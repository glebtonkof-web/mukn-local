'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, Search, Zap, Target, Globe, MessageSquare, 
  Instagram, Youtube, Twitter, Facebook, Linkedin,
  Star, CheckCircle, AlertTriangle, Play, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// 130 методов трафика по категориям
const trafficMethods = {
  telegram: {
    name: 'Telegram',
    icon: MessageSquare,
    color: '#0088cc',
    methods: [
      { id: 'tg-1', name: 'Комментарии в каналах', difficulty: 'easy', risk: 'low', revenue: 'medium', description: 'Автоматические комментарии в Telegram каналах' },
      { id: 'tg-2', name: 'PM рассылка', difficulty: 'medium', risk: 'high', revenue: 'high', description: 'Личные сообщения целевой аудитории' },
      { id: 'tg-3', name: 'Вступление в чаты', difficulty: 'easy', risk: 'low', revenue: 'low', description: 'Автоматическое вступление в тематические чаты' },
      { id: 'tg-4', name: 'Репосты постов', difficulty: 'easy', risk: 'low', revenue: 'medium', description: 'Автоматические репосты в свои каналы' },
      { id: 'tg-5', name: 'Реакции на посты', difficulty: 'easy', risk: 'low', revenue: 'low', description: 'Массовые реакции для привлечения внимания' },
      { id: 'tg-6', name: 'Закладки/Избранное', difficulty: 'medium', risk: 'medium', revenue: 'medium', description: 'Сохранение постов с последующим продвижением' },
      { id: 'tg-7', name: 'Создание каналов', difficulty: 'medium', risk: 'low', revenue: 'high', description: 'Автоматизация создания и ведения каналов' },
      { id: 'tg-8', name: 'Комментарии-вопросы', difficulty: 'easy', risk: 'low', revenue: 'medium', description: 'Комментарии с вопросами для вовлечения' },
      { id: 'tg-9', name: 'Ответы на комментарии', difficulty: 'medium', risk: 'medium', revenue: 'medium', description: 'Ответы под популярными комментариями' },
      { id: 'tg-10', name: 'Закупка рекламы', difficulty: 'hard', risk: 'low', revenue: 'high', description: 'Автоматизированная закупка рекламы в каналах' },
      { id: 'tg-11', name: 'Боты-приманки', difficulty: 'medium', risk: 'medium', revenue: 'high', description: 'Создание ботов для привлечения трафика' },
      { id: 'tg-12', name: 'Инвайт в каналы', difficulty: 'hard', risk: 'high', revenue: 'high', description: 'Приглашение пользователей в каналы' },
      { id: 'tg-13', name: 'Форвард в чаты', difficulty: 'medium', risk: 'medium', revenue: 'medium', description: 'Пересылка контента в тематические чаты' },
      { id: 'tg-14', name: 'Упоминания @username', difficulty: 'medium', risk: 'high', revenue: 'medium', description: 'Упоминание пользователей в комментариях' },
      { id: 'tg-15', name: 'Опросы и голосования', difficulty: 'easy', risk: 'low', revenue: 'low', description: 'Создание опросов для вовлечения' },
    ]
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    methods: [
      { id: 'ig-1', name: 'Комментарии под постами', difficulty: 'easy', risk: 'medium', revenue: 'medium', description: 'Автоматические комментарии в Instagram' },
      { id: 'ig-2', name: 'Лайки + подписка', difficulty: 'easy', risk: 'low', revenue: 'low', description: 'Массфолловинг с лайками' },
      { id: 'ig-3', name: 'Reels комментарии', difficulty: 'medium', risk: 'medium', revenue: 'high', description: 'Комментарии под Reels' },
      { id: 'ig-4', name: 'Stories реакции', difficulty: 'easy', risk: 'low', revenue: 'medium', description: 'Реакции на Stories' },
      { id: 'ig-5', name: 'DM рассылка', difficulty: 'hard', risk: 'high', revenue: 'high', description: 'Сообщения в Direct' },
      { id: 'ig-6', name: 'Упоминания в Stories', difficulty: 'medium', risk: 'medium', revenue: 'medium', description: 'Упоминание аккаунтов в Stories' },
      { id: 'ig-7', name: 'Collab посты', difficulty: 'hard', risk: 'low', revenue: 'high', description: 'Совместные посты с блогерами' },
      { id: 'ig-8', name: 'IGTV комментарии', difficulty: 'medium', risk: 'medium', revenue: 'medium', description: 'Комментарии под длинными видео' },
      { id: 'ig-9', name: 'Хэштег стратегия', difficulty: 'medium', risk: 'low', revenue: 'medium', description: 'Продвижение через хэштеги' },
      { id: 'ig-10', name: 'Live комментарии', difficulty: 'hard', risk: 'low', revenue: 'medium', description: 'Комментарии во время трансляций' },
    ]
  },
  tiktok: {
    name: 'TikTok',
    icon: Youtube,
    color: '#000000',
    methods: [
      { id: 'tt-1', name: 'Комментарии под видео', difficulty: 'easy', risk: 'medium', revenue: 'high', description: 'Автоматические комментарии в TikTok' },
      { id: 'tt-2', name: 'Дуэты', difficulty: 'medium', risk: 'low', revenue: 'high', description: 'Создание дуэтов с популярными видео' },
      { id: 'tt-3', name: 'Stitch видео', difficulty: 'medium', risk: 'low', revenue: 'high', description: 'Реакции на видео через Stitch' },
      { id: 'tt-4', name: 'Лайки + подписка', difficulty: 'easy', risk: 'low', revenue: 'medium', description: 'Массовое взаимодействие' },
      { id: 'tt-5', name: 'DM рассылка', difficulty: 'hard', risk: 'high', revenue: 'high', description: 'Сообщения в личку' },
      { id: 'tt-6', name: 'Трендовые звуки', difficulty: 'medium', risk: 'low', revenue: 'high', description: 'Использование трендовых звуков' },
      { id: 'tt-7', name: 'Ответы комментариями', difficulty: 'easy', risk: 'low', revenue: 'medium', description: 'Видео-ответы на комментарии' },
      { id: 'tt-8', name: 'Live подарки', difficulty: 'hard', risk: 'low', revenue: 'medium', description: 'Взаимодействие на стримах' },
    ]
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    methods: [
      { id: 'yt-1', name: 'Комментарии под видео', difficulty: 'easy', risk: 'medium', revenue: 'medium', description: 'Автоматические комментарии' },
      { id: 'yt-2', name: 'Shorts комментарии', difficulty: 'easy', risk: 'medium', revenue: 'high', description: 'Комментарии под Shorts' },
      { id: 'yt-3', name: 'Лайки + подписка', difficulty: 'easy', risk: 'low', revenue: 'low', description: 'Массовое взаимодействие' },
      { id: 'yt-4', name: 'Ответы на комментарии', difficulty: 'medium', risk: 'medium', revenue: 'medium', description: 'Ответы под топ комментариями' },
      { id: 'yt-5', name: 'Live чат', difficulty: 'hard', risk: 'medium', revenue: 'medium', description: 'Активность в live чатах' },
      { id: 'yt-6', name: 'Community посты', difficulty: 'medium', risk: 'low', revenue: 'medium', description: 'Комментарии под постами сообщества' },
    ]
  },
  twitter: {
    name: 'Twitter/X',
    icon: Twitter,
    color: '#1DA1F2',
    methods: [
      { id: 'tw-1', name: 'Твиты-ответы', difficulty: 'easy', risk: 'medium', revenue: 'medium', description: 'Ответы на популярные твиты' },
      { id: 'tw-2', name: 'Ретвиты + лайки', difficulty: 'easy', risk: 'low', revenue: 'low', description: 'Массовое взаимодействие' },
      { id: 'tw-3', name: 'Quote tweets', difficulty: 'medium', risk: 'medium', revenue: 'high', description: 'Цитирование твитов с комментарием' },
      { id: 'tw-4', name: 'Упоминания', difficulty: 'medium', risk: 'high', revenue: 'medium', description: 'Упоминание пользователей' },
      { id: 'tw-5', name: 'Spaces участие', difficulty: 'hard', risk: 'low', revenue: 'medium', description: 'Активность в аудио-комнатах' },
      { id: 'tw-6', name: 'Threads ответы', difficulty: 'medium', risk: 'medium', revenue: 'high', description: 'Ответы на треды' },
    ]
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    methods: [
      { id: 'fb-1', name: 'Комментарии в группах', difficulty: 'easy', risk: 'medium', revenue: 'medium', description: 'Комментарии в тематических группах' },
      { id: 'fb-2', name: 'Reels комментарии', difficulty: 'medium', risk: 'medium', revenue: 'high', description: 'Комментарии под Reels' },
      { id: 'fb-3', name: 'Посты на страницах', difficulty: 'medium', risk: 'medium', revenue: 'medium', description: 'Комментарии на страницах' },
      { id: 'fb-4', name: 'Messenger рассылка', difficulty: 'hard', risk: 'high', revenue: 'high', description: 'Сообщения в Messenger' },
      { id: 'fb-5', name: 'Live комментарии', difficulty: 'medium', risk: 'low', revenue: 'medium', description: 'Комментарии на трансляциях' },
      { id: 'fb-6', name: 'Marketplace', difficulty: 'hard', risk: 'medium', revenue: 'high', description: 'Продвижение через Marketplace' },
    ]
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    methods: [
      { id: 'li-1', name: 'Комментарии под постами', difficulty: 'medium', risk: 'low', revenue: 'high', description: 'Профессиональные комментарии' },
      { id: 'li-2', name: 'InMail рассылка', difficulty: 'hard', risk: 'medium', revenue: 'high', description: 'Сообщения в InMail' },
      { id: 'li-3', name: 'Лайки + подключения', difficulty: 'easy', risk: 'low', revenue: 'medium', description: 'Расширение сети контактов' },
      { id: 'li-4', name: 'Статья комментарии', difficulty: 'medium', risk: 'low', revenue: 'medium', description: 'Комментарии под статьями' },
    ]
  },
  advanced: {
    name: 'Advanced',
    icon: Zap,
    color: '#FFB800',
    methods: [
      { id: 'ad-1', name: 'Клоакинг', difficulty: 'hard', risk: 'high', revenue: 'very-high', description: 'Скрытие контента от модерации' },
      { id: 'ad-2', name: 'Вирусный контент', difficulty: 'medium', risk: 'medium', revenue: 'very-high', description: 'Создание вирусного контента' },
      { id: 'ad-3', name: 'CPA сети', difficulty: 'medium', risk: 'low', revenue: 'high', description: 'Работа с CPA партнёрками' },
      { id: 'ad-4', name: 'Авитос трафик', difficulty: 'medium', risk: 'medium', revenue: 'medium', description: 'Трафик с досок объявлений' },
      { id: 'ad-5', name: 'Дейтинг трафик', difficulty: 'medium', risk: 'medium', revenue: 'medium', description: 'Трафик с дейтинг платформ' },
      { id: 'ad-6', name: 'Buy traffic', difficulty: 'medium', risk: 'low', revenue: 'medium', description: 'Покупка арбитражного трафика' },
      { id: 'ad-7', name: 'Реферальная система', difficulty: 'medium', risk: 'low', revenue: 'high', description: 'Привлечение через рефералов' },
      { id: 'ad-8', name: 'Influencer маркетинг', difficulty: 'hard', risk: 'low', revenue: 'high', description: 'Работа с блогерами' },
      { id: 'ad-9', name: 'Podcast реклама', difficulty: 'medium', risk: 'low', revenue: 'medium', description: 'Реклама в подкастах' },
      { id: 'ad-10', name: 'Reddit продвижение', difficulty: 'hard', risk: 'medium', revenue: 'high', description: 'Трафик с Reddit' },
      { id: 'ad-11', name: 'Pinterest', difficulty: 'medium', risk: 'low', revenue: 'medium', description: 'Визуальный трафик' },
      { id: 'ad-12', name: 'Quora ответы', difficulty: 'medium', risk: 'low', revenue: 'medium', description: 'Ответы на вопросы' },
      { id: 'ad-13', name: 'App Store ASO', difficulty: 'hard', risk: 'low', revenue: 'high', description: 'Оптимизация приложений' },
      { id: 'ad-14', name: 'Telegram Ads', difficulty: 'medium', risk: 'low', revenue: 'high', description: 'Официальная реклама в Telegram' },
      { id: 'ad-15', name: 'Кросс-промо', difficulty: 'easy', risk: 'low', revenue: 'medium', description: 'Взаимный пиар' },
    ]
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'text-[#00D26A]';
    case 'medium': return 'text-[#FFB800]';
    case 'hard': return 'text-[#FF4D4D]';
    default: return 'text-[#8A8A8A]';
  }
};

const getDifficultyLabel = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'Легко';
    case 'medium': return 'Средне';
    case 'hard': return 'Сложно';
    default: return difficulty;
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'low': return 'bg-[#00D26A]';
    case 'medium': return 'bg-[#FFB800]';
    case 'high': return 'bg-[#FF4D4D]';
    default: return 'bg-[#8A8A8A]';
  }
};

const getRiskLabel = (risk: string) => {
  switch (risk) {
    case 'low': return 'Низкий';
    case 'medium': return 'Средний';
    case 'high': return 'Высокий';
    default: return risk;
  }
};

export function TrafficView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [activeMethods, setActiveMethods] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  const totalMethods = Object.values(trafficMethods).reduce((acc, cat) => acc + cat.methods.length, 0);

  const filteredMethods = searchQuery
    ? Object.entries(trafficMethods).reduce((acc, [key, category]) => {
        const filtered = category.methods.filter(m => 
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[key] = { ...category, methods: filtered };
        }
        return acc;
      }, {} as typeof trafficMethods)
    : selectedPlatform === 'all' 
      ? trafficMethods 
      : { [selectedPlatform]: trafficMethods[selectedPlatform as keyof typeof trafficMethods] };

  const toggleMethod = (id: string) => {
    setActiveMethods(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const runSelectedMethods = () => {
    toast.success(`Запущено ${activeMethods.length} методов трафика`);
    setActiveMethods([]);
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-[#6C63FF]" />
            Методы трафика
          </h1>
          <p className="text-[#8A8A8A]">Всего {totalMethods} методов для привлечения трафика</p>
        </div>
        {activeMethods.length > 0 && (
          <Button onClick={runSelectedMethods} className="bg-[#00D26A] hover:bg-[#00D26A]/80">
            <Play className="w-4 h-4 mr-2" />
            Запустить ({activeMethods.length})
          </Button>
        )}
      </div>

      {/* Поиск и фильтры */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="flex flex-wrap gap-4 py-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
            <Input
              placeholder="Поиск методов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1E1F26] border-[#2A2B32]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedPlatform === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPlatform('all')}
              className={selectedPlatform === 'all' ? 'bg-[#6C63FF]' : 'border-[#2A2B32]'}
            >
              Все
            </Button>
            {Object.entries(trafficMethods).map(([key, cat]) => {
              const Icon = cat.icon;
              return (
                <Button
                  key={key}
                  variant={selectedPlatform === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPlatform(key)}
                  className={selectedPlatform === key ? 'bg-[#6C63FF]' : 'border-[#2A2B32]'}
                >
                  <Icon className="w-4 h-4 mr-1" style={{ color: selectedPlatform === key ? '#fff' : cat.color }} />
                  {cat.name}
                  <Badge className="ml-2 bg-[#1E1F26] text-[#8A8A8A] text-xs">{cat.methods.length}</Badge>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Методы по категориям */}
      <div className="space-y-6">
        {Object.entries(filteredMethods).map(([key, category]) => {
          const Icon = category.icon;
          return (
            <Card key={key} className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Icon className="w-5 h-5" style={{ color: category.color }} />
                  {category.name}
                  <Badge className="bg-[#1E1F26] text-[#8A8A8A]">{category.methods.length} методов</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.methods.map((method) => {
                    const isActive = activeMethods.includes(method.id);
                    const isFavorite = favorites.includes(method.id);
                    
                    return (
                      <div
                        key={method.id}
                        className={cn(
                          'p-4 rounded-lg border transition-all cursor-pointer',
                          isActive 
                            ? 'bg-[#6C63FF]/10 border-[#6C63FF]' 
                            : 'bg-[#1E1F26] border-[#2A2B32] hover:border-[#6C63FF]/50'
                        )}
                        onClick={() => toggleMethod(method.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-medium">{method.name}</h4>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(method.id); }}
                              className="p-1"
                            >
                              <Star className={cn('w-4 h-4', isFavorite ? 'fill-[#FFB800] text-[#FFB800]' : 'text-[#8A8A8A]')} />
                            </button>
                            {isActive && <CheckCircle className="w-4 h-4 text-[#00D26A]" />}
                          </div>
                        </div>
                        <p className="text-xs text-[#8A8A8A] mb-3">{method.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn('text-xs', getDifficultyColor(method.difficulty))}>
                            {getDifficultyLabel(method.difficulty)}
                          </Badge>
                          <Badge className={cn('text-xs text-white', getRiskColor(method.risk))}>
                            {getRiskLabel(method.risk)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalMethods}</p>
                <p className="text-xs text-[#8A8A8A]">Методов всего</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeMethods.length}</p>
                <p className="text-xs text-[#8A8A8A]">Активных</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{favorites.length}</p>
                <p className="text-xs text-[#8A8A8A]">Избранных</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF4D4D]/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#FF4D4D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {Object.values(trafficMethods).reduce((acc, cat) => 
                    acc + cat.methods.filter(m => m.risk === 'high').length, 0
                  )}
                </p>
                <p className="text-xs text-[#8A8A8A]">Высокий риск</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trophy,
  Medal,
  Crown,
  Flame,
  TrendingUp,
  Users,
  Star,
  ChevronUp,
  ChevronDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Типы
interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatar?: string;
  points: number;
  level: number;
  levelTitle: string;
  achievements: number;
  revenue: number;
  change: number; // Изменение позиции
  trend: 'up' | 'down' | 'same';
}

interface LeaderboardCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const CATEGORIES: LeaderboardCategory[] = [
  { id: 'points', name: 'По очкам', icon: <Star className="w-4 h-4" />, description: 'Общий рейтинг по очкам достижений' },
  { id: 'revenue', name: 'По доходу', icon: <TrendingUp className="w-4 h-4" />, description: 'Рейтинг по заработанному доходу' },
  { id: 'achievements', name: 'По достижениям', icon: <Trophy className="w-4 h-4" />, description: 'Рейтинг по количеству достижений' },
  { id: 'streak', name: 'По активности', icon: <Flame className="w-4 h-4" />, description: 'Рейтинг по дням подряд' },
];

// Моковые данные (в реальном приложении - с сервера)
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: '1', userName: 'CryptoMaster', points: 5420, level: 6, levelTitle: 'Легенда', achievements: 18, revenue: 125000, change: 0, trend: 'same' },
  { rank: 2, userId: '2', userName: 'TrafficKing', points: 4850, level: 5, levelTitle: 'Мастер', achievements: 16, revenue: 98000, change: 1, trend: 'up' },
  { rank: 3, userId: '3', userName: 'AI_Guru', points: 4200, level: 5, levelTitle: 'Мастер', achievements: 14, revenue: 87500, change: -1, trend: 'down' },
  { rank: 4, userId: '4', userName: 'CommentPro', points: 3800, level: 4, levelTitle: 'Эксперт', achievements: 13, revenue: 72000, change: 2, trend: 'up' },
  { rank: 5, userId: '5', userName: 'InfluencerX', points: 3500, level: 4, levelTitle: 'Эксперт', achievements: 12, revenue: 65000, change: 0, trend: 'same' },
  { rank: 6, userId: '6', userName: 'SocialHacker', points: 3200, level: 4, levelTitle: 'Эксперт', achievements: 11, revenue: 58000, change: -2, trend: 'down' },
  { rank: 7, userId: '7', userName: 'TelegramBoss', points: 2900, level: 4, levelTitle: 'Эксперт', achievements: 10, revenue: 52000, change: 1, trend: 'up' },
  { rank: 8, userId: '8', userName: 'NicheHunter', points: 2600, level: 3, levelTitle: 'Активист', achievements: 9, revenue: 45000, change: 0, trend: 'same' },
  { rank: 9, userId: '9', userName: 'LeadMachine', points: 2300, level: 3, levelTitle: 'Активист', achievements: 8, revenue: 38000, change: 3, trend: 'up' },
  { rank: 10, userId: '10', userName: 'GrowthHacker', points: 2100, level: 3, levelTitle: 'Активист', achievements: 7, revenue: 32000, change: -1, trend: 'down' },
];

// Компонент строки лидерборда
function LeaderboardRow({
  entry,
  isCurrentUser,
  showRevenue,
  showAchievements,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  showRevenue?: boolean;
  showAchievements?: boolean;
}) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-lg font-bold text-[#8A8A8A]">{rank}</span>;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <ChevronUp className="w-4 h-4 text-[#00D26A]" />;
    if (trend === 'down') return <ChevronDown className="w-4 h-4 text-[#FF4D4D]" />;
    return <Minus className="w-4 h-4 text-[#8A8A8A]" />;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg transition-colors',
        isCurrentUser && 'bg-[#6C63FF]/20 border border-[#6C63FF]',
        !isCurrentUser && 'hover:bg-[#1E1F26]'
      )}
    >
      {/* Ранг */}
      <div className="w-12 flex items-center justify-center">
        {getRankIcon(entry.rank)}
      </div>

      {/* Пользователь */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="w-10 h-10">
          <AvatarImage src={entry.avatar} />
          <AvatarFallback className="bg-[#6C63FF] text-white">
            {entry.userName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{entry.userName}</span>
            {isCurrentUser && <Badge className="bg-[#6C63FF] text-xs">Вы</Badge>}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8A8A8A]">
            <span>Ур. {entry.level}</span>
            <span>•</span>
            <span>{entry.levelTitle}</span>
          </div>
        </div>
      </div>

      {/* Изменение позиции */}
      <div className={cn(
        'flex items-center gap-1 w-12 justify-center',
        entry.trend === 'up' && 'text-[#00D26A]',
        entry.trend === 'down' && 'text-[#FF4D4D]',
        entry.trend === 'same' && 'text-[#8A8A8A]'
      )}>
        {getTrendIcon(entry.trend)}
        {entry.change > 0 && <span className="text-sm">{entry.change}</span>}
      </div>

      {/* Достижения */}
      {showAchievements && (
        <div className="w-20 text-center">
          <Trophy className="w-4 h-4 text-[#FFD700] inline mr-1" />
          <span className="text-white">{entry.achievements}</span>
        </div>
      )}

      {/* Доход */}
      {showRevenue && (
        <div className="w-24 text-right">
          <span className="text-[#00D26A] font-medium">
            {(entry.revenue / 1000).toFixed(0)}K ₽
          </span>
        </div>
      )}

      {/* Очки */}
      <div className="w-24 text-right">
        <div className="flex items-center justify-end gap-1">
          <Star className="w-4 h-4 text-[#FFB800]" />
          <span className="font-bold text-white">{entry.points.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Главный компонент
export function Leaderboard({
  currentUserId,
  limit = 10,
}: {
  currentUserId?: string;
  limit?: number;
}) {
  const [activeCategory, setActiveCategory] = useState('points');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserPosition, setCurrentUserPosition] = useState<LeaderboardEntry | null>(null);

  // Загрузка данных
  useEffect(() => {
    // В реальном приложении - fetch с API
    setLeaderboard(MOCK_LEADERBOARD.slice(0, limit));
    
    // Позиция текущего пользователя (если не в топ)
    if (currentUserId) {
      const currentEntry = MOCK_LEADERBOARD.find(e => e.userId === currentUserId);
      if (!currentEntry) {
        setCurrentUserPosition({
          rank: 42,
          userId: currentUserId,
          userName: 'Вы',
          points: 850,
          level: 2,
          levelTitle: 'Участник',
          achievements: 4,
          revenue: 5000,
          change: 5,
          trend: 'up',
        });
      }
    }
  }, [currentUserId, limit, activeCategory]);

  // Сортировка по категории
  const sortedLeaderboard = useMemo(() => {
    const sorted = [...leaderboard];
    switch (activeCategory) {
      case 'revenue':
        return sorted.sort((a, b) => b.revenue - a.revenue);
      case 'achievements':
        return sorted.sort((a, b) => b.achievements - a.achievements);
      default:
        return sorted.sort((a, b) => b.points - a.points);
    }
  }, [leaderboard, activeCategory]);

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="w-5 h-5 text-[#6C63FF]" />
          Таблица лидеров
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Табы категорий */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="bg-[#1E1F26] border-[#2A2B32] w-full justify-start mb-4 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                {cat.icon}
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat.id} value={cat.id}>
              <p className="text-sm text-[#8A8A8A] mb-4">{cat.description}</p>
            </TabsContent>
          ))}
        </Tabs>

        {/* Список лидеров */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {sortedLeaderboard.map((entry, index) => (
              <LeaderboardRow
                key={entry.userId}
                entry={{ ...entry, rank: index + 1 }}
                isCurrentUser={entry.userId === currentUserId}
                showRevenue={activeCategory === 'revenue' || activeCategory === 'points'}
                showAchievements={activeCategory === 'achievements'}
              />
            ))}

            {/* Текущий пользователь (если не в топ) */}
            {currentUserPosition && !leaderboard.find(e => e.userId === currentUserId) && (
              <>
                <div className="flex items-center justify-center py-2">
                  <div className="h-px bg-[#2A2B32] flex-1" />
                  <span className="px-4 text-xs text-[#8A8A8A]">• • •</span>
                  <div className="h-px bg-[#2A2B32] flex-1" />
                </div>
                <LeaderboardRow
                  entry={currentUserPosition}
                  isCurrentUser={true}
                  showRevenue={activeCategory === 'revenue' || activeCategory === 'points'}
                  showAchievements={activeCategory === 'achievements'}
                />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Топ-3 кратко */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#2A2B32]">
          {sortedLeaderboard.slice(0, 3).map((entry, index) => (
            <div key={entry.userId} className="text-center">
              <div className={cn(
                'w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl',
                index === 0 && 'bg-yellow-500/20',
                index === 1 && 'bg-gray-400/20',
                index === 2 && 'bg-amber-600/20'
              )}>
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
              </div>
              <p className="font-medium text-white text-sm truncate">{entry.userName}</p>
              <p className="text-xs text-[#8A8A8A]">{entry.points.toLocaleString()} очков</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default Leaderboard;

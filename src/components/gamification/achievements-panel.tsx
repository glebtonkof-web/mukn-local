'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy,
  Star,
  Flame,
  Target,
  MessageSquare,
  Users,
  DollarSign,
  Zap,
  Shield,
  TrendingUp,
  Bot,
  Crown,
  Medal,
  Award,
  Gift,
  Lock,
  CheckCircle,
  Sparkles,
  BarChart3,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Типы
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'engagement' | 'revenue' | 'growth' | 'security' | 'ai' | 'special';
  points: number;
  requirement: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  hidden?: boolean;
}

export interface UserLevel {
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number;
  icon: React.ReactNode;
  color: string;
}

// Уровни пользователя
const USER_LEVELS: UserLevel[] = [
  { level: 1, title: 'Новичок', minPoints: 0, maxPoints: 99, icon: <Star className="w-5 h-5" />, color: '#8A8A8A' },
  { level: 2, title: 'Участник', minPoints: 100, maxPoints: 249, icon: <Medal className="w-5 h-5" />, color: '#CD7F32' },
  { level: 3, title: 'Активист', minPoints: 250, maxPoints: 499, icon: <Award className="w-5 h-5" />, color: '#C0C0C0' },
  { level: 4, title: 'Эксперт', minPoints: 500, maxPoints: 999, icon: <Trophy className="w-5 h-5" />, color: '#FFD700' },
  { level: 5, title: 'Мастер', minPoints: 1000, maxPoints: 1999, icon: <Crown className="w-5 h-5" />, color: '#E5E4E2' },
  { level: 6, title: 'Легенда', minPoints: 2000, maxPoints: Infinity, icon: <Sparkles className="w-5 h-5" />, color: '#B9F2FF' },
];

// Достижения
const ACHIEVEMENTS: Omit<Achievement, 'progress' | 'unlocked' | 'unlockedAt'>[] = [
  // Engagement
  {
    id: 'first_comment',
    name: 'Первый комментарий',
    description: 'Опубликуйте свой первый комментарий',
    icon: <MessageSquare className="w-6 h-6" />,
    category: 'engagement',
    points: 10,
    requirement: 1,
    tier: 'bronze',
  },
  {
    id: 'comments_100',
    name: 'Комментатор',
    description: 'Опубликуйте 100 комментариев',
    icon: <MessageSquare className="w-6 h-6" />,
    category: 'engagement',
    points: 50,
    requirement: 100,
    tier: 'silver',
  },
  {
    id: 'comments_1000',
    name: 'Мастер комментариев',
    description: 'Опубликуйте 1000 комментариев',
    icon: <MessageSquare className="w-6 h-6" />,
    category: 'engagement',
    points: 200,
    requirement: 1000,
    tier: 'gold',
  },
  // Revenue
  {
    id: 'first_lead',
    name: 'Первый лид',
    description: 'Получите первого лида',
    icon: <Target className="w-6 h-6" />,
    category: 'revenue',
    points: 20,
    requirement: 1,
    tier: 'bronze',
  },
  {
    id: 'revenue_1000',
    name: 'Тысячник',
    description: 'Заработайте 1000₽',
    icon: <DollarSign className="w-6 h-6" />,
    category: 'revenue',
    points: 100,
    requirement: 1000,
    tier: 'silver',
  },
  {
    id: 'revenue_10000',
    name: 'Десятитысячник',
    description: 'Заработайте 10000₽',
    icon: <DollarSign className="w-6 h-6" />,
    category: 'revenue',
    points: 500,
    requirement: 10000,
    tier: 'gold',
  },
  {
    id: 'revenue_100000',
    name: 'Сотня тысяч',
    description: 'Заработайте 100000₽',
    icon: <DollarSign className="w-6 h-6" />,
    category: 'revenue',
    points: 2000,
    requirement: 100000,
    tier: 'diamond',
  },
  // Growth
  {
    id: 'first_campaign',
    name: 'Первая кампания',
    description: 'Создайте первую кампанию',
    icon: <Rocket className="w-6 h-6" />,
    category: 'growth',
    points: 15,
    requirement: 1,
    tier: 'bronze',
  },
  {
    id: 'influencers_10',
    name: 'Рой',
    description: 'Создайте 10 инфлюенсеров',
    icon: <Users className="w-6 h-6" />,
    category: 'growth',
    points: 100,
    requirement: 10,
    tier: 'silver',
  },
  {
    id: 'accounts_50',
    name: 'Армия аккаунтов',
    description: 'Подключите 50 аккаунтов',
    icon: <Users className="w-6 h-6" />,
    category: 'growth',
    points: 200,
    requirement: 50,
    tier: 'gold',
  },
  // Security
  {
    id: 'no_ban_7days',
    name: 'Осторожный',
    description: '7 дней без банов',
    icon: <Shield className="w-6 h-6" />,
    category: 'security',
    points: 50,
    requirement: 7,
    tier: 'silver',
  },
  {
    id: 'no_ban_30days',
    name: 'Невидимка',
    description: '30 дней без банов',
    icon: <Shield className="w-6 h-6" />,
    category: 'security',
    points: 200,
    requirement: 30,
    tier: 'gold',
  },
  {
    id: '2fa_enabled',
    name: 'Защищённый',
    description: 'Включите двухфакторную аутентификацию',
    icon: <Shield className="w-6 h-6" />,
    category: 'security',
    points: 30,
    requirement: 1,
    tier: 'bronze',
  },
  // AI
  {
    id: 'first_ai_content',
    name: 'AI-первопроходец',
    description: 'Сгенерируйте первый контент с AI',
    icon: <Bot className="w-6 h-6" />,
    category: 'ai',
    points: 15,
    requirement: 1,
    tier: 'bronze',
  },
  {
    id: 'ai_content_100',
    name: 'AI-мастер',
    description: 'Сгенерируйте 100 единиц контента',
    icon: <Bot className="w-6 h-6" />,
    category: 'ai',
    points: 100,
    requirement: 100,
    tier: 'gold',
  },
  {
    id: 'ai_content_1000',
    name: 'AI-эксперт',
    description: 'Сгенерируйте 1000 единиц контента',
    icon: <Bot className="w-6 h-6" />,
    category: 'ai',
    points: 500,
    requirement: 1000,
    tier: 'platinum',
  },
  // Special
  {
    id: 'top_channel',
    name: 'Топ канал',
    description: 'Найдите канал с конверсией выше 5%',
    icon: <TrendingUp className="w-6 h-6" />,
    category: 'special',
    points: 150,
    requirement: 5,
    tier: 'gold',
  },
  {
    id: 'analyst',
    name: 'Аналитик',
    description: 'Просмотрите 100 отчётов',
    icon: <BarChart3 className="w-6 h-6" />,
    category: 'special',
    points: 80,
    requirement: 100,
    tier: 'silver',
  },
  {
    id: 'early_adopter',
    name: 'Ранний последователь',
    description: 'Используйте платформу с ранней стадии',
    icon: <Star className="w-6 h-6" />,
    category: 'special',
    points: 500,
    requirement: 1,
    tier: 'platinum',
    hidden: true,
  },
  {
    id: 'vip',
    name: 'VIP статус',
    description: 'Достигните уровня Легенда',
    icon: <Crown className="w-6 h-6" />,
    category: 'special',
    points: 1000,
    requirement: 2000,
    tier: 'diamond',
  },
];

const STORAGE_KEY = 'mukn-traffic-achievements';
const STATS_KEY = 'mukn-traffic-stats';

interface UserStats {
  totalComments: number;
  totalLeads: number;
  totalRevenue: number;
  totalCampaigns: number;
  totalInfluencers: number;
  totalAccounts: number;
  daysWithoutBan: number;
  twoFactorEnabled: boolean;
  aiContentGenerated: number;
  reportsViewed: number;
  bestConversion: number;
}

// Компонент бейджа достижения
export function AchievementBadge({
  achievement,
  size = 'default',
  showProgress = true,
  onClick,
}: {
  achievement: Achievement;
  size?: 'sm' | 'default' | 'lg';
  showProgress?: boolean;
  onClick?: () => void;
}) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    default: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const tierColors = {
    bronze: 'from-amber-700 to-amber-900',
    silver: 'from-gray-400 to-gray-600',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-gray-300 to-gray-500',
    diamond: 'from-cyan-400 to-blue-600',
  };

  const progressPercentage = Math.min(100, (achievement.progress / achievement.requirement) * 100);

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'relative group',
        !achievement.unlocked && 'opacity-60 grayscale',
        onClick && 'cursor-pointer hover:scale-105 transition-transform'
      )}
    >
      <div
        className={cn(
          'rounded-xl flex items-center justify-center bg-gradient-to-br',
          sizeClasses[size],
          achievement.unlocked ? tierColors[achievement.tier] : 'from-gray-700 to-gray-800'
        )}
      >
        {achievement.unlocked ? (
          <div className="text-white">{achievement.icon}</div>
        ) : (
          <Lock className="w-6 h-6 text-gray-500" />
        )}
      </div>

      {/* Progress ring */}
      {showProgress && !achievement.unlocked && achievement.progress > 0 && (
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#2A2B32"
            strokeWidth="4"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#6C63FF"
            strokeWidth="4"
            strokeDasharray={`${progressPercentage * 2.83} 283`}
            className="transition-all duration-500"
          />
        </svg>
      )}

      {/* Points badge */}
      {achievement.unlocked && (
        <div className="absolute -top-1 -right-1 bg-[#6C63FF] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {achievement.points}
        </div>
      )}

      {/* Tooltip */}
      {onClick && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
          <div className="bg-[#1E1F26] border border-[#2A2B32] rounded-lg p-3 shadow-xl min-w-[200px]">
            <p className="font-medium text-white text-sm">{achievement.name}</p>
            <p className="text-[#8A8A8A] text-xs mt-1">{achievement.description}</p>
            {!achievement.unlocked && (
              <p className="text-[#6C63FF] text-xs mt-2">
                {achievement.progress}/{achievement.requirement} ({Math.round(progressPercentage)}%)
              </p>
            )}
          </div>
        </div>
      )}
    </button>
  );
}

// Главный компонент панели достижений
export function AchievementsPanel() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Загрузка данных
  useEffect(() => {
    const savedAchievements = localStorage.getItem(STORAGE_KEY);
    const savedStats = localStorage.getItem(STATS_KEY);

    if (savedAchievements) {
      setAchievements(JSON.parse(savedAchievements));
    } else {
      // Инициализация достижений
      const initialAchievements = ACHIEVEMENTS.map(a => ({
        ...a,
        progress: 0,
        unlocked: false,
      }));
      setAchievements(initialAchievements);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAchievements));
    }

    if (savedStats) {
      setStats(JSON.parse(savedStats));
    } else {
      const initialStats: UserStats = {
        totalComments: 0,
        totalLeads: 0,
        totalRevenue: 0,
        totalCampaigns: 0,
        totalInfluencers: 0,
        totalAccounts: 0,
        daysWithoutBan: 0,
        twoFactorEnabled: false,
        aiContentGenerated: 0,
        reportsViewed: 0,
        bestConversion: 0,
      };
      setStats(initialStats);
      localStorage.setItem(STATS_KEY, JSON.stringify(initialStats));
    }
  }, []);

  // Обновление прогресса достижений
  const updateProgress = useCallback((achievementId: string, progress: number) => {
    setAchievements(prev => {
      const achievement = prev.find(a => a.id === achievementId);
      if (!achievement || achievement.unlocked) return prev;

      const newProgress = Math.max(achievement.progress, progress);
      const unlocked = newProgress >= achievement.requirement;

      if (unlocked && !achievement.unlocked) {
        toast.success(
          <div className="flex items-center gap-3">
            <div className="text-2xl">{achievement.icon}</div>
            <div>
              <p className="font-bold">Достижение разблокировано!</p>
              <p className="text-sm">{achievement.name} (+{achievement.points} очков)</p>
            </div>
          </div>
        );
      }

      const updated = prev.map(a =>
        a.id === achievementId
          ? { ...a, progress: newProgress, unlocked, unlockedAt: unlocked ? new Date().toISOString() : undefined }
          : a
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Вычисление уровня пользователя
  const userLevel = useMemo(() => {
    const totalPoints = achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0);

    return USER_LEVELS.find(l => totalPoints >= l.minPoints && totalPoints <= l.maxPoints) || USER_LEVELS[0];
  }, [achievements]);

  const nextLevel = USER_LEVELS.find(l => l.level === userLevel.level + 1);
  const totalPoints = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0);
  const pointsToNextLevel = nextLevel ? nextLevel.minPoints - totalPoints : 0;

  // Фильтрация по категории
  const filteredAchievements = useMemo(() => {
    if (activeTab === 'all') return achievements.filter(a => !a.hidden);
    if (activeTab === 'unlocked') return achievements.filter(a => a.unlocked);
    if (activeTab === 'locked') return achievements.filter(a => !a.unlocked && !a.hidden);
    return achievements.filter(a => a.category === activeTab && !a.hidden);
  }, [achievements, activeTab]);

  // Статистика
  const stats_display = useMemo(() => {
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalVisible = achievements.filter(a => !a.hidden).length;
    const completionPercentage = Math.round((unlockedCount / totalVisible) * 100);

    return {
      unlockedCount,
      totalVisible,
      completionPercentage,
      totalPoints,
    };
  }, [achievements, totalPoints]);

  return (
    <div className="space-y-6">
      {/* Уровень пользователя */}
      <Card className="bg-gradient-to-r from-[#14151A] to-[#1E1F26] border-[#2A2B32]">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white"
              style={{ backgroundColor: userLevel.color }}
            >
              {userLevel.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">Уровень {userLevel.level}</h2>
                <Badge className="bg-[#6C63FF]">{userLevel.title}</Badge>
              </div>
              <div className="flex items-center gap-4">
                <Progress
                  value={nextLevel ? ((totalPoints - userLevel.minPoints) / (nextLevel.minPoints - userLevel.minPoints)) * 100 : 100}
                  className="flex-1"
                />
                <span className="text-sm text-[#8A8A8A]">
                  {totalPoints} очков
                  {nextLevel && ` • ${pointsToNextLevel} до след. уровня`}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика достижений */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 text-[#FFD700] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats_display.unlockedCount}</p>
            <p className="text-sm text-[#8A8A8A]">Разблокировано</p>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 text-[#6C63FF] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats_display.completionPercentage}%</p>
            <p className="text-sm text-[#8A8A8A]">Прогресс</p>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 text-[#FFB800] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats_display.totalPoints}</p>
            <p className="text-sm text-[#8A8A8A]">Очков</p>
          </CardContent>
        </Card>
      </div>

      {/* Табы категорий */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32] w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="unlocked">Разблокированные</TabsTrigger>
          <TabsTrigger value="locked">Заблокированные</TabsTrigger>
          <TabsTrigger value="engagement">Активность</TabsTrigger>
          <TabsTrigger value="revenue">Доход</TabsTrigger>
          <TabsTrigger value="growth">Рост</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="special">Особые</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredAchievements.map(achievement => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                onClick={() => setSelectedAchievement(achievement)}
              />
            ))}
          </div>

          {filteredAchievements.length === 0 && (
            <Card className="bg-[#14151A] border-[#2A2B32] p-8 text-center">
              <Trophy className="w-12 h-12 text-[#8A8A8A] mx-auto mb-4 opacity-50" />
              <p className="text-[#8A8A8A]">Нет достижений в этой категории</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Диалог деталей достижения */}
      <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
          {selectedAchievement && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <AchievementBadge achievement={selectedAchievement} size="lg" showProgress={false} />
                  <div>
                    <DialogTitle>{selectedAchievement.name}</DialogTitle>
                    <DialogDescription>{selectedAchievement.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#8A8A8A]">Категория</span>
                  <Badge>{selectedAchievement.category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8A8A8A]">Уровень</span>
                  <Badge className={cn(
                    selectedAchievement.tier === 'bronze' && 'bg-amber-700',
                    selectedAchievement.tier === 'silver' && 'bg-gray-500',
                    selectedAchievement.tier === 'gold' && 'bg-yellow-500',
                    selectedAchievement.tier === 'platinum' && 'bg-gray-300 text-black',
                    selectedAchievement.tier === 'diamond' && 'bg-cyan-500'
                  )}>
                    {selectedAchievement.tier}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8A8A8A]">Очки</span>
                  <span className="font-bold text-[#6C63FF]">+{selectedAchievement.points}</span>
                </div>

                {!selectedAchievement.unlocked && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#8A8A8A]">Прогресс</span>
                      <span className="text-white">
                        {selectedAchievement.progress}/{selectedAchievement.requirement}
                      </span>
                    </div>
                    <Progress
                      value={(selectedAchievement.progress / selectedAchievement.requirement) * 100}
                    />
                  </div>
                )}

                {selectedAchievement.unlocked && selectedAchievement.unlockedAt && (
                  <div className="flex items-center gap-2 text-[#00D26A]">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">
                      Разблокировано: {new Date(selectedAchievement.unlockedAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Hook для обновления достижений
export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setAchievements(JSON.parse(saved));
    }
  }, []);

  const updateStat = useCallback((stat: keyof UserStats, value: number | boolean) => {
    const saved = localStorage.getItem(STATS_KEY);
    const stats: UserStats = saved ? JSON.parse(saved) : {};
    
    const newStats = { ...stats, [stat]: value };
    localStorage.setItem(STATS_KEY, JSON.stringify(newStats));

    // Обновляем соответствующие достижения
    const statToAchievement: Record<string, string[]> = {
      totalComments: ['first_comment', 'comments_100', 'comments_1000'],
      totalLeads: ['first_lead'],
      totalRevenue: ['revenue_1000', 'revenue_10000', 'revenue_100000'],
      totalCampaigns: ['first_campaign'],
      totalInfluencers: ['influencers_10'],
      totalAccounts: ['accounts_50'],
      daysWithoutBan: ['no_ban_7days', 'no_ban_30days'],
      twoFactorEnabled: ['2fa_enabled'],
      aiContentGenerated: ['first_ai_content', 'ai_content_100', 'ai_content_1000'],
      reportsViewed: ['analyst'],
      bestConversion: ['top_channel'],
    };

    const achievementIds = statToAchievement[stat] || [];
    
    setAchievements(prev => {
      const updated = prev.map(a => {
        if (!achievementIds.includes(a.id)) return a;
        
        const progress = typeof value === 'number' ? value : (value ? 1 : 0);
        const unlocked = progress >= a.requirement;

        if (unlocked && !a.unlocked) {
          toast.success(`🏆 Достижение разблокировано: ${a.name}`);
        }

        return { ...a, progress, unlocked };
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getPoints = useCallback(() => {
    return achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0);
  }, [achievements]);

  const getLevel = useCallback(() => {
    const points = getPoints();
    return USER_LEVELS.find(l => points >= l.minPoints && points <= l.maxPoints) || USER_LEVELS[0];
  }, [getPoints]);

  return {
    achievements,
    updateStat,
    getPoints,
    getLevel,
    userLevel: getLevel(),
    totalPoints: getPoints(),
  };
}

export default AchievementsPanel;

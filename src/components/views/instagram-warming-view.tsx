'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Zap,
  Ghost,
  Hand,
  Rocket,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Heart,
  MessageCircle,
  UserPlus,
  Image,
  Send,
  Eye,
  Timer,
  TrendingUp,
  Calendar,
  Activity,
  RefreshCw,
  Plus,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Loader2,
  Flame,
  Shield,
  Gauge,
  Settings,
  Instagram,
  Film,
  Bookmark,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInDays, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

// Types
interface PhaseConfig {
  name: string;
  days: [number, number];
  limits: {
    likes: { min: number; max: number };
    follows: { min: number; max: number };
    comments: { min: number; max: number };
    posts: { min: number; max: number };
    dm: { min: number; max: number };
    timeSpent: { min: number; max: number };
  };
  description: string;
  color: string;
  icon: string;
}

interface WarmingStrategy {
  week1: PhaseConfig;
  week2: PhaseConfig;
  week3: PhaseConfig;
  stable: PhaseConfig;
}

interface WarmingAction {
  id: string;
  actionType: string;
  target: string | null;
  result: string | null;
  success: boolean;
  day: number;
  phase: string;
  createdAt: Date;
}

interface WarmingAccount {
  id: string;
  accountId: string;
  username: string;
  status: string;
  currentDay: number;
  currentPhase: string;
  warmingStartedAt: Date | null;
  warmingEndsAt: Date | null;
  todayLikes: number;
  todayFollows: number;
  todayComments: number;
  todayPosts: number;
  todayDm: number;
  todayStoriesViews: number;
  todayTimeSpent: number;
  maxLikes: number;
  maxFollows: number;
  maxComments: number;
  maxPosts: number;
  maxDm: number;
  maxTimeSpent: number;
  banRisk: number;
  totalLikes: number;
  totalFollows: number;
  totalComments: number;
  totalPosts: number;
  totalDm: number;
  warnings: string | null;
  lastWarningAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  phase: string;
  phaseConfig: PhaseConfig;
  calculatedLimits: Record<string, number>;
  progress: number;
  InstagramWarmingAction: WarmingAction[];
}

interface WarmingStats {
  total: number;
  new: number;
  warming: number;
  stable: number;
  ghost: number;
  light: number;
  activation: number;
}

interface ApiResponse {
  warmings: WarmingAccount[];
  stats: WarmingStats;
  strategy: WarmingStrategy;
}

// Phase icons mapping
const phaseIcons: Record<string, typeof Ghost> = {
  ghost: Ghost,
  light: Hand,
  activation: Rocket,
  stable: CheckCircle,
};

// Action icons mapping
const actionIcons: Record<string, typeof Heart> = {
  like: Heart,
  follow: UserPlus,
  comment: MessageCircle,
  post: Image,
  dm: Send,
  view: Eye,
  story: Film,
  warming_started: Zap,
};

// Action colors mapping
const actionColors: Record<string, string> = {
  like: '#E4405F',
  follow: '#00D26A',
  comment: '#6C63FF',
  post: '#FFB800',
  dm: '#0088cc',
  view: '#8A8A8A',
  story: '#F77737',
  warming_started: '#00D26A',
};

// Instagram-specific 21-day warming strategy
const instagramStrategy: WarmingStrategy = {
  week1: {
    name: 'Призрак',
    days: [1, 7],
    limits: {
      likes: { min: 5, max: 10 },
      follows: { min: 0, max: 0 },
      comments: { min: 0, max: 0 },
      posts: { min: 0, max: 0 },
      dm: { min: 0, max: 0 },
      timeSpent: { min: 15, max: 20 },
    },
    description: 'Только скроллинг, просмотр Stories, редкие лайки. Создаём историю просмотров.',
    color: '#8A8A8A',
    icon: 'ghost',
  },
  week2: {
    name: 'Лёгкий контакт',
    days: [8, 14],
    limits: {
      likes: { min: 10, max: 20 },
      follows: { min: 3, max: 7 },
      comments: { min: 1, max: 3 },
      posts: { min: 0, max: 1 },
      dm: { min: 0, max: 0 },
      timeSpent: { min: 25, max: 35 },
    },
    description: 'Лайки, подписки, редкие комментарии. Показываем алгоритму свою нишу.',
    color: '#FFB800',
    icon: 'hand-metal',
  },
  week3: {
    name: 'Активация',
    days: [15, 21],
    limits: {
      likes: { min: 20, max: 40 },
      follows: { min: 7, max: 15 },
      comments: { min: 3, max: 7 },
      posts: { min: 1, max: 3 },
      dm: { min: 0, max: 3 },
      timeSpent: { min: 35, max: 50 },
    },
    description: 'Полная активность, публикация контента, первые Stories.',
    color: '#00D26A',
    icon: 'zap',
  },
  stable: {
    name: 'Стабильный',
    days: [22, 999],
    limits: {
      likes: { min: 50, max: 100 },
      follows: { min: 20, max: 40 },
      comments: { min: 10, max: 20 },
      posts: { min: 1, max: 3 },
      dm: { min: 10, max: 20 },
      timeSpent: { min: 40, max: 60 },
    },
    description: 'Аккаунт готов к заливу трафика! Полные лимиты без ограничений прогрева.',
    color: '#6C63FF',
    icon: 'check-circle',
  },
};

// Progress bar component with gradient
function GradientProgress({ 
  value, 
  phase, 
  className 
}: { 
  value: number; 
  phase: string;
  className?: string;
}) {
  const gradientClass = useMemo(() => {
    switch (phase) {
      case 'ghost':
        return 'from-gray-500 via-gray-400 to-gray-300';
      case 'light':
        return 'from-yellow-600 via-yellow-500 to-yellow-400';
      case 'activation':
        return 'from-green-600 via-green-500 to-emerald-400';
      case 'stable':
        return 'from-purple-600 via-purple-500 to-violet-400';
      default:
        return 'from-gray-500 via-gray-400 to-gray-300';
    }
  }, [phase]);

  return (
    <div className={cn("relative h-3 w-full overflow-hidden rounded-full bg-[#1E1F26]", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r transition-all duration-500",
          gradientClass
        )}
        style={{ width: `${value}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
      </div>
    </div>
  );
}

// Action button component
function ActionButton({
  icon: Icon,
  label,
  current,
  max,
  color,
  onClick,
  disabled,
  loading,
  delay,
}: {
  icon: typeof Heart;
  label: string;
  current: number;
  max: number;
  color: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  delay?: number;
}) {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={disabled || isAtLimit || loading}
            className={cn(
              "relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300",
              "bg-gradient-to-br from-[#1E1F26] to-[#14151A] border border-[#2A2B32]",
              "hover:border-opacity-50 hover:shadow-lg",
              isAtLimit && "opacity-50 cursor-not-allowed",
              isNearLimit && !isAtLimit && "border-orange-500/50",
              !isAtLimit && !isNearLimit && "hover:border-opacity-100"
            )}
            style={{ 
              borderColor: isNearLimit ? `${color}50` : undefined,
            }}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <span className="text-xs font-medium text-white">{label}</span>
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-sm font-bold",
                isAtLimit ? "text-red-400" : isNearLimit ? "text-orange-400" : "text-white"
              )}>
                {current}
              </span>
              <span className="text-xs text-[#8A8A8A]">/ {max}</span>
            </div>
            {delay && delay > 0 && (
              <span className="text-xs text-[#8A8A8A] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {delay}с
              </span>
            )}
            {isNearLimit && !isAtLimit && (
              <AlertTriangle className="absolute top-1 right-1 w-3 h-3 text-orange-400" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {isAtLimit 
              ? `Лимит ${label.toLowerCase()} достигнут` 
              : `Осталось: ${max - current} ${label.toLowerCase()}`
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Phase timeline component
function PhaseTimeline({ currentDay, strategy }: { currentDay: number; strategy: WarmingStrategy }) {
  const phases = [
    { key: 'ghost', config: strategy.week1, label: 'Неделя 1' },
    { key: 'light', config: strategy.week2, label: 'Неделя 2' },
    { key: 'activation', config: strategy.week3, label: 'Неделя 3' },
    { key: 'stable', config: strategy.stable, label: 'Стабильный' },
  ];

  return (
    <div className="flex items-center gap-1 p-3 bg-[#1E1F26] rounded-xl">
      {phases.map((phase, index) => {
        const isActive = currentDay >= phase.config.days[0] && currentDay <= phase.config.days[1];
        const isPast = currentDay > phase.config.days[1];
        const Icon = phaseIcons[phase.key];

        return (
          <div key={phase.key} className="flex items-center flex-1">
            <div
              className={cn(
                "flex-1 flex flex-col items-center p-2 rounded-lg transition-all",
                isActive && "ring-2",
                isPast && "opacity-60"
              )}
              style={{
                backgroundColor: isActive ? `${phase.config.color}20` : 'transparent',
                ...(isActive && { '--tw-ring-color': phase.config.color } as React.CSSProperties),
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
                style={{ 
                  backgroundColor: isActive || isPast ? `${phase.config.color}30` : '#2A2B32' 
                }}
              >
                <Icon
                  className="w-4 h-4"
                  style={{ color: isActive || isPast ? phase.config.color : '#8A8A8A' }}
                />
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: isActive ? phase.config.color : '#8A8A8A' }}
              >
                {phase.config.name}
              </span>
              <span className="text-[10px] text-[#8A8A8A]">{phase.label}</span>
            </div>
            {index < phases.length - 1 && (
              <ChevronRight className="w-3 h-3 text-[#8A8A8A] mx-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Main component - Instagram-specific warming view
export function InstagramWarmingView() {
  const [warmings, setWarmings] = useState<WarmingAccount[]>([]);
  const [stats, setStats] = useState<WarmingStats | null>(null);
  const [strategy] = useState<WarmingStrategy>(instagramStrategy);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<WarmingAccount | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newAccountId, setNewAccountId] = useState('');
  const [actionDelays, setActionDelays] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('accounts');

  // Fetch warming data
  const fetchWarmingData = useCallback(async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await fetch('/api/warming/instagram');
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить данные о прогреве');
      }

      const data: ApiResponse = await response.json();
      setWarmings(data.warmings || []);
      setStats(data.stats || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchWarmingData();
  }, [fetchWarmingData]);

  // Start warming for new account
  const startWarming = async () => {
    if (!newUsername || !newAccountId) {
      toast.error('Введите username и ID аккаунта');
      return;
    }

    try {
      setActionLoading('start');
      
      const response = await fetch('/api/warming/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          accountId: newAccountId,
          username: newUsername,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось запустить прогрев');
      }

      toast.success('Прогрев запущен');
      setAddAccountOpen(false);
      setNewUsername('');
      setNewAccountId('');
      await fetchWarmingData(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Perform action with delay
  const performAction = async (accountId: string, actionType: string) => {
    const delay = Math.floor(Math.random() * 6000) + 2000;
    setActionDelays(prev => ({ ...prev, [`${accountId}-${actionType}`]: Math.round(delay / 1000) }));
    setActionLoading(`${accountId}-${actionType}`);

    try {
      await new Promise(resolve => setTimeout(resolve, delay));

      const response = await fetch('/api/warming/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'perform',
          accountId,
          actionType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.limitReached) {
          toast.warning(data.error);
        } else {
          throw new Error(data.error || 'Не удалось выполнить действие');
        }
        return;
      }

      toast.success(`${getActionLabel(actionType)} выполнен`);
      
      if (data.nearLimit) {
        data.warnings?.forEach((w: string) => toast.warning(w));
      }

      setWarmings(prev => prev.map(w => 
        w.accountId === accountId ? { ...w, ...data.warming } : w
      ));

      if (selectedAccount?.accountId === accountId) {
        setSelectedAccount(prev => prev ? { ...prev, ...data.warming } : null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
      setActionDelays(prev => {
        const newState = { ...prev };
        delete newState[`${accountId}-${actionType}`];
        return newState;
      });
    }
  };

  // Advance to next day
  const nextDay = async (accountId: string) => {
    try {
      setActionLoading(`nextDay-${accountId}`);

      const response = await fetch('/api/warming/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'nextDay',
          accountId,
        }),
      });

      if (!response.ok) {
        throw new Error('Не удалось перейти на следующий день');
      }

      const data = await response.json();
      toast.success(data.message);
      
      if (data.isComplete) {
        toast.success('Поздравляем! Аккаунт успешно прогрет!');
      }

      await fetchWarmingData(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Get action label
  const getActionLabel = (actionType: string): string => {
    const labels: Record<string, string> = {
      like: 'Лайк',
      follow: 'Подписка',
      comment: 'Комментарий',
      post: 'Пост',
      dm: 'Сообщение',
      view: 'Просмотр',
      story: 'Story',
    };
    return labels[actionType] || actionType;
  };

  // Get status info
  const getStatusInfo = (warming: WarmingAccount) => {
    if (warming.status === 'stable' || warming.currentDay > 21) {
      return { label: 'Стабильный', color: '#6C63FF', bgColor: 'bg-purple-500/20' };
    }
    if (warming.status === 'warming') {
      return { label: 'Прогрев', color: '#FFB800', bgColor: 'bg-yellow-500/20' };
    }
    return { label: 'Новый', color: '#8A8A8A', bgColor: 'bg-gray-500/20' };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#E4405F]" />
            <span className="text-[#8A8A8A]">Загрузка данных прогрева Instagram...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && warmings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-red-400">{error}</p>
          <Button variant="outline" onClick={() => fetchWarmingData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Повторить
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E4405F] via-[#F77737] to-[#FCAF45] flex items-center justify-center">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            Прогрев Instagram
          </h1>
          <p className="text-[#8A8A8A] mt-1">
            21-дневная стратегия безопасного прогрева для Instagram аккаунтов
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-[#2A2B32]"
            onClick={() => fetchWarmingData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
            Обновить
          </Button>
          <Button 
            className="bg-gradient-to-r from-[#E4405F] to-[#F77737] hover:from-[#E4405F]/90 hover:to-[#F77737]/90 text-white border-0"
            onClick={() => setAddAccountOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить аккаунт
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-gradient-to-br from-[#E4405F]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E4405F]/20 flex items-center justify-center">
                <Instagram className="w-5 h-5 text-[#E4405F]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.total || 0}</p>
                <p className="text-xs text-[#8A8A8A]">Всего</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-500/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
                <Ghost className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.ghost || 0}</p>
                <p className="text-xs text-[#8A8A8A]">Призрак</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#FFB800]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Hand className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.light || 0}</p>
                <p className="text-xs text-[#8A8A8A]">Контакт</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#00D26A]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.activation || 0}</p>
                <p className="text-xs text-[#8A8A8A]">Активация</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.stable || 0}</p>
                <p className="text-xs text-[#8A8A8A]">Стабильных</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#F77737]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F77737]/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-[#F77737]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.warming || 0}</p>
                <p className="text-xs text-[#8A8A8A]">На прогреве</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#E4405F]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E4405F]/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#E4405F]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {warmings.length > 0 
                    ? Math.round(warmings.reduce((sum, w) => sum + w.banRisk, 0) / warmings.length)
                    : 0}%
                </p>
                <p className="text-xs text-[#8A8A8A]">Средний риск</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Strategy and Accounts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-[#E4405F]">
            <Users className="w-4 h-4 mr-2" />
            Аккаунты
          </TabsTrigger>
          <TabsTrigger value="strategy" className="data-[state=active]:bg-[#E4405F]">
            <Gauge className="w-4 h-4 mr-2" />
            Стратегия
          </TabsTrigger>
          <TabsTrigger value="tips" className="data-[state=active]:bg-[#E4405F]">
            <Bookmark className="w-4 h-4 mr-2" />
            Советы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6">
          {warmings.length === 0 ? (
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#1E1F26] flex items-center justify-center mb-4">
                    <Instagram className="w-8 h-8 text-[#8A8A8A]" />
                  </div>
                  <p className="text-white font-medium mb-2">Нет аккаунтов на прогреве</p>
                  <p className="text-[#8A8A8A] text-sm mb-4">
                    Добавьте Instagram аккаунт для начала прогрева
                  </p>
                  <Button 
                    onClick={() => setAddAccountOpen(true)}
                    className="bg-gradient-to-r from-[#E4405F] to-[#F77737] hover:from-[#E4405F]/90 hover:to-[#F77737]/90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить аккаунт
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {warmings.map((warming) => {
                const statusInfo = getStatusInfo(warming);
                const isSelected = selectedAccount?.accountId === warming.accountId;

                return (
                  <Card
                    key={warming.id}
                    className={cn(
                      "bg-[#14151A] border-[#2A2B32] cursor-pointer transition-all",
                      isSelected && "ring-2 ring-[#E4405F]"
                    )}
                    onClick={() => setSelectedAccount(isSelected ? null : warming)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 border-2" style={{ borderColor: warming.phaseConfig?.color || '#8A8A8A' }}>
                            <AvatarFallback className="bg-gradient-to-br from-[#E4405F] to-[#F77737] text-white font-bold">
                              {warming.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-white text-lg">@{warming.username}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{ 
                                  borderColor: warming.phaseConfig?.color || '#8A8A8A',
                                  color: warming.phaseConfig?.color || '#8A8A8A'
                                }}
                              >
                                {warming.phaseConfig?.name || 'Неизвестно'}
                              </Badge>
                              <Badge
                                className={cn("text-xs text-white", statusInfo.bgColor)}
                                style={{ backgroundColor: `${statusInfo.color}20` }}
                              >
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    nextDay(warming.accountId);
                                  }}
                                  disabled={actionLoading?.startsWith('nextDay')}
                                >
                                  {actionLoading === `nextDay-${warming.accountId}` ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Следующий день</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#8A8A8A]">Прогресс прогрева</span>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#8A8A8A]" />
                            <span className="text-white font-medium">
                              День {Math.min(warming.currentDay, 21)} из 21
                            </span>
                          </div>
                        </div>
                        <GradientProgress
                          value={warming.progress}
                          phase={warming.phase}
                        />
                        <div className="flex justify-between text-xs text-[#8A8A8A]">
                          <span>
                            Начало: {warming.warmingStartedAt 
                              ? format(new Date(warming.warmingStartedAt), 'd MMM', { locale: ru })
                              : '—'
                            }
                          </span>
                          <span>
                            {warming.currentDay > 21 
                              ? 'Завершён'
                              : `Осталось: ${21 - warming.currentDay} дн.`
                            }
                          </span>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold text-white">{warming.currentDay}</p>
                          <p className="text-xs text-[#8A8A8A]">Текущий день</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">{warming.progress}%</p>
                          <p className="text-xs text-[#8A8A8A]">Прогресс</p>
                        </div>
                        <div>
                          <p className={cn(
                            "text-lg font-bold",
                            warming.banRisk < 30 ? "text-[#00D26A]" : 
                            warming.banRisk < 70 ? "text-[#FFB800]" : "text-[#FF4D4D]"
                          )}>
                            {warming.banRisk}%
                          </p>
                          <p className="text-xs text-[#8A8A8A]">Риск бана</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-6 gap-2">
                        <ActionButton
                          icon={Heart}
                          label="Лайк"
                          current={warming.todayLikes}
                          max={warming.maxLikes}
                          color="#E4405F"
                          onClick={() => performAction(warming.accountId, 'like')}
                          loading={actionLoading === `${warming.accountId}-like`}
                          delay={actionDelays[`${warming.accountId}-like`]}
                        />
                        <ActionButton
                          icon={UserPlus}
                          label="Подписка"
                          current={warming.todayFollows}
                          max={warming.maxFollows}
                          color="#00D26A"
                          onClick={() => performAction(warming.accountId, 'follow')}
                          loading={actionLoading === `${warming.accountId}-follow`}
                          delay={actionDelays[`${warming.accountId}-follow`]}
                          disabled={warming.maxFollows === 0}
                        />
                        <ActionButton
                          icon={MessageCircle}
                          label="Коммент"
                          current={warming.todayComments}
                          max={warming.maxComments}
                          color="#6C63FF"
                          onClick={() => performAction(warming.accountId, 'comment')}
                          loading={actionLoading === `${warming.accountId}-comment`}
                          delay={actionDelays[`${warming.accountId}-comment`]}
                          disabled={warming.maxComments === 0}
                        />
                        <ActionButton
                          icon={Image}
                          label="Пост"
                          current={warming.todayPosts}
                          max={warming.maxPosts}
                          color="#FFB800"
                          onClick={() => performAction(warming.accountId, 'post')}
                          loading={actionLoading === `${warming.accountId}-post`}
                          delay={actionDelays[`${warming.accountId}-post`]}
                          disabled={warming.maxPosts === 0}
                        />
                        <ActionButton
                          icon={Film}
                          label="Story"
                          current={warming.todayStoriesViews || 0}
                          max={10}
                          color="#F77737"
                          onClick={() => performAction(warming.accountId, 'story')}
                          loading={actionLoading === `${warming.accountId}-story`}
                          delay={actionDelays[`${warming.accountId}-story`]}
                        />
                        <ActionButton
                          icon={Send}
                          label="DM"
                          current={warming.todayDm}
                          max={warming.maxDm}
                          color="#0088cc"
                          onClick={() => performAction(warming.accountId, 'dm')}
                          loading={actionLoading === `${warming.accountId}-dm`}
                          delay={actionDelays[`${warming.accountId}-dm`]}
                          disabled={warming.maxDm === 0}
                        />
                      </div>

                      {/* Warnings */}
                      {warming.warnings && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 text-orange-400 text-sm">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{warming.warnings}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="strategy" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Gauge className="w-5 h-5 text-[#E4405F]" />
                21-дневная стратегия прогрева Instagram
              </CardTitle>
              <CardDescription className="text-[#8A8A8A]">
                Пошаговый план безопасного разогрева аккаунта
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhaseTimeline currentDay={selectedAccount?.currentDay || 1} strategy={strategy} />
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                {[strategy.week1, strategy.week2, strategy.week3, strategy.stable].map((phase, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-[#1E1F26] border border-[#2A2B32]"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${phase.color}20` }}
                      >
                        {index === 0 && <Ghost className="w-4 h-4" style={{ color: phase.color }} />}
                        {index === 1 && <Hand className="w-4 h-4" style={{ color: phase.color }} />}
                        {index === 2 && <Rocket className="w-4 h-4" style={{ color: phase.color }} />}
                        {index === 3 && <CheckCircle className="w-4 h-4" style={{ color: phase.color }} />}
                      </div>
                      <span className="font-medium text-white">{phase.name}</span>
                    </div>
                    <p className="text-xs text-[#8A8A8A] mb-3">{phase.description}</p>
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Лайки:</span>
                        <span className="text-white">{phase.limits.likes.min}-{phase.limits.likes.max}/день</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Подписки:</span>
                        <span className="text-white">{phase.limits.follows.min}-{phase.limits.follows.max}/день</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Комменты:</span>
                        <span className="text-white">{phase.limits.comments.min}-{phase.limits.comments.max}/день</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Посты:</span>
                        <span className="text-white">{phase.limits.posts.min}-{phase.limits.posts.max}/день</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Время:</span>
                        <span className="text-white">{phase.limits.timeSpent.min}-{phase.limits.timeSpent.max} мин</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tips" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00D26A]" />
                  Правила безопасности
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00D26A] mt-0.5 shrink-0" />
                  <span className="text-[#8A8A8A]">Используйте только мобильные или резидентные прокси</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00D26A] mt-0.5 shrink-0" />
                  <span className="text-[#8A8A8A]">Соблюдайте задержки 20-60 сек между действиями</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00D26A] mt-0.5 shrink-0" />
                  <span className="text-[#8A8A8A]">Не копируйте одинаковые комментарии</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00D26A] mt-0.5 shrink-0" />
                  <span className="text-[#8A8A8A]">Просматривайте Stories целевой аудитории</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00D26A] mt-0.5 shrink-0" />
                  <span className="text-[#8A8A8A]">Заполняйте профиль полностью перед прогревом</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#FF4D4D]" />
                  Чего НЕ делать
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#FF4D4D] mt-0.5 shrink-0" />
                  <span className="text-[#8A8A8A]">Не превышайте дневные лимиты</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#FF4D4D] mt-0.5 shrink-0" />
                  <span className="text-[#8A8A8A]">Не используйте дата-центр прокси</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#FF4D4D] mt-0.5 shrink-0" />
                  <span className="text-[#8A8A8A]">Не подписывайтесь массово в первые дни</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#FF4D4D] mt-0.5 shrink-0" />
                  <span className="text-[#8A8A8A]">Не используйте один IP для нескольких аккаунтов</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#FF4D4D] mt-0.5 shrink-0" />
                  <span className="text-[#8A8A8A]">Не публикуйте в первую неделю</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#14151A] border-[#2A2B32] md:col-span-2">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#FFB800]" />
                  Признаки теневого бана
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-[#1E1F26] rounded-lg">
                    <p className="text-white font-medium mb-2">Посты не в поиске</p>
                    <p className="text-[#8A8A8A]">Ваши посты не появляются по хэштегам</p>
                  </div>
                  <div className="p-3 bg-[#1E1F26] rounded-lg">
                    <p className="text-white font-medium mb-2">Резкое падение охвата</p>
                    <p className="text-[#8A8A8A]">Количество просмотров упало в 10+ раз</p>
                  </div>
                  <div className="p-3 bg-[#1E1F26] rounded-lg">
                    <p className="text-white font-medium mb-2">Проверка</p>
                    <p className="text-[#8A8A8A]">Используйте вкладку Shadow Ban для проверки</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Account Dialog */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32]">
          <DialogHeader>
            <DialogTitle className="text-white">Добавить Instagram аккаунт</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Введите данные аккаунта для начала 21-дневного прогрева
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Username (без @)</Label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.replace('@', ''))}
                placeholder="username"
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">ID аккаунта</Label>
              <Input
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
                placeholder="account_id или любой идентификатор"
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAddAccountOpen(false)}
              className="border-[#2A2B32]"
            >
              Отмена
            </Button>
            <Button 
              onClick={startWarming}
              disabled={actionLoading === 'start'}
              className="bg-gradient-to-r from-[#E4405F] to-[#F77737] hover:from-[#E4405F]/90 hover:to-[#F77737]/90"
            >
              {actionLoading === 'start' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Начать прогрев
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InstagramWarmingView;

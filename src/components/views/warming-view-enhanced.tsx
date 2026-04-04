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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
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
  Fingerprint,
  Globe,
  Monitor,
  Users,
  Zap,
  Ghost,
  Rocket,
  Ban,
  ExternalLink,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInDays, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  PLATFORM_CONFIGS,
  getPlatformConfig,
  getCurrentPhase,
  getDailyLimits,
  calculateProgress,
  isTrafficReady,
  PlatformConfig,
  WarmingPhase,
  PhaseLimits,
} from '@/lib/warming/platform-configs';
import {
  runFingerprintChecks,
  getRiskColor,
  getRiskLabel,
  FingerprintResult,
} from '@/lib/warming/fingerprint-checker';
import {
  runProxyChecks,
  getQualityColor,
  getQualityLabel,
  ProxyValidationResult,
} from '@/lib/warming/proxy-checker';
import {
  analyzeBehaviorPatterns,
  generateHumanDelay,
  generateSessionSchedule,
  getRiskLevel,
  getRiskLevelColor,
  BehaviorAnalysis,
} from '@/lib/warming/behavior-monitor';

// Types
interface WarmingAccount {
  id: string;
  accountId: string;
  username: string;
  platform: string;
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
  todayInvites: number;
  todayRetweets: number;
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
  proxyId?: string;
  proxyHost?: string;
  proxyCountry?: string;
  fingerprintScore?: number;
  behaviorScore?: number;
}

interface WarmingStats {
  total: number;
  byPlatform: Record<string, number>;
  byPhase: Record<string, number>;
  warming: number;
  stable: number;
  trafficReady: number;
}

// Platform icons and colors
const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
  telegram: '✈️',
  x: '𝕏',
  linkedin: '💼',
  facebook: '📘',
};

// Phase icons mapping
const phaseIcons: Record<string, typeof Ghost> = {
  ghost: Ghost,
  cold: Ghost,
  observer: Eye,
  setup: Settings,
  hand: Zap,
  light: Zap,
  waking: Activity,
  engager: MessageCircle,
  engagement: MessageCircle,
  networking: Users,
  activation: Rocket,
  growth: TrendingUp,
  active: Zap,
  creator: Image,
  authority: CheckCircle,
  stable: CheckCircle,
  traffic: CheckCircle,
  established: CheckCircle,
};

// Action types per platform
const ACTION_TYPES: Record<string, string[]> = {
  instagram: ['like', 'follow', 'comment', 'post', 'dm', 'view'],
  tiktok: ['like', 'follow', 'comment', 'post', 'view'],
  telegram: ['follow', 'comment', 'post', 'dm', 'invite'],
  x: ['like', 'follow', 'comment', 'post', 'dm', 'retweet'],
  linkedin: ['like', 'follow', 'comment', 'post', 'dm'],
  facebook: ['like', 'follow', 'comment', 'post', 'dm'],
};

// Action icons
const actionIcons: Record<string, typeof Heart> = {
  like: Heart,
  follow: UserPlus,
  comment: MessageCircle,
  post: Image,
  dm: Send,
  view: Eye,
  invite: Users,
  retweet: RefreshCw,
};

// Action colors
const actionColors: Record<string, string> = {
  like: '#E4405F',
  follow: '#00D26A',
  comment: '#6C63FF',
  post: '#FFB800',
  dm: '#0088cc',
  view: '#8A8A8A',
  invite: '#FF6B35',
  retweet: '#1DA1F2',
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
    if (value >= 100) return 'from-purple-600 via-purple-500 to-violet-400';
    
    switch (phase) {
      case 'ghost':
      case 'cold':
      case 'observer':
      case 'setup':
        return 'from-gray-500 via-gray-400 to-gray-300';
      case 'light':
      case 'hand':
      case 'waking':
      case 'networking':
      case 'engager':
      case 'engagement':
        return 'from-yellow-600 via-yellow-500 to-yellow-400';
      case 'activation':
      case 'growth':
      case 'active':
      case 'creator':
      case 'authority':
        return 'from-green-600 via-green-500 to-emerald-400';
      case 'stable':
      case 'traffic':
      case 'established':
        return 'from-purple-600 via-purple-500 to-violet-400';
      default:
        return 'from-gray-500 via-gray-400 to-gray-300';
    }
  }, [phase, value]);

  return (
    <div className={cn("relative h-3 w-full overflow-hidden rounded-full bg-[#1E1F26]", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r transition-all duration-500",
          gradientClass
        )}
        style={{ width: `${Math.min(value, 100)}%` }}
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
                "text-base font-bold",
                isAtLimit ? "text-red-400" : isNearLimit ? "text-orange-400" : "text-white"
              )}>
                {current}
              </span>
              <span className="text-[#8A8A8A] text-sm">/ {max}</span>
            </div>
            {delay && delay > 0 && (
              <span className="text-xs text-[#8A8A8A] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {delay}с
              </span>
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
function PhaseTimeline({
  currentDay,
  platform,
}: {
  currentDay: number;
  platform: string;
}) {
  const config = getPlatformConfig(platform);
  if (!config) return null;

  return (
    <div className="flex items-center gap-1 p-4 bg-[#1E1F26] rounded-xl">
      {config.phases.map((phase, index) => {
        const isActive = currentDay >= phase.days[0] && currentDay <= phase.days[1];
        const isPast = currentDay > phase.days[1];
        const Icon = phaseIcons[phase.icon] || Ghost;

        return (
          <div key={phase.name} className="flex items-center flex-1">
            <div
              className={cn(
                "flex-1 flex flex-col items-center p-2 rounded-lg transition-all",
                isActive && "ring-2",
                isPast && "opacity-60"
              )}
              style={{
                backgroundColor: isActive ? `${phase.color}20` : 'transparent',
                ringColor: isActive ? phase.color : undefined,
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
                style={{
                  backgroundColor: isActive || isPast ? `${phase.color}30` : '#2A2B32'
                }}
              >
                <Icon
                  className="w-4 h-4"
                  style={{ color: isActive || isPast ? phase.color : '#8A8A8A' }}
                />
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: isActive ? phase.color : '#8A8A8A' }}
              >
                {phase.nameRu}
              </span>
              <span className="text-[10px] text-[#8A8A8A]">
                {phase.days[1] === 999 ? `${phase.days[0]}+` : `${phase.days[0]}-${phase.days[1]}`}д
              </span>
            </div>
            {index < config.phases.length - 1 && (
              <ChevronRight className="w-4 h-4 text-[#8A8A8A] mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Platform selector
function PlatformSelector({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (platform: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.entries(PLATFORM_CONFIGS).map(([id, config]) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
            selected === id
              ? "border-[#6C63FF] bg-[#6C63FF]/20"
              : "border-[#2A2B32] hover:border-[#3A3B42]"
          )}
        >
          <span className="text-lg">{PLATFORM_ICONS[id]}</span>
          <span className="text-sm font-medium">{config.name}</span>
        </button>
      ))}
    </div>
  );
}

// Limits table component
function LimitsTable({ platform }: { platform: string }) {
  const config = getPlatformConfig(platform);
  if (!config) return null;

  const actionLabels: Record<string, string> = {
    likes: 'Лайки',
    follows: 'Подписки',
    comments: 'Комментарии',
    posts: 'Посты',
    dm: 'Сообщения',
    stories: 'Stories',
    invites: 'Инвайты',
    retweets: 'Репосты',
    timeSpent: 'Время (мин)',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2B32]">
            <th className="text-left py-2 px-3 text-[#8A8A8A]">Период</th>
            {Object.keys(config.phases[0].limits).map(key => (
              <th key={key} className="text-center py-2 px-3 text-[#8A8A8A]">
                {actionLabels[key] || key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {config.phases.map((phase) => (
            <tr key={phase.name} className="border-b border-[#2A2B32]/50 hover:bg-[#1E1F26]">
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: phase.color }}
                  />
                  <span className="font-medium">{phase.nameRu}</span>
                </div>
                <span className="text-xs text-[#8A8A8A]">
                  День {phase.days[0]}-{phase.days[1] === 999 ? '+' : phase.days[1]}
                </span>
              </td>
              {Object.entries(phase.limits).map(([key, limit]) => (
                <td key={key} className="text-center py-2 px-3 text-white">
                  {limit.min === 0 && limit.max === 0 ? (
                    <span className="text-[#8A8A8A]">—</span>
                  ) : limit.min === limit.max ? (
                    limit.max
                  ) : (
                    `${limit.min}-${limit.max}`
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Main component
export function WarmingViewEnhanced() {
  const [accounts, setAccounts] = useState<WarmingAccount[]>([]);
  const [stats, setStats] = useState<WarmingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [selectedAccount, setSelectedAccount] = useState<WarmingAccount | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newAccountId, setNewAccountId] = useState('');
  const [newPlatform, setNewPlatform] = useState('instagram');
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

      const response = await fetch('/api/warming');

      if (!response.ok) {
        throw new Error('Не удалось загрузить данные о прогреве');
      }

      const data = await response.json();
      setAccounts(data.accounts || []);
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

      const response = await fetch('/api/warming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          accountId: newAccountId,
          username: newUsername,
          platform: newPlatform,
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
    const delay = generateHumanDelay(3, 12);
    setActionDelays(prev => ({ ...prev, [`${accountId}-${actionType}`]: Math.round(delay) }));
    setActionLoading(`${accountId}-${actionType}`);

    try {
      await new Promise(resolve => setTimeout(resolve, delay * 1000));

      const response = await fetch('/api/warming', {
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

      // Update local state
      setAccounts(prev => prev.map(a =>
        a.accountId === accountId ? { ...a, ...data.account } : a
      ));

      if (selectedAccount?.accountId === accountId) {
        setSelectedAccount(prev => prev ? { ...prev, ...data.account } : null);
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

      const response = await fetch('/api/warming', {
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
      invite: 'Инвайт',
      retweet: 'Репост',
    };
    return labels[actionType] || actionType;
  };

  // Get status info
  const getStatusInfo = (account: WarmingAccount) => {
    const config = getPlatformConfig(account.platform);
    if (!config) return { label: 'Неизвестно', color: '#8A8A8A' };

    if (isTrafficReady(account.platform, account.currentDay)) {
      return { label: 'Готов к трафику', color: '#6C63FF' };
    }
    if (account.status === 'warming') {
      return { label: 'На прогреве', color: '#FFB800' };
    }
    return { label: 'Новый', color: '#8A8A8A' };
  };

  // Get max limits for account
  const getMaxLimits = (account: WarmingAccount): PhaseLimits => {
    const limits = getDailyLimits(account.platform, account.currentDay);
    return limits || {
      likes: { min: 0, max: 0 },
      follows: { min: 0, max: 0 },
      comments: { min: 0, max: 0 },
      posts: { min: 0, max: 0 },
      dm: { min: 0, max: 0 },
      timeSpent: { min: 0, max: 0 },
    };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#FFB800]" />
            <span className="text-[#8A8A8A]">Загрузка данных прогрева...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && accounts.length === 0) {
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

  const currentConfig = getPlatformConfig(selectedPlatform);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            Прогрев аккаунтов
          </h1>
          <p className="text-[#8A8A8A] mt-1">
            Мульти-платформенная система безопасного прогрева
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
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0"
            onClick={() => setAddAccountOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить аккаунт
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-[#6C63FF]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.total || 0}</p>
                <p className="text-xs text-[#8A8A8A]">Всего</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#FFB800]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.warming || 0}</p>
                <p className="text-xs text-[#8A8A8A]">На прогреве</p>
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

        <Card className="bg-gradient-to-br from-[#00D26A]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.trafficReady || 0}</p>
                <p className="text-xs text-[#8A8A8A]">Готовы к трафику</p>
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
                  {accounts.length > 0
                    ? Math.round(accounts.reduce((sum, a) => sum + a.banRisk, 0) / accounts.length)
                    : 0}%
                </p>
                <p className="text-xs text-[#8A8A8A]">Средний риск</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#0088cc]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0088cc]/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-[#0088cc]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {Object.keys(stats?.byPlatform || {}).length}
                </p>
                <p className="text-xs text-[#8A8A8A]">Платформ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border border-[#2A2B32]">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-[#2A2B32]">
            Аккаунты
          </TabsTrigger>
          <TabsTrigger value="strategy" className="data-[state=active]:bg-[#2A2B32]">
            Стратегия
          </TabsTrigger>
          <TabsTrigger value="checklist" className="data-[state=active]:bg-[#2A2B32]">
            Чек-лист
          </TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          {/* Platform Filter */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#8A8A8A]">Платформа:</span>
                <PlatformSelector
                  selected={selectedPlatform}
                  onSelect={setSelectedPlatform}
                />
              </div>
            </CardContent>
          </Card>

          {/* Accounts Grid */}
          {accounts.filter(a => a.platform === selectedPlatform).length === 0 ? (
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#1E1F26] flex items-center justify-center mb-4">
                    <span className="text-3xl">{PLATFORM_ICONS[selectedPlatform]}</span>
                  </div>
                  <p className="text-white font-medium mb-2">
                    Нет аккаунтов {currentConfig?.name} на прогреве
                  </p>
                  <p className="text-[#8A8A8A] text-sm mb-4">
                    Добавьте аккаунт для начала прогрева
                  </p>
                  <Button onClick={() => setAddAccountOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить аккаунт
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {accounts
                .filter(a => a.platform === selectedPlatform)
                .map((account) => {
                  const statusInfo = getStatusInfo(account);
                  const config = getPlatformConfig(account.platform);
                  const phase = getCurrentPhase(account.platform, account.currentDay);
                  const maxLimits = getMaxLimits(account);
                  const actions = ACTION_TYPES[account.platform] || [];
                  const progress = calculateProgress(account.platform, account.currentDay);

                  return (
                    <Card
                      key={account.id}
                      className={cn(
                        "bg-[#14151A] border-[#2A2B32] transition-all",
                        selectedAccount?.accountId === account.accountId && "ring-2 ring-[#FFB800]"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar
                              className="w-12 h-12 border-2"
                              style={{ borderColor: phase?.color || '#8A8A8A' }}
                            >
                              <AvatarFallback
                                className="bg-gradient-to-br from-orange-500 to-red-500 text-white font-bold"
                              >
                                {account.username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-white text-lg flex items-center gap-2">
                                <span>{PLATFORM_ICONS[account.platform]}</span>
                                @{account.username}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: phase?.color || '#8A8A8A',
                                    color: phase?.color || '#8A8A8A'
                                  }}
                                >
                                  {phase?.nameRu || 'Неизвестно'}
                                </Badge>
                                <Badge
                                  className="text-xs text-white"
                                  style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
                                >
                                  {statusInfo.label}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => nextDay(account.accountId)}
                                  disabled={actionLoading?.startsWith('nextDay')}
                                >
                                  {actionLoading === `nextDay-${account.accountId}` ? (
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
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[#8A8A8A]">Прогресс прогрева</span>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#8A8A8A]" />
                              <span className="text-white font-medium">
                                День {Math.min(account.currentDay, config?.totalWarmingDays || 21)} из {config?.totalWarmingDays || 21}
                              </span>
                            </div>
                          </div>
                          <GradientProgress
                            value={progress}
                            phase={phase?.icon || 'ghost'}
                          />
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="p-2 bg-[#1E1F26] rounded-lg">
                            <p className="text-lg font-bold text-white">{account.currentDay}</p>
                            <p className="text-xs text-[#8A8A8A]">День</p>
                          </div>
                          <div className="p-2 bg-[#1E1F26] rounded-lg">
                            <p className="text-lg font-bold text-white">{progress}%</p>
                            <p className="text-xs text-[#8A8A8A]">Прогресс</p>
                          </div>
                          <div className="p-2 bg-[#1E1F26] rounded-lg">
                            <p className={cn(
                              "text-lg font-bold",
                              account.banRisk < 30 ? "text-[#00D26A]" :
                              account.banRisk < 70 ? "text-[#FFB800]" : "text-[#FF4D4D]"
                            )}>
                              {account.banRisk}%
                            </p>
                            <p className="text-xs text-[#8A8A8A]">Риск</p>
                          </div>
                          <div className="p-2 bg-[#1E1F26] rounded-lg">
                            <p className="text-lg font-bold text-white">
                              {account.fingerprintScore || '—'}
                            </p>
                            <p className="text-xs text-[#8A8A8A]">Фингер</p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                          {actions.slice(0, 4).map((actionType) => {
                            const Icon = actionIcons[actionType] || Heart;
                            const maxKey = actionType === 'view' ? 'stories' : actionType;
                            const current = actionType === 'like' ? account.todayLikes :
                              actionType === 'follow' ? account.todayFollows :
                              actionType === 'comment' ? account.todayComments :
                              actionType === 'post' ? account.todayPosts :
                              actionType === 'dm' ? account.todayDm :
                              actionType === 'view' ? account.todayStoriesViews :
                              actionType === 'invite' ? account.todayInvites :
                              actionType === 'retweet' ? account.todayRetweets : 0;

                            const max = (maxLimits as Record<string, { min: number; max: number }>)[maxKey]?.max || 0;

                            return (
                              <ActionButton
                                key={actionType}
                                icon={Icon}
                                label={getActionLabel(actionType)}
                                current={current}
                                max={max}
                                color={actionColors[actionType] || '#8A8A8A'}
                                onClick={() => performAction(account.accountId, actionType)}
                                loading={actionLoading === `${account.accountId}-${actionType}`}
                                delay={actionDelays[`${account.accountId}-${actionType}`]}
                                disabled={max === 0}
                              />
                            );
                          })}
                        </div>

                        {/* Warnings */}
                        {account.warnings && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 text-orange-400 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{account.warnings}</span>
                          </div>
                        )}

                        {/* Proxy Info */}
                        {account.proxyHost && (
                          <div className="flex items-center gap-2 text-xs text-[#8A8A8A]">
                            <Globe className="w-3 h-3" />
                            <span>{account.proxyHost}</span>
                            {account.proxyCountry && (
                              <Badge variant="outline" className="text-[10px] py-0">
                                {account.proxyCountry}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* Strategy Tab */}
        <TabsContent value="strategy" className="space-y-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-[#FFB800]" />
                    Стратегия прогрева
                  </CardTitle>
                  <CardDescription className="text-[#8A8A8A]">
                    Выберите платформу для просмотра стратегии
                  </CardDescription>
                </div>
                <PlatformSelector
                  selected={selectedPlatform}
                  onSelect={setSelectedPlatform}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Phase Timeline */}
              {currentConfig && (
                <PhaseTimeline
                  currentDay={1}
                  platform={selectedPlatform}
                />
              )}

              {/* Limits Table */}
              <div>
                <h4 className="text-sm font-medium text-[#8A8A8A] mb-3">
                  Лимиты по фазам
                </h4>
                <Card className="bg-[#1E1F26] border-[#2A2B32]">
                  <CardContent className="p-4">
                    <LimitsTable platform={selectedPlatform} />
                  </CardContent>
                </Card>
              </div>

              {/* Proxy Requirements */}
              {currentConfig && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-[#1E1F26] border-[#2A2B32]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#0088cc]" />
                        Требования к прокси
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#8A8A8A]">Рекомендуется:</span>
                          <Badge className="bg-[#00D26A]/20 text-[#00D26A]">
                            {currentConfig.proxyRequirements.recommended}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8A8A8A]">Допустимые:</span>
                          <span className="text-white">
                            {currentConfig.proxyRequirements.types.join(', ')}
                          </span>
                        </div>
                        {currentConfig.proxyRequirements.warning && (
                          <p className="text-orange-400 text-xs mt-2">
                            ⚠ {currentConfig.proxyRequirements.warning}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#1E1F26] border-[#2A2B32]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-[#6C63FF]" />
                        Фингерпринт
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(currentConfig.fingerprintRequirements).map(([key, required]) => (
                          <div key={key} className="flex items-center gap-2">
                            {required ? (
                              <CheckCircle className="w-4 h-4 text-[#00D26A]" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-[#2A2B32]" />
                            )}
                            <span className={required ? 'text-white' : 'text-[#8A8A8A]'}>
                              {key}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Shadowban Info */}
              {currentConfig && (
                <Card className="bg-[#1E1F26] border-[#2A2B32]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Ban className="w-4 h-4 text-[#FF4D4D]" />
                      Shadow Ban
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-xs text-[#8A8A8A] mb-2">Признаки</h5>
                        <ul className="space-y-1">
                          {currentConfig.shadowbanIndicators.map((indicator, i) => (
                            <li key={i} className="text-sm text-white flex items-start gap-2">
                              <AlertTriangle className="w-3 h-3 text-orange-400 mt-1 shrink-0" />
                              {indicator}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs text-[#8A8A8A] mb-2">Восстановление</h5>
                        <ul className="space-y-1">
                          {currentConfig.recoverySteps.map((step, i) => (
                            <li key={i} className="text-sm text-white flex items-start gap-2">
                              <span className="text-[#6C63FF] font-medium">{i + 1}.</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#00D26A]" />
                Чек-лист для каждого аккаунта
              </CardTitle>
              <CardDescription className="text-[#8A8A8A]">
                Выполните все пункты перед началом работы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Before Start */}
                <div>
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#6C63FF]/20 flex items-center justify-center text-sm">
                      1
                    </div>
                    Перед стартом
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                    {[
                      { label: 'Антидетект-браузер', desc: 'Undetectable / AdsPower / MoreLogin / Octo Browser' },
                      { label: 'Отдельный прокси', desc: 'Мобильный или резидентный' },
                      { label: 'GEO совпадает', desc: 'Прокси = язык = время = телефон' },
                      { label: 'Fingerprint проверен', desc: 'BrowserLeaks / ToDetect' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-[#1E1F26] rounded-lg">
                        <div className="w-5 h-5 rounded border-2 border-[#6C63FF] flex items-center justify-center shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="text-xs text-[#8A8A8A]">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* During Warming */}
                <div>
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#FFB800]/20 flex items-center justify-center text-sm">
                      2
                    </div>
                    В процессе прогрева
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                    {[
                      { label: 'Ежедневные сессии', desc: 'С "человечными" паузами' },
                      { label: 'Лимиты соблюдены', desc: 'См. таблицы стратегии' },
                      { label: 'Контент уникальный', desc: 'Без водяных знаков' },
                      { label: 'Нет резких пиков', desc: 'Распределено на 2-3 сессии' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-[#1E1F26] rounded-lg">
                        <div className="w-5 h-5 rounded border-2 border-[#FFB800] flex items-center justify-center shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="text-xs text-[#8A8A8A]">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Before Traffic */}
                <div>
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#00D26A]/20 flex items-center justify-center text-sm">
                      3
                    </div>
                    Перед заливом трафика
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                    {[
                      { label: 'Аккаунт прогрет', desc: '21+ дней (IG/TT) или 14+ (TG)' },
                      { label: 'Account Status', desc: 'Всё зелёное (IG/TT)' },
                      { label: 'Нет ограничений', desc: 'Активных блокировок' },
                      { label: 'Bio ссылка', desc: 'Ведёт на актуальный оффер' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-[#1E1F26] rounded-lg">
                        <div className="w-5 h-5 rounded border-2 border-[#00D26A] flex items-center justify-center shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="text-xs text-[#8A8A8A]">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Account Dialog */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить аккаунт на прогрев</DialogTitle>
            <DialogDescription>
              Укажите данные аккаунта для начала прогрева
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Платформа</Label>
              <Select value={newPlatform} onValueChange={setNewPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_CONFIGS).map(([id, config]) => (
                    <SelectItem key={id} value={id}>
                      {PLATFORM_ICONS[id]} {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                placeholder="@username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.replace('@', ''))}
              />
            </div>

            <div className="space-y-2">
              <Label>Account ID</Label>
              <Input
                placeholder="ID аккаунта в системе"
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAccountOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={startWarming}
              disabled={!newUsername || !newAccountId || actionLoading === 'start'}
            >
              {actionLoading === 'start' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Запустить прогрев
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WarmingViewEnhanced;

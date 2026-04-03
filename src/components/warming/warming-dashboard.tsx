'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Zap,
  TrendingUp,
  Calendar,
  MessageCircle,
  Heart,
  UserPlus,
  Eye,
  AlertCircle,
  RefreshCw,
  Timer,
  Flame,
  Shield,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInDays, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

// Types
interface WarmingAccount {
  id: string;
  username: string;
  platform: string;
  avatarUrl?: string;
  status: 'warming' | 'paused' | 'completed' | 'error';
  warmingMode: 'fast' | 'standard' | 'maximum' | 'premium';
  progress: number;
  startedAt: Date;
  estimatedEnd: Date;
  daysRemaining: number;
  totalDays: number;
  dailyActions: {
    comments: number;
    dm: number;
    follows: number;
    likes: number;
  };
  maxActions: {
    comments: number;
    dm: number;
    follows: number;
    likes: number;
  };
  alerts: WarmingAlert[];
  activity: WarmingActivity[];
}

interface WarmingAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
}

interface WarmingActivity {
  id: string;
  type: 'comment' | 'dm' | 'follow' | 'like' | 'view';
  target?: string;
  timestamp: Date;
  success: boolean;
}

// Warming modes configuration
const warmingModes = {
  fast: {
    name: 'Быстрый',
    duration: 3,
    color: '#FF4D4D',
    description: 'Агрессивный прогрев, высокий риск',
    actionsMultiplier: 2,
    icon: Zap,
  },
  standard: {
    name: 'Стандартный',
    duration: 7,
    color: '#6C63FF',
    description: 'Оптимальный баланс скорости и безопасности',
    actionsMultiplier: 1,
    icon: Gauge,
  },
  maximum: {
    name: 'Максимальный',
    duration: 14,
    color: '#00D26A',
    description: 'Максимальная безопасность',
    actionsMultiplier: 0.5,
    icon: Shield,
  },
  premium: {
    name: 'Премиум',
    duration: 21,
    color: '#FFB800',
    description: 'Премиум прогрев с искусственным интеллектом',
    actionsMultiplier: 0.7,
    icon: Flame,
  },
};

// Demo data
const demoWarmingAccounts: WarmingAccount[] = [
  {
    id: '1',
    username: '@alice_model',
    platform: 'instagram',
    status: 'warming',
    warmingMode: 'standard',
    progress: 45,
    startedAt: new Date(2025, 0, 18),
    estimatedEnd: new Date(2025, 0, 25),
    daysRemaining: 4,
    totalDays: 7,
    dailyActions: { comments: 15, dm: 8, follows: 25, likes: 40 },
    maxActions: { comments: 30, dm: 15, follows: 50, likes: 80 },
    alerts: [
      { id: '1', type: 'warning', message: 'Превышен лимит комментариев за час', timestamp: new Date(2025, 0, 20, 14, 30) },
    ],
    activity: [
      { id: '1', type: 'like', target: '@fitness_guru', timestamp: new Date(2025, 0, 20, 15, 45), success: true },
      { id: '2', type: 'comment', target: '@crypto_news', timestamp: new Date(2025, 0, 20, 15, 30), success: true },
      { id: '3', type: 'follow', target: '@lifestyle_mag', timestamp: new Date(2025, 0, 20, 15, 15), success: true },
      { id: '4', type: 'dm', target: '@potential_lead', timestamp: new Date(2025, 0, 20, 15, 0), success: true },
      { id: '5', type: 'view', target: 'Story @brand_page', timestamp: new Date(2025, 0, 20, 14, 45), success: true },
    ],
  },
  {
    id: '2',
    username: '@sofia_crypto_new',
    platform: 'telegram',
    status: 'warming',
    warmingMode: 'premium',
    progress: 23,
    startedAt: new Date(2025, 0, 19),
    estimatedEnd: new Date(2025, 0, 9),
    daysRemaining: 18,
    totalDays: 21,
    dailyActions: { comments: 5, dm: 3, follows: 10, likes: 20 },
    maxActions: { comments: 20, dm: 10, follows: 30, likes: 50 },
    alerts: [],
    activity: [
      { id: '6', type: 'comment', target: 'Crypto Signals Channel', timestamp: new Date(2025, 0, 20, 14, 0), success: true },
      { id: '7', type: 'view', target: 'Trading Tips Channel', timestamp: new Date(2025, 0, 20, 13, 30), success: true },
    ],
  },
  {
    id: '3',
    username: '@max_gambling',
    platform: 'instagram',
    status: 'paused',
    warmingMode: 'fast',
    progress: 80,
    startedAt: new Date(2025, 0, 17),
    estimatedEnd: new Date(2025, 0, 20),
    daysRemaining: 0,
    totalDays: 3,
    dailyActions: { comments: 0, dm: 0, follows: 0, likes: 0 },
    maxActions: { comments: 50, dm: 25, follows: 80, likes: 120 },
    alerts: [
      { id: '2', type: 'error', message: 'Обнаружена подозрительная активность', timestamp: new Date(2025, 0, 20, 10, 0) },
    ],
    activity: [],
  },
  {
    id: '4',
    username: '@fit_artem_new',
    platform: 'telegram',
    status: 'completed',
    warmingMode: 'maximum',
    progress: 100,
    startedAt: new Date(2025, 0, 5),
    estimatedEnd: new Date(2025, 0, 19),
    daysRemaining: 0,
    totalDays: 14,
    dailyActions: { comments: 10, dm: 5, follows: 15, likes: 25 },
    maxActions: { comments: 15, dm: 8, follows: 25, likes: 40 },
    alerts: [],
    activity: [],
  },
];

// Activity type icons
const activityIcons: Record<string, typeof MessageCircle> = {
  comment: MessageCircle,
  dm: MessageCircle,
  follow: UserPlus,
  like: Heart,
  view: Eye,
};

const activityColors: Record<string, string> = {
  comment: '#6C63FF',
  dm: '#0088cc',
  follow: '#00D26A',
  like: '#E4405F',
  view: '#8A8A8A',
};

export function WarmingDashboard() {
  const [accounts, setAccounts] = useState<WarmingAccount[]>(demoWarmingAccounts);
  const [selectedAccount, setSelectedAccount] = useState<WarmingAccount | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    if (filterStatus === 'all') return accounts;
    return accounts.filter(a => a.status === filterStatus);
  }, [accounts, filterStatus]);

  // Stats calculation
  const stats = useMemo(() => {
    const warming = accounts.filter(a => a.status === 'warming').length;
    const paused = accounts.filter(a => a.status === 'paused').length;
    const completed = accounts.filter(a => a.status === 'completed').length;
    const errors = accounts.filter(a => a.status === 'error').length;
    const totalAlerts = accounts.reduce((sum, a) => sum + a.alerts.length, 0);
    return { warming, paused, completed, errors, totalAlerts };
  }, [accounts]);

  // Handle warming actions
  const handleStartWarming = (account: WarmingAccount) => {
    setAccounts(accounts.map(a => a.id === account.id ? { ...a, status: 'warming' as const } : a));
    toast.success(`Прогрев запущен для ${account.username}`);
  };

  const handlePauseWarming = (account: WarmingAccount) => {
    setAccounts(accounts.map(a => a.id === account.id ? { ...a, status: 'paused' as const } : a));
    toast.info(`Прогрев приостановлен для ${account.username}`);
  };

  const handleResumeWarming = (account: WarmingAccount) => {
    setAccounts(accounts.map(a => a.id === account.id ? { ...a, status: 'warming' as const } : a));
    toast.success(`Прогрев возобновлён для ${account.username}`);
  };

  const handleRestartWarming = (account: WarmingAccount) => {
    setAccounts(accounts.map(a => a.id === account.id ? {
      ...a,
      status: 'warming' as const,
      progress: 0,
      startedAt: new Date(),
      estimatedEnd: addDays(new Date(), warmingModes[a.warmingMode].duration),
      daysRemaining: warmingModes[a.warmingMode].duration,
      alerts: [],
    } : a));
    toast.success(`Прогрев перезапущен для ${account.username}`);
  };

  const handleChangeMode = (account: WarmingAccount, mode: 'fast' | 'standard' | 'maximum' | 'premium') => {
    const modeConfig = warmingModes[mode];
    setAccounts(accounts.map(a => a.id === account.id ? {
      ...a,
      warmingMode: mode,
      estimatedEnd: addDays(a.startedAt, modeConfig.duration),
      totalDays: modeConfig.duration,
      daysRemaining: differenceInDays(addDays(a.startedAt, modeConfig.duration), new Date()),
      maxActions: {
        comments: Math.round(30 * modeConfig.actionsMultiplier),
        dm: Math.round(15 * modeConfig.actionsMultiplier),
        follows: Math.round(50 * modeConfig.actionsMultiplier),
        likes: Math.round(80 * modeConfig.actionsMultiplier),
      },
    } : a));
    toast.success(`Режим изменён на "${modeConfig.name}" для ${account.username}`);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#6C63FF]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.warming}</p>
                <p className="text-xs text-[#8A8A8A]">Прогревается</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#FFB800]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Pause className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.paused}</p>
                <p className="text-xs text-[#8A8A8A]">На паузе</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#00D26A]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.completed}</p>
                <p className="text-xs text-[#8A8A8A]">Завершено</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#FF4D4D]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF4D4D]/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-[#FF4D4D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.errors}</p>
                <p className="text-xs text-[#8A8A8A]">Ошибки</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#E4405F]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E4405F]/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#E4405F]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalAlerts}</p>
                <p className="text-xs text-[#8A8A8A]">Уведомления</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] bg-[#1E1F26] border-[#2A2B32] text-white">
            <SelectValue placeholder="Фильтр" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
            <SelectItem value="all" className="text-white">Все аккаунты</SelectItem>
            <SelectItem value="warming" className="text-white">Прогреваются</SelectItem>
            <SelectItem value="paused" className="text-white">На паузе</SelectItem>
            <SelectItem value="completed" className="text-white">Завершённые</SelectItem>
            <SelectItem value="error" className="text-white">С ошибками</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredAccounts.map((account) => {
          const modeConfig = warmingModes[account.warmingMode];
          const ModeIcon = modeConfig.icon;

          return (
            <Card key={account.id} className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2" style={{ borderColor: modeConfig.color }}>
                      <AvatarImage src={account.avatarUrl} />
                      <AvatarFallback className="bg-[#1E1F26] text-white">
                        {account.username.slice(1, 3).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-white text-base">{account.username}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: modeConfig.color, color: modeConfig.color }}
                        >
                          <ModeIcon className="w-3 h-3 mr-1" />
                          {modeConfig.name}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            account.status === 'warming' && 'border-[#00D26A] text-[#00D26A]',
                            account.status === 'paused' && 'border-[#FFB800] text-[#FFB800]',
                            account.status === 'completed' && 'border-[#6C63FF] text-[#6C63FF]',
                            account.status === 'error' && 'border-[#FF4D4D] text-[#FF4D4D]'
                          )}
                        >
                          {account.status === 'warming' && 'Прогрев'}
                          {account.status === 'paused' && 'Пауза'}
                          {account.status === 'completed' && 'Завершён'}
                          {account.status === 'error' && 'Ошибка'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    {account.status === 'warming' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePauseWarming(account)}
                        className="text-[#FFB800] hover:bg-[#FFB800]/10"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    )}
                    {account.status === 'paused' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResumeWarming(account)}
                        className="text-[#00D26A] hover:bg-[#00D26A]/10"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    {(account.status === 'completed' || account.status === 'error') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRestartWarming(account)}
                        className="text-[#6C63FF] hover:bg-[#6C63FF]/10"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedAccount(account)}
                      className="text-[#8A8A8A] hover:text-white"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8A8A8A]">Прогресс</span>
                    <span className="text-white font-medium">{account.progress}%</span>
                  </div>
                  <Progress
                    value={account.progress}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-[#8A8A8A]">
                    <span>Начало: {format(account.startedAt, 'd MMM', { locale: ru })}</span>
                    <span>
                      {account.status === 'completed'
                        ? 'Завершён'
                        : `Осталось: ${account.daysRemaining} дн.`}
                    </span>
                  </div>
                </div>

                {/* Daily Actions */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'comments', icon: MessageCircle, label: 'Коммент' },
                    { key: 'dm', icon: MessageCircle, label: 'DM' },
                    { key: 'follows', icon: UserPlus, label: 'Подписки' },
                    { key: 'likes', icon: Heart, label: 'Лайки' },
                  ].map(({ key, icon: Icon, label }) => (
                    <div key={key} className="text-center p-2 bg-[#1E1F26] rounded-lg">
                      <Icon className="w-4 h-4 mx-auto text-[#8A8A8A] mb-1" />
                      <p className="text-sm font-medium text-white">
                        {account.dailyActions[key as keyof typeof account.dailyActions]}
                        <span className="text-[#8A8A8A]">
                          /{account.maxActions[key as keyof typeof account.maxActions]}
                        </span>
                      </p>
                      <p className="text-xs text-[#8A8A8A]">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Alerts */}
                {account.alerts.length > 0 && (
                  <div className="space-y-2">
                    {account.alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg text-sm',
                          alert.type === 'warning' && 'bg-[#FFB800]/10 text-[#FFB800]',
                          alert.type === 'error' && 'bg-[#FF4D4D]/10 text-[#FF4D4D]',
                          alert.type === 'info' && 'bg-[#6C63FF]/10 text-[#6C63FF]'
                        )}
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate">{alert.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Account Detail Dialog */}
      <Dialog open={!!selectedAccount} onOpenChange={(open) => !open && setSelectedAccount(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#6C63FF]" />
              Настройки прогрева
            </DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              {selectedAccount?.username}
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-6 mt-4">
              {/* Warming Mode Selector */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-white">Режим прогрева</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(warmingModes).map(([key, mode]) => {
                    const Icon = mode.icon;
                    const isSelected = selectedAccount.warmingMode === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleChangeMode(selectedAccount, key as 'fast' | 'standard' | 'maximum' | 'premium')}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                          isSelected
                            ? 'border-[#6C63FF] bg-[#6C63FF]/10'
                            : 'border-[#2A2B32] hover:border-[#8A8A8A]'
                        )}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${mode.color}20` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: mode.color }} />
                        </div>
                        <div>
                          <p className="font-medium text-white">{mode.name}</p>
                          <p className="text-xs text-[#8A8A8A]">{mode.description}</p>
                          <p className="text-xs mt-1" style={{ color: mode.color }}>
                            {mode.duration} дней
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-[#2A2B32]" />

              {/* Activity Timeline */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#6C63FF]" />
                  Последняя активность
                </h3>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {selectedAccount.activity.length > 0 ? (
                      selectedAccount.activity.map((activity) => {
                        const Icon = activityIcons[activity.type] || Activity;
                        return (
                          <div
                            key={activity.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-[#1E1F26]"
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${activityColors[activity.type]}20` }}
                            >
                              <Icon className="w-4 h-4" style={{ color: activityColors[activity.type] }} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-white">
                                {activity.type === 'comment' && `Комментарий: ${activity.target}`}
                                {activity.type === 'dm' && `Сообщение: ${activity.target}`}
                                {activity.type === 'follow' && `Подписка: ${activity.target}`}
                                {activity.type === 'like' && `Лайк: ${activity.target}`}
                                {activity.type === 'view' && `Просмотр: ${activity.target}`}
                              </p>
                              <p className="text-xs text-[#8A8A8A]">
                                {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ru })}
                              </p>
                            </div>
                            {activity.success ? (
                              <CheckCircle className="w-4 h-4 text-[#00D26A]" />
                            ) : (
                              <XCircle className="w-4 h-4 text-[#FF4D4D]" />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-[#8A8A8A]">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Нет недавней активности</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <Separator className="bg-[#2A2B32]" />

              {/* Actions */}
              <div className="flex gap-3">
                {selectedAccount.status === 'warming' && (
                  <Button
                    onClick={() => {
                      handlePauseWarming(selectedAccount);
                      setSelectedAccount({ ...selectedAccount, status: 'paused' });
                    }}
                    className="flex-1 bg-[#FFB800] hover:bg-[#FFB800]/80 text-black"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Приостановить
                  </Button>
                )}
                {selectedAccount.status === 'paused' && (
                  <Button
                    onClick={() => {
                      handleResumeWarming(selectedAccount);
                      setSelectedAccount({ ...selectedAccount, status: 'warming' });
                    }}
                    className="flex-1 bg-[#00D26A] hover:bg-[#00D26A]/80"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Возобновить
                  </Button>
                )}
                <Button
                  onClick={() => {
                    handleRestartWarming(selectedAccount);
                    setSelectedAccount(null);
                  }}
                  variant="outline"
                  className="border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Перезапустить
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WarmingDashboard;

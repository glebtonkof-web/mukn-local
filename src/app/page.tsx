'use client';

import { useState, useEffect } from 'react';
import { useAppStore, Influencer } from '@/store';
import { Sidebar } from '@/components/dashboard/sidebar';
import { InfluencerGrid } from '@/components/influencer/influencer-card';
import { CreateInfluencerDialog } from '@/components/influencer/create-influencer-dialog';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { NotificationsSheet } from '@/components/notifications/notifications-sheet';
import { ContentCalendar } from '@/components/content/content-calendar';
import { OffersManager } from '@/components/offers/offers-manager';
import { WarmingDashboard } from '@/components/warming/warming-dashboard';
import { ShadowBanChecker } from '@/components/analytics/shadow-ban-checker';
import { BanRiskAnalytics } from '@/components/analytics/ban-risk-analytics';
import { ImageGeneratorDialog } from '@/components/content/image-generator-dialog';
import { VideoGeneratorPanel } from '@/components/video-generator/video-generator-panel';
import { AICommentsPanel } from '@/components/ai-comments/ai-comments-panel';
import {
  useInfluencers,
  useDashboardMetrics,
  useDashboardEvents,
  useDashboardChart,
  type DashboardMetrics,
} from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  TrendingUp,
  Activity,
  AlertTriangle,
  DollarSign,
  Users,
  MessageSquare,
  Image as ImageIcon,
  Video,
  FileText,
  Bell,
  Target,
  Globe,
  Smartphone,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Edit,
  Trash2,
  Play,
  Pause,
  BarChart3,
  Zap,
  Eye,
  RefreshCw,
  Download,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ==================== КОМПОНЕНТЫ ДАШБОРДА ====================

// Блок 1: Ключевые метрики
function MetricsBlock({ metrics, loading }: { metrics: DashboardMetrics | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-[#14151A] border-[#2A2B32] animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-[#2A2B32] rounded w-1/2 mb-4" />
              <div className="h-8 bg-[#2A2B32] rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getRiskColor = (risk: number) => {
    if (risk < 30) return '#00D26A';
    if (risk < 60) return '#FFB800';
    return '#FF4D4D';
  };

  const items = [
    {
      title: 'Активных инфлюенсеров',
      value: `${metrics?.activeInfluencers ?? 0} / ${metrics?.totalInfluencers ?? 0}`,
      icon: Users,
      color: '#6C63FF',
      bgColor: 'rgba(108, 99, 255, 0.1)',
    },
    {
      title: 'Всего подписчиков',
      value: (metrics?.totalSubscribers ?? 0).toLocaleString('ru-RU'),
      icon: Target,
      color: '#00D26A',
      bgColor: 'rgba(0, 210, 106, 0.1)',
    },
    {
      title: 'Доход за месяц',
      value: `${(metrics?.monthlyRevenue ?? 0).toLocaleString('ru-RU')} ₽`,
      icon: DollarSign,
      color: '#FFB800',
      bgColor: 'rgba(255, 184, 0, 0.1)',
    },
    {
      title: 'Средний риск бана',
      value: `${metrics?.avgBanRisk ?? 0}%`,
      icon: Shield,
      color: getRiskColor(metrics?.avgBanRisk ?? 0),
      bgColor: `${getRiskColor(metrics?.avgBanRisk ?? 0)}20`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#8A8A8A]">{item.title}</p>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: item.bgColor }}
                >
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{item.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Блок 2: Карточки инфлюенсеров (вынесено в отдельный компонент)
function InfluencersBlock({ influencers, loading }: { influencers: Influencer[]; loading: boolean }) {
  const { setCreateInfluencerOpen } = useAppStore();

  const nicheColors: Record<string, string> = {
    gambling: '#FF4D4D',
    crypto: '#FFB800',
    nutra: '#00D26A',
    bait: '#E4405F',
    lifestyle: '#6C63FF',
    finance: '#00D4AA',
    dating: '#FF6B9D',
    gaming: '#9D4EDD',
  };

  const nicheLabels: Record<string, string> = {
    gambling: 'Гемблинг',
    crypto: 'Крипта',
    nutra: 'Нутра',
    bait: 'Байт',
    lifestyle: 'Лайфстайл',
    finance: 'Финансы',
    dating: 'Дейтинг',
    gaming: 'Гейминг',
  };

  const getRiskColor = (risk: number) => {
    if (risk < 30) return '#00D26A';
    if (risk < 60) return '#FFB800';
    return '#FF4D4D';
  };

  if (loading) {
    return (
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white">Инфлюенсеры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[#1E1F26] rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6C63FF]" />
            Инфлюенсеры
          </CardTitle>
          <CardDescription className="text-[#8A8A8A]">
            Всего: {influencers.length} записей
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateInfluencerOpen(true)}
          className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать
        </Button>
      </CardHeader>
      <CardContent>
        {influencers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
            <p className="text-[#8A8A8A]">Нет созданных инфлюенсеров</p>
            <Button
              variant="outline"
              onClick={() => setCreateInfluencerOpen(true)}
              className="mt-4 border-[#6C63FF] text-[#6C63FF]"
            >
              Создать первого
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {influencers.slice(0, 8).map((influencer) => (
              <div
                key={influencer.id}
                className="p-4 rounded-lg bg-[#1E1F26] hover:bg-[#2A2B32] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-10 h-10 border-2" style={{ borderColor: nicheColors[influencer.niche] || '#6C63FF' }}>
                    <AvatarImage src={influencer.avatarUrl} />
                    <AvatarFallback className="bg-[#6C63FF] text-white">
                      {influencer.name?.slice(0, 2)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{influencer.name || 'Без имени'}</p>
                    <p className="text-xs text-[#8A8A8A] truncate">
                      {nicheLabels[influencer.niche] || influencer.niche}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8A8A8A]">
                    {(influencer.subscribersCount ?? 0).toLocaleString('ru-RU')} подп.
                  </span>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getRiskColor(influencer.banRisk ?? 0) }}
                    />
                    <span style={{ color: getRiskColor(influencer.banRisk ?? 0) }}>
                      {influencer.banRisk ?? 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Блок 3: График активности
function ChartBlock({ days, metric }: { days: number; metric: 'subscribers' | 'revenue' | 'leads' }) {
  const { chartData, summary, loading } = useDashboardChart(days, metric);

  const metricLabels: Record<string, string> = {
    subscribers: 'Подписчики',
    revenue: 'Доход',
    leads: 'Лиды',
  };

  const maxValue = chartData.length > 0
    ? Math.max(...chartData.map(d => d.value), 1)
    : 1;

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#6C63FF]" />
          Динамика {metricLabels[metric]}
        </CardTitle>
        <CardDescription>
          За последние {days} дней
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
          </div>
        ) : chartData.length === 0 || chartData.every(d => d.value === 0) ? (
          <div className="h-[200px] flex items-center justify-center text-[#8A8A8A]">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto opacity-50 mb-2" />
              <p>Нет данных для отображения</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-[200px] flex items-end gap-2">
              {chartData.map((point, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-[#6C63FF] to-[#00D26A] rounded-t-sm transition-all hover:opacity-80"
                    style={{ height: `${(point.value / maxValue) * 100}%`, minHeight: point.value > 0 ? '4px' : '0' }}
                    title={`${point.label}: ${point.value.toLocaleString('ru-RU')}`}
                  />
                  {i % Math.ceil(chartData.length / 7) === 0 && (
                    <span className="text-xs text-[#8A8A8A] truncate w-full text-center">
                      {point.label.split(' ')[0]}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {summary && (
              <div className="flex justify-between mt-4 text-sm text-[#8A8A8A]">
                <span>Всего: <span className="text-[#00D26A]">{summary.total.toLocaleString('ru-RU')}</span></span>
                <span>
                  {typeof summary.change === 'number' && summary.change > 0 ? (
                    <span className="text-[#00D26A]">+{summary.change}%</span>
                  ) : (
                    <span className="text-[#FF4D4D]">{summary.change}%</span>
                  )}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Блок 4: Лента событий
function EventsBlock() {
  const { events, loading } = useDashboardEvents(10);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-[#FFB800]/20 text-[#FFB800]';
      case 'error': return 'bg-[#FF4D4D]/20 text-[#FF4D4D]';
      case 'success': return 'bg-[#00D26A]/20 text-[#00D26A]';
      default: return 'bg-[#6C63FF]/20 text-[#6C63FF]';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return `${days} дн назад`;
  };

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#FFB800]" />
          Последние события
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#1E1F26] animate-pulse">
                <div className="w-8 h-8 rounded-full bg-[#2A2B32]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#2A2B32] rounded w-1/2" />
                  <div className="h-3 bg-[#2A2B32] rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-[#8A8A8A]">
            <Bell className="w-12 h-12 mx-auto opacity-50 mb-2" />
            <p>Нет событий</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[#1E1F26] hover:bg-[#2A2B32] transition-colors"
                >
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', getEventColor(event.type))}>
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{event.title}</p>
                    <p className="text-xs text-[#8A8A8A] mt-1 line-clamp-2">{event.message}</p>
                    <p className="text-xs text-[#8A8A8A] mt-1">{formatTime(event.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== КОМПОНЕНТ ДЕТАЛЬНОЙ КАРТОЧКИ ====================

function InfluencerDetailDialog({
  influencer,
  open,
  onOpenChange,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  influencer: Influencer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  onDelete?: () => void;
}) {
  if (!influencer) return null;

  const nicheColors: Record<string, string> = {
    gambling: '#FF4D4D',
    crypto: '#FFB800',
    nutra: '#00D26A',
    bait: '#E4405F',
    lifestyle: '#6C63FF',
    finance: '#00D4AA',
    dating: '#FF6B9D',
    gaming: '#9D4EDD',
  };

  const nicheLabels: Record<string, string> = {
    gambling: 'Гемблинг',
    crypto: 'Крипта',
    nutra: 'Нутра',
    bait: 'Байт',
    lifestyle: 'Лайфстайл',
    finance: 'Финансы',
    dating: 'Дейтинг',
    gaming: 'Гейминг',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Черновик',
    warming: 'Прогрев',
    active: 'Активен',
    paused: 'Пауза',
    banned: 'Забанен',
  };

  const getRiskColor = (risk: number) => {
    if (risk < 30) return '#00D26A';
    if (risk < 60) return '#FFB800';
    return '#FF4D4D';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#14151A] border-[#2A2B32] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-[#6C63FF]">
              <AvatarImage src={influencer.avatarUrl} alt={influencer.name} />
              <AvatarFallback className="bg-[#6C63FF] text-white text-lg">
                {influencer.name?.slice(0, 2)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white">{influencer.name || 'Без имени'}</p>
              <p className="text-sm text-[#8A8A8A] font-normal">{influencer.role || 'Роль не указана'}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="text-sm"
              style={{ borderColor: nicheColors[influencer.niche] || '#6C63FF', color: nicheColors[influencer.niche] || '#6C63FF' }}
            >
              {nicheLabels[influencer.niche] || influencer.niche}
            </Badge>
            <Badge
              variant="outline"
              className="text-sm text-white"
              style={{ backgroundColor: getRiskColor(influencer.banRisk ?? 0) + '20', borderColor: getRiskColor(influencer.banRisk ?? 0) }}
            >
              {statusLabels[influencer.status] || influencer.status}
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-[#1E1F26] rounded-lg">
              <p className="text-2xl font-bold text-white">{(influencer.subscribersCount ?? 0).toLocaleString('ru-RU')}</p>
              <p className="text-xs text-[#8A8A8A] mt-1">Подписчиков</p>
            </div>
            <div className="text-center p-3 bg-[#1E1F26] rounded-lg">
              <p className="text-2xl font-bold text-white">{influencer.leadsCount ?? 0}</p>
              <p className="text-xs text-[#8A8A8A] mt-1">Лидов</p>
            </div>
            <div className="text-center p-3 bg-[#1E1F26] rounded-lg">
              <p className="text-2xl font-bold text-[#00D26A]">{(influencer.revenue ?? 0).toLocaleString('ru-RU')} ₽</p>
              <p className="text-xs text-[#8A8A8A] mt-1">Доход</p>
            </div>
            <div className="text-center p-3 bg-[#1E1F26] rounded-lg">
              <p className="text-2xl font-bold" style={{ color: getRiskColor(influencer.banRisk ?? 0) }}>
                {influencer.banRisk ?? 0}%
              </p>
              <p className="text-xs text-[#8A8A8A] mt-1">Риск бана</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#8A8A8A]">Риск бана</span>
              <span style={{ color: getRiskColor(influencer.banRisk ?? 0) }}>{influencer.banRisk ?? 0}%</span>
            </div>
            <Progress value={influencer.banRisk ?? 0} className="h-2" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Социальные сети</p>
            <div className="flex flex-wrap gap-2">
              {influencer.telegramUsername && (
                <Badge className="bg-[#0088cc] hover:bg-[#0088cc]/80 text-white">
                  Telegram: {influencer.telegramUsername}
                </Badge>
              )}
              {influencer.instagramUsername && (
                <Badge className="bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#dc2743] text-white">
                  Instagram: {influencer.instagramUsername}
                </Badge>
              )}
              {influencer.tiktokUsername && (
                <Badge className="bg-black text-white border border-white/20">
                  TikTok: {influencer.tiktokUsername}
                </Badge>
              )}
              {!influencer.telegramUsername && !influencer.instagramUsername && !influencer.tiktokUsername && (
                <span className="text-sm text-[#8A8A8A]">Не привязаны</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Стиль общения</p>
            <p className="text-sm text-[#8A8A8A] bg-[#1E1F26] p-3 rounded-lg">
              {influencer.style || 'Не указан'}
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#2A2B32]">
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex-1 border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
            >
              <Edit className="w-4 h-4 mr-2" />
              Редактировать
            </Button>
            <Button
              variant="outline"
              onClick={onToggleStatus}
              className="flex-1 border-[#FFB800] text-[#FFB800] hover:bg-[#FFB800]/10"
            >
              {influencer.status === 'active' ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Приостановить
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Активировать
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onDelete}
              className="border-[#FF4D4D] text-[#FF4D4D] hover:bg-[#FF4D4D]/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== ПРЕДСТАВЛЕНИЯ ====================

// Компонент Dashboard
function DashboardView() {
  const { setCreateInfluencerOpen } = useAppStore();
  const { metrics, loading: metricsLoading, refetch: refetchMetrics } = useDashboardMetrics();
  const { influencers, loading: influencersLoading } = useInfluencers();
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(7);
  const [chartMetric, setChartMetric] = useState<'subscribers' | 'revenue' | 'leads'>('subscribers');

  return (
    <div className="space-y-6">
      {/* Заголовок с кнопками */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Дашборд</h1>
          <p className="text-[#8A8A8A]">Обзор активности всех AI-инфлюенсеров</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetchMetrics()}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          <Button
            onClick={() => setCreateInfluencerOpen(true)}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать инфлюенсера
          </Button>
        </div>
      </div>

      {/* Блок 1: Ключевые метрики */}
      <MetricsBlock metrics={metrics} loading={metricsLoading} />

      {/* Блок 2: Инфлюенсеры */}
      <InfluencersBlock influencers={influencers} loading={influencersLoading} />

      {/* Блок 3 и 4: График и события */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Переключатели периода и метрики */}
          <div className="flex gap-2">
            {[7, 14, 30].map((days) => (
              <Button
                key={days}
                variant={chartDays === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartDays(days as 7 | 14 | 30)}
                className={chartDays === days ? 'bg-[#6C63FF]' : 'border-[#2A2B32] text-[#8A8A8A]'}
              >
                {days} дн
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            {[
              { value: 'subscribers', label: 'Подписчики' },
              { value: 'revenue', label: 'Доход' },
              { value: 'leads', label: 'Лиды' },
            ].map((m) => (
              <Button
                key={m.value}
                variant={chartMetric === m.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartMetric(m.value as 'subscribers' | 'revenue' | 'leads')}
                className={chartMetric === m.value ? 'bg-[#6C63FF]' : 'border-[#2A2B32] text-[#8A8A8A]'}
              >
                {m.label}
              </Button>
            ))}
          </div>
          <ChartBlock days={chartDays} metric={chartMetric} />
        </div>
        <EventsBlock />
      </div>
    </div>
  );
}

// Компонент Influencers View
function InfluencersView() {
  const { setCreateInfluencerOpen, setEditingInfluencer, influencers, updateInfluencer, removeInfluencer } = useAppStore();
  const { loading } = useInfluencers();
  const [filter, setFilter] = useState<string>('all');
  const [selectedForDetail, setSelectedForDetail] = useState<Influencer | null>(null);

  const filteredInfluencers = filter === 'all'
    ? influencers
    : influencers.filter((i) => i.status === filter || i.niche === filter);

  const handleToggleStatus = (influencer: Influencer) => {
    const newStatus = influencer.status === 'active' ? 'paused' : 'active';
    updateInfluencer(influencer.id, { status: newStatus });
    toast.success(`Статус изменён на "${newStatus === 'active' ? 'Активен' : 'Пауза'}"`);
    setSelectedForDetail({ ...influencer, status: newStatus });
  };

  const handleEdit = (influencer: Influencer) => {
    setSelectedForDetail(null); // Close detail dialog
    setEditingInfluencer(influencer); // Set influencer for editing
    setCreateInfluencerOpen(true); // Open create/edit dialog
  };

  const handleDelete = (influencer: Influencer) => {
    removeInfluencer(influencer.id);
    setSelectedForDetail(null);
    toast.success(`Инфлюенсер "${influencer.name}" удалён`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI-Инфлюенсеры</h1>
          <p className="text-[#8A8A8A]">Управление виртуальными персонажами</p>
        </div>
        <Button
          onClick={() => setCreateInfluencerOpen(true)}
          className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать инфлюенсера
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-[#1E1F26] rounded-lg p-1">
          {[
            { id: 'all', label: 'Все' },
            { id: 'active', label: 'Активные' },
            { id: 'warming', label: 'Прогрев' },
            { id: 'paused', label: 'Пауза' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                filter === f.id
                  ? 'bg-[#6C63FF] text-white'
                  : 'text-[#8A8A8A] hover:text-white'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
        </div>
      ) : filteredInfluencers.length > 0 ? (
        <InfluencerGrid
          influencers={filteredInfluencers}
          onSelect={(inf) => setSelectedForDetail(inf)}
          onEdit={(inf) => handleEdit(inf)}
          onToggleStatus={(inf) => handleToggleStatus(inf)}
          onDelete={(inf) => handleDelete(inf)}
        />
      ) : (
        <Card className="bg-[#14151A] border-[#2A2B32] p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-[#8A8A8A] mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Нет инфлюенсеров</h3>
          <p className="text-[#8A8A8A] mb-6">Создайте первого AI-инфлюенсера для начала работы</p>
          <Button
            onClick={() => setCreateInfluencerOpen(true)}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать инфлюенсера
          </Button>
        </Card>
      )}

      <InfluencerDetailDialog
        influencer={selectedForDetail}
        open={!!selectedForDetail}
        onOpenChange={(open) => !open && setSelectedForDetail(null)}
        onEdit={() => selectedForDetail && handleEdit(selectedForDetail)}
        onToggleStatus={() => selectedForDetail && handleToggleStatus(selectedForDetail)}
        onDelete={() => selectedForDetail && handleDelete(selectedForDetail)}
      />
    </div>
  );
}

// Компонент Content View
function ContentView() {
  const { imageGeneratorOpen, setImageGeneratorOpen, influencers } = useAppStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Контент</h1>
          <p className="text-[#8A8A8A]">Генерация и планирование публикаций</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImageGeneratorOpen(true)}
            className="border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
          >
            <Zap className="w-4 h-4 mr-2" />
            AI Генератор
          </Button>
          <Button className="bg-[#6C63FF] hover:bg-[#6C63FF]/80">
            <Plus className="w-4 h-4 mr-2" />
            Создать пост
          </Button>
        </div>
      </div>

      <ContentCalendar />

      <ImageGeneratorDialog
        open={imageGeneratorOpen}
        onOpenChange={setImageGeneratorOpen}
        influencers={influencers}
      />
    </div>
  );
}

// Компонент Monetization View
function MonetizationView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Монетизация</h1>
          <p className="text-[#8A8A8A]">Управление доходами и офферами</p>
        </div>
      </div>

      <OffersManager />
    </div>
  );
}

// Компонент Infrastructure View
function InfrastructureView() {
  const { metrics, loading } = useDashboardMetrics();

  const stats = [
    { icon: Smartphone, label: 'SIM-карты', value: metrics?.totalSimCards ?? 0, max: 100, color: '#6C63FF' },
    { icon: Users, label: 'Аккаунты', value: metrics?.totalAccounts ?? 0, max: 100, color: '#00D26A' },
    { icon: Globe, label: 'Прокси', value: 0, max: 100, color: '#FFB800' },
    { icon: Shield, label: 'API ключи', value: 0, max: 10, color: '#00B4D8' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Инфраструктура</h1>
          <p className="text-[#8A8A8A]">SIM-карты, аккаунты, прогрев, прокси</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A]">
                  {stat.value}/{stat.max}
                </Badge>
              </div>
              <p className="text-xl font-bold text-white">{stat.label}</p>
              <Progress value={(stat.value / stat.max) * 100} className="h-2 mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>

      <WarmingDashboard />
    </div>
  );
}

// Компонент Analytics View
function AnalyticsView() {
  const [activeTab, setActiveTab] = useState('risk');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Аналитика</h1>
          <p className="text-[#8A8A8A]">Детальная статистика и прогнозы</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="risk" className="data-[state=active]:bg-[#6C63FF]">
            <Shield className="w-4 h-4 mr-2" />
            Риск банов
          </TabsTrigger>
          <TabsTrigger value="shadowban" className="data-[state=active]:bg-[#6C63FF]">
            <Eye className="w-4 h-4 mr-2" />
            Shadow Ban
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-[#6C63FF]">
            <BarChart3 className="w-4 h-4 mr-2" />
            Эффективность
          </TabsTrigger>
        </TabsList>

        <TabsContent value="risk" className="mt-6">
          <BanRiskAnalytics />
        </TabsContent>

        <TabsContent value="shadowban" className="mt-6">
          <ShadowBanChecker />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white">Эффективность кампаний</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
              <p className="text-[#8A8A8A]">Выберите кампанию для анализа</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Компонент Calendar View
function CalendarView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Календарь публикаций</h1>
          <p className="text-[#8A8A8A]">Планирование и управление контентом</p>
        </div>
      </div>
      <ContentCalendar />
    </div>
  );
}

// Компонент Warming View
function WarmingView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Прогрев аккаунтов</h1>
          <p className="text-[#8A8A8A]">Автоматический прогрев для безопасного старта</p>
        </div>
      </div>
      <WarmingDashboard />
    </div>
  );
}

// Компонент Video Generator View
function VideoGeneratorView() {
  return (
    <div className="space-y-6">
      <VideoGeneratorPanel />
    </div>
  );
}

// Компонент Shadow Ban View
function ShadowBanView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shadow Ban детектор</h1>
          <p className="text-[#8A8A8A]">Проверка видимости аккаунтов</p>
        </div>
      </div>
      <ShadowBanChecker />
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export default function MUKNTrafficApp() {
  const { activeTab } = useAppStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'influencers':
        return <InfluencersView />;
      case 'content':
        return <ContentView />;
      case 'calendar':
        return <CalendarView />;
      case 'monetization':
        return <MonetizationView />;
      case 'warming':
        return <WarmingView />;
      case 'video-generator':
        return <VideoGeneratorView />;
      case 'ai-comments':
        return <AICommentsPanel />;
      case 'infrastructure':
        return <InfrastructureView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'shadowban':
        return <ShadowBanView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0B0E]">
      <Sidebar
        unreadNotifications={0}
        onNotificationsClick={() => setNotificationsOpen(true)}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
      <CreateInfluencerDialog />
      <SettingsDialog />
      <NotificationsSheet
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
    </div>
  );
}

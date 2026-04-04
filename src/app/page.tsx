'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppStore, Campaign, Account, ActivityItem } from '@/store';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TrafficView } from '@/components/views/traffic-view';
import { AdvancedView } from '@/components/views/advanced-view';
import { AICommentsView } from '@/components/views/ai-comments-view';
import { MonetizationView } from '@/components/views/monetization-view';
import { OFMView } from '@/components/views/ofm-view';
import { ProxiesView, SimCardsView } from '@/components/views/infrastructure-view';
import { ContentView } from '@/components/views/content-view';
import { VideoGeneratorView } from '@/components/views/video-generator-view';
import { OffersView } from '@/components/views/offers-view';
import { InfluencersView } from '@/components/views/influencers-view';
import { WarmingViewEnhanced } from '@/components/views/warming-view-enhanced';
import { ShadowBanView } from '@/components/views/shadow-ban-view';
import { AIPoolView } from '@/components/views/ai-pool-view';
import { SettingsView } from '@/components/views/settings-view';
import { HunyuanView } from '@/components/views/hunyuan-view';
import { AnalyticsView } from '@/components/views/analytics-view';
import { InstagramWarmingView } from '@/components/views/instagram-warming-view';
import { TrafficPourView } from '@/components/views/traffic-pour-view';
import { AntidetectView } from '@/components/views/antidetect-view';
import { AIAssistantPanel } from '@/components/ai-assistant/ai-panel';
import { ModeSwitcher } from '@/components/mode-switcher/index';
import { OnboardingTour } from '@/components/onboarding/onboarding-tour';
import { BeginnerHints } from '@/components/onboarding/beginner-hints';
import { TerminalMode } from '@/components/terminal/terminal-mode';
import { useHotkeys, HotkeysHelp, HotkeysHelpDialog } from '@/components/hotkeys/use-hotkeys';
import { useModeStore } from '@/store/mode-store';
import { MobileMenu, MobileHeader } from '@/components/ui/mobile-menu';
import { NotificationsSheet } from '@/components/notifications/notifications-sheet';
import { AIProvidersSettings } from '@/components/settings/ai-providers-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  MessageSquare,
  Play,
  Pause,
  BarChart3,
  Zap,
  Eye,
  RefreshCw,
  Download,
  Settings,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Rocket,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  FileUp,
  Sparkles,
  Thermometer,
  Gauge,
  Key,
  Bell,
  Bot,
  Palette,
  Moon,
  Sun,
  Contrast,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ==================== УТИЛИТЫ ====================

const formatTime = (timestamp: Date | string) => {
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

const getRiskColor = (risk: number) => {
  if (risk < 30) return '#00D26A';
  if (risk < 70) return '#FFB800';
  return '#FF4D4D';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-[#00D26A]';
    case 'paused': return 'bg-[#FFB800]';
    case 'error': return 'bg-[#FF4D4D]';
    case 'new': return 'bg-[#8A8A8A]';
    case 'limit': return 'bg-[#FFB800]';
    case 'banned': return 'bg-[#FF4D4D]';
    default: return 'bg-[#8A8A8A]';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Активна';
    case 'paused': return 'Пауза';
    case 'error': return 'Ошибка';
    case 'new': return 'Новый';
    case 'limit': return 'Лимит';
    case 'banned': return 'Забанен';
    default: return status;
  }
};

const getOfferTypeLabel = (type: string) => {
  switch (type) {
    case 'casino': return 'Казино';
    case 'crypto': return 'Крипта';
    case 'dating': return 'Дейтинг';
    case 'nutra': return 'Нутра';
    default: return type;
  }
};

// ==================== ТИПЫ ДЛЯ API ====================

interface KPIMetric {
  title: string;
  value: string;
  change?: number;
  icon: string;
  color: string;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: Date | string;
  campaignId?: string;
  accountId?: string;
}

interface ChartDataPoint {
  date: string;
  revenue: number;
  comments: number;
}

// ==================== КОМПОНЕНТ ДАШБОРДА (ГЛАВНАЯ) ====================

function DashboardView() {
  const { setCampaigns, setAccounts } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [kpiData, setKpiData] = useState<KPIMetric[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Загрузка данных через API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Параллельная загрузка всех данных
      const [kpiRes, activitiesRes, campaignsRes, accountsRes, revenueRes] = await Promise.all([
        fetch('/api/dashboard/kpi'),
        fetch('/api/dashboard/activities?limit=20'),
        fetch('/api/campaigns'),
        fetch('/api/accounts'),
        fetch('/api/analytics/revenue?days=7'),
      ]);

      if (!kpiRes.ok) throw new Error('Ошибка загрузки KPI');
      if (!activitiesRes.ok) throw new Error('Ошибка загрузки активностей');
      if (!campaignsRes.ok) throw new Error('Ошибка загрузки кампаний');
      if (!accountsRes.ok) throw new Error('Ошибка загрузки аккаунтов');
      if (!revenueRes.ok) throw new Error('Ошибка загрузки аналитики');

      const kpiJson = await kpiRes.json();
      const activitiesJson = await activitiesRes.json();
      const campaignsJson = await campaignsRes.json();
      const accountsJson = await accountsRes.json();
      const revenueJson = await revenueRes.json();

      // Устанавливаем KPI данные
      if (kpiJson.kpi) {
        setKpiData(kpiJson.kpi);
      }

      // Устанавливаем активности
      if (activitiesJson.activities) {
        setActivities(activitiesJson.activities);
      }

      // Устанавливаем кампании в стор
      if (campaignsJson.campaigns) {
        setCampaigns(campaignsJson.campaigns);
      }

      // Устанавливаем аккаунты в стор
      if (accountsJson.accounts) {
        setAccounts(accountsJson.accounts);
      }

      // Устанавливаем данные для графика
      if (revenueJson.chartData) {
        setChartData(revenueJson.chartData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      toast.error('Ошибка загрузки данных дашборда');
    } finally {
      setLoading(false);
    }
  }, [setCampaigns, setAccounts]);

  // Загрузка при монтировании
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageSquare className="w-4 h-4" />;
      case 'ban': return <XCircle className="w-4 h-4" />;
      case 'join': return <Users className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'limit': return <Shield className="w-4 h-4" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'info': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'comment': return 'bg-[#6C63FF]/20 text-[#6C63FF]';
      case 'ban': return 'bg-[#FF4D4D]/20 text-[#FF4D4D]';
      case 'join': return 'bg-[#00D26A]/20 text-[#00D26A]';
      case 'warning': return 'bg-[#FFB800]/20 text-[#FFB800]';
      case 'limit': return 'bg-[#FFB800]/20 text-[#FFB800]';
      case 'success': return 'bg-[#00D26A]/20 text-[#00D26A]';
      case 'info': return 'bg-[#6C63FF]/20 text-[#6C63FF]';
      default: return 'bg-[#8A8A8A]/20 text-[#8A8A8A]';
    }
  };

  // Пауза всех кампаний
  const handlePauseAll = async () => {
    try {
      const res = await fetch('/api/campaigns/pause-all', { method: 'POST' });
      if (!res.ok) throw new Error('Ошибка приостановки кампаний');
      const data = await res.json();
      toast.success(data.message || `Приостановлено ${data.pausedCount} кампаний`);
      fetchData(); // Перезагрузка данных
    } catch (err) {
      console.error('Error pausing campaigns:', err);
      toast.error('Не удалось приостановить кампании');
    }
  };

  // Проверка здоровья всех аккаунтов
  const handleHealthCheck = async () => {
    try {
      toast.info('Проверка всех аккаунтов запущена...');
      const res = await fetch('/api/health/check-all', { method: 'POST' });
      if (!res.ok) throw new Error('Ошибка проверки аккаунтов');
      const data = await res.json();
      if (data.results) {
        toast.success(
          `Проверка завершена: ${data.results.healthy} OK, ${data.results.warnings} предупреждений, ${data.results.errors} ошибок`
        );
      }
    } catch (err) {
      console.error('Error checking health:', err);
      toast.error('Не удалось проверить аккаунты');
    }
  };

  // Экспорт отчёта
  const handleExportReport = async () => {
    try {
      toast.info('Формирование отчёта...');
      const res = await fetch('/api/reports/export/excel?type=dashboard');
      if (!res.ok) throw new Error('Ошибка экспорта отчёта');
      
      // Получаем blob и скачиваем файл
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mukn-report-dashboard-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Отчёт скачан');
    } catch (err) {
      console.error('Error exporting report:', err);
      toast.error('Не удалось экспортировать отчёт');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="w-12 h-12 text-[#FF4D4D]" />
        <p className="text-[#FF4D4D]">{error}</p>
        <Button onClick={fetchData} variant="outline" className="border-[#2A2B32] text-[#8A8A8A] hover:text-white">
          <RefreshCw className="w-4 h-4 mr-2" />
          Попробовать снова
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Главная</h1>
          <p className="text-[#8A8A8A]">Обзор активности и ключевые метрики</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Обновить
          </Button>
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#8A8A8A]">{kpi.title}</p>
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  kpi.color === 'green' ? 'bg-[#00D26A]/20' : kpi.color === 'red' ? 'bg-[#FF4D4D]/20' : 'bg-[#6C63FF]/20'
                )}>
                  {kpi.icon === 'dollar' && <DollarSign className="w-5 h-5" style={{ color: kpi.color === 'green' ? '#00D26A' : kpi.color === 'red' ? '#FF4D4D' : '#6C63FF' }} />}
                  {kpi.icon === 'users' && <Users className="w-5 h-5" style={{ color: kpi.color === 'green' ? '#00D26A' : kpi.color === 'red' ? '#FF4D4D' : '#6C63FF' }} />}
                  {kpi.icon === 'message' && <MessageSquare className="w-5 h-5" style={{ color: kpi.color === 'green' ? '#00D26A' : kpi.color === 'red' ? '#FF4D4D' : '#6C63FF' }} />}
                  {kpi.icon === 'trending' && <TrendingUp className="w-5 h-5" style={{ color: kpi.color === 'green' ? '#00D26A' : kpi.color === 'red' ? '#FF4D4D' : '#6C63FF' }} />}
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              {kpi.change !== undefined && (
                <div className={cn('flex items-center gap-1 mt-2 text-sm', kpi.change >= 0 ? 'text-[#00D26A]' : 'text-[#FF4D4D]')}>
                  {kpi.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* График и лента активности */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* График дохода */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#6C63FF]" />
                Доход за 7 дней
              </CardTitle>
              <CardDescription className="text-[#8A8A8A]">Динамика по дням</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
                className={chartType === 'line' ? 'bg-[#6C63FF]' : 'border-[#2A2B32] text-[#8A8A8A]'}
              >
                Линия
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
                className={chartType === 'bar' ? 'bg-[#6C63FF]' : 'border-[#2A2B32] text-[#8A8A8A]'}
              >
                Столбцы
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportReport}
                className="border-[#2A2B32] text-[#8A8A8A]"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2B32" />
                      <XAxis dataKey="date" stroke="#8A8A8A" />
                      <YAxis stroke="#8A8A8A" />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#14151A', border: '1px solid #2A2B32', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#6C63FF" strokeWidth={2} dot={{ fill: '#6C63FF' }} name="Доход (₽)" />
                    </LineChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2B32" />
                      <XAxis dataKey="date" stroke="#8A8A8A" />
                      <YAxis stroke="#8A8A8A" />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#14151A', border: '1px solid #2A2B32', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#6C63FF" name="Доход (₽)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[#8A8A8A]">
                  Нет данных для отображения
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Лента активности */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#FFB800]" />
              Лента активности
            </CardTitle>
            <CardDescription className="text-[#8A8A8A]">Последние 20 событий</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-[#1E1F26] hover:bg-[#2A2B32] transition-colors"
                    >
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', getActivityColor(activity.type))}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{activity.message}</p>
                        <p className="text-xs text-[#8A8A8A] mt-1">{formatTime(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-[#8A8A8A]">
                  Нет недавней активности
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Быстрые действия */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FFB800]" />
            Быстрые действия
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={() => useAppStore.getState().setCampaignModalOpen(true)}
              className="h-20 flex flex-col bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              <Plus className="w-6 h-6 mb-2" />
              Запустить кампанию
            </Button>
            <Button
              variant="outline"
              onClick={handlePauseAll}
              className="h-20 flex flex-col border-[#FFB800] text-[#FFB800] hover:bg-[#FFB800]/10"
            >
              <Pause className="w-6 h-6 mb-2" />
              Пауза всего
            </Button>
            <Button
              variant="outline"
              onClick={handleExportReport}
              className="h-20 flex flex-col border-[#00D26A] text-[#00D26A] hover:bg-[#00D26A]/10"
            >
              <Download className="w-6 h-6 mb-2" />
              Отчёт за сегодня
            </Button>
            <Button
              variant="outline"
              onClick={handleHealthCheck}
              className="h-20 flex flex-col border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
            >
              <Eye className="w-6 h-6 mb-2" />
              Проверить всё
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== КОМПОНЕНТ КАМПАНИЙ ====================

interface CampaignFromAPI {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  niche?: string | null;
  geo?: string | null;
  status: string;
  budget: number;
  spent: number;
  revenue: number;
  leadsCount: number;
  conversions: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  influencers?: Array<{ influencerId: string; role: string }>;
  offers?: Array<{ offerId: string; isPrimary: boolean }>;
}

function CampaignsView() {
  const { campaignModalOpen, setCampaignModalOpen } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignFromAPI[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<CampaignFromAPI | null>(null);
  const [modalTab, setModalTab] = useState('offer');
  const [editingCampaign, setEditingCampaign] = useState<CampaignFromAPI | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Default form data
  const defaultFormData = {
    name: '',
    type: 'crypto',
    niche: '',
    geo: '',
    status: 'draft',
    budget: 0,
    description: '',
  startDate: '',
    endDate: '',
  influencerIds: [] as string[],
    offerIds: [] as string[],
  };

  // Форма создания/редактирования
  const [formData, setFormData] = useState(defaultFormData);

  // Загрузка кампаний через API
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns');
      if (!res.ok) throw new Error('Ошибка загрузки кампаний');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки кампаний');
      toast.error('Ошибка загрузки кампаний');
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка при монтировании
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const handleOpenModal = (campaign?: CampaignFromAPI) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name,
        type: campaign.type,
        niche: campaign.niche || '',
        geo: campaign.geo || '',
        status: campaign.status,
        budget: campaign.budget,
        description: campaign.description || '',
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
        influencerIds: campaign.influencers?.map(i => i.influencerId) || [],
        offerIds: campaign.offers?.map(o => o.offerId) || [],
      });
    } else {
      setEditingCampaign(null);
      setFormData(defaultFormData);
    }
    setModalTab('offer');
    setCampaignModalOpen(true);
  };

  const handleCloseModal = () => {
    setCampaignModalOpen(false);
    setEditingCampaign(null);
    setFormData(defaultFormData);
  };

  // Создание/обновление кампании
  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Введите название кампании');
      return;
    }

    if (!formData.type) {
      toast.error('Выберите тип кампании');
      return;
    }

    setActionLoading('save');
    try {
      if (editingCampaign) {
        // Обновление через PUT
        const res = await fetch('/api/campaigns', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCampaign.id,
            ...formData,
            startDate: formData.startDate ? new Date(formData.startDate) : undefined,
            endDate: formData.endDate ? new Date(formData.endDate) : undefined,
          }),
        });
        if (!res.ok) throw new Error('Ошибка обновления кампании');
        toast.success('Кампания обновлена');
      } else {
        // Создание через POST
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            startDate: formData.startDate ? new Date(formData.startDate) : undefined,
            endDate: formData.endDate ? new Date(formData.endDate) : undefined,
            userId: 'default-user', // TODO: получить из auth
          }),
        });
        if (!res.ok) throw new Error('Ошибка создания кампании');
        toast.success('Кампания создана');
      }
      handleCloseModal();
      fetchCampaigns();
    } catch (err) {
      console.error('Error saving campaign:', err);
      toast.error('Не удалось сохранить кампанию');
    } finally {
      setActionLoading(null);
    }
  };

  // Удаление кампании
  const handleDelete = async () => {
    if (!campaignToDelete) return;
    
    setActionLoading('delete');
    try {
      const res = await fetch(`/api/campaigns?id=${campaignToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Ошибка удаления кампании');
      toast.success('Кампания удалена');
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
      fetchCampaigns();
    } catch (err) {
      console.error('Error deleting campaign:', err);
      toast.error('Не удалось удалить кампанию');
    } finally {
      setActionLoading(null);
    }
  };

  // Переключение статуса (пауза/запуск)
  const handleToggleStatus = async (campaign: CampaignFromAPI) => {
    const action = campaign.status === 'active' ? 'pause' : 'resume';
    setActionLoading(campaign.id);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/${action}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Ошибка ${action === 'pause' ? 'приостановки' : 'запуска'} кампании`);
      toast.success(`Кампания ${action === 'pause' ? 'приостановлена' : 'запущена'}`);
      fetchCampaigns();
    } catch (err) {
      console.error('Error toggling campaign status:', err);
      toast.error('Не удалось изменить статус кампании');
    } finally {
      setActionLoading(null);
    }
  };

  // Дублирование кампании
  const handleDuplicate = async (campaign: CampaignFromAPI) => {
    setActionLoading(`dup-${campaign.id}`);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/duplicate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Ошибка дублирования кампании');
      toast.success('Кампания скопирована');
      fetchCampaigns();
    } catch (err) {
      console.error('Error duplicating campaign:', err);
      toast.error('Не удалось скопировать кампанию');
    } finally {
      setActionLoading(null);
    }
  };

  // AI анализ
  const handleAIAnalysis = async () => {
    if (campaigns.length === 0) {
      toast.error('Нет кампаний для анализа');
      return;
    }
    
    setActionLoading('ai-analysis');
    try {
      // Анализируем первую активную кампанию (или первую в списке)
      const campaignToAnalyze = campaigns.find(c => c.status === 'active') || campaigns[0];
      
      const res = await fetch('/api/ai/analyze-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaignToAnalyze.id,
          userId: 'default-user', // TODO: получить из auth
          analysisType: 'full_analysis',
        }),
      });
      
      if (!res.ok) throw new Error('Ошибка AI анализа');
      const data = await res.json();
      
      if (data.prediction) {
        toast.success('AI анализ завершён', {
          description: `Уверенность: ${data.prediction.confidenceScore || 50}%`,
        });
      }
    } catch (err) {
      console.error('Error AI analysis:', err);
      toast.error('Не удалось выполнить AI анализ');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="w-12 h-12 text-[#FF4D4D]" />
        <p className="text-[#FF4D4D]">{error}</p>
        <Button onClick={fetchCampaigns} variant="outline" className="border-[#2A2B32] text-[#8A8A8A] hover:text-white">
          <RefreshCw className="w-4 h-4 mr-2" />
          Попробовать снова
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Кампании</h1>
          <p className="text-[#8A8A8A]">Управление рекламными кампаниями</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAIAnalysis}
            disabled={actionLoading === 'ai-analysis' || campaigns.length === 0}
            className="border-[#6C63FF] text-[#6C63FF]"
          >
            {actionLoading === 'ai-analysis' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            AI Анализ
          </Button>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать кампанию
          </Button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
          <Input
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#14151A] border-[#2A2B32] text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-[#14151A] border-[#2A2B32] text-white">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent className="bg-[#14151A] border-[#2A2B32]">
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="paused">На паузе</SelectItem>
            <SelectItem value="error">С ошибкой</SelectItem>
            <SelectItem value="draft">Черновики</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={fetchCampaigns}
          disabled={loading}
          className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Карточки кампаний */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full', getStatusColor(campaign.status))} />
                <CardTitle className="text-lg text-white">{campaign.name}</CardTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#8A8A8A] hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#14151A] border-[#2A2B32]">
                  <DropdownMenuItem onClick={() => handleOpenModal(campaign)} className="text-white hover:bg-[#1E1F26]">
                    <Edit className="w-4 h-4 mr-2" />
                    Настройки
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleToggleStatus(campaign)}
                    disabled={actionLoading === campaign.id}
                    className="text-white hover:bg-[#1E1F26]"
                  >
                    {actionLoading === campaign.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : campaign.status === 'active' ? (
                      <Pause className="w-4 h-4 mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {campaign.status === 'active' ? 'Пауза' : 'Запустить'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDuplicate(campaign)}
                    disabled={actionLoading === `dup-${campaign.id}`}
                    className="text-white hover:bg-[#1E1F26]"
                  >
                    {actionLoading === `dup-${campaign.id}` ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Дублировать
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => { setCampaignToDelete(campaign); setDeleteDialogOpen(true); }}
                    className="text-[#FF4D4D] hover:bg-[#1E1F26]"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
                  {campaign.type || 'Не указан'}
                </Badge>
                <Badge className={cn(
                  'text-white',
                  campaign.status === 'active' ? 'bg-[#00D26A]' : campaign.status === 'paused' ? 'bg-[#FFB800]' : campaign.status === 'error' ? 'bg-[#FF4D4D]' : 'bg-[#8A8A8A]'
                )}>
                  {getStatusLabel(campaign.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#8A8A8A]">Ниша</p>
                  <p className="text-white font-medium">{campaign.niche || '—'}</p>
                </div>
                <div>
                  <p className="text-[#8A8A8A]">Гео</p>
                  <p className="text-white font-medium">{campaign.geo || '—'}</p>
                </div>
                <div>
                  <p className="text-[#8A8A8A]">Лиды</p>
                  <p className="text-white font-medium">{campaign.leadsCount}</p>
                </div>
                <div>
                  <p className="text-[#8A8A8A]">Доход</p>
                  <p className="text-[#00D26A] font-medium">{campaign.revenue.toLocaleString()} ₽</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[#8A8A8A]">
                  <span>Расход бюджета</span>
                  <span>{campaign.budget > 0 ? Math.round((campaign.spent / campaign.budget) * 100) : 0}%</span>
                </div>
                <Progress value={campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0} className="h-2" />
              </div>

              <Button
                onClick={() => handleToggleStatus(campaign)}
                disabled={actionLoading === campaign.id}
                className={cn(
                  'w-full',
                  campaign.status === 'active' ? 'bg-[#FFB800] hover:bg-[#FFB800]/80 text-black' : 'bg-[#00D26A] hover:bg-[#00D26A]/80 text-black'
                )}
              >
                {actionLoading === campaign.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : campaign.status === 'active' ? (
                  <Pause className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {campaign.status === 'active' ? 'Приостановить' : 'Запустить'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <Card className="bg-[#14151A] border-[#2A2B32] p-12 text-center">
          <Rocket className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Нет кампаний</h3>
          <p className="text-[#8A8A8A] mb-6">Создайте первую кампанию для начала работы</p>
          <Button onClick={() => handleOpenModal()} className="bg-[#6C63FF] hover:bg-[#6C63FF]/80">
            <Plus className="w-4 h-4 mr-2" />
            Создать кампанию
          </Button>
        </Card>
      )}

      {/* Модалка создания/редактирования кампании */}
      <Dialog open={campaignModalOpen} onOpenChange={setCampaignModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Редактирование кампании' : 'Новая кампания'}</DialogTitle>
          </DialogHeader>

          <Tabs value={modalTab} onValueChange={setModalTab} className="mt-4">
            <TabsList className="bg-[#1E1F26] border-[#2A2B32] w-full justify-start">
              <TabsTrigger value="offer" className="data-[state=active]:bg-[#6C63FF]">Оффер</TabsTrigger>
              <TabsTrigger value="accounts" className="data-[state=active]:bg-[#6C63FF]">Аккаунты</TabsTrigger>
              <TabsTrigger value="posting" className="data-[state=active]:bg-[#6C63FF]">Постинг</TabsTrigger>
              <TabsTrigger value="budget" className="data-[state=active]:bg-[#6C63FF]">Бюджет</TabsTrigger>
            </TabsList>

            <TabsContent value="offer" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Название кампании *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название кампании"
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>

              <div className="space-y-2">
                <Label>Тип кампании *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                    <SelectItem value="casino">Казино</SelectItem>
                    <SelectItem value="crypto">Крипта</SelectItem>
                    <SelectItem value="dating">Дейтинг</SelectItem>
                    <SelectItem value="nutra">Нутра</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ниша</Label>
                <Input
                  value={formData.niche}
                  onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                  placeholder="Ниша кампании"
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>

              <div className="space-y-2">
                <Label>Гео</Label>
                <Input
                  value={formData.geo}
                  onChange={(e) => setFormData({ ...formData, geo: e.target.value })}
                  placeholder="Страны (например: RU, UA, KZ)"
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание кампании"
                  className="bg-[#1E1F26] border-[#2A2B32] min-h-[80px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="accounts" className="space-y-4 mt-4">
              <div className="p-4 bg-[#1E1F26] rounded-lg">
                <p className="text-[#8A8A8A] text-sm">
                  Выбор аккаунтов и настройки постинга будут доступны после создания кампании.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="posting" className="space-y-4 mt-4">
              <div className="p-4 bg-[#1E1F26] rounded-lg">
                <p className="text-[#8A8A8A] text-sm">
                  Настройки постинга будут доступны после создания кампании.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="budget" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Бюджет (₽)</Label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) || 0 })}
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>

              <div className="space-y-2">
                <Label>Дата начала</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>

              <div className="space-y-2">
                <Label>Дата окончания</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleCloseModal} className="border-[#2A2B32] text-[#8A8A8A]">
              Отмена
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={actionLoading === 'save'}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              {actionLoading === 'save' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingCampaign ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить кампанию?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8A8A8A]">
              Вы уверены, что хотите удалить кампанию &quot;{campaignToDelete?.name}&quot;? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1E1F26] border-[#2A2B32] text-white hover:bg-[#2A2B32]">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={actionLoading === 'delete'}
              className="bg-[#FF4D4D] hover:bg-[#FF4D4D]/80"
            >
              {actionLoading === 'delete' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== КОМПОНЕНТ АККАУНТОВ ====================

function AccountsView() {
  const { accounts, setAccounts, accountModalOpen, setAccountModalOpen, selectedAccounts, setSelectedAccounts, updateAccount, removeAccount } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalTab, setModalTab] = useState('import');
  const [proxyDialogOpen, setProxyDialogOpen] = useState(false);
  const [selectedAccountForProxy, setSelectedAccountForProxy] = useState<Account | null>(null);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      const matchesSearch = (a.username || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (a.phone || '').includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [accounts, searchQuery, statusFilter]);

  const handleSelectAll = () => {
    if (selectedAccounts.length === filteredAccounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(filteredAccounts.map(a => a.id));
    }
  };

  const handleSelectAccount = (id: string) => {
    if (selectedAccounts.includes(id)) {
      setSelectedAccounts(selectedAccounts.filter(a => a !== id));
    } else {
      setSelectedAccounts([...selectedAccounts, id]);
    }
  };

  const handleWarmAccount = (account: Account) => {
    toast.info(`Прогрев аккаунта ${account.username} запущен...`);
    updateAccount(account.id, { status: 'active', warmingProgress: 0 });
  };

  const handleChangeProxy = (account: Account) => {
    setSelectedAccountForProxy(account);
    setProxyDialogOpen(true);
  };

  const handleDeleteAccount = (account: Account) => {
    removeAccount(account.id);
    toast.success(`Аккаунт ${account.username} удалён`);
  };

  const handleBulkDelete = () => {
    selectedAccounts.forEach(id => removeAccount(id));
    setSelectedAccounts([]);
    toast.success(`${selectedAccounts.length} аккаунтов удалено`);
  };

  const handleBulkExport = () => {
    toast.success('Экспорт в CSV запущен...');
  };

  const getStatusIcon = (account: Account) => {
    if (account.status === 'banned') {
      return <div className="w-2 h-2 rounded-full bg-[#FF4D4D]" title="Забанен" />;
    }
    if (account.banRisk >= 70) {
      return <div className="w-2 h-2 rounded-full bg-[#FF4D4D]" title="Высокий риск" />;
    }
    if (account.status === 'limit' || account.banRisk >= 30) {
      return <div className="w-2 h-2 rounded-full bg-[#FFB800]" title="Лимит/Средний риск" />;
    }
    if (account.status === 'new') {
      return <div className="w-2 h-2 rounded-full bg-[#8A8A8A]" title="Новый" />;
    }
    return <div className="w-2 h-2 rounded-full bg-[#00D26A]" title="Жив" />;
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Аккаунты</h1>
          <p className="text-[#8A8A8A]">Управление Telegram аккаунтами</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              toast.info('AI анализ запущен...');
              // Call AI API
            }}
            className="border-[#6C63FF] text-[#6C63FF]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Анализ
          </Button>
          <Button onClick={() => setAccountModalOpen(true)} className="bg-[#6C63FF] hover:bg-[#6C63FF]/80">
            <Plus className="w-4 h-4 mr-2" />
            Добавить аккаунт
          </Button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
          <Input
            placeholder="Поиск по username или телефону..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#14151A] border-[#2A2B32] text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-[#14151A] border-[#2A2B32] text-white">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent className="bg-[#14151A] border-[#2A2B32]">
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="active">Живые</SelectItem>
            <SelectItem value="limit">Лимит</SelectItem>
            <SelectItem value="banned">Забаненные</SelectItem>
            <SelectItem value="new">Новые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Массовые операции */}
      {selectedAccounts.length > 0 && (
        <Card className="bg-[#1E1F26] border-[#6C63FF]/50">
          <CardContent className="flex items-center gap-4 py-4">
            <span className="text-white">Выбрано: {selectedAccounts.length}</span>
            <Button variant="outline" size="sm" onClick={handleBulkDelete} className="border-[#FF4D4D] text-[#FF4D4D]">
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </Button>
            <Button variant="outline" size="sm" className="border-[#6C63FF] text-[#6C63FF]">
              <Globe className="w-4 h-4 mr-2" />
              Сменить прокси
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkExport} className="border-[#00D26A] text-[#00D26A]">
              <Download className="w-4 h-4 mr-2" />
              Экспорт CSV
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Таблица аккаунтов */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#2A2B32]">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedAccounts.length === filteredAccounts.length && filteredAccounts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-[#8A8A8A]">Статус</TableHead>
                <TableHead className="text-[#8A8A8A]">ID/Имя</TableHead>
                <TableHead className="text-[#8A8A8A]">Прокси</TableHead>
                <TableHead className="text-[#8A8A8A]">Сегодня комментов</TableHead>
                <TableHead className="text-[#8A8A8A]">Всего комментов</TableHead>
                <TableHead className="text-[#8A8A8A]">Бан-риск</TableHead>
                <TableHead className="text-[#8A8A8A]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.id} className="hover:bg-[#1E1F26] border-[#2A2B32]">
                  <TableCell>
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={() => handleSelectAccount(account.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          {getStatusIcon(account)}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getStatusLabel(account.status)}</p>
                          <p>Риск: {account.banRisk}%</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-white font-medium">@{account.username || 'unknown'}</p>
                      <p className="text-xs text-[#8A8A8A]">{account.phone || ''}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[#8A8A8A]">{account.proxy || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-white">{account.commentsToday}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-white">{account.commentsTotal}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={account.banRisk} className="w-16 h-2" />
                      <span style={{ color: getRiskColor(account.banRisk) }}>{account.banRisk}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleChangeProxy(account)} className="h-8 w-8 p-0 text-[#8A8A8A] hover:text-white">
                              <Globe className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Сменить прокси</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {account.status === 'new' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleWarmAccount(account)} className="h-8 w-8 p-0 text-[#FFB800] hover:text-white">
                                <Thermometer className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Прогреть</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAccount(account)} className="h-8 w-8 p-0 text-[#FF4D4D] hover:text-white">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Удалить</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAccounts.length === 0 && (
            <div className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
              <p className="text-[#8A8A8A]">Нет аккаунтов</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модалка добавления аккаунта */}
      <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
        <DialogContent className="max-w-2xl bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>Добавить аккаунты</DialogTitle>
          </DialogHeader>

          <Tabs value={modalTab} onValueChange={setModalTab} className="mt-4">
            <TabsList className="bg-[#1E1F26] border-[#2A2B32] w-full">
              <TabsTrigger value="import" className="data-[state=active]:bg-[#6C63FF] flex-1">Импорт из файла</TabsTrigger>
              <TabsTrigger value="manual" className="data-[state=active]:bg-[#6C63FF] flex-1">Ручное добавление</TabsTrigger>
              <TabsTrigger value="auto" className="data-[state=active]:bg-[#6C63FF] flex-1">Авто-регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="import" className="mt-4">
              <div className="border-2 border-dashed border-[#2A2B32] rounded-lg p-8 text-center hover:border-[#6C63FF] transition-colors cursor-pointer">
                <FileUp className="w-12 h-12 mx-auto text-[#8A8A8A] mb-4" />
                <p className="text-white mb-2">Перетащите файл сюда или нажмите для выбора</p>
                <p className="text-sm text-[#8A8A8A]">Поддерживаемые форматы: CSV, JSON</p>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input placeholder="+79001234567" className="bg-[#1E1F26] border-[#2A2B32]" />
                </div>
                <div className="space-y-2">
                  <Label>API ID</Label>
                  <Input placeholder="12345" className="bg-[#1E1F26] border-[#2A2B32]" />
                </div>
                <div className="space-y-2">
                  <Label>API Hash</Label>
                  <Input placeholder="abcdef123456..." className="bg-[#1E1F26] border-[#2A2B32]" />
                </div>
                <div className="space-y-2">
                  <Label>Session String</Label>
                  <Input placeholder="session_string..." className="bg-[#1E1F26] border-[#2A2B32]" />
                </div>
              </div>
              <Button className="w-full bg-[#6C63FF] hover:bg-[#6C63FF]/80">
                Добавить
              </Button>
            </TabsContent>

            <TabsContent value="auto" className="mt-4">
              <div className="text-center py-8">
                <Bot className="w-12 h-12 mx-auto text-[#6C63FF] mb-4" />
                <p className="text-white mb-2">Автоматическая регистрация через сервис</p>
                <p className="text-sm text-[#8A8A8A] mb-4">Интеграция с SMS-сервисами для массовой регистрации</p>
                <Button variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
                  Настроить сервис
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export default function MUKNTrafficApp() {
  const { activeTab } = useAppStore();
  const { aiPanelOpen, terminalMode, uiMode, theme } = useModeStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Hotkeys
  const { helpDialogOpen, setHelpDialogOpen } = useHotkeys();

  // Apply theme class to body
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light', 'high-contrast');
    root.classList.add(theme);
  }, [theme]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'campaigns':
        return <CampaignsView />;
      case 'accounts':
        return <AccountsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      case 'traffic':
        return <TrafficView />;
      case 'offers':
        return <OffersView />;
      case 'influencers':
        return <InfluencersView />;
      case 'ai-comments':
        return <AICommentsView />;
      case 'ai-pool':
        return <AIPoolView />;
      case 'hunyuan':
        return <HunyuanView />;
      case 'content':
        return <ContentView />;
      case 'video-generator':
        return <VideoGeneratorView />;
      case 'advanced':
        return <AdvancedView />;
      case 'warming':
        return <WarmingViewEnhanced />;
      case 'shadow-ban':
        return <ShadowBanView />;
      case 'monetization':
        return <MonetizationView />;
      case 'ofm':
        return <OFMView />;
      case 'proxies':
        return <ProxiesView />;
      case 'sim-cards':
        return <SimCardsView />;
      case 'ig-warming':
        return <InstagramWarmingView />;
      case 'traffic-pour':
        return <TrafficPourView />;
      case 'antidetect':
        return <AntidetectView />;
      default:
        return <DashboardView />;
    }
  };

  // Adjust main content margin based on AI panel
  const mainStyle = aiPanelOpen
    ? { marginRight: '380px' }
    : {};

  return (
    <div className="flex h-screen bg-[#0A0B0E]">
      {/* Mobile Menu (Sheet-based drawer) */}
      <MobileMenu onNotificationsClick={() => setNotificationsOpen(true)} />
      
      {/* Desktop Sidebar */}
      <Sidebar onNotificationsClick={() => setNotificationsOpen(true)} />

      <main className="flex-1 overflow-hidden" style={mainStyle}>
        {/* Mobile Header */}
        <MobileHeader 
          onNotificationsClick={() => setNotificationsOpen(true)}
        />
        
        {/* Desktop Header with Mode Switcher */}
        <div className="hidden md:flex items-center justify-between px-4 py-2 border-b border-[#2A2B32] bg-[#14151A]">
          <div className="flex items-center gap-2">
            <Badge className={cn(
              'text-xs',
              uiMode === 'simple' ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-[#FFB800]/20 text-[#FFB800]'
            )}>
              {uiMode === 'simple' ? 'Простой режим' : 'Эксперт режим'}
            </Badge>
          </div>
          <ModeSwitcher />
        </div>

        <ScrollArea className="h-full" style={{ height: 'calc(100vh - 49px)' }}>
          <div className="p-4 md:p-6 pt-16 md:pt-6">
            {renderContent()}
          </div>
        </ScrollArea>
      </main>

      <NotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      
      {/* AI Assistant Panel */}
      <AIAssistantPanel />
      
      {/* Onboarding Tour */}
      <OnboardingTour />
      <BeginnerHints />
      
      {/* Terminal Mode */}
      <TerminalMode />
      
      {/* Hotkeys Help (Expert mode only) */}
      {uiMode === 'expert' && <HotkeysHelp />}
      
      {/* Hotkeys Help Dialog */}
      <HotkeysHelpDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />
    </div>
  );
}

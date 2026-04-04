'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { WarmingView } from '@/components/views/warming-view';
import { ShadowBanView } from '@/components/views/shadow-ban-view';
import { AIPoolView } from '@/components/views/ai-pool-view';
import { SettingsView } from '@/components/views/settings-view';
import { HunyuanView } from '@/components/views/hunyuan-view';
import { AnalyticsView } from '@/components/views/analytics-view';
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

// ==================== КОМПОНЕНТ ДАШБОРДА (ГЛАВНАЯ) ====================

function DashboardView() {
  const { kpiData, setKpiData, activities, setActivities, campaigns, accounts, setCampaigns, setAccounts } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Моковые данные для KPI
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Имитация API запроса
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Моковые KPI данные
        setKpiData([
          { title: 'Доход сегодня', value: '1 240 ₽', change: 12, icon: 'dollar', color: 'green' },
          { title: 'Живые аккаунты', value: '24', change: -2, icon: 'users', color: 'neutral' },
          { title: 'Комментариев сегодня', value: '156', change: 8, icon: 'message', color: 'green' },
          { title: 'Топ-канал', value: '@crypto_signals', change: undefined, icon: 'trending', color: 'neutral' },
        ]);

        // Моковые активности
        setActivities([
          { id: '1', type: 'comment', message: 'Комментарий успешно опубликован в @crypto_news', timestamp: new Date(Date.now() - 300000), campaignId: 'c1' },
          { id: '2', type: 'warning', message: 'Аккаунт @user123 приближается к лимиту комментариев', timestamp: new Date(Date.now() - 600000), accountId: 'a1' },
          { id: '3', type: 'ban', message: 'Аккаунт @banned_user заблокирован', timestamp: new Date(Date.now() - 1200000), accountId: 'a2' },
          { id: '4', type: 'success', message: 'Кампания "Crypto Boost" запущена', timestamp: new Date(Date.now() - 1800000), campaignId: 'c2' },
          { id: '5', type: 'join', message: 'Новый аккаунт @new_user добавлен в систему', timestamp: new Date(Date.now() - 2400000), accountId: 'a3' },
          { id: '6', type: 'limit', message: 'Достигнут лимит комментариев для @limited_user', timestamp: new Date(Date.now() - 3000000), accountId: 'a4' },
        ]);

        // Моковые кампании
        setCampaigns([
          { id: 'c1', name: 'Crypto Signals Pro', status: 'active', offerType: 'crypto', accountsActive: 5, accountsTotal: 6, commentsToday: 48, revenue: 540, budget: 1000, budgetSpent: 320, createdAt: new Date(), updatedAt: new Date() },
          { id: 'c2', name: 'Casino Royale', status: 'active', offerType: 'casino', accountsActive: 8, accountsTotal: 8, commentsToday: 72, revenue: 700, budget: 2000, budgetSpent: 890, createdAt: new Date(), updatedAt: new Date() },
          { id: 'c3', name: 'Dating Apps', status: 'paused', offerType: 'dating', accountsActive: 0, accountsTotal: 4, commentsToday: 0, revenue: 0, budget: 500, budgetSpent: 150, createdAt: new Date(), updatedAt: new Date() },
        ]);

        // Моковые аккаунты
        setAccounts([
          { id: 'a1', platform: 'telegram', username: 'crypto_master', proxy: '185.234.xx.xx:1080', commentsToday: 12, commentsTotal: 156, banRisk: 15, status: 'active', warmingProgress: 100, dailyComments: 12, dailyDm: 5, maxComments: 50, maxDm: 20 },
          { id: 'a2', platform: 'telegram', username: 'signal_pro', proxy: '45.67.xx.xx:1080', commentsToday: 8, commentsTotal: 89, banRisk: 45, status: 'active', warmingProgress: 100, dailyComments: 8, dailyDm: 3, maxComments: 50, maxDm: 20 },
          { id: 'a3', platform: 'telegram', username: 'trader_alex', proxy: '91.234.xx.xx:1080', commentsToday: 20, commentsTotal: 234, banRisk: 72, status: 'limit', warmingProgress: 100, dailyComments: 20, dailyDm: 8, maxComments: 50, maxDm: 20 },
          { id: 'a4', platform: 'telegram', username: 'newbie_user', proxy: '', commentsToday: 0, commentsTotal: 0, banRisk: 0, status: 'new', warmingProgress: 0, dailyComments: 0, dailyDm: 0, maxComments: 50, maxDm: 20 },
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setKpiData, setActivities, setCampaigns, setAccounts]);

  // Данные для графика
  const chartData = useMemo(() => {
    return [
      { date: 'Пн', revenue: 850, comments: 45 },
      { date: 'Вт', revenue: 1200, comments: 67 },
      { date: 'Ср', revenue: 980, comments: 52 },
      { date: 'Чт', revenue: 1450, comments: 78 },
      { date: 'Пт', revenue: 1100, comments: 61 },
      { date: 'Сб', revenue: 780, comments: 38 },
      { date: 'Вс', revenue: 1240, comments: 65 },
    ];
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageSquare className="w-4 h-4" />;
      case 'ban': return <XCircle className="w-4 h-4" />;
      case 'join': return <Users className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'limit': return <Shield className="w-4 h-4" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
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
      default: return 'bg-[#8A8A8A]/20 text-[#8A8A8A]';
    }
  };

  const handlePauseAll = async () => {
    toast.success('Все кампании приостановлены');
  };

  const handleHealthCheck = async () => {
    toast.info('Проверка всех аккаунтов запущена...');
  };

  const handleExportReport = async () => {
    toast.success('Отчёт за сегодня скачивается...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
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
            onClick={() => window.location.reload()}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
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

function CampaignsView() {
  const { campaigns, setCampaigns, campaignModalOpen, setCampaignModalOpen, editingCampaign, setEditingCampaign, addCampaign, updateCampaign, removeCampaign } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [modalTab, setModalTab] = useState('offer');

  // Default form data
  const defaultFormData: Partial<Campaign> = {
    name: '',
    status: 'draft',
    offerType: 'crypto',
    link: '',
    accountsActive: 0,
    accountsTotal: 0,
    commentsToday: 0,
    revenue: 0,
    budget: 0,
    budgetSpent: 0,
    autoReplaceOnBan: true,
    maxCommentsPerAccount: 50,
    postingMode: 'new',
    delayMin: 30,
    delayMax: 120,
    delayRandom: true,
    useUniqueText: true,
    useDeepSeek: true,
    deepSeekTemperature: 0.7,
    maxCostPerLead: 100,
    workTimeStart: '09:00',
    workTimeEnd: '21:00',
  };

  // Форма создания/редактирования
  const [formData, setFormData] = useState<Partial<Campaign>>(defaultFormData);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const handleOpenModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData(campaign);
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

  const handleSave = () => {
    if (!formData.name) {
      toast.error('Введите название кампании');
      return;
    }

    if (editingCampaign) {
      updateCampaign(editingCampaign.id, formData);
      toast.success('Кампания обновлена');
    } else {
      addCampaign({
        ...formData as Campaign,
        id: `c${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      toast.success('Кампания создана');
    }
    handleCloseModal();
  };

  const handleDelete = () => {
    if (campaignToDelete) {
      removeCampaign(campaignToDelete.id);
      toast.success('Кампания удалена');
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
  };

  const handleToggleStatus = (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    updateCampaign(campaign.id, { status: newStatus });
    toast.success(`Кампания ${newStatus === 'active' ? 'запущена' : 'приостановлена'}`);
  };

  const handleDuplicate = (campaign: Campaign) => {
    addCampaign({
      ...campaign,
      id: `c${Date.now()}`,
      name: `${campaign.name} (копия)`,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    toast.success('Кампания скопирована');
  };

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
            onClick={() => {
              toast.info('AI анализ запущен...');
              // Call AI API
            }}
            className="border-[#6C63FF] text-[#6C63FF]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
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
                  <DropdownMenuItem onClick={() => handleToggleStatus(campaign)} className="text-white hover:bg-[#1E1F26]">
                    {campaign.status === 'active' ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Пауза
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Запустить
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(campaign)} className="text-white hover:bg-[#1E1F26]">
                    <Copy className="w-4 h-4 mr-2" />
                    Дублировать
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setCampaignToDelete(campaign); setDeleteDialogOpen(true); }} className="text-[#FF4D4D] hover:bg-[#1E1F26]">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
                  {getOfferTypeLabel(campaign.offerType)}
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
                  <p className="text-[#8A8A8A]">Аккаунты</p>
                  <p className="text-white font-medium">{campaign.accountsActive}/{campaign.accountsTotal}</p>
                </div>
                <div>
                  <p className="text-[#8A8A8A]">Комментов сегодня</p>
                  <p className="text-white font-medium">{campaign.commentsToday}</p>
                </div>
                <div>
                  <p className="text-[#8A8A8A]">Доход</p>
                  <p className="text-[#00D26A] font-medium">{campaign.revenue.toLocaleString()} ₽</p>
                </div>
                <div>
                  <p className="text-[#8A8A8A]">Бюджет</p>
                  <p className="text-white font-medium">{campaign.budgetSpent}/{campaign.budget} ₽</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[#8A8A8A]">
                  <span>Расход бюджета</span>
                  <span>{Math.round((campaign.budgetSpent / (campaign.budget || 1)) * 100)}%</span>
                </div>
                <Progress value={(campaign.budgetSpent / (campaign.budget || 1)) * 100} className="h-2" />
              </div>

              <Button
                onClick={() => handleToggleStatus(campaign)}
                className={cn(
                  'w-full',
                  campaign.status === 'active' ? 'bg-[#FFB800] hover:bg-[#FFB800]/80 text-black' : 'bg-[#00D26A] hover:bg-[#00D26A]/80 text-black'
                )}
              >
                {campaign.status === 'active' ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Приостановить
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Запустить
                  </>
                )}
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
                <Label>Название кампании</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название кампании"
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>

              <div className="space-y-2">
                <Label>Тип оффера</Label>
                <Select value={formData.offerType || 'crypto'} onValueChange={(v) => setFormData({ ...formData, offerType: v as any })}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                    <SelectItem value="casino">Казино</SelectItem>
                    <SelectItem value="crypto">Крипта</SelectItem>
                    <SelectItem value="dating">Дейтинг</SelectItem>
                    <SelectItem value="nutra">Нутра</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ссылка на канал/бот</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.link || ''}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://t.me/channel или @username"
                    className="bg-[#1E1F26] border-[#2A2B32]"
                  />
                  <Button variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
                    Тест
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="accounts" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Выбрать аккаунты</Label>
                <Select>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectValue placeholder="Выберите аккаунты..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                    {/* Список аккаунтов будет здесь */}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Авто-замена при бане</Label>
                <Switch
                  checked={formData.autoReplaceOnBan}
                  onCheckedChange={(v) => setFormData({ ...formData, autoReplaceOnBan: v })}
                />
              </div>

              <div className="space-y-2">
                <Label>Максимум комментариев на аккаунт/день</Label>
                <Input
                  type="number"
                  value={formData.maxCommentsPerAccount || 50}
                  onChange={(e) => setFormData({ ...formData, maxCommentsPerAccount: parseInt(e.target.value) })}
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>
            </TabsContent>

            <TabsContent value="posting" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Режим</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'new', label: 'Новые посты' },
                    { value: 'old', label: 'Старые посты' },
                    { value: 'both', label: 'Оба' },
                  ].map((mode) => (
                    <Button
                      key={mode.value}
                      variant={formData.postingMode === mode.value ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, postingMode: mode.value as any })}
                      className={formData.postingMode === mode.value ? 'bg-[#6C63FF]' : 'border-[#2A2B32] text-[#8A8A8A]'}
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Задержка между комментариями</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.delayMin || 30}
                      onChange={(e) => setFormData({ ...formData, delayMin: parseInt(e.target.value) })}
                      className="w-20 bg-[#1E1F26] border-[#2A2B32]"
                    />
                    <span className="text-[#8A8A8A]">сек</span>
                  </div>
                  <span className="text-[#8A8A8A]">—</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.delayMax || 120}
                      onChange={(e) => setFormData({ ...formData, delayMax: parseInt(e.target.value) })}
                      className="w-20 bg-[#1E1F26] border-[#2A2B32]"
                    />
                    <span className="text-[#8A8A8A]">сек</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="random" checked={formData.delayRandom} onCheckedChange={(v) => setFormData({ ...formData, delayRandom: !!v })} />
                    <Label htmlFor="random" className="text-[#8A8A8A]">Рандом</Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Уникализация текста</Label>
                <Switch
                  checked={formData.useUniqueText}
                  onCheckedChange={(v) => setFormData({ ...formData, useUniqueText: v })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Использовать DeepSeek</Label>
                  <Switch
                    checked={formData.useDeepSeek}
                    onCheckedChange={(v) => setFormData({ ...formData, useDeepSeek: v })}
                  />
                </div>
                {formData.useDeepSeek && (
                  <div className="space-y-2">
                    <Label>Температура: {formData.deepSeekTemperature}</Label>
                    <Slider
                      value={[formData.deepSeekTemperature || 0.7]}
                      onValueChange={(v) => setFormData({ ...formData, deepSeekTemperature: v[0] })}
                      min={0}
                      max={1.2}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="budget" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Бюджет на день (₽)</Label>
                <Input
                  type="number"
                  value={formData.budget || 0}
                  onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>

              <div className="space-y-2">
                <Label>Макс. стоимость за лид (₽)</Label>
                <Input
                  type="number"
                  value={formData.maxCostPerLead || 100}
                  onChange={(e) => setFormData({ ...formData, maxCostPerLead: parseInt(e.target.value) })}
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>

              <div className="space-y-2">
                <Label>Время работы</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="time"
                    value={formData.workTimeStart || '09:00'}
                    onChange={(e) => setFormData({ ...formData, workTimeStart: e.target.value })}
                    className="bg-[#1E1F26] border-[#2A2B32]"
                  />
                  <span className="text-[#8A8A8A]">—</span>
                  <Input
                    type="time"
                    value={formData.workTimeEnd || '21:00'}
                    onChange={(e) => setFormData({ ...formData, workTimeEnd: e.target.value })}
                    className="bg-[#1E1F26] border-[#2A2B32]"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleCloseModal} className="border-[#2A2B32] text-[#8A8A8A]">
              Отмена
            </Button>
            <Button onClick={handleSave} className="bg-[#6C63FF] hover:bg-[#6C63FF]/80">
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
            <AlertDialogAction onClick={handleDelete} className="bg-[#FF4D4D] hover:bg-[#FF4D4D]/80">
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
        return <WarmingView />;
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

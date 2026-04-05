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
import { AIAssistantView } from '@/components/views/ai-assistant-view';
import { TrafficPourView } from '@/components/views/traffic-pour-view';
import { AntidetectView } from '@/components/views/antidetect-view';
import { DeepSeekFreePanelPro } from '@/components/deepseek-free/deepseek-free-panel-pro';
// AI Panel - боковая панель с браузером
import { AIPanel } from '@/components/ai-assistant/ai-panel';
import { ModeSwitcher } from '@/components/mode-switcher/index';
import { OnboardingTour } from '@/components/onboarding/onboarding-tour';
import { BeginnerHints } from '@/components/onboarding/beginner-hints';
import { TerminalMode } from '@/components/terminal/terminal-mode';
import { useHotkeys, HotkeysHelp, HotkeysHelpDialog } from '@/components/hotkeys/use-hotkeys';
import { useModeStore } from '@/store/mode-store';
import { MobileMenu, MobileHeader } from '@/components/ui/mobile-menu';
import { NotificationsSheet } from '@/components/notifications/notifications-sheet';

import { UnifiedAutoEarnWizard } from '@/components/auto-earn/unified-auto-earn-wizard';
import { AutoEarnDashboard } from '@/components/auto-earn/auto-earn-dashboard';
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

// ==================== ГЛАВНАЯ СТРАНИЦА AUTO-EARN ====================

function AutoEarnView() {
  const [activeTab, setActiveTab] = useState<'wizard' | 'dashboard'>('wizard');

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#FFB800]" />
            Авто-заработок
          </h1>
          <p className="text-[#8A8A8A]">Автоматический пассивный доход с помощью AI</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'wizard' ? 'default' : 'outline'}
            onClick={() => setActiveTab('wizard')}
            className={activeTab === 'wizard' ? 'bg-[#6C63FF]' : 'border-[#2A2B32] text-[#8A8A8A]'}
          >
            <Rocket className="w-4 h-4 mr-2" />
            Запуск
          </Button>
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActiveTab('dashboard')}
            className={activeTab === 'dashboard' ? 'bg-[#6C63FF]' : 'border-[#2A2B32] text-[#8A8A8A]'}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Мониторинг
          </Button>
        </div>
      </div>

      {/* Контент */}
      {activeTab === 'wizard' ? (
        <UnifiedAutoEarnWizard />
      ) : (
        <AutoEarnDashboard />
      )}
    </div>
  );
}

// ==================== ГЛАВНОЕ ПРИЛОЖЕНИЕ ====================

export default function Page() {
  const { activeTab, setActiveTab, settings, updateSettings, settingsOpen, setSettingsOpen } = useAppStore();
  const { terminalMode } = useModeStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [hotkeysDialogOpen, setHotkeysDialogOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true); // AI Panel справа

  // Горячие клавиши
  useHotkeys([
    { key: 'n', ctrl: true, action: () => setCampaignModalOpen(true), description: 'Новая кампания' },
    { key: 's', ctrl: true, action: () => setSettingsOpen(true), description: 'Настройки' },
    { key: '/', action: () => setHotkeysDialogOpen(true), description: 'Горячие клавиши' },
    { key: 'a', ctrl: true, action: () => setAiPanelOpen(prev => !prev), description: 'AI Ассистент' },
    { key: 'Escape', action: () => { setSettingsOpen(false); setCampaignModalOpen(false); }, description: 'Закрыть' },
  ]);

  // Рендер контента на основе активного таба
  const renderContent = () => {
    switch (activeTab) {
      case 'auto-earn':
        return <AutoEarnView />;
      case 'dashboard':
        return <DashboardView />;
      case 'campaigns':
        return <CampaignsView />;
      case 'traffic':
        return <TrafficView />;
      case 'warming':
        return <WarmingViewEnhanced />;
      case 'instagram-warming':
        return <InstagramWarmingView />;
      case 'ai-assistant':
        return <AIAssistantView />;
      case 'ai-comments':
        return <AICommentsView />;
      case 'monetization':
        return <MonetizationView />;
      case 'ofm':
        return <OFMView />;
      case 'content':
        return <ContentView />;
      case 'video-generator':
        return <VideoGeneratorView />;
      case 'offers':
        return <OffersView />;
      case 'influencers':
        return <InfluencersView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'shadow-ban':
        return <ShadowBanView />;
      case 'ai-pool':
        return <AIPoolView />;
      case 'hunyuan':
        return <HunyuanView />;
      case 'traffic-pour':
        return <TrafficPourView />;
      case 'antidetect':
        return <AntidetectView />;
      case 'advanced':
        return <AdvancedView />;
      case 'deepseek-free':
        return <DeepSeekFreePanelPro />;
      case 'proxies':
        return <ProxiesView />;
      case 'sim-cards':
        return <SimCardsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <AutoEarnView />;
    }
  };

  // Терминальный режим
  if (terminalMode) {
    return (
      <TerminalMode />
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#0A0A0C] text-white overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
        />

        {/* Main content */}
        <div 
          className="flex-1 flex flex-col overflow-hidden min-w-0"
        >
          {/* Header */}
          <MobileHeader
            menuOpen={mobileMenuOpen}
            setMenuOpen={setMobileMenuOpen}
            notificationsOpen={notificationsOpen}
            setNotificationsOpen={setNotificationsOpen}
          />

          {/* Content area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0C] min-w-0">
            <div className="max-w-7xl mx-auto min-w-0">
              {renderContent()}
            </div>
          </main>
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
        />

        {/* Notifications Sheet */}
        <NotificationsSheet
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
        />

        {/* AI Assistant Panel - боковая панель справа */}
        <AIPanel isOpen={aiPanelOpen} onOpenChange={setAiPanelOpen} />

        {/* Hotkeys Dialog */}
        <HotkeysHelpDialog open={hotkeysDialogOpen} onOpenChange={setHotkeysDialogOpen} />

        {/* Onboarding Tour */}
        <OnboardingTour />

        {/* Beginner Hints */}
        <BeginnerHints />
      </div>
    </TooltipProvider>
  );
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

      if (kpiJson.kpi) setKpiData(kpiJson.kpi);
      if (activitiesJson.activities) setActivities(activitiesJson.activities);
      if (campaignsJson.campaigns) setCampaigns(campaignsJson.campaigns);
      if (accountsJson.accounts) setAccounts(accountsJson.accounts);
      if (revenueJson.chartData) setChartData(revenueJson.chartData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      toast.error('Ошибка загрузки данных дашборда');
    } finally {
      setLoading(false);
    }
  }, [setCampaigns, setAccounts]);

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

  const handlePauseAll = async () => {
    try {
      const res = await fetch('/api/campaigns/pause-all', { method: 'POST' });
      if (!res.ok) throw new Error('Ошибка приостановки кампаний');
      const data = await res.json();
      toast.success(data.message || `Приостановлено ${data.pausedCount} кампаний`);
      fetchData();
    } catch (err) {
      console.error('Error pausing campaigns:', err);
      toast.error('Не удалось приостановить кампании');
    }
  };

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

  const handleExportReport = async () => {
    try {
      toast.info('Формирование отчёта...');
      const res = await fetch('/api/reports/export/excel?type=dashboard');
      if (!res.ok) throw new Error('Ошибка экспорта отчёта');
      
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors min-w-0">
            <CardContent className="p-4 sm:p-6 min-w-0">
              <div className="flex items-center justify-between mb-4 min-w-0">
                <p className="text-sm text-[#8A8A8A] truncate">{kpi.title}</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="bg-[#14151A] border-[#2A2B32] min-w-0">
          <CardHeader className="flex flex-row items-center justify-between min-w-0">
            <div className="min-w-0">
              <CardTitle className="text-white flex items-center gap-2 truncate">
                <BarChart3 className="w-5 h-5 text-[#6C63FF] shrink-0" />
                Доход за 7 дней
              </CardTitle>
              <CardDescription className="text-[#8A8A8A]">Динамика по дням</CardDescription>
            </div>
            <div className="flex gap-1 sm:gap-2 shrink-0">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
                className={cn("h-8", chartType === 'line' ? 'bg-[#6C63FF]' : 'border-[#2A2B32] text-[#8A8A8A]')}
              >
                Линия
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
                className={cn("h-8", chartType === 'bar' ? 'bg-[#6C63FF]' : 'border-[#2A2B32] text-[#8A8A8A]')}
              >
                Столбцы
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportReport}
                className="border-[#2A2B32] text-[#8A8A8A] h-8"
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

        <Card className="bg-[#14151A] border-[#2A2B32] min-w-0">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#FFB800] shrink-0" />
              <span className="truncate">Лента активности</span>
            </CardTitle>
            <CardDescription className="text-[#8A8A8A]">Последние 20 событий</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <ScrollArea className="h-[250px]">
              {activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-[#1E1F26] hover:bg-[#2A2B32] transition-colors min-w-0"
                    >
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', getActivityColor(activity.type))}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white break-words">{activity.message}</p>
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
      <Card className="bg-[#14151A] border-[#2A2B32] min-w-0">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FFB800] shrink-0" />
            <span className="truncate">Быстрые действия</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Button
              onClick={() => useAppStore.getState().setCampaignModalOpen(true)}
              className="h-16 sm:h-20 flex flex-col bg-[#6C63FF] hover:bg-[#6C63FF]/80 min-w-0"
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2 shrink-0" />
              <span className="text-xs sm:text-sm truncate px-1">Запустить кампанию</span>
            </Button>
            <Button
              variant="outline"
              onClick={handlePauseAll}
              className="h-16 sm:h-20 flex flex-col border-[#FFB800] text-[#FFB800] hover:bg-[#FFB800]/10 min-w-0"
            >
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2 shrink-0" />
              <span className="text-xs sm:text-sm truncate px-1">Пауза всего</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleExportReport}
              className="h-16 sm:h-20 flex flex-col border-[#00D26A] text-[#00D26A] hover:bg-[#00D26A]/10 min-w-0"
            >
              <Download className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2 shrink-0" />
              <span className="text-xs sm:text-sm truncate px-1">Отчёт за сегодня</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleHealthCheck}
              className="h-16 sm:h-20 flex flex-col border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10 min-w-0"
            >
              <Eye className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2 shrink-0" />
              <span className="text-xs sm:text-sm truncate px-1">Проверить всё</span>
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

  const [formData, setFormData] = useState(defaultFormData);

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
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            startDate: formData.startDate ? new Date(formData.startDate) : undefined,
            endDate: formData.endDate ? new Date(formData.endDate) : undefined,
            userId: 'default-user',
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

  const handleAIAnalysis = async () => {
    if (campaigns.length === 0) {
      toast.error('Нет кампаний для анализа');
      return;
    }
    
    setActionLoading('ai-analysis');
    try {
      const campaignToAnalyze = campaigns.find(c => c.status === 'active') || campaigns[0];
      
      const res = await fetch('/api/ai/analyze-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaignToAnalyze.id,
          userId: 'default-user',
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
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
          <Input
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#14151A] border-[#2A2B32] text-white"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-[#14151A] border-[#2A2B32] text-white">
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
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white shrink-0"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Карточки кампаний */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors min-w-0">
            <CardHeader className="flex flex-row items-start justify-between pb-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn('w-3 h-3 rounded-full shrink-0', getStatusColor(campaign.status))} />
                <CardTitle className="text-lg text-white truncate">{campaign.name}</CardTitle>
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
                  <p className="text-[#8A8A8A]">Бюджет</p>
                  <p className="text-white font-medium">{campaign.budget.toLocaleString()} ₽</p>
                </div>
                <div>
                  <p className="text-[#8A8A8A]">Потрачено</p>
                  <p className="text-white font-medium">{campaign.spent.toLocaleString()} ₽</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-[#8A8A8A]">Доход</p>
                  <p className="text-[#00D26A] font-medium">{campaign.revenue.toLocaleString()} ₽</p>
                </div>
                <div>
                  <p className="text-[#8A8A8A]">Лиды</p>
                  <p className="text-white font-medium">{campaign.leadsCount}</p>
                </div>
                <div>
                  <p className="text-[#8A8A8A]">ROI</p>
                  <p className={cn(
                    'font-medium',
                    campaign.spent > 0 && ((campaign.revenue - campaign.spent) / campaign.spent * 100) >= 0
                      ? 'text-[#00D26A]'
                      : 'text-[#FF4D4D]'
                  )}>
                    {campaign.spent > 0 
                      ? (((campaign.revenue - campaign.spent) / campaign.spent) * 100).toFixed(1)
                      : '0'
                    }%
                  </p>
                </div>
              </div>

              <Progress
                value={campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0}
                className="h-1.5"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-[#8A8A8A]">
          <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
          <p>Нет кампаний</p>
          <Button
            onClick={() => handleOpenModal()}
            className="mt-4 bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать первую кампанию
          </Button>
        </div>
      )}

      {/* Диалог удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#14151A] border-[#2A2B32]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Удалить кампанию?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8A8A8A]">
              Вы уверены, что хотите удалить кампанию &quot;{campaignToDelete?.name}&quot;? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2A2B32] text-[#8A8A8A] hover:text-white">
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

      {/* Диалог создания/редактирования кампании */}
      <Dialog open={campaignModalOpen} onOpenChange={setCampaignModalOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCampaign ? 'Редактировать кампанию' : 'Новая кампания'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={modalTab} onValueChange={setModalTab}>
            <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
              <TabsTrigger value="offer" className="data-[state=active]:bg-[#6C63FF]">Оффер</TabsTrigger>
              <TabsTrigger value="accounts" className="data-[state=active]:bg-[#6C63FF]">Аккаунты</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-[#6C63FF]">Настройки</TabsTrigger>
            </TabsList>
            
            <TabsContent value="offer" className="space-y-4 mt-4">
              <div>
                <Label className="text-[#8A8A8A]">Название кампании *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название кампании"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#8A8A8A]">Тип *</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                      <SelectItem value="crypto">Крипта</SelectItem>
                      <SelectItem value="casino">Казино</SelectItem>
                      <SelectItem value="dating">Дейтинг</SelectItem>
                      <SelectItem value="nutra">Нутра</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#8A8A8A]">Ниша</Label>
                  <Input
                    value={formData.niche}
                    onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                    placeholder="Ниша"
                    className="bg-[#1E1F26] border-[#2A2B32] text-white mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[#8A8A8A]">Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание кампании"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white mt-1"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="accounts" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#8A8A8A]">Гео</Label>
                  <Input
                    value={formData.geo}
                    onChange={(e) => setFormData({ ...formData, geo: e.target.value })}
                    placeholder="RU, US, etc."
                    className="bg-[#1E1F26] border-[#2A2B32] text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[#8A8A8A]">Бюджет (₽)</Label>
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="bg-[#1E1F26] border-[#2A2B32] text-white mt-1"
                  />
                </div>
              </div>
              <p className="text-[#8A8A8A] text-sm">
                Выберите аккаунты для кампании в разделе &quot;Инфраструктура&quot; → &quot;Аккаунты&quot;
              </p>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#8A8A8A]">Дата начала</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="bg-[#1E1F26] border-[#2A2B32] text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[#8A8A8A]">Дата окончания</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="bg-[#1E1F26] border-[#2A2B32] text-white mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[#8A8A8A]">Статус</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectItem value="draft">Черновик</SelectItem>
                    <SelectItem value="active">Активна</SelectItem>
                    <SelectItem value="paused">Пауза</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseModal}
              className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
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
    </div>
  );
}

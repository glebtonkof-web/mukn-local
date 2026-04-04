'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Instagram,
  Plus,
  TrendingUp,
  Activity,
  DollarSign,
  MousePointer,
  Target,
  Play,
  Pause,
  BarChart3,
  Zap,
  Eye,
  RefreshCw,
  Settings,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Link,
  Film,
  MessageSquare,
  Users,
  Megaphone,
  Bot,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Globe,
  Clock,
  Hash,
  ExternalLink,
  Layers,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ==================== ТИПЫ ====================

interface TrafficCampaign {
  id: string;
  name: string;
  description?: string | null;
  sourceType: string;
  status: string;
  budget: number;
  spent: number;
  currency: string;
  linkClicks: number;
  conversions: number;
  revenue: number;
  cpc: number;
  roi: number;
  conversionRate: number;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  targetGeo?: string | null;
  targetAgeMin: number;
  targetAgeMax: number;
  targetGender?: string | null;
  targetInterests?: string | null;
  contentTemplateId?: string | null;
  aiService?: string | null;
  aiServiceConfig?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ContentTemplate {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  content: string;
  variables?: string[] | null;
  previewUrl?: string | null;
  category?: string | null;
  tags?: string[] | null;
  avgEngagement: number;
  usageCount: number;
  successRate: number;
  isPublic: boolean;
}

interface AIService {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  apiKey?: string | null;
  apiEndpoint?: string | null;
  isActive: boolean;
  features?: string[] | null;
  pricing?: Record<string, number> | null;
  limits?: Record<string, number> | null;
  totalSpent: number;
  totalCampaigns: number;
  successRate: number;
  lastUsedAt?: Date | string | null;
}

interface AnalyticsData {
  totals: {
    totalImpressions: number;
    totalReach: number;
    totalLinkClicks: number;
    totalProfileVisits: number;
    totalFollows: number;
    totalConversions: number;
    totalRevenue: number;
  };
  metrics: {
    ctr: string;
    conversionRate: string;
    avgCtr: number;
    avgConversionRate: number;
    avgCpc: number;
    avgCpa: number;
    avgRoi: number;
  };
  sourceBreakdown: {
    bioLink: { clicks: number };
    reels: { views: number; clicks: number; ctr: string };
    stories: { views: number; clicks: number; ctr: string };
    dm: { sent: number; replied: number; replyRate: string };
    collaboration: { reach: number };
    ads: { impressions: number; clicks: number; ctr: string };
  };
  trends: {
    daily: Array<{
      date: Date | string;
      _sum: {
        impressions: number | null;
        linkClicks: number | null;
        conversions: number | null;
        revenue: number | null;
      };
    }>;
  };
}

// ==================== КОНСТАНТЫ ====================

const SOURCE_TYPES = [
  { value: 'bio_link', label: 'Bio Link', icon: Link, color: '#6C63FF' },
  { value: 'reels', label: 'Reels с CTA', icon: Film, color: '#FF6B9D' },
  { value: 'stories', label: 'Stories со ссылками', icon: Instagram, color: '#00D26A' },
  { value: 'dm', label: 'DM рассылки', icon: MessageSquare, color: '#FFB800' },
  { value: 'collaboration', label: 'Коллаборации', icon: Users, color: '#00D4AA' },
  { value: 'ads', label: 'Instagram Ads', icon: Megaphone, color: '#FF4D4D' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#8A8A8A]',
  active: 'bg-[#00D26A]',
  paused: 'bg-[#FFB800]',
  completed: 'bg-[#6C63FF]',
  error: 'bg-[#FF4D4D]',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  active: 'Активна',
  paused: 'Пауза',
  completed: 'Завершена',
  error: 'Ошибка',
};

const CHART_COLORS = ['#6C63FF', '#FF6B9D', '#00D26A', '#FFB800', '#00D4AA', '#FF4D4D'];

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function TrafficPourView() {
  const [activeTab, setActiveTab] = useState('overview');
  const [campaigns, setCampaigns] = useState<TrafficCampaign[]>([]);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [aiServices, setAIServices] = useState<AIService[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Модальные окна
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<TrafficCampaign | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ContentTemplate | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'campaign' | 'template'; id: string } | null>(null);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all');
  const [templateTypeFilter, setTemplateTypeFilter] = useState('all');

  // Загрузка данных
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignsRes, templatesRes, aiServicesRes, analyticsRes] = await Promise.all([
        fetch('/api/traffic/instagram-pour/campaigns'),
        fetch('/api/traffic/instagram-pour/templates'),
        fetch('/api/traffic/instagram-pour/ai-services'),
        fetch('/api/traffic/instagram-pour/analytics'),
      ]);

      if (!campaignsRes.ok) throw new Error('Ошибка загрузки кампаний');
      if (!templatesRes.ok) throw new Error('Ошибка загрузки шаблонов');
      if (!aiServicesRes.ok) throw new Error('Ошибка загрузки AI сервисов');

      const campaignsData = await campaignsRes.json();
      const templatesData = await templatesRes.json();
      const aiServicesData = await aiServicesRes.json();
      const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;

      setCampaigns(campaignsData.campaigns || []);
      setTemplates(templatesData.templates || []);
      setAIServices(aiServicesData.services || []);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Фильтрация кампаний
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesSourceType = sourceTypeFilter === 'all' || c.sourceType === sourceTypeFilter;
      return matchesSearch && matchesStatus && matchesSourceType;
    });
  }, [campaigns, searchQuery, statusFilter, sourceTypeFilter]);

  // Фильтрация шаблонов
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = templateTypeFilter === 'all' || t.type === templateTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [templates, searchQuery, templateTypeFilter]);

  // Статистика
  const stats = useMemo(() => {
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.linkClicks, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
    const avgRoi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent * 100) : 0;

    return {
      activeCampaigns,
      totalBudget,
      totalSpent,
      totalClicks,
      totalConversions,
      totalRevenue,
      avgRoi,
    };
  }, [campaigns]);

  // Данные для графика
  const chartData = useMemo(() => {
    if (!analytics?.trends?.daily) return [];
    return analytics.trends.daily.map((day) => ({
      date: new Date(day.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      impressions: day._sum.impressions || 0,
      clicks: day._sum.linkClicks || 0,
      conversions: day._sum.conversions || 0,
      revenue: day._sum.revenue || 0,
    }));
  }, [analytics]);

  // Данные для круговой диаграммы источников
  const sourcePieData = useMemo(() => {
    if (!analytics?.sourceBreakdown) return [];
    return [
      { name: 'Bio Link', value: analytics.sourceBreakdown.bioLink.clicks, color: '#6C63FF' },
      { name: 'Reels', value: analytics.sourceBreakdown.reels.clicks, color: '#FF6B9D' },
      { name: 'Stories', value: analytics.sourceBreakdown.stories.clicks, color: '#00D26A' },
      { name: 'DM', value: analytics.sourceBreakdown.dm.replied, color: '#FFB800' },
      { name: 'Collabs', value: analytics.sourceBreakdown.collaboration.reach, color: '#00D4AA' },
      { name: 'Ads', value: analytics.sourceBreakdown.ads.clicks, color: '#FF4D4D' },
    ].filter(d => d.value > 0);
  }, [analytics]);

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
        <XCircle className="w-12 h-12 text-[#FF4D4D]" />
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Instagram className="w-8 h-8 text-[#FF6B9D]" />
            Залив трафика Instagram
          </h1>
          <p className="text-[#8A8A8A]">Управление источниками трафика и кампаниями</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button
            onClick={() => { setEditingCampaign(null); setCampaignModalOpen(true); }}
            className="bg-[#FF6B9D] hover:bg-[#FF6B9D]/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать кампанию
          </Button>
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#8A8A8A]">Активных кампаний</p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#6C63FF]/20">
                <Target className="w-5 h-5 text-[#6C63FF]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats.activeCampaigns}</p>
            <p className="text-xs text-[#8A8A8A] mt-1">из {campaigns.length} всего</p>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#8A8A8A]">Всего кликов</p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#FF6B9D]/20">
                <MousePointer className="w-5 h-5 text-[#FF6B9D]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalClicks.toLocaleString()}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-[#8A8A8A]">CTR: {analytics?.metrics.ctr || '0'}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#8A8A8A]">Конверсии</p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#00D26A]/20">
                <TrendingUp className="w-5 h-5 text-[#00D26A]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalConversions.toLocaleString()}</p>
            <p className="text-xs text-[#00D26A] mt-1">
              Conv. Rate: {analytics?.metrics.conversionRate || '0'}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#8A8A8A]">ROI</p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#FFB800]/20">
                <DollarSign className="w-5 h-5 text-[#FFB800]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats.avgRoi.toFixed(1)}%</p>
            <p className="text-xs text-[#8A8A8A] mt-1">
              Доход: ${stats.totalRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Табы */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#14151A] border-[#2A2B32]">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#6C63FF]">
            <BarChart3 className="w-4 h-4 mr-2" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-[#6C63FF]">
            <Target className="w-4 h-4 mr-2" />
            Кампании
          </TabsTrigger>
          <TabsTrigger value="sources" className="data-[state=active]:bg-[#6C63FF]">
            <Layers className="w-4 h-4 mr-2" />
            Источники
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-[#6C63FF]">
            <Film className="w-4 h-4 mr-2" />
            Шаблоны
          </TabsTrigger>
          <TabsTrigger value="ai-services" className="data-[state=active]:bg-[#6C63FF]">
            <Bot className="w-4 h-4 mr-2" />
            AI Сервисы
          </TabsTrigger>
        </TabsList>

        {/* Обзор */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* График трафика */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#6C63FF]" />
                  Динамика трафика
                </CardTitle>
                <CardDescription className="text-[#8A8A8A]">Клики и конверсии за период</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2B32" />
                        <XAxis dataKey="date" stroke="#8A8A8A" />
                        <YAxis stroke="#8A8A8A" />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#14151A', border: '1px solid #2A2B32', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        <Bar dataKey="clicks" fill="#6C63FF" name="Клики" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="conversions" fill="#00D26A" name="Конверсии" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-[#8A8A8A]">
                      Нет данных для отображения
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Распределение по источникам */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#FF6B9D]" />
                  Распределение по источникам
                </CardTitle>
                <CardDescription className="text-[#8A8A8A]">Эффективность каналов</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {sourcePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourcePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {sourcePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#14151A', border: '1px solid #2A2B32', borderRadius: '8px' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-[#8A8A8A]">
                      Нет данных для отображения
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Статистика по источникам */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white">Детализация по источникам</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {SOURCE_TYPES.map((source) => {
                  const Icon = source.icon;
                  const stats = analytics?.sourceBreakdown?.[source.value === 'bio_link' ? 'bioLink' : source.value];
                  return (
                    <div key={source.value} className="p-4 rounded-lg bg-[#1E1F26] border border-[#2A2B32]">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-5 h-5" style={{ color: source.color }} />
                        <span className="text-sm text-white font-medium">{source.label}</span>
                      </div>
                      <div className="space-y-1 text-xs text-[#8A8A8A]">
                        {source.value === 'bio_link' && (
                          <p>Клики: {stats?.clicks || 0}</p>
                        )}
                        {source.value === 'reels' && (
                          <>
                            <p>Просмотры: {stats?.views || 0}</p>
                            <p>CTR: {stats?.ctr || '0'}%</p>
                          </>
                        )}
                        {source.value === 'stories' && (
                          <>
                            <p>Просмотры: {stats?.views || 0}</p>
                            <p>CTR: {stats?.ctr || '0'}%</p>
                          </>
                        )}
                        {source.value === 'dm' && (
                          <>
                            <p>Отправлено: {stats?.sent || 0}</p>
                            <p>Ответы: {stats?.replyRate || '0'}%</p>
                          </>
                        )}
                        {source.value === 'collaboration' && (
                          <p>Охват: {stats?.reach || 0}</p>
                        )}
                        {source.value === 'ads' && (
                          <>
                            <p>Показы: {stats?.impressions || 0}</p>
                            <p>CTR: {stats?.ctr || '0'}%</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Активные кампании */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Активные кампании</CardTitle>
                <CardDescription className="text-[#8A8A8A]">Топ-5 по эффективности</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('campaigns')} className="border-[#2A2B32]">
                Все кампании
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {campaigns.filter(c => c.status === 'active').slice(0, 5).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1E1F26] hover:bg-[#2A2B32] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-2 h-2 rounded-full', STATUS_COLORS[campaign.status])} />
                      <div>
                        <p className="text-sm text-white font-medium">{campaign.name}</p>
                        <p className="text-xs text-[#8A8A8A]">{SOURCE_TYPES.find(s => s.value === campaign.sourceType)?.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-white">{campaign.linkClicks} кликов</p>
                        <p className="text-xs text-[#8A8A8A]">{campaign.conversions} конверсий</p>
                      </div>
                      <Badge className={campaign.roi >= 0 ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-[#FF4D4D]/20 text-[#FF4D4D]'}>
                        ROI: {campaign.roi.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
                {campaigns.filter(c => c.status === 'active').length === 0 && (
                  <div className="text-center py-8 text-[#8A8A8A]">
                    Нет активных кампаний
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Кампании */}
        <TabsContent value="campaigns" className="space-y-4">
          {/* Фильтры */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
              <Input
                placeholder="Поиск кампаний..."
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
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="paused">На паузе</SelectItem>
                <SelectItem value="draft">Черновики</SelectItem>
                <SelectItem value="completed">Завершены</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
              <SelectTrigger className="w-40 bg-[#14151A] border-[#2A2B32] text-white">
                <SelectValue placeholder="Источник" />
              </SelectTrigger>
              <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                <SelectItem value="all">Все источники</SelectItem>
                {SOURCE_TYPES.map((source) => (
                  <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Таблица кампаний */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2A2B32] hover:bg-[#1E1F26]">
                    <TableHead className="text-[#8A8A8A]">Кампания</TableHead>
                    <TableHead className="text-[#8A8A8A]">Источник</TableHead>
                    <TableHead className="text-[#8A8A8A]">Статус</TableHead>
                    <TableHead className="text-[#8A8A8A]">Бюджет</TableHead>
                    <TableHead className="text-[#8A8A8A]">Клики</TableHead>
                    <TableHead className="text-[#8A8A8A]">Конверсии</TableHead>
                    <TableHead className="text-[#8A8A8A]">ROI</TableHead>
                    <TableHead className="text-[#8A8A8A]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id} className="border-[#2A2B32] hover:bg-[#1E1F26]">
                      <TableCell>
                        <div>
                          <p className="text-white font-medium">{campaign.name}</p>
                          {campaign.aiService && (
                            <p className="text-xs text-[#8A8A8A]">AI: {campaign.aiService}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const source = SOURCE_TYPES.find(s => s.value === campaign.sourceType);
                            if (!source) return null;
                            const Icon = source.icon;
                            return (
                              <>
                                <Icon className="w-4 h-4" style={{ color: source.color }} />
                                <span className="text-white">{source.label}</span>
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-white', STATUS_COLORS[campaign.status])}>
                          {STATUS_LABELS[campaign.status] || campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white">${campaign.spent.toFixed(2)}</p>
                          <p className="text-xs text-[#8A8A8A]">из ${campaign.budget.toFixed(2)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{campaign.linkClicks.toLocaleString()}</TableCell>
                      <TableCell className="text-white">{campaign.conversions.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={campaign.roi >= 0 ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-[#FF4D4D]/20 text-[#FF4D4D]'}>
                          {campaign.roi.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#8A8A8A] hover:text-white">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#14151A] border-[#2A2B32]">
                            <DropdownMenuItem 
                              onClick={() => { setEditingCampaign(campaign); setCampaignModalOpen(true); }}
                              className="text-white hover:bg-[#1E1F26]"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white hover:bg-[#1E1F26]">
                              {campaign.status === 'active' ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                              {campaign.status === 'active' ? 'Пауза' : 'Запустить'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white hover:bg-[#1E1F26]">
                              <Copy className="w-4 h-4 mr-2" />
                              Дублировать
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => { setItemToDelete({ type: 'campaign', id: campaign.id }); setDeleteDialogOpen(true); }}
                              className="text-[#FF4D4D] hover:bg-[#1E1F26]"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredCampaigns.length === 0 && (
                <div className="text-center py-8 text-[#8A8A8A]">
                  Нет кампаний по заданным фильтрам
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Источники трафика */}
        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SOURCE_TYPES.map((source) => {
              const Icon = source.icon;
              const campaignsCount = campaigns.filter(c => c.sourceType === source.value).length;
              const activeCampaigns = campaigns.filter(c => c.sourceType === source.value && c.status === 'active');
              const totalClicks = activeCampaigns.reduce((sum, c) => sum + c.linkClicks, 0);
              const totalConversions = activeCampaigns.reduce((sum, c) => sum + c.conversions, 0);
              const avgRoi = activeCampaigns.length > 0 
                ? activeCampaigns.reduce((sum, c) => sum + c.roi, 0) / activeCampaigns.length 
                : 0;

              return (
                <Card key={source.value} className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${source.color}20` }}>
                          <Icon className="w-5 h-5" style={{ color: source.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">{source.label}</CardTitle>
                          <CardDescription className="text-[#8A8A8A]">{campaignsCount} кампаний</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xl font-bold text-white">{totalClicks.toLocaleString()}</p>
                        <p className="text-xs text-[#8A8A8A]">Кликов</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-white">{totalConversions.toLocaleString()}</p>
                        <p className="text-xs text-[#8A8A8A]">Конверсий</p>
                      </div>
                      <div>
                        <p className={cn('text-xl font-bold', avgRoi >= 0 ? 'text-[#00D26A]' : 'text-[#FF4D4D]')}>
                          {avgRoi.toFixed(1)}%
                        </p>
                        <p className="text-xs text-[#8A8A8A]">ROI</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                      onClick={() => { setEditingCampaign(null); setCampaignModalOpen(true); }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Создать кампанию
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Шаблоны контента */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <Select value={templateTypeFilter} onValueChange={setTemplateTypeFilter}>
                <SelectTrigger className="w-40 bg-[#14151A] border-[#2A2B32] text-white">
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="reels">Reels</SelectItem>
                  <SelectItem value="stories">Stories</SelectItem>
                  <SelectItem value="cta">CTA фразы</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setEditingTemplate(null); setTemplateModalOpen(true); }} className="bg-[#6C63FF]">
              <Plus className="w-4 h-4 mr-2" />
              Создать шаблон
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
                      {template.type === 'reels' ? 'Reels' : template.type === 'stories' ? 'Stories' : 'CTA'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#8A8A8A] hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#14151A] border-[#2A2B32]">
                        <DropdownMenuItem 
                          onClick={() => { setEditingTemplate(template); setTemplateModalOpen(true); }}
                          className="text-white hover:bg-[#1E1F26]"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => { setItemToDelete({ type: 'template', id: template.id }); setDeleteDialogOpen(true); }}
                          className="text-[#FF4D4D] hover:bg-[#1E1F26]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-white">{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription className="text-[#8A8A8A]">{template.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-[#1E1F26] max-h-32 overflow-y-auto">
                    <p className="text-sm text-[#8A8A8A] whitespace-pre-wrap">{template.content}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#8A8A8A]">
                    <span>Использований: {template.usageCount}</span>
                    <span>Успешность: {template.successRate.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-[#8A8A8A]">
              <Film className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Нет шаблонов</p>
              <Button variant="outline" className="mt-4" onClick={() => { setEditingTemplate(null); setTemplateModalOpen(true); }}>
                Создать первый шаблон
              </Button>
            </div>
          )}
        </TabsContent>

        {/* AI Сервисы */}
        <TabsContent value="ai-services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiServices.map((service) => (
              <Card key={service.id} className="bg-[#14151A] border-[#2A2B32]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        service.isActive ? 'bg-[#00D26A]/20' : 'bg-[#8A8A8A]/20'
                      )}>
                        <Bot className={cn('w-5 h-5', service.isActive ? 'text-[#00D26A]' : 'text-[#8A8A8A]')} />
                      </div>
                      <div>
                        <CardTitle className="text-white">{service.displayName}</CardTitle>
                        <Badge className={service.isActive ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-[#8A8A8A]/20 text-[#8A8A8A]'}>
                          {service.isActive ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-[#8A8A8A]">{service.description}</p>
                  
                  {service.features && service.features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {service.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="border-[#2A2B32] text-[#8A8A8A] text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#2A2B32]">
                    <div>
                      <p className="text-xs text-[#8A8A8A]">Кампаний</p>
                      <p className="text-lg font-bold text-white">{service.totalCampaigns}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8A8A8A]">Потрачено</p>
                      <p className="text-lg font-bold text-white">${service.totalSpent.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-[#2A2B32]"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/traffic/instagram-pour/ai-services', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: service.name, isActive: !service.isActive }),
                          });
                          if (res.ok) {
                            toast.success(service.isActive ? 'Сервис отключен' : 'Сервис активирован');
                            fetchData();
                          }
                        } catch {
                          toast.error('Ошибка изменения статуса');
                        }
                      }}
                    >
                      {service.isActive ? 'Отключить' : 'Активировать'}
                    </Button>
                    <Button variant="outline" className="border-[#2A2B32]">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Модальное окно создания/редактирования кампании */}
      <CampaignModal
        open={campaignModalOpen}
        onOpenChange={setCampaignModalOpen}
        campaign={editingCampaign}
        templates={templates}
        aiServices={aiServices}
        onSuccess={() => {
          setCampaignModalOpen(false);
          fetchData();
        }}
      />

      {/* Модальное окно создания/редактирования шаблона */}
      <TemplateModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        template={editingTemplate}
        onSuccess={() => {
          setTemplateModalOpen(false);
          fetchData();
        }}
      />

      {/* Диалог удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#14151A] border-[#2A2B32]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8A8A8A]">
              Вы уверены, что хотите удалить этот элемент? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1E1F26] border-[#2A2B32] text-white hover:bg-[#2A2B32]">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#FF4D4D] hover:bg-[#FF4D4D]/80"
              onClick={async () => {
                if (!itemToDelete) return;
                try {
                  const endpoint = itemToDelete.type === 'campaign' 
                    ? '/api/traffic/instagram-pour/campaigns'
                    : '/api/traffic/instagram-pour/templates';
                  const res = await fetch(`${endpoint}?id=${itemToDelete.id}`, { method: 'DELETE' });
                  if (res.ok) {
                    toast.success('Удалено успешно');
                    fetchData();
                  }
                } catch {
                  toast.error('Ошибка удаления');
                }
                setDeleteDialogOpen(false);
                setItemToDelete(null);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== МОДАЛЬНОЕ ОКНО КАМПАНИИ ====================

interface CampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: TrafficCampaign | null;
  templates: ContentTemplate[];
  aiServices: AIService[];
  onSuccess: () => void;
}

function CampaignModal({ open, onOpenChange, campaign, templates, aiServices, onSuccess }: CampaignModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sourceType: 'bio_link',
    status: 'draft',
    budget: 0,
    currency: 'USD',
    
    // UTM
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    utmTerm: '',
    
    // Targeting
    targetGeo: '',
    targetAgeMin: 18,
    targetAgeMax: 45,
    targetGender: 'all',
    targetInterests: '',
    
    // Content & AI
    contentTemplateId: '',
    aiService: '',
    
    // Schedule
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        description: campaign.description || '',
        sourceType: campaign.sourceType,
        status: campaign.status,
        budget: campaign.budget,
        currency: campaign.currency,
        utmSource: campaign.utmSource || '',
        utmMedium: campaign.utmMedium || '',
        utmCampaign: campaign.utmCampaign || '',
        utmContent: campaign.utmContent || '',
        utmTerm: campaign.utmTerm || '',
        targetGeo: campaign.targetGeo || '',
        targetAgeMin: campaign.targetAgeMin,
        targetAgeMax: campaign.targetAgeMax,
        targetGender: campaign.targetGender || 'all',
        targetInterests: campaign.targetInterests || '',
        contentTemplateId: campaign.contentTemplateId || '',
        aiService: campaign.aiService || '',
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        sourceType: 'bio_link',
        status: 'draft',
        budget: 0,
        currency: 'USD',
        utmSource: '',
        utmMedium: '',
        utmCampaign: '',
        utmContent: '',
        utmTerm: '',
        targetGeo: '',
        targetAgeMin: 18,
        targetAgeMax: 45,
        targetGender: 'all',
        targetInterests: '',
        contentTemplateId: '',
        aiService: '',
        startDate: '',
        endDate: '',
      });
    }
    setActiveTab('basic');
  }, [campaign, open]);

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Введите название кампании');
      return;
    }

    setLoading(true);
    try {
      const url = '/api/traffic/instagram-pour/campaigns';
      const method = campaign ? 'PUT' : 'POST';
      const body = campaign ? { id: campaign.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ошибка сохранения');
      }

      toast.success(campaign ? 'Кампания обновлена' : 'Кампания создана');
      onSuccess();
    } catch (err) {
      console.error('Error saving campaign:', err);
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#14151A] border-[#2A2B32]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {campaign ? 'Редактирование кампании' : 'Создание кампании'}
          </DialogTitle>
          <DialogDescription className="text-[#8A8A8A]">
            Настройте параметры залива трафика из Instagram
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="bg-[#1E1F26] w-full justify-start">
            <TabsTrigger value="basic" className="data-[state=active]:bg-[#6C63FF]">Основное</TabsTrigger>
            <TabsTrigger value="utm" className="data-[state=active]:bg-[#6C63FF]">UTM-метки</TabsTrigger>
            <TabsTrigger value="targeting" className="data-[state=active]:bg-[#6C63FF]">Таргетинг</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-[#6C63FF]">Контент</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-white">Название кампании *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
                placeholder="Моя кампания"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
                placeholder="Описание кампании..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Источник трафика *</Label>
                <Select value={formData.sourceType} onValueChange={(v) => setFormData({ ...formData, sourceType: v })}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {SOURCE_TYPES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        <div className="flex items-center gap-2">
                          <source.icon className="w-4 h-4" style={{ color: source.color }} />
                          {source.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Статус</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectItem value="draft">Черновик</SelectItem>
                    <SelectItem value="active">Активна</SelectItem>
                    <SelectItem value="paused">Пауза</SelectItem>
                    <SelectItem value="completed">Завершена</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Бюджет</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                    className="bg-[#1E1F26] border-[#2A2B32] text-white"
                  />
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                    <SelectTrigger className="w-20 bg-[#1E1F26] border-[#2A2B32] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="RUB">RUB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Дата начала</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Дата окончания</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="utm" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  UTM Source
                </Label>
                <Input
                  value={formData.utmSource}
                  onChange={(e) => setFormData({ ...formData, utmSource: e.target.value })}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                  placeholder="instagram"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">UTM Medium</Label>
                <Input
                  value={formData.utmMedium}
                  onChange={(e) => setFormData({ ...formData, utmMedium: e.target.value })}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                  placeholder="social"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">UTM Campaign</Label>
                <Input
                  value={formData.utmCampaign}
                  onChange={(e) => setFormData({ ...formData, utmCampaign: e.target.value })}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                  placeholder="spring_sale"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">UTM Content</Label>
                <Input
                  value={formData.utmContent}
                  onChange={(e) => setFormData({ ...formData, utmContent: e.target.value })}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                  placeholder="reel_cta"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">UTM Term</Label>
              <Input
                value={formData.utmTerm}
                onChange={(e) => setFormData({ ...formData, utmTerm: e.target.value })}
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
                placeholder="keyword"
              />
            </div>
          </TabsContent>

          <TabsContent value="targeting" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Гео
                </Label>
                <Input
                  value={formData.targetGeo}
                  onChange={(e) => setFormData({ ...formData, targetGeo: e.target.value })}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                  placeholder="RU, US, DE"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Пол</Label>
                <Select value={formData.targetGender} onValueChange={(v) => setFormData({ ...formData, targetGender: v })}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="male">Мужчины</SelectItem>
                    <SelectItem value="female">Женщины</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-white">Возраст: {formData.targetAgeMin} - {formData.targetAgeMax}</Label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-[#8A8A8A]">От</Label>
                  <Slider
                    value={[formData.targetAgeMin]}
                    onValueChange={([v]) => setFormData({ ...formData, targetAgeMin: v })}
                    min={18}
                    max={65}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-[#8A8A8A]">До</Label>
                  <Slider
                    value={[formData.targetAgeMax]}
                    onValueChange={([v]) => setFormData({ ...formData, targetAgeMax: v })}
                    min={18}
                    max={65}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Интересы</Label>
              <Input
                value={formData.targetInterests}
                onChange={(e) => setFormData({ ...formData, targetInterests: e.target.value })}
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
                placeholder="fashion, travel, fitness"
              />
              <p className="text-xs text-[#8A8A8A]">Через запятую</p>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <Film className="w-4 h-4" />
                Шаблон контента
              </Label>
              <Select 
                value={formData.contentTemplateId} 
                onValueChange={(v) => setFormData({ ...formData, contentTemplateId: v })}
              >
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <Bot className="w-4 h-4" />
                AI Сервис
              </Label>
              <Select 
                value={formData.aiService} 
                onValueChange={(v) => setFormData({ ...formData, aiService: v })}
              >
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                  <SelectValue placeholder="Выберите AI сервис" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  {aiServices.filter(s => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#2A2B32] text-[#8A8A8A]">
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-[#6C63FF] hover:bg-[#6C63FF]/80">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {campaign ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== МОДАЛЬНОЕ ОКНО ШАБЛОНА ====================

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ContentTemplate | null;
  onSuccess: () => void;
}

function TemplateModal({ open, onOpenChange, template, onSuccess }: TemplateModalProps) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'reels',
    description: '',
    content: '',
    category: '',
    isPublic: false,
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        type: template.type,
        description: template.description || '',
        content: template.content,
        category: template.category || '',
        isPublic: template.isPublic,
      });
    } else {
      setFormData({
        name: '',
        type: 'reels',
        description: '',
        content: '',
        category: '',
        isPublic: false,
      });
    }
  }, [template, open]);

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Введите название шаблона');
      return;
    }
    if (!formData.content) {
      toast.error('Введите содержимое шаблона');
      return;
    }

    setLoading(true);
    try {
      const url = '/api/traffic/instagram-pour/templates';
      const method = template ? 'PUT' : 'POST';
      const body = template ? { id: template.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ошибка сохранения');
      }

      toast.success(template ? 'Шаблон обновлен' : 'Шаблон создан');
      onSuccess();
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#14151A] border-[#2A2B32]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {template ? 'Редактирование шаблона' : 'Создание шаблона'}
          </DialogTitle>
          <DialogDescription className="text-[#8A8A8A]">
            Шаблоны для Reels, Stories и CTA фраз
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-white">Название *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-[#1E1F26] border-[#2A2B32] text-white"
              placeholder="Мой шаблон"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Тип</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                <SelectItem value="reels">Reels</SelectItem>
                <SelectItem value="stories">Stories</SelectItem>
                <SelectItem value="cta">CTA фразы</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Описание</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-[#1E1F26] border-[#2A2B32] text-white"
              placeholder="Краткое описание"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Содержимое *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[150px]"
              placeholder="Текст или структура шаблона..."
            />
            <p className="text-xs text-[#8A8A8A]">Используйте {'{переменные}'} для динамического контента</p>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Категория</Label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="bg-[#1E1F26] border-[#2A2B32] text-white"
              placeholder="crypto, dating, casino"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: !!checked })}
            />
            <Label htmlFor="isPublic" className="text-white text-sm">Публичный шаблон</Label>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#2A2B32] text-[#8A8A8A]">
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-[#6C63FF] hover:bg-[#6C63FF]/80">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {template ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TrafficPourView;

'use client';

import { useState, useMemo } from 'react';
import { useAppStore, Offer } from '@/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  MousePointer,
  Users,
  BarChart3,
  Activity,
  Link2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  GitBranch,
  Play,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Extended Offer type with additional fields for UI
interface OfferWithDetails extends Offer {
  network?: string;
  niche?: string;
  geo?: string;
  roi?: number;
  conversion?: number;
  epc?: number;
}

// CPA Network type
interface CPANetwork {
  id: string;
  name: string;
  logo?: string;
  status: 'connected' | 'disconnected' | 'error';
  offersCount: number;
  lastSync?: Date;
}

// A/B Test type
interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed';
  offerId: string;
  variants: ABTestVariant[];
  startDate?: Date;
  endDate?: Date;
  winner?: string;
}

interface ABTestVariant {
  id: string;
  name: string;
  trafficPercent: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

// Demo data
const demoOffers: OfferWithDetails[] = [
  {
    id: '1',
    name: 'Crypto Trading Platform',
    network: 'Admitad',
    affiliateLink: 'https://example.com/crypto',
    niche: 'crypto',
    geo: 'RU',
    payout: 150,
    currency: 'USD',
    status: 'active',
    clicks: 2450,
    leads: 89,
    revenue: 13350,
    roi: 245,
    conversion: 3.6,
    epc: 5.45,
  },
  {
    id: '2',
    name: 'Online Casino Premium',
    network: 'CPALead',
    affiliateLink: 'https://example.com/casino',
    niche: 'gambling',
    geo: 'RU',
    payout: 200,
    currency: 'USD',
    status: 'active',
    clicks: 1890,
    leads: 67,
    revenue: 13400,
    roi: 312,
    conversion: 3.5,
    epc: 7.09,
  },
  {
    id: '3',
    name: 'Weight Loss Supplement',
    network: 'Cashbox',
    affiliateLink: 'https://example.com/nutra',
    niche: 'nutra',
    geo: 'RU',
    payout: 45,
    currency: 'USD',
    status: 'active',
    clicks: 3200,
    leads: 156,
    revenue: 7020,
    roi: 156,
    conversion: 4.9,
    epc: 2.19,
  },
  {
    id: '4',
    name: 'Dating App Premium',
    network: 'Admitad',
    affiliateLink: 'https://example.com/dating',
    niche: 'bait',
    geo: 'RU',
    payout: 80,
    currency: 'USD',
    status: 'paused',
    clicks: 890,
    leads: 23,
    revenue: 1840,
    roi: 89,
    conversion: 2.6,
    epc: 2.07,
  },
  {
    id: '5',
    name: 'Forex Trading Course',
    network: 'CPALead',
    affiliateLink: 'https://example.com/forex',
    niche: 'crypto',
    geo: 'RU',
    payout: 120,
    currency: 'USD',
    status: 'active',
    clicks: 1560,
    leads: 45,
    revenue: 5400,
    roi: 178,
    conversion: 2.9,
    epc: 3.46,
  },
];

const demoNetworks: CPANetwork[] = [
  { id: '1', name: 'Admitad', status: 'connected', offersCount: 150, lastSync: new Date() },
  { id: '2', name: 'CPALead', status: 'connected', offersCount: 89, lastSync: new Date() },
  { id: '3', name: 'Cashbox', status: 'disconnected', offersCount: 0 },
  { id: '4', name: 'ClickDealer', status: 'error', offersCount: 23 },
];

const demoABTests: ABTest[] = [
  {
    id: '1',
    name: 'Crypto Landing Page Test',
    status: 'running',
    offerId: '1',
    startDate: new Date(2025, 0, 15),
    variants: [
      { id: 'a', name: 'Вариант A', trafficPercent: 50, clicks: 1200, leads: 45, conversions: 12, revenue: 1800, conversionRate: 3.75 },
      { id: 'b', name: 'Вариант B', trafficPercent: 50, clicks: 1250, leads: 52, conversions: 18, revenue: 2700, conversionRate: 4.16 },
    ],
  },
  {
    id: '2',
    name: 'Casino Banner Test',
    status: 'completed',
    offerId: '2',
    startDate: new Date(2025, 0, 10),
    endDate: new Date(2025, 0, 17),
    winner: 'b',
    variants: [
      { id: 'a', name: 'Вариант A', trafficPercent: 50, clicks: 800, leads: 28, conversions: 8, revenue: 1600, conversionRate: 3.5 },
      { id: 'b', name: 'Вариант B', trafficPercent: 50, clicks: 820, leads: 41, conversions: 14, revenue: 2800, conversionRate: 5.0 },
    ],
  },
];

// Performance chart data
const performanceData = [
  { date: 'Пн', clicks: 320, leads: 12, revenue: 1800 },
  { date: 'Вт', clicks: 280, leads: 15, revenue: 2250 },
  { date: 'Ср', clicks: 450, leads: 22, revenue: 3300 },
  { date: 'Чт', clicks: 380, leads: 18, revenue: 2700 },
  { date: 'Пт', clicks: 420, leads: 25, revenue: 3750 },
  { date: 'Сб', clicks: 290, leads: 14, revenue: 2100 },
  { date: 'Вс', clicks: 350, leads: 19, revenue: 2850 },
];

// Niche colors
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

export function OffersManager() {
  const { offers, setOffers } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNetwork, setFilterNetwork] = useState<string>('all');
  const [filterNiche, setFilterNiche] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOffer, setSelectedOffer] = useState<OfferWithDetails | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isABTestDialogOpen, setIsABTestDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('offers');
  const [offersList] = useState<OfferWithDetails[]>(demoOffers);
  const [networks] = useState<CPANetwork[]>(demoNetworks);
  const [abTests, setABTests] = useState<ABTest[]>(demoABTests);

  // Filter offers
  const filteredOffers = useMemo(() => {
    return offersList.filter(offer => {
      if (searchQuery && !offer.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterNetwork !== 'all' && offer.network !== filterNetwork) return false;
      if (filterNiche !== 'all' && offer.niche !== filterNiche) return false;
      if (filterStatus !== 'all' && offer.status !== filterStatus) return false;
      return true;
    });
  }, [offersList, searchQuery, filterNetwork, filterNiche, filterStatus]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalClicks = offersList.reduce((sum, o) => sum + o.clicks, 0);
    const totalLeads = offersList.reduce((sum, o) => sum + o.leads, 0);
    const totalRevenue = offersList.reduce((sum, o) => sum + o.revenue, 0);
    const avgROI = offersList.reduce((sum, o) => sum + (o.roi || 0), 0) / offersList.length;
    return { totalClicks, totalLeads, totalRevenue, avgROI };
  }, [offersList]);

  // Handle offer actions
  const handleEditOffer = (offer: OfferWithDetails) => {
    setSelectedOffer(offer);
    setIsCreateDialogOpen(true);
  };

  const handleDeleteOffer = (offerId: string) => {
    toast.success('Оффер удалён');
  };

  const handleToggleStatus = (offer: OfferWithDetails) => {
    const newStatus = offer.status === 'active' ? 'paused' : 'active';
    toast.success(`Оффер ${newStatus === 'active' ? 'активирован' : 'приостановлен'}`);
  };

  // Handle network sync
  const handleSyncNetwork = (network: CPANetwork) => {
    toast.info(`Синхронизация с ${network.name}...`);
    setTimeout(() => {
      toast.success(`${network.name} синхронизирован`);
    }, 2000);
  };

  // Handle A/B test actions
  const handleStartABTest = (test: ABTest) => {
    setABTests(abTests.map(t => t.id === test.id ? { ...t, status: 'running' as const } : t));
    toast.success('A/B тест запущен');
  };

  const handlePauseABTest = (test: ABTest) => {
    setABTests(abTests.map(t => t.id === test.id ? { ...t, status: 'draft' as const } : t));
    toast.success('A/B тест приостановлен');
  };

  const handleEndABTest = (test: ABTest, winnerId: string) => {
    setABTests(abTests.map(t => t.id === test.id ? { ...t, status: 'completed' as const, winner: winnerId } : t));
    toast.success('A/B тест завершён');
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="offers" className="data-[state=active]:bg-[#6C63FF]">
            <Target className="w-4 h-4 mr-2" />
            Офферы
          </TabsTrigger>
          <TabsTrigger value="networks" className="data-[state=active]:bg-[#6C63FF]">
            <Link2 className="w-4 h-4 mr-2" />
            CPA Сети
          </TabsTrigger>
          <TabsTrigger value="ab-tests" className="data-[state=active]:bg-[#6C63FF]">
            <GitBranch className="w-4 h-4 mr-2" />
            A/B Тесты
          </TabsTrigger>
        </TabsList>

        {/* Offers Tab */}
        <TabsContent value="offers" className="space-y-4 mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                  <MousePointer className="w-6 h-6 text-[#6C63FF]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalClicks.toLocaleString()}</p>
                  <p className="text-sm text-[#8A8A8A]">Кликов</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#00D26A]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalLeads}</p>
                  <p className="text-sm text-[#8A8A8A]">Лидов</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-[#FFB800]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-[#8A8A8A]">Доход</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-lg bg-[#E4405F]/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#E4405F]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.avgROI.toFixed(0)}%</p>
                  <p className="text-sm text-[#8A8A8A]">Средний ROI</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск офферов..."
                className="pl-10 bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>
            <Select value={filterNetwork} onValueChange={setFilterNetwork}>
              <SelectTrigger className="w-[130px] bg-[#1E1F26] border-[#2A2B32] text-white">
                <SelectValue placeholder="Сеть" />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                <SelectItem value="all" className="text-white">Все сети</SelectItem>
                {networks.map((n) => (
                  <SelectItem key={n.id} value={n.name} className="text-white">{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterNiche} onValueChange={setFilterNiche}>
              <SelectTrigger className="w-[130px] bg-[#1E1F26] border-[#2A2B32] text-white">
                <SelectValue placeholder="Ниша" />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                <SelectItem value="all" className="text-white">Все ниши</SelectItem>
                {Object.entries(nicheLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-white">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] bg-[#1E1F26] border-[#2A2B32] text-white">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                <SelectItem value="all" className="text-white">Все</SelectItem>
                <SelectItem value="active" className="text-white">Активные</SelectItem>
                <SelectItem value="paused" className="text-white">Приостановленные</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                setSelectedOffer(null);
                setIsCreateDialogOpen(true);
              }}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить оффер
            </Button>
          </div>

          {/* Offers Table */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2A2B32] hover:bg-transparent">
                    <TableHead className="text-[#8A8A8A]">Название</TableHead>
                    <TableHead className="text-[#8A8A8A]">Сеть</TableHead>
                    <TableHead className="text-[#8A8A8A]">Ниша</TableHead>
                    <TableHead className="text-[#8A8A8A]">Выплата</TableHead>
                    <TableHead className="text-[#8A8A8A]">Клики</TableHead>
                    <TableHead className="text-[#8A8A8A]">Лиды</TableHead>
                    <TableHead className="text-[#8A8A8A]">Доход</TableHead>
                    <TableHead className="text-[#8A8A8A]">ROI</TableHead>
                    <TableHead className="text-[#8A8A8A]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.map((offer) => (
                    <TableRow key={offer.id} className="border-[#2A2B32] hover:bg-[#1E1F26]/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{offer.name}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              offer.status === 'active' ? 'border-[#00D26A] text-[#00D26A]' : 'border-[#FFB800] text-[#FFB800]'
                            )}
                          >
                            {offer.status === 'active' ? 'Активен' : 'Пауза'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#8A8A8A]">{offer.network}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: nicheColors[offer.niche || ''], color: nicheColors[offer.niche || ''] }}
                        >
                          {nicheLabels[offer.niche || ''] || offer.niche}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white font-medium">${offer.payout}</TableCell>
                      <TableCell className="text-white">{offer.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-white">{offer.leads}</TableCell>
                      <TableCell className="text-[#00D26A] font-medium">${offer.revenue.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(offer.roi || 0) >= 100 ? (
                            <TrendingUp className="w-4 h-4 text-[#00D26A]" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-[#FF4D4D]" />
                          )}
                          <span className={cn(
                            'font-medium',
                            (offer.roi || 0) >= 100 ? 'text-[#00D26A]' : 'text-[#FF4D4D]'
                          )}>
                            {offer.roi}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-[#8A8A8A] hover:text-white">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1E1F26] border-[#2A2B32]">
                            <DropdownMenuItem onClick={() => handleEditOffer(offer)} className="text-white focus:bg-[#2A2B32]">
                              <Edit className="w-4 h-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(offer)} className="text-white focus:bg-[#2A2B32]">
                              {offer.status === 'active' ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                              {offer.status === 'active' ? 'Приостановить' : 'Активировать'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(offer.affiliateLink, '_blank')} className="text-white focus:bg-[#2A2B32]">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Открыть ссылку
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteOffer(offer.id)} className="text-[#FF4D4D] focus:bg-[#2A2B32]">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* CPA Networks Tab */}
        <TabsContent value="networks" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {networks.map((network) => (
              <Card key={network.id} className="bg-[#14151A] border-[#2A2B32]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-[#1E1F26] flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-[#6C63FF]" />
                      </div>
                      <span className="font-medium text-white">{network.name}</span>
                    </div>
                    {network.status === 'connected' && (
                      <CheckCircle className="w-5 h-5 text-[#00D26A]" />
                    )}
                    {network.status === 'disconnected' && (
                      <AlertCircle className="w-5 h-5 text-[#FFB800]" />
                    )}
                    {network.status === 'error' && (
                      <XCircle className="w-5 h-5 text-[#FF4D4D]" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8A8A8A]">Офферов</span>
                      <span className="text-white">{network.offersCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8A8A8A]">Статус</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          network.status === 'connected' && 'border-[#00D26A] text-[#00D26A]',
                          network.status === 'disconnected' && 'border-[#FFB800] text-[#FFB800]',
                          network.status === 'error' && 'border-[#FF4D4D] text-[#FF4D4D]'
                        )}
                      >
                        {network.status === 'connected' ? 'Подключено' : network.status === 'disconnected' ? 'Отключено' : 'Ошибка'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSyncNetwork(network)}
                    variant="outline"
                    className="w-full mt-4 border-[#2A2B32] text-[#8A8A8A] hover:text-white"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Синхронизировать
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* A/B Tests Tab */}
        <TabsContent value="ab-tests" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setIsABTestDialogOpen(true)}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать A/B тест
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {abTests.map((test) => (
              <Card key={test.id} className="bg-[#14151A] border-[#2A2B32]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">{test.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        test.status === 'running' && 'border-[#00D26A] text-[#00D26A]',
                        test.status === 'draft' && 'border-[#8A8A8A] text-[#8A8A8A]',
                        test.status === 'completed' && 'border-[#6C63FF] text-[#6C63FF]'
                      )}
                    >
                      {test.status === 'running' ? 'Запущен' : test.status === 'draft' ? 'Черновик' : 'Завершён'}
                    </Badge>
                  </div>
                  <CardDescription className="text-[#8A8A8A]">
                    Оффер: {offersList.find(o => o.id === test.offerId)?.name || 'Неизвестно'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {test.variants.map((variant) => (
                      <div key={variant.id} className="p-3 bg-[#1E1F26] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{variant.name}</span>
                          {test.winner === variant.id && (
                            <Badge className="bg-[#00D26A] text-white">Победитель</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-[#8A8A8A]">Клики</p>
                            <p className="text-white font-medium">{variant.clicks}</p>
                          </div>
                          <div>
                            <p className="text-[#8A8A8A]">Лиды</p>
                            <p className="text-white font-medium">{variant.leads}</p>
                          </div>
                          <div>
                            <p className="text-[#8A8A8A]">Конверсия</p>
                            <p className="text-white font-medium">{variant.conversionRate}%</p>
                          </div>
                          <div>
                            <p className="text-[#8A8A8A]">Доход</p>
                            <p className="text-[#00D26A] font-medium">${variant.revenue}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {test.status === 'draft' && (
                        <Button
                          onClick={() => handleStartABTest(test)}
                          className="flex-1 bg-[#00D26A] hover:bg-[#00D26A]/80"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Запустить
                        </Button>
                      )}
                      {test.status === 'running' && (
                        <>
                          <Button
                            onClick={() => handlePauseABTest(test)}
                            variant="outline"
                            className="flex-1 border-[#FFB800] text-[#FFB800] hover:bg-[#FFB800]/10"
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Приостановить
                          </Button>
                          <Button
                            onClick={() => {
                              const winner = test.variants.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b);
                              handleEndABTest(test, winner.id);
                            }}
                            className="flex-1 bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                          >
                            Завершить
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Offer Dialog */}
      <OfferDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        offer={selectedOffer}
        networks={networks}
        onSave={(offer) => {
          toast.success(selectedOffer ? 'Оффер обновлён' : 'Оффер создан');
          setIsCreateDialogOpen(false);
        }}
      />

      {/* Create A/B Test Dialog */}
      <ABTestDialog
        open={isABTestDialogOpen}
        onOpenChange={setIsABTestDialogOpen}
        offers={offersList}
        onCreate={(test) => {
          setABTests([...abTests, test]);
          setIsABTestDialogOpen(false);
          toast.success('A/B тест создан');
        }}
      />
    </div>
  );
}

// Offer Dialog Component
function OfferDialog({
  open,
  onOpenChange,
  offer,
  networks,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: OfferWithDetails | null;
  networks: CPANetwork[];
  onSave: (offer: Partial<OfferWithDetails>) => void;
}) {
  const [name, setName] = useState(offer?.name || '');
  const [network, setNetwork] = useState(offer?.network || '');
  const [affiliateLink, setAffiliateLink] = useState(offer?.affiliateLink || '');
  const [niche, setNiche] = useState(offer?.niche || '');
  const [geo, setGeo] = useState(offer?.geo || '');
  const [payout, setPayout] = useState(offer?.payout?.toString() || '');
  const [currency, setCurrency] = useState(offer?.currency || 'USD');

  const handleSave = () => {
    if (!name.trim() || !affiliateLink.trim() || !payout) {
      toast.error('Заполните обязательные поля');
      return;
    }
    onSave({
      name,
      network,
      affiliateLink,
      niche,
      geo,
      payout: parseFloat(payout),
      currency,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#14151A] border-[#2A2B32] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#6C63FF]" />
            {offer ? 'Редактировать оффер' : 'Добавить оффер'}
          </DialogTitle>
          <DialogDescription className="text-[#8A8A8A]">
            Заполните информацию об оффере
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[#8A8A8A]">Название *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название оффера"
              className="bg-[#1E1F26] border-[#2A2B32] text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">CPA Сеть</Label>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                  <SelectValue placeholder="Выберите сеть" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  {networks.map((n) => (
                    <SelectItem key={n.id} value={n.name} className="text-white">{n.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Ниша</Label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                  <SelectValue placeholder="Выберите нишу" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  {Object.entries(nicheLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-white">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#8A8A8A]">Партнёрская ссылка *</Label>
            <Input
              value={affiliateLink}
              onChange={(e) => setAffiliateLink(e.target.value)}
              placeholder="https://..."
              className="bg-[#1E1F26] border-[#2A2B32] text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Выплата *</Label>
              <Input
                type="number"
                value={payout}
                onChange={(e) => setPayout(e.target.value)}
                placeholder="0"
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Валюта</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectItem value="USD" className="text-white">USD</SelectItem>
                  <SelectItem value="EUR" className="text-white">EUR</SelectItem>
                  <SelectItem value="RUB" className="text-white">RUB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">ГЕО</Label>
              <Input
                value={geo}
                onChange={(e) => setGeo(e.target.value)}
                placeholder="RU"
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-[#2A2B32]">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              {offer ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// A/B Test Dialog Component
function ABTestDialog({
  open,
  onOpenChange,
  offers,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: OfferWithDetails[];
  onCreate: (test: ABTest) => void;
}) {
  const [name, setName] = useState('');
  const [offerId, setOfferId] = useState('');
  const [variants, setVariants] = useState<{ name: string; trafficPercent: number }[]>([
    { name: 'Вариант A', trafficPercent: 50 },
    { name: 'Вариант B', trafficPercent: 50 },
  ]);

  const handleCreate = () => {
    if (!name.trim() || !offerId) {
      toast.error('Заполните обязательные поля');
      return;
    }

    onCreate({
      id: Date.now().toString(),
      name,
      offerId,
      status: 'draft',
      variants: variants.map((v, i) => ({
        id: String.fromCharCode(97 + i),
        ...v,
        clicks: 0,
        leads: 0,
        conversions: 0,
        revenue: 0,
        conversionRate: 0,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#14151A] border-[#2A2B32] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#6C63FF]" />
            Создать A/B тест
          </DialogTitle>
          <DialogDescription className="text-[#8A8A8A]">
            Создайте тест для оптимизации конверсии
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[#8A8A8A]">Название теста *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название теста"
              className="bg-[#1E1F26] border-[#2A2B32] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#8A8A8A]">Оффер *</Label>
            <Select value={offerId} onValueChange={setOfferId}>
              <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                <SelectValue placeholder="Выберите оффер" />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-white">{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[#8A8A8A]">Варианты</Label>
            {variants.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={v.name}
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[i].name = e.target.value;
                    setVariants(newVariants);
                  }}
                  className="flex-1 bg-[#1E1F26] border-[#2A2B32] text-white"
                />
                <Input
                  type="number"
                  value={v.trafficPercent}
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[i].trafficPercent = parseInt(e.target.value) || 0;
                    setVariants(newVariants);
                  }}
                  className="w-20 bg-[#1E1F26] border-[#2A2B32] text-white text-center"
                />
                <span className="text-[#8A8A8A]">%</span>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setVariants([...variants, { name: `Вариант ${String.fromCharCode(65 + variants.length)}`, trafficPercent: 0 }])}
              className="w-full border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить вариант
            </Button>
          </div>

          <div className="flex gap-2 pt-4 border-t border-[#2A2B32]">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              className="flex-1 bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              Создать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OffersManager;

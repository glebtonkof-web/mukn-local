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
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Clock,
  Download,
  RefreshCw,
  Brain,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  LineChart,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, subDays, subHours } from 'date-fns';
import { ru } from 'date-fns/locale';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

// Types
interface RiskAccount {
  id: string;
  username: string;
  platform: string;
  avatarUrl?: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trend: 'up' | 'down' | 'stable';
  riskFactors: RiskFactor[];
  predictedBanDate?: Date;
  daysUntilBan?: number;
  lastActivity: Date;
  stats: {
    followers: number;
    posts: number;
    avgEngagement: number;
    recentActions: number;
  };
}

interface RiskFactor {
  id: string;
  name: string;
  impact: number; // 0-100
  category: 'activity' | 'content' | 'behavior' | 'external';
  description: string;
}

// Demo data
const demoAccounts: RiskAccount[] = [
  {
    id: '1',
    username: '@sofia_crypto',
    platform: 'instagram',
    riskScore: 15,
    riskLevel: 'low',
    trend: 'down',
    riskFactors: [
      { id: '1', name: 'Высокая активность', impact: 30, category: 'activity', description: 'Много действий за короткое время' },
    ],
    lastActivity: new Date(2025, 0, 20, 15, 30),
    stats: { followers: 15200, posts: 45, avgEngagement: 4.5, recentActions: 120 },
  },
  {
    id: '2',
    username: '@lucky_max',
    platform: 'telegram',
    riskScore: 45,
    riskLevel: 'medium',
    trend: 'up',
    riskFactors: [
      { id: '2', name: 'Подозрительные ссылки', impact: 50, category: 'content', description: 'Публикация партнёрских ссылок' },
      { id: '3', name: 'Спам-активность', impact: 40, category: 'behavior', description: 'Массовые рассылки' },
    ],
    predictedBanDate: subDays(new Date(), -15),
    daysUntilBan: 15,
    lastActivity: new Date(2025, 0, 20, 14, 0),
    stats: { followers: 8900, posts: 32, avgEngagement: 3.2, recentActions: 250 },
  },
  {
    id: '3',
    username: '@alice_model',
    platform: 'instagram',
    riskScore: 28,
    riskLevel: 'low',
    trend: 'stable',
    riskFactors: [
      { id: '4', name: 'Новый аккаунт', impact: 25, category: 'external', description: 'Аккаунт создан недавно' },
    ],
    lastActivity: new Date(2025, 0, 20, 12, 45),
    stats: { followers: 2500, posts: 12, avgEngagement: 5.1, recentActions: 80 },
  },
  {
    id: '4',
    username: '@fit_artem',
    platform: 'telegram',
    riskScore: 12,
    riskLevel: 'low',
    trend: 'down',
    riskFactors: [],
    lastActivity: new Date(2025, 0, 20, 16, 0),
    stats: { followers: 12400, posts: 67, avgEngagement: 4.8, recentActions: 95 },
  },
  {
    id: '5',
    username: '@crypto_trader_pro',
    platform: 'instagram',
    riskScore: 72,
    riskLevel: 'high',
    trend: 'up',
    riskFactors: [
      { id: '5', name: 'Жалобы пользователей', impact: 70, category: 'external', description: 'Множество жалоб на аккаунт' },
      { id: '6', name: 'Агрессивный маркетинг', impact: 55, category: 'content', description: 'Слишком много рекламных постов' },
      { id: '7', name: 'Подозрительные DM', impact: 45, category: 'behavior', description: 'Массовые сообщения с ссылками' },
    ],
    predictedBanDate: subDays(new Date(), -5),
    daysUntilBan: 5,
    lastActivity: new Date(2025, 0, 20, 10, 30),
    stats: { followers: 5600, posts: 28, avgEngagement: 2.1, recentActions: 380 },
  },
];

// Risk trend chart data
const riskTrendData = Array.from({ length: 14 }, (_, i) => ({
  date: format(subDays(new Date(), 13 - i), 'dd.MM'),
  avgRisk: Math.floor(25 + Math.random() * 20 + (i * 0.5)),
  highRisk: Math.floor(5 + Math.random() * 5),
  criticalRisk: Math.floor(1 + Math.random() * 3),
}));

// Risk distribution data
const riskDistributionData = [
  { name: 'Низкий', value: 8, color: '#00D26A' },
  { name: 'Средний', value: 3, color: '#FFB800' },
  { name: 'Высокий', value: 1, color: '#FF4D4D' },
  { name: 'Критический', value: 0, color: '#8A8A8A' },
];

// Predictions data
const predictionsData = [
  { period: '24ч', bans: 0, risk: 5 },
  { period: '7 дней', bans: 1, risk: 15 },
  { period: '14 дней', bans: 2, risk: 25 },
  { period: '30 дней', bans: 3, risk: 40 },
];

// Risk level config
const riskLevelConfig = {
  low: { color: '#00D26A', label: 'Низкий', icon: CheckCircle },
  medium: { color: '#FFB800', label: 'Средний', icon: AlertTriangle },
  high: { color: '#FF4D4D', label: 'Высокий', icon: AlertCircle },
  critical: { color: '#8A8A8A', label: 'Критический', icon: XCircle },
};

export function BanRiskAnalytics() {
  const [accounts] = useState<RiskAccount[]>(demoAccounts);
  const [selectedAccount, setSelectedAccount] = useState<RiskAccount | null>(null);
  const [sortBy, setSortBy] = useState<'risk' | 'name' | 'lastActivity'>('risk');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  // Sort and filter accounts
  const sortedAccounts = useMemo(() => {
    let filtered = accounts;
    if (filterLevel !== 'all') {
      filtered = accounts.filter(a => a.riskLevel === filterLevel);
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'risk') return b.riskScore - a.riskScore;
      if (sortBy === 'name') return a.username.localeCompare(b.username);
      if (sortBy === 'lastActivity') return b.lastActivity.getTime() - a.lastActivity.getTime();
      return 0;
    });
  }, [accounts, sortBy, filterLevel]);

  // Stats calculation
  const stats = useMemo(() => {
    const avgRisk = Math.round(accounts.reduce((sum, a) => sum + a.riskScore, 0) / accounts.length);
    const highRiskCount = accounts.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical').length;
    const lowRiskCount = accounts.filter(a => a.riskLevel === 'low').length;
    const predictedBans = accounts.filter(a => a.daysUntilBan && a.daysUntilBan <= 7).length;
    return { avgRisk, highRiskCount, lowRiskCount, predictedBans };
  }, [accounts]);

  // Export report
  const handleExport = () => {
    toast.info('Подготовка отчёта...');
    setTimeout(() => {
      toast.success('Отчёт успешно экспортирован');
    }, 1500);
  };

  // Get risk color
  const getRiskColor = (score: number) => {
    if (score < 30) return '#00D26A';
    if (score < 50) return '#FFB800';
    if (score < 70) return '#FF4D4D';
    return '#8A8A8A';
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#6C63FF]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8A8A8A]">Средний риск</p>
                <p className="text-3xl font-bold text-white">{stats.avgRisk}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#6C63FF]/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#6C63FF]" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-[#00D26A]">
              <TrendingDown className="w-4 h-4" />
              <span>-5% за неделю</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#FF4D4D]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8A8A8A]">Высокий риск</p>
                <p className="text-3xl font-bold text-white">{stats.highRiskCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#FF4D4D]/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#FF4D4D]" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-[#FF4D4D]">
              <TrendingUp className="w-4 h-4" />
              <span>+1 за сегодня</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#00D26A]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8A8A8A]">Безопасны</p>
                <p className="text-3xl font-bold text-white">{stats.lowRiskCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#00D26A]/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#00D26A]" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-[#00D26A]">
              <TrendingUp className="w-4 h-4" />
              <span>+2 за неделю</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#FFB800]/20 to-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8A8A8A]">Прогноз банов</p>
                <p className="text-3xl font-bold text-white">{stats.predictedBans}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#FFB800]/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-[#FFB800]" />
              </div>
            </div>
            <p className="text-xs text-[#8A8A8A] mt-2">В течение 7 дней</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Trend Chart */}
        <Card className="lg:col-span-2 bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-[#6C63FF]" />
                  Тренды риска
                </CardTitle>
                <CardDescription className="text-[#8A8A8A]">
                  Динамика изменения рисков за 14 дней
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskTrendData}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2B32" />
                  <XAxis dataKey="date" stroke="#8A8A8A" fontSize={12} />
                  <YAxis stroke="#8A8A8A" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E1F26',
                      border: '1px solid #2A2B32',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgRisk"
                    stroke="#6C63FF"
                    fillOpacity={1}
                    fill="url(#colorRisk)"
                    name="Средний риск"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution Pie Chart */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#6C63FF]" />
              Распределение
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={riskDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {riskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E1F26',
                      border: '1px solid #2A2B32',
                      borderRadius: '8px',
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {riskDistributionData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-[#8A8A8A]">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictions & Account List Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Predictions */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#FFB800]" />
              AI Прогнозы
            </CardTitle>
            <CardDescription className="text-[#8A8A8A]">
              Предсказания на основе машинного обучения
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {predictionsData.map((pred, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#1E1F26] rounded-lg">
                  <div>
                    <p className="text-white font-medium">{pred.period}</p>
                    <p className="text-sm text-[#8A8A8A]">Возможных банов</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{pred.bans}</p>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: getRiskColor(pred.risk),
                        color: getRiskColor(pred.risk),
                      }}
                    >
                      {pred.risk}% риск
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Account Risk List */}
        <Card className="lg:col-span-2 bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#6C63FF]" />
                Аккаунты по риску
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[140px] bg-[#1E1F26] border-[#2A2B32] text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectItem value="risk" className="text-white">По риску</SelectItem>
                    <SelectItem value="name" className="text-white">По имени</SelectItem>
                    <SelectItem value="lastActivity" className="text-white">По активности</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-[120px] bg-[#1E1F26] border-[#2A2B32] text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectItem value="all" className="text-white">Все</SelectItem>
                    <SelectItem value="low" className="text-white">Низкий</SelectItem>
                    <SelectItem value="medium" className="text-white">Средний</SelectItem>
                    <SelectItem value="high" className="text-white">Высокий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-2">
                {sortedAccounts.map((account) => {
                  const config = riskLevelConfig[account.riskLevel];
                  const Icon = config.icon;

                  return (
                    <div
                      key={account.id}
                      onClick={() => setSelectedAccount(account)}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#1E1F26] hover:bg-[#2A2B32] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={account.avatarUrl} />
                          <AvatarFallback className="bg-[#6C63FF] text-white text-xs">
                            {account.username.slice(1, 3).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-white font-medium">{account.username}</p>
                          <p className="text-xs text-[#8A8A8A]">{account.platform}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Risk Score */}
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            {account.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-[#FF4D4D]" />}
                            {account.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-[#00D26A]" />}
                            {account.trend === 'stable' && <Minus className="w-3 h-3 text-[#8A8A8A]" />}
                            <span className="text-lg font-bold" style={{ color: config.color }}>
                              {account.riskScore}%
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: config.color, color: config.color }}
                          >
                            {config.label}
                          </Badge>
                        </div>

                        {/* Days until ban */}
                        {account.daysUntilBan && (
                          <div className="text-right">
                            <p className="text-sm text-[#FFB800] font-medium">
                              ~{account.daysUntilBan} дн.
                            </p>
                            <p className="text-xs text-[#8A8A8A]">до бана</p>
                          </div>
                        )}

                        <Eye className="w-4 h-4 text-[#8A8A8A]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExport}
          className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
        >
          <Download className="w-4 h-4 mr-2" />
          Экспорт отчёта
        </Button>
      </div>

      {/* Account Detail Dialog */}
      <Dialog open={!!selectedAccount} onOpenChange={(open) => !open && setSelectedAccount(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#6C63FF]" />
              Анализ риска
            </DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              {selectedAccount?.username}
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-6 mt-4">
              {/* Risk Score */}
              <div className="flex items-center justify-between p-4 bg-[#1E1F26] rounded-lg">
                <div>
                  <p className="text-sm text-[#8A8A8A]">Риск-скор</p>
                  <p className="text-4xl font-bold" style={{ color: getRiskColor(selectedAccount.riskScore) }}>
                    {selectedAccount.riskScore}%
                  </p>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: riskLevelConfig[selectedAccount.riskLevel].color,
                      color: riskLevelConfig[selectedAccount.riskLevel].color,
                    }}
                  >
                    {riskLevelConfig[selectedAccount.riskLevel].label} риск
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#8A8A8A]">Тренд</p>
                  <div className="flex items-center gap-1 justify-end">
                    {selectedAccount.trend === 'up' && (
                      <>
                        <ArrowUpRight className="w-5 h-5 text-[#FF4D4D]" />
                        <span className="text-[#FF4D4D]">Растёт</span>
                      </>
                    )}
                    {selectedAccount.trend === 'down' && (
                      <>
                        <ArrowDownRight className="w-5 h-5 text-[#00D26A]" />
                        <span className="text-[#00D26A]">Снижается</span>
                      </>
                    )}
                    {selectedAccount.trend === 'stable' && (
                      <>
                        <Minus className="w-5 h-5 text-[#8A8A8A]" />
                        <span className="text-[#8A8A8A]">Стабилен</span>
                      </>
                    )}
                  </div>
                  {selectedAccount.predictedBanDate && (
                    <p className="text-sm text-[#FFB800] mt-2">
                      Прогноз бана: {format(selectedAccount.predictedBanDate, 'd MMM', { locale: ru })}
                    </p>
                  )}
                </div>
              </div>

              {/* Risk Progress */}
              <div className="space-y-2">
                <Progress value={selectedAccount.riskScore} className="h-3" />
                <div className="flex justify-between text-xs text-[#8A8A8A]">
                  <span>Безопасно</span>
                  <span>Внимание</span>
                  <span>Опасно</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-lg font-bold text-white">{selectedAccount.stats.followers.toLocaleString()}</p>
                  <p className="text-xs text-[#8A8A8A]">Подписчиков</p>
                </div>
                <div className="text-center p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-lg font-bold text-white">{selectedAccount.stats.posts}</p>
                  <p className="text-xs text-[#8A8A8A]">Постов</p>
                </div>
                <div className="text-center p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-lg font-bold text-white">{selectedAccount.stats.avgEngagement}%</p>
                  <p className="text-xs text-[#8A8A8A]">Вовлечённость</p>
                </div>
                <div className="text-center p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-lg font-bold text-white">{selectedAccount.stats.recentActions}</p>
                  <p className="text-xs text-[#8A8A8A]">Действий/день</p>
                </div>
              </div>

              {/* Risk Factors */}
              {selectedAccount.riskFactors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#FFB800]" />
                    Факторы риска
                  </h3>
                  <div className="space-y-2">
                    {selectedAccount.riskFactors.map((factor) => (
                      <div key={factor.id} className="p-3 bg-[#1E1F26] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{factor.name}</span>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: getRiskColor(factor.impact),
                              color: getRiskColor(factor.impact),
                            }}
                          >
                            Влияние: {factor.impact}%
                          </Badge>
                        </div>
                        <p className="text-sm text-[#8A8A8A]">{factor.description}</p>
                        <Progress value={factor.impact} className="h-1.5 mt-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Activity */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8A8A8A]">Последняя активность</span>
                <span className="text-white">
                  {format(selectedAccount.lastActivity, 'd MMM yyyy, HH:mm', { locale: ru })}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BanRiskAnalytics;

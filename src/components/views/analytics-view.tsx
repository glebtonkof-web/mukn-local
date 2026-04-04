'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  MessageSquare,
  Target,
  RefreshCw,
  Download,
  Sparkles,
  Brain,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Eye,
} from 'lucide-react';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    revenueChange: number;
    totalLeads: number;
    leadsChange: number;
    totalComments: number;
    commentsChange: number;
    activeAccounts: number;
    accountsChange: number;
  };
  charts: {
    revenueByDay: Array<{ date: string; revenue: number; comments: number }>;
    revenueByNiche: Array<{ niche: string; revenue: number; color: string }>;
    topChannels: Array<{ name: string; comments: number; revenue: number; conversion: number }>;
    topComments: Array<{ text: string; views: number; clicks: number; conversions: number }>;
  };
  aiInsights: Array<{
    type: 'success' | 'warning' | 'info' | 'recommendation';
    title: string;
    description: string;
    action?: string;
    impact?: string;
  }>;
}

const COLORS = ['#6C63FF', '#00D26A', '#FFB800', '#FF4D4D', '#00B4D8'];

export function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // В реальном проекте здесь будет API запрос
        await new Promise(resolve => setTimeout(resolve, 800));

        // Моковые данные
        setData({
          overview: {
            totalRevenue: 24680,
            revenueChange: 15.3,
            totalLeads: 124,
            leadsChange: 8.2,
            totalComments: 1847,
            commentsChange: 12.1,
            activeAccounts: 18,
            accountsChange: -2,
          },
          charts: {
            revenueByDay: [
              { date: 'Пн', revenue: 3200, comments: 145 },
              { date: 'Вт', revenue: 4100, comments: 189 },
              { date: 'Ср', revenue: 3800, comments: 167 },
              { date: 'Чт', revenue: 4500, comments: 201 },
              { date: 'Пт', revenue: 5200, comments: 234 },
              { date: 'Сб', revenue: 2800, comments: 98 },
              { date: 'Вс', revenue: 1080, comments: 45 },
            ],
            revenueByNiche: [
              { niche: 'Крипта', revenue: 12000, color: '#FFB800' },
              { niche: 'Казино', revenue: 8000, color: '#6C63FF' },
              { niche: 'Нутра', revenue: 3200, color: '#00D26A' },
              { niche: 'Дейтинг', revenue: 1480, color: '#FF4D4D' },
            ],
            topChannels: [
              { name: '@crypto_signals', comments: 245, revenue: 5400, conversion: 4.2 },
              { name: '@trading_pro', comments: 189, revenue: 4200, conversion: 3.8 },
              { name: '@invest_club', comments: 156, revenue: 3100, conversion: 3.1 },
              { name: '@money_talks', comments: 134, revenue: 2800, conversion: 2.9 },
              { name: '@profit_daily', comments: 98, revenue: 1900, conversion: 2.4 },
            ],
            topComments: [
              { text: 'Отличный сигнал! Заработал 15% за неделю 🔥', views: 1240, clicks: 89, conversions: 12 },
              { text: 'Пользуюсь уже месяц, результаты впечатляют', views: 980, clicks: 67, conversions: 8 },
              { text: 'Начал с $100, сейчас уже $450 на счету', views: 856, clicks: 54, conversions: 6 },
            ],
          },
          aiInsights: [
            {
              type: 'recommendation',
              title: 'Увеличьте активность в выходные',
              description: 'В субботу и воскресенье конверсия падает на 60%. Рекомендуем перенести часть активности на эти дни или оптимизировать контент.',
              action: 'Настроить расписание',
              impact: '+20% к доходу',
            },
            {
              type: 'success',
              title: 'Канал @crypto_signals показывает лучший ROI',
              description: 'Конверсия 4.2% значительно выше среднего (2.8%). Рекомендуем увеличить активность в этом канале.',
              action: 'Увеличить бюджет',
              impact: '+15% к лидам',
            },
            {
              type: 'warning',
              title: 'Аккаунт @trader_alex в зоне риска',
              description: 'Риск бана 72%. Рекомендуем снизить активность и провести прогревочные действия.',
              action: 'Прогреть аккаунт',
              impact: 'Сохранение аккаунта',
            },
            {
              type: 'info',
              title: 'Найдены новые перспективные каналы',
              description: 'AI обнаружил 5 каналов с похожей аудиторией и низкой конкуренцией.',
              action: 'Показать каналы',
              impact: 'Новый источник трафика',
            },
          ],
        });
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        toast.error('Ошибка загрузки аналитики');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // AI анализ
  const runAiAnalysis = async () => {
    setAiAnalyzing(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'analytics',
          dateRange,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('AI анализ завершён');
        // Обновляем данные с новыми инсайтами
        if (data) {
          setData({
            ...data,
            aiInsights: result.insights || data.aiInsights,
          });
        }
      } else {
        toast.error('Ошибка AI анализа');
      }
    } catch (error) {
      toast.error('Ошибка AI анализа');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Экспорт отчёта
  const exportReport = async () => {
    toast.success('Отчёт формируется...');
    // В реальном проекте здесь будет генерация PDF/Excel
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Аналитика</h1>
          <p className="text-[#8A8A8A]">Статистика и AI-рекомендации по оптимизации</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportReport}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
          <Button
            onClick={runAiAnalysis}
            disabled={aiAnalyzing}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            {aiAnalyzing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            AI Анализ
          </Button>
        </div>
      </div>

      {/* Фильтры по датам */}
      <div className="flex gap-2">
        {[
          { value: '7d', label: '7 дней' },
          { value: '30d', label: '30 дней' },
          { value: '90d', label: '90 дней' },
        ].map((range) => (
          <Button
            key={range.value}
            variant={dateRange === range.value ? 'default' : 'outline'}
            onClick={() => setDateRange(range.value as any)}
            className={dateRange === range.value ? 'bg-[#6C63FF]' : 'border-[#2A2B32] text-[#8A8A8A]'}
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Доход',
            value: formatCurrency(data.overview.totalRevenue),
            change: data.overview.revenueChange,
            icon: DollarSign,
            color: '#00D26A',
          },
          {
            title: 'Лиды',
            value: data.overview.totalLeads.toString(),
            change: data.overview.leadsChange,
            icon: Target,
            color: '#6C63FF',
          },
          {
            title: 'Комментарии',
            value: data.overview.totalComments.toString(),
            change: data.overview.commentsChange,
            icon: MessageSquare,
            color: '#FFB800',
          },
          {
            title: 'Аккаунты',
            value: data.overview.activeAccounts.toString(),
            change: data.overview.accountsChange,
            icon: Users,
            color: '#00B4D8',
          },
        ].map((kpi) => (
          <Card key={kpi.title} className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#8A8A8A]">{kpi.title}</p>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}20` }}>
                  <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <div className={cn('flex items-center gap-1 mt-2 text-sm', kpi.change >= 0 ? 'text-[#00D26A]' : 'text-[#FF4D4D]')}>
                {kpi.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {kpi.change >= 0 ? '+' : ''}{kpi.change}%
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* График дохода */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#6C63FF]" />
              Доход по дням
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2B32" />
                  <XAxis dataKey="date" stroke="#8A8A8A" />
                  <YAxis stroke="#8A8A8A" />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#14151A', border: '1px solid #2A2B32', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="revenue" fill="#6C63FF" radius={[4, 4, 0, 0]} name="Доход" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* По нишам */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00D26A]" />
              Доход по нишам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.revenueByNiche}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="revenue"
                    nameKey="niche"
                    label={({ niche, percent }) => `${niche} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.charts.revenueByNiche.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#14151A', border: '1px solid #2A2B32', borderRadius: '8px' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Рекомендации */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#6C63FF]" />
            AI Рекомендации
          </CardTitle>
          <CardDescription className="text-[#8A8A8A]">
            Анализ на основе ваших данных и машинного обучения
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {data.aiInsights.map((insight, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-4 rounded-lg border',
                    insight.type === 'success' && 'bg-[#00D26A]/10 border-[#00D26A]/30',
                    insight.type === 'warning' && 'bg-[#FFB800]/10 border-[#FFB800]/30',
                    insight.type === 'info' && 'bg-[#00B4D8]/10 border-[#00B4D8]/30',
                    insight.type === 'recommendation' && 'bg-[#6C63FF]/10 border-[#6C63FF]/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      insight.type === 'success' && 'bg-[#00D26A]/20',
                      insight.type === 'warning' && 'bg-[#FFB800]/20',
                      insight.type === 'info' && 'bg-[#00B4D8]/20',
                      insight.type === 'recommendation' && 'bg-[#6C63FF]/20'
                    )}>
                      {insight.type === 'success' && <CheckCircle className="w-4 h-4 text-[#00D26A]" />}
                      {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[#FFB800]" />}
                      {insight.type === 'info' && <Eye className="w-4 h-4 text-[#00B4D8]" />}
                      {insight.type === 'recommendation' && <Lightbulb className="w-4 h-4 text-[#6C63FF]" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white font-medium">{insight.title}</h4>
                        {insight.impact && (
                          <Badge className="bg-[#6C63FF]/20 text-[#6C63FF] text-xs">
                            {insight.impact}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[#8A8A8A] mb-2">{insight.description}</p>
                      {insight.action && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
                          onClick={() => toast.info(`Действие: ${insight.action}`)}
                        >
                          {insight.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Топ каналы */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-[#FFB800]" />
            Топ каналы по доходу
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.charts.topChannels.map((channel, index) => (
              <div key={channel.name} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[#6C63FF]/20 flex items-center justify-center text-[#6C63FF] font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{channel.name}</span>
                    <span className="text-[#00D26A] font-medium">{formatCurrency(channel.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[#8A8A8A]">
                    <span>{channel.comments} комментов</span>
                    <span>•</span>
                    <span className="text-[#6C63FF]">{channel.conversion}% конверсия</span>
                  </div>
                  <Progress
                    value={(channel.revenue / data.charts.topChannels[0].revenue) * 100}
                    className="h-1 mt-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

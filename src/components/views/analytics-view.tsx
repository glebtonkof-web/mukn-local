'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart3,
  TrendingUp,
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
  AlertCircle,
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

// Типы данных
interface KPIData {
  title: string;
  value: string;
  change: number;
  icon: string;
  color: string;
}

interface KPIResponse {
  kpi: KPIData[];
  stats: {
    activeAccounts: number;
    totalAccounts: number;
    todayComments: number;
    todayRevenue: number;
    topChannel: string | null;
  };
}

interface RevenueData {
  date: string;
  revenue: number;
  comments: number;
  conversions: number;
}

interface RevenueResponse {
  chartData: RevenueData[];
  summary: {
    totalRevenue: number;
    totalComments: number;
    totalConversions: number;
    avgRevenuePerDay: number;
  };
}

interface TopChannel {
  id: string;
  name: string;
  comments: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

interface TopComment {
  id: string;
  text: string;
  ctr: number;
  conversionRate: number;
  views: number;
  clicks: number;
}

interface TopChannelsResponse {
  channels: TopChannel[];
  comments: TopComment[];
}

interface AIInsight {
  type: 'success' | 'warning' | 'info' | 'recommendation';
  title: string;
  description: string;
  action?: string;
  impact?: string;
}

interface AIAnalyzeResponse {
  success: boolean;
  insights: AIInsight[];
  metrics?: {
    confidence: number;
    dataPoints: number;
    processingTime: number;
  };
  recommendations?: {
    priority: string;
    estimatedImpact: string;
  };
}

// Цвета для графиков
const COLORS = ['#6C63FF', '#00D26A', '#FFB800', '#FF4D4D', '#00B4D8'];
const NICHE_COLORS: Record<string, string> = {
  'Крипта': '#FFB800',
  'Казино': '#6C63FF',
  'Нутра': '#00D26A',
  'Дейтинг': '#FF4D4D',
  'Финансы': '#00B4D8',
};

export function AnalyticsView() {
  // Состояния данных
  const [kpiData, setKpiData] = useState<KPIResponse | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueResponse | null>(null);
  const [topChannelsData, setTopChannelsData] = useState<TopChannelsResponse | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  
  // Состояния загрузки
  const [loading, setLoading] = useState(true);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Состояния ошибок
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  
  // Фильтры
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');

  // Получение количества дней из dateRange
  const getDaysFromRange = (range: string): number => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  };

  // Загрузка KPI данных
  const fetchKPI = useCallback(async () => {
    setKpiLoading(true);
    setKpiError(null);
    try {
      const response = await fetch('/api/dashboard/kpi');
      if (!response.ok) throw new Error('Ошибка загрузки KPI');
      const data: KPIResponse = await response.json();
      setKpiData(data);
    } catch (error) {
      console.error('Failed to fetch KPI:', error);
      setKpiError('Не удалось загрузить KPI данные');
      toast.error('Ошибка загрузки KPI');
    } finally {
      setKpiLoading(false);
    }
  }, []);

  // Загрузка данных по доходу
  const fetchRevenue = useCallback(async () => {
    setRevenueLoading(true);
    setRevenueError(null);
    try {
      const days = getDaysFromRange(dateRange);
      const response = await fetch(`/api/analytics/revenue?days=${days}`);
      if (!response.ok) throw new Error('Ошибка загрузки данных по доходу');
      const data: RevenueResponse = await response.json();
      setRevenueData(data);
    } catch (error) {
      console.error('Failed to fetch revenue:', error);
      setRevenueError('Не удалось загрузить данные по доходу');
      toast.error('Ошибка загрузки данных по доходу');
    } finally {
      setRevenueLoading(false);
    }
  }, [dateRange]);

  // Загрузка топ каналов
  const fetchTopChannels = useCallback(async () => {
    setChannelsLoading(true);
    setChannelsError(null);
    try {
      const period = dateRange === '7d' ? 'week' : dateRange === '30d' ? 'month' : 'month';
      const response = await fetch(`/api/analytics/top-channels?limit=5&period=${period}`);
      if (!response.ok) throw new Error('Ошибка загрузки топ каналов');
      const data: TopChannelsResponse = await response.json();
      setTopChannelsData(data);
    } catch (error) {
      console.error('Failed to fetch top channels:', error);
      setChannelsError('Не удалось загрузить топ каналы');
      toast.error('Ошибка загрузки топ каналов');
    } finally {
      setChannelsLoading(false);
    }
  }, [dateRange]);

  // Загрузка AI инсайтов
  const fetchAIInsights = useCallback(async () => {
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
        const data: AIAnalyzeResponse = await response.json();
        if (data.success && data.insights) {
          setAiInsights(data.insights);
        }
      }
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
    }
  }, [dateRange]);

  // Начальная загрузка всех данных
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchKPI(),
        fetchRevenue(),
        fetchTopChannels(),
      ]);
      // Загружаем AI инсайты после основных данных
      await fetchAIInsights();
      setLoading(false);
    };
    
    loadAllData();
  }, [fetchKPI, fetchRevenue, fetchTopChannels, fetchAIInsights]);

  // Обновление данных при изменении dateRange
  useEffect(() => {
    if (!loading) {
      fetchRevenue();
      fetchTopChannels();
      fetchAIInsights();
    }
  }, [dateRange, fetchRevenue, fetchTopChannels, fetchAIInsights]);

  // AI анализ (ручной запуск)
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
        const result: AIAnalyzeResponse = await response.json();
        if (result.success && result.insights) {
          setAiInsights(result.insights);
          toast.success('AI анализ завершён', {
            description: `Найдено ${result.insights.length} рекомендаций`,
          });
        } else {
          toast.error('Не удалось получить AI рекомендации');
        }
      } else {
        toast.error('Ошибка AI анализа');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Ошибка AI анализа');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Экспорт отчёта
  const exportReport = async () => {
    setExporting(true);
    toast.info('Формирование отчёта...');
    
    try {
      const days = getDaysFromRange(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const response = await fetch(
        `/api/reports/export/excel?type=dashboard&startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`
      );

      if (!response.ok) throw new Error('Ошибка экспорта');

      // Получаем blob
      const blob = await response.blob();
      
      // Создаём ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${dateRange}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Очистка
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Отчёт успешно скачан');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка при экспорте отчёта');
    } finally {
      setExporting(false);
    }
  };

  // Форматирование валюты
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Подготовка данных для графика по нишам
  const getRevenueByNiche = () => {
    if (!topChannelsData?.channels) return [];
    
    // Группируем каналы по нишам (используем имя канала как приближение)
    const nicheData: Record<string, { niche: string; revenue: number }> = {};
    
    topChannelsData.channels.forEach(channel => {
      // Простая эвристика для определения ниши по названию канала
      let niche = 'Другое';
      const name = channel.name.toLowerCase();
      
      if (name.includes('crypto') || name.includes('crypt') || name.includes('trade') || name.includes('signal')) {
        niche = 'Крипта';
      } else if (name.includes('casino') || name.includes('bet') || name.includes('game')) {
        niche = 'Казино';
      } else if (name.includes('health') || name.includes('beauty') || name.includes('diet')) {
        niche = 'Нутра';
      } else if (name.includes('dating') || name.includes('love') || name.includes('meet')) {
        niche = 'Дейтинг';
      } else if (name.includes('invest') || name.includes('money') || name.includes('finance')) {
        niche = 'Финансы';
      }
      
      if (!nicheData[niche]) {
        nicheData[niche] = { niche, revenue: 0 };
      }
      nicheData[niche].revenue += channel.revenue;
    });
    
    return Object.values(nicheData).map(item => ({
      ...item,
      color: NICHE_COLORS[item.niche] || '#8A8A8A',
    }));
  };

  // Полная загрузка
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <RefreshCw className="w-8 h-8 text-[#6C63FF] animate-spin" />
        <p className="text-[#8A8A8A]">Загрузка аналитики...</p>
      </div>
    );
  }

  // Получение KPI значений
  const getKPIValues = () => {
    if (!kpiData) return [];
    
    return [
      {
        title: 'Доход',
        value: formatCurrency(kpiData.stats.todayRevenue),
        change: kpiData.kpi[0]?.change || 0,
        icon: DollarSign,
        color: '#00D26A',
      },
      {
        title: 'Лиды',
        value: String(revenueData?.summary.totalConversions || 0),
        change: 0,
        icon: Target,
        color: '#6C63FF',
      },
      {
        title: 'Комментарии',
        value: String(kpiData.stats.todayComments),
        change: kpiData.kpi[2]?.change || 0,
        icon: MessageSquare,
        color: '#FFB800',
      },
      {
        title: 'Аккаунты',
        value: String(kpiData.stats.activeAccounts),
        change: kpiData.kpi[1]?.change || 0,
        icon: Users,
        color: '#00B4D8',
      },
    ];
  };

  const revenueByNiche = getRevenueByNiche();

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
            disabled={exporting}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            {exporting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
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
            onClick={() => setDateRange(range.value as '7d' | '30d' | '90d')}
            className={dateRange === range.value ? 'bg-[#6C63FF]' : 'border-[#2A2B32] text-[#8A8A8A]'}
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {getKPIValues().map((kpi) => (
          <Card key={kpi.title} className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#8A8A8A]">{kpi.title}</p>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}20` }}>
                  <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
                </div>
              </div>
              {kpiLoading ? (
                <div className="h-8 w-24 bg-[#2A2B32] animate-pulse rounded" />
              ) : kpiError ? (
                <div className="flex items-center gap-2 text-[#FF4D4D]">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Ошибка</span>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-white">{kpi.value}</p>
                  {kpi.change !== 0 && (
                    <div className={cn('flex items-center gap-1 mt-2 text-sm', kpi.change >= 0 ? 'text-[#00D26A]' : 'text-[#FF4D4D]')}>
                      {kpi.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                    </div>
                  )}
                </>
              )}
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
              {revenueLoading ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-[#6C63FF] animate-spin" />
                </div>
              ) : revenueError ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-[#FF4D4D]">
                  <AlertCircle className="w-6 h-6" />
                  <span>{revenueError}</span>
                  <Button size="sm" variant="outline" onClick={fetchRevenue}>
                    Повторить
                  </Button>
                </div>
              ) : revenueData?.chartData && revenueData.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2B32" />
                    <XAxis dataKey="date" stroke="#8A8A8A" />
                    <YAxis stroke="#8A8A8A" />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#14151A', border: '1px solid #2A2B32', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="revenue" fill="#6C63FF" radius={[4, 4, 0, 0]} name="Доход" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#8A8A8A]">
                  Нет данных за выбранный период
                </div>
              )}
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
              {channelsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-[#6C63FF] animate-spin" />
                </div>
              ) : channelsError ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-[#FF4D4D]">
                  <AlertCircle className="w-6 h-6" />
                  <span>{channelsError}</span>
                  <Button size="sm" variant="outline" onClick={fetchTopChannels}>
                    Повторить
                  </Button>
                </div>
              ) : revenueByNiche.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByNiche}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="revenue"
                      nameKey="niche"
                      label={({ niche, percent }) => `${niche} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {revenueByNiche.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#14151A', border: '1px solid #2A2B32', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#8A8A8A]">
                  Нет данных для отображения
                </div>
              )}
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
          {aiAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <RefreshCw className="w-8 h-8 text-[#6C63FF] animate-spin" />
              <p className="text-[#8A8A8A]">AI анализирует данные...</p>
            </div>
          ) : aiInsights.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {aiInsights.map((insight, index) => (
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
                        {insight.type === 'info' && <Target className="w-4 h-4 text-[#00B4D8]" />}
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
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Brain className="w-8 h-8 text-[#8A8A8A]" />
              <p className="text-[#8A8A8A]">Нажмите "AI Анализ" для получения рекомендаций</p>
            </div>
          )}
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
          {channelsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-[#6C63FF] animate-spin" />
            </div>
          ) : channelsError ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-[#FF4D4D]">
              <AlertCircle className="w-6 h-6" />
              <span>{channelsError}</span>
              <Button size="sm" variant="outline" onClick={fetchTopChannels}>
                Повторить
              </Button>
            </div>
          ) : topChannelsData?.channels && topChannelsData.channels.length > 0 ? (
            <div className="space-y-4">
              {topChannelsData.channels.map((channel, index) => (
                <div key={channel.id} className="flex items-center gap-4">
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
                      <span className="text-[#6C63FF]">{channel.conversionRate.toFixed(1)}% конверсия</span>
                    </div>
                    <Progress
                      value={(channel.revenue / topChannelsData.channels[0].revenue) * 100}
                      className="h-1 mt-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-[#8A8A8A]">
              Нет данных о каналах
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

interface DailyRevenue {
  date: string;
  total: number;
  byScheme: Record<string, number>;
  byPlatform: Record<string, number>;
}

interface RevenueData {
  today: number;
  yesterday: number;
  week: number;
  month: number;
  daily: DailyRevenue[];
  byPlatform: { platform: string; revenue: number }[];
  byScheme: { schemeId: string; revenue: number }[];
}

const COLORS = ['#6C63FF', '#00D26A', '#FFB800', '#FF4D4D', '#00BFFF', '#FF69B4'];

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E42313',
  TikTok: '#00BFFF',
  Telegram: '#0088CC',
  X: '#1DA1F2',
  YouTube: '#FF0000',
};

export function ProfitDashboard() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
    const interval = setInterval(fetchRevenue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRevenue = async () => {
    try {
      const response = await fetch('/api/sim-auto/profit');
      if (response.ok) {
        const result = await response.json();
        setData(result.revenue);
      }
    } catch (error) {
      console.error('Error fetching revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="flex items-center justify-center h-[400px]">
          <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="flex flex-col items-center justify-center h-[400px] text-[#8A8A8A]">
          <DollarSign className="w-12 h-12 mb-4 opacity-50" />
          <p>Данные о доходе отсутствуют</p>
        </CardContent>
      </Card>
    );
  }

  const todayChange = data.yesterday > 0 
    ? ((data.today - data.yesterday) / data.yesterday) * 100 
    : 0;

  // Prepare chart data
  const chartData = data.daily.map(d => ({
    date: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
    revenue: d.total,
  }));

  // Prepare pie data for platforms
  const platformPieData = data.byPlatform.map(p => ({
    name: p.platform,
    value: p.revenue,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#8A8A8A]">Сегодня</span>
              <DollarSign className="w-4 h-4 text-[#00D26A]" />
            </div>
            <div className="text-2xl font-bold text-white">
              {data.today.toLocaleString()}₽
            </div>
            <div className={cn(
              'flex items-center gap-1 text-sm mt-1',
              todayChange >= 0 ? 'text-[#00D26A]' : 'text-[#FF4D4D]'
            )}>
              {todayChange >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {Math.abs(todayChange).toFixed(1)}% vs вчера
            </div>
          </CardContent>
        </Card>

        {/* Yesterday */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#8A8A8A]">Вчера</span>
              <Calendar className="w-4 h-4 text-[#8A8A8A]" />
            </div>
            <div className="text-2xl font-bold text-white">
              {data.yesterday.toLocaleString()}₽
            </div>
          </CardContent>
        </Card>

        {/* Week */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#8A8A8A]">За неделю</span>
              <BarChart3 className="w-4 h-4 text-[#6C63FF]" />
            </div>
            <div className="text-2xl font-bold text-white">
              {data.week.toLocaleString()}₽
            </div>
            <div className="text-sm text-[#8A8A8A] mt-1">
              ~{(data.week / 7).toFixed(0)}₽ в день
            </div>
          </CardContent>
        </Card>

        {/* Month */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#8A8A8A]">За месяц</span>
              <TrendingUp className="w-4 h-4 text-[#FFB800]" />
            </div>
            <div className="text-2xl font-bold text-white">
              {data.month.toLocaleString()}₽
            </div>
            <div className="text-sm text-[#8A8A8A] mt-1">
              ~{(data.month / 30).toFixed(0)}₽ в день
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#6C63FF]" />
              Динамика дохода
            </CardTitle>
            <CardDescription className="text-[#8A8A8A]">
              Доход за последние 7 дней
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2B32" />
                  <XAxis dataKey="date" stroke="#8A8A8A" fontSize={12} />
                  <YAxis stroke="#8A8A8A" fontSize={12} />
                  <RechartsTooltip
                    contentStyle={{ 
                      backgroundColor: '#14151A', 
                      border: '1px solid #2A2B32',
                      borderRadius: '8px' 
                    }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`${value.toLocaleString()}₽`, 'Доход']}
                  />
                  <Bar dataKey="revenue" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Platform Distribution */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#FFB800]" />
              По платформам
            </CardTitle>
            <CardDescription className="text-[#8A8A8A]">
              Распределение дохода по платформам
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {platformPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={platformPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {platformPieData.map((entry, index) => (
                        <Cell 
                          key={entry.name} 
                          fill={PLATFORM_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ 
                        backgroundColor: '#14151A', 
                        border: '1px solid #2A2B32',
                        borderRadius: '8px' 
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()}₽`, 'Доход']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[#8A8A8A]">
                  Нет данных
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Schemes */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00D26A]" />
            Топ схем по доходу
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {data.byScheme.length > 0 ? (
              <div className="space-y-2">
                {data.byScheme.slice(0, 10).map((scheme, index) => {
                  const maxRevenue = data.byScheme[0]?.revenue || 1;
                  const percent = (scheme.revenue / maxRevenue) * 100;

                  return (
                    <div key={scheme.schemeId} className="flex items-center gap-3">
                      <div className="w-6 text-center text-sm text-[#8A8A8A]">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white truncate">
                            {scheme.schemeId.replace('scheme-', '')}
                          </span>
                          <span className="text-sm font-medium text-[#00D26A]">
                            {scheme.revenue.toLocaleString()}₽
                          </span>
                        </div>
                        <Progress value={percent} className="h-1.5 bg-[#2A2B32]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[#8A8A8A]">
                Нет данных о схемах
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProfitDashboard;

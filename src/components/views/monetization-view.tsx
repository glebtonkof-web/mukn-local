'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, TrendingUp, Users, Globe, ShoppingCart, 
  Zap, Target, Gift, CreditCard, BarChart3, RefreshCw,
  Settings, AlertTriangle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Типы данных
interface MonetizationFeature {
  id: string;
  name: string;
  icon: string;
  status: 'active' | 'paused';
  revenue: number;
  description: string;
  count: number;
}

interface MonetizationStats {
  totalRevenue: number;
  activeFeatures: number;
  totalFeatures: number;
  monthlyGrowth: number;
  totalClients: number;
}

interface SpamMethod {
  id: string;
  name: string;
  risk: 'high' | 'medium' | 'low';
  effectiveness: 'very-high' | 'high' | 'medium' | 'low';
  description?: string;
  stats?: {
    sentCount?: number;
    successRate?: number;
    avgEngagement?: number;
  };
}

// Маппинг иконок
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  RefreshCw,
  CreditCard,
  Users,
  Gift,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  Globe,
  DollarSign,
  Settings,
};

// Компонент загрузки
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-[#2A2B32] rounded mb-2"></div>
          <div className="h-4 w-64 bg-[#2A2B32] rounded"></div>
        </div>
        <div className="h-10 w-40 bg-[#2A2B32] rounded"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-[#2A2B32] rounded-lg"></div>
        ))}
      </div>
      <div className="h-12 bg-[#2A2B32] rounded w-full max-w-md"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 bg-[#2A2B32] rounded-lg"></div>
        ))}
      </div>
    </div>
  );
}

// Компонент ошибки
function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card className="bg-[#14151A] border-[#FF4D4D]">
      <CardContent className="py-12 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-[#FF4D4D] mb-4" />
        <h3 className="text-white font-medium mb-2">Ошибка загрузки</h3>
        <p className="text-[#8A8A8A] mb-4">{error}</p>
        <Button onClick={onRetry} variant="outline" className="border-[#2A2B32]">
          <RefreshCw className="w-4 h-4 mr-2" />
          Попробовать снова
        </Button>
      </CardContent>
    </Card>
  );
}

export function MonetizationView() {
  // Состояния
  const [features, setFeatures] = useState<MonetizationFeature[]>([]);
  const [stats, setStats] = useState<MonetizationStats | null>(null);
  const [spamMethods, setSpamMethods] = useState<SpamMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('features');
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  // Загрузка данных
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Загружаем общую статистику
      const overviewRes = await fetch('/api/monetization/overview');
      const overviewData = await overviewRes.json();

      if (!overviewData.success) {
        throw new Error(overviewData.error || 'Ошибка загрузки данных');
      }

      setFeatures(overviewData.features);
      setStats(overviewData.stats);

      // Загружаем спам методы
      const spamRes = await fetch('/api/monetization/spam-methods');
      const spamData = await spamRes.json();

      if (spamData.success && spamData.methods) {
        // Преобразуем данные спам методов в удобный формат
        const methods: SpamMethod[] = [
          {
            id: 'forward',
            name: 'Email спам',
            risk: 'high',
            effectiveness: 'medium',
            description: spamData.descriptions?.forward || 'Спам через пересылаемые сообщения',
            stats: spamData.methods.forward?.[0] || {},
          },
          {
            id: 'polls',
            name: 'SMS рассылка',
            risk: 'medium',
            effectiveness: 'high',
            description: spamData.descriptions?.polls || 'Спам через опросы',
            stats: spamData.methods.polls?.[0] || {},
          },
          {
            id: 'arguments',
            name: 'Мессенджеры',
            risk: 'high',
            effectiveness: 'very-high',
            description: spamData.descriptions?.arguments || 'Фейковые срачи',
            stats: spamData.methods.arguments?.[0] || {},
          },
          {
            id: 'reactions',
            name: 'Соцсети',
            risk: 'medium',
            effectiveness: 'high',
            description: spamData.descriptions?.reactions || 'Спам через реакции',
            stats: spamData.methods.reactions?.[0] || {},
          },
        ];
        setSpamMethods(methods);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Переключение статуса метода
  const toggleFeature = async (id: string, currentStatus: string) => {
    setTogglingFeature(id);
    
    try {
      const res = await fetch('/api/monetization/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureId: id,
          status: currentStatus,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Обновляем локальное состояние
        setFeatures(prev => prev.map(f => 
          f.id === id ? { ...f, status: data.newStatus as 'active' | 'paused' } : f
        ));
        toast.success(data.message || 'Статус изменён');
      } else {
        throw new Error(data.error || 'Ошибка изменения статуса');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка изменения статуса');
    } finally {
      setTogglingFeature(null);
    }
  };

  // Вывод средств
  const handleWithdraw = async () => {
    if (!stats || stats.totalRevenue <= 0) {
      toast.error('Нет средств для вывода');
      return;
    }

    setWithdrawing(true);
    
    try {
      const res = await fetch('/api/monetization/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: stats.totalRevenue,
          method: 'card',
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || 'Запрос на вывод создан');
        // Обновляем данные
        fetchData();
      } else {
        throw new Error(data.error || 'Ошибка создания запроса');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка вывода средств');
    } finally {
      setWithdrawing(false);
    }
  };

  // Отображение загрузки
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Отображение ошибки
  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchData} />;
  }

  const totalRevenue = stats?.totalRevenue || 0;
  const activeFeatures = stats?.activeFeatures || 0;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-[#00D26A]" />
            Монетизация
          </h1>
          <p className="text-[#8A8A8A]">Инструменты для монетизации трафика</p>
        </div>
        <Button 
          className="bg-[#00D26A] hover:bg-[#00D26A]/80"
          onClick={handleWithdraw}
          disabled={withdrawing || totalRevenue <= 0}
        >
          {withdrawing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <DollarSign className="w-4 h-4 mr-2" />
          )}
          Вывести {totalRevenue.toLocaleString()}₽
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalRevenue.toLocaleString()}₽</p>
                <p className="text-xs text-[#8A8A8A]">Общий доход</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeFeatures}</p>
                <p className="text-xs text-[#8A8A8A]">Активных методов</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats?.monthlyGrowth && stats.monthlyGrowth >= 0 ? '+' : ''}
                  {stats?.monthlyGrowth || 0}%
                </p>
                <p className="text-xs text-[#8A8A8A]">Рост за месяц</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF4D4D]/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#FF4D4D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {(stats?.totalClients || 0).toLocaleString()}
                </p>
                <p className="text-xs text-[#8A8A8A]">Клиентов</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Табы */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="features" className="data-[state=active]:bg-[#6C63FF]">Методы</TabsTrigger>
          <TabsTrigger value="spam" className="data-[state=active]:bg-[#FF4D4D]">Спам методы</TabsTrigger>
          <TabsTrigger value="darknet" className="data-[state=active]:bg-[#8A8A8A]">Darknet</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => {
              const Icon = iconMap[feature.icon] || DollarSign;
              const isToggling = togglingFeature === feature.id;
              
              return (
                <Card 
                  key={feature.id} 
                  className={cn(
                    'bg-[#14151A] border-[#2A2B32] transition-all cursor-pointer',
                    feature.status === 'active' && 'border-l-4 border-l-[#00D26A]'
                  )} 
                  onClick={() => toggleFeature(feature.id, feature.status)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1E1F26] flex items-center justify-center">
                          <Icon className="w-5 h-5 text-[#6C63FF]" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{feature.name}</h4>
                          <Badge className={feature.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#8A8A8A]'}>
                            {isToggling ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : feature.status === 'active' ? (
                              'Активен'
                            ) : (
                              'Пауза'
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#8A8A8A] mb-3">{feature.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[#00D26A] font-bold">{feature.revenue.toLocaleString()}₽</span>
                      <span className="text-xs text-[#8A8A8A]">за месяц</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="spam" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#FF4D4D]" />
                Спам методы
              </CardTitle>
            </CardHeader>
            <CardContent>
              {spamMethods.length > 0 ? (
                <div className="space-y-3">
                  {spamMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 bg-[#1E1F26] rounded-lg">
                      <div>
                        <span className="text-white font-medium">{method.name}</span>
                        {method.description && (
                          <p className="text-xs text-[#8A8A8A] mt-1">{method.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge className={method.risk === 'high' ? 'bg-[#FF4D4D]' : method.risk === 'medium' ? 'bg-[#FFB800]' : 'bg-[#00D26A]'}>
                          Риск: {method.risk}
                        </Badge>
                        <Badge className={
                          method.effectiveness === 'very-high' ? 'bg-[#00D26A]' : 
                          method.effectiveness === 'high' ? 'bg-[#6C63FF]' : 
                          'bg-[#8A8A8A]'
                        }>
                          Эффект: {method.effectiveness}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#8A8A8A]">
                  Нет данных о спам методах
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="darknet" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="py-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-[#FF4D4D] mb-4" />
              <h3 className="text-white font-medium mb-2">Darknet функционал</h3>
              <p className="text-[#8A8A8A]">Доступ ограничен. Требуется дополнительная верификация.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

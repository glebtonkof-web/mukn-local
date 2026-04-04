'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, Cpu, DollarSign, Zap, Activity,
  Play, Pause, Settings, RefreshCw, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Типы данных
interface ProviderStatus {
  provider: string;
  name: string;
  isFree: boolean;
  isActive: boolean;
  hasApiKey: boolean;
  dailyQuota: number;
  dailyUsed: number;
  remaining: number;
  percentUsed: number;
  totalRequests: number;
  successRate: string;
  avgResponseTime: number;
  lastCheck: string | null;
  status: string;
}

interface StatusSummary {
  activeProviders: number;
  freeUsedToday: number;
  freeRemainingToday: number;
  deepseekBudget: number;
  deepseekSpent: number;
  deepseekRemaining: number;
}

interface BudgetData {
  total: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isExhausted: boolean;
}

interface StatusResponse {
  success: boolean;
  providers: ProviderStatus[];
  summary: StatusSummary;
  recommendations: string[];
}

interface BudgetResponse {
  success: boolean;
  budget: BudgetData;
  savings: {
    total: number;
    byProvider: Record<string, number>;
  };
}

export function AIPoolView() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [summary, setSummary] = useState<StatusSummary | null>(null);
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [savings, setSavings] = useState({ total: 0, byProvider: {} as Record<string, number> });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingProvider, setTogglingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных
  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Параллельная загрузка статуса и бюджета
      const [statusRes, budgetRes] = await Promise.all([
        fetch('/api/ai-pool/status'),
        fetch('/api/ai-pool/budget'),
      ]);

      if (!statusRes.ok || !budgetRes.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const statusData: StatusResponse = await statusRes.json();
      const budgetData: BudgetResponse = await budgetRes.json();

      if (statusData.success) {
        setProviders(statusData.providers);
        setSummary(statusData.summary);
        setRecommendations(statusData.recommendations || []);
      }

      if (budgetData.success) {
        setBudget(budgetData.budget);
        setSavings(budgetData.savings);
      }

      if (showRefreshing) {
        toast.success('Данные обновлены');
      }
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Начальная загрузка
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Переключение статуса провайдера
  const toggleProvider = async (providerId: string, currentStatus: boolean) => {
    setTogglingProvider(providerId);
    
    try {
      const response = await fetch('/api/ai-pool/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          isActive: !currentStatus,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Обновляем локальное состояние
        setProviders(prev => prev.map(p => 
          p.provider === providerId 
            ? { ...p, isActive: !currentStatus, status: !currentStatus ? 'active' : 'inactive' }
            : p
        ));
        
        // Обновляем summary
        setSummary(prev => prev ? {
          ...prev,
          activeProviders: prev.activeProviders + (currentStatus ? -1 : 1),
        } : null);

        toast.success(`Провайдер ${currentStatus ? 'отключён' : 'включён'}`);
      } else {
        throw new Error(data.error || 'Ошибка изменения статуса');
      }
    } catch (err) {
      console.error('Ошибка переключения:', err);
      toast.error(err instanceof Error ? err.message : 'Ошибка изменения статуса');
    } finally {
      setTogglingProvider(null);
    }
  };

  // Ручное обновление
  const handleRefresh = () => {
    fetchData(true);
  };

  // Форматирование чисел
  const formatNumber = (num: number) => {
    if (num === Infinity) return '∞';
    return num.toLocaleString('ru-RU');
  };

  // Состояние загрузки
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Brain className="w-7 h-7 text-[#6C63FF]" />
              AI Pool
            </h1>
            <p className="text-[#8A8A8A]">Управление AI моделями и ресурсами</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full bg-[#2A2B32]" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="py-4">
            <Skeleton className="h-10 w-full bg-[#2A2B32]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Состояние ошибки
  if (error && !providers.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Brain className="w-7 h-7 text-[#6C63FF]" />
              AI Pool
            </h1>
            <p className="text-[#8A8A8A]">Управление AI моделями и ресурсами</p>
          </div>
          <Button variant="outline" onClick={() => fetchData()} className="border-[#2A2B32]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Повторить
          </Button>
        </div>

        <Card className="bg-[#14151A] border-red-500/50">
          <CardContent className="py-8 flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-7 h-7 text-[#6C63FF]" />
            AI Pool
          </h1>
          <p className="text-[#8A8A8A]">Управление AI моделями и ресурсами</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={refreshing} 
            className="border-[#2A2B32]"
          >
            {refreshing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Обновить
          </Button>
          <Button className="bg-[#6C63FF]">
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </Button>
        </div>
      </div>

      {/* Карточки статистики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {formatNumber(summary?.freeUsedToday ?? 0)}
                </p>
                <p className="text-xs text-[#8A8A8A]">Запросов сегодня</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {formatNumber(summary?.freeRemainingToday ?? 0)}
                </p>
                <p className="text-xs text-[#8A8A8A]">Осталось бесплатно</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {summary?.activeProviders ?? 0}
                </p>
                <p className="text-xs text-[#8A8A8A]">Активных провайдеров</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  ${savings.total.toFixed(2)}
                </p>
                <p className="text-xs text-[#8A8A8A]">Экономия</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Бюджет DeepSeek */}
      {budget && (
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#8A8A8A]">Бюджет DeepSeek</span>
              <span className="text-white">
                ${budget.spent.toFixed(2)} / ${budget.total.toFixed(2)}
              </span>
            </div>
            <Progress 
              value={budget.percentUsed} 
              className={cn("h-3", budget.isExhausted && "bg-red-900/50")}
            />
            {budget.isExhausted && (
              <p className="text-xs text-red-400 mt-2">
                ⚠️ Бюджет исчерпан. Используйте бесплатные API.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Рекомендации */}
      {recommendations.length > 0 && (
        <Card className="bg-[#14151A] border-[#6C63FF]/50">
          <CardContent className="py-4">
            <h3 className="text-white font-medium mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#6C63FF]" />
              Рекомендации
            </h3>
            <ul className="space-y-1">
              {recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-[#8A8A8A]">• {rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* AI Провайдеры */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white">AI Провайдеры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {providers.map((provider) => (
                <div 
                  key={provider.provider} 
                  className="flex items-center justify-between p-4 bg-[#1E1F26] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      provider.isActive 
                        ? provider.status === 'quota_exhausted' 
                          ? 'bg-yellow-500' 
                          : 'bg-[#00D26A]' 
                        : 'bg-[#8A8A8A]'
                    )} />
                    <div>
                      <p className="text-white font-medium">{provider.name}</p>
                      <p className="text-xs text-[#8A8A8A]">
                        {provider.isFree ? (
                          <>
                            {formatNumber(provider.remaining)} / {formatNumber(provider.dailyQuota)} осталось
                          </>
                        ) : (
                          'Платный API'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      className={cn(
                        provider.isFree 
                          ? 'bg-[#00D26A]/20 text-[#00D26A]' 
                          : 'bg-[#FFB800]/20 text-[#FFB800]'
                      )}
                    >
                      {provider.isFree ? 'Бесплатно' : 'Платно'}
                    </Badge>
                    {provider.totalRequests > 0 && (
                      <Badge className="bg-[#6C63FF]/20 text-[#6C63FF]">
                        {provider.successRate}% успех
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggleProvider(provider.provider, provider.isActive)}
                      disabled={togglingProvider === provider.provider}
                    >
                      {togglingProvider === provider.provider ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : provider.isActive ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Статистика по провайдерам */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white">Использование сегодня</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
              {providers.filter(p => p.dailyUsed > 0 || p.isActive).map((provider) => (
                <div key={provider.provider} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-white">{provider.name}</span>
                    <span className="text-[#8A8A8A]">
                      {provider.dailyUsed} / {provider.dailyQuota === Infinity ? '∞' : provider.dailyQuota}
                    </span>
                  </div>
                  <Progress 
                    value={provider.percentUsed} 
                    className="h-2"
                  />
                </div>
              ))}
              
              {providers.filter(p => p.dailyUsed > 0 || p.isActive).length === 0 && (
                <p className="text-[#8A8A8A] text-center py-8">
                  Нет активных провайдеров
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

// AI Pool Dashboard - Дашборд мониторинга ИИ-пула
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Zap,
  TrendingUp,
  Shield,
  RefreshCw,
  Settings,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Типы
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
  status: 'active' | 'inactive' | 'quota_exhausted';
}

interface BudgetStatus {
  total: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isExhausted: boolean;
}

interface PoolStatus {
  providers: ProviderStatus[];
  summary: {
    activeProviders: number;
    freeUsedToday: number;
    freeRemainingToday: number;
    deepseekBudget: number;
    deepseekSpent: number;
    deepseekRemaining: number;
  };
  recommendations: string[];
}

// Константы цветов провайдеров
const PROVIDER_COLORS: Record<string, string> = {
  cerebras: '#00D4AA',
  gemini: '#4285F4',
  groq: '#FF6B35',
  openrouter: '#8B5CF6',
  deepseek: '#FF4D4D',
};

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function AIPoolDashboard() {
  const [poolStatus, setPoolStatus] = useState<PoolStatus | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [savings, setSavings] = useState({ total: 0, byProvider: {} as Record<string, number> });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [newBudget, setNewBudget] = useState('50');

  // Загрузка данных
  const fetchData = useCallback(async () => {
    try {
      const [statusRes, budgetRes] = await Promise.all([
        fetch('/api/ai-pool/status'),
        fetch('/api/ai-pool/budget'),
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setPoolStatus(data);
      }

      if (budgetRes.ok) {
        const data = await budgetRes.json();
        setBudgetStatus(data.budget);
        setSavings(data.savings);
      }
    } catch (error) {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Обновление каждые 30 секунд
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Обновление бюджета
  const updateBudget = async () => {
    try {
      const response = await fetch('/api/ai-pool/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetUSD: parseFloat(newBudget),
          resetSpent: false,
        }),
      });

      if (response.ok) {
        toast.success('Бюджет обновлён');
        setShowBudgetDialog(false);
        fetchData();
      } else {
        toast.error('Ошибка обновления бюджета');
      }
    } catch {
      toast.error('Ошибка подключения');
    }
  };

  // Переключение провайдера
  const toggleProvider = async (provider: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/ai-pool/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, isActive }),
      });

      if (response.ok) {
        toast.success(`${provider} ${isActive ? 'активирован' : 'деактивирован'}`);
        fetchData();
      }
    } catch {
      toast.error('Ошибка переключения');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#6C63FF]" />
            Мониторинг ИИ-пула
          </h2>
          <p className="text-[#8A8A8A]">Гибридная система: DeepSeek + бесплатные API</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setRefreshing(true);
            fetchData();
          }}
          disabled={refreshing}
          className="border-[#2A2B32] text-white hover:bg-[#2A2B32]"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
          Обновить
        </Button>
      </div>

      {/* Карточки бюджета */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* DeepSeek бюджет */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#8A8A8A]">DeepSeek</span>
              <Badge className="bg-[#FF4D4D]/20 text-[#FF4D4D]">Платный</Badge>
            </div>
            <div className="text-2xl font-bold text-white">
              ${budgetStatus?.remaining.toFixed(2) || '50.00'}
            </div>
            <div className="mt-2">
              <Progress
                value={budgetStatus?.percentUsed || 0}
                className="h-2"
              />
              <p className="text-xs text-[#8A8A8A] mt-1">
                Потрачено: ${budgetStatus?.spent.toFixed(2) || '0.00'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Бесплатные API */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#8A8A8A]">Бесплатные API</span>
              <Badge className="bg-[#00D26A]/20 text-[#00D26A]">Free</Badge>
            </div>
            <div className="text-2xl font-bold text-white">
              {poolStatus?.summary.freeRemainingToday.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-[#8A8A8A] mt-1">
              Запросов сегодня осталось
            </p>
          </CardContent>
        </Card>

        {/* Экономия */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#8A8A8A]">Экономия</span>
              <TrendingUp className="w-4 h-4 text-[#00D26A]" />
            </div>
            <div className="text-2xl font-bold text-[#00D26A]">
              ${savings.total.toFixed(2)}
            </div>
            <p className="text-xs text-[#8A8A8A] mt-1">
              Сэкономлено благодаря бесплатным API
            </p>
          </CardContent>
        </Card>

        {/* Активные провайдеры */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#8A8A8A]">Провайдеров</span>
              <Shield className="w-4 h-4 text-[#6C63FF]" />
            </div>
            <div className="text-2xl font-bold text-white">
              {poolStatus?.summary.activeProviders || 0} / 5
            </div>
            <p className="text-xs text-[#8A8A8A] mt-1">
              Активно из 5 доступных
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Статус провайдеров */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#6C63FF]" />
            Статус провайдеров
          </CardTitle>
          <CardDescription>
            Приоритет использования: Cerebras → Gemini → Groq → OpenRouter → DeepSeek
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {poolStatus?.providers.map((provider) => (
                <div
                  key={provider.provider}
                  className={cn(
                    'p-4 rounded-lg border transition-all',
                    provider.isActive
                      ? 'bg-[#1E1F26] border-[#2A2B32]'
                      : 'bg-[#14151A] border-[#1E1F26] opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: PROVIDER_COLORS[provider.provider] }}
                      />
                      <div>
                        <p className="font-medium text-white">{provider.name}</p>
                        <p className="text-xs text-[#8A8A8A]">
                          {provider.isFree
                            ? `${provider.remaining.toLocaleString()} / ${provider.dailyQuota.toLocaleString()} запросов`
                            : `Бюджет: $${(poolStatus?.summary.deepseekRemaining || 0).toFixed(2)}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Статус */}
                      {provider.status === 'active' && (
                        <Badge className="bg-[#00D26A]/20 text-[#00D26A]">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Активен
                        </Badge>
                      )}
                      {provider.status === 'quota_exhausted' && (
                        <Badge className="bg-[#FFB800]/20 text-[#FFB800]">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Лимит
                        </Badge>
                      )}
                      {provider.status === 'inactive' && (
                        <Badge className="bg-[#2A2B32] text-[#8A8A8A]">
                          <XCircle className="w-3 h-3 mr-1" />
                          Не активен
                        </Badge>
                      )}
                      
                      {/* Переключатель */}
                      <Switch
                        checked={provider.isActive}
                        onCheckedChange={(checked) => toggleProvider(provider.provider, checked)}
                      />
                    </div>
                  </div>
                  
                  {/* Прогресс для бесплатных */}
                  {provider.isFree && provider.isActive && (
                    <div className="mt-3">
                      <Progress
                        value={provider.percentUsed}
                        className="h-1"
                      />
                    </div>
                  )}
                  
                  {/* Статистика */}
                  <div className="mt-2 flex gap-4 text-xs text-[#8A8A8A]">
                    <span>Запросов: {provider.totalRequests.toLocaleString()}</span>
                    <span>Успешность: {provider.successRate}%</span>
                    {provider.avgResponseTime > 0 && (
                      <span>Ср. время: {provider.avgResponseTime}мс</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Рекомендации */}
      {poolStatus?.recommendations && poolStatus.recommendations.length > 0 && (
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FFB800]" />
              Рекомендации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {poolStatus.recommendations.map((rec, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#1E1F26] flex items-start gap-3">
                  <Info className="w-4 h-4 text-[#6C63FF] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#8A8A8A]">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Диалог настройки бюджета */}
      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>Настройка бюджета DeepSeek</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Укажите бюджет в USD. Софт автоматически распределит запросы на указанный период.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Бюджет (USD)</Label>
              <Input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>
            <div className="p-3 rounded-lg bg-[#1E1F26] text-sm text-[#8A8A8A]">
              <p>При бюджете ${newBudget} вы сможете сделать примерно:</p>
              <p className="text-white font-medium mt-1">
                ~{Math.floor(parseFloat(newBudget) / 0.00004).toLocaleString()} запросов
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBudgetDialog(false)} className="border-[#2A2B32]">
              Отмена
            </Button>
            <Button onClick={updateBudget} className="bg-[#6C63FF] hover:bg-[#6C63FF]/80">
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Кнопка быстрой настройки бюджета */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setNewBudget(String(budgetStatus?.total || 50));
            setShowBudgetDialog(true);
          }}
          className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Настроить бюджет DeepSeek
        </Button>
      </div>
    </div>
  );
}

export default AIPoolDashboard;

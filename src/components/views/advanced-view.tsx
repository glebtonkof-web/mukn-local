'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Cpu, Zap, Brain, Target, Globe, Shield, TestTube, 
  TrendingUp, Users, Search, BarChart3, RefreshCw,
  Play, Pause, AlertTriangle, CheckCircle, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Маппинг иконок
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TestTube,
  Shield,
  Search,
  Globe,
  Target,
  Brain,
  RefreshCw,
  TrendingUp,
  Users,
  BarChart3,
  Zap,
};

interface FeatureMetric {
  [key: string]: string | number | boolean;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  category: string;
  enabled: boolean;
  status: 'active' | 'paused' | 'error';
  metrics: FeatureMetric;
}

interface FeaturesStats {
  total: number;
  active: number;
  paused: number;
  error: number;
}

interface AdvancedData {
  success: boolean;
  features: Feature[];
  stats: FeaturesStats;
  timestamp: string;
}

export function AdvancedView() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [stats, setStats] = useState<FeaturesStats>({ total: 0, active: 0, paused: 0, error: 0 });
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'start' | 'pause' | null>(null);

  // Загрузка данных
  const fetchData = useCallback(async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/advanced');
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить данные');
      }

      const data: AdvancedData = await response.json();
      
      if (data.success) {
        setFeatures(data.features);
        setStats(data.stats);
      } else {
        throw new Error('Ошибка в ответе сервера');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Первичная загрузка
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Переключение функции
  const toggleFeature = async (id: string) => {
    try {
      setTogglingFeature(id);
      
      const feature = features.find(f => f.id === id);
      if (!feature) return;

      const newEnabled = !feature.enabled;

      // Оптимистичное обновление UI
      setFeatures(prev => prev.map(f => 
        f.id === id 
          ? { ...f, enabled: newEnabled, status: newEnabled ? 'active' : 'paused' } 
          : f
      ));

      // Обновляем статистику
      setStats(prev => ({
        ...prev,
        active: newEnabled ? prev.active + 1 : Math.max(0, prev.active - 1),
        paused: newEnabled ? Math.max(0, prev.paused - 1) : prev.paused + 1,
      }));

      const response = await fetch('/api/advanced', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId: id, enabled: newEnabled }),
      });

      if (!response.ok) {
        // Откат при ошибке
        setFeatures(prev => prev.map(f => 
          f.id === id 
            ? { ...f, enabled: !newEnabled, status: !newEnabled ? 'active' : 'paused' } 
            : f
        ));
        setStats(prev => ({
          ...prev,
          active: !newEnabled ? prev.active + 1 : Math.max(0, prev.active - 1),
          paused: !newEnabled ? Math.max(0, prev.paused - 1) : prev.paused + 1,
        }));
        throw new Error('Не удалось обновить статус');
      }

      toast.success(newEnabled ? 'Функция активирована' : 'Функция остановлена');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка обновления');
    } finally {
      setTogglingFeature(null);
    }
  };

  // Запуск всех функций
  const startAll = async () => {
    try {
      setActionLoading('start');
      const pausedFeatureIds = features
        .filter(f => !f.enabled)
        .map(f => f.id);

      if (pausedFeatureIds.length === 0) {
        toast.info('Все функции уже активны');
        return;
      }

      const response = await fetch('/api/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable-all', featureIds: pausedFeatureIds }),
      });

      if (!response.ok) throw new Error('Ошибка запуска');

      // Оптимистичное обновление
      setFeatures(prev => prev.map(f => ({ ...f, enabled: true, status: 'active' })));
      setStats(prev => ({ ...prev, active: prev.total, paused: 0 }));

      toast.success(`Запущено ${pausedFeatureIds.length} функций`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка запуска всех функций');
    } finally {
      setActionLoading(null);
    }
  };

  // Пауза всех функций
  const pauseAll = async () => {
    try {
      setActionLoading('pause');
      const activeFeatureIds = features
        .filter(f => f.enabled)
        .map(f => f.id);

      if (activeFeatureIds.length === 0) {
        toast.info('Все функции уже остановлены');
        return;
      }

      const response = await fetch('/api/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable-all', featureIds: activeFeatureIds }),
      });

      if (!response.ok) throw new Error('Ошибка остановки');

      // Оптимистичное обновление
      setFeatures(prev => prev.map(f => ({ ...f, enabled: false, status: 'paused' })));
      setStats(prev => ({ ...prev, active: 0, paused: prev.total }));

      toast.success(`Остановлено ${activeFeatureIds.length} функций`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка остановки всех функций');
    } finally {
      setActionLoading(null);
    }
  };

  // Обновление данных
  const handleRefresh = () => {
    fetchData(true);
  };

  // Фильтрация
  const filteredFeatures = activeTab === 'all' 
    ? features 
    : features.filter(f => f.status === activeTab);

  // Состояние загрузки
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-12 h-12 text-[#6C63FF] animate-spin" />
        <p className="text-[#8A8A8A]">Загрузка функций...</p>
      </div>
    );
  }

  // Состояние ошибки
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FF4D4D]/20 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-[#FF4D4D]" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium">Ошибка загрузки</p>
          <p className="text-[#8A8A8A] text-sm mt-1">{error}</p>
        </div>
        <Button onClick={() => fetchData()} variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
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
            <Cpu className="w-7 h-7 text-[#6C63FF]" />
            Advanced Tools
          </h1>
          <p className="text-[#8A8A8A]">{stats.total} продвинутых функций для автоматизации</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
            Обновить
          </Button>
          <Button 
            variant="outline" 
            onClick={startAll} 
            disabled={actionLoading !== null || stats.active === stats.total}
            className="border-[#00D26A] text-[#00D26A] hover:bg-[#00D26A]/10"
          >
            {actionLoading === 'start' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Запустить все
          </Button>
          <Button 
            variant="outline" 
            onClick={pauseAll} 
            disabled={actionLoading !== null || stats.active === 0}
            className="border-[#FFB800] text-[#FFB800] hover:bg-[#FFB800]/10"
          >
            {actionLoading === 'pause' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Pause className="w-4 h-4 mr-2" />
            )}
            Пауза всех
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8A8A8A] text-sm">Активных</p>
                <p className="text-3xl font-bold text-[#00D26A]">{stats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#00D26A]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8A8A8A] text-sm">На паузе</p>
                <p className="text-3xl font-bold text-[#FFB800]">{stats.paused}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Pause className="w-6 h-6 text-[#FFB800]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8A8A8A] text-sm">Всего функций</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-[#6C63FF]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8A8A8A] text-sm">Эффективность</p>
                <p className="text-3xl font-bold text-[#6C63FF]">
                  {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#6C63FF]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#6C63FF]">
            Все ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-[#00D26A]">
            Активные ({stats.active})
          </TabsTrigger>
          <TabsTrigger value="paused" className="data-[state=active]:bg-[#FFB800]">
            На паузе ({stats.paused})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Пустое состояние */}
      {filteredFeatures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#2A2B32] flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-[#8A8A8A]" />
          </div>
          <p className="text-[#8A8A8A]">
            {activeTab === 'active' && 'Нет активных функций'}
            {activeTab === 'paused' && 'Нет функций на паузе'}
            {activeTab === 'all' && 'Функции не найдены'}
          </p>
        </div>
      )}

      {/* Функции */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFeatures.map((feature) => {
          const Icon = ICON_MAP[feature.icon] || Cpu;
          const isToggling = togglingFeature === feature.id;
          
          return (
            <Card 
              key={feature.id} 
              className={cn(
                'bg-[#14151A] border-[#2A2B32] transition-all',
                feature.enabled && 'border-l-4 border-l-[#6C63FF]'
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center" 
                      style={{ backgroundColor: `${feature.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: feature.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-white text-base">{feature.name}</CardTitle>
                      <Badge 
                        className={cn(
                          'text-xs',
                          feature.status === 'active' ? 'bg-[#00D26A]' : 
                          feature.status === 'error' ? 'bg-[#FF4D4D]' : 'bg-[#FFB800]'
                        )}
                      >
                        {feature.status === 'active' ? 'Активно' : 
                         feature.status === 'error' ? 'Ошибка' : 'Пауза'}
                      </Badge>
                    </div>
                  </div>
                  {isToggling ? (
                    <Loader2 className="w-5 h-5 text-[#6C63FF] animate-spin" />
                  ) : (
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={() => toggleFeature(feature.id)}
                      disabled={togglingFeature !== null}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[#8A8A8A] mb-3">{feature.description}</p>
                {Object.keys(feature.metrics).length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(feature.metrics).slice(0, 6).map(([key, value]) => (
                      <div key={key} className="text-center p-2 bg-[#1E1F26] rounded">
                        <p className="text-sm font-bold text-white">
                          {typeof value === 'boolean' ? (value ? 'Да' : 'Нет') : value}
                        </p>
                        <p className="text-xs text-[#8A8A8A] truncate" title={key}>{key}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

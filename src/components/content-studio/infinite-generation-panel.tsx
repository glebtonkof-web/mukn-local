'use client';

/**
 * Панель управления 24/365 генерацией
 * 
 * Компонент для настройки и мониторинга непрерывной генерации контента
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Pause,
  Play,
  Square,
  Plus,
  RefreshCw,
  Zap,
  Globe,
  Key,
  Activity,
  TrendingUp,
  AlertTriangle,
  Settings,
} from 'lucide-react';

// Типы
interface GeneratorState {
  id: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  generated: number;
  errors: number;
  currentProvider: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  nextGenerationAt?: string;
  consecutiveErrors: number;
  dailyGenerated: number;
  dailyCost: number;
}

interface GeneratorStats {
  totalGenerated: number;
  successfulGenerated: number;
  successRate: number;
  avgGenerationTime: number;
  todayGenerated: number;
  todaySuccessful: number;
  todayCost: number;
  byProvider: Record<string, { count: number; success: number; cost: number }>;
  byHour: Record<number, number>;
}

interface Generator {
  id: string;
  state: GeneratorState;
  stats: GeneratorStats;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical' | 'offline';
  metrics: {
    totalProviders: number;
    healthyProviders: number;
    activeApiKeys: number;
    activeProxies: number;
    runningGenerators: number;
    totalGenerated24h: number;
    avgSuccessRate: number;
  };
  alerts: Array<{
    id: string;
    severity: string;
    component: string;
    message: string;
    createdAt: string;
  }>;
}

interface ProviderInfo {
  provider: string;
  category: string;
  isFree: boolean;
  dailyQuota: number;
  requiresPhone: boolean;
  requiresCard: boolean;
}

// Провайдеры по категориям
const PROVIDERS_BY_CATEGORY = {
  text: ['cerebras', 'groq', 'gemini', 'openrouter', 'deepseek'],
  video: ['kling', 'luma', 'runway', 'pollo', 'pika'],
  image: ['stability', 'midjourney'],
  audio: ['elevenlabs'],
};

export function InfiniteGenerationPanel() {
  // State
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('generators');

  // Form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contentType: 'text',
    prompts: '',
    intervalSeconds: 60,
    preferredProviders: [] as string[],
    maxGenerationsPerDay: 1000,
    autoSwitchOnLimit: true,
    style: '',
  });

  // Загрузка данных
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [genRes, healthRes, provRes] = await Promise.all([
        fetch('/api/infinite-generation?action=list'),
        fetch('/api/infinite-generation?action=health'),
        fetch('/api/infinite-generation?action=registration'),
      ]);

      if (genRes.ok) {
        const genData = await genRes.json();
        setGenerators(genData.generators || []);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData.health);
      }

      if (provRes.ok) {
        const provData = await provRes.json();
        setProviders(provData.providers || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Обновление каждые 30 секунд
    return () => clearInterval(interval);
  }, [loadData]);

  // Создание генератора
  const handleCreateGenerator = async () => {
    try {
      const response = await fetch('/api/infinite-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          name: formData.name || 'My Generator',
          contentType: formData.contentType,
          prompts: formData.prompts.split('\n').filter(p => p.trim()),
          intervalSeconds: formData.intervalSeconds,
          preferredProviders: formData.preferredProviders,
          maxGenerationsPerDay: formData.maxGenerationsPerDay,
          autoSwitchOnLimit: formData.autoSwitchOnLimit,
          style: formData.style,
        }),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setFormData({
          name: '',
          contentType: 'text',
          prompts: '',
          intervalSeconds: 60,
          preferredProviders: [],
          maxGenerationsPerDay: 1000,
          autoSwitchOnLimit: true,
          style: '',
        });
        loadData();
      }
    } catch (error) {
      console.error('Failed to create generator:', error);
    }
  };

  // Управление генератором
  const handleGeneratorAction = async (generatorId: string, action: string) => {
    try {
      await fetch('/api/infinite-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, generatorId }),
      });
      loadData();
    } catch (error) {
      console.error(`Failed to ${action} generator:`, error);
    }
  };

  // Регистрация API ключа
  const handleRegisterProvider = async (provider: string) => {
    try {
      const response = await fetch('/api/infinite-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', provider }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Регистрация запущена. Task ID: ${data.taskId}`);
      }
    } catch (error) {
      console.error('Failed to register:', error);
    }
  };

  // Рендер статуса
  const renderStatus = (status: string) => {
    const statusConfig = {
      running: { color: 'bg-green-500', label: 'Работает', icon: Play },
      paused: { color: 'bg-yellow-500', label: 'Пауза', icon: Pause },
      stopped: { color: 'bg-gray-500', label: 'Остановлен', icon: Square },
      error: { color: 'bg-red-500', label: 'Ошибка', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.stopped;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Рендер здоровья системы
  const renderHealthStatus = () => {
    if (!health) return null;

    const statusColors = {
      healthy: 'text-green-500',
      degraded: 'text-yellow-500',
      critical: 'text-red-500',
      offline: 'text-gray-500',
    };

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Провайдеры</p>
                <p className="text-2xl font-bold">
                  {health.metrics.healthyProviders}/{health.metrics.totalProviders}
                </p>
              </div>
              <Globe className={`w-8 h-8 ${statusColors[health.overall]}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">API Ключи</p>
                <p className="text-2xl font-bold">{health.metrics.activeApiKeys}</p>
              </div>
              <Key className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">За 24ч</p>
                <p className="text-2xl font-bold">{health.metrics.totalGenerated24h}</p>
              </div>
              <Zap className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Успешность</p>
                <p className="text-2xl font-bold">
                  {(health.metrics.avgSuccessRate * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">24/365 Генерация</h2>
          <p className="text-muted-foreground">
            Непрерывная генерация контента без ограничений
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Создать генератор
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Создать генератор 24/365</DialogTitle>
                <DialogDescription>
                  Настройте непрерывную генерацию контента
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Название</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Мой генератор"
                    />
                  </div>
                  <div>
                    <Label>Тип контента</Label>
                    <Select
                      value={formData.contentType}
                      onValueChange={(v) => setFormData({ ...formData, contentType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Текст</SelectItem>
                        <SelectItem value="image">Изображения</SelectItem>
                        <SelectItem value="video">Видео</SelectItem>
                        <SelectItem value="audio">Аудио</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Промпты (по одному на строку)</Label>
                  <Textarea
                    value={formData.prompts}
                    onChange={(e) => setFormData({ ...formData, prompts: e.target.value })}
                    placeholder="Напишите интересный пост о технологиях&#10;Создайте обзор продукта&#10;Расскажите историю успеха"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Интервал (секунды)</Label>
                    <Input
                      type="number"
                      value={formData.intervalSeconds}
                      onChange={(e) => setFormData({ ...formData, intervalSeconds: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                  <div>
                    <Label>Макс. в день</Label>
                    <Input
                      type="number"
                      value={formData.maxGenerationsPerDay}
                      onChange={(e) => setFormData({ ...formData, maxGenerationsPerDay: parseInt(e.target.value) || 1000 })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Провайдеры</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PROVIDERS_BY_CATEGORY[formData.contentType as keyof typeof PROVIDERS_BY_CATEGORY]?.map((p) => (
                      <Badge
                        key={p}
                        variant={formData.preferredProviders.includes(p) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          const current = formData.preferredProviders;
                          if (current.includes(p)) {
                            setFormData({ ...formData, preferredProviders: current.filter(x => x !== p) });
                          } else {
                            setFormData({ ...formData, preferredProviders: [...current, p] });
                          }
                        }}
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.autoSwitchOnLimit}
                    onCheckedChange={(v) => setFormData({ ...formData, autoSwitchOnLimit: v })}
                  />
                  <Label>Автопереключение при лимитах</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Отмена
                </Button>
                <Button onClick={handleCreateGenerator}>
                  Создать и запустить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Health Status */}
      {renderHealthStatus()}

      {/* Alerts */}
      {health?.alerts && health.alerts.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
              Уведомления
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {health.alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <Badge
                      variant={alert.severity === 'critical' ? 'destructive' : 'outline'}
                    >
                      {alert.severity}
                    </Badge>
                    <span className="ml-2">{alert.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleString('ru')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generators">
            <Activity className="w-4 h-4 mr-2" />
            Генераторы ({generators.length})
          </TabsTrigger>
          <TabsTrigger value="providers">
            <Globe className="w-4 h-4 mr-2" />
            Провайдеры
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </TabsTrigger>
        </TabsList>

        {/* Generators Tab */}
        <TabsContent value="generators">
          {generators.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Нет активных генераторов</h3>
                <p className="text-muted-foreground mb-4">
                  Создайте генератор для непрерывной генерации контента 24/365
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать генератор
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {generators.map((gen) => (
                <Card key={gen.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Генератор #{gen.id.slice(0, 8)}</CardTitle>
                        <CardDescription>
                          Провайдер: {gen.state.currentProvider}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStatus(gen.state.status)}
                        <div className="flex gap-1">
                          {gen.state.status === 'running' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGeneratorAction(gen.id, 'pause')}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          )}
                          {gen.state.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGeneratorAction(gen.id, 'resume')}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleGeneratorAction(gen.id, 'stop')}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Сгенерировано</p>
                        <p className="text-2xl font-bold">{gen.state.generated}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Сегодня</p>
                        <p className="text-2xl font-bold">{gen.stats.todayGenerated}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Успешность</p>
                        <p className="text-2xl font-bold">
                          {(gen.stats.successRate * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ошибки</p>
                        <p className="text-2xl font-bold text-red-500">{gen.state.errors}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-2">Успешность по провайдерам</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(gen.stats.byProvider).map(([provider, stats]) => (
                          <Badge key={provider} variant="outline">
                            {provider}: {stats.count} ({((stats.success / stats.count) * 100).toFixed(0)}%)
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {gen.state.nextGenerationAt && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        Следующая генерация: {new Date(gen.state.nextGenerationAt).toLocaleString('ru')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers">
          <div className="grid gap-4">
            {['text', 'video', 'image', 'audio'].map((category) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{category} Провайдеры</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {providers
                      .filter((p) => p.category === category)
                      .map((p) => (
                        <div
                          key={p.provider}
                          className="flex items-center justify-between p-3 bg-muted rounded"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{p.provider}</span>
                              {p.isFree && <Badge variant="outline">Бесплатный</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Дневная квота: {p.dailyQuota}
                              {p.requiresPhone && ' • Требует телефон'}
                              {p.requiresCard && ' • Требует карту'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegisterProvider(p.provider)}
                          >
                            <Key className="w-4 h-4 mr-2" />
                            Регистрация
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Настройки системы</CardTitle>
              <CardDescription>
                Глобальные настройки для 24/365 генерации
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Автовосстановление</Label>
                    <p className="text-sm text-muted-foreground">
                      Автоматическое восстановление при ошибках
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Telegram уведомления</Label>
                    <p className="text-sm text-muted-foreground">
                      Получать уведомления о критических ошибках
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Автоприобретение API ключей</Label>
                    <p className="text-sm text-muted-foreground">
                      Автоматическая регистрация новых ключей при исчерпании
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Прокси</h4>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Хост</Label>
                      <Input placeholder="proxy.example.com" />
                    </div>
                    <div>
                      <Label>Порт</Label>
                      <Input placeholder="8080" />
                    </div>
                  </div>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить прокси
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default InfiniteGenerationPanel;

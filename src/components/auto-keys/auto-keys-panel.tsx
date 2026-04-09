'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  RefreshCw,
  Plus,
  Key,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Sparkles,
  Zap,
  Shield,
  Globe,
  Mail,
  Phone,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';

interface ProviderInfo {
  id: string;
  name: string;
  category: string;
  freeDailyQuota: number;
  freeMonthlyQuota?: number;
  requires: {
    email: boolean;
    phone: boolean;
    card: boolean;
    captcha: boolean;
  };
}

interface AcquisitionStats {
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalKeysAcquired: number;
}

interface AcquisitionTask {
  id: string;
  provider: string;
  status: string;
  apiKey?: string;
  keyId?: string;
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export function AutoKeysPanel() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [stats, setStats] = useState<AcquisitionStats | null>(null);
  const [tasks, setTasks] = useState<AcquisitionTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [batchCount, setBatchCount] = useState(1);
  const [resultDialog, setResultDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    success: boolean;
  }>({ open: false, title: '', message: '', success: false });

  // Загрузка данных
  const loadData = useCallback(async () => {
    try {
      // Загружаем провайдеров
      const providersRes = await fetch('/api/auto-keys?action=providers');
      const providersData = await providersRes.json();
      if (providersData.success) {
        setProviders(providersData.providers);
      }

      // Загружаем статистику
      const statsRes = await fetch('/api/auto-keys');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Обновляем каждые 10 секунд
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Создать задачу на получение ключа
  const createTask = async (provider: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auto-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      const data = await res.json();

      setResultDialog({
        open: true,
        title: data.success ? 'Задача создана' : 'Ошибка',
        message: data.success
          ? `Задача на получение ключа для ${provider} создана. ID: ${data.taskId}`
          : data.error,
        success: data.success,
      });

      if (data.success) {
        loadData();
      }
    } catch (error) {
      setResultDialog({
        open: true,
        title: 'Ошибка',
        message: 'Не удалось создать задачу',
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Массовое создание задач
  const createBatchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auto-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch',
          count: batchCount,
        }),
      });

      const data = await res.json();

      setResultDialog({
        open: true,
        title: data.success ? 'Задачи созданы' : 'Ошибка',
        message: data.success
          ? `Создано ${data.created} задач на получение ключей`
          : data.error,
        success: data.success,
      });

      if (data.success) {
        loadData();
      }
    } catch (error) {
      setResultDialog({
        open: true,
        title: 'Ошибка',
        message: 'Не удалось создать задачи',
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Принудительная обработка очереди
  const forceProcess = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auto-keys', {
        method: 'PUT',
      });

      const data = await res.json();

      setResultDialog({
        open: true,
        title: data.success ? 'Обработка запущена' : 'Ошибка',
        message: data.success
          ? 'Обработка очереди запущена. Ключи будут получены автоматически.'
          : data.error,
        success: data.success,
      });

      if (data.success) {
        setTimeout(loadData, 2000);
      }
    } catch (error) {
      setResultDialog({
        open: true,
        title: 'Ошибка',
        message: 'Не удалось запустить обработку',
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Получить иконку категории
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'text':
        return <Sparkles className="h-4 w-4" />;
      case 'image':
        return <Key className="h-4 w-4" />;
      case 'video':
        return <Zap className="h-4 w-4" />;
      case 'audio':
        return <Globe className="h-4 w-4" />;
      default:
        return <Key className="h-4 w-4" />;
    }
  };

  // Получить цвет статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      case 'registering':
      case 'creating_email':
      case 'verifying':
      case 'getting_key':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Получить текст статуса
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Ожидание',
      creating_email: 'Создание email',
      registering: 'Регистрация',
      verifying: 'Верификация',
      getting_key: 'Получение ключа',
      adding_to_system: 'Добавление в систему',
      completed: 'Завершено',
      failed: 'Ошибка',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            Автоматическое получение ключей
          </h2>
          <p className="text-muted-foreground">
            Система автоматически получает API ключи от провайдеров
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="auto-mode">Авто-режим</Label>
          <Switch
            id="auto-mode"
            checked={autoMode}
            onCheckedChange={setAutoMode}
          />
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ожидают</p>
                  <p className="text-2xl font-bold">{stats.pendingTasks}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Получено</p>
                  <p className="text-2xl font-bold text-green-500">{stats.completedTasks}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ошибок</p>
                  <p className="text-2xl font-bold text-red-500">{stats.failedTasks}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Всего ключей</p>
                  <p className="text-2xl font-bold">{stats.totalKeysAcquired}</p>
                </div>
                <Key className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Табы */}
      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Провайдеры</TabsTrigger>
          <TabsTrigger value="batch">Массовое получение</TabsTrigger>
          <TabsTrigger value="queue">Очередь задач</TabsTrigger>
        </TabsList>

        {/* Провайдеры */}
        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <Card key={provider.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getCategoryIcon(provider.category)}
                      {provider.name}
                    </CardTitle>
                    <Badge variant="outline">{provider.category}</Badge>
                  </div>
                  <CardDescription>
                    {provider.freeDailyQuota.toLocaleString()} запросов/день
                    {provider.freeMonthlyQuota && (
                      <span> · {provider.freeMonthlyQuota.toLocaleString()}/мес</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Требования */}
                  <div className="flex flex-wrap gap-1">
                    {provider.requires.email && (
                      <Badge variant="secondary" className="text-xs">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Badge>
                    )}
                    {provider.requires.phone && (
                      <Badge variant="secondary" className="text-xs text-yellow-500">
                        <Phone className="h-3 w-3 mr-1" />
                        Телефон
                      </Badge>
                    )}
                    {provider.requires.card && (
                      <Badge variant="secondary" className="text-xs text-red-500">
                        <CreditCard className="h-3 w-3 mr-1" />
                        Карта
                      </Badge>
                    )}
                    {provider.requires.captcha && (
                      <Badge variant="secondary" className="text-xs text-orange-500">
                        <Shield className="h-3 w-3 mr-1" />
                        Капча
                      </Badge>
                    )}
                  </div>

                  {/* Кнопка получения */}
                  <Button
                    className="w-full"
                    onClick={() => createTask(provider.id)}
                    disabled={loading || provider.requires.phone || provider.requires.card}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Получить ключ
                  </Button>

                  {/* Предупреждение */}
                  {(provider.requires.phone || provider.requires.card) && (
                    <div className="flex items-center gap-2 text-xs text-yellow-500">
                      <AlertTriangle className="h-3 w-3" />
                      Требуется ручная регистрация
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Массовое получение */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Массовое получение ключей</CardTitle>
              <CardDescription>
                Создайте задачи на получение ключей для всех доступных провайдеров
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Количество ключей на провайдера</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={batchCount}
                    onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label>Провайдеров без телефона/карты</Label>
                  <Input
                    value={providers.filter(p => !p.requires.phone && !p.requires.card).length}
                    disabled
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={createBatchTasks}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Создать {batchCount * providers.filter(p => !p.requires.phone && !p.requires.card).length} задач
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Очередь задач */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Очередь задач</h3>
            <Button onClick={forceProcess} disabled={loading} variant="outline">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Запустить обработку
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {tasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет активных задач</p>
                  <p className="text-sm">Создайте задачи на вкладке "Провайдеры"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
                        <div>
                          <p className="font-medium">{task.provider}</p>
                          <p className="text-sm text-muted-foreground">
                            {getStatusText(task.status)}
                            {task.attempts > 0 && ` · Попытка ${task.attempts}/${task.maxAttempts}`}
                          </p>
                        </div>
                      </div>
                      <div>
                        {task.status === 'completed' && task.apiKey && (
                          <Badge variant="default" className="bg-green-500">
                            {task.apiKey.substring(0, 15)}...
                          </Badge>
                        )}
                        {task.status === 'failed' && task.error && (
                          <Badge variant="destructive">{task.error}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Диалог результата */}
      <AlertDialog open={resultDialog.open} onOpenChange={(open) => setResultDialog({ ...resultDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {resultDialog.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {resultDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{resultDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AutoKeysPanel;

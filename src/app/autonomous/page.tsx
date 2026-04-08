'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  lastCheck: string;
  checks: {
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    value?: number;
  }[];
}

interface AutonomousStats {
  tasks: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    retried: number;
  };
  dlq: {
    total: number;
    unresolved: number;
    recentErrors: number;
  };
  checkpoints: {
    inProgress: number;
    resumable: number;
  };
  sticky: {
    active: number;
    expiringSoon: number;
  };
  proxy: {
    working: number;
    total: number;
  };
}

export default function AutonomousPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<AutonomousStats | null>(null);
  const [dlqEntries, setDlqEntries] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    await Promise.all([
      fetchHealth(),
      fetchStats(),
      fetchDLQEntries(),
      fetchActiveSessions()
    ]);
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (e) {}
  };

  const fetchStats = async () => {
    try {
      const [tasks, dlq, checkpoints, sticky, proxy] = await Promise.all([
        fetch('/api/tasks?action=stats').then(r => r.json()),
        fetch('/api/dlq?action=stats').then(r => r.json()),
        fetch('/api/checkpoints?action=stats').then(r => r.json()),
        fetch('/api/sticky-sessions?action=stats').then(r => r.json()),
        fetch('/api/sim-auto/proxy?action=stats').then(r => r.json())
      ]);

      setStats({
        tasks: tasks.stats || {},
        dlq: dlq.stats || {},
        checkpoints: checkpoints.stats || {},
        sticky: sticky.stats || {},
        proxy: proxy.data?.stats || {}
      });
    } catch (e) {}
  };

  const fetchDLQEntries = async () => {
    try {
      const res = await fetch('/api/dlq?resolved=false&limit=10');
      const data = await res.json();
      setDlqEntries(data.entries || []);
    } catch (e) {}
  };

  const fetchActiveSessions = async () => {
    try {
      const res = await fetch('/api/sticky-sessions?action=list&limit=10');
      const data = await res.json();
      setActiveSessions(data.sessions || []);
    } catch (e) {}
  };

  const handleStartSystem = async () => {
    setLoading(true);
    try {
      await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      fetchAll();
    } catch (e) {}
    setLoading(false);
  };

  const handleRetryDLQ = async (id: string) => {
    try {
      await fetch('/api/dlq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', id })
      });
      fetchAll();
    } catch (e) {}
  };

  const handleCleanupExpired = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetch('/api/sticky-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cleanup-expired' })
        }),
        fetch('/api/checkpoints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cleanup-expired' })
        })
      ]);
      fetchAll();
    } catch (e) {}
    setLoading(false);
  };

  const getOverallColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getOverallBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🤖 Автономная работа 24/365</h1>
          <p className="text-gray-500">Мониторинг системы для непрерывной работы</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleStartSystem} disabled={loading}>
            ▶️ Запустить
          </Button>
          <Button variant="outline" onClick={handleCleanupExpired} disabled={loading}>
            🧹 Очистить истекшие
          </Button>
          <Button variant="outline" onClick={fetchAll}>
            🔄 Обновить
          </Button>
        </div>
      </div>

      {/* Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Состояние системы</CardTitle>
              <CardDescription>
                Обновлено: {health?.lastCheck ? new Date(health.lastCheck).toLocaleTimeString() : '-'}
              </CardDescription>
            </div>
            {health && (
              <Badge className={getOverallBadge(health.overall)}>
                {health.overall === 'healthy' ? '✅ Здорова' : 
                 health.overall === 'degraded' ? '⚠️ Деградация' : '❌ Критично'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {health?.checks?.map((check, i) => (
              <div key={i} className="p-2 border rounded">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    check.status === 'ok' ? 'bg-green-500' :
                    check.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium">{check.name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{check.message}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">📋 Задачи</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.tasks ? (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Ожидают:</span>
                  <Badge variant="outline">{stats.tasks.pending || 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Выполняются:</span>
                  <Badge className="bg-blue-500">{stats.tasks.running || 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Завершено:</span>
                  <Badge className="bg-green-500">{stats.tasks.completed || 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Ошибок:</span>
                  <Badge className="bg-red-500">{stats.tasks.failed || 0}</Badge>
                </div>
              </div>
            ) : <div className="text-gray-500 text-sm">-</div>}
          </CardContent>
        </Card>

        {/* DLQ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">💀 DLQ</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.dlq ? (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Не решённых:</span>
                  <Badge className={(stats.dlq.unresolved || 0) > 0 ? 'bg-red-500' : 'bg-green-500'}>
                    {stats.dlq.unresolved || 0}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>За 24ч:</span>
                  <Badge className="bg-yellow-500">{stats.dlq.recentErrors || 0}</Badge>
                </div>
              </div>
            ) : <div className="text-gray-500 text-sm">-</div>}
          </CardContent>
        </Card>

        {/* Checkpoints */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">📍 Чекпоинты</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.checkpoints ? (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>В процессе:</span>
                  <Badge className="bg-blue-500">{stats.checkpoints.inProgress || 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Можно возобновить:</span>
                  <Badge className="bg-green-500">{stats.checkpoints.resumable || 0}</Badge>
                </div>
              </div>
            ) : <div className="text-gray-500 text-sm">-</div>}
          </CardContent>
        </Card>

        {/* Sticky Sessions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🔗 Сессии</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.sticky ? (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Активных:</span>
                  <Badge className="bg-green-500">{stats.sticky.active || 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Истекают скоро:</span>
                  <Badge className="bg-yellow-500">{stats.sticky.expiringSoon || 0}</Badge>
                </div>
              </div>
            ) : <div className="text-gray-500 text-sm">-</div>}
          </CardContent>
        </Card>

        {/* Proxy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🌐 Прокси</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.proxy ? (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Рабочих:</span>
                  <Badge className="bg-green-500">{stats.proxy.working || 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Всего:</span>
                  <Badge variant="outline">{stats.proxy.total || 0}</Badge>
                </div>
                <Progress 
                  value={stats.proxy.total > 0 ? (stats.proxy.working / stats.proxy.total) * 100 : 0}
                  className="mt-2 h-1"
                />
              </div>
            ) : <div className="text-gray-500 text-sm">-</div>}
          </CardContent>
        </Card>
      </div>

      {/* DLQ and Sessions Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DLQ Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">💀 Необработанные ошибки (DLQ)</CardTitle>
          </CardHeader>
          <CardContent>
            {dlqEntries.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {dlqEntries.map((entry) => (
                    <div key={entry.id} className="p-2 border rounded text-sm">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{entry.taskType}</Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRetryDLQ(entry.id)}
                        >
                          🔄 Retry
                        </Button>
                      </div>
                      <div className="text-red-500 text-xs mt-1 truncate">{entry.error}</div>
                      <div className="text-gray-500 text-xs mt-1">
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-gray-500 py-8">
                ✅ Нет необработанных ошибок
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Sticky Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🔗 Активные привязки прокси</CardTitle>
          </CardHeader>
          <CardContent>
            {activeSessions.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="p-2 border rounded text-sm">
                      <div className="flex items-center justify-between">
                        <Badge>{session.platform || 'unknown'}</Badge>
                        <Badge className={session.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                          {session.status}
                        </Badge>
                      </div>
                      <div className="text-xs mt-1">
                        {session.proxyHost}:{session.proxyPort}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Аккаунт: {session.accountId || '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Истекает: {session.expiresAt ? new Date(session.expiresAt).toLocaleString() : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Нет активных привязок
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Autonomous Features Info */}
      <Card>
        <CardHeader>
          <CardTitle>📚 Компоненты автономной работы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="p-3 border rounded">
              <div className="font-medium mb-1">📋 Task Queue</div>
              <div className="text-gray-500">
                Постоянная очередь задач на SQLite. Задачи сохраняются между перезапусками.
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="font-medium mb-1">⏰ Cron Scheduler</div>
              <div className="text-gray-500">
                Регулярные задачи: обновление прокси, бэкапы, проверки здоровья.
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="font-medium mb-1">💀 Dead Letter Queue</div>
              <div className="text-gray-500">
                Хранение проваленных задач для повторной обработки или анализа.
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="font-medium mb-1">📍 Checkpoints</div>
              <div className="text-gray-500">
                Сохранение прогресса регистраций для восстановления после сбоев.
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="font-medium mb-1">🔗 Sticky Sessions</div>
              <div className="text-gray-500">
                Привязка прокси к аккаунтам для стабильности регистраций.
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="font-medium mb-1">🔐 Captcha Solver</div>
              <div className="text-gray-500">
                Мультипровайдерная система решения капч (2captcha, anticaptcha, etc).
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

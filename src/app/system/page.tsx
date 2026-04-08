'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SystemStatus {
  initialized: boolean;
  components: {
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
  }[];
}

interface TaskStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  currentWorkers: number;
  processed: number;
  retried: number;
}

interface ProxyStats {
  totalProxies: number;
  workingProxies: number;
  httpProxies: number;
  socksProxies: number;
  lastRefresh: string | null;
}

export default function SystemDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [proxyStats, setProxyStats] = useState<ProxyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    await Promise.all([fetchSystemStatus(), fetchTaskStats(), fetchProxyStats()]);
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/system');
      const data = await res.json();
      if (data.success) setSystemStatus(data);
    } catch (e) {}
  };

  const fetchTaskStats = async () => {
    try {
      const res = await fetch('/api/tasks?action=stats');
      const data = await res.json();
      if (data.success) setTaskStats(data.stats);
    } catch (e) {}
  };

  const fetchProxyStats = async () => {
    try {
      const res = await fetch('/api/sim-auto/proxy?action=stats');
      const data = await res.json();
      if (data.success) setProxyStats(data.data.stats);
    } catch (e) {}
  };

  const startSystem = async () => {
    setLoading(true);
    addLog('🚀 Запуск системы...');
    try {
      const res = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      const data = await res.json();
      addLog(data.message);
      fetchAll();
    } catch (e: any) {
      addLog(`❌ Ошибка: ${e.message}`);
    }
    setLoading(false);
  };

  const refreshProxies = async () => {
    addLog('🔄 Обновление прокси...');
    try {
      const res = await fetch('/api/sim-auto/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      });
      const data = await res.json();
      addLog(data.message);
    } catch (e: any) {
      addLog(`❌ Ошибка: ${e.message}`);
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎛️ Панель управления МУКН</h1>
        <div className="flex gap-2">
          <Button onClick={startSystem} disabled={loading}>
            {systemStatus?.initialized ? '✅ Система активна' : '▶️ Запустить систему'}
          </Button>
          <Button variant="outline" onClick={fetchAll}>🔄 Обновить</Button>
        </div>
      </div>

      {/* Компоненты системы */}
      <Card>
        <CardHeader>
          <CardTitle>📦 Компоненты системы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {systemStatus?.components.map((comp) => (
              <div key={comp.name} className="flex items-center gap-2 p-2 border rounded">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(comp.status)}`} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{comp.name}</div>
                  <div className="text-xs text-gray-500">{comp.message}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Задачи */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">📋 Очередь задач</CardTitle>
          </CardHeader>
          <CardContent>
            {taskStats ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ожидают:</span>
                  <Badge>{taskStats.pending}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Выполняются:</span>
                  <Badge className="bg-blue-500">{taskStats.running}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Завершено:</span>
                  <Badge className="bg-green-500">{taskStats.completed}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Ошибок:</span>
                  <Badge className="bg-red-500">{taskStats.failed}</Badge>
                </div>
                <Progress value={taskStats.processed > 0 ? (taskStats.completed / taskStats.processed) * 100 : 0} />
              </div>
            ) : (
              <div className="text-gray-500">Загрузка...</div>
            )}
          </CardContent>
        </Card>

        {/* Прокси */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">🌐 Прокси</CardTitle>
          </CardHeader>
          <CardContent>
            {proxyStats ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Рабочих:</span>
                  <Badge className="bg-green-500">{proxyStats.workingProxies}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>HTTP/HTTPS:</span>
                  <Badge>{proxyStats.httpProxies}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>SOCKS:</span>
                  <Badge className="bg-purple-500">{proxyStats.socksProxies}</Badge>
                </div>
                <Button size="sm" className="w-full mt-2" onClick={refreshProxies}>
                  🔄 Обновить прокси
                </Button>
              </div>
            ) : (
              <div className="text-gray-500">Загрузка...</div>
            )}
          </CardContent>
        </Card>

        {/* Быстрые действия */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">⚡ Действия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline" asChild>
              <a href="/proxy-manager" target="_blank">🔐 Менеджер прокси</a>
            </Button>
            <Button className="w-full" variant="outline" asChild>
              <a href="/logs" target="_blank">📋 Логи</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Логи */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">📜 Логи системы</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setLogs([])}>Очистить</Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px] bg-black rounded p-2 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">Логи будут отображаться здесь...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-green-400">{log}</div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Cron задачи */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">⏰ Автоматические задачи</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div className="p-2 border rounded">
              <div className="font-medium">proxy-refresh</div>
              <div className="text-gray-500">каждые 30 мин</div>
            </div>
            <div className="p-2 border rounded">
              <div className="font-medium">accounts-health-check</div>
              <div className="text-gray-500">каждые 15 мин</div>
            </div>
            <div className="p-2 border rounded">
              <div className="font-medium">backup-database</div>
              <div className="text-gray-500">каждые 6 часов</div>
            </div>
            <div className="p-2 border rounded">
              <div className="font-medium">daily-stats-reset</div>
              <div className="text-gray-500">ежедневно 00:00</div>
            </div>
            <div className="p-2 border rounded">
              <div className="font-medium">cleanup-old-tasks</div>
              <div className="text-gray-500">ежедневно 03:00</div>
            </div>
            <div className="p-2 border rounded">
              <div className="font-medium">proxy-validate</div>
              <div className="text-gray-500">каждый час</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

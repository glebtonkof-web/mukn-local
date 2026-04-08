'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProxyInfo {
  id: string;
  host: string;
  port: number;
  type: string;
  country?: string;
  speed?: number;
  working: boolean;
  source?: string;
}

interface ProxyStats {
  totalProxies: number;
  workingProxies: number;
  httpProxies: number;
  socksProxies: number;
  lastRefresh: string | null;
}

export default function ProxyManagerPage() {
  const [stats, setStats] = useState<ProxyStats | null>(null);
  const [proxies, setProxies] = useState<ProxyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customProxy, setCustomProxy] = useState({
    host: '',
    port: '',
    type: 'http' as 'http' | 'https' | 'socks4' | 'socks5',
    username: '',
    password: ''
  });
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchStats();
    fetchProxies();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/sim-auto/proxy?action=stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchProxies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sim-auto/proxy?action=list');
      const data = await response.json();
      if (data.success) {
        setProxies(data.proxies);
      }
    } catch (error) {
      console.error('Error fetching proxies:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRefresh = async () => {
    setRefreshing(true);
    setLogs(prev => [...prev, '🔄 Начинаем поиск прокси...']);
    
    try {
      const response = await fetch('/api/sim-auto/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      });
      
      const data = await response.json();
      setLogs(prev => [...prev, data.message]);
      
      // Периодически проверяем статус
      let attempts = 0;
      const checkStatus = setInterval(async () => {
        attempts++;
        const statsResponse = await fetch('/api/sim-auto/proxy?action=stats');
        const statsData = await statsResponse.json();
        
        if (statsData.success && statsData.data.stats.workingProxies > 0) {
          clearInterval(checkStatus);
          setRefreshing(false);
          setStats(statsData.data.stats);
          fetchProxies();
          setLogs(prev => [...prev, `✅ Найдено ${statsData.data.stats.workingProxies} рабочих прокси`]);
        } else if (attempts > 60) {
          clearInterval(checkStatus);
          setRefreshing(false);
          setLogs(prev => [...prev, '⏱ Время ожидания истекло']);
        }
      }, 3000);
      
    } catch (error) {
      setRefreshing(false);
      setLogs(prev => [...prev, `❌ Ошибка: ${error}`]);
    }
  };

  const addCustomProxy = async () => {
    if (!customProxy.host || !customProxy.port) {
      setLogs(prev => [...prev, '❌ Укажите хост и порт']);
      return;
    }
    
    try {
      const response = await fetch('/api/sim-auto/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          host: customProxy.host,
          port: parseInt(customProxy.port),
          protocol: customProxy.type,
          username: customProxy.username || undefined,
          password: customProxy.password || undefined
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setLogs(prev => [...prev, `✅ Добавлен прокси ${customProxy.host}:${customProxy.port}`]);
        fetchProxies();
        fetchStats();
        setCustomProxy({ host: '', port: '', type: 'http', username: '', password: '' });
      } else {
        setLogs(prev => [...prev, `❌ Ошибка: ${data.error}`]);
      }
    } catch (error) {
      setLogs(prev => [...prev, `❌ Ошибка: ${error}`]);
    }
  };

  const testProxy = async (proxy: ProxyInfo) => {
    setLogs(prev => [...prev, `🔍 Проверка ${proxy.host}:${proxy.port}...`]);
    
    try {
      const response = await fetch('/api/proxies/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: proxy.host,
          port: proxy.port,
          type: proxy.type
        })
      });
      
      const data = await response.json();
      if (data.success && data.working) {
        setLogs(prev => [...prev, `✅ ${proxy.host}:${proxy.port} работает (${data.responseTime}ms)`]);
      } else {
        setLogs(prev => [...prev, `❌ ${proxy.host}:${proxy.port} не работает`]);
      }
    } catch (error) {
      setLogs(prev => [...prev, `❌ Ошибка проверки: ${error}`]);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold">🔐 Менеджер прокси</h1>
      
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {stats?.workingProxies || 0}
            </div>
            <div className="text-sm text-gray-500">Рабочих прокси</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">
              {stats?.httpProxies || 0}
            </div>
            <div className="text-sm text-gray-500">HTTP/HTTPS</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-500">
              {stats?.socksProxies || 0}
            </div>
            <div className="text-sm text-gray-500">SOCKS</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">
              {stats?.lastRefresh 
                ? new Date(stats.lastRefresh).toLocaleTimeString('ru-RU')
                : 'Никогда'
              }
            </div>
            <div className="text-sm text-gray-500">Последнее обновление</div>
          </CardContent>
        </Card>
      </div>

      {/* Кнопки управления */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-2">
          <Button onClick={startRefresh} disabled={refreshing}>
            {refreshing ? '⏳ Поиск...' : '🔍 Найти прокси'}
          </Button>
          <Button variant="outline" onClick={fetchProxies} disabled={loading}>
            {loading ? '⏳ Загрузка...' : '🔄 Обновить список'}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await fetch('/api/sim-auto/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear' })
              });
              setProxies([]);
              fetchStats();
            }}
          >
            🗑 Очистить
          </Button>
        </CardContent>
      </Card>

      {/* Добавить свой прокси */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">➕ Добавить свой прокси</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Input
              placeholder="Хост"
              value={customProxy.host}
              onChange={(e) => setCustomProxy(prev => ({ ...prev, host: e.target.value }))}
            />
            <Input
              placeholder="Порт"
              type="number"
              value={customProxy.port}
              onChange={(e) => setCustomProxy(prev => ({ ...prev, port: e.target.value }))}
            />
            <select
              className="px-3 py-2 border rounded"
              value={customProxy.type}
              onChange={(e) => setCustomProxy(prev => ({ ...prev, type: e.target.value as any }))}
            >
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
              <option value="socks4">SOCKS4</option>
              <option value="socks5">SOCKS5</option>
            </select>
            <Input
              placeholder="Логин (опц.)"
              value={customProxy.username}
              onChange={(e) => setCustomProxy(prev => ({ ...prev, username: e.target.value }))}
            />
            <Input
              placeholder="Пароль (опц.)"
              type="password"
              value={customProxy.password}
              onChange={(e) => setCustomProxy(prev => ({ ...prev, password: e.target.value }))}
            />
            <Button onClick={addCustomProxy}>Добавить</Button>
          </div>
        </CardContent>
      </Card>

      {/* Список прокси */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            📋 Список прокси
            <Badge variant="outline" className="ml-2">{proxies.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {proxies.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Нет прокси. Нажмите "Найти прокси" для поиска.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Прокси</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Страна</TableHead>
                    <TableHead>Скорость</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proxies.map((proxy) => (
                    <TableRow key={proxy.id}>
                      <TableCell className="font-mono">{proxy.host}:{proxy.port}</TableCell>
                      <TableCell>
                        <Badge variant={
                          proxy.type === 'socks5' ? 'default' :
                          proxy.type === 'socks4' ? 'secondary' : 'outline'
                        }>
                          {proxy.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{proxy.country || '-'}</TableCell>
                      <TableCell>
                        {proxy.speed ? `${proxy.speed}ms` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={proxy.working ? 'bg-green-500' : 'bg-red-500'}>
                          {proxy.working ? '✓ Работает' : '✗ Не работает'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testProxy(proxy)}
                        >
                          Проверить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Логи */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">📜 Логи</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setLogs([])}>
            Очистить
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[150px] bg-black rounded p-2 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">Логи будут отображаться здесь...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-green-400">{log}</div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

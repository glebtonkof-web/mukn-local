'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Server,
  Plus,
  RefreshCw,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Trash2,
  Loader2,
  TrendingUp,
} from 'lucide-react';

interface ServerInfo {
  id: string;
  serverId: string;
  serverName: string | null;
  proxyHost: string | null;
  proxyPort: number | null;
  maxRequests: number;
  currentLoad: number;
  status: string;
  avgResponseTime: number;
  errorRate: number;
  loadPercent: number;
  score: number;
}

interface ServerStats {
  total: number;
  active: number;
  overloaded: number;
  offline: number;
  totalCapacity: number;
  totalLoad: number;
}

export function LoadBalancerPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  
  // Form state
  const [serverName, setServerName] = useState('');
  const [serverId, setServerId] = useState('');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState('');
  const [maxRequests, setMaxRequests] = useState('100');
  
  // Results state
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [bestServer, setBestServer] = useState<ServerInfo | null>(null);

  // Fetch servers on mount
  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/advanced/load-balancer');
      const data = await res.json();
      if (data.success) {
        setServers(data.servers);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  // Add server
  const addServer = async () => {
    if (!serverId) return;

    setLoading('add');
    try {
      const res = await fetch('/api/advanced/load-balancer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          serverName: serverName || undefined,
          proxyHost: proxyHost || undefined,
          proxyPort: proxyPort ? parseInt(proxyPort) : undefined,
          maxRequests: parseInt(maxRequests) || 100,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Reset form
        setServerId('');
        setServerName('');
        setProxyHost('');
        setProxyPort('');
        setMaxRequests('100');
        fetchServers();
      }
    } catch (error) {
      console.error('Error adding server:', error);
    } finally {
      setLoading(null);
    }
  };

  // Get best server
  const getBestServer = async () => {
    setLoading('best');
    try {
      const res = await fetch('/api/advanced/load-balancer?best=true');
      const data = await res.json();
      if (data.success) {
        setBestServer(data.bestServer);
        fetchServers();
      }
    } catch (error) {
      console.error('Error getting best server:', error);
    } finally {
      setLoading(null);
    }
  };

  // Reset load
  const resetLoad = async () => {
    setLoading('reset');
    try {
      const res = await fetch('/api/advanced/load-balancer?action=reset-load', {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        fetchServers();
      }
    } catch (error) {
      console.error('Error resetting load:', error);
    } finally {
      setLoading(null);
    }
  };

  // Health check
  const healthCheck = async () => {
    setLoading('health');
    try {
      const res = await fetch('/api/advanced/load-balancer?action=health-check', {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        fetchServers();
      }
    } catch (error) {
      console.error('Error running health check:', error);
    } finally {
      setLoading(null);
    }
  };

  // Delete server
  const deleteServer = async (id: string) => {
    try {
      const res = await fetch(`/api/advanced/load-balancer?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchServers();
      }
    } catch (error) {
      console.error('Error deleting server:', error);
    }
  };

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-green-500',
          badge: 'bg-green-500/10 text-green-600 border-green-500/20',
        };
      case 'overloaded':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'text-amber-500',
          badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        };
      case 'offline':
        return {
          icon: <XCircle className="h-4 w-4" />,
          color: 'text-red-500',
          badge: 'bg-red-500/10 text-red-600 border-red-500/20',
        };
      default:
        return {
          icon: <Activity className="h-4 w-4" />,
          color: 'text-gray-500',
          badge: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
        };
    }
  };

  // Get load color
  const getLoadColor = (loadPercent: number) => {
    if (loadPercent < 50) return 'bg-green-500';
    if (loadPercent < 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Всего серверов</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Активных</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.overloaded}</p>
                  <p className="text-sm text-muted-foreground">Перегруженных</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {stats.totalCapacity > 0
                      ? Math.round((stats.totalLoad / stats.totalCapacity) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Общая нагрузка</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Server Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-500" />
            Добавить сервер/прокси
          </CardTitle>
          <CardDescription>
            Добавьте новый сервер или прокси в балансировщик нагрузки
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm">ID сервера *</label>
              <Input
                placeholder="server-1"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Название</label>
              <Input
                placeholder="US Proxy 1"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Хост</label>
              <Input
                placeholder="proxy.example.com"
                value={proxyHost}
                onChange={(e) => setProxyHost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Порт</label>
              <Input
                placeholder="8080"
                value={proxyPort}
                onChange={(e) => setProxyPort(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Макс. запросов</label>
              <Input
                type="number"
                placeholder="100"
                value={maxRequests}
                onChange={(e) => setMaxRequests(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={addServer} disabled={loading === 'add' || !serverId}>
              {loading === 'add' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Добавление...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={getBestServer} disabled={loading === 'best'}>
          {loading === 'best' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          Лучший сервер
        </Button>
        <Button variant="outline" onClick={resetLoad} disabled={loading === 'reset'}>
          {loading === 'reset' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Сбросить нагрузку
        </Button>
        <Button variant="outline" onClick={healthCheck} disabled={loading === 'health'}>
          {loading === 'health' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Activity className="h-4 w-4 mr-2" />
          )}
          Health Check
        </Button>
      </div>

      {/* Best Server Recommendation */}
      {bestServer && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-500" />
              Рекомендуемый сервер
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-lg">{bestServer.serverName || bestServer.serverId}</p>
                <p className="text-sm text-muted-foreground">
                  {bestServer.proxyHost && `${bestServer.proxyHost}:${bestServer.proxyPort}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-500">
                  Score: {bestServer.score.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Нагрузка: {bestServer.loadPercent}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Server List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-500" />
            Список серверов
          </CardTitle>
          <CardDescription>
            Текущее состояние всех серверов в балансировщике
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {servers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Нет серверов. Добавьте первый сервер выше.</p>
              </div>
            ) : (
              servers.map((server) => {
                const statusDisplay = getStatusDisplay(server.status);
                return (
                  <div
                    key={server.id}
                    className="p-4 rounded-lg border space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={statusDisplay.color}>
                          {statusDisplay.icon}
                        </div>
                        <div>
                          <p className="font-medium">
                            {server.serverName || server.serverId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {server.proxyHost && `${server.proxyHost}:${server.proxyPort}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusDisplay.badge}>
                          {server.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteServer(server.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Load Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Нагрузка</span>
                        <span className="font-medium">
                          {server.currentLoad} / {server.maxRequests}
                        </span>
                      </div>
                      <Progress
                        value={server.loadPercent}
                        className="h-2"
                      />
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Отклик:</span>
                        <span className="font-medium">{server.avgResponseTime}ms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Ошибки:</span>
                        <span className={`font-medium ${server.errorRate > 5 ? 'text-red-500' : ''}`}>
                          {server.errorRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Score:</span>
                        <span className={`font-medium ${server.score > 70 ? 'text-green-500' : server.score > 40 ? 'text-amber-500' : 'text-red-500'}`}>
                          {server.score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoadBalancerPanel;

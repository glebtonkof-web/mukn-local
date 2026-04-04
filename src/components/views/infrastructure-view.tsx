'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, Server, Plus, CheckCircle, XCircle, RefreshCw,
  Trash2, Edit, Zap, AlertTriangle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types based on Prisma schema
interface Proxy {
  id: string;
  type: string;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  country: string | null;
  city: string | null;
  status: string;
  lastCheckAt: string | null;
  responseTime: number | null;
  provider: string | null;
  price: number | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SimCard {
  id: string;
  phoneNumber: string;
  operator: string | null;
  country: string;
  status: string;
  telegramAccountId: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProxiesResponse {
  proxies: Proxy[];
  pagination: {
    total: number;
    limit: number;
    hasMore: boolean;
  };
}

interface SimCardsResponse {
  simCards: SimCard[];
  stats: {
    total: number;
    available: number;
    inUse: number;
    blocked: number;
  };
}

interface ProxyCheckResult {
  active: boolean;
  responseTime?: number;
  error?: string;
  checkedAt: string;
}

export function ProxiesView() {
  const [proxyList, setProxyList] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProxies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/proxies');
      
      if (!response.ok) {
        throw new Error('Failed to fetch proxies');
      }
      
      const data: ProxiesResponse = await response.json();
      setProxyList(data.proxies);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error('Ошибка загрузки прокси: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  const checkProxy = async (proxyId: string) => {
    try {
      setCheckingId(proxyId);
      const response = await fetch('/api/proxies/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: proxyId }),
      });

      if (!response.ok) {
        throw new Error('Failed to check proxy');
      }

      const result: ProxyCheckResult = await response.json();
      
      // Update proxy in list with new status
      setProxyList(prev => prev.map(p => {
        if (p.id === proxyId) {
          return {
            ...p,
            status: result.active ? 'active' : 'failed',
            responseTime: result.responseTime || null,
            lastCheckAt: result.checkedAt,
          };
        }
        return p;
      }));

      if (result.active) {
        toast.success(`Прокси работает (${result.responseTime}ms)`);
      } else {
        toast.error(`Прокси не работает: ${result.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Ошибка проверки: ' + errorMessage);
    } finally {
      setCheckingId(null);
    }
  };

  const checkAllProxies = async () => {
    if (proxyList.length === 0) {
      toast.info('Нет прокси для проверки');
      return;
    }

    try {
      setChecking(true);
      let successCount = 0;
      let failCount = 0;

      for (const proxy of proxyList) {
        try {
          const response = await fetch('/api/proxies/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: proxy.id }),
          });

          if (response.ok) {
            const result: ProxyCheckResult = await response.json();
            
            setProxyList(prev => prev.map(p => {
              if (p.id === proxy.id) {
                return {
                  ...p,
                  status: result.active ? 'active' : 'failed',
                  responseTime: result.responseTime || null,
                  lastCheckAt: result.checkedAt,
                };
              }
              return p;
            }));

            if (result.active) {
              successCount++;
            } else {
              failCount++;
            }
          }
        } catch {
          failCount++;
        }
      }

      toast.success(`Проверка завершена: ${successCount} активно, ${failCount} ошибок`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Ошибка при проверке: ' + errorMessage);
    } finally {
      setChecking(false);
    }
  };

  const deleteProxy = async (proxyId: string) => {
    try {
      const response = await fetch(`/api/proxies?id=${proxyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete proxy');
      }

      setProxyList(prev => prev.filter(p => p.id !== proxyId));
      toast.success('Прокси удален');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Ошибка удаления: ' + errorMessage);
    }
  };

  const activeProxies = proxyList.filter(p => p.status === 'active').length;
  const failedProxies = proxyList.filter(p => p.status === 'failed').length;
  const avgPing = proxyList.length > 0
    ? Math.round(
        proxyList
          .filter(p => p.responseTime !== null)
          .reduce((sum, p) => sum + (p.responseTime || 0), 0) / 
        proxyList.filter(p => p.responseTime !== null).length || 0
      )
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertTriangle className="w-12 h-12 text-[#FF4D4D]" />
        <p className="text-[#FF4D4D]">Ошибка загрузки: {error}</p>
        <Button onClick={fetchProxies} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-7 h-7 text-[#6C63FF]" />
            Прокси
          </h1>
          <p className="text-[#8A8A8A]">{activeProxies} из {proxyList.length} активных</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={checkAllProxies} disabled={checking || proxyList.length === 0} className="border-[#2A2B32]">
            {checking ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Проверить все
          </Button>
          <Button className="bg-[#6C63FF]">
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeProxies}</p>
                <p className="text-xs text-[#8A8A8A]">Активных</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF4D4D]/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-[#FF4D4D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{failedProxies}</p>
                <p className="text-xs text-[#8A8A8A]">Ошибок</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{avgPing}ms</p>
                <p className="text-xs text-[#8A8A8A]">Средний пинг</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="p-0">
          {proxyList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#8A8A8A]">
              <Globe className="w-12 h-12 mb-4 opacity-50" />
              <p>Нет добавленных прокси</p>
              <p className="text-sm">Нажмите &quot;Добавить&quot; чтобы добавить первый прокси</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2A2B32]">
              {proxyList.map((proxy) => (
                <div key={proxy.id} className="flex items-center justify-between p-4 hover:bg-[#1E1F26]">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      proxy.status === 'active' ? 'bg-[#00D26A]' : 
                      proxy.status === 'failed' ? 'bg-[#FF4D4D]' : 'bg-[#8A8A8A]'
                    )} />
                    <div>
                      <p className="text-white font-mono">{proxy.host}:{proxy.port}</p>
                      <p className="text-xs text-[#8A8A8A]">{proxy.type.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {proxy.responseTime !== null && (
                      <span className="text-[#8A8A8A]">{proxy.responseTime}ms</span>
                    )}
                    <Badge className={cn(
                      proxy.status === 'active' ? 'bg-[#00D26A]' : 
                      proxy.status === 'failed' ? 'bg-[#FF4D4D]' : 'bg-[#8A8A8A]'
                    )}>
                      {proxy.status === 'active' ? 'Активен' : 
                       proxy.status === 'failed' ? 'Ошибка' : 'Неизвестно'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => checkProxy(proxy.id)}
                      disabled={checkingId === proxy.id}
                    >
                      {checkingId === proxy.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[#FF4D4D]"
                      onClick={() => deleteProxy(proxy.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SimCardsView() {
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    inUse: 0,
    blocked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSimCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/sim-cards');
      
      if (!response.ok) {
        throw new Error('Failed to fetch SIM cards');
      }
      
      const data: SimCardsResponse = await response.json();
      setSimCards(data.simCards);
      setStats(data.stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error('Ошибка загрузки SIM-карт: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSimCards();
  }, [fetchSimCards]);

  const deleteSimCard = async (simId: string) => {
    try {
      const response = await fetch(`/api/sim-cards?id=${simId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete SIM card');
      }

      setSimCards(prev => prev.filter(s => s.id !== simId));
      toast.success('SIM-карта удалена');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Ошибка удаления: ' + errorMessage);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Доступна';
      case 'in_use':
        return 'Используется';
      case 'blocked':
        return 'Заблокирована';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-[#00D26A]';
      case 'in_use':
        return 'bg-[#FFB800]';
      case 'blocked':
        return 'bg-[#FF4D4D]';
      default:
        return 'bg-[#8A8A8A]';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertTriangle className="w-12 h-12 text-[#FF4D4D]" />
        <p className="text-[#FF4D4D]">Ошибка загрузки: {error}</p>
        <Button onClick={fetchSimCards} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="w-7 h-7 text-[#6C63FF]" />
            SIM-карты
          </h1>
          <p className="text-[#8A8A8A]">{stats.available} доступно, {stats.inUse} используется</p>
        </div>
        <Button className="bg-[#6C63FF]">
          <Plus className="w-4 h-4 mr-2" />
          Добавить SIM
        </Button>
      </div>

      {simCards.length === 0 ? (
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="flex flex-col items-center justify-center py-12 text-[#8A8A8A]">
            <Server className="w-12 h-12 mb-4 opacity-50" />
            <p>Нет добавленных SIM-карт</p>
            <p className="text-sm">Нажмите &quot;Добавить SIM&quot; чтобы добавить первую карту</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {simCards.map((sim) => (
            <Card key={sim.id} className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-mono">{sim.phoneNumber}</span>
                  <Badge className={getStatusColor(sim.status)}>
                    {getStatusLabel(sim.status)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8A8A8A]">Оператор</span>
                    <span className="text-white">{sim.operator || 'Не указан'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8A8A8A]">Страна</span>
                    <span className="text-white">{sim.country}</span>
                  </div>
                  {sim.purchasePrice !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8A8A8A]">Цена покупки</span>
                      <span className="text-[#00D26A]">{sim.purchasePrice}₽</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#2A2B32]">
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[#FF4D4D]"
                    onClick={() => deleteSimCard(sim.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

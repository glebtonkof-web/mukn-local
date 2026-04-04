'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Shield, Search, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, Eye, Ban, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RiskHistory {
  date: string;
  score: number;
  factors: Array<{
    name: string;
    passed: boolean;
    weight: number;
    details?: string;
  }> | null;
}

interface Account {
  id: string;
  platform: string;
  username: string | null;
  status: string;
  banRisk: number;
  riskHistory: Array<{
    id: string;
    date: Date;
    riskScore: number;
    riskFactors: string | null;
  }>;
}

interface AccountWithCheck {
  id: string;
  channel: string;
  platform: string;
  status: 'clean' | 'warning' | 'banned';
  lastCheck: string;
  risk: number;
  rawStatus: string;
}

export function ShadowBanView() {
  const [checks, setChecks] = useState<AccountWithCheck[]>([]);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState({
    totalChecks: 0,
    clean: 0,
    warnings: 0,
    banned: 0,
  });

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    return `${diffDays} дн назад`;
  };

  const mapAccountToCheck = useCallback((account: Account): AccountWithCheck => {
    const lastRiskHistory = account.riskHistory[0];
    const risk = account.banRisk || 0;
    
    let status: 'clean' | 'warning' | 'banned' = 'clean';
    if (account.status === 'banned' || risk >= 70) {
      status = 'banned';
    } else if (risk >= 30) {
      status = 'warning';
    }

    return {
      id: account.id,
      channel: account.username || 'Unknown',
      platform: account.platform,
      status,
      lastCheck: lastRiskHistory ? formatDate(lastRiskHistory.date) : 'Не проверялся',
      risk,
      rawStatus: account.status,
    };
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/accounts?limit=50');
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить аккаунты');
      }

      const data = await response.json();
      const accounts = data.accounts || [];

      const mappedChecks = accounts.map(mapAccountToCheck);
      setChecks(mappedChecks);

      // Calculate analytics
      const totalChecks = accounts.length;
      const clean = mappedChecks.filter(c => c.status === 'clean').length;
      const warnings = mappedChecks.filter(c => c.status === 'warning').length;
      const banned = mappedChecks.filter(c => c.status === 'banned').length;

      setAnalytics({ totalChecks, clean, warnings, banned });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [mapAccountToCheck]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const runCheck = async () => {
    if (!searchQuery.trim()) {
      toast.error('Введите username для проверки');
      return;
    }

    try {
      setChecking(true);
      
      // First, find the account by username
      const accountsResponse = await fetch(`/api/accounts?limit=100`);
      if (!accountsResponse.ok) {
        throw new Error('Не удалось найти аккаунт');
      }
      
      const accountsData = await accountsResponse.json();
      const username = searchQuery.trim().replace('@', '').toLowerCase();
      const account = accountsData.accounts.find(
        (a: Account) => a.username?.toLowerCase() === username
      );

      if (!account) {
        throw new Error(`Аккаунт @${username} не найден`);
      }

      // Run shadow ban check
      const checkResponse = await fetch('/api/shadow-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id }),
      });

      if (!checkResponse.ok) {
        const errorData = await checkResponse.json();
        throw new Error(errorData.error || 'Ошибка при проверке');
      }

      const checkData = await checkResponse.json();
      
      toast.success(`Проверка завершена. Риск: ${checkData.result.score}%`);

      // Refresh the list
      await fetchAccounts();
      setSearchQuery('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Произошла ошибка';
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };

  const runCheckForAccount = async (accountId: string) => {
    try {
      setChecking(true);

      const response = await fetch('/api/shadow-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при проверке');
      }

      const data = await response.json();
      
      toast.success(`Проверка завершена. Риск: ${data.result.score}%`);

      // Refresh the list
      await fetchAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Произошла ошибка';
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clean': return <CheckCircle className="w-5 h-5 text-[#00D26A]" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-[#FFB800]" />;
      case 'banned': return <XCircle className="w-5 h-5 text-[#FF4D4D]" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'bg-[#00D26A]';
      case 'warning': return 'bg-[#FFB800]';
      case 'banned': return 'bg-[#FF4D4D]';
      default: return 'bg-[#8A8A8A]';
    }
  };

  const filteredChecks = checks.filter(check => 
    check.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    check.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-[#FF4D4D]" />
            Shadow Ban Check
          </h1>
          <p className="text-[#8A8A8A]">Проверка каналов на теневой бан</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Введите @username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runCheck()}
            className="bg-[#1E1F26] border-[#2A2B32] w-64"
          />
          <Button 
            onClick={runCheck} 
            disabled={checking || loading} 
            className="bg-[#6C63FF]"
          >
            {checking ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Проверить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{analytics.totalChecks}</p>
                <p className="text-xs text-[#8A8A8A]">Проверок</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{analytics.clean}</p>
                <p className="text-xs text-[#8A8A8A]">Чистых</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{analytics.warnings}</p>
                <p className="text-xs text-[#8A8A8A]">Предупреждений</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF4D4D]/20 flex items-center justify-center">
                <Ban className="w-5 h-5 text-[#FF4D4D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{analytics.banned}</p>
                <p className="text-xs text-[#8A8A8A]">Забанено</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Результаты проверок</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccounts}
            disabled={loading}
            className="border-[#2A2B32]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
              <span className="ml-2 text-[#8A8A8A]">Загрузка...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-[#FF4D4D] mb-4" />
              <p className="text-[#FF4D4D] font-medium">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAccounts}
                className="mt-4 border-[#2A2B32]"
              >
                Попробовать снова
              </Button>
            </div>
          ) : filteredChecks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-12 h-12 text-[#8A8A8A] mb-4" />
              <p className="text-[#8A8A8A]">
                {searchQuery ? 'Аккаунты не найдены' : 'Нет аккаунтов для проверки'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {filteredChecks.map((check) => (
                <div 
                  key={check.id} 
                  className="flex items-center justify-between p-4 bg-[#1E1F26] rounded-lg hover:bg-[#25262D] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(check.status)}
                    <div>
                      <p className="text-white font-medium">@{check.channel}</p>
                      <p className="text-xs text-[#8A8A8A]">{check.platform} • {check.lastCheck}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-[#8A8A8A]">Риск бана</p>
                      <p className={cn(
                        'font-bold',
                        check.risk < 30 ? 'text-[#00D26A]' :
                        check.risk < 70 ? 'text-[#FFB800]' : 'text-[#FF4D4D]'
                      )}>{check.risk}%</p>
                    </div>
                    <Badge className={getStatusColor(check.status)}>
                      {check.status === 'clean' ? 'Чист' : 
                       check.status === 'warning' ? 'Предупреждение' : 'Забанен'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runCheckForAccount(check.id)}
                      disabled={checking}
                      className="h-8 w-8 p-0"
                    >
                      <RefreshCw className={cn(
                        "w-4 h-4 text-[#8A8A8A]",
                        checking && "animate-spin"
                      )} />
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

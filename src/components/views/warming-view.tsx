'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, Play, Square, CheckCircle, Clock, AlertTriangle,
  Thermometer, RefreshCw, Settings, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface WarmingAccount {
  id: string;
  username: string | null;
  platform: string;
  status: string;
  warmingProgress: number;
  warmingStatus: string;
  warmingStartedAt: Date | null;
  warmingEndsAt: Date | null;
  daysRemaining: number;
  banRisk: number;
  maxComments: number;
  maxDm: number;
  maxFollows: number;
  createdAt: Date;
}

interface WarmingStats {
  totalAccounts: number;
  warming: number;
  completed: number;
  pending: number;
  averageProgress: number;
}

interface WarmingResponse {
  accounts: WarmingAccount[];
  stats?: WarmingStats;
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-[#FFB800]" />
      <span className="ml-2 text-[#8A8A8A]">Загрузка данных...</span>
    </div>
  );
}

// Error display component
function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-white font-medium mb-2">Ошибка загрузки</p>
          <p className="text-[#8A8A8A] text-sm mb-4">{error}</p>
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Повторить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state component
function EmptyState() {
  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Thermometer className="w-12 h-12 text-[#8A8A8A] mb-4" />
          <p className="text-white font-medium mb-2">Нет аккаунтов на прогреве</p>
          <p className="text-[#8A8A8A] text-sm">
            Добавьте аккаунты и запустите прогрев для начала работы
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function WarmingView() {
  const [accounts, setAccounts] = useState<WarmingAccount[]>([]);
  const [stats, setStats] = useState<WarmingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch warming data
  const fetchWarmingData = useCallback(async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await fetch('/api/warming?stats=true');
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить данные о прогреве');
      }

      const data: WarmingResponse = await response.json();
      setAccounts(data.accounts || []);
      setStats(data.stats || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchWarmingData();
  }, [fetchWarmingData]);

  // Start warming for an account
  const startWarming = async (accountId: string, mode: 'fast' | 'standard' | 'maximum' | 'premium' = 'standard') => {
    try {
      setActionLoading(accountId);
      
      const response = await fetch('/api/warming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, mode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось запустить прогрев');
      }

      toast.success('Прогрев запущен');
      await fetchWarmingData(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Stop warming for an account
  const stopWarming = async (accountId: string, complete: boolean = false) => {
    try {
      setActionLoading(accountId);
      
      const response = await fetch(`/api/warming/${accountId}?complete=${complete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось остановить прогрев');
      }

      toast.success(complete ? 'Прогрев завершён' : 'Прогрев остановлен');
      await fetchWarmingData(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Start warming for all pending accounts
  const startAllWarming = async () => {
    const pendingAccounts = accounts.filter(a => a.status === 'pending' || a.warmingStatus === 'not_started');
    
    if (pendingAccounts.length === 0) {
      toast.info('Нет аккаунтов для запуска прогрева');
      return;
    }

    try {
      setActionLoading('all');
      
      const results = await Promise.allSettled(
        pendingAccounts.map(account => 
          fetch('/api/warming', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: account.id, mode: 'standard' }),
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`Прогрев запущен для ${successful} аккаунтов`);
      }
      if (failed > 0) {
        toast.error(`Не удалось запустить для ${failed} аккаунтов`);
      }

      await fetchWarmingData(true);
    } catch (err) {
      toast.error('Произошла ошибка при запуске');
    } finally {
      setActionLoading(null);
    }
  };

  // Calculate derived values
  const warmingCount = stats?.warming ?? accounts.filter(a => a.status === 'warming').length;
  const completedCount = stats?.completed ?? accounts.filter(a => a.status === 'active').length;
  const averageRisk = accounts.length > 0 
    ? Math.round(accounts.reduce((sum, a) => sum + (a.banRisk || 0), 0) / accounts.length)
    : 0;
  const avgDays = accounts.length > 0
    ? Math.round(accounts.reduce((sum, a) => sum + (a.daysRemaining || 0), 0) / accounts.length)
    : 7;

  // Get status display
  const getStatusInfo = (account: WarmingAccount) => {
    if (account.status === 'active' || account.warmingProgress >= 100) {
      return { label: 'Готов', color: 'bg-[#00D26A]', textColor: 'text-white' };
    }
    if (account.status === 'warming') {
      return { label: 'Прогрев', color: 'bg-[#FFB800]', textColor: 'text-black' };
    }
    if (account.status === 'pending') {
      return { label: 'Ожидание', color: 'bg-[#8A8A8A]', textColor: 'text-white' };
    }
    return { label: 'Пауза', color: 'bg-[#8A8A8A]', textColor: 'text-white' };
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="w-7 h-7 text-[#FFB800]" />
              Прогрев аккаунтов
            </h1>
            <p className="text-[#8A8A8A]">Загрузка...</p>
          </div>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  // Render error state
  if (error && accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="w-7 h-7 text-[#FFB800]" />
              Прогрев аккаунтов
            </h1>
            <p className="text-[#8A8A8A]">Ошибка загрузки</p>
          </div>
        </div>
        <ErrorDisplay error={error} onRetry={() => fetchWarmingData()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-7 h-7 text-[#FFB800]" />
            Прогрев аккаунтов
          </h1>
          <p className="text-[#8A8A8A]">{warmingCount} на прогреве, {completedCount} завершено</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-[#2A2B32]"
            onClick={() => fetchWarmingData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
            Обновить
          </Button>
          <Button variant="outline" className="border-[#2A2B32]">
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </Button>
          <Button 
            className="bg-[#FFB800] text-black hover:bg-[#FFB800]/90"
            onClick={startAllWarming}
            disabled={actionLoading === 'all'}
          >
            {actionLoading === 'all' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Запустить все
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{warmingCount}</p>
                <p className="text-xs text-[#8A8A8A]">На прогреве</p>
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
                <p className="text-2xl font-bold text-white">{completedCount}</p>
                <p className="text-xs text-[#8A8A8A]">Завершено</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{avgDays} дней</p>
                <p className="text-xs text-[#8A8A8A]">Среднее время</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{averageRisk}%</p>
                <p className="text-xs text-[#8A8A8A]">Средний риск</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white">Аккаунты на прогреве</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => {
                const statusInfo = getStatusInfo(account);
                const isActionLoading = actionLoading === account.id;
                const isWarming = account.status === 'warming';
                const isCompleted = account.status === 'active' || account.warmingProgress >= 100;
                
                return (
                  <div key={account.id} className="p-4 bg-[#1E1F26] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-3 h-3 rounded-full',
                          isCompleted ? 'bg-[#00D26A]' : 
                          isWarming ? 'bg-[#FFB800]' : 'bg-[#8A8A8A]'
                        )} />
                        <span className="text-white font-medium">
                          @{account.username || account.platform}
                        </span>
                        <Badge className={cn(statusInfo.color, statusInfo.textColor)}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {isWarming && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => stopWarming(account.id)}
                            disabled={isActionLoading}
                            title="Остановить прогрев"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        {(account.status === 'pending' || !isWarming) && !isCompleted && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => startWarming(account.id)}
                            disabled={isActionLoading}
                            title="Запустить прогрев"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-white">
                          {account.daysRemaining || 0}
                        </p>
                        <p className="text-xs text-[#8A8A8A]">Дней осталось</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-white">
                          {account.warmingProgress || 0}%
                        </p>
                        <p className="text-xs text-[#8A8A8A]">Прогресс</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#00D26A]">
                          {account.banRisk || 0}%
                        </p>
                        <p className="text-xs text-[#8A8A8A]">Риск</p>
                      </div>
                    </div>
                    <Progress value={account.warmingProgress || 0} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

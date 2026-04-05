'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Activity,
  Pause,
  Play,
  StopCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Shield,
  ChevronRight,
  Loader2,
  AlertCircle,
  BarChart3,
  Globe,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Типы данных
interface Campaign {
  id: string;
  name: string;
  type: string;
  niche?: string;
  geo?: string;
  status: string;
  statusMessage: string;
  budget: number;
  spent: number;
  revenue: number;
  leadsCount: number;
  conversions: number;
  roi: string;
  createdAt: string;
  updatedAt: string;
  analytics: Array<{
    date: string;
    revenue: number;
    spent: number;
    leads: number;
    conversions: number;
  }>;
}

interface WarmingAccount {
  id: string;
  accountId: string;
  username: string;
  status: string;
  currentDay: number;
  banRisk: number;
  progress: number;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  campaignId?: string;
  timestamp: string;
}

interface Recommendation {
  type: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

interface StatusData {
  success: boolean;
  campaigns: Campaign[];
  warming: {
    accounts: WarmingAccount[];
    stats: {
      total: number;
      pending: number;
      warming: number;
      stable: number;
      avgDay: number;
    };
  };
  activities: Activity[];
  stats: {
    campaigns: number;
    activeCampaigns: number;
    totalBudget: number;
    totalSpent: number;
    totalRevenue: number;
    totalLeads: number;
    totalConversions: number;
    totalROI: string;
  };
  recommendations: Recommendation[];
}

export function AutoEarnDashboard() {
  // Состояния
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<StatusData | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Загрузка данных
  const fetchData = useCallback(async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await fetch('/api/auto-earn/status');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Загрузка при монтировании
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Пауза/запуск кампании
  const toggleCampaign = useCallback(async (campaign: Campaign) => {
    const action = campaign.status === 'active' ? 'pause' : 'resume';
    setActionLoading(campaign.id);
    
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/${action}`, {
        method: 'POST',
      });
      
      if (res.ok) {
        toast.success(`Кампания ${action === 'pause' ? 'приостановлена' : 'запущена'}`);
        fetchData(true);
      } else {
        throw new Error('Ошибка');
      }
    } catch (error) {
      toast.error('Не удалось изменить статус кампании');
    } finally {
      setActionLoading(null);
    }
  }, [fetchData]);

  // Остановка кампании
  const stopCampaign = useCallback(async (campaign: Campaign) => {
    setActionLoading(campaign.id);
    
    try {
      const res = await fetch(`/api/campaigns?id=${campaign.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast.success('Кампания остановлена и удалена');
        setShowCampaignDialog(false);
        fetchData(true);
      } else {
        throw new Error('Ошибка');
      }
    } catch (error) {
      toast.error('Не удалось остановить кампанию');
    } finally {
      setActionLoading(null);
    }
  }, [fetchData]);

  // Получить цвет статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[#00D26A]';
      case 'initializing': return 'bg-[#6C63FF]';
      case 'paused': return 'bg-[#FFB800]';
      case 'error': return 'bg-[#FF4D4D]';
      case 'draft': return 'bg-[#8A8A8A]';
      default: return 'bg-[#8A8A8A]';
    }
  };

  // Получить цвет приоритета
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-[#FF4D4D] text-[#FF4D4D]';
      case 'medium': return 'border-[#FFB800] text-[#FFB800]';
      case 'low': return 'border-[#6C63FF] text-[#6C63FF]';
      default: return 'border-[#8A8A8A] text-[#8A8A8A]';
    }
  };

  // Форматирование времени
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return `${days} дн назад`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-[#FF4D4D]" />
        <p className="text-[#FF4D4D]">Ошибка загрузки данных</p>
        <Button onClick={() => fetchData()} variant="outline" className="border-[#2A2B32]">
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
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FFB800]" />
            Панель автоматизации
          </h2>
          <p className="text-[#8A8A8A] text-sm">Мониторинг активных кампаний и рекомендаций</p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
          Обновить
        </Button>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#8A8A8A] text-sm">Активных</span>
              <Activity className="w-4 h-4 text-[#00D26A]" />
            </div>
            <p className="text-2xl font-bold text-white">{data.stats.activeCampaigns}</p>
            <p className="text-xs text-[#8A8A8A]">из {data.stats.campaigns} кампаний</p>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#8A8A8A] text-sm">Доход</span>
              <DollarSign className="w-4 h-4 text-[#00D26A]" />
            </div>
            <p className="text-2xl font-bold text-white">
              {data.stats.totalRevenue.toLocaleString()} ₽
            </p>
            <p className="text-xs text-[#8A8A8A]">
              Потрачено: {data.stats.totalSpent.toLocaleString()} ₽
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#8A8A8A] text-sm">ROI</span>
              {parseFloat(data.stats.totalROI) >= 0 ? (
                <TrendingUp className="w-4 h-4 text-[#00D26A]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#FF4D4D]" />
              )}
            </div>
            <p className={cn(
              'text-2xl font-bold',
              parseFloat(data.stats.totalROI) >= 0 ? 'text-[#00D26A]' : 'text-[#FF4D4D]'
            )}>
              {data.stats.totalROI}%
            </p>
            <p className="text-xs text-[#8A8A8A]">Общая доходность</p>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#8A8A8A] text-sm">Лиды</span>
              <Target className="w-4 h-4 text-[#6C63FF]" />
            </div>
            <p className="text-2xl font-bold text-white">{data.stats.totalLeads}</p>
            <p className="text-xs text-[#8A8A8A]">
              Конверсий: {data.stats.totalConversions}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Активные кампании */}
        <div className="lg:col-span-2">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#6C63FF]" />
                Активные кампании
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#8A8A8A]">
                  <Activity className="w-12 h-12 mb-4 opacity-50" />
                  <p>Нет активных кампаний</p>
                  <p className="text-sm mt-2">Запустите первую кампанию через мастер автоматизации</p>
                </div>
              ) : (
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-3">
                    {data.campaigns.map(campaign => (
                      <Card
                        key={campaign.id}
                        className="bg-[#1E1F26] border-[#2A2B32] hover:border-[#6C63FF]/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowCampaignDialog(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={cn('w-2 h-2 rounded-full', getStatusColor(campaign.status))} />
                              <h4 className="text-white font-medium">{campaign.name}</h4>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                parseFloat(campaign.roi) >= 0
                                  ? 'border-[#00D26A] text-[#00D26A]'
                                  : 'border-[#FF4D4D] text-[#FF4D4D]'
                              )}
                            >
                              ROI: {campaign.roi}%
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-[#8A8A8A] text-xs">Бюджет</span>
                              <p className="text-white">{campaign.budget.toLocaleString()} ₽</p>
                            </div>
                            <div>
                              <span className="text-[#8A8A8A] text-xs">Потрачено</span>
                              <p className="text-white">{campaign.spent.toLocaleString()} ₽</p>
                            </div>
                            <div>
                              <span className="text-[#8A8A8A] text-xs">Доход</span>
                              <p className="text-[#00D26A]">{campaign.revenue.toLocaleString()} ₽</p>
                            </div>
                            <div>
                              <span className="text-[#8A8A8A] text-xs">Лиды</span>
                              <p className="text-white">{campaign.leadsCount}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {campaign.geo && (
                                <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A] text-xs">
                                  <Globe className="w-3 h-3 mr-1" />
                                  {campaign.geo}
                                </Badge>
                              )}
                              {campaign.niche && (
                                <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A] text-xs">
                                  {campaign.niche}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Progress
                                value={campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0}
                                className="w-20 h-1.5"
                              />
                              <span className="text-xs text-[#8A8A8A]">
                                {campaign.budget > 0 ? Math.round((campaign.spent / campaign.budget) * 100) : 0}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Прогрев аккаунтов */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#FFB800]" />
                Прогрев аккаунтов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-2xl font-bold text-white">{data.warming.stats.total}</p>
                  <p className="text-xs text-[#8A8A8A]">Всего</p>
                </div>
                <div className="text-center p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-2xl font-bold text-[#00D26A]">{data.warming.stats.stable}</p>
                  <p className="text-xs text-[#8A8A8A]">Готовы</p>
                </div>
              </div>
              
              {data.warming.accounts.length > 0 && (
                <ScrollArea className="h-[120px]">
                  <div className="space-y-2">
                    {data.warming.accounts.slice(0, 5).map(account => (
                      <div key={account.id} className="flex items-center gap-2 p-2 bg-[#1E1F26] rounded">
                        <div className="flex-1">
                          <p className="text-sm text-white">{account.username}</p>
                          <div className="flex items-center gap-2">
                            <Progress value={account.progress} className="w-16 h-1" />
                            <span className="text-xs text-[#8A8A8A]">День {account.currentDay}</span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            account.status === 'stable'
                              ? 'border-[#00D26A] text-[#00D26A]'
                              : account.status === 'warming'
                                ? 'border-[#FFB800] text-[#FFB800]'
                                : 'border-[#8A8A8A] text-[#8A8A8A]'
                          )}
                        >
                          {account.status === 'stable' ? 'Готов' : account.status === 'warming' ? 'Прогрев' : 'Ожидание'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Рекомендации */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#6C63FF]" />
                Рекомендации
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recommendations.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-[#8A8A8A]">
                  <CheckCircle className="w-5 h-5 mr-2 text-[#00D26A]" />
                  Всё отлично!
                </div>
              ) : (
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {data.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="p-3 bg-[#1E1F26] rounded-lg border-l-2"
                        style={{
                          borderLeftColor: rec.priority === 'high' ? '#FF4D4D' : rec.priority === 'medium' ? '#FFB800' : '#6C63FF',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn('text-xs', getPriorityColor(rec.priority))}>
                            {rec.priority === 'high' ? 'Важно' : rec.priority === 'medium' ? 'Средний' : 'Низкий'}
                          </Badge>
                        </div>
                        <p className="text-sm text-white">{rec.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Последняя активность */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#8A8A8A]" />
                Активность
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[150px]">
                {data.activities.length === 0 ? (
                  <div className="flex items-center justify-center py-4 text-[#8A8A8A]">
                    Нет недавней активности
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.activities.map(activity => (
                      <div key={activity.id} className="flex items-start gap-2 p-2 bg-[#1E1F26] rounded">
                        <Activity className="w-4 h-4 text-[#6C63FF] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{activity.message}</p>
                          <p className="text-xs text-[#8A8A8A]">{formatTime(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Диалог с деталями кампании */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedCampaign?.name}</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              {selectedCampaign?.statusMessage}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-4">
              {/* Статус */}
              <div className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full', getStatusColor(selectedCampaign.status))} />
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    parseFloat(selectedCampaign.roi) >= 0
                      ? 'border-[#00D26A] text-[#00D26A]'
                      : 'border-[#FF4D4D] text-[#FF4D4D]'
                  )}
                >
                  ROI: {selectedCampaign.roi}%
                </Badge>
              </div>

              {/* Метрики */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-xs text-[#8A8A8A]">Бюджет</p>
                  <p className="text-lg font-bold text-white">{selectedCampaign.budget.toLocaleString()} ₽</p>
                </div>
                <div className="p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-xs text-[#8A8A8A]">Потрачено</p>
                  <p className="text-lg font-bold text-white">{selectedCampaign.spent.toLocaleString()} ₽</p>
                </div>
                <div className="p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-xs text-[#8A8A8A]">Доход</p>
                  <p className="text-lg font-bold text-[#00D26A]">{selectedCampaign.revenue.toLocaleString()} ₽</p>
                </div>
                <div className="p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-xs text-[#8A8A8A]">Лиды / Конверсии</p>
                  <p className="text-lg font-bold text-white">{selectedCampaign.leadsCount} / {selectedCampaign.conversions}</p>
                </div>
              </div>

              {/* Прогресс бюджета */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[#8A8A8A]">Использование бюджета</span>
                  <span className="text-white">
                    {selectedCampaign.budget > 0
                      ? Math.round((selectedCampaign.spent / selectedCampaign.budget) * 100)
                      : 0}%
                  </span>
                </div>
                <Progress
                  value={selectedCampaign.budget > 0 ? (selectedCampaign.spent / selectedCampaign.budget) * 100 : 0}
                  className="h-2"
                />
              </div>

              {/* GEO и ниша */}
              <div className="flex items-center gap-2">
                {selectedCampaign.geo && (
                  <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A]">
                    <Globe className="w-3 h-3 mr-1" />
                    {selectedCampaign.geo}
                  </Badge>
                )}
                {selectedCampaign.niche && (
                  <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A]">
                    {selectedCampaign.niche}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => selectedCampaign && toggleCampaign(selectedCampaign)}
              disabled={actionLoading === selectedCampaign?.id}
              className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              {actionLoading === selectedCampaign?.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : selectedCampaign?.status === 'active' ? (
                <Pause className="w-4 h-4 mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {selectedCampaign?.status === 'active' ? 'Пауза' : 'Запустить'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedCampaign && stopCampaign(selectedCampaign)}
              disabled={actionLoading === selectedCampaign?.id}
              className="bg-[#FF4D4D] hover:bg-[#FF4D4D]/80"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Остановить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

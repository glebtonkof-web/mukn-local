'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Flame,
  Heart,
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WarmingJob {
  accountId: string;
  platform: string;
  phase: 1 | 2 | 3 | 4;
  dayNumber: number;
  totalDays: number;
  dailyActions: {
    likes: number;
    follows: number;
    comments: number;
    dms: number;
  };
  status: 'pending' | 'active' | 'completed' | 'paused';
  riskLevel: number;
  startedAt?: Date | string;
}

const PHASE_INFO = {
  1: { name: 'Призрак', color: 'bg-gray-500', desc: 'Минимальная активность' },
  2: { name: 'Лёгкий контакт', color: 'bg-blue-500', desc: 'Базовые действия' },
  3: { name: 'Активация', color: 'bg-yellow-500', desc: 'Увеличение активности' },
  4: { name: 'Стабильный', color: 'bg-green-500', desc: 'Полная активность' },
};

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: '📷',
  TikTok: '🎵',
  Telegram: '✈️',
  X: '𝕏',
  YouTube: '▶️',
};

export function WarmingPanel() {
  const [jobs, setJobs] = useState<WarmingJob[]>([]);

  const fetchWarmingJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/sim-auto/full-auto?action=warming');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.warming || []);
      }
    } catch (error) {
      console.error('Error fetching warming jobs:', error);
    }
  }, []);

  useEffect(() => {
    // Initial fetch - this is a legitimate data fetching pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWarmingJobs();
    // Set up polling
    const interval = setInterval(fetchWarmingJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchWarmingJobs]);

  const getRiskColor = (risk: number) => {
    if (risk < 30) return 'text-[#00D26A]';
    if (risk < 70) return 'text-[#FFB800]';
    return 'text-[#FF4D4D]';
  };

  const getRiskBg = (risk: number) => {
    if (risk < 30) return 'bg-[#00D26A]/20';
    if (risk < 70) return 'bg-[#FFB800]/20';
    return 'bg-[#FF4D4D]/20';
  };

  const stats = {
    total: jobs.length,
    active: jobs.filter(j => j.status === 'active').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    paused: jobs.filter(j => j.status === 'paused').length,
    avgRisk: jobs.length > 0 
      ? Math.round(jobs.reduce((sum, j) => sum + j.riskLevel, 0) / jobs.length)
      : 0,
  };

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#FFB800]" />
              Прогрев аккаунтов
            </CardTitle>
            <CardDescription className="text-[#8A8A8A]">
              Мониторинг прогрева и действий
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-[#8A8A8A]">Всего</div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[#FFB800]">{stats.active}</div>
            <div className="text-xs text-[#8A8A8A]">Активны</div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[#00D26A]">{stats.completed}</div>
            <div className="text-xs text-[#8A8A8A]">Завершено</div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className={cn('text-2xl font-bold', getRiskColor(stats.avgRisk))}>
              {stats.avgRisk}%
            </div>
            <div className="text-xs text-[#8A8A8A]">Ср. риск</div>
          </div>
        </div>

        {/* Jobs Grid */}
        <ScrollArea className="h-[400px]">
          {jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {jobs.map((job) => {
                const progress = (job.dayNumber / job.totalDays) * 100;
                const phaseInfo = PHASE_INFO[job.phase];

                return (
                  <div
                    key={job.accountId}
                    className={cn(
                      'p-4 rounded-lg border border-[#2A2B32] bg-[#1E1F26]',
                      job.status === 'active' && 'border-[#FFB800]/50'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{PLATFORM_ICONS[job.platform] || '📱'}</span>
                        <span className="font-medium text-white">{job.platform}</span>
                      </div>
                      <Badge className={cn('text-white text-xs', phaseInfo.color)}>
                        Фаза {job.phase}: {phaseInfo.name}
                      </Badge>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#8A8A8A]">Прогресс</span>
                        <span className="text-white">День {job.dayNumber}/{job.totalDays}</span>
                      </div>
                      <Progress value={progress} className="h-1.5 bg-[#2A2B32]" />
                    </div>

                    {/* Daily Actions */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="text-center">
                        <Heart className="w-4 h-4 mx-auto text-pink-400 mb-1" />
                        <div className="text-xs text-white font-medium">{job.dailyActions.likes}</div>
                        <div className="text-xs text-[#8A8A8A]">лайков</div>
                      </div>
                      <div className="text-center">
                        <Users className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                        <div className="text-xs text-white font-medium">{job.dailyActions.follows}</div>
                        <div className="text-xs text-[#8A8A8A]">подписок</div>
                      </div>
                      <div className="text-center">
                        <MessageSquare className="w-4 h-4 mx-auto text-green-400 mb-1" />
                        <div className="text-xs text-white font-medium">{job.dailyActions.comments}</div>
                        <div className="text-xs text-[#8A8A8A]">комментов</div>
                      </div>
                      <div className="text-center">
                        <TrendingUp className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                        <div className="text-xs text-white font-medium">{job.dailyActions.dms}</div>
                        <div className="text-xs text-[#8A8A8A]">DM</div>
                      </div>
                    </div>

                    {/* Risk Indicator */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {job.riskLevel > 50 ? (
                          <AlertTriangle className="w-4 h-4 text-[#FFB800]" />
                        ) : (
                          <Shield className="w-4 h-4 text-[#00D26A]" />
                        )}
                        <span className="text-xs text-[#8A8A8A]">Риск бана:</span>
                      </div>
                      <div className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        getRiskBg(job.riskLevel),
                        getRiskColor(job.riskLevel)
                      )}>
                        {job.riskLevel}%
                      </div>
                    </div>

                    {/* Status */}
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="outline" className={cn(
                        'text-xs',
                        job.status === 'active' && 'border-[#00D26A] text-[#00D26A]',
                        job.status === 'paused' && 'border-[#FFB800] text-[#FFB800]',
                        job.status === 'completed' && 'border-[#6C63FF] text-[#6C63FF]',
                        job.status === 'pending' && 'border-[#8A8A8A] text-[#8A8A8A]',
                      )}>
                        {job.status === 'active' && 'Активен'}
                        {job.status === 'paused' && 'Пауза'}
                        {job.status === 'completed' && 'Завершён'}
                        {job.status === 'pending' && 'Ожидание'}
                      </Badge>
                      <span className="text-xs text-[#8A8A8A]">
                        ID: {job.accountId.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#8A8A8A] py-12">
              <Flame className="w-12 h-12 mb-4 opacity-50" />
              <p>Нет активных прогревов</p>
              <p className="text-sm mt-2">Аккаунты начнут прогреваться после регистрации</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default WarmingPanel;

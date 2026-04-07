'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  UserPlus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Play,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RegistrationJob {
  id: string;
  simId: string;
  platform: string;
  status: 'pending' | 'registering' | 'completed' | 'failed';
  progress: number;
  error?: string;
  accountId?: string;
  startedAt?: Date | string;
  completedAt?: Date | string;
}

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: '📷',
  TikTok: '🎵',
  Telegram: '✈️',
  X: '𝕏',
  YouTube: '▶️',
  Facebook: '📘',
  LinkedIn: '💼',
};

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'text-pink-400',
  TikTok: 'text-cyan-400',
  Telegram: 'text-blue-400',
  X: 'text-gray-300',
  YouTube: 'text-red-500',
  Facebook: 'text-blue-500',
  LinkedIn: 'text-blue-600',
};

export function RegistrationPanel() {
  const [jobs, setJobs] = useState<RegistrationJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/sim-auto/full-auto?action=queue');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.queue || []);
        setIsRunning(data.isRunning || false);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  const retryFailed = async () => {
    const failedJobs = jobs.filter(j => j.status === 'failed');
    if (failedJobs.length === 0) {
      toast.info('Нет неудачных регистраций');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sim-auto/full-auto', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      });

      if (!response.ok) throw new Error('Ошибка повтора');

      toast.success(`Перезапуск ${failedJobs.length} регистраций`);
      fetchQueue();
    } catch (error) {
      toast.error('Ошибка перезапуска регистраций');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: RegistrationJob['status']) => {
    switch (status) {
      case 'pending': return 'bg-[#8A8A8A]';
      case 'registering': return 'bg-[#FFB800]';
      case 'completed': return 'bg-[#00D26A]';
      case 'failed': return 'bg-[#FF4D4D]';
      default: return 'bg-[#8A8A8A]';
    }
  };

  const getStatusLabel = (status: RegistrationJob['status']) => {
    switch (status) {
      case 'pending': return 'Ожидание';
      case 'registering': return 'Регистрация';
      case 'completed': return 'Завершено';
      case 'failed': return 'Ошибка';
      default: return status;
    }
  };

  const stats = {
    total: jobs.length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    pending: jobs.filter(j => j.status === 'pending').length,
    registering: jobs.filter(j => j.status === 'registering').length,
  };

  const progressPercent = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#6C63FF]" />
              Регистрация аккаунтов
            </CardTitle>
            <CardDescription className="text-[#8A8A8A]">
              Очередь автоматической регистрации
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {stats.failed > 0 && (
              <Button
                variant="outline"
                onClick={retryFailed}
                disabled={loading}
                className="border-[#FF4D4D] text-[#FF4D4D] hover:bg-[#FF4D4D]/10"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Повторить ({stats.failed})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8A8A8A]">Прогресс регистрации</span>
            <span className="text-sm font-medium text-white">
              {stats.completed}/{stats.total} ({progressPercent}%)
            </span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-[#1E1F26]" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[#8A8A8A]">{stats.pending}</div>
            <div className="text-xs text-[#8A8A8A]">Ожидают</div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[#FFB800]">{stats.registering}</div>
            <div className="text-xs text-[#8A8A8A]">В процессе</div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[#00D26A]">{stats.completed}</div>
            <div className="text-xs text-[#8A8A8A]">Успешно</div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[#FF4D4D]">{stats.failed}</div>
            <div className="text-xs text-[#8A8A8A]">Ошибок</div>
          </div>
        </div>

        {/* Queue */}
        <ScrollArea className="h-[350px]">
          {jobs.length > 0 ? (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    'bg-[#1E1F26] border border-[#2A2B32]',
                    job.status === 'registering' && 'border-[#FFB800]'
                  )}
                >
                  {/* Platform Icon */}
                  <div className="text-2xl">
                    {PLATFORM_ICONS[job.platform] || '📱'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('font-medium', PLATFORM_COLORS[job.platform] || 'text-white')}>
                        {job.platform}
                      </span>
                      <Badge className={cn('text-white text-xs', getStatusColor(job.status))}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </div>
                    
                    {job.status === 'registering' && (
                      <div className="mt-2">
                        <Progress value={job.progress} className="h-1 bg-[#2A2B32]" />
                      </div>
                    )}

                    {job.status === 'failed' && job.error && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-[#FF4D4D]">
                        <AlertTriangle className="w-3 h-3" />
                        {job.error}
                      </div>
                    )}

                    {job.status === 'completed' && job.accountId && (
                      <div className="text-xs text-[#00D26A] mt-1">
                        ID: {job.accountId.slice(0, 16)}...
                      </div>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div className="shrink-0">
                    {job.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-[#00D26A]" />
                    )}
                    {job.status === 'failed' && (
                      <XCircle className="w-5 h-5 text-[#FF4D4D]" />
                    )}
                    {job.status === 'registering' && (
                      <Loader2 className="w-5 h-5 text-[#FFB800] animate-spin" />
                    )}
                    {job.status === 'pending' && (
                      <Clock className="w-5 h-5 text-[#8A8A8A]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#8A8A8A] py-12">
              <UserPlus className="w-12 h-12 mb-4 opacity-50" />
              <p>Очередь регистраций пуста</p>
              <p className="text-sm mt-2">Запустите полный автозапуск</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default RegistrationPanel;

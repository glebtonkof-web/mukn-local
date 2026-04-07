'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Rocket,
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Zap,
  Smartphone,
  UserPlus,
  Flame,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FullAutoProgress {
  step: number;
  totalSteps: number;
  currentStep: string;
  percentComplete: number;
  estimatedTimeRemaining: number;
  startedAt: Date | string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  message: string;
  details: {
    simsDetected: number;
    registrationsCompleted: number;
    registrationsFailed: number;
    warmingStarted: number;
    schemesApplied: number;
    revenue: number;
  };
}

const STEPS = [
  { id: 1, name: 'Сканирование SIM', icon: Smartphone },
  { id: 2, name: 'Планирование', icon: Zap },
  { id: 3, name: 'Регистрация', icon: UserPlus },
  { id: 4, name: 'Прогрев', icon: Flame },
  { id: 5, name: 'Ранжирование', icon: TrendingUp },
  { id: 6, name: 'Применение схем', icon: CheckCircle },
  { id: 7, name: 'Запуск заработка', icon: DollarSign },
];

export function FullAutoLauncher() {
  const [progress, setProgress] = useState<FullAutoProgress>({
    step: 0,
    totalSteps: 7,
    currentStep: '',
    percentComplete: 0,
    estimatedTimeRemaining: 0,
    startedAt: new Date(),
    status: 'idle',
    message: '',
    details: {
      simsDetected: 0,
      registrationsCompleted: 0,
      registrationsFailed: 0,
      warmingStarted: 0,
      schemesApplied: 0,
      revenue: 0,
    },
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/sim-auto/full-auto');
      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const startFullAuto = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sim-auto/full-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Ошибка запуска');

      toast.success('Полный автозапуск запущен!');
      fetchProgress();
    } catch (error) {
      console.error('Error starting full auto:', error);
      toast.error('Ошибка запуска');
    } finally {
      setLoading(false);
    }
  };

  const pauseFullAuto = async () => {
    try {
      const response = await fetch('/api/sim-auto/full-auto', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });

      if (!response.ok) throw new Error('Ошибка паузы');

      toast.info('Автозапуск приостановлен');
      fetchProgress();
    } catch (error) {
      toast.error('Ошибка паузы');
    }
  };

  const resumeFullAuto = async () => {
    try {
      const response = await fetch('/api/sim-auto/full-auto', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      });

      if (!response.ok) throw new Error('Ошибка продолжения');

      toast.success('Автозапуск продолжён');
      fetchProgress();
    } catch (error) {
      toast.error('Ошибка продолжения');
    }
  };

  const stopFullAuto = async () => {
    try {
      const response = await fetch('/api/sim-auto/full-auto', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Ошибка остановки');

      toast.info('Автозапуск остановлен');
      fetchProgress();
    } catch (error) {
      toast.error('Ошибка остановки');
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} сек`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} мин ${secs} сек`;
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'running': return 'text-[#FFB800]';
      case 'paused': return 'text-[#FFB800]';
      case 'completed': return 'text-[#00D26A]';
      case 'error': return 'text-[#FF4D4D]';
      default: return 'text-[#8A8A8A]';
    }
  };

  const getStatusLabel = () => {
    switch (progress.status) {
      case 'running': return 'Выполняется';
      case 'paused': return 'Приостановлен';
      case 'completed': return 'Завершён';
      case 'error': return 'Ошибка';
      default: return 'Ожидание';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#14151A] to-[#1E1F26] border-[#2A2B32] overflow-hidden">
      {/* Animated background */}
      {progress.status === 'running' && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-[#6C63FF] via-[#00D26A] to-[#FFB800] animate-pulse" />
        </div>
      )}

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-2xl flex items-center gap-3">
              <Rocket className={cn(
                'w-8 h-8',
                progress.status === 'running' && 'animate-bounce text-[#FFB800]'
              )} />
              Полный автозапуск
            </CardTitle>
            <CardDescription className="text-[#8A8A8A] mt-1">
              Одна кнопка для автоматизации всего процесса
            </CardDescription>
          </div>
          <Badge className={cn(
            'text-white px-3 py-1',
            progress.status === 'running' && 'bg-[#FFB800]',
            progress.status === 'completed' && 'bg-[#00D26A]',
            progress.status === 'error' && 'bg-[#FF4D4D]',
            progress.status === 'paused' && 'bg-[#FFB800]',
            progress.status === 'idle' && 'bg-[#8A8A8A]'
          )}>
            {getStatusLabel()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Main Button */}
        {progress.status === 'idle' && (
          <Button
            onClick={startFullAuto}
            disabled={loading}
            className="w-full h-20 text-xl font-bold bg-gradient-to-r from-[#6C63FF] to-[#00D26A] hover:opacity-90 transition-all"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 mr-3 animate-spin" />
            ) : (
              <Rocket className="w-6 h-6 mr-3" />
            )}
            🚀 ПОЛНЫЙ АВТОЗАПУСК
          </Button>
        )}

        {/* Progress Display */}
        {progress.status !== 'idle' && (
          <>
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{progress.currentStep}</span>
                <span className="text-[#8A8A8A]">{progress.percentComplete}%</span>
              </div>
              <Progress 
                value={progress.percentComplete} 
                className="h-3 bg-[#2A2B32]"
              />
            </div>

            {/* Message */}
            <div className={cn(
              'p-4 rounded-lg text-center',
              progress.status === 'completed' && 'bg-[#00D26A]/20 text-[#00D26A]',
              progress.status === 'error' && 'bg-[#FF4D4D]/20 text-[#FF4D4D]',
              (progress.status === 'running' || progress.status === 'paused') && 'bg-[#FFB800]/20 text-[#FFB800]'
            )}>
              {progress.status === 'completed' && <CheckCircle className="w-6 h-6 mx-auto mb-2" />}
              {progress.status === 'error' && <XCircle className="w-6 h-6 mx-auto mb-2" />}
              {progress.status === 'running' && <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />}
              <p className="font-medium">{progress.message}</p>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2">
              {progress.status === 'running' && (
                <>
                  <Button
                    variant="outline"
                    onClick={pauseFullAuto}
                    className="flex-1 border-[#FFB800] text-[#FFB800] hover:bg-[#FFB800]/10"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Пауза
                  </Button>
                  <Button
                    variant="outline"
                    onClick={stopFullAuto}
                    className="border-[#FF4D4D] text-[#FF4D4D] hover:bg-[#FF4D4D]/10"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Стоп
                  </Button>
                </>
              )}

              {progress.status === 'paused' && (
                <>
                  <Button
                    onClick={resumeFullAuto}
                    className="flex-1 bg-[#00D26A] hover:bg-[#00D26A]/80"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Продолжить
                  </Button>
                  <Button
                    variant="outline"
                    onClick={stopFullAuto}
                    className="border-[#FF4D4D] text-[#FF4D4D] hover:bg-[#FF4D4D]/10"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Стоп
                  </Button>
                </>
              )}

              {(progress.status === 'completed' || progress.status === 'error') && (
                <Button
                  onClick={startFullAuto}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#6C63FF] to-[#00D26A] hover:opacity-90"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4 mr-2" />
                  )}
                  Запустить снова
                </Button>
              )}
            </div>

            {/* Time Remaining */}
            {progress.status === 'running' && progress.estimatedTimeRemaining > 0 && (
              <div className="flex items-center justify-center gap-2 text-[#8A8A8A]">
                <Clock className="w-4 h-4" />
                <span>Осталось: {formatTime(progress.estimatedTimeRemaining)}</span>
              </div>
            )}
          </>
        )}

        {/* Steps Progress */}
        <div className="grid grid-cols-7 gap-1 mt-4">
          {STEPS.map((step) => {
            const isComplete = progress.step > step.id;
            const isCurrent = progress.step === step.id;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center p-2 rounded-lg transition-all',
                  isComplete && 'bg-[#00D26A]/20',
                  isCurrent && 'bg-[#FFB800]/20',
                  !isComplete && !isCurrent && 'bg-[#1E1F26]'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5 mb-1',
                  isComplete && 'text-[#00D26A]',
                  isCurrent && 'text-[#FFB800]',
                  !isComplete && !isCurrent && 'text-[#8A8A8A]'
                )} />
                <span className={cn(
                  'text-xs text-center',
                  isComplete && 'text-[#00D26A]',
                  isCurrent && 'text-[#FFB800]',
                  !isComplete && !isCurrent && 'text-[#8A8A8A]'
                )}>
                  {step.name}
                </span>
                {isComplete && <CheckCircle className="w-3 h-3 text-[#00D26A] mt-1" />}
                {isCurrent && progress.status === 'running' && (
                  <Loader2 className="w-3 h-3 text-[#FFB800] mt-1 animate-spin" />
                )}
              </div>
            );
          })}
        </div>

        {/* Details */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-4 border-t border-[#2A2B32]">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{progress.details.simsDetected}</div>
            <div className="text-xs text-[#8A8A8A]">SIM</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[#00D26A]">{progress.details.registrationsCompleted}</div>
            <div className="text-xs text-[#8A8A8A]">Регистраций</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[#FF4D4D]">{progress.details.registrationsFailed}</div>
            <div className="text-xs text-[#8A8A8A]">Ошибок</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[#FFB800]">{progress.details.warmingStarted}</div>
            <div className="text-xs text-[#8A8A8A]">Прогрев</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[#6C63FF]">{progress.details.schemesApplied}</div>
            <div className="text-xs text-[#8A8A8A]">Схем</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[#00D26A]">{progress.details.revenue.toLocaleString()}₽</div>
            <div className="text-xs text-[#8A8A8A]">Доход</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FullAutoLauncher;

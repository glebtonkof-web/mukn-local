'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Edit3,
  AlertTriangle,
  RefreshCw,
  Shield,
  MessageSquare,
  Globe,
  Activity,
  ChevronDown,
  ChevronUp,
  Terminal,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error' | 'progress';
  message: string;
  details?: Record<string, unknown>;
}

interface SimCard {
  id: string;
  phoneNumber: string;
  operator: string;
  country: string;
  status: string;
  slotIndex?: number;
}

interface RegistrationEvent {
  jobId: string;
  platform: string;
  stage?: string;
  message?: string;
  percent?: number;
  phoneNumber?: string;
  success?: boolean;
  error?: string;
  timestamp: Date | string;
}

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
  { id: 1, name: 'Сканирование', icon: Smartphone },
  { id: 2, name: 'Планирование', icon: Zap },
  { id: 3, name: 'Регистрация', icon: UserPlus },
  { id: 4, name: 'Прогрев', icon: Flame },
  { id: 5, name: 'Ранжирование', icon: TrendingUp },
  { id: 6, name: 'Применение схем', icon: CheckCircle },
  { id: 7, name: 'Запуск заработка', icon: DollarSign },
];

const PHONE_NUMBERS_KEY = 'sim_auto_phone_numbers';

function getStoredPhoneNumbers(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(PHONE_NUMBERS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePhoneNumbers(numbers: Record<string, string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PHONE_NUMBERS_KEY, JSON.stringify(numbers));
}

export function EnhancedFullAutoLauncher() {
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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sims, setSims] = useState<SimCard[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<Record<string, string>>({});
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [showLogs, setShowLogs] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState(true);
  
  const socketRef = useRef<Socket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize Socket.IO
  useEffect(() => {
    const initSocket = async () => {
      try {
        socketRef.current = io({
          path: '/socket.io',
          transports: ['websocket', 'polling'],
        });

        socketRef.current.on('connect', () => {
          addLog('info', 'WebSocket подключен');
        });

        socketRef.current.on('disconnect', () => {
          addLog('warning', 'WebSocket отключен');
        });

        // Registration events
        socketRef.current.on('registration:started', (data: RegistrationEvent) => {
          addLog('info', `🚀 Регистрация начата: ${data.platform}`, data);
        });

        socketRef.current.on('registration:progress', (data: RegistrationEvent) => {
          const emoji = getStageEmoji(data.stage);
          addLog('progress', `${emoji} ${data.message}`, data);
        });

        socketRef.current.on('registration:completed', (data: RegistrationEvent) => {
          if (data.success) {
            addLog('success', `✅ Регистрация завершена: ${data.platform}`, data);
          } else {
            addLog('error', `❌ Ошибка регистрации: ${data.error}`, data);
          }
        });

        socketRef.current.on('registration:error', (data: RegistrationEvent) => {
          addLog('error', `⚠️ Ошибка: ${data.error}`, data);
        });

        socketRef.current.on('registration:captcha', (data: RegistrationEvent) => {
          addLog('warning', `🔐 Обнаружена captcha: ${data.captchaType || 'unknown'}`, data);
        });

        socketRef.current.on('registration:captcha:solved', (data: RegistrationEvent) => {
          addLog('success', `✅ Captcha решена за ${data.solveTime}ms`, data);
        });

        socketRef.current.on('registration:sms', (data: RegistrationEvent) => {
          addLog('info', `📱 SMS получено от ${data.sender}`, data);
        });

        socketRef.current.on('registration:browser:launched', (data: RegistrationEvent) => {
          addLog('info', `🌐 Браузер запущен${data.proxy ? ` (прокси: ${data.proxy})` : ''}`, data);
        });

        socketRef.current.on('registration:page:loaded', (data: RegistrationEvent) => {
          addLog('info', `📄 Страница загружена: ${data.title}`, data);
        });

      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Load stored phone numbers
  useEffect(() => {
    setPhoneNumbers(getStoredPhoneNumbers());
    fetchProgress();
    fetchSims();
    const interval = setInterval(() => {
      fetchProgress();
      if (progress.status === 'running') {
        fetchSims();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current && expandedLogs) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, expandedLogs]);

  const addLog = useCallback((type: LogEntry['type'], message: string, details?: Record<string, unknown>) => {
    setLogs(prev => {
      const newLog: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        type,
        message,
        details,
      };
      // Keep only last 200 logs
      const updated = [...prev, newLog].slice(-200);
      return updated;
    });
  }, []);

  const getStageEmoji = (stage?: string): string => {
    switch (stage) {
      case 'initializing': return '⚙️';
      case 'launching_browser': return '🌐';
      case 'navigating': return '➡️';
      case 'entering_phone': return '📱';
      case 'waiting_sms': return '📩';
      case 'entering_code': return '🔑';
      case 'completing_profile': return '👤';
      case 'verifying': return '✅';
      case 'completed': return '🎉';
      case 'failed': return '❌';
      default: return '📍';
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/sim-auto/full-auto');
      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
        if (data.sims) {
          setSims(data.sims);
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const fetchSims = async () => {
    try {
      const response = await fetch('/api/sim-auto/full-auto?action=sims');
      if (response.ok) {
        const data = await response.json();
        setSims(data.sims || []);
      }
    } catch (error) {
      console.error('Error fetching SIMs:', error);
    }
  };

  const startFullAuto = async () => {
    const simsWithPhones = sims.filter(sim => phoneNumbers[sim.id]);
    if (sims.length > 0 && simsWithPhones.length === 0) {
      toast.error('Укажите номера телефонов для SIM-карт');
      setShowPhoneInput(true);
      return;
    }

    setLoading(true);
    addLog('info', '🚀 Запуск полного автомата...');
    
    try {
      const response = await fetch('/api/sim-auto/full-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumbers }),
      });

      if (!response.ok) throw new Error('Ошибка запуска');

      addLog('success', '✅ Процесс запущен');
      toast.success('Полный автозапуск запущен!');
      fetchProgress();
    } catch (error) {
      addLog('error', '❌ Ошибка запуска');
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
      addLog('info', '⏸️ Процесс приостановлен');
      toast.info('Автозапуск приостановлен');
      fetchProgress();
    } catch {
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
      addLog('success', '▶️ Процесс продолжён');
      toast.success('Автозапуск продолжён');
      fetchProgress();
    } catch {
      toast.error('Ошибка продолжения');
    }
  };

  const stopFullAuto = async () => {
    try {
      const response = await fetch('/api/sim-auto/full-auto', { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка остановки');
      addLog('warning', '⏹️ Процесс остановлен');
      toast.info('Автозапуск остановлен');
      fetchProgress();
    } catch {
      toast.error('Ошибка остановки');
    }
  };

  const scanSims = async () => {
    setLoading(true);
    addLog('info', '📱 Сканирование SIM-карт...');
    
    try {
      const response = await fetch('/api/sim-auto/full-auto', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      });

      if (!response.ok) throw new Error('Ошибка сканирования');

      const data = await response.json();
      setSims(data.sims || []);
      addLog('success', `✅ Найдено ${data.sims?.length || 0} SIM-карт`);
      toast.success(`Найдено ${data.sims?.length || 0} SIM-карт`);
    } catch {
      addLog('error', '❌ Ошибка сканирования');
      toast.error('Ошибка сканирования');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (simId: string, phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    const newNumbers = { ...phoneNumbers, [simId]: cleaned };
    setPhoneNumbers(newNumbers);
    savePhoneNumbers(newNumbers);
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

  const getLogTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-[#00D26A]';
      case 'error': return 'text-[#FF4D4D]';
      case 'warning': return 'text-[#FFB800]';
      case 'progress': return 'text-[#6C63FF]';
      default: return 'text-[#8A8A8A]';
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <Card className="bg-gradient-to-br from-[#14151A] to-[#1E1F26] border-[#2A2B32] overflow-hidden">
      {/* Animated background */}
      {progress.status === 'running' && (
        <div className="absolute inset-0 opacity-10 pointer-events-none">
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
              Автоматическая регистрация и монетизация аккаунтов
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
        {/* Phone Numbers Input Section */}
        {progress.status === 'idle' && (
          <div className="space-y-4">
            <Button
              onClick={scanSims}
              disabled={loading}
              variant="outline"
              className="w-full border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Smartphone className="w-5 h-5 mr-2" />
              )}
              Сканировать SIM-карты
            </Button>

            {sims.length > 0 && (
              <div className="bg-[#1E1F26] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#6C63FF]" />
                    Обнаруженные SIM-карты ({sims.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPhoneInput(!showPhoneInput)}
                    className="text-[#8A8A8A] hover:text-white"
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    {showPhoneInput ? 'Скрыть' : 'Ввести номера'}
                  </Button>
                </div>

                {sims.map((sim, index) => (
                  <div key={sim.id} className="flex items-center gap-3 p-3 bg-[#14151A] rounded-lg">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#6C63FF]/20 rounded-full flex items-center justify-center">
                      <span className="text-[#6C63FF] font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        Слот {sim.slotIndex ?? index + 1}
                      </div>
                      <div className="text-[#8A8A8A] text-sm">
                        {sim.operator || 'Оператор не определён'}
                      </div>
                    </div>
                    <div className="flex-1">
                      {showPhoneInput || !phoneNumbers[sim.id] ? (
                        <Input
                          type="tel"
                          placeholder="+7 XXX XXX XX XX"
                          value={phoneNumbers[sim.id] || ''}
                          onChange={(e) => handlePhoneChange(sim.id, e.target.value)}
                          className="bg-[#2A2B32] border-[#3A3B42] text-white"
                        />
                      ) : (
                        <div 
                          className="text-[#00D26A] cursor-pointer hover:underline flex items-center gap-2"
                          onClick={() => setShowPhoneInput(true)}
                        >
                          {phoneNumbers[sim.id]}
                          <Edit3 className="w-4 h-4 text-[#8A8A8A]" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={startFullAuto}
              disabled={loading || sims.length === 0}
              className="w-full h-16 text-lg font-bold bg-gradient-to-r from-[#6C63FF] to-[#00D26A] hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
              ) : (
                <Rocket className="w-6 h-6 mr-3" />
              )}
              🚀 ЗАПУСТИТЬ АВТОМАТИЗАЦИЮ
            </Button>

            {sims.length === 0 && (
              <div className="text-center text-[#8A8A8A]">
                Нажмите "Сканировать SIM-карты" для начала
              </div>
            )}
          </div>
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

        {/* Real-time Logs */}
        <div className="mt-4">
          <div 
            className="flex items-center justify-between p-3 bg-[#1E1F26] rounded-t-lg cursor-pointer"
            onClick={() => setExpandedLogs(!expandedLogs)}
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#6C63FF]" />
              <span className="text-white font-medium">Логи в реальном времени</span>
              <Badge variant="outline" className="text-[#8A8A8A] border-[#3A3B42]">
                {logs.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {showLogs && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearLogs();
                  }}
                  className="text-[#8A8A8A] hover:text-white h-7"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
              {expandedLogs ? (
                <ChevronUp className="w-5 h-5 text-[#8A8A8A]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#8A8A8A]" />
              )}
            </div>
          </div>
          
          {expandedLogs && (
            <ScrollArea className="h-64 bg-[#0D0E12] rounded-b-lg border border-t-0 border-[#2A2B32]">
              <div className="p-3 space-y-1 font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-[#8A8A8A] text-center py-8">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <span>Логи появятся здесь...</span>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-2 py-1">
                      <span className="text-[#8A8A8A] text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString('ru-RU')}
                      </span>
                      <span className={cn('flex-1', getLogTypeColor(log.type))}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default EnhancedFullAutoLauncher;

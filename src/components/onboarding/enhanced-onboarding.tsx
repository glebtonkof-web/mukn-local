'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Rocket,
  UserPlus,
  Link2,
  Megaphone,
  Bot,
  Play,
  CheckCircle,
  Circle,
  ChevronRight,
  ChevronLeft,
  X,
  HelpCircle,
  Video,
  BookOpen,
  Lightbulb,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Типы
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string; // CSS selector для подсветки
  action?: () => Promise<boolean>;
  videoUrl?: string;
  tips: string[];
  completed: boolean;
  skipped?: boolean;
}

interface OnboardingProgress {
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: string;
  lastActiveAt: string;
  finished: boolean;
}

// Шаги онбординга
const ONBOARDING_STEPS: Omit<OnboardingStep, 'completed' | 'skipped'>[] = [
  {
    id: 'welcome',
    title: 'Добро пожаловать в МУКН | Трафик!',
    description: 'Это интерактивный тур по основным функциям платформы. Мы проведём вас через все ключевые шаги для начала работы.',
    icon: <Rocket className="w-8 h-8" />,
    tips: [
      'МУКН | Трафик — это AI-платформа для автоматизации трафика',
      'Управляйте роем инфлюенсеров из одного интерфейса',
      'Автоматизируйте комментарии, посты и DM'
    ],
  },
  {
    id: 'create_influencer',
    title: 'Создание AI-инфлюенсера',
    description: 'Создайте виртуального инфлюенсера с уникальным персонажем, который будет автоматически генерировать контент.',
    icon: <UserPlus className="w-8 h-8" />,
    target: '[data-onboarding="influencers"]',
    tips: [
      'Определите возраст, пол и стиль общения персонажа',
      'Задайте промпты для генерации контента',
      'Выберите нишу: gambling, crypto, nutra, dating'
    ],
  },
  {
    id: 'connect_account',
    title: 'Подключение Telegram аккаунта',
    description: 'Подключите Telegram аккаунт, который будет использоваться для постинга и комментирования.',
    icon: <Link2 className="w-8 h-8" />,
    target: '[data-onboarding="accounts"]',
    tips: [
      'Вам понадобятся API ID и API Hash от my.telegram.org',
      'Рекомендуется использовать отдельный аккаунт',
      'Пройдите прогрев перед активным использованием'
    ],
  },
  {
    id: 'create_campaign',
    title: 'Создание первой кампании',
    description: 'Настройте рекламную кампанию с оффером и целевыми каналами для продвижения.',
    icon: <Megaphone className="w-8 h-8" />,
    target: '[data-onboarding="campaigns"]',
    tips: [
      'Выберите тип оффера и целевую ссылку',
      'Настройте задержки между комментариями',
      'Определите бюджет и лимиты'
    ],
  },
  {
    id: 'setup_ai',
    title: 'Настройка AI провайдера',
    description: 'Подключите AI провайдера для генерации уникального контента. DeepSeek — рекомендуемый вариант.',
    icon: <Bot className="w-8 h-8" />,
    target: '[data-onboarding="settings"]',
    tips: [
      'DeepSeek API — оптимальный выбор по цене/качеству',
      'Также поддерживаются OpenRouter, Gemini, Groq',
      'Настройте температуру для контроля креативности'
    ],
  },
  {
    id: 'launch',
    title: 'Запуск автоматизации',
    description: 'Запустите кампанию и наблюдайте за автоматической работой ваших AI-инфлюенсеров.',
    icon: <Play className="w-8 h-8" />,
    target: '[data-onboarding="dashboard"]',
    tips: [
      'Мониторьте статистику в реальном времени',
      'Получайте уведомления о важных событиях',
      'Используйте AI-аналитику для оптимизации'
    ],
  },
];

const STORAGE_KEY = 'mukn-traffic-onboarding';

// Компонент шага
function OnboardingStepCard({
  step,
  isActive,
  isCompleted,
  isSkipped,
  onClick,
}: {
  step: Omit<OnboardingStep, 'completed' | 'skipped'>;
  isActive: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-lg transition-all text-left',
        isActive && 'bg-[#6C63FF]/20 border border-[#6C63FF]',
        isCompleted && 'bg-[#00D26A]/10 border border-[#00D26A]/50',
        isSkipped && 'bg-[#8A8A8A]/10 border border-[#8A8A8A]/50',
        !isActive && !isCompleted && !isSkipped && 'bg-[#1E1F26] border border-transparent hover:border-[#2A2B32]'
      )}
    >
      <div className={cn(
        'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
        isCompleted && 'bg-[#00D26A]/20 text-[#00D26A]',
        isSkipped && 'bg-[#8A8A8A]/20 text-[#8A8A8A]',
        isActive && !isCompleted && 'bg-[#6C63FF]/20 text-[#6C63FF]',
        !isActive && !isCompleted && !isSkipped && 'bg-[#2A2B32] text-[#8A8A8A]'
      )}>
        {isCompleted ? <CheckCircle className="w-6 h-6" /> : step.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium truncate',
          isCompleted && 'text-[#00D26A]',
          isActive && !isCompleted && 'text-white',
          !isActive && !isCompleted && !isSkipped && 'text-[#8A8A8A]'
        )}>
          {step.title}
        </p>
        <p className="text-sm text-[#8A8A8A] truncate">{step.description}</p>
      </div>
      {isActive && !isCompleted && (
        <ChevronRight className="w-5 h-5 text-[#6C63FF]" />
      )}
    </button>
  );
}

// Главный компонент
export function EnhancedOnboarding({
  onComplete,
  onSkip,
}: {
  onComplete?: () => void;
  onSkip?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());
  const [showTips, setShowTips] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  // Загрузка прогресса
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const progress: OnboardingProgress = JSON.parse(saved);
        setCompletedSteps(new Set(progress.completedSteps));
        setSkippedSteps(new Set(progress.skippedSteps));
        setCurrentStep(progress.currentStep);
        
        if (!progress.finished) {
          // Показать продолжение если не завершён
          setOpen(true);
        }
      } catch {
        setIsFirstVisit(true);
        setOpen(true);
      }
    } else {
      setIsFirstVisit(true);
      setOpen(true);
    }
  }, []);

  // Сохранение прогресса
  const saveProgress = useCallback((completed: Set<string>, skipped: Set<string>, step: number, finished = false) => {
    const progress: OnboardingProgress = {
      currentStep: step,
      completedSteps: Array.from(completed),
      skippedSteps: Array.from(skipped),
      startedAt: localStorage.getItem(STORAGE_KEY) 
        ? JSON.parse(localStorage.getItem(STORAGE_KEY)!).startedAt 
        : new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      finished,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, []);

  // Открытие при первом визите
  useEffect(() => {
    if (isFirstVisit) {
      const timer = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit]);

  // Подсветка целевого элемента
  useEffect(() => {
    if (!open) return;
    
    const step = ONBOARDING_STEPS[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('onboarding-highlight');
        return () => element.classList.remove('onboarding-highlight');
      }
    }
  }, [currentStep, open]);

  const handleNext = () => {
    const stepId = ONBOARDING_STEPS[currentStep].id;
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    setCompletedSteps(newCompleted);
    saveProgress(newCompleted, skippedSteps, currentStep + 1);

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    const stepId = ONBOARDING_STEPS[currentStep].id;
    const newSkipped = new Set(skippedSteps);
    newSkipped.add(stepId);
    setSkippedSteps(newSkipped);
    saveProgress(completedSteps, newSkipped, currentStep + 1);

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    saveProgress(completedSteps, skippedSteps, currentStep, true);
    setOpen(false);
    toast.success('Онбординг завершён! Добро пожаловать в МУКН | Трафик!');
    onComplete?.();
  };

  const handleSkipAll = () => {
    saveProgress(completedSteps, skippedSteps, currentStep, true);
    setOpen(false);
    onSkip?.();
  };

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };

  const progress = Math.round((completedSteps.size / ONBOARDING_STEPS.length) * 100);
  const currentStepData = ONBOARDING_STEPS[currentStep];

  return (
    <>
      {/* Кнопка открытия (плавающая) */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-[#6C63FF] hover:bg-[#6C63FF]/80 shadow-lg"
        size="lg"
      >
        <HelpCircle className="w-5 h-5 mr-2" />
        Помощь
        {completedSteps.size < ONBOARDING_STEPS.length && (
          <Badge className="ml-2 bg-[#FFB800] text-black">
            {ONBOARDING_STEPS.length - completedSteps.size}
          </Badge>
        )}
      </Button>

      {/* Диалог онбординга */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#6C63FF]" />
                  Интерактивный туториал
                </DialogTitle>
                <p className="text-sm text-[#8A8A8A] mt-1">
                  Пройдите все шаги для полноценного начала работы
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSkipAll} className="text-[#8A8A8A]">
                Пропустить всё
                <X className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex gap-6 mt-4">
            {/* Список шагов */}
            <div className="w-1/3 space-y-2 max-h-[400px] overflow-y-auto">
              {ONBOARDING_STEPS.map((step, index) => (
                <OnboardingStepCard
                  key={step.id}
                  step={step}
                  isActive={index === currentStep}
                  isCompleted={completedSteps.has(step.id)}
                  isSkipped={skippedSteps.has(step.id)}
                  onClick={() => handleStepClick(index)}
                />
              ))}
            </div>

            {/* Контент шага */}
            <div className="flex-1 space-y-4">
              {/* Прогресс */}
              <div className="flex items-center gap-4">
                <Progress value={progress} className="flex-1" />
                <span className="text-sm text-[#8A8A8A]">{progress}%</span>
              </div>

              {/* Карточка шага */}
              <Card className="bg-[#1E1F26] border-[#2A2B32]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-[#6C63FF]/20 text-[#6C63FF] flex items-center justify-center">
                      {currentStepData.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{currentStepData.title}</h3>
                      <p className="text-[#8A8A8A]">{currentStepData.description}</p>
                    </div>
                  </div>

                  {/* Видео (если есть) */}
                  {currentStepData.videoUrl && (
                    <div className="aspect-video bg-[#14151A] rounded-lg flex items-center justify-center mb-4">
                      <Button variant="outline" className="border-[#2A2B32]">
                        <Video className="w-5 h-5 mr-2" />
                        Смотреть видео
                      </Button>
                    </div>
                  )}

                  {/* Советы */}
                  {showTips && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-[#6C63FF]">
                        <Lightbulb className="w-4 h-4" />
                        Полезные советы
                      </div>
                      <ul className="space-y-2">
                        {currentStepData.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-[#8A8A8A]">
                            <CheckCircle className="w-4 h-4 text-[#00D26A] mt-0.5 shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Кнопки действий */}
                  <div className="flex items-center gap-3 mt-6">
                    {currentStep > 0 && (
                      <Button variant="outline" onClick={handlePrevious} className="border-[#2A2B32]">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Назад
                      </Button>
                    )}
                    <Button variant="ghost" onClick={handleSkip} className="text-[#8A8A8A]">
                      Пропустить
                    </Button>
                    <Button onClick={handleNext} className="ml-auto bg-[#6C63FF] hover:bg-[#6C63FF]/80">
                      {currentStep === ONBOARDING_STEPS.length - 1 ? 'Завершить' : 'Далее'}
                      {currentStep < ONBOARDING_STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSS для подсветки */}
      <style jsx global>{`
        .onboarding-highlight {
          animation: onboarding-pulse 2s infinite;
          box-shadow: 0 0 0 4px rgba(108, 99, 255, 0.3);
          border-radius: 8px;
          position: relative;
          z-index: 50;
        }
        
        @keyframes onboarding-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(108, 99, 255, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(108, 99, 255, 0.2); }
        }
      `}</style>
    </>
  );
}

// Hook для использования онбординга
export function useOnboarding() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setProgress(JSON.parse(saved));
      }, 0);
    }
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProgress(null);
  };

  const isCompleted = progress?.finished ?? false;
  const completionPercentage = progress 
    ? Math.round((progress.completedSteps.length / ONBOARDING_STEPS.length) * 100)
    : 0;

  return {
    progress,
    isCompleted,
    completionPercentage,
    resetOnboarding,
    totalSteps: ONBOARDING_STEPS.length,
  };
}

export default EnhancedOnboarding;

'use client';

import { useState, useEffect } from 'react';
import { useModeStore } from '@/store/mode-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const tourSteps = [
  {
    title: 'Добро пожаловать в МУКН!',
    content: 'Это мощная платформа для автоматизации трафика. Давайте быстро покажу, как тут всё работает.',
    icon: '👋',
  },
  {
    title: 'Главная страница',
    content: 'Здесь вы видите главные метрики: доход, аккаунты, комментарии. Следите за ними, чтобы понимать эффективность работы.',
    icon: '📊',
  },
  {
    title: 'AI-помощник DeepSeek',
    content: 'Справа находится AI-помощник, который может генерировать комментарии, анализировать каналы, настраивать кампании. Просто спросите!',
    icon: '🤖',
  },
  {
    title: 'Кампании',
    content: 'В разделе "Кампании" вы создаёте и настраиваете рекламные кампании для разных офферов.',
    icon: '🚀',
  },
  {
    title: 'Настройки',
    content: 'В настройках вы можете указать API ключи, настроить лимиты и параметры работы системы.',
    icon: '⚙️',
  },
];

export function OnboardingTour() {
  const { onboardingComplete, onboardingStep, setOnboardingComplete, setOnboardingStep } = useModeStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!onboardingComplete) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [onboardingComplete]);

  if (!visible || onboardingComplete) return null;

  const currentStep = tourSteps[onboardingStep];
  const isLast = onboardingStep === tourSteps.length - 1;
  const isFirst = onboardingStep === 0;

  const handleNext = () => {
    if (isLast) {
      setOnboardingComplete(true);
      setVisible(false);
    } else {
      setOnboardingStep(onboardingStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setOnboardingStep(onboardingStep - 1);
    }
  };

  const handleSkip = () => {
    setOnboardingComplete(true);
    setVisible(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100]" onClick={handleSkip} />
      
      <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[90vw] bg-[#14151A] border-[#6C63FF] z-[101] shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge className="bg-[#6C63FF]">
              Шаг {onboardingStep + 1} из {tourSteps.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-[#8A8A8A]">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-center mb-6">
            <div className="text-5xl mb-4">{currentStep.icon}</div>
            <h3 className="text-xl font-bold text-white mb-2">{currentStep.title}</h3>
            <p className="text-[#8A8A8A]">{currentStep.content}</p>
          </div>

          <div className="flex justify-center gap-1 mb-6">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === onboardingStep ? 'w-6 bg-[#6C63FF]' : 'w-2 bg-[#2A2B32]'
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={isFirst}
              className="border-[#2A2B32] text-[#8A8A8A]"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Назад
            </Button>
            
            <Button
              onClick={handleNext}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              {isLast ? (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Начать работу
                </>
              ) : (
                <>
                  Далее
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

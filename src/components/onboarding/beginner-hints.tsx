'use client';

import { useModeStore } from '@/store/mode-store';
import { useAppStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, X, Lightbulb, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Hint {
  id: string;
  title: string;
  content: string;
  action?: {
    label: string;
    tab?: string;
  };
}

const hints: Hint[] = [
  {
    id: 'welcome',
    title: 'Добро пожаловать!',
    content: 'Это МУКН — платформа для автоматизации трафика. Используйте AI-ассистента справа для помощи.',
  },
  {
    id: 'ai-assistant',
    title: 'AI-ассистент DeepSeek',
    content: 'Напишите "сгенерируй комментарии для казино" и получите готовые варианты за секунды!',
    action: { label: 'Попробовать', tab: 'ai-comments' },
  },
  {
    id: 'campaigns',
    title: 'Кампании',
    content: 'Создайте первую кампанию, чтобы начать зарабатывать. Выберите оффер, настройте аккаунты и запустите!',
    action: { label: 'Создать кампанию', tab: 'campaigns' },
  },
  {
    id: 'traffic',
    title: '130 методов трафика',
    content: 'В разделе "Методы трафика" собраны все способы привлечения аудитории для разных ниш.',
    action: { label: 'Смотреть методы', tab: 'traffic' },
  },
];

export function BeginnerHints() {
  const { uiMode, onboardingComplete } = useModeStore();
  const { setActiveTab } = useAppStore();
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Показывать только в Simple режиме и после онбординга
  const shouldShow = uiMode === 'simple' && onboardingComplete && visible;

  useEffect(() => {
    // Загружаем отклонённые подсказки из localStorage
    const stored = localStorage.getItem('mukn-dismissed-hints');
    if (stored) {
      setDismissed(JSON.parse(stored));
    }
  }, []);

  // Фильтруем не отклонённые подсказки
  const availableHints = hints.filter(h => !dismissed.includes(h.id));
  const currentHint = availableHints[currentHintIndex];

  const handleDismiss = () => {
    if (currentHint) {
      const newDismissed = [...dismissed, currentHint.id];
      setDismissed(newDismissed);
      localStorage.setItem('mukn-dismissed-hints', JSON.stringify(newDismissed));

      // Переходим к следующей подсказке
      if (currentHintIndex < availableHints.length - 1) {
        setCurrentHintIndex(currentHintIndex + 1);
      } else {
        setVisible(false);
      }
    }
  };

  const handleAction = () => {
    if (currentHint?.action?.tab) {
      setActiveTab(currentHint.action.tab);
    }
    handleDismiss();
  };

  const handleNext = () => {
    if (currentHintIndex < availableHints.length - 1) {
      setCurrentHintIndex(currentHintIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentHintIndex > 0) {
      setCurrentHintIndex(currentHintIndex - 1);
    }
  };

  if (!shouldShow || !currentHint) return null;

  return (
    <Card className="fixed bottom-20 left-4 w-80 bg-[#1E1F26] border-[#6C63FF] shadow-lg z-30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#6C63FF]/20 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-[#6C63FF]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-white">{currentHint.title}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisible(false)}
                className="h-6 w-6 p-0 text-[#8A8A8A] hover:text-white"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-xs text-[#8A8A8A] mb-3">{currentHint.content}</p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {availableHints.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      i === currentHintIndex ? 'bg-[#6C63FF]' : 'bg-[#2A2B32]'
                    )}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {currentHintIndex > 0 && (
                  <Button variant="ghost" size="sm" onClick={handlePrev} className="h-7 text-xs text-[#8A8A8A]">
                    Назад
                  </Button>
                )}
                {currentHint.action && (
                  <Button size="sm" onClick={handleAction} className="h-7 text-xs bg-[#6C63FF] hover:bg-[#6C63FF]/80">
                    {currentHint.action.label}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
                {!currentHint.action && currentHintIndex < availableHints.length - 1 && (
                  <Button variant="outline" size="sm" onClick={handleNext} className="h-7 text-xs border-[#2A2B32]">
                    Далее
                  </Button>
                )}
                {!currentHint.action && currentHintIndex === availableHints.length - 1 && (
                  <Button variant="outline" size="sm" onClick={handleDismiss} className="h-7 text-xs border-[#2A2B32]">
                    Понятно
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

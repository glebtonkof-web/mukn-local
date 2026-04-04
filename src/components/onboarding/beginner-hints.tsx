'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useModeStore } from '@/store/mode-store';
import { useAppStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, X, Lightbulb, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Показывать только в Simple режиме и после онбординга
  const shouldShow = uiMode === 'simple' && onboardingComplete && visible;

  useEffect(() => {
    // Загружаем отклонённые подсказки из localStorage
    const stored = localStorage.getItem('mukn-dismissed-hints');
    if (stored) {
      setDismissed(JSON.parse(stored));
    }
    
    // Загружаем настройку голоса
    const voiceSetting = localStorage.getItem('mukn-voice-hints');
    if (voiceSetting !== null) {
      setVoiceEnabled(voiceSetting === 'true');
    }
  }, []);

  // Фильтруем не отклонённые подсказки
  const availableHints = hints.filter(h => !dismissed.includes(h.id));
  const currentHint = availableHints[currentHintIndex];

  // Озвучивание подсказки
  const speakHint = async (hint: Hint) => {
    if (!voiceEnabled || !hint) return;
    
    try {
      // Используем TTS API
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${hint.title}. ${hint.content}`,
          voice: 'alloy',
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.play();
        setIsSpeaking(true);
      }
    } catch (error) {
      console.error('TTS error:', error);
      // Fallback на Web Speech API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`${hint.title}. ${hint.content}`);
        utterance.lang = 'ru-RU';
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    }
  };

  // Остановить озвучивание
  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Озвучивать подсказку при показе
  useEffect(() => {
    if (shouldShow && currentHint && voiceEnabled) {
      speakHint(currentHint);
    }
    return () => stopSpeaking();
  }, [currentHintIndex, shouldShow]);

  const handleDismiss = () => {
    stopSpeaking();
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
    stopSpeaking();
    if (currentHint?.action?.tab) {
      setActiveTab(currentHint.action.tab);
    }
    handleDismiss();
  };

  const handleNext = () => {
    stopSpeaking();
    if (currentHintIndex < availableHints.length - 1) {
      setCurrentHintIndex(currentHintIndex + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    stopSpeaking();
    if (currentHintIndex > 0) {
      setCurrentHintIndex(currentHintIndex - 1);
    }
  };

  const toggleVoice = () => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    localStorage.setItem('mukn-voice-hints', String(newValue));
    if (!newValue) {
      stopSpeaking();
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
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleVoice}
                  className={cn(
                    'h-6 w-6 p-0',
                    voiceEnabled ? 'text-[#6C63FF]' : 'text-[#8A8A8A]'
                  )}
                >
                  {voiceEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { stopSpeaking(); setVisible(false); }}
                  className="h-6 w-6 p-0 text-[#8A8A8A] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-[#8A8A8A] mb-3">{currentHint.content}</p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {availableHints.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { stopSpeaking(); setCurrentHintIndex(i); }}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all',
                      i === currentHintIndex ? 'bg-[#6C63FF] w-3' : 'bg-[#2A2B32] hover:bg-[#6C63FF]/50'
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

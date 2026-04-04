'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import { useModeStore } from '@/store/mode-store';
import { toast } from 'sonner';

const hotkeys = [
  { key: 'n', action: () => useAppStore.getState().setActiveTab('campaigns'), description: 'Новая кампания' },
  { key: 'p', action: () => toast.info('Пауза всех кампаний'), description: 'Пауза всех' },
  { key: 'r', action: () => toast.info('Отчёт за сегодня'), description: 'Отчёт' },
  { key: '/', action: () => document.querySelector('input')?.focus(), description: 'Поиск' },
  { key: 'k', ctrl: true, action: () => useModeStore.getState().setAIPanelOpen(true), description: 'AI-помощник' },
  { key: 'Escape', action: () => {
    useModeStore.getState().setAIPanelOpen(false);
    useModeStore.getState().setTerminalMode(false);
  }, description: 'Закрыть' },
  { key: '`', ctrl: true, action: () => useModeStore.getState().setTerminalMode(true), description: 'Terminal Mode' },
];

export function useHotkeys() {
  const { uiMode } = useModeStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = e.key.toLowerCase();
    const ctrlPressed = e.ctrlKey || e.metaKey;

    for (const hotkey of hotkeys) {
      const matchesKey = hotkey.key.toLowerCase() === key;
      const matchesCtrl = hotkey.ctrl ? ctrlPressed : !ctrlPressed;

      if (matchesKey && matchesCtrl) {
        e.preventDefault();
        hotkey.action();
        toast.success(`⌨️ ${hotkey.description}`, { duration: 1500 });
      }
    }
  }, []);

  useEffect(() => {
    if (uiMode === 'expert') {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [uiMode, handleKeyDown]);

  return { hotkeys };
}

export function HotkeysHelp() {
  const { uiMode } = useModeStore();
  
  if (uiMode !== 'expert') return null;
  
  return (
    <div className="fixed bottom-4 left-4 bg-[#1E1F26] border border-[#2A2B32] rounded-lg p-2 text-xs text-[#8A8A8A] z-40">
      <span>⌨️ N-новая, P-пауза, R-отчёт, /-поиск, Ctrl+K-AI, Ctrl+`-терминал</span>
    </div>
  );
}

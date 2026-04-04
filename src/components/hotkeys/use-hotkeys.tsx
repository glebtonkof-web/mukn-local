'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '@/store';
import { useModeStore } from '@/store/mode-store';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Command, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'actions' | 'system' | 'tools';
}

export function useHotkeys() {
  const { uiMode } = useModeStore();
  const { setCampaignModalOpen, setActiveTab } = useAppStore();
  const { setTheme, theme } = useTheme();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const hotkeys: HotkeyConfig[] = [
    // Navigation
    { key: 'n', action: () => setCampaignModalOpen(true), description: 'Новая кампания', category: 'navigation' },
    { key: 'g', action: () => setActiveTab('dashboard'), description: 'Главная', category: 'navigation' },
    { key: 'c', action: () => setActiveTab('campaigns'), description: 'Кампании', category: 'navigation' },
    { key: 'a', action: () => setActiveTab('accounts'), description: 'Аккаунты', category: 'navigation' },
    { key: 's', action: () => setActiveTab('settings'), description: 'Настройки', category: 'navigation' },
    
    // Actions
    { key: 'p', action: () => toast.info('Пауза всех кампаний'), description: 'Пауза всех', category: 'actions' },
    { key: 'r', action: () => toast.info('Отчёт за сегодня'), description: 'Отчёт', category: 'actions' },
    { key: '/', action: () => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      searchInput?.focus();
    }, description: 'Поиск', category: 'actions' },
    
    // System
    { key: 'Escape', action: () => {
      useModeStore.getState().setAIPanelOpen(false);
      useModeStore.getState().setTerminalMode(false);
      setHelpDialogOpen(false);
    }, description: 'Закрыть модалку', category: 'system' },
    
    // Tools
    { key: 'k', ctrl: true, action: () => useModeStore.getState().setAIPanelOpen(true), description: 'AI-помощник', category: 'tools' },
    { key: '`', ctrl: true, action: () => useModeStore.getState().setTerminalMode(true), description: 'Terminal Mode', category: 'tools' },
    { key: '?', shift: true, action: () => setHelpDialogOpen(true), description: 'Справка по шорткатам', category: 'tools' },
    { key: 't', ctrl: true, action: () => {
      const themes = ['dark', 'light', 'high-contrast', 'system'];
      const currentIndex = themes.indexOf(theme || 'dark');
      const nextTheme = themes[(currentIndex + 1) % themes.length];
      setTheme(nextTheme);
      toast.success(`Тема изменена на: ${nextTheme}`);
    }, description: 'Переключить тему', category: 'tools' },
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur();
      }
      return;
    }

    const key = e.key.toLowerCase();
    const ctrlPressed = e.ctrlKey || e.metaKey;
    const shiftPressed = e.shiftKey;
    const altPressed = e.altKey;

    for (const hotkey of hotkeys) {
      const matchesKey = hotkey.key.toLowerCase() === key;
      const matchesCtrl = hotkey.ctrl ? ctrlPressed : !ctrlPressed;
      const matchesShift = hotkey.shift ? shiftPressed : !shiftPressed;
      const matchesAlt = hotkey.alt ? altPressed : !altPressed;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
        e.preventDefault();
        hotkey.action();
        toast.success(`⌨️ ${hotkey.description}`, { duration: 1500 });
        break;
      }
    }
  }, [hotkeys, setTheme, theme, setCampaignModalOpen, setActiveTab]);

  useEffect(() => {
    if (uiMode === 'expert') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [uiMode, handleKeyDown]);

  return { hotkeys, helpDialogOpen, setHelpDialogOpen };
}

// Hotkeys Help Dialog Component
export function HotkeysHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { uiMode } = useModeStore();
  
  if (uiMode !== 'expert') return null;

  const categories = [
    { id: 'navigation', label: 'Навигация', keys: [
      { key: 'N', description: 'Новая кампания' },
      { key: 'G', description: 'Главная' },
      { key: 'C', description: 'Кампании' },
      { key: 'A', description: 'Аккаунты' },
      { key: 'S', description: 'Настройки' },
    ]},
    { id: 'actions', label: 'Действия', keys: [
      { key: 'P', description: 'Пауза всех кампаний' },
      { key: 'R', description: 'Отчёт за сегодня' },
      { key: '/', description: 'Фокус на поиск' },
    ]},
    { id: 'system', label: 'Система', keys: [
      { key: 'Esc', description: 'Закрыть модалку/панель' },
      { key: 'Ctrl+T', description: 'Переключить тему' },
      { key: '?', description: 'Справка по шорткатам' },
    ]},
    { id: 'tools', label: 'Инструменты', keys: [
      { key: 'Ctrl+K', description: 'AI-помощник' },
      { key: 'Ctrl+`', description: 'Terminal Mode' },
    ]},
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#14151A] border-[#2A2B32] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Keyboard className="w-5 h-5 text-[#6C63FF]" />
            Горячие клавиши
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {categories.map((category) => (
            <div key={category.id}>
              <h3 className="text-sm font-semibold text-[#6C63FF] mb-3 uppercase tracking-wider">
                {category.label}
              </h3>
              <div className="space-y-2">
                {category.keys.map((hotkey) => (
                  <div key={hotkey.key} className="flex items-center justify-between">
                    <span className="text-[#8A8A8A]">{hotkey.description}</span>
                    <kbd className="px-2 py-1 bg-[#1E1F26] border border-[#2A2B32] rounded text-sm font-mono text-white min-w-[60px] text-center">
                      {hotkey.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-2 pt-4 border-t border-[#2A2B32]">
          <AlertCircle className="w-4 h-4 text-[#8A8A8A]" />
          <p className="text-xs text-[#8A8A8A]">
            Нажмите <kbd className="px-1 py-0.5 bg-[#1E1F26] border border-[#2A2B32] rounded text-xs">Esc</kbd> чтобы закрыть
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact Hotkeys Help Footer Component
export function HotkeysHelp() {
  const { uiMode } = useModeStore();
  const { setHelpDialogOpen } = useHotkeys();
  
  if (uiMode !== 'expert') return null;
  
  return (
    <div className="fixed bottom-4 left-4 bg-[#1E1F26] border border-[#2A2B32] rounded-lg p-2 text-xs text-[#8A8A8A] z-40 flex items-center gap-3">
      <span className="hidden sm:inline">⌨️ N-новая, P-пауза, R-отчёт, /-поиск, Ctrl+K-AI, Ctrl+`-терминал</span>
      <span className="sm:hidden">⌨️ N, P, R, /</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setHelpDialogOpen(true)}
        className="h-6 px-2 text-[#6C63FF] hover:text-[#6C63FF]"
      >
        ?
      </Button>
    </div>
  );
}

// Keyboard shortcut badge component for UI hints
export function KeyboardShortcut({ 
  keys, 
  className 
}: { 
  keys: string | string[];
  className?: string;
}) {
  const keyArray = Array.isArray(keys) ? keys : [keys];
  
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {keyArray.map((key, index) => (
        <span key={index}>
          <kbd className="px-1.5 py-0.5 bg-[#1E1F26] border border-[#2A2B32] rounded text-xs font-mono text-[#8A8A8A]">
            {key}
          </kbd>
          {index < keyArray.length - 1 && (
            <span className="text-[#8A8A8A] mx-0.5">+</span>
          )}
        </span>
      ))}
    </div>
  );
}

export default useHotkeys;

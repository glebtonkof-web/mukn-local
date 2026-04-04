'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Contrast, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ThemeSwitcherProps {
  variant?: 'default' | 'compact' | 'full';
  className?: string;
}

const themes = [
  {
    value: 'dark',
    label: 'Тёмная',
    description: 'Классическая тёмная тема',
    icon: Moon,
  },
  {
    value: 'light',
    label: 'Светлая',
    description: 'Светлая тема для дня',
    icon: Sun,
  },
  {
    value: 'high-contrast',
    label: 'Высокий контраст',
    description: 'Для доступности',
    icon: Contrast,
  },
  {
    value: 'system',
    label: 'Системная',
    description: 'Как в системе',
    icon: Monitor,
  },
];

export function ThemeSwitcher({ variant = 'default', className }: ThemeSwitcherProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className={cn('h-9 w-9', className)}>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const currentTheme = themes.find(t => t.value === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9', className)}
            aria-label="Переключить тему"
          >
            <CurrentIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-[#14151A] border-[#2A2B32]">
          {themes.map((t) => {
            const Icon = t.icon;
            return (
              <DropdownMenuItem
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'flex items-center gap-2 cursor-pointer text-[#E0E0E0] hover:bg-[#1E1F26] focus:bg-[#1E1F26]',
                  theme === t.value && 'bg-[#6C63FF]/20 text-[#6C63FF]'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn('space-y-3', className)}>
        <p className="text-sm text-[#8A8A8A]">Выберите тему оформления</p>
        <div className="grid grid-cols-2 gap-2">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200 touch-manipulation min-h-[88px]',
                  isActive
                    ? 'bg-[#6C63FF]/20 border-[#6C63FF] text-[#6C63FF]'
                    : 'bg-[#1E1F26] border-[#2A2B32] text-[#8A8A8A] hover:border-[#6C63FF]/50 hover:text-white'
                )}
              >
                <Icon className="w-6 h-6" />
                <div className="text-center">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs opacity-70">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[#8A8A8A] mt-2">
          Текущая тема: <span className="text-[#6C63FF]">{currentTheme.label}</span>
        </p>
      </div>
    );
  }

  // Default variant - dropdown with descriptions
  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'gap-2 bg-[#1E1F26] border-[#2A2B32] text-white hover:bg-[#2A2B32] hover:text-white min-h-[44px] px-4',
                  className
                )}
              >
                <CurrentIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{currentTheme.label}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent className="bg-[#14151A] border-[#2A2B32]">
            <p>Переключить тему (Ctrl+T)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-56 bg-[#14151A] border-[#2A2B32]">
        {themes.map((t) => {
          const Icon = t.icon;
          return (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                'flex items-center gap-3 cursor-pointer py-3 text-[#E0E0E0] hover:bg-[#1E1F26] focus:bg-[#1E1F26]',
                theme === t.value && 'bg-[#6C63FF]/20 text-[#6C63FF]'
              )}
            >
              <Icon className="h-4 w-4" />
              <div className="flex-1">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-[#8A8A8A]">{t.description}</p>
              </div>
              {theme === t.value && (
                <div className="w-2 h-2 rounded-full bg-[#6C63FF]" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact icon-only switcher for headers
export function ThemeSwitcherIcon({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn('h-10 w-10', className)}>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.value === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].value);
  };

  const currentTheme = themes.find(t => t.value === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            className={cn('h-10 w-10 touch-manipulation text-[#8A8A8A] hover:text-white', className)}
            aria-label="Переключить тему"
          >
            <CurrentIcon className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="bg-[#14151A] border-[#2A2B32]">
          <p>{currentTheme.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

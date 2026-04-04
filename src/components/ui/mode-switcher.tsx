'use client';

import { useModeStore, UIMode } from '@/store/mode-store';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { User, ChevronDown, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const modes: { id: UIMode; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    id: 'simple', 
    label: 'Простой', 
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Крупные кнопки, подсказки, AI-помощник'
  },
  { 
    id: 'expert', 
    label: 'Эксперт', 
    icon: <Zap className="w-4 h-4" />,
    description: 'Компактный вид, горячие клавиши, терминал'
  },
];

export function ModeSwitcher() {
  const { uiMode, setUIMode } = useModeStore();
  
  const currentMode = modes.find(m => m.id === uiMode) || modes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-[#8A8A8A] hover:text-white">
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">{currentMode.label}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#14151A] border-[#2A2B32] w-56">
        {modes.map((mode) => (
          <DropdownMenuItem
            key={mode.id}
            onClick={() => setUIMode(mode.id)}
            className={cn(
              'flex items-center gap-3 p-3 cursor-pointer',
              uiMode === mode.id ? 'bg-[#6C63FF]/20' : 'hover:bg-[#1E1F26]'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              uiMode === mode.id ? 'bg-[#6C63FF]' : 'bg-[#1E1F26]'
            )}>
              {mode.icon}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{mode.label}</p>
              <p className="text-xs text-[#8A8A8A]">{mode.description}</p>
            </div>
            {uiMode === mode.id && (
              <Badge className="bg-[#6C63FF] text-xs">✓</Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

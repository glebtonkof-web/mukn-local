'use client';

import { useState, useRef, useEffect } from 'react';
import { useModeStore } from '@/store/mode-store';
import { useAppStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Terminal as TerminalIcon, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TerminalOutput {
  type: 'input' | 'output' | 'error' | 'success';
  text: string;
  timestamp: Date;
}

export function TerminalMode() {
  const { terminalMode, setTerminalMode, terminalHistory, addTerminalCommand } = useModeStore();
  const { campaigns, accounts, setActiveTab } = useAppStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<TerminalOutput[]>([
    { type: 'output', text: 'МУКН | Трафик Terminal v1.0', timestamp: new Date() },
    { type: 'output', text: 'Введите "help" для списка команд', timestamp: new Date() },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [terminalMode]);

  if (!terminalMode) return null;

  const commands: Record<string, { description: string; execute: (args: string[]) => void }> = {
    help: {
      description: 'Показать список команд',
      execute: () => {
        const cmdList = Object.entries(commands)
          .map(([k, v]) => `  ${k.padEnd(15)} - ${v.description}`)
          .join('\n');
        addOutput('output', 'Доступные команды:\n' + cmdList);
      }
    },
    'campaign list': {
      description: 'Список кампаний',
      execute: () => {
        const list = campaigns.map(c => `  ${c.id} | ${c.name} | ${c.status}`).join('\n') || '  Нет кампаний';
        addOutput('output', 'Кампании:\n' + list);
      }
    },
    'campaign start': {
      description: 'Запустить кампанию',
      execute: (args) => {
        if (args[0]) {
          addOutput('success', `Кампания ${args[0]} запущена`);
          toast.success('Кампания запущена');
        } else {
          addOutput('error', 'Укажите ID кампании: campaign start <id>');
        }
      }
    },
    'account list': {
      description: 'Список аккаунтов',
      execute: () => {
        const list = accounts.map(a => `  ${a.id} | @${a.username} | ${a.status}`).join('\n') || '  Нет аккаунтов';
        addOutput('output', 'Аккаунты:\n' + list);
      }
    },
    'ai ask': {
      description: 'Спросить AI',
      execute: (args) => {
        if (args.length > 0) {
          addOutput('output', `🤖 DeepSeek: Обрабатываю запрос "${args.join(' ')}"...`);
          setTimeout(() => {
            addOutput('output', '🤖 DeepSeek: Готово! Проверьте AI-панель для ответа.');
          }, 1000);
        } else {
          addOutput('error', 'Укажите вопрос: ai ask <вопрос>');
        }
      }
    },
    clear: {
      description: 'Очистить экран',
      execute: () => {
        setOutput([
          { type: 'output', text: 'МУКН | Трафик Terminal v1.0', timestamp: new Date() },
          { type: 'output', text: 'Введите "help" для списка команд', timestamp: new Date() },
        ]);
      }
    },
    exit: {
      description: 'Выйти из терминала',
      execute: () => {
        setTerminalMode(false);
      }
    },
    goto: {
      description: 'Перейти к разделу',
      execute: (args) => {
        const validTabs = ['dashboard', 'campaigns', 'accounts', 'analytics', 'settings', 'traffic', 'ai-comments'];
        if (args[0] && validTabs.includes(args[0])) {
          setActiveTab(args[0]);
          addOutput('success', `Переход к разделу "${args[0]}"`);
        } else {
          addOutput('error', `Доступные разделы: ${validTabs.join(', ')}`);
        }
      }
    },
  };

  const addOutput = (type: TerminalOutput['type'], text: string) => {
    setOutput(prev => [...prev, { type, text, timestamp: new Date() }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    addOutput('input', `> ${input}`);
    addTerminalCommand(input);

    const [cmd, ...args] = input.trim().split(' ');
    
    if (commands[cmd]) {
      commands[cmd].execute(args);
    } else {
      addOutput('error', `Неизвестная команда: ${cmd}. Введите "help" для списка команд.`);
    }

    setInput('');
  };

  return (
    <div className="fixed inset-0 bg-[#0A0B0E] z-50 flex items-center justify-center">
      <Card className="w-full max-w-4xl h-[80vh] bg-[#0A0B0E] border-[#2A2B32]">
        <CardContent className="p-0 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#2A2B32]">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-5 h-5 text-[#6C63FF]" />
              <span className="text-white font-mono">МУКН Terminal</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setTerminalMode(false)} className="text-[#8A8A8A]">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Output */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
            {output.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'mb-1',
                  line.type === 'input' && 'text-[#6C63FF]',
                  line.type === 'output' && 'text-[#8A8A8A]',
                  line.type === 'error' && 'text-[#FF4D4D]',
                  line.type === 'success' && 'text-[#00D26A]'
                )}
              >
                {line.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t border-[#2A2B32]">
            <span className="text-[#6C63FF] font-mono">{'>'}</span>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent border-none text-white font-mono focus-visible:ring-0"
              placeholder="Введите команду..."
              autoComplete="off"
            />
            <Button type="submit" size="sm" className="bg-[#6C63FF]">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

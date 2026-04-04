'use client';

import { useState, useRef, useEffect } from 'react';
import { useModeStore, AIAction } from '@/store/mode-store';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, Send, Maximize2, Minimize2, X, 
  Copy, Check, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const quickPrompts = [
  { id: 'casino', label: '🎰 Казино', prompt: 'Сгенерируй 3 комментария для казино' },
  { id: 'crypto', label: '💰 Крипта', prompt: 'Сгенерируй 3 комментария для крипто-канала' },
  { id: 'dating', label: '❤️ Дейтинг', prompt: 'Сгенерируй 3 комментария для дейтинга' },
  { id: 'analyze', label: '📊 Анализ', prompt: 'Проанализируй каналы и дай рекомендации' },
  { id: 'budget', label: '💵 Бюджет', prompt: 'Помоги рассчитать бюджет для кампании' },
  { id: 'optimize', label: '⚙️ Оптимизация', prompt: 'Как оптимизировать настройки для максимального дохода?' },
];

export function AIAssistantPanel() {
  const {
    aiPanelOpen, aiPanelWidth, aiPanelExpanded,
    setAIPanelOpen, setAIPanelExpanded,
    aiMessages, addAIMessage, clearAIMessages,
    tokensUsed, tokensLimit, getRemainingTokens,
    getCachedResponse, cacheResponse,
  } = useModeStore();
  
  const { campaigns, accounts } = useAppStore();
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  if (!aiPanelOpen) {
    return (
      <button
        onClick={() => setAIPanelOpen(true)}
        className="fixed right-4 bottom-4 w-14 h-14 rounded-full bg-[#6C63FF] shadow-lg flex items-center justify-center hover:bg-[#6C63FF]/80 transition-all z-50"
      >
        <Bot className="w-6 h-6 text-white" />
      </button>
    );
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      timestamp: new Date(),
    };

    addAIMessage(userMessage);
    setInput('');
    setLoading(true);

    // Check cache first
    const cached = getCachedResponse(input, 'default');
    if (cached) {
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: cached.response + '\n\n_📦 Из кэша (экономия токенов)_',
        timestamp: new Date(),
      };
      addAIMessage(assistantMessage);
      setLoading(false);
      return;
    }

    try {
      // Real API call to DeepSeek
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...aiMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: input }
          ],
          context: {
            campaignsCount: campaigns.length,
            accountsCount: accounts.length,
            activeView: 'dashboard',
          },
          temperature: 0.7,
          maxTokens: 1500,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: data.result,
        timestamp: new Date(),
        actions: extractActions(data.result),
      };

      addAIMessage(assistantMessage);

      // Update tokens used
      if (data.usage?.tokens) {
        addTokensUsed(data.usage.tokens);
      }

      // Cache the response
      cacheResponse({
        key: `${input}|default`,
        prompt: input,
        context: 'default',
        response: data.result,
        tokensUsed: data.usage?.tokens || 0,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error('AI Chat error:', error);

      // Fallback to simulated response
      const responses = generateContextualResponse(input, { campaigns: campaigns.length, accounts: accounts.length });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: responses.text + '\n\n_⚠️ Оффлайн-режим (проверьте подключение)_',
        timestamp: new Date(),
        actions: responses.actions,
      };

      addAIMessage(assistantMessage);
    }

    setLoading(false);
  };

  // Extract actionable items from AI response
  const extractActions = (text: string): AIAction[] => {
    const actions: AIAction[] = [];

    if (text.includes('кампанию') || text.includes('кампания')) {
      actions.push({ type: 'create_campaign', label: 'Создать кампанию', params: {} });
    }
    if (text.includes('настройки') || text.includes('настроить')) {
      actions.push({ type: 'open_settings', label: 'Открыть настройки', params: {} });
    }
    if (text.includes('комментар')) {
      actions.push({ type: 'generate_comment', label: 'Генерировать комментарии', params: {} });
    }

    return actions.slice(0, 2); // Max 2 actions
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Скопировано');
  };

  const executeAction = (action: AIAction) => {
    switch (action.type) {
      case 'create_campaign':
        toast.success('Кампания создана через AI');
        break;
      case 'open_settings':
        useAppStore.getState().setActiveTab('settings');
        break;
      case 'generate_comment':
        useAppStore.getState().setActiveTab('ai-comments');
        break;
      default:
        toast.info(`Выполняю: ${action.label}`);
    }
  };

  const tokenPercent = (tokensUsed / tokensLimit) * 100;
  const remainingTokens = getRemainingTokens();

  return (
    <div 
      className={cn(
        'fixed right-0 top-0 h-full bg-[#14151A] border-l border-[#2A2B32] flex flex-col transition-all z-40',
        aiPanelExpanded ? 'w-full' : ''
      )}
      style={{ width: aiPanelExpanded ? '100%' : `${aiPanelWidth}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2A2B32]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#6C63FF]" />
          </div>
          <div>
            <h3 className="text-white font-medium">DeepSeek AI</h3>
            <Badge className="bg-[#00D26A]/20 text-[#00D26A] text-xs">Бесплатно</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setAIPanelExpanded(!aiPanelExpanded)} className="text-[#8A8A8A]">
            {aiPanelExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAIPanelOpen(false)} className="text-[#8A8A8A]">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Token status */}
      <div className="px-4 py-2 border-b border-[#2A2B32]">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[#8A8A8A]">Токенов</span>
          <span className="text-white">{tokensUsed.toLocaleString()} / {tokensLimit.toLocaleString()}</span>
        </div>
        <div className="h-1.5 bg-[#1E1F26] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#00D26A] to-[#6C63FF] transition-all"
            style={{ width: `${Math.min(tokenPercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-[#8A8A8A] mt-1">
          Осталось: ~{Math.floor(remainingTokens / 500)} комментариев
        </p>
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 border-b border-[#2A2B32] flex gap-1 flex-wrap">
        {quickPrompts.map((qp) => (
          <Button
            key={qp.id}
            variant="outline"
            size="sm"
            onClick={() => setInput(qp.prompt)}
            className="h-7 text-xs border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            {qp.label}
          </Button>
        ))}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {aiMessages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto text-[#6C63FF] mb-4" />
            <h4 className="text-white font-medium mb-2">Чем могу помочь?</h4>
            <p className="text-sm text-[#8A8A8A] mb-4">
              Спросите о кампаниях, комментариях или настройках
            </p>
            <div className="space-y-2 text-left max-w-[280px] mx-auto">
              <div className="p-3 bg-[#1E1F26] rounded-lg text-sm text-[#8A8A8A]">
                💡 "Как увеличить доход?"
              </div>
              <div className="p-3 bg-[#1E1F26] rounded-lg text-sm text-[#8A8A8A]">
                💡 "Сгенерируй 5 комментариев"
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'p-3 rounded-lg',
                  msg.role === 'user' 
                    ? 'bg-[#6C63FF]/20 ml-4' 
                    : 'bg-[#1E1F26] mr-4'
                )}
              >
                <div className="flex items-start gap-2">
                  {msg.role === 'assistant' && (
                    <Bot className="w-5 h-5 text-[#6C63FF] shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {msg.actions.map((action, i) => (
                          <Button
                            key={i}
                            size="sm"
                            onClick={() => executeAction(action)}
                            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80 text-xs"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                    {msg.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="h-6 mt-2 text-xs text-[#8A8A8A]"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copiedId === msg.id ? 'Скопировано' : 'Копировать'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 p-3 bg-[#1E1F26] rounded-lg mr-4">
                <Bot className="w-5 h-5 text-[#6C63FF] animate-pulse" />
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-[#2A2B32]">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Спросите AI..."
            className="bg-[#1E1F26] border-[#2A2B32]"
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} className="bg-[#6C63FF]">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs text-[#8A8A8A]">Ctrl+K для доступа</p>
          <Button variant="ghost" size="sm" onClick={() => clearAIMessages()} className="h-5 text-xs text-[#8A8A8A]">
            <Trash2 className="w-3 h-3 mr-1" />
            Очистить
          </Button>
        </div>
      </div>
    </div>
  );
}

// Contextual response generator
function generateContextualResponse(input: string, context: { campaigns: number; accounts: number }) {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('комментар') && (lowerInput.includes('казино') || lowerInput.includes('crypto'))) {
    const style = lowerInput.includes('казино') ? 'казино' : 'крипто';
    return {
      text: `Вот 3 варианта комментариев для ${style}:

1. "Класс! Я тоже вчера поднял неплохо, результаты поражают 🚀"

2. "Давно искал нормальный канал с сигналами. Подписался, посмотрю 👀"

3. "Спасибо за инфу! Уже получил хороший результат, продолжаю следить"

💡 Совет: Публикуйте в первые 5 минут после поста.`,
      actions: [
        { type: 'generate_comment', label: 'Ещё варианты', params: { style } },
        { type: 'create_campaign', label: 'Создать кампанию', params: { type: style } },
      ]
    };
  }
  
  if (lowerInput.includes('доход') || lowerInput.includes('заработок') || lowerInput.includes('увеличить')) {
    return {
      text: `📊 Анализ вашего дохода:

Текущие показатели:
• Кампаний: ${context.campaigns}
• Аккаунтов: ${context.accounts}

Рекомендации для увеличения дохода в 2 раза:

1. **Добавьте аккаунты** — сейчас ${context.accounts}, оптимально 20-30

2. **Оптимизируйте время постинга** — лучший период 20:00-23:00

3. **A/B тестирование** — тестируйте разные стили

4. **Расширьте каналы** — добавьте 5-10 новых`,
      actions: [
        { type: 'open_settings', label: 'Настройки' },
        { type: 'create_campaign', label: 'Новая кампания' },
      ]
    };
  }
  
  if (lowerInput.includes('анализ') || lowerInput.includes('канал')) {
    return {
      text: `🔍 Анализ канала:

Для точного анализа отправьте ссылку на канал.

Общие рекомендации:
• Проверьте активность канала
• Оцените модерацию
• Изучите аудиторию

⚠️ Важно: Не спамьте в каналах с агрессивной модерацией.`,
      actions: [
        { type: 'apply_settings', label: 'Добавить канал' },
      ]
    };
  }
  
  if (lowerInput.includes('бюджет') || lowerInput.includes('расчёт')) {
    return {
      text: `💰 Калькулятор бюджета:

Пример расчёта для 1000₽/день:
• Понадобится ~15 аккаунтов
• 500 комментариев в день
• Расходы на прокси: ~150₽/день
• Ожидаемый ROI: 1:4

Хотите точный расчёт?`,
      actions: [
        { type: 'create_campaign', label: 'Создать с бюджетом' },
      ]
    };
  }
  
  // Default response
  return {
    text: `Я понимаю ваш запрос. Вот что я могу сделать:

• **Генерация комментариев** — для любых офферов
• **Анализ каналов** — проверка перед спамом
• **Расчёт бюджета** — оптимизация расходов
• **Настройка кампаний** — автоматическое создание

Выберите один из быстрых шаблонов выше.

💡 Совет: Чем точнее вопрос, тем полезнее ответ!`,
    actions: []
  };
}

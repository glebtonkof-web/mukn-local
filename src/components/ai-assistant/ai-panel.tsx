'use client';

import { useState, useRef, useEffect } from 'react';
import { useModeStore } from '@/store/mode-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Bot, Send, Maximize2, Minimize2, X, 
  Copy, Check, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const quickPrompts = [
  { id: 'code', label: '💻 Код', prompt: 'Напиши пример кода на Python' },
  { id: 'explain', label: '📚 Объясни', prompt: 'Объясни простыми словами как работает blockchain' },
  { id: 'translate', label: '🌐 Переведи', prompt: 'Переведи на английский: Привет, как дела?' },
  { id: 'creative', label: '✨ Творчество', prompt: 'Напиши короткую историю о космосе' },
  { id: 'math', label: '🔢 Математика', prompt: 'Реши уравнение: x² + 5x + 6 = 0' },
  { id: 'help', label: '❓ Помощь', prompt: 'Что ты умеешь?' },
];

export function AIAssistantPanel() {
  const {
    aiPanelOpen, aiPanelWidth, aiPanelExpanded,
    setAIPanelOpen, setAIPanelExpanded,
    aiMessages, addAIMessage, clearAIMessages,
    getCachedResponse, cacheResponse,
  } = useModeStore();
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоматическая прокрутка вниз при новых сообщениях
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, loading]);

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
          temperature: 0.7,
          maxTokens: 2000,
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
      };

      addAIMessage(assistantMessage);

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
      const fallbackText = generateFallbackResponse(input);

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: fallbackText + '\n\n_⚠️ Оффлайн-режим (проверьте подключение)_',
        timestamp: new Date(),
      };

      addAIMessage(assistantMessage);
    }

    setLoading(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Скопировано');
  };

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

      {/* Безлимитный статус */}
      <div className="px-4 py-2 border-b border-[#2A2B32]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#00D26A] flex items-center gap-1">
            <span className="w-2 h-2 bg-[#00D26A] rounded-full animate-pulse" />
            Безлимитный режим
          </span>
          <span className="text-[#8A8A8A]">DeepSeek AI</span>
        </div>
      </div>

      {/* Quick prompts - общие темы */}
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
      <div 
        className="flex-1 overflow-y-auto p-4 min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#1E1F26] [&::-webkit-scrollbar-thumb]:bg-[#6C63FF] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#8B7FFF]"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#6C63FF #1E1F26'
        }}
      >
        {aiMessages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto text-[#6C63FF] mb-4" />
            <h4 className="text-white font-medium mb-2">Привет! Чем могу помочь?</h4>
            <p className="text-sm text-[#8A8A8A] mb-4">
              Спроси меня о чём угодно — я отвечу!
            </p>
            <div className="space-y-2 text-left max-w-[280px] mx-auto">
              <div className="p-3 bg-[#1E1F26] rounded-lg text-sm text-[#8A8A8A]">
                💡 "Напиши код на Python"
              </div>
              <div className="p-3 bg-[#1E1F26] rounded-lg text-sm text-[#8A8A8A]">
                💡 "Объясни квантовую физику"
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
            {/* Якорь для автоматической прокрутки вниз */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

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

// Fallback response generator для оффлайн-режима
function generateFallbackResponse(input: string): string {
  return `Извини, сейчас я не могу подключиться к серверу. 

Пожалуйста, проверьте интернет-соединение и попробуйте ещё раз.

Ваш вопрос: "${input.substring(0, 100)}${input.length > 100 ? '...' : ''}"`;
}

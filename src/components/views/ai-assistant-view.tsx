'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Send,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Settings,
  Plus,
  MessageSquare,
  Sparkles,
  Loader2,
  BookOpen,
  Zap,
  Flame,
  Target,
  TrendingUp,
  DollarSign,
  Globe,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// Quick prompts for МУКН
const QUICK_PROMPTS = [
  { id: 'setup', label: '⚙️ Настройка', prompt: 'Помоги настроить этот проект. Какие шаги нужно выполнить для запуска?' },
  { id: 'warming', label: '🔥 Прогрев', prompt: 'Помоги с прогревом аккаунтов. Объясни стратегии для Instagram, TikTok, Telegram.' },
  { id: 'campaign', label: '📢 Кампания', prompt: 'Помоги создать и запустить рекламную кампанию.' },
  { id: 'creative', label: '🎨 Креатив', prompt: 'Помоги создать креатив для рекламы. Какие есть варианты?' },
  { id: 'monetization', label: '💰 Монетизация', prompt: 'Покажи все способы монетизации в системе и помоги выбрать лучший.' },
  { id: 'traffic', label: '🚥 Трафик', prompt: 'Покажи все 130+ методов трафика и помоги выбрать подходящий.' },
  { id: 'analytics', label: '📊 Аналитика', prompt: 'Покажи общую аналитику по всем кампаниям.' },
  { id: 'error', label: '🐛 Ошибка', prompt: 'У меня возникла ошибка при работе проекта. Помоги разобраться и исправить.' },
];

// Models
const MODELS = [
  { id: 'deepseek', name: 'DeepSeek', icon: '🧠' },
  { id: 'gpt-4', name: 'GPT-4', icon: '🤖' },
  { id: 'claude', name: 'Claude', icon: '🎭' },
];

// Default system prompt
const DEFAULT_SYSTEM_PROMPT = `Ты — МУКН Assistant, эксперт по платформе "МУКН | Трафик Enterprise".

Ты помогаешь с:
- **Прогрев аккаунтов**: Instagram (21 день), TikTok (28 дней), Telegram (21 день)
- **Кампании**: создание, оптимизация, аналитика
- **Креативы**: видео-креативы для казино, массовая генерация
- **Монетизация**: P2P, подписки, токены, Gap Scanner
- **Трафик**: 130+ методов трафика и воронки
- **OFM**: OnlyFans Marketing, воронки для моделей

## Ключевые правила прогрева Instagram:
- День 1-7 (Призрак): 5-10 лайков, 0 подписок
- День 8-14 (Лёгкий контакт): 10-15 лайков, 3-5 подписок
- День 15-21 (Активация): 15-25 лайков, 5-10 подписок
- День 22+ (Стабильный): Готов к трафику

Отвечай на русском языке, структурировано, с примерами и пошаговыми инструкциями.`;

export function AIAssistantView() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [model, setModel] = useState('deepseek');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Current chat
  const currentChat = chats.find(c => c.id === currentChatId);
  const messages = currentChat?.messages || [];

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai-assistant-chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChats(parsed.map((c: Chat) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        })));
        if (parsed.length > 0) {
          setCurrentChatId(parsed[0].id);
        }
      } catch (e) {
        console.error('Error loading chats:', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('ai-assistant-chats', JSON.stringify(chats));
    }
  }, [chats]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create new chat
  const createNewChat = () => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'Новый чат',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setInput('');
  };

  // Delete chat
  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      setCurrentChatId(remaining.length > 0 ? remaining[0].id : null);
    }
    toast.success('Чат удалён');
  };

  // Send message
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    // Create chat if none exists
    let chatId = currentChatId;
    if (!chatId) {
      const newChat: Chat = {
        id: `chat-${Date.now()}`,
        title: text.slice(0, 30) + (text.length > 30 ? '...' : ''),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setChats(prev => [newChat, ...prev]);
      chatId = newChat.id;
      setCurrentChatId(chatId);
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    // Add user message
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          messages: [...c.messages, userMessage],
          title: c.messages.length === 0 ? text.slice(0, 30) + (text.length > 30 ? '...' : '') : c.title,
          updatedAt: new Date(),
        };
      }
      return c;
    }));

    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          model,
          systemPrompt,
          loadContext: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка отправки сообщения');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-response`,
        role: 'assistant',
        content: data.content || data.message?.content || 'Нет ответа',
        timestamp: new Date(),
      };

      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: [...c.messages, assistantMessage],
            updatedAt: new Date(),
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка отправки сообщения');
      
      // Add error message
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте снова.',
        timestamp: new Date(),
      };

      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: [...c.messages, errorMessage],
            updatedAt: new Date(),
          };
        }
        return c;
      }));
    } finally {
      setLoading(false);
    }
  };

  // Copy message
  const copyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Скопировано');
  };

  // Clear all chats
  const clearAllChats = () => {
    setChats([]);
    setCurrentChatId(null);
    localStorage.removeItem('ai-assistant-chats');
    toast.success('Все чаты очищены');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            AI Ассистент
          </h1>
          <p className="text-[#8A8A8A] mt-1">
            Эксперт по МУКН софту — прогрев, кампании, креативы, монетизация
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-36 bg-[#1E1F26] border-[#2A2B32] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
              {MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-white">
                  {m.icon} {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => setSettingsOpen(true)}
            className="border-[#2A2B32]"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button 
            onClick={createNewChat}
            className="bg-[#6C63FF]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Новый чат
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Chat List */}
        <Card className="bg-[#14151A] border-[#2A2B32] lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm">История чатов</CardTitle>
              {chats.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllChats}
                  className="text-[#FF4D4D] h-7"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[400px]">
              {chats.length === 0 ? (
                <div className="text-center py-8 text-[#8A8A8A]">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Нет чатов</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setCurrentChatId(chat.id)}
                      className={cn(
                        "w-full text-left p-2 rounded-lg transition-colors group",
                        currentChatId === chat.id 
                          ? "bg-[#6C63FF] text-white" 
                          : "hover:bg-[#1E1F26] text-[#8A8A8A]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm truncate flex-1">{chat.title}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="text-xs opacity-60">
                        {chat.messages.length} сообщений
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Chat Area */}
        <Card className="bg-[#14151A] border-[#2A2B32] lg:col-span-3">
          <CardContent className="p-0 flex flex-col h-[600px]">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">AI Ассистент МУКН</h3>
                  <p className="text-[#8A8A8A] mb-6 max-w-md">
                    Я помогу с прогревом аккаунтов, кампаниями, креативами и монетизацией
                  </p>
                  
                  {/* Quick prompts */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-2xl">
                    {QUICK_PROMPTS.slice(0, 8).map((qp) => (
                      <Button
                        key={qp.id}
                        variant="outline"
                        size="sm"
                        onClick={() => sendMessage(qp.prompt)}
                        className="border-[#2A2B32] text-[#8A8A8A] hover:text-white hover:border-[#6C63FF] h-auto py-2"
                      >
                        <span className="truncate">{qp.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] rounded-xl p-3",
                          message.role === 'user'
                            ? "bg-[#6C63FF] text-white"
                            : "bg-[#1E1F26] text-white"
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                code({ className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const isInline = !match;
                                  return isInline ? (
                                    <code className="bg-[#2A2B32] px-1 rounded text-sm" {...props}>
                                      {children}
                                    </code>
                                  ) : (
                                    <SyntaxHighlighter
                                      style={vscDarkPlus}
                                      language={match[1]}
                                      PreTag="div"
                                      className="rounded-lg text-sm"
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  );
                                },
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                          <span className="text-xs opacity-60">
                            {message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-60 hover:opacity-100"
                            onClick={() => copyMessage(message.content, message.id)}
                          >
                            {copiedId === message.id ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-[#1E1F26] rounded-xl p-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-[#2A2B32]">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Напишите сообщение..."
                  className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[44px] max-h-32 resize-none"
                  rows={1}
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="bg-[#6C63FF] hover:bg-[#6C63FF]/80 shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-[#8A8A8A] mt-2">
                Enter — отправить, Shift+Enter — новая строка
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FFB800]" />
            Быстрые команды
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {QUICK_PROMPTS.map((qp) => (
              <Button
                key={qp.id}
                variant="outline"
                size="sm"
                onClick={() => sendMessage(qp.prompt)}
                className="border-[#2A2B32] text-[#8A8A8A] hover:text-white hover:border-[#6C63FF] h-auto py-2"
              >
                <span className="truncate">{qp.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Настройки AI Ассистента</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Настройте поведение AI ассистента
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Модель</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  {MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-white">
                      {m.icon} {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Системный промпт</Label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[200px]"
                placeholder="Системный промпт для AI..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setSettingsOpen(false)}
              className="border-[#2A2B32]"
            >
              Закрыть
            </Button>
            <Button
              onClick={() => {
                localStorage.setItem('ai-assistant-settings', JSON.stringify({ model, systemPrompt }));
                setSettingsOpen(false);
                toast.success('Настройки сохранены');
              }}
              className="bg-[#6C63FF]"
            >
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AIAssistantView;

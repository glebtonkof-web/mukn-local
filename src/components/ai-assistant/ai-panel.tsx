'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  Send,
  X,
  Maximize2,
  Minimize2,
  Globe,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Loader2,
  Home,
  ArrowLeft,
  ArrowRight,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Quick prompts
const QUICK_PROMPTS = [
  { id: 'setup', label: '⚙️ Настройка', prompt: 'Помоги настроить этот проект.' },
  { id: 'warming', label: '🔥 Прогрев', prompt: 'Помоги с прогревом аккаунтов.' },
  { id: 'campaign', label: '📢 Кампания', prompt: 'Помоги создать кампанию.' },
  { id: 'creative', label: '🎨 Креатив', prompt: 'Помоги создать креатив.' },
];

// Default system prompt
const DEFAULT_SYSTEM_PROMPT = `Ты — МУКН Assistant, эксперт по платформе "МУКН | Трафик Enterprise".
Ты помогаешь с прогревом аккаунтов, кампаниями, креативами и монетизацией.
Отвечай на русском языке, структурировано.`;

interface AIPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIPanel({ isOpen, onOpenChange }: AIPanelProps) {
  const [mode, setMode] = useState<'chat' | 'browser'>('chat');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [browserUrl, setBrowserUrl] = useState('https://chat.deepseek.com');
  const [browserInput, setBrowserInput] = useState('https://chat.deepseek.com');
  const [isExpanded, setIsExpanded] = useState(false);
  const [browserHistory, setBrowserHistory] = useState<string[]>(['https://chat.deepseek.com']);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
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
          model: 'deepseek',
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          loadContext: true,
        }),
      });

      if (!response.ok) throw new Error('Ошибка');

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-response`,
        role: 'assistant',
        content: data.content || data.message?.content || 'Нет ответа',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Ошибка отправки сообщения');
    } finally {
      setLoading(false);
    }
  };

  // Browser navigation
  const navigateTo = (url: string) => {
    let finalUrl = url;
    if (!url.startsWith('http')) {
      finalUrl = 'https://' + url;
    }
    setBrowserUrl(finalUrl);
    setBrowserInput(finalUrl);
    setBrowserHistory(prev => [...prev.slice(0, historyIndex + 1), finalUrl]);
    setHistoryIndex(prev => prev + 1);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      const newUrl = browserHistory[historyIndex - 1];
      setBrowserUrl(newUrl);
      setBrowserInput(newUrl);
    }
  };

  const goForward = () => {
    if (historyIndex < browserHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      const newUrl = browserHistory[historyIndex + 1];
      setBrowserUrl(newUrl);
      setBrowserInput(newUrl);
    }
  };

  const refreshBrowser = () => {
    if (iframeRef.current) {
      iframeRef.current.src = browserUrl;
    }
  };

  const goHome = () => {
    navigateTo('https://chat.deepseek.com');
  };

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed right-0 top-0 h-full bg-[#0f0f12] border-l border-[#2A2B32] flex flex-col z-40 transition-all duration-300",
        isExpanded ? "w-[600px]" : "w-[400px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#2A2B32]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-white text-sm">AI Ассистент</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mode Tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'chat' | 'browser')} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 px-3 pt-2">
          <TabsTrigger value="chat" className="text-xs">
            <MessageSquare className="w-3 h-3 mr-1" />
            Чат
          </TabsTrigger>
          <TabsTrigger value="browser" className="text-xs">
            <Globe className="w-3 h-3 mr-1" />
            Браузер
          </TabsTrigger>
        </TabsList>

        {/* Chat Mode */}
        <TabsContent value="chat" className="flex-1 flex flex-col m-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Sparkles className="w-10 h-10 text-[#6C63FF] mb-3" />
                <p className="text-sm text-white font-medium mb-2">AI Ассистент МУКН</p>
                <p className="text-xs text-[#8A8A8A] mb-4">Помогу с прогревом, кампаниями и монетизацией</p>
                
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                  {QUICK_PROMPTS.map((qp) => (
                    <Button
                      key={qp.id}
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(qp.prompt)}
                      className="border-[#2A2B32] text-[#8A8A8A] hover:text-white text-xs h-auto py-2"
                    >
                      {qp.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg p-2 text-sm",
                        message.role === 'user'
                          ? "bg-[#6C63FF] text-white"
                          : "bg-[#1E1F26] text-white"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="bg-[#1E1F26] rounded-lg p-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#6C63FF]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-[#2A2B32]">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Сообщение..."
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[36px] max-h-24 resize-none text-sm"
                rows={1}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                size="icon"
                className="bg-[#6C63FF] hover:bg-[#6C63FF]/80 shrink-0 h-9 w-9"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Browser Mode */}
        <TabsContent value="browser" className="flex-1 flex flex-col m-0">
          {/* Browser Toolbar */}
          <div className="p-2 border-b border-[#2A2B32] space-y-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack} disabled={historyIndex <= 0}>
                <ArrowLeft className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goForward} disabled={historyIndex >= browserHistory.length - 1}>
                <ArrowRight className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refreshBrowser}>
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goHome}>
                <Home className="w-3 h-3" />
              </Button>
              <Input
                value={browserInput}
                onChange={(e) => setBrowserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigateTo(browserInput);
                  }
                }}
                className="flex-1 h-7 bg-[#1E1F26] border-[#2A2B32] text-white text-xs"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(browserUrl, '_blank')}>
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
            
            {/* Quick Links */}
            <div className="flex gap-1 overflow-x-auto">
              {[
                { name: 'DeepSeek', url: 'https://chat.deepseek.com' },
                { name: 'ChatGPT', url: 'https://chat.openai.com' },
                { name: 'Claude', url: 'https://claude.ai' },
                { name: 'Gemini', url: 'https://gemini.google.com' },
              ].map((link) => (
                <Button
                  key={link.name}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo(link.url)}
                  className="h-6 px-2 text-xs text-[#8A8A8A] hover:text-white"
                >
                  {link.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Browser Frame */}
          <div className="flex-1 bg-[#1E1F26] relative">
            <iframe
              ref={iframeRef}
              src={browserUrl}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              title="AI Browser"
            />
            {/* Overlay notice */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#0f0f12]/90 p-2 text-center">
              <p className="text-xs text-[#8A8A8A]">
                🔒 Некоторые сайты могут блокировать встраивание. 
                <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-[#6C63FF]" onClick={() => window.open(browserUrl, '_blank')}>
                  Открыть в новой вкладке
                </Button>
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Toggle Button when closed */}
      <Button
        variant="default"
        size="icon"
        className="fixed right-4 bottom-4 h-12 w-12 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#00D26A] shadow-lg z-50"
        onClick={() => onOpenChange(true)}
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <Bot className="w-5 h-5" />
      </Button>
    </div>
  );
}

export default AIPanel;

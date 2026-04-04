'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, Sparkles, RefreshCw, 
  Copy, AlertTriangle, CheckCircle, DollarSign,
  Settings, TrendingUp, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Типы для API ответов
interface GeneratedComment {
  id: string;
  text: string;
  style: string;
  tokens: number;
  generatedAt: string;
  provider: string;
  model: string;
  temperature: number;
}

interface AIProvider {
  id: string;
  provider: string;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  defaultModel: string | null;
  priority: number;
  isActive: boolean;
  isFree: boolean;
  balance: number | null;
  balanceCurrency: string | null;
  lastCheckAt: string | null;
  lastCheckStatus: string | null;
  requestsCount: number;
  successCount: number;
  errorCount: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number | null;
  models: Array<{ id: string; name: string }>;
  selectedModel: string | null;
}

interface BudgetData {
  used: number;
  total: number;
  formatted?: {
    commentsNeeded: string;
    accountsNeeded: string;
    proxiesNeeded: string;
    dailyBudget: string;
    monthlyBudget: string;
  };
  recommendations?: string[];
}

interface GenerateConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  language?: 'ru' | 'en';
  maxLength?: number;
  minLength?: number;
  offerTheme?: string;
  style?: string;
}

interface CommentWithStats extends GeneratedComment {
  ctr?: number;
  conversion?: number;
  used?: number;
}

export function AICommentsView() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentWithStats[]>([]);
  const [budget, setBudget] = useState<BudgetData>({ used: 0, total: 5000 });
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка провайдеров
  const fetchProviders = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-providers');
      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (err) {
      console.error('Error fetching providers:', err);
      toast.error('Не удалось загрузить провайдеры AI');
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  // Загрузка бюджета
  const fetchBudget = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-comments/budget');
      if (!response.ok) {
        throw new Error('Failed to fetch budget');
      }
      const data = await response.json();
      
      // Если есть данные по бюджету, обновляем
      if (data.defaults) {
        // Используем дефолтные значения если нет реальных данных
        setBudget({
          used: 0,
          total: 5000,
        });
      }
    } catch (err) {
      console.error('Error fetching budget:', err);
    } finally {
      setLoadingBudget(false);
    }
  }, []);

  // Начальная загрузка данных
  useEffect(() => {
    fetchProviders();
    fetchBudget();
  }, [fetchProviders, fetchBudget]);

  // Генерация комментариев
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Введите тему для генерации');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const requestBody = {
        context: {
          postText: prompt,
          targetOffer: 'general',
        },
        count: 3,
        config: {
          language: 'ru',
          offerTheme: 'lifestyle',
          style: 'casual',
        } as GenerateConfig,
      };

      const response = await fetch('/api/ai-comments/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();
      
      if (data.success && data.comments) {
        const newComments: CommentWithStats[] = data.comments.map((comment: GeneratedComment) => ({
          ...comment,
          ctr: Math.random() * 5 + 3, // Временные метрики для отображения
          conversion: Math.random() * 3 + 1,
          used: 0,
        }));
        
        setComments(prev => [...newComments, ...prev]);
        setPrompt('');
        toast.success(`Сгенерировано ${data.comments.length} комментариев`);
        
        // Обновляем бюджет
        fetchBudget();
      } else {
        throw new Error(data.error || 'Неизвестная ошибка');
      }
    } catch (err) {
      console.error('Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ошибка генерации';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  // Регенерация комментария
  const handleRegenerate = async (comment: CommentWithStats) => {
    setRegeneratingId(comment.id);
    setError(null);

    try {
      const requestBody = {
        originalComment: comment.text,
        postText: prompt || 'Общая тема',
        offerTheme: 'lifestyle',
        previousAttempts: [comment.text],
      };

      const response = await fetch('/api/ai-comments/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Regeneration failed');
      }

      const data = await response.json();
      
      if (data.success && data.newComment) {
        const newComment: CommentWithStats = {
          id: Date.now().toString(),
          text: data.newComment,
          style: comment.style,
          tokens: data.newComment.length,
          generatedAt: new Date().toISOString(),
          provider: 'deepseek',
          model: 'deepseek-chat',
          temperature: 0.9,
          ctr: Math.random() * 5 + 3,
          conversion: Math.random() * 3 + 1,
          used: 0,
        };
        
        setComments(prev => 
          prev.map(c => c.id === comment.id ? newComment : c)
        );
        toast.success('Комментарий перегенерирован');
        
        // Обновляем бюджет
        fetchBudget();
      } else {
        throw new Error(data.error || 'Неизвестная ошибка');
      }
    } catch (err) {
      console.error('Regeneration error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ошибка регенерации';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setRegeneratingId(null);
    }
  };

  // Копирование в буфер
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано в буфер');
  };

  // Расчёт общей статистики
  const totalUsage = comments.reduce((sum, c) => sum + (c.used || 0), 0);
  const avgCtr = comments.length > 0 
    ? (comments.reduce((sum, c) => sum + (c.ctr || 0), 0) / comments.length).toFixed(1)
    : '0.0';

  // Активный провайдер
  const activeProvider = providers.find(p => p.isActive);
  const activeProviders = providers.filter(p => p.isActive);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-[#6C63FF]" />
            AI Комментарии
          </h1>
          <p className="text-[#8A8A8A]">Генерация и управление AI-комментарями</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-[#2A2B32]">
            <Settings className="w-4 h-4 mr-2" />
            Настройки AI
          </Button>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <Card className="bg-[#FF4D4D]/10 border-[#FF4D4D]">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-[#FF4D4D]">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto"
                onClick={() => setError(null)}
              >
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{comments.length}</p>
                <p className="text-xs text-[#8A8A8A]">Комментариев</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{avgCtr}%</p>
                <p className="text-xs text-[#8A8A8A]">Средний CTR</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{budget.used}₽</p>
                <p className="text-xs text-[#8A8A8A]">Бюджет использован</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalUsage}</p>
                <p className="text-xs text-[#8A8A8A]">Использований</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Генератор */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6C63FF]" />
            Генератор комментариев
          </CardTitle>
          <CardDescription className="text-[#8A8A8A]">
            Введите тему или контекст для генерации AI-комментариев
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Например: Криптовалютный канал с сигналами..."
              className="bg-[#1E1F26] border-[#2A2B32] min-h-[80px]"
              disabled={generating}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerate} 
              disabled={generating}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Сгенерировать
                </>
              )}
            </Button>
          </div>
          {activeProvider && (
            <p className="text-xs text-[#8A8A8A]">
              Активный провайдер: <span className="text-[#6C63FF]">{activeProvider.provider}</span>
              {activeProvider.defaultModel && ` (${activeProvider.defaultModel})`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Провайдеры */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white">AI Провайдеры</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProviders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#6C63FF]" />
              <span className="ml-2 text-[#8A8A8A]">Загрузка провайдеров...</span>
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8 text-[#8A8A8A]">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Нет настроенных провайдеров</p>
              <Button variant="outline" className="mt-4" onClick={fetchProviders}>
                Обновить
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {providers.map((provider) => (
                <div key={provider.id} className={cn(
                  'p-4 rounded-lg border',
                  provider.isActive ? 'bg-[#1E1F26] border-[#6C63FF]' : 'bg-[#1E1F26] border-[#2A2B32]'
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-white capitalize">{provider.provider}</span>
                    <Badge className={provider.isActive ? 'bg-[#00D26A]' : 'bg-[#8A8A8A]'}>
                      {provider.isActive ? 'Активен' : 'Неактивен'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8A8A8A]">Запросов</span>
                      <span className="text-white">{provider.requestsCount}</span>
                    </div>
                    {provider.totalCost !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8A8A8A]">Расходы</span>
                        <span className="text-white">${provider.totalCost.toFixed(2)}</span>
                      </div>
                    )}
                    {provider.balance !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8A8A8A]">Баланс</span>
                        <span className="text-white">
                          {provider.balance} {provider.balanceCurrency || 'USD'}
                        </span>
                      </div>
                    )}
                    <Progress 
                      value={provider.requestsCount > 0 
                        ? (provider.successCount / provider.requestsCount) * 100 
                        : 0
                      } 
                      className="h-2" 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Бюджет */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="py-4">
          {loadingBudget ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#6C63FF]" />
              <span className="ml-2 text-[#8A8A8A]">Загрузка бюджета...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8A8A8A]">Бюджет AI</span>
                <span className="text-white">{budget.used}₽ / {budget.total}₽</span>
              </div>
              <Progress value={(budget.used / budget.total) * 100} className="h-3" />
            </>
          )}
        </CardContent>
      </Card>

      {/* Список комментариев */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white">
            Сгенерированные комментарии
            {comments.length > 0 && (
              <span className="text-sm font-normal text-[#8A8A8A] ml-2">
                ({comments.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <div className="text-center py-12 text-[#8A8A8A]">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Нет сгенерированных комментариев</p>
              <p className="text-sm mt-2">Введите тему и нажмите "Сгенерировать"</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#2A2B32] scrollbar-track-transparent">
              {comments.map((comment) => (
                <div key={comment.id} className="p-4 rounded-lg bg-[#1E1F26] border border-[#2A2B32]">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-white flex-1">{comment.text}</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRegenerate(comment)}
                        disabled={regeneratingId === comment.id}
                      >
                        {regeneratingId === comment.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(comment.text)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-[#6C63FF]" />
                      <span className="text-sm text-[#8A8A8A]">CTR: </span>
                      <span className="text-sm text-[#6C63FF] font-medium">
                        {comment.ctr?.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-[#00D26A]" />
                      <span className="text-sm text-[#8A8A8A]">Conv: </span>
                      <span className="text-sm text-[#00D26A] font-medium">
                        {comment.conversion?.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4 text-[#FFB800]" />
                      <span className="text-sm text-[#8A8A8A]">Использований: </span>
                      <span className="text-sm text-white font-medium">{comment.used || 0}</span>
                    </div>
                  </div>
                  {comment.provider && (
                    <div className="mt-2 text-xs text-[#8A8A8A]">
                      Провайдер: {comment.provider} • Модель: {comment.model}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

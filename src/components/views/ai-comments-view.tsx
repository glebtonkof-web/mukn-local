'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, Sparkles, Zap, Brain, RefreshCw, 
  Copy, Send, AlertTriangle, CheckCircle, DollarSign,
  Play, Pause, Settings, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const generatedComments = [
  { id: '1', text: 'Отличный сигнал! Заработал +15% за неделю 🚀', ctr: 8.5, conversion: 4.2, used: 156 },
  { id: '2', text: 'Пользуюсь уже месяц, результаты поражают', ctr: 7.8, conversion: 3.9, used: 89 },
  { id: '3', text: 'Рекомендую всем, кто хочет заработать на крипте', ctr: 6.9, conversion: 3.5, used: 67 },
  { id: '4', text: 'Наконец-то нашёл надёжный источник сигналов!', ctr: 7.2, conversion: 3.7, used: 45 },
  { id: '5', text: 'Подписался, посмотрим что будет 👀', ctr: 5.4, conversion: 2.1, used: 234 },
];

const aiProviders = [
  { id: 'deepseek', name: 'DeepSeek', status: 'active', usage: 67, limit: 100, color: '#6C63FF' },
  { id: 'openai', name: 'OpenAI', status: 'inactive', usage: 0, limit: 50, color: '#00D26A' },
  { id: 'claude', name: 'Claude', status: 'inactive', usage: 0, limit: 50, color: '#FFB800' },
];

export function AICommentsView() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [comments, setComments] = useState(generatedComments);
  const [budget] = useState({ used: 2340, total: 5000 });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Введите тему для генерации');
      return;
    }
    setGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    const newComment = {
      id: Date.now().toString(),
      text: `AI-сгенерированный комментарий для: "${prompt}"`,
      ctr: Math.random() * 10,
      conversion: Math.random() * 5,
      used: 0
    };
    setComments([newComment, ...comments]);
    setGenerating(false);
    setPrompt('');
    toast.success('Комментарий сгенерирован!');
  };

  const handleRegenerate = (id: string) => {
    toast.info('Регенерация комментария...');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано в буфер');
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-[#6C63FF]" />
            AI Комментарии
          </h1>
          <p className="text-[#8A8A8A]">Генерация и управление AI-комментариями</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-[#2A2B32]">
            <Settings className="w-4 h-4 mr-2" />
            Настройки AI
          </Button>
        </div>
      </div>

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
                <p className="text-2xl font-bold text-white">6.7%</p>
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
                <p className="text-2xl font-bold text-white">591</p>
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
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Сгенерировать
                </>
              )}
            </Button>
            <Button variant="outline" className="border-[#2A2B32]">
              <Brain className="w-4 h-4 mr-2" />
              Массовая генерация
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Провайдеры */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white">AI Провайдеры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiProviders.map((provider) => (
              <div key={provider.id} className={cn(
                'p-4 rounded-lg border',
                provider.status === 'active' ? 'bg-[#1E1F26] border-[#6C63FF]' : 'bg-[#1E1F26] border-[#2A2B32]'
              )}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-white">{provider.name}</span>
                  <Badge className={provider.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#8A8A8A]'}>
                    {provider.status === 'active' ? 'Активен' : 'Неактивен'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8A8A8A]">Использование</span>
                    <span className="text-white">{provider.usage}/{provider.limit}</span>
                  </div>
                  <Progress value={(provider.usage / provider.limit) * 100} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Бюджет */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#8A8A8A]">Бюджет AI</span>
            <span className="text-white">{budget.used}₽ / {budget.total}₽</span>
          </div>
          <Progress value={(budget.used / budget.total) * 100} className="h-3" />
        </CardContent>
      </Card>

      {/* Список комментариев */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white">Сгенерированные комментарии</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 rounded-lg bg-[#1E1F26] border border-[#2A2B32]">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-white flex-1">{comment.text}</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleRegenerate(comment.id)}>
                      <RefreshCw className="w-4 h-4" />
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
                    <span className="text-sm text-[#6C63FF] font-medium">{comment.ctr}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-[#00D26A]" />
                    <span className="text-sm text-[#8A8A8A]">Conv: </span>
                    <span className="text-sm text-[#00D26A] font-medium">{comment.conversion}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4 text-[#FFB800]" />
                    <span className="text-sm text-[#8A8A8A]">Использований: </span>
                    <span className="text-sm text-white font-medium">{comment.used}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

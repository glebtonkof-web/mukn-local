'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, Cpu, DollarSign, Zap, Activity,
  Play, Pause, Settings, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const aiPoolStats = {
  totalRequests: 12456,
  todayRequests: 234,
  budget: { used: 3450, total: 10000 },
  activeModels: 3,
  avgResponseTime: 1.2,
};

const aiModels = [
  { id: 'deepseek', name: 'DeepSeek Chat', status: 'active', requests: 8900, accuracy: 94 },
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', status: 'active', requests: 2340, accuracy: 89 },
  { id: 'gpt-4', name: 'GPT-4', status: 'inactive', requests: 0, accuracy: 0 },
];

const recentRequests = [
  { id: '1', type: 'Comment Generation', model: 'DeepSeek Chat', tokens: 156, time: '2 сек назад' },
  { id: '2', type: 'Text Analysis', model: 'DeepSeek Reasoner', tokens: 89, time: '15 сек назад' },
  { id: '3', type: 'Content Rewrite', model: 'DeepSeek Chat', tokens: 234, time: '1 мин назад' },
];

export function AIPoolView() {
  const [models, setModels] = useState(aiModels);
  const [refreshing, setRefreshing] = useState(false);

  const toggleModel = (id: string) => {
    setModels(prev => prev.map(m => 
      m.id === id ? { ...m, status: m.status === 'active' ? 'inactive' : 'active' } : m
    ));
    toast.success('Статус модели изменён');
  };

  const refreshStats = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1500));
    setRefreshing(false);
    toast.success('Статистика обновлена');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-7 h-7 text-[#6C63FF]" />
            AI Pool
          </h1>
          <p className="text-[#8A8A8A]">Управление AI моделями и ресурсами</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshStats} disabled={refreshing} className="border-[#2A2B32]">
            {refreshing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Обновить
          </Button>
          <Button className="bg-[#6C63FF]">
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{aiPoolStats.totalRequests.toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Всего запросов</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{aiPoolStats.todayRequests}</p>
                <p className="text-xs text-[#8A8A8A]">Сегодня</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{aiPoolStats.activeModels}</p>
                <p className="text-xs text-[#8A8A8A]">Активных моделей</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{aiPoolStats.avgResponseTime}s</p>
                <p className="text-xs text-[#8A8A8A]">Среднее время</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#8A8A8A]">Бюджет AI Pool</span>
            <span className="text-white">{aiPoolStats.budget.used.toLocaleString()}₽ / {aiPoolStats.budget.total.toLocaleString()}₽</span>
          </div>
          <Progress value={(aiPoolStats.budget.used / aiPoolStats.budget.total) * 100} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white">AI Модели</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {models.map((model) => (
                <div key={model.id} className="flex items-center justify-between p-4 bg-[#1E1F26] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      model.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#8A8A8A]'
                    )} />
                    <div>
                      <p className="text-white font-medium">{model.name}</p>
                      <p className="text-xs text-[#8A8A8A]">{model.requests.toLocaleString()} запросов</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {model.accuracy > 0 && (
                      <Badge className="bg-[#6C63FF]/20 text-[#6C63FF]">{model.accuracy}% точность</Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggleModel(model.id)}
                    >
                      {model.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white">Последние запросы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-[#1E1F26] rounded-lg">
                  <div>
                    <p className="text-white text-sm">{req.type}</p>
                    <p className="text-xs text-[#8A8A8A]">{req.model} • {req.tokens} tokens</p>
                  </div>
                  <span className="text-xs text-[#8A8A8A]">{req.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

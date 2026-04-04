'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, Play, Pause, CheckCircle, Clock, AlertTriangle,
  Thermometer, RefreshCw, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const warmingAccounts = [
  { id: '1', username: 'crypto_master', progress: 100, status: 'completed', daysActive: 14, risk: 12 },
  { id: '2', username: 'signal_pro', progress: 75, status: 'warming', daysActive: 7, risk: 23 },
  { id: '3', username: 'trader_alex', progress: 45, status: 'warming', daysActive: 4, risk: 15 },
  { id: '4', username: 'newbie_user', progress: 10, status: 'warming', daysActive: 1, risk: 5 },
];

export function WarmingView() {
  const [accounts, setAccounts] = useState(warmingAccounts);

  const warmingCount = accounts.filter(a => a.status === 'warming').length;
  const completedCount = accounts.filter(a => a.status === 'completed').length;

  const toggleWarming = (id: string) => {
    setAccounts(prev => prev.map(a => 
      a.id === id ? { ...a, status: a.status === 'warming' ? 'paused' : 'warming' } : a
    ));
    toast.success('Статус изменён');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-7 h-7 text-[#FFB800]" />
            Прогрев аккаунтов
          </h1>
          <p className="text-[#8A8A8A]">{warmingCount} на прогреве, {completedCount} завершено</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-[#2A2B32]">
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </Button>
          <Button className="bg-[#FFB800] text-black">
            <Play className="w-4 h-4 mr-2" />
            Запустить все
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{warmingCount}</p>
                <p className="text-xs text-[#8A8A8A]">На прогреве</p>
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
                <p className="text-2xl font-bold text-white">{completedCount}</p>
                <p className="text-xs text-[#8A8A8A]">Завершено</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">7 дней</p>
                <p className="text-xs text-[#8A8A8A]">Среднее время</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">13%</p>
                <p className="text-xs text-[#8A8A8A]">Средний риск</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white">Аккаунты на прогреве</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="p-4 bg-[#1E1F26] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      account.status === 'completed' ? 'bg-[#00D26A]' : 
                      account.status === 'warming' ? 'bg-[#FFB800]' : 'bg-[#8A8A8A]'
                    )} />
                    <span className="text-white font-medium">@{account.username}</span>
                    <Badge className={cn(
                      account.status === 'completed' ? 'bg-[#00D26A]' : 
                      account.status === 'warming' ? 'bg-[#FFB800] text-black' : 'bg-[#8A8A8A]'
                    )}>
                      {account.status === 'completed' ? 'Готов' : 
                       account.status === 'warming' ? 'Прогрев' : 'Пауза'}
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleWarming(account.id)}
                  >
                    {account.status === 'warming' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{account.daysActive}</p>
                    <p className="text-xs text-[#8A8A8A]">Дней</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{account.progress}%</p>
                    <p className="text-xs text-[#8A8A8A]">Прогресс</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#00D26A]">{account.risk}%</p>
                    <p className="text-xs text-[#8A8A8A]">Риск</p>
                  </div>
                </div>
                <Progress value={account.progress} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

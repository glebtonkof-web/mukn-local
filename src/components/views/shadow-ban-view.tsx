'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Shield, Search, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, Eye, Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const shadowBanChecks = [
  { id: '1', channel: '@crypto_signals', platform: 'Telegram', status: 'clean', lastCheck: '2 мин назад', risk: 12 },
  { id: '2', channel: '@trading_pro', platform: 'Telegram', status: 'warning', lastCheck: '5 мин назад', risk: 45 },
  { id: '3', channel: '@casino_vip', platform: 'Telegram', status: 'banned', lastCheck: '10 мин назад', risk: 89 },
  { id: '4', channel: '@dating_tips', platform: 'Telegram', status: 'clean', lastCheck: '1 мин назад', risk: 8 },
];

const banAnalytics = {
  totalChecks: 1234,
  clean: 890,
  warnings: 234,
  banned: 110,
};

export function ShadowBanView() {
  const [checks, setChecks] = useState(shadowBanChecks);
  const [checking, setChecking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const runCheck = async () => {
    setChecking(true);
    await new Promise(r => setTimeout(r, 2000));
    setChecking(false);
    toast.success('Проверка завершена');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clean': return <CheckCircle className="w-5 h-5 text-[#00D26A]" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-[#FFB800]" />;
      case 'banned': return <XCircle className="w-5 h-5 text-[#FF4D4D]" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'bg-[#00D26A]';
      case 'warning': return 'bg-[#FFB800]';
      case 'banned': return 'bg-[#FF4D4D]';
      default: return 'bg-[#8A8A8A]';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-[#FF4D4D]" />
            Shadow Ban Check
          </h1>
          <p className="text-[#8A8A8A]">Проверка каналов на теневой бан</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Введите @username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#1E1F26] border-[#2A2B32] w-64"
          />
          <Button onClick={runCheck} disabled={checking} className="bg-[#6C63FF]">
            {checking ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Проверить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{banAnalytics.totalChecks}</p>
                <p className="text-xs text-[#8A8A8A]">Проверок</p>
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
                <p className="text-2xl font-bold text-white">{banAnalytics.clean}</p>
                <p className="text-xs text-[#8A8A8A]">Чистых</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{banAnalytics.warnings}</p>
                <p className="text-xs text-[#8A8A8A]">Предупреждений</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF4D4D]/20 flex items-center justify-center">
                <Ban className="w-5 h-5 text-[#FF4D4D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{banAnalytics.banned}</p>
                <p className="text-xs text-[#8A8A8A]">Забанено</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white">Результаты проверок</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checks.map((check) => (
              <div key={check.id} className="flex items-center justify-between p-4 bg-[#1E1F26] rounded-lg">
                <div className="flex items-center gap-4">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className="text-white font-medium">{check.channel}</p>
                    <p className="text-xs text-[#8A8A8A]">{check.platform} • {check.lastCheck}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-[#8A8A8A]">Риск бана</p>
                    <p className={cn(
                      'font-bold',
                      check.risk < 30 ? 'text-[#00D26A]' :
                      check.risk < 70 ? 'text-[#FFB800]' : 'text-[#FF4D4D]'
                    )}>{check.risk}%</p>
                  </div>
                  <Badge className={getStatusColor(check.status)}>
                    {check.status === 'clean' ? 'Чист' : 
                     check.status === 'warning' ? 'Предупреждение' : 'Забанен'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Globe, Server, Plus, CheckCircle, XCircle, RefreshCw,
  Trash2, Edit, Upload, Download, Zap, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const proxies = [
  { id: '1', ip: '185.234.xx.xx', port: 1080, type: 'SOCKS5', status: 'active', ping: 45 },
  { id: '2', ip: '45.67.xx.xx', port: 1080, type: 'SOCKS5', status: 'active', ping: 67 },
  { id: '3', ip: '91.234.xx.xx', port: 1080, type: 'SOCKS5', status: 'error', ping: null },
  { id: '4', ip: '178.45.xx.xx', port: 1080, type: 'SOCKS5', status: 'active', ping: 34 },
  { id: '5', ip: '212.56.xx.xx', port: 1080, type: 'HTTP', status: 'active', ping: 89 },
];

const simCards = [
  { id: '1', phone: '+79001234567', operator: 'МТС', country: 'RU', status: 'active', balance: 150 },
  { id: '2', phone: '+79007654321', operator: 'Билайн', country: 'RU', status: 'active', balance: 89 },
  { id: '3', phone: '+380501234567', operator: 'Kyivstar', country: 'UA', status: 'inactive', balance: 0 },
];

export function ProxiesView() {
  const [proxyList, setProxyList] = useState(proxies);
  const [checking, setChecking] = useState(false);

  const checkAllProxies = async () => {
    setChecking(true);
    await new Promise(r => setTimeout(r, 2000));
    setChecking(false);
    toast.success('Проверка завершена');
  };

  const activeProxies = proxyList.filter(p => p.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-7 h-7 text-[#6C63FF]" />
            Прокси
          </h1>
          <p className="text-[#8A8A8A]">{activeProxies} из {proxyList.length} активных</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={checkAllProxies} disabled={checking} className="border-[#2A2B32]">
            {checking ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Проверить все
          </Button>
          <Button className="bg-[#6C63FF]">
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeProxies}</p>
                <p className="text-xs text-[#8A8A8A]">Активных</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF4D4D]/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-[#FF4D4D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{proxyList.filter(p => p.status === 'error').length}</p>
                <p className="text-xs text-[#8A8A8A]">Ошибок</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">59ms</p>
                <p className="text-xs text-[#8A8A8A]">Средний пинг</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="p-0">
          <div className="divide-y divide-[#2A2B32]">
            {proxyList.map((proxy) => (
              <div key={proxy.id} className="flex items-center justify-between p-4 hover:bg-[#1E1F26]">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    proxy.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#FF4D4D]'
                  )} />
                  <div>
                    <p className="text-white font-mono">{proxy.ip}:{proxy.port}</p>
                    <p className="text-xs text-[#8A8A8A]">{proxy.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {proxy.ping && <span className="text-[#8A8A8A]">{proxy.ping}ms</span>}
                  <Badge className={proxy.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#FF4D4D]'}>
                    {proxy.status === 'active' ? 'Активен' : 'Ошибка'}
                  </Badge>
                  <Button variant="ghost" size="sm"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-[#FF4D4D]"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SimCardsView() {
  const [sims] = useState(simCards);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="w-7 h-7 text-[#6C63FF]" />
            SIM-карты
          </h1>
          <p className="text-[#8A8A8A]">{sims.filter(s => s.status === 'active').length} активных</p>
        </div>
        <Button className="bg-[#6C63FF]">
          <Plus className="w-4 h-4 mr-2" />
          Добавить SIM
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sims.map((sim) => (
          <Card key={sim.id} className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-mono">{sim.phone}</span>
                <Badge className={sim.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#8A8A8A]'}>
                  {sim.status === 'active' ? 'Активна' : 'Неактивна'}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8A8A8A]">Оператор</span>
                  <span className="text-white">{sim.operator}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8A8A8A]">Страна</span>
                  <span className="text-white">{sim.country}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8A8A8A]">Баланс</span>
                  <span className="text-[#00D26A]">{sim.balance}₽</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

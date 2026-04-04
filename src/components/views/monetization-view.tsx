'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, TrendingUp, Users, Globe, ShoppingCart, 
  Zap, Target, Gift, CreditCard, BarChart3, RefreshCw,
  Play, Pause, Settings, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const monetizationFeatures = [
  { id: 'marketplace', name: 'Marketplace', icon: ShoppingCart, status: 'active', revenue: 45600, description: 'Продажа товаров и услуг' },
  { id: 'p2p', name: 'P2P Обмен', icon: RefreshCw, status: 'active', revenue: 23400, description: 'P2P обмен валют и активов' },
  { id: 'subscription', name: 'Подписки', icon: CreditCard, status: 'active', revenue: 67800, description: 'Рекуррентные платежи' },
  { id: 'partners', name: 'Партнёрка', icon: Users, status: 'active', revenue: 34500, description: 'Партнёрская программа' },
  { id: 'token', name: 'Токены', icon: Gift, status: 'paused', revenue: 0, description: 'Токеномизация дохода' },
  { id: 'trends', name: 'Тренды', icon: TrendingUp, status: 'active', revenue: 12300, description: 'Монетизация трендов' },
  { id: 'templates', name: 'Шаблоны', icon: Target, status: 'active', revenue: 8900, description: 'Продажа шаблонов' },
  { id: 'auto-scaling', name: 'Авто-скейлинг', icon: Zap, status: 'active', revenue: 56700, description: 'Автоматическое масштабирование' },
  { id: 'gap-scanner', name: 'Gap Scanner', icon: BarChart3, status: 'active', revenue: 23400, description: 'Поиск дыр в рынке' },
  { id: 'neuro-coach', name: 'Нейро-коуч', icon: Globe, status: 'paused', revenue: 0, description: 'AI обучение' },
  { id: 'username-auction', name: 'Аукцион юзернеймов', icon: DollarSign, status: 'active', revenue: 15600, description: 'Торговля юзернеймами' },
  { id: 'white-label', name: 'White Label', icon: Settings, status: 'active', revenue: 89000, description: 'Готовые решения под брендом' },
];

const spamMethods = [
  { id: 'sm-1', name: 'Email спам', risk: 'high', effectiveness: 'medium' },
  { id: 'sm-2', name: 'SMS рассылка', risk: 'medium', effectiveness: 'high' },
  { id: 'sm-3', name: 'Мессенджеры', risk: 'high', effectiveness: 'very-high' },
  { id: 'sm-4', name: 'Соцсети', risk: 'medium', effectiveness: 'high' },
];

export function MonetizationView() {
  const [features, setFeatures] = useState(monetizationFeatures);
  const [activeTab, setActiveTab] = useState('features');

  const totalRevenue = features.reduce((acc, f) => acc + f.revenue, 0);
  const activeFeatures = features.filter(f => f.status === 'active').length;

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(f => 
      f.id === id ? { ...f, status: f.status === 'active' ? 'paused' : 'active' } : f
    ));
    toast.success('Статус изменён');
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-[#00D26A]" />
            Монетизация
          </h1>
          <p className="text-[#8A8A8A]">Инструменты для монетизации трафика</p>
        </div>
        <Button className="bg-[#00D26A] hover:bg-[#00D26A]/80">
          <DollarSign className="w-4 h-4 mr-2" />
          Вывести {totalRevenue.toLocaleString()}₽
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalRevenue.toLocaleString()}₽</p>
                <p className="text-xs text-[#8A8A8A]">Общий доход</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeFeatures}</p>
                <p className="text-xs text-[#8A8A8A]">Активных методов</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">+23%</p>
                <p className="text-xs text-[#8A8A8A]">Рост за месяц</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF4D4D]/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#FF4D4D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">1,234</p>
                <p className="text-xs text-[#8A8A8A]">Клиентов</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Табы */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="features" className="data-[state=active]:bg-[#6C63FF]">Методы</TabsTrigger>
          <TabsTrigger value="spam" className="data-[state=active]:bg-[#FF4D4D]">Спам методы</TabsTrigger>
          <TabsTrigger value="darknet" className="data-[state=active]:bg-[#8A8A8A]">Darknet</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.id} className={cn(
                  'bg-[#14151A] border-[#2A2B32] transition-all cursor-pointer',
                  feature.status === 'active' && 'border-l-4 border-l-[#00D26A]'
                )} onClick={() => toggleFeature(feature.id)}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1E1F26] flex items-center justify-center">
                          <Icon className="w-5 h-5 text-[#6C63FF]" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{feature.name}</h4>
                          <Badge className={feature.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#8A8A8A]'}>
                            {feature.status === 'active' ? 'Активен' : 'Пауза'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#8A8A8A] mb-3">{feature.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[#00D26A] font-bold">{feature.revenue.toLocaleString()}₽</span>
                      <span className="text-xs text-[#8A8A8A]">за месяц</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="spam" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#FF4D4D]" />
                Спам методы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {spamMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 bg-[#1E1F26] rounded-lg">
                    <span className="text-white">{method.name}</span>
                    <div className="flex gap-2">
                      <Badge className={method.risk === 'high' ? 'bg-[#FF4D4D]' : 'bg-[#FFB800]'}>
                        Риск: {method.risk}
                      </Badge>
                      <Badge className="bg-[#6C63FF]">
                        Эффект: {method.effectiveness}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="darknet" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="py-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-[#FF4D4D] mb-4" />
              <h3 className="text-white font-medium mb-2">Darknet функционал</h3>
              <p className="text-[#8A8A8A]">Доступ ограничен. Требуется дополнительная верификация.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AlertTriangle(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

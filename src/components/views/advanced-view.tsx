'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Cpu, Zap, Brain, Target, Globe, Shield, TestTube, 
  TrendingUp, Users, Search, BarChart3, RefreshCw,
  Play, Pause, Settings, AlertTriangle, CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const advancedFeatures = [
  {
    id: 'ab-testing',
    name: 'A/B Тестирование',
    icon: TestTube,
    color: '#6C63FF',
    description: 'Автоматическое A/B тестирование кампаний и офферов',
    status: 'active',
    enabled: true,
    metrics: { tests: 12, winner: 8, improvement: '23%' }
  },
  {
    id: 'antidetect',
    name: 'Антидетект браузер',
    icon: Shield,
    color: '#00D26A',
    description: 'Управление отпечатками браузера для безопасности',
    status: 'active',
    enabled: true,
    metrics: { profiles: 45, bans: 2, successRate: '96%' }
  },
  {
    id: 'bot-detect',
    name: 'Детект ботов',
    icon: Search,
    color: '#FFB800',
    description: 'Определение бот-активности в каналах',
    status: 'active',
    enabled: true,
    metrics: { scanned: 156, bots: 23, accuracy: '94%' }
  },
  {
    id: 'cross-post',
    name: 'Кросс-постинг',
    icon: Globe,
    color: '#0088cc',
    description: 'Автоматический постинг на несколько платформ',
    status: 'paused',
    enabled: false,
    metrics: { platforms: 5, posts: 234, reach: '12K' }
  },
  {
    id: 'dynamic-offer',
    name: 'Динамические офферы',
    icon: Target,
    color: '#FF4D4D',
    description: 'Автоматическая ротация офферов по эффективности',
    status: 'active',
    enabled: true,
    metrics: { offers: 34, rotations: 89, revenue: '+15%' }
  },
  {
    id: 'emotion-analysis',
    name: 'Анализ эмоций',
    icon: Brain,
    color: '#E4405F',
    description: 'AI анализ эмоционального отклика аудитории',
    status: 'active',
    enabled: true,
    metrics: { analyzed: 1234, positive: '67%', negative: '12%' }
  },
  {
    id: 'forgetfulness',
    name: 'Забывчивость',
    icon: RefreshCw,
    color: '#8A8A8A',
    description: 'Имитация естественного поведения пользователя',
    status: 'active',
    enabled: true,
    metrics: { actions: 567, naturalScore: '89%' }
  },
  {
    id: 'learning',
    name: 'Обучение',
    icon: TrendingUp,
    color: '#00D26A',
    description: 'Машинное обучение для оптимизации кампаний',
    status: 'active',
    enabled: true,
    metrics: { models: 3, accuracy: '87%', predictions: 456 }
  },
  {
    id: 'legend-generate',
    name: 'Генератор легенд',
    icon: Users,
    color: '#6C63FF',
    description: 'Создание backstory для аккаунтов',
    status: 'active',
    enabled: true,
    metrics: { legends: 23, quality: '92%' }
  },
  {
    id: 'load-balancer',
    name: 'Load Balancer',
    icon: BarChart3,
    color: '#FFB800',
    description: 'Балансировка нагрузки между аккаунтами',
    status: 'active',
    enabled: true,
    metrics: { accounts: 24, load: '67%', optimized: true }
  },
  {
    id: 'ltv-predict',
    name: 'LTV Предсказание',
    icon: TrendingUp,
    color: '#00D26A',
    description: 'Прогнозирование LTV пользователей',
    status: 'active',
    enabled: true,
    metrics: { predictions: 234, accuracy: '78%' }
  },
  {
    id: 'channel-predict',
    name: 'Предсказание каналов',
    icon: Target,
    color: '#6C63FF',
    description: 'AI подбор эффективных каналов',
    status: 'active',
    enabled: true,
    metrics: { channels: 89, success: '76%' }
  },
  {
    id: 'neural-search',
    name: 'Нейро-поиск',
    icon: Search,
    color: '#0088cc',
    description: 'Семантический поиск по контенту',
    status: 'active',
    enabled: true,
    metrics: { queries: 567, relevance: '91%' }
  },
  {
    id: 'shadow-accounts',
    name: 'Теневые аккаунты',
    icon: Users,
    color: '#FF4D4D',
    description: 'Управление скрытыми аккаунтами',
    status: 'paused',
    enabled: false,
    metrics: { accounts: 8, active: 5 }
  },
  {
    id: 'turbo-settings',
    name: 'Turbo настройки',
    icon: Zap,
    color: '#FFB800',
    description: 'Быстрые пресеты для кампаний',
    status: 'active',
    enabled: true,
    metrics: { presets: 12, used: 89 }
  },
  {
    id: 'viral-chain',
    name: 'Вирусные цепочки',
    icon: Globe,
    color: '#E4405F',
    description: 'Создание вирусного распространения',
    status: 'active',
    enabled: true,
    metrics: { chains: 5, reach: '45K', viral: '12%' }
  },
  {
    id: 'voice-command',
    name: 'Голосовые команды',
    icon: Brain,
    color: '#00D26A',
    description: 'Управление через голосовые команды',
    status: 'paused',
    enabled: false,
    metrics: { commands: 0 }
  }
];

export function AdvancedView() {
  const [features, setFeatures] = useState(advancedFeatures);
  const [activeTab, setActiveTab] = useState('all');

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(f => 
      f.id === id ? { ...f, enabled: !f.enabled, status: f.enabled ? 'paused' : 'active' } : f
    ));
    toast.success('Настройки обновлены');
  };

  const filteredFeatures = activeTab === 'all' 
    ? features 
    : features.filter(f => f.status === activeTab);

  const activeCount = features.filter(f => f.status === 'active').length;
  const pausedCount = features.filter(f => f.status === 'paused').length;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-7 h-7 text-[#6C63FF]" />
            Advanced Tools
          </h1>
          <p className="text-[#8A8A8A]">17 продвинутых функций для автоматизации</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.success('Все функции запущены')} className="border-[#00D26A] text-[#00D26A]">
            <Play className="w-4 h-4 mr-2" />
            Запустить все
          </Button>
          <Button variant="outline" onClick={() => toast.info('Все функции остановлены')} className="border-[#FFB800] text-[#FFB800]">
            <Pause className="w-4 h-4 mr-2" />
            Пауза всех
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8A8A8A] text-sm">Активных</p>
                <p className="text-3xl font-bold text-[#00D26A]">{activeCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#00D26A]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8A8A8A] text-sm">На паузе</p>
                <p className="text-3xl font-bold text-[#FFB800]">{pausedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Pause className="w-6 h-6 text-[#FFB800]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8A8A8A] text-sm">Всего функций</p>
                <p className="text-3xl font-bold text-white">{features.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-[#6C63FF]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#6C63FF]">Все</TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-[#00D26A]">Активные</TabsTrigger>
          <TabsTrigger value="paused" className="data-[state=active]:bg-[#FFB800]">На паузе</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Функции */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.id} className={cn(
              'bg-[#14151A] border-[#2A2B32] transition-all',
              feature.enabled && 'border-l-4 border-l-[#6C63FF]'
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${feature.color}20` }}>
                      <Icon className="w-5 h-5" style={{ color: feature.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-white text-base">{feature.name}</CardTitle>
                      <Badge className={cn(
                        'text-xs',
                        feature.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#FFB800]'
                      )}>
                        {feature.status === 'active' ? 'Активно' : 'Пауза'}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={feature.enabled}
                    onCheckedChange={() => toggleFeature(feature.id)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[#8A8A8A] mb-3">{feature.description}</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(feature.metrics).map(([key, value]) => (
                    <div key={key} className="text-center p-2 bg-[#1E1F26] rounded">
                      <p className="text-sm font-bold text-white">{value}</p>
                      <p className="text-xs text-[#8A8A8A]">{key}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

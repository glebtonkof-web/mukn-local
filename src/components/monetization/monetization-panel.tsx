'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  DollarSign,
  ShoppingCart,
  Users,
  FileText,
  Star,
  Zap,
  Crown,
  Target,
  Wallet,
  RefreshCw,
  Shield,
  Sparkles,
  Briefcase,
  TrendingUp,
  Search,
  Copy,
  Scale,
  Rocket,
  Network,
  Coins,
  GraduationCap,
  AtSign,
  MessageSquare,
  BarChart3,
  Eye,
  AlertTriangle,
  Lock,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== ТИПЫ ====================

interface GapItem {
  id: string;
  network: string;
  gapType: string;
  description: string;
  estimatedROI: number;
  riskLevel: string;
  testedBy: number;
  successRate: number;
  status: string;
}

interface TrendItem {
  id: string;
  nicheName: string;
  nicheCategory: string;
  growthRate: number;
  momentum: number;
  predictedROI: number;
  competitionLevel: string;
  status: string;
}

interface SpamMethod {
  id: string;
  type: string;
  config: any;
  stats: any;
  status: string;
}

// ==================== LEVEL 2: АВТО-ГЕНЕРАЦИЯ СХЕМ ====================

function AutoSchemesBlock() {
  const [activeSubTab, setActiveSubTab] = useState('gaps');
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gapsRes, trendsRes] = await Promise.all([
        fetch('/api/monetization/gap-scanner'),
        fetch('/api/monetization/trends'),
      ]);
      const gapsData = await gapsRes.json();
      const trendsData = await trendsRes.json();
      if (gapsData.success) setGaps(gapsData.gaps);
      if (trendsData.success) setTrends(trendsData.trends);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await fetch('/api/monetization/gap-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networks: ['all'], minROI: 100 }),
      });
      fetchData();
      toast.success('Сканирование завершено');
    } catch (error) {
      toast.error('Ошибка сканирования');
    } finally {
      setScanning(false);
    }
  };

  const riskColors: Record<string, string> = {
    low: '#00D26A',
    medium: '#FFB800',
    high: '#FF4D4D',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Авто-генерация схем</h2>
          <p className="text-[#8A8A8A] text-sm">Нейросетевой поиск возможностей</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="border-[#2A2B32]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          <Button
            size="sm"
            onClick={handleScan}
            disabled={scanning}
            className="bg-[#6C63FF]"
          >
            {scanning ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Сканировать
          </Button>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="gaps">
            <Target className="w-4 h-4 mr-2" />
            Дыры в партнёрках
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="w-4 h-4 mr-2" />
            Трендовые ниши
          </TabsTrigger>
          <TabsTrigger value="hypotheses">
            <Sparkles className="w-4 h-4 mr-2" />
            Гипотезы AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gaps" className="mt-4">
          {loading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-[#1E1F26] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              {gaps.map((gap) => (
                <Card key={gap.id} className="bg-[#14151A] border-[#2A2B32]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            style={{
                              backgroundColor: `${riskColors[gap.riskLevel]}20`,
                              color: riskColors[gap.riskLevel],
                            }}
                          >
                            {gap.riskLevel.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
                            {gap.network}
                          </Badge>
                          <Badge variant="outline" className="border-[#8A8A8A] text-[#8A8A8A]">
                            {gap.gapType.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#8A8A8A] mb-2">{gap.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-[#00D26A]">
                            <span className="font-bold">{gap.estimatedROI}%</span> ROI
                          </span>
                          <span className="text-[#8A8A8A]">
                            {gap.testedBy} тестов
                          </span>
                          <span className="text-[#8A8A8A]">
                            {gap.successRate}% успех
                          </span>
                        </div>
                      </div>
                      <Button size="sm" className="bg-[#00D26A]">
                        Использовать
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-[#1E1F26] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trends.map((trend) => (
                <Card key={trend.id} className="bg-[#14151A] border-[#2A2B32]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-[#00D26A]/20 text-[#00D26A]">
                        +{trend.growthRate}% рост
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          trend.competitionLevel === 'low'
                            ? 'border-[#00D26A] text-[#00D26A]'
                            : trend.competitionLevel === 'medium'
                            ? 'border-[#FFB800] text-[#FFB800]'
                            : 'border-[#FF4D4D] text-[#FF4D4D]'
                        }
                      >
                        {trend.competitionLevel} конкуренция
                      </Badge>
                    </div>
                    <h3 className="font-medium text-white mb-1">{trend.nicheName}</h3>
                    <p className="text-sm text-[#8A8A8A] mb-3">{trend.nicheCategory}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[#FFB800] font-bold">
                        ~{trend.predictedROI}% ROI
                      </span>
                      <Button size="sm" variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
                        Анализ
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hypotheses" className="mt-4">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#6C63FF]" />
                Генератор гипотез DeepSeek R1
              </CardTitle>
              <CardDescription>
                AI генерирует гипотезы по оптимизации ваших кампаний
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#1E1F26] rounded-lg border border-[#2A2B32]">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-4 h-4 text-[#FF4D4D]" />
                    <span className="text-white font-medium">Гипотеза #1</span>
                  </div>
                  <p className="text-sm text-[#8A8A8A] mb-2">
                    Замена CTA на "личный опыт" увеличит CTR на 15-20%
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#00D26A]/20 text-[#00D26A]">89% уверенность</Badge>
                    <Button size="sm" className="bg-[#6C63FF]">Протестировать</Button>
                  </div>
                </div>
                <div className="p-4 bg-[#1E1F26] rounded-lg border border-[#2A2B32]">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-4 h-4 text-[#FFB800]" />
                    <span className="text-white font-medium">Гипотеза #2</span>
                  </div>
                  <p className="text-sm text-[#8A8A8A] mb-2">
                    Постинг в 21:00 МСК даёт +25% engagement
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#FFB800]/20 text-[#FFB800]">72% уверенность</Badge>
                    <Button size="sm" className="bg-[#6C63FF]">Протестировать</Button>
                  </div>
                </div>
              </div>
              <Button className="w-full bg-[#6C63FF]">
                <Sparkles className="w-4 h-4 mr-2" />
                Сгенерировать новые гипотезы
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== LEVEL 3: МАСШТАБИРОВАНИЕ ====================

function ScalingBlock() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/monetization/auto-scaling');
      const data = await res.json();
      if (data.success) setSettings(data.settings);
    } catch (error) {
      console.error('Error fetching scaling:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Инструменты масштабирования</h2>
          <p className="text-[#8A8A8A] text-sm">Автоматическое управление бюджетом</p>
        </div>
      </div>

      {/* Авто-масштабирование */}
      <Card className="bg-gradient-to-br from-[#6C63FF]/20 to-[#00D26A]/20 border-[#6C63FF]/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#6C63FF]" />
            Авто-масштабирование
          </CardTitle>
          <CardDescription>
            Автоматически увеличивает бюджет при ROI &gt; порога
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-[#1E1F26] rounded-lg">
              <p className="text-xs text-[#8A8A8A]">ROI порог</p>
              <p className="text-xl font-bold text-white">150%</p>
            </div>
            <div className="p-3 bg-[#1E1F26] rounded-lg">
              <p className="text-xs text-[#8A8A8A]">Множитель</p>
              <p className="text-xl font-bold text-[#6C63FF]">1.5x</p>
            </div>
            <div className="p-3 bg-[#1E1F26] rounded-lg">
              <p className="text-xs text-[#8A8A8A]">Макс. бюджет</p>
              <p className="text-xl font-bold text-white">$5,000</p>
            </div>
            <div className="p-3 bg-[#1E1F26] rounded-lg">
              <p className="text-xs text-[#8A8A8A]">Масштабирований</p>
              <p className="text-xl font-bold text-[#00D26A]">3</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch defaultChecked />
              <span className="text-white">Авто-масштабирование активно</span>
            </div>
            <Button
              size="sm"
              className="bg-[#6C63FF]"
              onClick={() => setConfigOpen(true)}
            >
              Настроить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* White Label */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#FFB800]" />
            White Label - $5,000 + 10% роялти
          </CardTitle>
          <CardDescription>
            Запустите свой аналог софта под вашим брендом
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-[#00D26A]" />
                <span className="text-[#8A8A8A]">Кастомный домен и логотип</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-[#00D26A]" />
                <span className="text-[#8A8A8A]">Полный клон функционала</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-[#00D26A]" />
                <span className="text-[#8A8A8A]">Авто-обновления</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-[#00D26A]" />
                <span className="text-[#8A8A8A]">Техподдержка 24/7</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-[#00D26A]" />
                <span className="text-[#8A8A8A]">10% роялти с клиентов</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-[#00D26A]" />
                <span className="text-[#8A8A8A]">Средний ROI клиентов: 340%</span>
              </div>
            </div>
          </div>
          <Button className="w-full bg-[#FFB800] text-black">
            <Crown className="w-4 h-4 mr-2" />
            Получить White Label
          </Button>
        </CardContent>
      </Card>

      {/* Аукционы */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-[#00D26A]" />
              Аукцион тёплых каналов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#8A8A8A] mb-3">
              Покупайте готовые прогретые каналы на аукционе
            </p>
            <Button className="w-full bg-[#00D26A]">
              Смотреть аукционы
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-[#FF6B9D]" />
              Трафик в рассрочку
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#8A8A8A] mb-3">
              Получите аккаунты сейчас, платите с профита (30% комиссии)
            </p>
            <Button className="w-full bg-[#FF6B9D]">
              Получить рассрочку
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>Настройки авто-масштабирования</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ROI порог для масштабирования</Label>
              <Input type="number" defaultValue={150} className="bg-[#1E1F26] border-[#2A2B32]" />
            </div>
            <div className="space-y-2">
              <Label>Множитель увеличения</Label>
              <Input type="number" defaultValue={1.5} step={0.1} className="bg-[#1E1F26] border-[#2A2B32]" />
            </div>
            <div className="space-y-2">
              <Label>Максимальный бюджет ($)</Label>
              <Input type="number" defaultValue={5000} className="bg-[#1E1F26] border-[#2A2B32]" />
            </div>
            <div className="space-y-2">
              <Label>Интервал проверки (часы)</Label>
              <Input type="number" defaultValue={3} className="bg-[#1E1F26] border-[#2A2B32]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Отмена</Button>
            <Button className="bg-[#6C63FF]" onClick={() => setConfigOpen(false)}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== LEVEL 4: ЭКОСИСТЕМА ====================

function EcosystemBlock() {
  const [activeSubTab, setActiveSubTab] = useState('p2p');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Экосистема самозаработка</h2>
          <p className="text-[#8A8A8A] text-sm">Децентрализованные инструменты дохода</p>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32] flex-wrap h-auto">
          <TabsTrigger value="p2p">
            <Network className="w-4 h-4 mr-2" />
            P2P Аренда
          </TabsTrigger>
          <TabsTrigger value="token">
            <Coins className="w-4 h-4 mr-2" />
            MUKN Token
          </TabsTrigger>
          <TabsTrigger value="coach">
            <GraduationCap className="w-4 h-4 mr-2" />
            Нейро-Коуч
          </TabsTrigger>
          <TabsTrigger value="usernames">
            <AtSign className="w-4 h-4 mr-2" />
            Аукцион @юзернеймов
          </TabsTrigger>
        </TabsList>

        <TabsContent value="p2p" className="mt-4">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-[#00D26A]" />
                P2P Аренда аккаунтов
              </CardTitle>
              <CardDescription>
                Сдавайте свои аккаунты в аренду и зарабатывайте
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-[#1E1F26] rounded-lg text-center">
                  <p className="text-2xl font-bold text-white">$5-12</p>
                  <p className="text-sm text-[#8A8A8A]">Ставка за день</p>
                </div>
                <div className="p-4 bg-[#1E1F26] rounded-lg text-center">
                  <p className="text-2xl font-bold text-[#00D26A]">15%</p>
                  <p className="text-sm text-[#8A8A8A]">Комиссия платформы</p>
                </div>
                <div className="p-4 bg-[#1E1F26] rounded-lg text-center">
                  <p className="text-2xl font-bold text-[#FFB800]">85%</p>
                  <p className="text-sm text-[#8A8A8A]">Ваш доход</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-[#00D26A]">Сдать аккаунт</Button>
                <Button className="flex-1 bg-[#6C63FF]">Арендовать</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="token" className="mt-4">
          <Card className="bg-gradient-to-br from-[#FFB800]/20 to-[#6C63FF]/20 border-[#FFB800]/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#FFB800]" />
                MUKN Token
              </CardTitle>
              <CardDescription>
                Токен платформы с пассивным доходом
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-xs text-[#8A8A8A]">Цена</p>
                  <p className="text-xl font-bold text-white">$0.10</p>
                  <p className="text-xs text-[#00D26A]">+5.2% 24h</p>
                </div>
                <div className="p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-xs text-[#8A8A8A]">Market Cap</p>
                  <p className="text-xl font-bold text-white">$25K</p>
                </div>
                <div className="p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-xs text-[#8A8A8A]">Staking APY</p>
                  <p className="text-xl font-bold text-[#00D26A]">15%</p>
                </div>
                <div className="p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-xs text-[#8A8A8A]">Держатели</p>
                  <p className="text-xl font-bold text-white">1,250</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-[#FFB800] text-black">Купить MUKN</Button>
                <Button className="flex-1 bg-[#6C63FF]">Staking</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coach" className="mt-4">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#6C63FF]" />
                Нейро-Коуч
              </CardTitle>
              <CardDescription>
                Персональный ИИ-наставник по арбитражу
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-[#1E1F26] rounded-lg">
                  <p className="text-lg font-bold text-white">$49/мес</p>
                  <ul className="text-sm text-[#8A8A8A] mt-2 space-y-1">
                    <li>• Безлимитные консультации</li>
                    <li>• Анализ кампаний</li>
                    <li>• Подсказки по оптимизации</li>
                  </ul>
                </div>
                <div className="p-4 bg-gradient-to-br from-[#FFB800]/20 to-transparent rounded-lg border border-[#FFB800]/50">
                  <p className="text-lg font-bold text-white">$399/год</p>
                  <Badge className="bg-[#FFB800] text-black mb-2">Экономия $189</Badge>
                  <ul className="text-sm text-[#8A8A8A] space-y-1">
                    <li>• Все функции monthly</li>
                    <li>• Приоритетная поддержка</li>
                    <li>• Ранний доступ к фичам</li>
                  </ul>
                </div>
              </div>
              <Button className="w-full bg-[#6C63FF]">
                <GraduationCap className="w-4 h-4 mr-2" />
                Начать обучение
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usernames" className="mt-4">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AtSign className="w-5 h-5 text-[#00D26A]" />
                Аукцион юзернеймов
              </CardTitle>
              <CardDescription>
                Покупайте привлекательные @юзернеймы для аккаунтов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { username: 'cryptosignal', price: 1250, endsIn: '3 дня' },
                  { username: 'gambling_pro', price: 850, endsIn: '5 дней' },
                  { username: 'trading_tips', price: 450, endsIn: '1 день' },
                ].map((auction, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#1E1F26] rounded-lg">
                    <div>
                      <p className="font-medium text-white">@{auction.username}</p>
                      <p className="text-sm text-[#8A8A8A]">Окончание: {auction.endsIn}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#FFB800]">${auction.price}</p>
                      <Button size="sm" className="bg-[#00D26A]">Ставка</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== LEVEL 5: СПАМ МЕТОДЫ ====================

function SpamMethodsBlock() {
  const [methods, setMethods] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const res = await fetch('/api/monetization/spam-methods');
      const data = await res.json();
      if (data.success) {
        setMethods(data.methods);
      }
    } catch (error) {
      console.error('Error fetching spam methods:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-[#1E1F26] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const methodCards = [
    {
      title: 'Спам через пересылки',
      icon: <Copy className="w-5 h-5" />,
      color: '#00D26A',
      data: methods?.forward?.[0],
      description: 'Канал-прокладка → пересылка в чаты',
    },
    {
      title: 'Спам через опросы',
      icon: <BarChart3 className="w-5 h-5" />,
      color: '#6C63FF',
      data: methods?.polls?.[0],
      description: 'Опросы со скрытой ссылкой',
    },
    {
      title: 'Фейковые срачи',
      icon: <MessageSquare className="w-5 h-5" />,
      color: '#FF4D4D',
      data: methods?.arguments?.[0],
      description: '2 аккаунта спорят, 3-й с оффером',
    },
    {
      title: 'Спам через реакции',
      icon: <Zap className="w-5 h-5" />,
      color: '#FFB800',
      data: methods?.reactions?.[0],
      description: 'Цепочки реакций для внимания',
    },
    {
      title: 'Telegram Stories',
      icon: <Eye className="w-5 h-5" />,
      color: '#FF6B9D',
      data: methods?.stories?.[0],
      description: 'Офферы в сторис',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Неиспользуемые методы спама</h2>
          <p className="text-[#8A8A8A] text-sm">Нетрадиционные методы продвижения</p>
        </div>
        <Badge className="bg-[#FF4D4D]/20 text-[#FF4D4D]">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Риск бана выше
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {methodCards.map((method, i) => (
          <Card key={i} className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div style={{ color: method.color }}>{method.icon}</div>
                <h3 className="font-medium text-white">{method.title}</h3>
              </div>
              <p className="text-sm text-[#8A8A8A] mb-3">{method.description}</p>
              {method.data && (
                <div className="flex items-center gap-4 text-sm mb-3">
                  <span className="text-[#00D26A]">{method.data.sentCount || method.data.createdCount || method.data.appliedCount || method.data.storiesCount || method.data.argumentsRun} запусков</span>
                  <span className="text-[#8A8A8A]">{method.data.successRate || method.data.avgEngagement || method.data.clickRate || method.data.avgAttention}% эффективность</span>
                </div>
              )}
              <Button size="sm" className="w-full" style={{ backgroundColor: method.color }}>
                Настроить
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== BONUS: АВТО-ПОИСК СХЕМ ====================

function AutoDiscoveryBlock() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Авто-поиск схем</h2>
          <p className="text-[#8A8A8A] text-sm">Автоматическое обнаружение новых возможностей</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-[#6C63FF]/20 to-transparent border-[#6C63FF]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-[#6C63FF]" />
              <h3 className="font-medium text-white">Сканер новых ниш</h3>
            </div>
            <p className="text-sm text-[#8A8A8A] mb-3">
              DeepSeek анализирует рынок и находит новые прибыльные ниши
            </p>
            <Button className="w-full bg-[#6C63FF]">
              Запустить сканирование
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-[#FF4D4D]" />
              <h3 className="font-medium text-white">Анализ банов конкурентов</h3>
            </div>
            <p className="text-sm text-[#8A8A8A] mb-3">
              Учимся на ошибках конкурентов - анализируем почему их банили
            </p>
            <Button className="w-full bg-[#FF4D4D]">
              Анализировать
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-[#00D26A]" />
              <h3 className="font-medium text-white">Краудсорсинг схем</h3>
            </div>
            <p className="text-sm text-[#8A8A8A] mb-3">
              Пользователи делятся успешными схемами за вознаграждение
            </p>
            <Button className="w-full bg-[#00D26A]">
              Смотреть схемы
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#FFB800]/20 to-transparent border-[#FFB800]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-[#FFB800]" />
              <h3 className="font-medium text-white">Даркнет-дайджест</h3>
            </div>
            <p className="text-sm text-[#8A8A8A] mb-3">
              Парсинг форумов для поиска свежих схем
            </p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#FFB800] font-bold">$49/мес</span>
              <Badge className="bg-[#FFB800]/20 text-[#FFB800]">125 подписчиков</Badge>
            </div>
            <Button className="w-full bg-[#FFB800] text-black">
              <ExternalLink className="w-4 h-4 mr-2" />
              Подписаться
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function MonetizationPanel() {
  const [activeTab, setActiveTab] = useState('level2');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Монетизация</h1>
          <p className="text-[#8A8A8A]">30 методов заработка на платформе</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#00D26A]/20 text-[#00D26A]">
            <Wallet className="w-3 h-3 mr-1" />
            Баланс: $0.00
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32] flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="level2" className="data-[state=active]:bg-[#6C63FF]">
            <TrendingUp className="w-4 h-4 mr-2" />
            Level 2: Авто-схемы
          </TabsTrigger>
          <TabsTrigger value="level3" className="data-[state=active]:bg-[#6C63FF]">
            <Scale className="w-4 h-4 mr-2" />
            Level 3: Масштаб
          </TabsTrigger>
          <TabsTrigger value="level4" className="data-[state=active]:bg-[#6C63FF]">
            <Network className="w-4 h-4 mr-2" />
            Level 4: Экосистема
          </TabsTrigger>
          <TabsTrigger value="level5" className="data-[state=active]:bg-[#FF4D4D]">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Level 5: Спам-методы
          </TabsTrigger>
          <TabsTrigger value="bonus" className="data-[state=active]:bg-[#FFB800]">
            <Search className="w-4 h-4 mr-2" />
            Bonus: Авто-поиск
          </TabsTrigger>
        </TabsList>

        <TabsContent value="level2" className="mt-6">
          <AutoSchemesBlock />
        </TabsContent>

        <TabsContent value="level3" className="mt-6">
          <ScalingBlock />
        </TabsContent>

        <TabsContent value="level4" className="mt-6">
          <EcosystemBlock />
        </TabsContent>

        <TabsContent value="level5" className="mt-6">
          <SpamMethodsBlock />
        </TabsContent>

        <TabsContent value="bonus" className="mt-6">
          <AutoDiscoveryBlock />
        </TabsContent>
      </Tabs>
    </div>
  );
}

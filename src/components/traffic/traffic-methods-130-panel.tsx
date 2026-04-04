'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Send,
  Instagram,
  Music,
  ArrowRightLeft,
  Sparkles,
  Settings,
  Play,
  Square,
  TrendingUp,
  MousePointer,
  Users,
  Search,
  Clock,
  Link2,
  Copy,
  Check,
  AlertTriangle,
  Zap,
  Cpu,
  Globe,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ==================== TYPES ====================

interface TrafficMethod {
  id: string;
  methodNumber: number;
  name: string;
  description: string;
  platform: string;
  category: 'basic' | 'advanced' | 'top';
  isActive: boolean;
  riskLevel: number;
  ctr: number;
  conversionRate: number;
  totalActions: number;
  totalClicks: number;
  totalConversions: number;
  config?: Record<string, unknown>;
}

interface PlatformStats {
  totalMethods: number;
  activeMethods: number;
  totalActions: number;
  totalClicks: number;
  totalConversions: number;
}

interface ConfigForm {
  targetChannels: string;
  niche: string;
  geo: string;
  style: string;
  offerLink: string;
  schedule: string;
  accountRotation: boolean;
}

// ==================== CONSTANTS ====================

const PLATFORMS = [
  { id: 'telegram', name: 'Telegram', count: 25, icon: Send, color: '#0088cc' },
  { id: 'instagram', name: 'Instagram', count: 17, icon: Instagram, color: '#E4405F' },
  { id: 'tiktok', name: 'TikTok', count: 14, icon: Music, color: '#000000' },
  { id: 'cross-platform', name: 'Cross-platform', count: 17, icon: ArrowRightLeft, color: '#6C63FF' },
  { id: 'ai-enhanced', name: 'AI-enhanced', count: 7, icon: Cpu, color: '#00D26A' },
  { id: 'extended', name: 'Extended', count: 50, icon: Globe, color: '#FFB800' },
] as const;

const NICHES = [
  'gambling', 'crypto', 'nutra', 'bait', 'lifestyle', 'finance', 'dating', 'gaming'
] as const;

const GEOS = [
  'RU', 'US', 'DE', 'UK', 'FR', 'ES', 'IT', 'BR', 'JP', 'KR', 'CN', 'IN', 'AU', 'CA', 'MX'
] as const;

const STYLES = [
  'playful', 'mysterious', 'friendly', 'provocative', 'expert', 'casual'
] as const;

const CATEGORIES = [
  { id: 'all', name: 'Все' },
  { id: 'basic', name: 'Базовые' },
  { id: 'advanced', name: 'Продвинутые' },
  { id: 'top', name: 'ТОП' },
] as const;

const SCHEDULES = [
  { id: 'every_30min', name: 'Каждые 30 минут' },
  { id: 'every_hour', name: 'Каждый час' },
  { id: 'every_3h', name: 'Каждые 3 часа' },
  { id: 'every_6h', name: 'Каждые 6 часов' },
  { id: 'daily', name: 'Ежедневно' },
] as const;

const API_ENDPOINTS: Record<string, string> = {
  'telegram': '/api/traffic/telegram-v2',
  'instagram': '/api/traffic/instagram-v2',
  'tiktok': '/api/traffic/tiktok-v2',
  'cross-platform': '/api/traffic/cross-platform-v2',
  'ai-enhanced': '/api/traffic/ai-enhanced',
  'extended': '/api/traffic/methods',
};

// ==================== COMPONENT ====================

export function TrafficMethods130Panel() {
  // State
  const [methods, setMethods] = useState<TrafficMethod[]>([]);
  const [activePlatform, setActivePlatform] = useState('telegram');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [configuringMethod, setConfiguringMethod] = useState<TrafficMethod | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);
  const [utmLink, setUtmLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState<Record<string, PlatformStats>>({});
  const [topMethods, setTopMethods] = useState<TrafficMethod[]>([]);

  // Config form state
  const [configForm, setConfigForm] = useState<ConfigForm>({
    targetChannels: '',
    niche: 'lifestyle',
    geo: 'RU',
    style: 'playful',
    offerLink: '',
    schedule: 'every_hour',
    accountRotation: true,
  });

  // Load methods on mount and platform change
  useEffect(() => {
    loadMethods();
  }, [activePlatform]);

  // Load all platform stats on mount
  useEffect(() => {
    loadAllStats();
  }, []);

  // Load methods from API
  const loadMethods = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoint = API_ENDPOINTS[activePlatform];
      if (!endpoint) {
        // Generate mock methods for extended/ai-enhanced
        generateMockMethods();
        return;
      }

      const response = await fetch(`${endpoint}?all=true`);
      const data = await response.json();

      if (data.methods) {
        const formattedMethods: TrafficMethod[] = data.methods.map((m: Record<string, unknown>) => ({
          id: String(m.id),
          methodNumber: m.id as number,
          name: m.title || m.name,
          description: m.description || m.title || '',
          platform: activePlatform,
          category: (m.category as 'basic' | 'advanced' | 'top') || 'basic',
          isActive: true,
          riskLevel: m.riskLevel === 'high' ? 80 : m.riskLevel === 'medium' ? 50 : 20,
          ctr: Math.random() * 5 + 1,
          conversionRate: Math.random() * 3 + 0.5,
          totalActions: Math.floor(Math.random() * 1000),
          totalClicks: Math.floor(Math.random() * 500),
          totalConversions: Math.floor(Math.random() * 50),
        }));
        setMethods(formattedMethods);

        // Update platform stats
        setPlatformStats(prev => ({
          ...prev,
          [activePlatform]: {
            totalMethods: formattedMethods.length,
            activeMethods: formattedMethods.filter(m => m.isActive).length,
            totalActions: formattedMethods.reduce((sum, m) => sum + m.totalActions, 0),
            totalClicks: formattedMethods.reduce((sum, m) => sum + m.totalClicks, 0),
            totalConversions: formattedMethods.reduce((sum, m) => sum + m.totalConversions, 0),
          }
        }));
      }
    } catch (error) {
      console.error('Failed to load methods:', error);
      generateMockMethods();
    } finally {
      setIsLoading(false);
    }
  }, [activePlatform]);

  // Generate mock methods for platforms without API
  const generateMockMethods = useCallback(() => {
    const platformInfo = PLATFORMS.find(p => p.id === activePlatform);
    if (!platformInfo) return;

    const mockMethods: TrafficMethod[] = Array.from({ length: platformInfo.count }, (_, i) => ({
      id: `${activePlatform}-${i + 1}`,
      methodNumber: i + 1,
      name: `Метод ${activePlatform} #${i + 1}`,
      description: `Описание метода ${i + 1} для платформы ${platformInfo.name}`,
      platform: activePlatform,
      category: (['basic', 'advanced', 'top'] as const)[i % 3],
      isActive: Math.random() > 0.3,
      riskLevel: Math.floor(Math.random() * 100),
      ctr: Math.random() * 5 + 1,
      conversionRate: Math.random() * 3 + 0.5,
      totalActions: Math.floor(Math.random() * 1000),
      totalClicks: Math.floor(Math.random() * 500),
      totalConversions: Math.floor(Math.random() * 50),
    }));

    setMethods(mockMethods);

    setPlatformStats(prev => ({
      ...prev,
      [activePlatform]: {
        totalMethods: mockMethods.length,
        activeMethods: mockMethods.filter(m => m.isActive).length,
        totalActions: mockMethods.reduce((sum, m) => sum + m.totalActions, 0),
        totalClicks: mockMethods.reduce((sum, m) => sum + m.totalClicks, 0),
        totalConversions: mockMethods.reduce((sum, m) => sum + m.totalConversions, 0),
      }
    }));
  }, [activePlatform]);

  // Load all platform stats
  const loadAllStats = async () => {
    for (const platform of PLATFORMS) {
      try {
        const endpoint = API_ENDPOINTS[platform.id];
        if (!endpoint) continue;

        const response = await fetch(`${endpoint}?stats=true`);
        if (response.ok) {
          const data = await response.json();
          setPlatformStats(prev => ({
            ...prev,
            [platform.id]: {
              totalMethods: data.totalMethods || platform.count,
              activeMethods: data.categories ? Object.values(data.categories).flat().length : platform.count,
              totalActions: data.stats?.totalActions || 0,
              totalClicks: data.stats?.totalClicks || 0,
              totalConversions: data.stats?.totalConversions || 0,
            }
          }));
        }
      } catch {
        // Ignore errors for individual platforms
      }
    }
  };

  // Filter methods
  const filteredMethods = methods.filter(m => {
    const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate total stats
  const totalStats = Object.values(platformStats).reduce(
    (acc, stats) => ({
      activeMethods: acc.activeMethods + stats.activeMethods,
      totalActions: acc.totalActions + stats.totalActions,
      totalClicks: acc.totalClicks + stats.totalClicks,
      totalConversions: acc.totalConversions + stats.totalConversions,
    }),
    { activeMethods: 0, totalActions: 0, totalClicks: 0, totalConversions: 0 }
  );

  // Handle toggle method
  const handleToggleMethod = async (method: TrafficMethod) => {
    const endpoint = API_ENDPOINTS[method.platform];
    if (!endpoint) {
      // Update locally
      setMethods(methods.map(m =>
        m.id === method.id ? { ...m, isActive: !m.isActive } : m
      ));
      toast.success(method.isActive ? 'Метод отключён' : 'Метод активирован');
      return;
    }

    try {
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId: method.methodNumber,
          isActive: !method.isActive,
        }),
      });

      setMethods(methods.map(m =>
        m.id === method.id ? { ...m, isActive: !m.isActive } : m
      ));

      toast.success(method.isActive ? 'Метод отключён' : 'Метод активирован');
    } catch {
      toast.error('Ошибка обновления статуса');
    }
  };

  // Open config dialog
  const openConfigDialog = (method: TrafficMethod) => {
    setConfiguringMethod(method);
    setGeneratedContent([]);
    setUtmLink('');
    setConfigForm({
      targetChannels: '',
      niche: 'lifestyle',
      geo: 'RU',
      style: 'playful',
      offerLink: '',
      schedule: 'every_hour',
      accountRotation: true,
    });
    setIsConfigOpen(true);
  };

  // Handle generate content
  const handleGenerateContent = async () => {
    if (!configuringMethod) return;

    setIsGenerating(true);
    try {
      const endpoint = API_ENDPOINTS[configuringMethod.platform];
      if (!endpoint) {
        // Generate mock content
        const mockContent = [
          `Вариант 1: Комментарий для ${configForm.niche} в стиле ${configForm.style}`,
          `Вариант 2: Привлекающий внимание комментарий с CTA`,
          `Вариант 3: Вовлекающий вопрос для аудитории`,
        ];
        setGeneratedContent(mockContent);
        toast.success('Контент сгенерирован (демо)');
        return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId: configuringMethod.methodNumber,
          niche: configForm.niche,
          geo: configForm.geo,
          style: configForm.style,
          targetChannels: configForm.targetChannels.split(',').map(s => s.trim()).filter(Boolean),
          offerLink: configForm.offerLink,
        }),
      });

      const data = await response.json();

      if (data.result?.content) {
        // Parse content
        const content = data.result.content;
        if (typeof content === 'string') {
          setGeneratedContent([content]);
        } else if (content.variants) {
          setGeneratedContent(content.variants.map((v: Record<string, unknown>) => v.text || JSON.stringify(v)));
        } else {
          setGeneratedContent([JSON.stringify(content, null, 2)]);
        }
        toast.success('Контент сгенерирован');
      } else if (data.generatedContent) {
        const content = data.generatedContent;
        if (typeof content === 'string') {
          setGeneratedContent([content]);
        } else {
          setGeneratedContent([JSON.stringify(content, null, 2)]);
        }
        toast.success('Контент сгенерирован');
      }
    } catch (error) {
      console.error('Content generation error:', error);
      toast.error('Ошибка генерации контента');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle generate UTM
  const handleGenerateUTM = async () => {
    if (!configuringMethod) return;

    const baseUrl = configForm.offerLink || 'https://t.me/yourchannel';
    const utmParams = new URLSearchParams({
      utm_source: configuringMethod.platform,
      utm_medium: configuringMethod.category,
      utm_campaign: `method_${configuringMethod.methodNumber}`,
      utm_content: configForm.niche,
      utm_term: configForm.geo,
    });

    const fullUrl = `${baseUrl}?${utmParams.toString()}`;
    setUtmLink(fullUrl);
    toast.success('UTM ссылка сгенерирована');
  };

  // Handle save config
  const handleSaveConfig = async () => {
    if (!configuringMethod) return;

    const endpoint = API_ENDPOINTS[configuringMethod.platform];
    if (!endpoint) {
      toast.success('Конфигурация сохранена (демо)');
      setIsConfigOpen(false);
      return;
    }

    try {
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId: configuringMethod.methodNumber,
          config: {
            targetChannels: configForm.targetChannels.split(',').map(s => s.trim()).filter(Boolean),
            niche: configForm.niche,
            geo: configForm.geo,
            style: configForm.style,
            offerLink: configForm.offerLink,
            schedule: configForm.schedule,
            accountRotation: configForm.accountRotation,
          },
        }),
      });

      toast.success('Конфигурация сохранена');
      setIsConfigOpen(false);
    } catch {
      toast.error('Ошибка сохранения конфигурации');
    }
  };

  // Execute method
  const handleExecuteMethod = async (method: TrafficMethod) => {
    const endpoint = API_ENDPOINTS[method.platform];
    if (!endpoint) {
      toast.success(`Метод "${method.name}" запущен (демо)`);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId: method.methodNumber,
          saveExecution: true,
        }),
      });

      if (response.ok) {
        toast.success(`Метод "${method.name}" запущен`);
        loadMethods(); // Refresh data
      }
    } catch {
      toast.error('Ошибка запуска метода');
    }
  };

  // Get risk color
  const getRiskColor = (level: number) => {
    if (level >= 70) return 'text-red-500';
    if (level >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Get risk badge
  const getRiskBadge = (level: number) => {
    if (level >= 70) return { label: 'Высокий', variant: 'destructive' as const };
    if (level >= 40) return { label: 'Средний', variant: 'secondary' as const };
    return { label: 'Низкий', variant: 'default' as const };
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#6C63FF]/20 to-[#6C63FF]/5 border-[#6C63FF]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStats.activeMethods}</p>
                <p className="text-xs text-[#8A8A8A]">Активных методов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#00D26A]/20 to-[#00D26A]/5 border-[#00D26A]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStats.totalActions.toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Всего действий</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#FF6B9D]/20 to-[#FF6B9D]/5 border-[#FF6B9D]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B9D]/20 flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-[#FF6B9D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStats.totalClicks.toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Кликов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#FFB800]/20 to-[#FFB800]/5 border-[#FFB800]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStats.totalConversions}</p>
                <p className="text-xs text-[#8A8A8A]">Конверсий</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Stats Chart */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Статистика по платформам
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {PLATFORMS.map(platform => {
              const stats = platformStats[platform.id] || { activeMethods: 0, totalActions: 0 };
              return (
                <div key={platform.id} className="text-center">
                  <div
                    className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: `${platform.color}20` }}
                  >
                    <platform.icon className="w-5 h-5" style={{ color: platform.color }} />
                  </div>
                  <p className="text-xs text-[#8A8A8A]">{platform.name}</p>
                  <p className="text-sm font-bold text-white">{stats.activeMethods}/{platform.count}</p>
                  <Progress
                    value={(stats.activeMethods / platform.count) * 100}
                    className="h-1 mt-1"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top 5 Methods by Conversion */}
      {topMethods.length > 0 && (
        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00D26A]" />
              ТОП-5 по конверсии
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topMethods.slice(0, 5).map((method, idx) => (
                <div
                  key={method.id}
                  className="flex items-center gap-3 p-2 bg-[#14151A] rounded"
                >
                  <div className="w-6 h-6 rounded bg-[#6C63FF] flex items-center justify-center text-white text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white truncate">{method.name}</p>
                    <p className="text-xs text-[#8A8A8A]">{method.platform}</p>
                  </div>
                  <Badge variant="outline" className="text-[#00D26A]">
                    {(method.conversionRate * 100).toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию или описанию..."
            className="pl-10 bg-[#1E1F26] border-[#2A2B32] text-white"
          />
        </div>
        <div className="flex gap-2">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat.id)}
              className={activeCategory === cat.id ? 'bg-[#6C63FF]' : 'border-[#2A2B32]'}
            >
              {cat.name}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadMethods()}
          className="border-[#2A2B32]"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Platform Tabs */}
      <Tabs value={activePlatform} onValueChange={setActivePlatform}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32] grid grid-cols-6 h-auto">
          {PLATFORMS.map(platform => {
            const Icon = platform.icon;
            const stats = platformStats[platform.id];
            return (
              <TabsTrigger
                key={platform.id}
                value={platform.id}
                className="data-[state=active]:bg-[#6C63FF] flex flex-col items-center gap-1 py-2"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline text-xs">{platform.name}</span>
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: platform.color,
                    color: platform.color
                  }}
                >
                  {stats?.activeMethods || 0}/{platform.count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {PLATFORMS.map(platform => (
          <TabsContent key={platform.id} value={platform.id} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-[#6C63FF]" />
              </div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMethods.map(method => {
                    const riskBadge = getRiskBadge(method.riskLevel);
                    return (
                      <Card
                        key={method.id}
                        className={cn(
                          'bg-[#1E1F26] border-[#2A2B32] transition-all duration-300 hover:border-[#6C63FF]/50 hover:shadow-lg hover:shadow-[#6C63FF]/10',
                          method.isActive && 'border-l-4'
                        )}
                        style={method.isActive ? { borderLeftColor: platform.color } : {}}
                      >
                        <CardContent className="p-4">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                style={{ backgroundColor: platform.color }}
                              >
                                {method.methodNumber}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-white truncate">{method.name}</h3>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {method.category}
                                  </Badge>
                                  <Badge variant={riskBadge.variant} className="text-xs">
                                    {riskBadge.label}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Switch
                              checked={method.isActive}
                              onCheckedChange={() => handleToggleMethod(method)}
                            />
                          </div>

                          {/* Description */}
                          <p className="text-xs text-[#8A8A8A] mb-3 line-clamp-2">
                            {method.description}
                          </p>

                          {/* Stats */}
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            <div className="text-center p-2 bg-[#14151A] rounded">
                              <p className="text-sm font-bold text-white">{method.totalActions}</p>
                              <p className="text-xs text-[#8A8A8A]">Действий</p>
                            </div>
                            <div className="text-center p-2 bg-[#14151A] rounded">
                              <p className="text-sm font-bold text-white">{method.totalClicks}</p>
                              <p className="text-xs text-[#8A8A8A]">Кликов</p>
                            </div>
                            <div className="text-center p-2 bg-[#14151A] rounded">
                              <p className="text-sm font-bold text-white">{method.totalConversions}</p>
                              <p className="text-xs text-[#8A8A8A]">Конверсий</p>
                            </div>
                            <div className="text-center p-2 bg-[#14151A] rounded">
                              <p className="text-sm font-bold text-[#00D26A]">
                                {method.conversionRate.toFixed(1)}%
                              </p>
                              <p className="text-xs text-[#8A8A8A]">CR</p>
                            </div>
                          </div>

                          {/* Metrics */}
                          <div className="flex items-center gap-4 mb-3 text-xs">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-[#00D26A]" />
                              <span className="text-[#8A8A8A]">CTR:</span>
                              <span className="text-white font-medium">{method.ctr.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <AlertTriangle className={cn("w-3 h-3", getRiskColor(method.riskLevel))} />
                              <span className="text-[#8A8A8A]">Риск:</span>
                              <span className={getRiskColor(method.riskLevel)}>{method.riskLevel}%</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openConfigDialog(method)}
                              className="flex-1 border-[#2A2B32]"
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              Настроить
                            </Button>
                            {method.isActive ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleToggleMethod(method)}
                              >
                                <Square className="w-4 h-4 mr-1" />
                                Стоп
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-[#00D26A] hover:bg-[#00D26A]/80"
                                onClick={() => handleExecuteMethod(method)}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Запустить
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {filteredMethods.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-[#8A8A8A]">
                    <Search className="w-12 h-12 mb-4 opacity-50" />
                    <p>Методы не найдены</p>
                  </div>
                )}
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#6C63FF]" />
              {configuringMethod?.name}
              <Badge variant="outline" className="ml-2">
                #{configuringMethod?.methodNumber}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Target Channels */}
            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">Целевые каналы/аккаунты</label>
              <Textarea
                value={configForm.targetChannels}
                onChange={(e) => setConfigForm({ ...configForm, targetChannels: e.target.value })}
                placeholder="@channel1, @channel2, @channel3..."
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[80px]"
              />
            </div>

            {/* AI Content Generation */}
            <Card className="bg-[#1E1F26] border-[#2A2B32]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#6C63FF]" />
                  AI-генерация контента
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8A8A]">Ниша</label>
                    <Select
                      value={configForm.niche}
                      onValueChange={(v) => setConfigForm({ ...configForm, niche: v })}
                    >
                      <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                        {NICHES.map((n) => (
                          <SelectItem key={n} value={n} className="text-white">
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8A8A]">Стиль</label>
                    <Select
                      value={configForm.style}
                      onValueChange={(v) => setConfigForm({ ...configForm, style: v })}
                    >
                      <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                        {STYLES.map((s) => (
                          <SelectItem key={s} value={s} className="text-white">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8A8A]">Гео</label>
                    <Select
                      value={configForm.geo}
                      onValueChange={(v) => setConfigForm({ ...configForm, geo: v })}
                    >
                      <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                        {GEOS.map((g) => (
                          <SelectItem key={g} value={g} className="text-white">
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  className="w-full bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Сгенерировать контент
                    </>
                  )}
                </Button>

                {generatedContent.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8A8A]">Сгенерированные варианты</label>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {generatedContent.map((content, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-[#14151A] rounded border border-[#2A2B32] text-sm text-white cursor-pointer hover:border-[#6C63FF] transition-colors"
                            onClick={() => {
                              navigator.clipboard.writeText(content);
                              toast.success('Скопировано в буфер');
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="whitespace-pre-wrap">{content}</p>
                              <Copy className="w-4 h-4 flex-shrink-0 text-[#8A8A8A]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* UTM Tracking */}
            <Card className="bg-[#1E1F26] border-[#2A2B32]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#00D26A]" />
                  UTM-трекинг
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-[#8A8A8A]">Ссылка оффера</label>
                  <Input
                    value={configForm.offerLink}
                    onChange={(e) => setConfigForm({ ...configForm, offerLink: e.target.value })}
                    placeholder="https://t.me/yourchannel"
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>

                <Button
                  onClick={handleGenerateUTM}
                  variant="outline"
                  className="w-full border-[#2A2B32]"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Сгенерировать UTM ссылку
                </Button>

                {utmLink && (
                  <div className="p-3 bg-[#14151A] rounded border border-[#2A2B32]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[#8A8A8A] truncate flex-1">{utmLink}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(utmLink);
                          toast.success('UTM ссылка скопирована');
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule */}
            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A] flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Расписание
              </label>
              <Select
                value={configForm.schedule}
                onValueChange={(v) => setConfigForm({ ...configForm, schedule: v })}
              >
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  {SCHEDULES.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-white">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Rotation */}
            <div className="flex items-center justify-between p-4 bg-[#1E1F26] rounded-lg border border-[#2A2B32]">
              <div>
                <p className="text-sm text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Ротация аккаунтов
                </p>
                <p className="text-xs text-[#8A8A8A]">Автоматическое переключение между аккаунтами</p>
              </div>
              <Switch
                checked={configForm.accountRotation}
                onCheckedChange={(v) => setConfigForm({ ...configForm, accountRotation: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfigOpen(false)}
              className="border-[#2A2B32] text-[#8A8A8A]"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveConfig}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              <Check className="w-4 h-4 mr-2" />
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

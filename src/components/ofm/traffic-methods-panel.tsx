'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Send,
  Instagram,
  Music,
  ArrowRight,
  Settings,
  Play,
  Pause,
  TrendingUp,
  MousePointer,
  Users,
  Clock,
  RotateCcw,
  ChevronRight,
  Zap,
  Sparkles,
  Image as ImageIcon,
  Link2,
  BarChart3,
  Copy,
  Check,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface TrafficMethod {
  id: number;
  name: string;
  description: string;
  platform: 'telegram' | 'instagram' | 'tiktok' | 'cross';
  isActive: boolean;
  stats: {
    actions: number;
    clicks: number;
    conversions: number;
  };
  config?: {
    targetChannels?: string[];
    messageTemplate?: string;
    schedule?: string;
    accountRotation?: boolean;
  };
}

// All 30 traffic methods with detailed descriptions
const trafficMethods: TrafficMethod[] = [
  // Telegram methods (10)
  { id: 1, name: 'Комментинг + Stories', description: 'Комментарий → профиль → Story → целевой канал (AI OFM)', platform: 'telegram', isActive: true, stats: { actions: 1234, clicks: 567, conversions: 45 } },
  { id: 2, name: 'Реакции как триггер', description: 'AI-выбор реакции для привлечения внимания', platform: 'telegram', isActive: true, stats: { actions: 890, clicks: 432, conversions: 38 } },
  { id: 3, name: 'Спам через репосты', description: 'Репосты через каналы-прокладки', platform: 'telegram', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
  { id: 4, name: 'Голосовые комментарии', description: 'TTS-генерация голосовых (1-3 сек)', platform: 'telegram', isActive: true, stats: { actions: 456, clicks: 234, conversions: 18 } },
  { id: 5, name: 'Опросы-ловушки', description: 'Интерактивные опросы для сбора аудитории', platform: 'telegram', isActive: true, stats: { actions: 789, clicks: 345, conversions: 29 } },
  { id: 6, name: 'Ответы конкурентам', description: 'Перехват аудитории через ответы', platform: 'telegram', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
  { id: 7, name: 'Перехват топ-комментов', description: 'Ответы на популярные комментарии', platform: 'telegram', isActive: true, stats: { actions: 234, clicks: 189, conversions: 12 } },
  { id: 8, name: 'Стикер-спам', description: 'Стикеры с водяным знаком канала', platform: 'telegram', isActive: true, stats: { actions: 1567, clicks: 678, conversions: 56 } },
  { id: 9, name: 'Авто-лайк своих', description: 'Поднятие видимости комментариев', platform: 'telegram', isActive: true, stats: { actions: 2345, clicks: 456, conversions: 34 } },
  { id: 10, name: 'Фейковые новости', description: 'Вирусный контент для распространения', platform: 'telegram', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },

  // Instagram methods (7)
  { id: 11, name: 'AI-комментарии в Reels', description: 'DeepSeek комменты под вирусными Reels', platform: 'instagram', isActive: true, stats: { actions: 567, clicks: 289, conversions: 23 } },
  { id: 12, name: 'Mass following', description: 'Подписка + отписка через 3 дня', platform: 'instagram', isActive: true, stats: { actions: 432, clicks: 198, conversions: 15 } },
  { id: 13, name: 'Stories с интерактивом', description: 'Опросы, вопросы, голосования', platform: 'instagram', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
  { id: 14, name: 'DM-рассылка', description: 'Персонализированные Direct сообщения', platform: 'instagram', isActive: true, stats: { actions: 2345, clicks: 456, conversions: 34 } },
  { id: 15, name: 'Комментинг с эмодзи', description: 'Короткие реакции без триггера модерации', platform: 'instagram', isActive: true, stats: { actions: 321, clicks: 167, conversions: 11 } },
  { id: 16, name: 'Репост Stories', description: 'Кросс-промо через Stories', platform: 'instagram', isActive: true, stats: { actions: 234, clicks: 156, conversions: 28 } },
  { id: 17, name: 'Коллаборации', description: 'Совместные посты с блогерами', platform: 'instagram', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },

  // TikTok methods (6)
  { id: 18, name: 'Нейрокомментинг', description: 'Комменты под вирусными видео (первые 30 мин)', platform: 'tiktok', isActive: true, stats: { actions: 876, clicks: 432, conversions: 38 } },
  { id: 19, name: 'Telegram перелив', description: 'CTA в профиле TikTok → Telegram', platform: 'tiktok', isActive: true, stats: { actions: 234, clicks: 145, conversions: 12 } },
  { id: 20, name: 'Duet-реакции', description: 'Видео-реакции на популярный контент', platform: 'tiktok', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
  { id: 21, name: 'Авто-лайки', description: 'Массовые лайки + сохранения', platform: 'tiktok', isActive: true, stats: { actions: 567, clicks: 289, conversions: 21 } },
  { id: 22, name: 'Ответы автору', description: 'Ответы от имени автора видео', platform: 'tiktok', isActive: true, stats: { actions: 1234, clicks: 345, conversions: 27 } },
  { id: 23, name: 'Спам через звуки', description: 'Создание трендовых аудио', platform: 'tiktok', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },

  // Cross-platform methods (7)
  { id: 24, name: 'TikTok → Telegram', description: 'Перелив трафика из TikTok', platform: 'cross', isActive: true, stats: { actions: 345, clicks: 189, conversions: 15 } },
  { id: 25, name: 'Instagram → Telegram', description: 'Перелив трафика из Instagram', platform: 'cross', isActive: true, stats: { actions: 234, clicks: 123, conversions: 9 } },
  { id: 26, name: 'YouTube → Telegram', description: 'Комментинг под свежими видео', platform: 'cross', isActive: true, stats: { actions: 189, clicks: 98, conversions: 7 } },
  { id: 27, name: 'Twitter → Telegram', description: 'Ответы на твиты с оффером', platform: 'cross', isActive: true, stats: { actions: 456, clicks: 234, conversions: 18 } },
  { id: 28, name: 'Pinterest → Telegram', description: 'Пины с интригой + ссылка', platform: 'cross', isActive: true, stats: { actions: 567, clicks: 289, conversions: 23 } },
  { id: 29, name: 'Reddit → Telegram', description: 'Мягкий оффер в сабреддитах', platform: 'cross', isActive: true, stats: { actions: 1234, clicks: 678, conversions: 45 } },
  { id: 30, name: 'LinkedIn → Telegram', description: 'B2B лиды через комменты', platform: 'cross', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
];

const platformIcons = {
  telegram: Send,
  instagram: Instagram,
  tiktok: Music,
  cross: ArrowRight,
};

const platformColors = {
  telegram: '#0088cc',
  instagram: '#E4405F',
  tiktok: '#000000',
  cross: '#6C63FF',
};

// Niches for AI generation
const NICHES = ['relationships', 'psychology', 'humor', 'business', 'crypto', 'fitness', 'lifestyle', 'finance'];

// Styles for content
const STYLES = ['playful', 'mysterious', 'friendly', 'provocative'];

export function TrafficMethodsPanel() {
  const [methods, setMethods] = useState<TrafficMethod[]>(trafficMethods);
  const [activePlatform, setActivePlatform] = useState<string>('telegram');
  const [configuringMethod, setConfiguringMethod] = useState<TrafficMethod | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);
  const [utmLink, setUtmLink] = useState<string>('');

  // Config form state
  const [configForm, setConfigForm] = useState({
    targetChannels: '',
    messageTemplate: '',
    schedule: 'every_hour',
    accountRotation: true,
    niche: 'relationships',
    style: 'playful',
    geo: 'RU',
    offerLink: '',
    minProfileClicks: 1,
    delayMinutes: 5,
    autoPublishStory: true,
    generateImage: true,
  });

  const filteredMethods = methods.filter((m) => m.platform === activePlatform);

  const getPlatformCount = (platform: string) => {
    return methods.filter((m) => m.platform === platform && m.isActive).length;
  };

  const handleToggleMethod = (id: number) => {
    setMethods(methods.map((m) =>
      m.id === id ? { ...m, isActive: !m.isActive } : m
    ));
    const method = methods.find((m) => m.id === id);
    toast.success(method?.isActive ? 'Метод отключён' : 'Метод активирован');
  };

  const openConfigDialog = (method: TrafficMethod) => {
    setConfiguringMethod(method);
    setConfigForm({
      targetChannels: method.config?.targetChannels?.join(', ') || '',
      messageTemplate: method.config?.messageTemplate || '',
      schedule: method.config?.schedule || 'every_hour',
      accountRotation: method.config?.accountRotation ?? true,
      niche: 'relationships',
      style: 'playful',
      geo: 'RU',
      offerLink: '',
      minProfileClicks: 1,
      delayMinutes: 5,
      autoPublishStory: true,
      generateImage: true,
    });
    setGeneratedContent([]);
    setUtmLink('');
    setIsConfigOpen(true);
  };

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ofm/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: configForm.niche,
          contentType: 'comment',
          style: configForm.style,
          postContext: configForm.messageTemplate,
          geo: configForm.geo,
        }),
      });

      const data = await response.json();
      
      if (data.variants) {
        setGeneratedContent(data.variants);
        toast.success(`Сгенерировано ${data.variants.length} вариантов`);
      }
    } catch (error) {
      toast.error('Ошибка генерации контента');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateUTM = async () => {
    if (!configuringMethod) return;
    
    try {
      const response = await fetch('/api/traffic/utm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId: configuringMethod.id,
          customParams: {
            baseUrl: configForm.offerLink || 'https://t.me/yourchannel',
          },
        }),
      });

      const data = await response.json();
      
      if (data.trackingUrl) {
        setUtmLink(data.trackingUrl);
        toast.success('UTM ссылка сгенерирована');
      }
    } catch (error) {
      toast.error('Ошибка генерации UTM');
    }
  };

  const handleSaveConfig = () => {
    if (!configuringMethod) return;

    setMethods(methods.map((m) =>
      m.id === configuringMethod.id
        ? {
            ...m,
            config: {
              targetChannels: configForm.targetChannels.split(',').map((s) => s.trim()).filter(Boolean),
              messageTemplate: configForm.messageTemplate,
              schedule: configForm.schedule,
              accountRotation: configForm.accountRotation,
            },
          }
        : m
    ));

    setIsConfigOpen(false);
    setConfiguringMethod(null);
    toast.success('Конфигурация сохранена');
  };

  const totalStats = methods.reduce(
    (acc, m) => ({
      actions: acc.actions + m.stats.actions,
      clicks: acc.clicks + m.stats.clicks,
      conversions: acc.conversions + m.stats.conversions,
    }),
    { actions: 0, clicks: 0, conversions: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {methods.filter((m) => m.isActive).length}
                </p>
                <p className="text-xs text-[#8A8A8A]">Активных методов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStats.actions.toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Всего действий</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B9D]/20 flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-[#FF6B9D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStats.clicks.toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Кликов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStats.conversions}</p>
                <p className="text-xs text-[#8A8A8A]">Конверсий</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Tabs */}
      <Tabs value={activePlatform} onValueChange={setActivePlatform}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32] grid grid-cols-4">
          {Object.entries(platformIcons).map(([key, Icon]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="data-[state=active]:bg-[#6C63FF] flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline capitalize">{key}</span>
              <Badge
                variant="outline"
                className="ml-1 text-xs"
                style={{ borderColor: platformColors[key as keyof typeof platformColors], color: platformColors[key as keyof typeof platformColors] }}
              >
                {getPlatformCount(key)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {['telegram', 'instagram', 'tiktok', 'cross'].map((platform) => (
          <TabsContent key={platform} value={platform} className="mt-6">
            <ScrollArea className="h-[500px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {methods
                  .filter((m) => m.platform === platform)
                  .map((method) => {
                    const conversionRate = method.stats.actions > 0
                      ? ((method.stats.conversions / method.stats.actions) * 100).toFixed(1)
                      : '0';

                    return (
                      <Card
                        key={method.id}
                        className={cn(
                          'bg-[#1E1F26] border-[#2A2B32] transition-all',
                          method.isActive && 'border-l-4',
                          method.isActive && `border-l-[${platformColors[platform as keyof typeof platformColors]}]`
                        )}
                        style={method.isActive ? { borderLeftColor: platformColors[platform as keyof typeof platformColors] } : {}}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                style={{ backgroundColor: platformColors[platform as keyof typeof platformColors] }}
                              >
                                {method.id}
                              </div>
                              <div>
                                <h3 className="font-medium text-white">{method.name}</h3>
                                <p className="text-xs text-[#8A8A8A]">{method.description}</p>
                              </div>
                            </div>
                            <Switch
                              checked={method.isActive}
                              onCheckedChange={() => handleToggleMethod(method.id)}
                            />
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            <div className="text-center p-2 bg-[#14151A] rounded">
                              <p className="text-sm font-bold text-white">{method.stats.actions}</p>
                              <p className="text-xs text-[#8A8A8A]">Действий</p>
                            </div>
                            <div className="text-center p-2 bg-[#14151A] rounded">
                              <p className="text-sm font-bold text-white">{method.stats.clicks}</p>
                              <p className="text-xs text-[#8A8A8A]">Кликов</p>
                            </div>
                            <div className="text-center p-2 bg-[#14151A] rounded">
                              <p className="text-sm font-bold text-white">{method.stats.conversions}</p>
                              <p className="text-xs text-[#8A8A8A]">Конверсий</p>
                            </div>
                            <div className="text-center p-2 bg-[#14151A] rounded">
                              <p className="text-sm font-bold text-[#00D26A]">{conversionRate}%</p>
                              <p className="text-xs text-[#8A8A8A]">CR</p>
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
                            <Button
                              size="sm"
                              variant={method.isActive ? 'default' : 'outline'}
                              className={method.isActive ? 'bg-[#FF6B9D] hover:bg-[#FF6B9D]/80' : 'border-[#00D26A] text-[#00D26A]'}
                              onClick={() => handleToggleMethod(method.id)}
                            >
                              {method.isActive ? (
                                <>
                                  <Pause className="w-4 h-4 mr-1" />
                                  Стоп
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-1" />
                                  Старт
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Config Preview */}
                          {method.config && (
                            <div className="mt-3 p-2 bg-[#14151A] rounded text-xs text-[#8A8A8A]">
                              {method.config.targetChannels && method.config.targetChannels.length > 0 && (
                                <p>Каналы: {method.config.targetChannels.slice(0, 2).join(', ')}{method.config.targetChannels.length > 2 && '...'}</p>
                              )}
                              {method.config.schedule && (
                                <p className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Расписание настроено
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#FF6B9D]" />
              {configuringMethod?.name}
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
                        <SelectItem value="RU">RU</SelectItem>
                        <SelectItem value="US">US</SelectItem>
                        <SelectItem value="DE">DE</SelectItem>
                        <SelectItem value="UK">UK</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#8A8A8A]">Контекст поста (для генерации)</label>
                  <Textarea
                    value={configForm.messageTemplate}
                    onChange={(e) => setConfigForm({ ...configForm, messageTemplate: e.target.value })}
                    placeholder="Введите текст поста или контекст для генерации комментария..."
                    className="bg-[#14151A] border-[#2A2B32] text-white min-h-[60px]"
                  />
                </div>

                <Button
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  className="w-full bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Сгенерировать варианты
                    </>
                  )}
                </Button>

                {generatedContent.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8A8A]">Сгенерированные варианты</label>
                    <div className="space-y-2">
                      {generatedContent.map((content, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-[#14151A] rounded border border-[#2A2B32] text-sm text-white cursor-pointer hover:border-[#6C63FF]"
                          onClick={() => {
                            navigator.clipboard.writeText(content);
                            toast.success('Скопировано');
                          }}
                        >
                          {content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto Story Settings (for method 1) */}
            {configuringMethod?.id === 1 && (
              <Card className="bg-[#1E1F26] border-[#2A2B32]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#FF6B9D]" />
                    Авто-публикация Story
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Включить авто-публикацию</p>
                      <p className="text-xs text-[#8A8A8A]">Story публикуется после комментария</p>
                    </div>
                    <Switch
                      checked={configForm.autoPublishStory}
                      onCheckedChange={(v) => setConfigForm({ ...configForm, autoPublishStory: v })}
                    />
                  </div>

                  {configForm.autoPublishStory && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-[#8A8A8A]">Мин. кликов по профилю</label>
                          <Input
                            type="number"
                            value={configForm.minProfileClicks}
                            onChange={(e) => setConfigForm({ ...configForm, minProfileClicks: parseInt(e.target.value) || 1 })}
                            className="bg-[#14151A] border-[#2A2B32] text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-[#8A8A8A]">Задержка (мин)</label>
                          <Input
                            type="number"
                            value={configForm.delayMinutes}
                            onChange={(e) => setConfigForm({ ...configForm, delayMinutes: parseInt(e.target.value) || 5 })}
                            className="bg-[#14151A] border-[#2A2B32] text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white">Генерировать изображение</p>
                          <p className="text-xs text-[#8A8A8A]">AI создаёт изображение для Story</p>
                        </div>
                        <Switch
                          checked={configForm.generateImage}
                          onCheckedChange={(v) => setConfigForm({ ...configForm, generateImage: v })}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

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
                    <div className="flex items-center justify-between">
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
              <label className="text-sm text-[#8A8A8A]">Расписание</label>
              <Select
                value={configForm.schedule}
                onValueChange={(v) => setConfigForm({ ...configForm, schedule: v })}
              >
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectItem value="every_30min">Каждые 30 минут</SelectItem>
                  <SelectItem value="every_hour">Каждый час</SelectItem>
                  <SelectItem value="every_3h">Каждые 3 часа</SelectItem>
                  <SelectItem value="every_6h">Каждые 6 часов</SelectItem>
                  <SelectItem value="daily">Ежедневно</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account Rotation */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Ротация аккаунтов</p>
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
              className="bg-[#FF6B9D] hover:bg-[#FF6B9D]/80"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

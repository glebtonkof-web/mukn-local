'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// All 30 traffic methods
const trafficMethods: TrafficMethod[] = [
  // Telegram methods (10)
  { id: 1, name: 'AI-комментарии в каналах', description: 'Автоматические осмысленные комментарии с помощью ИИ', platform: 'telegram', isActive: true, stats: { actions: 1234, clicks: 567, conversions: 45 } },
  { id: 2, name: 'Stories с CTA', description: 'Сторис с призывом к действию и UTM-метками', platform: 'telegram', isActive: true, stats: { actions: 890, clicks: 432, conversions: 38 } },
  { id: 3, name: 'Упоминания в комментариях', description: 'Упоминание бренда в релевантных обсуждениях', platform: 'telegram', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
  { id: 4, name: 'Репосты с комментарием', description: 'Репост контента с провокационным комментарием', platform: 'telegram', isActive: true, stats: { actions: 456, clicks: 234, conversions: 18 } },
  { id: 5, name: 'Ответы на популярные посты', description: 'Быстрые ответы на набирающие популярность посты', platform: 'telegram', isActive: true, stats: { actions: 789, clicks: 345, conversions: 29 } },
  { id: 6, name: 'Фейковые срачи', description: 'Искусственные дискуссии для привлечения внимания', platform: 'telegram', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
  { id: 7, name: 'Опросы и голосования', description: 'Создание интерактивных опросов в каналах', platform: 'telegram', isActive: true, stats: { actions: 234, clicks: 189, conversions: 12 } },
  { id: 8, name: 'Реакции-триггеры', description: 'Массовые реакции для алгоритмического поднятия', platform: 'telegram', isActive: true, stats: { actions: 1567, clicks: 678, conversions: 56 } },
  { id: 9, name: 'Пересылка в личку', description: 'Спам через пересылку сообщений', platform: 'telegram', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
  { id: 10, name: 'Боты-приманки', description: 'Создание ботов для сбора лидов', platform: 'telegram', isActive: true, stats: { actions: 345, clicks: 234, conversions: 34 } },

  // Instagram methods (7)
  { id: 11, name: 'AI-комментарии в Reels', description: 'Комментарии в популярных Reels с ИИ', platform: 'instagram', isActive: true, stats: { actions: 567, clicks: 289, conversions: 23 } },
  { id: 12, name: 'Stories с опросами', description: 'Интерактивные сторис с вовлечением', platform: 'instagram', isActive: true, stats: { actions: 432, clicks: 198, conversions: 15 } },
  { id: 13, name: 'Массфолловинг', description: 'Массовая подписка с отпиской', platform: 'instagram', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
  { id: 14, name: 'Масслайкинг', description: 'Массовые лайки для привлечения внимания', platform: 'instagram', isActive: true, stats: { actions: 2345, clicks: 456, conversions: 34 } },
  { id: 15, name: 'Ответы на Stories', description: 'Реакции на сторис целевой аудитории', platform: 'instagram', isActive: true, stats: { actions: 321, clicks: 167, conversions: 11 } },
  { id: 16, name: 'Упоминания в постах', description: 'Упоминание брендов в своём контенте', platform: 'instagram', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
  { id: 17, name: 'DM-рассылки', description: 'Персонализированные сообщения в Direct', platform: 'instagram', isActive: true, stats: { actions: 234, clicks: 156, conversions: 28 } },

  // TikTok methods (6)
  { id: 18, name: 'AI-комментарии', description: 'Комментарии в вирусных видео', platform: 'tiktok', isActive: true, stats: { actions: 876, clicks: 432, conversions: 38 } },
  { id: 19, name: 'Duet-реакции', description: 'Реакции на популярный контент', platform: 'tiktok', isActive: true, stats: { actions: 234, clicks: 145, conversions: 12 } },
  { id: 20, name: 'Stitch-ответы', description: 'Ответы через функцию Stitch', platform: 'tiktok', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
  { id: 21, name: 'Трендовые звуки', description: 'Использование трендовых аудио', platform: 'tiktok', isActive: true, stats: { actions: 567, clicks: 289, conversions: 21 } },
  { id: 22, name: 'Масслайкинг', description: 'Массовые лайки в ленте "Для тебя"', platform: 'tiktok', isActive: true, stats: { actions: 1234, clicks: 345, conversions: 27 } },
  { id: 23, name: 'Прямые эфиры', description: 'Участие в эфирах с комментариями', platform: 'tiktok', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },

  // Cross-platform methods (7)
  { id: 24, name: 'Кросспостинг', description: 'Публикация одного контента на всех платформах', platform: 'cross', isActive: true, stats: { actions: 345, clicks: 189, conversions: 15 } },
  { id: 25, name: 'Репост в сторис', description: 'Репост контента в сторис всех платформ', platform: 'cross', isActive: true, stats: { actions: 234, clicks: 123, conversions: 9 } },
  { id: 26, name: 'Взаимные упоминания', description: 'Упоминание аккаунтов на разных платформах', platform: 'cross', isActive: true, stats: { actions: 189, clicks: 98, conversions: 7 } },
  { id: 27, name: 'Синхронизация контента', description: 'Автоматическая синхронизация постов', platform: 'cross', isActive: true, stats: { actions: 456, clicks: 234, conversions: 18 } },
  { id: 28, name: 'Мультиаккаунт стратегия', description: 'Координация нескольких аккаунтов', platform: 'cross', isActive: true, stats: { actions: 567, clicks: 289, conversions: 23 } },
  { id: 29, name: 'UTM-трекинг', description: 'Отслеживание трафика между платформами', platform: 'cross', isActive: true, stats: { actions: 1234, clicks: 678, conversions: 45 } },
  { id: 30, name: 'Ретаргетинг', description: 'Догоняющая реклама на разных платформах', platform: 'cross', isActive: false, stats: { actions: 0, clicks: 0, conversions: 0 } },
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

export function TrafficMethodsPanel() {
  const [methods, setMethods] = useState<TrafficMethod[]>(trafficMethods);
  const [activePlatform, setActivePlatform] = useState<string>('telegram');
  const [configuringMethod, setConfiguringMethod] = useState<TrafficMethod | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Config form state
  const [configForm, setConfigForm] = useState({
    targetChannels: '',
    messageTemplate: '',
    schedule: 'every_hour',
    accountRotation: true,
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
    });
    setIsConfigOpen(true);
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
        <DialogContent className="max-w-lg bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#FF6B9D]" />
              {configuringMethod?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">Целевые каналы/аккаунты</label>
              <Textarea
                value={configForm.targetChannels}
                onChange={(e) => setConfigForm({ ...configForm, targetChannels: e.target.value })}
                placeholder="@channel1, @channel2, @channel3..."
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[80px]"
              />
              <p className="text-xs text-[#8A8A8A]">Разделяйте каналы запятыми</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">Шаблон сообщения</label>
              <Textarea
                value={configForm.messageTemplate}
                onChange={(e) => setConfigForm({ ...configForm, messageTemplate: e.target.value })}
                placeholder="Привет! Это интересная тема..."
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[100px]"
              />
            </div>

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

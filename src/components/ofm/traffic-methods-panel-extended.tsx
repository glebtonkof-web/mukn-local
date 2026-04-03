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
  Zap,
  Sparkles,
  Image as ImageIcon,
  Link2,
  Copy,
  AlertTriangle,
  Brain,
  Globe,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// 130 методов трафика
const ALL_METHODS = {
  telegram: [
    { id: 1, name: 'Комментинг + Stories', risk: 'low', top: true },
    { id: 2, name: 'Реакции как триггер', risk: 'low' },
    { id: 3, name: 'Спам через репосты', risk: 'medium' },
    { id: 4, name: 'Голосовые комментарии', risk: 'low' },
    { id: 5, name: 'Опросы-ловушки', risk: 'low' },
    { id: 6, name: 'Ответы конкурентам', risk: 'medium' },
    { id: 7, name: 'Перехват топ-комментов', risk: 'medium' },
    { id: 8, name: 'Стикер-спам', risk: 'low' },
    { id: 9, name: 'Авто-лайк своих', risk: 'low' },
    { id: 10, name: 'Фейковые новости', risk: 'high' },
    { id: 31, name: 'Фейковые подарки', risk: 'medium' },
    { id: 32, name: 'Авто-ответы на команды', risk: 'low' },
    { id: 33, name: 'Исправление ошибок', risk: 'medium' },
    { id: 34, name: 'Цитаты автора', risk: 'low' },
    { id: 35, name: 'Предсказания', risk: 'low' },
    { id: 36, name: 'Конкурсы', risk: 'medium' },
    { id: 37, name: 'Жалобы', risk: 'high' },
    { id: 38, name: 'Оффтоп', risk: 'medium' },
    { id: 39, name: 'Личная история', risk: 'low', top: true },
    { id: 40, name: 'Несогласие', risk: 'medium' },
    { id: 41, name: 'Теги друзей', risk: 'medium' },
    { id: 42, name: 'Фейковые разоблачения', risk: 'high' },
    { id: 43, name: 'Опросы с подвохом', risk: 'medium' },
    { id: 44, name: 'Переписка с собой', risk: 'medium' },
    { id: 45, name: 'Фейковые уведомления', risk: 'high' },
    { id: 81, name: 'Голосование в комментах', risk: 'low' },
    { id: 82, name: 'Канал-невидимка', risk: 'low', top: true },
    { id: 83, name: 'Фейковые техподдержки', risk: 'extreme' },
    { id: 84, name: 'Розыгрыши по подписке', risk: 'medium' },
    { id: 85, name: 'Доступ к закрытому контенту', risk: 'low' },
    { id: 86, name: 'Фейковые вакансии', risk: 'medium', top: true },
    { id: 87, name: 'Партнёрские программы', risk: 'low' },
    { id: 88, name: 'Чек-листы и гайды', risk: 'low' },
    { id: 89, name: 'Личные сообщения автору', risk: 'medium' },
    { id: 90, name: 'Исправление автора', risk: 'medium' },
    { id: 91, name: 'Дополнение к посту', risk: 'low' },
    { id: 92, name: 'Личный опыт', risk: 'low', top: true },
    { id: 93, name: 'Фейковые скрины доходов', risk: 'medium', top: true },
    { id: 94, name: 'Предложение дружбы', risk: 'low' },
    { id: 95, name: 'Приглашение в клуб', risk: 'low' },
  ],
  instagram: [
    { id: 11, name: 'AI-комментарии в Reels', risk: 'low' },
    { id: 12, name: 'Mass following', risk: 'medium' },
    { id: 13, name: 'Stories с интерактивом', risk: 'low' },
    { id: 14, name: 'DM-рассылка', risk: 'high' },
    { id: 15, name: 'Комментинг с эмодзи', risk: 'low' },
    { id: 16, name: 'Репост Stories', risk: 'low' },
    { id: 17, name: 'Коллаборации', risk: 'low' },
    { id: 46, name: 'Мемы в комментах', risk: 'low' },
    { id: 47, name: 'Благодарности', risk: 'low' },
    { id: 48, name: 'Вопросы к автору', risk: 'low' },
    { id: 49, name: 'Stories с наклейкой "Новое"', risk: 'low' },
    { id: 50, name: 'Карусель в комментах', risk: 'medium' },
    { id: 51, name: 'Упоминания в Reels', risk: 'low' },
    { id: 52, name: 'Коллаборация с микроблогером', risk: 'medium' },
    { id: 53, name: 'Челленджи', risk: 'low' },
    { id: 54, name: 'Фейковые раздачи', risk: 'high' },
    { id: 55, name: 'Тайм-коды', risk: 'low' },
    { id: 96, name: 'Теги местоположений', risk: 'low', top: true },
    { id: 97, name: 'Подписки на рассылку', risk: 'low' },
    { id: 98, name: 'Фейковые конкурсы в Stories', risk: 'medium' },
    { id: 99, name: 'Упоминания в карусели', risk: 'medium' },
    { id: 100, name: 'Ответы на вопросы в Stories', risk: 'low' },
    { id: 101, name: 'Фейковые отзывы под товарами', risk: 'high', top: true },
    { id: 102, name: 'Предупреждение о мошенниках', risk: 'medium', top: true },
    { id: 103, name: 'Сравнение с конкурентами', risk: 'medium' },
    { id: 104, name: 'Фейковые новости о блокировке', risk: 'high' },
    { id: 105, name: 'Приглашение в закрытый чат', risk: 'low' },
  ],
  tiktok: [
    { id: 18, name: 'Нейрокомментинг', risk: 'low' },
    { id: 19, name: 'Telegram перелив', risk: 'low' },
    { id: 20, name: 'Duet-реакции', risk: 'low' },
    { id: 21, name: 'Авто-лайки', risk: 'low' },
    { id: 22, name: 'Ответы автору', risk: 'low' },
    { id: 23, name: 'Спам через звуки', risk: 'medium' },
    { id: 56, name: 'Повторы фразы', risk: 'medium' },
    { id: 57, name: 'Фейковые переводы', risk: 'medium' },
    { id: 58, name: 'Спойлеры', risk: 'medium' },
    { id: 59, name: 'Сравнения', risk: 'medium' },
    { id: 60, name: 'Фейковые факты', risk: 'high' },
    { id: 61, name: 'Предупреждения', risk: 'medium' },
    { id: 62, name: 'Продолжение следует', risk: 'low' },
    { id: 63, name: 'Фейковые разоблачения автора', risk: 'high' },
    { id: 106, name: 'Комментарии-песни', risk: 'low', top: true },
    { id: 107, name: 'Фейковые челленджи', risk: 'medium' },
    { id: 108, name: 'Разбор ошибок автора', risk: 'medium', top: true },
    { id: 109, name: 'Угадайка', risk: 'low' },
    { id: 110, name: 'Предсказание будущего видео', risk: 'low' },
    { id: 111, name: 'Фейковые инсайды', risk: 'high' },
    { id: 112, name: 'Продолжение истории', risk: 'low' },
    { id: 113, name: 'Фейковые сливы курсов', risk: 'high', top: true },
    { id: 114, name: 'Обучение бесплатно', risk: 'low' },
    { id: 115, name: 'Фейковые раздачи подарков', risk: 'high' },
  ],
  cross_platform: [
    { id: 24, name: 'TikTok → Telegram', risk: 'low' },
    { id: 25, name: 'Instagram → Telegram', risk: 'low' },
    { id: 26, name: 'YouTube → Telegram', risk: 'low' },
    { id: 27, name: 'Twitter → Telegram', risk: 'low' },
    { id: 28, name: 'Pinterest → Telegram', risk: 'low' },
    { id: 29, name: 'Reddit → Telegram', risk: 'medium' },
    { id: 30, name: 'LinkedIn → Telegram', risk: 'low' },
    { id: 64, name: 'YouTube Shorts → Telegram', risk: 'low' },
    { id: 65, name: 'VK → Telegram', risk: 'low' },
    { id: 66, name: 'Discord → Telegram', risk: 'medium' },
    { id: 67, name: 'Twitch → Telegram', risk: 'medium' },
    { id: 68, name: 'Facebook → Telegram', risk: 'medium' },
    { id: 69, name: 'Threads → Telegram', risk: 'low' },
    { id: 70, name: 'Pinterest (extended)', risk: 'low' },
    { id: 71, name: 'Quora → Telegram', risk: 'low' },
    { id: 72, name: 'Medium → Telegram', risk: 'low' },
    { id: 73, name: 'Telegram → WhatsApp', risk: 'low' },
    { id: 116, name: 'Bluesky → Telegram', risk: 'low', top: true },
    { id: 117, name: 'Threads (extended)', risk: 'low', top: true },
    { id: 118, name: 'LinkedIn (B2B)', risk: 'low' },
    { id: 119, name: 'Pinterest (pins)', risk: 'low' },
    { id: 120, name: 'Snapchat Spotlight', risk: 'medium' },
    { id: 121, name: 'Reddit (posts)', risk: 'medium', top: true },
    { id: 122, name: 'Quora (answers)', risk: 'low' },
    { id: 123, name: 'Medium (articles)', risk: 'low' },
    { id: 124, name: 'Discord (servers)', risk: 'medium' },
    { id: 125, name: 'Twitch (chats)', risk: 'medium' },
  ],
  ai_powered: [
    { id: 74, name: 'Фейковые скриншоты переписок', risk: 'high' },
    { id: 75, name: 'Фейковые отзывы на отзовиках', risk: 'high' },
    { id: 76, name: 'Фейковые новостные заголовки', risk: 'high' },
    { id: 77, name: 'Авто-создание вики-страниц', risk: 'extreme' },
    { id: 78, name: 'Фейковые мемы с водяным знаком', risk: 'medium' },
    { id: 79, name: 'Авто-создание тредов на Reddit', risk: 'medium' },
    { id: 80, name: 'Фейковые разоблачительные видео', risk: 'high' },
    { id: 126, name: 'Фейковые диалоги с автором', risk: 'high' },
    { id: 127, name: 'Фейковые письма поддержки', risk: 'extreme' },
    { id: 128, name: 'Фейковые новостные скриншоты', risk: 'high', top: true },
    { id: 129, name: 'Фейковые TikTok-тренды', risk: 'medium' },
    { id: 130, name: 'Авто-создание сайтов-однодневок', risk: 'medium', top: true },
  ],
};

const platformIcons = {
  telegram: Send,
  instagram: Instagram,
  tiktok: Music,
  cross_platform: Globe,
  ai_powered: Brain,
};

const platformColors = {
  telegram: '#0088cc',
  instagram: '#E4405F',
  tiktok: '#000000',
  cross_platform: '#6C63FF',
  ai_powered: '#00D26A',
};

const riskColors = {
  low: '#00D26A',
  medium: '#FFB800',
  high: '#FF6B9D',
  extreme: '#FF0000',
};

type Method = { id: number; name: string; risk: string; top?: boolean };
type Platform = keyof typeof ALL_METHODS;

export function TrafficMethodsPanelExtended() {
  const [methods, setMethods] = useState<Record<Platform, Method[]>>(ALL_METHODS);
  const [activePlatform, setActivePlatform] = useState<Platform>('telegram');
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);
  
  // Config form
  const [configForm, setConfigForm] = useState({
    topic: '',
    channel: '',
    offer: '',
    city: 'Москва',
    product: '',
    salary: '3000-5000',
    source: 'Forbes',
  });

  const filteredMethods = methods[activePlatform];
  const topMethods = filteredMethods.filter(m => m.top);
  const regularMethods = filteredMethods.filter(m => !m.top);

  const getPlatformCount = (platform: Platform) => methods[platform].length;
  const getTotalCount = () => Object.values(methods).flat().length;

  const handleOpenConfig = (method: Method) => {
    setSelectedMethod(method);
    setGeneratedContent([]);
    setIsConfigOpen(true);
  };

  const handleGenerateContent = async () => {
    if (!selectedMethod) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/traffic/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId: selectedMethod.id,
          ...configForm,
        }),
      });

      const data = await response.json();
      
      if (data.variants) {
        setGeneratedContent(data.variants);
        toast.success(`Сгенерировано ${data.variants.length} вариантов`);
      }
    } catch (error) {
      toast.error('Ошибка генерации');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateLanding = async () => {
    try {
      const response = await fetch('/api/traffic/landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: 'crypto',
          params: {
            topic: configForm.topic,
            telegramLink: `https://t.me/${configForm.channel}`,
          },
        }),
      });

      const data = await response.json();
      
      if (data.landing?.shortUrl) {
        navigator.clipboard.writeText(data.landing.shortUrl);
        toast.success(`Лендинг создан: ${data.landing.shortUrl}`);
      }
    } catch (error) {
      toast.error('Ошибка создания лендинга');
    }
  };

  const handleGenerateFakeContent = async (type: string) => {
    try {
      const response = await fetch('/api/traffic/fake-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: type,
          params: {
            amount: '15,420',
            platform: 'binance',
            topic: configForm.topic,
            channel: configForm.channel,
          },
        }),
      });

      const data = await response.json();
      
      if (data.result) {
        toast.success('Контент сгенерирован');
        if (data.result.imageBase64) {
          // Show image preview
        }
      }
    } catch (error) {
      toast.error('Ошибка генерации');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#0088cc]/20 to-[#0088cc]/5 border-[#0088cc]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-[#0088cc]" />
              <div>
                <p className="text-2xl font-bold text-white">{methods.telegram.length}</p>
                <p className="text-xs text-[#8A8A8A]">Telegram</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#E4405F]/20 to-[#E4405F]/5 border-[#E4405F]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Instagram className="w-6 h-6 text-[#E4405F]" />
              <div>
                <p className="text-2xl font-bold text-white">{methods.instagram.length}</p>
                <p className="text-xs text-[#8A8A8A]">Instagram</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#000000]/40 to-[#000000]/20 border-[#333]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Music className="w-6 h-6 text-white" />
              <div>
                <p className="text-2xl font-bold text-white">{methods.tiktok.length}</p>
                <p className="text-xs text-[#8A8A8A]">TikTok</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#6C63FF]/20 to-[#6C63FF]/5 border-[#6C63FF]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-[#6C63FF]" />
              <div>
                <p className="text-2xl font-bold text-white">{methods.cross_platform.length}</p>
                <p className="text-xs text-[#8A8A8A]">Кросс-платформа</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#00D26A]/20 to-[#00D26A]/5 border-[#00D26A]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-[#00D26A]" />
              <div>
                <p className="text-2xl font-bold text-white">{methods.ai_powered.length}</p>
                <p className="text-xs text-[#8A8A8A]">AI-усиленные</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Count Banner */}
      <Card className="bg-gradient-to-r from-[#FF6B9D]/20 via-[#6C63FF]/20 to-[#00D26A]/20 border-0">
        <CardContent className="p-4 flex items-center justify-center">
          <Zap className="w-6 h-6 text-[#FFB800] mr-3" />
          <p className="text-xl font-bold text-white">
            Всего методов: <span className="text-[#FFB800]">{getTotalCount()}</span>
          </p>
        </CardContent>
      </Card>

      {/* Platform Tabs */}
      <Tabs value={activePlatform} onValueChange={(v) => setActivePlatform(v as Platform)}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32] grid grid-cols-5">
          {(Object.entries(platformIcons) as [Platform, React.ComponentType<{ className?: string }>][]).map(([key, Icon]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="data-[state=active]:bg-[#6C63FF] flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden lg:inline">
                {key === 'cross_platform' ? 'Кросс' : key === 'ai_powered' ? 'AI' : key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
              <Badge
                variant="outline"
                className="ml-1 text-xs"
                style={{ borderColor: platformColors[key], color: platformColors[key] }}
              >
                {getPlatformCount(key)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(ALL_METHODS) as Platform[]).map((platform) => (
          <TabsContent key={platform} value={platform} className="mt-6">
            {/* Top Methods */}
            {topMethods.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm text-[#FFB800] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  ТОП методы (рекомендуется)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {topMethods.map((method) => (
                    <Card
                      key={method.id}
                      className="bg-gradient-to-br from-[#FFB800]/10 to-[#FFB800]/5 border-[#FFB800]/30 cursor-pointer hover:scale-[1.02] transition-transform"
                      onClick={() => handleOpenConfig(method)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-[#FFB800] text-black font-bold">
                              #{method.id}
                            </Badge>
                            <span className="text-white font-medium">{method.name}</span>
                          </div>
                          <Badge
                            style={{ backgroundColor: riskColors[method.risk as keyof typeof riskColors] }}
                            className="text-white text-xs"
                          >
                            {method.risk}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* All Methods Grid */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {regularMethods.map((method) => (
                  <Card
                    key={method.id}
                    className="bg-[#1E1F26] border-[#2A2B32] cursor-pointer hover:border-[#6C63FF] transition-colors"
                    onClick={() => handleOpenConfig(method)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[#8A8A8A] text-sm w-8">#{method.id}</span>
                          <span className="text-white text-sm">{method.name}</span>
                        </div>
                        <Badge
                          style={{ backgroundColor: riskColors[method.risk as keyof typeof riskColors] }}
                          className="text-white text-xs"
                        >
                          {method.risk}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#FF6B9D]" />
              Метод #{selectedMethod?.id}: {selectedMethod?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Risk Warning */}
            {selectedMethod && (selectedMethod.risk === 'high' || selectedMethod.risk === 'extreme') && (
              <Card className="bg-[#FF0000]/10 border-[#FF0000]/30">
                <CardContent className="p-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#FF0000]" />
                  <span className="text-[#FF0000] text-sm">
                    {selectedMethod.risk === 'extreme' 
                      ? 'Крайне высокий риск бана! Используйте осторожно.' 
                      : 'Высокий риск бана. Рекомендуется тестировать на второстепенных аккаунтах.'}
                  </span>
                </CardContent>
              </Card>
            )}

            {/* AI Content Generation */}
            <Card className="bg-[#1E1F26] border-[#2A2B32]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#6C63FF]" />
                  AI-генерация контента
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8A8A]">Тема/Ниша</label>
                    <Input
                      value={configForm.topic}
                      onChange={(e) => setConfigForm({ ...configForm, topic: e.target.value })}
                      placeholder="криптовалюта, заработок..."
                      className="bg-[#14151A] border-[#2A2B32] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8A8A]">Канал</label>
                    <Input
                      value={configForm.channel}
                      onChange={(e) => setConfigForm({ ...configForm, channel: e.target.value })}
                      placeholder="my_channel"
                      className="bg-[#14151A] border-[#2A2B32] text-white"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGenerateContent}
                  disabled={isGenerating || !configForm.topic}
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
                      Сгенерировать контент
                    </>
                  )}
                </Button>

                {generatedContent.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs text-[#8A8A8A]">Сгенерированные варианты</label>
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
                )}
              </CardContent>
            </Card>

            {/* Fake Content Tools */}
            <Card className="bg-[#1E1F26] border-[#2A2B32]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#FF6B9D]" />
                  Генерация фейкового контента
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    className="border-[#2A2B32]"
                    onClick={() => handleGenerateFakeContent('screenshot')}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Скрин дохода
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#2A2B32]"
                    onClick={() => handleGenerateFakeContent('news')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Новости
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#2A2B32]"
                    onClick={() => handleGenerateFakeContent('vacancy')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Вакансия
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#2A2B32]"
                    onClick={() => handleGenerateFakeContent('dialog')}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Диалог
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Landing Page */}
            <Card className="bg-[#1E1F26] border-[#2A2B32]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#00D26A]" />
                  Сайт-однодневка
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateLanding}
                  variant="outline"
                  className="w-full border-[#00D26A] text-[#00D26A]"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Создать лендинг с редиректом
                </Button>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfigOpen(false)}
              className="border-[#2A2B32] text-[#8A8A8A]"
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

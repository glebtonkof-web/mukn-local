'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  TrendingUp,
  Shield,
  Zap,
  Target,
  Globe,
  DollarSign,
  Users,
  Plus,
  Trash2,
  Rocket,
  AlertCircle,
  Info,
  Clock,
  MessageSquare,
  Heart,
  Coins,
  CreditCard,
  ShoppingBag,
  Gift,
  Star,
  Network,
  Wallet,
  Flame,
  Sparkles,
  Link2,
  ArrowRightLeft,
  Layers,
  GitBranch,
  Radio,
  Tv,
  Music,
  Camera,
  Send,
  Eye,
  ThumbsUp,
  Crown,
  Award,
  Settings,
  BarChart3,
  Activity,
  Wifi,
  UserCheck,
  RefreshCw,
  Play,
  Pause,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ==================== ТИПЫ ====================

type Platform = 'telegram' | 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';
type RiskLevel = 'low' | 'medium' | 'high';

interface PlatformAccount {
  id: string;
  platform: Platform;
  username: string;
  phone?: string;
  status: 'pending' | 'analyzing' | 'ready' | 'error' | 'warming' | 'active';
  quality: AccountQuality | null;
  proxy?: ProxyConfig;
  warmingStatus?: WarmingStatus;
  followers?: number;
  engagement?: number;
  verified?: boolean;
}

interface AccountQuality {
  score: number;
  age: number;
  hasAvatar: boolean;
  hasUsername: boolean;
  contactsCount?: number;
  groupsCount?: number;
  followers?: number;
  engagement?: number;
  lastActive: Date | null;
  riskLevel: RiskLevel;
  recommendations: string[];
  needsWarming: boolean;
  warmingDays: number;
}

interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'socks5' | 'http';
  status: 'active' | 'inactive' | 'error';
}

interface WarmingStatus {
  day: number;
  totalDays: number;
  progress: number;
  startedAt: Date;
  estimatedEnd: Date;
}

// Связка аккаунтов
interface AccountLink {
  id: string;
  name: string;
  sourceAccounts: PlatformAccount[];
  targetAccounts: PlatformAccount[];
  strategy: 'cross-promotion' | 'funnel' | 'traffic-pour' | 'content-repurpose';
  description: string;
}

// Схема монетизации
interface MonetizationScheme {
  id: string;
  name: string;
  description: string;
  category: 'arbitrage' | 'content' | 'service' | 'passive' | 'hybrid';
  icon: React.ReactNode;
  color: string;
  platforms: Platform[];
  minAccounts: number;
  minQuality: number;
  estimatedROI: { min: number; max: number; period: string };
  riskLevel: RiskLevel;
  setupTime: string;
  features: string[];
  warnings: string[];
  requirements: string[];
  requiresLinks: boolean; // Требует ли связки аккаунтов
  recommended?: boolean;
  popular?: boolean;
  new?: boolean;
}

// ==================== КОНСТАНТЫ ====================

const PLATFORM_CONFIG: Record<Platform, { name: string; icon: React.ReactNode; color: string }> = {
  telegram: { name: 'Telegram', icon: <Send className="w-5 h-5" />, color: '#0088CC' },
  instagram: { name: 'Instagram', icon: <Camera className="w-5 h-5" />, color: '#E4405F' },
  tiktok: { name: 'TikTok', icon: <Music className="w-5 h-5" />, color: '#000000' },
  youtube: { name: 'YouTube', icon: <Tv className="w-5 h-5" />, color: '#FF0000' },
  twitter: { name: 'Twitter/X', icon: <Radio className="w-5 h-5" />, color: '#1DA1F2' },
  facebook: { name: 'Facebook', icon: <Users className="w-5 h-5" />, color: '#1877F2' },
};

// Все схемы монетизации
const MONETIZATION_SCHEMES: MonetizationScheme[] = [
  // ========== ARBITRAGE ==========
  {
    id: 'gambling_tg',
    name: 'Gambling Telegram',
    description: 'Привлечение игроков в казино через Telegram каналы и чаты. Высокий CPA.',
    category: 'arbitrage',
    icon: <Coins className="w-6 h-6" />,
    color: '#FFB800',
    platforms: ['telegram'],
    minAccounts: 3,
    minQuality: 60,
    estimatedROI: { min: 50, max: 500, period: 'день' },
    riskLevel: 'high',
    setupTime: '1-2 часа',
    features: ['CPA $50-200', 'RevShare до 50%', 'AI-креативы', 'Авто-постинг'],
    warnings: ['Высокий риск бана', 'Требует прогрева', 'Необходимы прокси'],
    requirements: ['Минимум 3 аккаунта', 'Качество 60+', 'Индивидуальные прокси'],
    requiresLinks: false,
    popular: true,
  },
  {
    id: 'dating_multi',
    name: 'Dating Мульти-платформа',
    description: 'Привлечение на дейтинг через Instagram, TikTok и Telegram в связке.',
    category: 'arbitrage',
    icon: <Heart className="w-6 h-6" />,
    color: '#FF4D4D',
    platforms: ['instagram', 'tiktok', 'telegram'],
    minAccounts: 4,
    minQuality: 45,
    estimatedROI: { min: 30, max: 200, period: 'день' },
    riskLevel: 'medium',
    setupTime: '2-3 часа',
    features: ['Контент в TikTok', 'Перелив в TG', 'SOI/DOI офферы', 'Высокая конверсия'],
    warnings: ['Средний риск бана', 'Требует креативов'],
    requirements: ['Instagram аккаунт', 'TikTok аккаунт', 'Telegram для приёма'],
    requiresLinks: true,
    popular: true,
  },
  {
    id: 'crypto_funnel',
    name: 'Crypto Воронка',
    description: 'Многоуровневая воронка привлечения рефералов на криптобиржи.',
    category: 'arbitrage',
    icon: <CreditCard className="w-6 h-6" />,
    color: '#6C63FF',
    platforms: ['telegram', 'youtube', 'twitter'],
    minAccounts: 3,
    minQuality: 55,
    estimatedROI: { min: 100, max: 1000, period: 'день' },
    riskLevel: 'medium',
    setupTime: '3-4 часа',
    features: ['CPA до $500', 'Образовательный контент', 'YouTube обзор', 'TG комьюнити'],
    warnings: ['Требует знаний крипты', 'Средний риск'],
    requirements: ['YouTube канал', 'Telegram канал', 'Twitter аккаунт'],
    requiresLinks: true,
    recommended: true,
  },
  {
    id: 'nutra_instagram',
    name: 'Nutra Instagram',
    description: 'Продвижение БАДов и косметики через Instagram Reels и Stories.',
    category: 'arbitrage',
    icon: <Gift className="w-6 h-6" />,
    color: '#4CAF50',
    platforms: ['instagram'],
    minAccounts: 2,
    minQuality: 50,
    estimatedROI: { min: 50, max: 300, period: 'день' },
    riskLevel: 'medium',
    setupTime: '1.5 часа',
    features: ['Высокий ROI', 'Трай-апы', 'Reels продвижение', 'Influencer-маркетинг'],
    warnings: ['Требует креативов', 'Нужны качественные фото'],
    requirements: ['Instagram бизнес', 'Качество 50+'],
    requiresLinks: false,
  },
  {
    id: 'ecommerce_tg',
    name: 'E-commerce Telegram',
    description: 'Продвижение товаров через Telegram каналы и магазины.',
    category: 'arbitrage',
    icon: <ShoppingBag className="w-6 h-6" />,
    color: '#00B8D4',
    platforms: ['telegram'],
    minAccounts: 1,
    minQuality: 40,
    estimatedROI: { min: 20, max: 150, period: 'день' },
    riskLevel: 'low',
    setupTime: '1 час',
    features: ['Низкий риск', 'Дропшиппинг', 'CPA сети', 'Магазин в TG'],
    warnings: ['Конкуренция', 'Требуются фото товаров'],
    requirements: ['Telegram канал', 'Качество 40+'],
    requiresLinks: false,
    recommended: true,
  },
  // ========== CONTENT ==========
  {
    id: 'channel_network',
    name: 'Сеть каналов',
    description: 'Создание сети взаимосвязанных каналов для перекрёстного продвижения.',
    category: 'content',
    icon: <Network className="w-6 h-6" />,
    color: '#E91E63',
    platforms: ['telegram'],
    minAccounts: 5,
    minQuality: 35,
    estimatedROI: { min: 100, max: 2000, period: 'мес' },
    riskLevel: 'low',
    setupTime: '1 неделя',
    features: ['Долгосрочный актив', 'Продажа рекламы', 'Пассивный доход', 'Рост капитализации'],
    warnings: ['Требует времени на рост', 'Нужен контент'],
    requirements: ['Минимум 5 каналов', 'Регулярный контент'],
    requiresLinks: true,
    recommended: true,
  },
  {
    id: 'tiktok_reels',
    name: 'TikTok → Instagram Reels',
    description: 'Создание вирусного контента в TikTok с переливом в Instagram.',
    category: 'content',
    icon: <Music className="w-6 h-6" />,
    color: '#000000',
    platforms: ['tiktok', 'instagram'],
    minAccounts: 2,
    minQuality: 30,
    estimatedROI: { min: 50, max: 500, period: 'мес' },
    riskLevel: 'low',
    setupTime: '2-3 часа',
    features: ['Вирусный охват', 'AI-генерация контента', 'Авто-публикация', 'Рост подписчиков'],
    warnings: ['Нужен креативный подход', 'Требует регулярности'],
    requirements: ['TikTok аккаунт', 'Instagram бизнес'],
    requiresLinks: true,
    new: true,
  },
  {
    id: 'youtube_shorts',
    name: 'YouTube Shorts + Telegram',
    description: 'Монетизация YouTube Shorts с переливом трафика в Telegram.',
    category: 'content',
    icon: <Tv className="w-6 h-6" />,
    color: '#FF0000',
    platforms: ['youtube', 'telegram'],
    minAccounts: 2,
    minQuality: 25,
    estimatedROI: { min: 30, max: 300, period: 'мес' },
    riskLevel: 'low',
    setupTime: '2 часа',
    features: ['YouTube Partner Program', 'Бонусы за Shorts', 'TG монетизация', 'Пассивный доход'],
    warnings: ['Требует времени на рост', 'Нужен регулярный контент'],
    requirements: ['YouTube канал 1000+ подписчиков', 'Telegram канал'],
    requiresLinks: true,
  },
  // ========== SERVICE ==========
  {
    id: 'ofm_chatter',
    name: 'OFM Чаттер',
    description: 'Переписка с фанатами моделей OnlyFans. Высокий доход с PPV.',
    category: 'service',
    icon: <Heart className="w-6 h-6" />,
    color: '#FF6B9D',
    platforms: ['telegram'],
    minAccounts: 1,
    minQuality: 50,
    estimatedROI: { min: 500, max: 2000, period: 'мес' },
    riskLevel: 'low',
    setupTime: '30 минут',
    features: ['Высокая оплата PPV', 'Бонусы от моделей', 'Гибкий график', 'Обучение'],
    warnings: ['Нужен английский', 'Требует навыков общения'],
    requirements: ['Аккаунт 14+ дней', 'Качество 50+'],
    requiresLinks: false,
    popular: true,
  },
  {
    id: 'influencer_manager',
    name: 'Influencer Manager',
    description: 'Управление аккаунтами блогеров: комментинг, комьюнити, активность.',
    category: 'service',
    icon: <Star className="w-6 h-6" />,
    color: '#FF9500',
    platforms: ['instagram', 'tiktok', 'telegram'],
    minAccounts: 1,
    minQuality: 70,
    estimatedROI: { min: 200, max: 1000, period: 'мес' },
    riskLevel: 'low',
    setupTime: '30 минут',
    features: ['Минимальный риск', 'Долгосрочное сотрудничество', 'Рост аккаунтов', 'Бонусы'],
    warnings: ['Требует качественных аккаунтов', 'Навыки общения'],
    requirements: ['Качество 70+', 'Аккаунт 30+ дней'],
    requiresLinks: false,
  },
  {
    id: 'commenting_service',
    name: 'Комментинг сервис',
    description: 'Массовое комментирование для продвижения товаров и услуг.',
    category: 'service',
    icon: <MessageSquare className="w-6 h-6" />,
    color: '#795548',
    platforms: ['instagram', 'telegram', 'tiktok'],
    minAccounts: 5,
    minQuality: 30,
    estimatedROI: { min: 30, max: 100, period: 'день' },
    riskLevel: 'medium',
    setupTime: '30 минут',
    features: ['Быстрый старт', 'Много заказов', 'Гибкий график', 'Автоматизация'],
    warnings: ['Риск бана при спаме', 'Требует много аккаунтов'],
    requirements: ['Минимум 5 аккаунтов', 'Прокси для каждого'],
    requiresLinks: false,
  },
  // ========== PASSIVE ==========
  {
    id: 'p2p_rent',
    name: 'P2P Аренда аккаунтов',
    description: 'Сдача аккаунтов в аренду другим арбитражникам. Пассивный доход.',
    category: 'passive',
    icon: <Users className="w-6 h-6" />,
    color: '#00D26A',
    platforms: ['telegram', 'instagram'],
    minAccounts: 1,
    minQuality: 30,
    estimatedROI: { min: 5, max: 12, period: 'день/акк' },
    riskLevel: 'low',
    setupTime: '5 минут',
    features: ['Пассивный доход', 'Минимальный риск', 'Гибкий график', 'Страховка от блоков'],
    warnings: [],
    requirements: ['Аккаунт 7+ дней', 'Наличие аватара'],
    requiresLinks: false,
    recommended: true,
    popular: true,
  },
  {
    id: 'crypto_p2p',
    name: 'Crypto P2P Арбитраж',
    description: 'P2P торговля криптовалютой через Telegram. Спреды 2-5%.',
    category: 'passive',
    icon: <Wallet className="w-6 h-6" />,
    color: '#9C27B0',
    platforms: ['telegram'],
    minAccounts: 3,
    minQuality: 65,
    estimatedROI: { min: 100, max: 500, period: 'день' },
    riskLevel: 'medium',
    setupTime: '3 часа',
    features: ['Без офферов', 'Спреды 2-5%', 'Быстрые сделки', 'Минимальные риски бана'],
    warnings: ['Требует оборотный капитал', 'Нужны верифицированные карты'],
    requirements: ['3+ аккаунта', 'Качество 65+', 'Капитал от $500'],
    requiresLinks: false,
  },
  {
    id: 'referral_network',
    name: 'Реферальная сеть',
    description: 'Построение реферальной сети в различных проектах.',
    category: 'passive',
    icon: <GitBranch className="w-6 h-6" />,
    color: '#607D8B',
    platforms: ['telegram'],
    minAccounts: 1,
    minQuality: 40,
    estimatedROI: { min: 50, max: 500, period: 'мес' },
    riskLevel: 'low',
    setupTime: '1 час',
    features: ['Пассивный доход', 'Масштабирование', 'Минимальные риски', 'Много проектов'],
    warnings: ['Требует времени на построение'],
    requirements: ['Качество 40+'],
    requiresLinks: false,
  },
  // ========== HYBRID ==========
  {
    id: 'traffic_pour',
    name: 'Пролив трафика',
    description: 'Комплексный пролив: TikTok → Instagram → Telegram → Оффер.',
    category: 'hybrid',
    icon: <ArrowRightLeft className="w-6 h-6" />,
    color: '#FF6B35',
    platforms: ['tiktok', 'instagram', 'telegram'],
    minAccounts: 6,
    minQuality: 40,
    estimatedROI: { min: 100, max: 800, period: 'день' },
    riskLevel: 'medium',
    setupTime: '4-5 часов',
    features: ['Максимальный охват', 'Воронка трафика', 'AI-автоматизация', 'Высокая конверсия'],
    warnings: ['Сложная настройка', 'Требует много аккаунтов'],
    requirements: ['TikTok аккаунты', 'Instagram аккаунты', 'Telegram каналы'],
    requiresLinks: true,
    new: true,
    recommended: true,
  },
  {
    id: 'content_repurpose',
    name: 'Репостинг контента',
    description: 'Автоматический репостинг контента между платформами с AI-адаптацией.',
    category: 'hybrid',
    icon: <Layers className="w-6 h-6" />,
    color: '#00BCD4',
    platforms: ['tiktok', 'instagram', 'youtube', 'telegram'],
    minAccounts: 4,
    minQuality: 25,
    estimatedROI: { min: 50, max: 400, period: 'мес' },
    riskLevel: 'low',
    setupTime: '2 часа',
    features: ['AI-адаптация', 'Авто-публикация', '4 платформы', 'Минимальные усилия'],
    warnings: ['Требуется исходный контент'],
    requirements: ['Аккаунты на 4 платформах', 'Источник контента'],
    requiresLinks: true,
    new: true,
  },
  {
    id: 'cross_promo',
    name: 'Кросс-промо сеть',
    description: 'Взаимное продвижение аккаунтов в разных нишах.',
    category: 'hybrid',
    icon: <Link2 className="w-6 h-6" />,
    color: '#8BC34A',
    platforms: ['telegram', 'instagram', 'tiktok'],
    minAccounts: 6,
    minQuality: 35,
    estimatedROI: { min: 100, max: 600, period: 'мес' },
    riskLevel: 'low',
    setupTime: '3 часа',
    features: ['Взаимный рост', 'Обмен аудиторией', 'Низкий риск', 'Долгосрочный эффект'],
    warnings: ['Требует координации'],
    requirements: ['Минимум 6 аккаунтов', 'Разные ниши'],
    requiresLinks: true,
  },
];

// Шаги визарда
const WIZARD_STEPS = [
  { id: 1, title: 'Схема', description: 'Выберите схему монетизации', icon: <Target className="w-4 h-4" /> },
  { id: 2, title: 'Аккаунты', description: 'Добавьте аккаунты платформ', icon: <Users className="w-4 h-4" /> },
  { id: 3, title: 'Связки', description: 'Настройте связи аккаунтов', icon: <Link2 className="w-4 h-4" /> },
  { id: 4, title: 'Настройки', description: 'Параметры кампании', icon: <Settings className="w-4 h-4" /> },
  { id: 5, title: 'Запуск', description: 'Проверка и старт', icon: <Rocket className="w-4 h-4" /> },
];

// ==================== КОМПОНЕНТЫ ====================

function PlatformIcon({ platform, size = 'md' }: { platform: Platform; size?: 'sm' | 'md' | 'lg' }) {
  const config = PLATFORM_CONFIG[platform];
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  return (
    <div style={{ color: config.color }} className={sizeClass}>
      {config.icon}
    </div>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const config = {
    low: { bg: 'bg-[#00D26A]/20', text: 'text-[#00D26A]', label: 'Низкий' },
    medium: { bg: 'bg-[#FFB800]/20', text: 'text-[#FFB800]', label: 'Средний' },
    high: { bg: 'bg-[#FF4D4D]/20', text: 'text-[#FF4D4D]', label: 'Высокий' },
  };
  const c = config[risk];
  return <Badge className={cn(c.bg, c.text)}>Риск: {c.label}</Badge>;
}

function CategoryBadge({ category }: { category: MonetizationScheme['category'] }) {
  const config = {
    arbitrage: { bg: 'bg-[#FFB800]/20', text: 'text-[#FFB800]', label: 'Арбитраж' },
    content: { bg: 'bg-[#6C63FF]/20', text: 'text-[#6C63FF]', label: 'Контент' },
    service: { bg: 'bg-[#00B8D4]/20', text: 'text-[#00B8D4]', label: 'Услуги' },
    passive: { bg: 'bg-[#00D26A]/20', text: 'text-[#00D26A]', label: 'Пассивный' },
    hybrid: { bg: 'bg-[#FF6B35]/20', text: 'text-[#FF6B35]', label: 'Гибрид' },
  };
  const c = config[category];
  return <Badge className={cn(c.bg, c.text)}>{c.label}</Badge>;
}

function SchemeCard({
  scheme,
  isSelected,
  isCompatible,
  onSelect,
}: {
  scheme: MonetizationScheme;
  isSelected: boolean;
  isCompatible: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all border-2',
        isSelected
          ? 'bg-[#6C63FF]/10 border-[#6C63FF]'
          : isCompatible
          ? 'bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50'
          : 'bg-[#14151A] border-[#2A2B32] opacity-50'
      )}
      onClick={() => isCompatible && onSelect()}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${scheme.color}20`, color: scheme.color }}
            >
              {scheme.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-white">{scheme.name}</h3>
                {scheme.recommended && (
                  <Badge className="bg-[#00D26A]/20 text-[#00D26A] text-xs">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Рекомендуем
                  </Badge>
                )}
                {scheme.popular && (
                  <Badge className="bg-[#FFB800]/20 text-[#FFB800] text-xs">
                    <Flame className="w-3 h-3 mr-1" />
                    Популярный
                  </Badge>
                )}
                {scheme.new && (
                  <Badge className="bg-[#6C63FF]/20 text-[#6C63FF] text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Новый
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[#8A8A8A] mt-1">{scheme.description}</p>
            </div>
          </div>
          {isSelected && <CheckCircle className="w-6 h-6 text-[#6C63FF]" />}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <CategoryBadge category={scheme.category} />
          <RiskBadge risk={scheme.riskLevel} />
          <Badge variant="outline" className="border-[#8A8A8A] text-[#8A8A8A]">
            {scheme.setupTime}
          </Badge>
          <Badge className="bg-[#00D26A]/20 text-[#00D26A]">
            ${scheme.estimatedROI.min}-{scheme.estimatedROI.max}/{scheme.estimatedROI.period}
          </Badge>
        </div>

        {/* Платформы */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-[#8A8A8A]">Платформы:</span>
          <div className="flex gap-1">
            {scheme.platforms.map((p) => (
              <Badge key={p} variant="outline" className="border-[#2A2B32] text-xs">
                <PlatformIcon platform={p} size="sm" />
                <span className="ml-1">{PLATFORM_CONFIG[p].name}</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Требует связки */}
        {scheme.requiresLinks && (
          <div className="flex items-center gap-2 text-xs text-[#6C63FF] mb-3">
            <Link2 className="w-3 h-3" />
            <span>Требует настройки связок аккаунтов</span>
          </div>
        )}

        {/* Предупреждение о несовместимости */}
        {!isCompatible && (
          <div className="p-2 bg-[#FF4D4D]/10 rounded-lg border border-[#FF4D4D]/30">
            <div className="flex items-center gap-2 text-[#FF4D4D] text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Нужно {scheme.minAccounts} аккаунт(ов) с качеством {scheme.minQuality}+</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountCard({
  account,
  onRemove,
  onAnalyze,
  onAddProxy,
}: {
  account: PlatformAccount;
  onRemove: () => void;
  onAnalyze: () => void;
  onAddProxy: () => void;
}) {
  const statusColors = {
    pending: 'bg-gray-500',
    analyzing: 'bg-yellow-500 animate-pulse',
    ready: 'bg-green-500',
    error: 'bg-red-500',
    warming: 'bg-blue-500',
    active: 'bg-[#00D26A]',
  };

  const riskColors = {
    low: 'text-[#00D26A]',
    medium: 'text-[#FFB800]',
    high: 'text-[#FF4D4D]',
  };

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-3 h-3 rounded-full', statusColors[account.status])} />
            <PlatformIcon platform={account.platform} />
            <div>
              <p className="font-medium text-white">@{account.username}</p>
              {account.phone && <p className="text-xs text-[#8A8A8A]">{account.phone}</p>}
            </div>
            {account.verified && <CheckCircle className="w-4 h-4 text-[#6C63FF]" />}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onAddProxy} className="h-7 w-7 p-0">
              <Wifi className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onRemove} className="h-7 w-7 p-0">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        {account.proxy && (
          <Badge
            variant="outline"
            className={cn(
              'mb-3',
              account.proxy.status === 'active'
                ? 'border-[#00D26A] text-[#00D26A]'
                : 'border-[#FF4D4D] text-[#FF4D4D]'
            )}
          >
            {account.proxy.type.toUpperCase()} {account.proxy.host}:{account.proxy.port}
          </Badge>
        )}

        {account.quality && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8A8A8A]">Качество</span>
              <span className={cn('font-bold', riskColors[account.quality.riskLevel])}>
                {account.quality.score}/100
              </span>
            </div>
            <Progress value={account.quality.score} className="h-2" />

            {account.quality.needsWarming && (
              <div className="p-2 bg-[#FFB800]/10 rounded-lg border border-[#FFB800]/30 text-xs">
                <div className="flex items-center gap-2 text-[#FFB800]">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Прогрев: {account.quality.warmingDays} дней</span>
                </div>
              </div>
            )}
          </div>
        )}

        {account.status === 'pending' && (
          <Button size="sm" className="w-full mt-3 bg-[#6C63FF]" onClick={onAnalyze}>
            <Activity className="w-4 h-4 mr-2" />
            Анализировать
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ProxyDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (proxy: ProxyConfig) => void;
}) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState<'socks5' | 'http'>('socks5');

  const handleSave = () => {
    if (!host || !port) {
      toast.error('Заполните хост и порт');
      return;
    }
    onSave({
      host,
      port: parseInt(port),
      username: username || undefined,
      password: password || undefined,
      type,
      status: 'active',
    });
    onClose();
    setHost('');
    setPort('');
    setUsername('');
    setPassword('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-[#6C63FF]" />
            Добавить прокси
          </DialogTitle>
          <DialogDescription>
            Индивидуальный прокси защищает аккаунт от бана
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Хост</Label>
              <Input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.1"
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
            <div className="space-y-2">
              <Label>Порт</Label>
              <Input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="1080"
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Логин (опционально)</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
            <div className="space-y-2">
              <Label>Пароль (опционально)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Тип прокси</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'socks5' | 'http')}>
              <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                <SelectItem value="socks5">SOCKS5 (рекомендуется)</SelectItem>
                <SelectItem value="http">HTTP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 bg-[#00D26A]/10 rounded-lg border border-[#00D26A]/30">
            <div className="flex items-start gap-2 text-sm">
              <Shield className="w-4 h-4 text-[#00D26A] mt-0.5" />
              <div className="text-[#8A8A8A]">
                <p className="text-white font-medium mb-1">Важно для выживаемости:</p>
                <p>1 аккаунт = 1 IP. Это снижает риск бана на 80%.</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-[#6C63FF]" onClick={handleSave}>Добавить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddAccountDialog({
  open,
  onClose,
  onAdd,
  selectedPlatforms,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (accounts: { platform: Platform; username: string; phone?: string }[]) => void;
  selectedPlatforms: Platform[];
}) {
  const [platform, setPlatform] = useState<Platform>(selectedPlatforms[0] || 'telegram');
  const [inputMode, setInputMode] = useState<'single' | 'bulk'>('single');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [bulkText, setBulkText] = useState('');

  const handleAdd = () => {
    if (inputMode === 'single') {
      if (!username) {
        toast.error('Введите username');
        return;
      }
      onAdd([{ platform, username, phone: phone || undefined }]);
      setUsername('');
      setPhone('');
    } else {
      const lines = bulkText.split('\n').filter((l) => l.trim());
      if (lines.length === 0) {
        toast.error('Добавьте хотя бы один аккаунт');
        return;
      }
      const accounts = lines.map((line) => {
        const parts = line.split(/[;,|\t]/).map((p) => p.trim());
        return { platform, username: parts[0], phone: parts[1] };
      });
      onAdd(accounts);
      setBulkText('');
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#6C63FF]" />
            Добавить аккаунты
          </DialogTitle>
          <DialogDescription>
            Добавьте аккаунты для работы схемы
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Выбор платформы */}
          <div className="space-y-2">
            <Label>Платформа</Label>
            <div className="flex flex-wrap gap-2">
              {selectedPlatforms.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={platform === p ? 'default' : 'outline'}
                  onClick={() => setPlatform(p)}
                  className={platform === p ? 'bg-[#6C63FF]' : 'border-[#2A2B32]'}
                >
                  <PlatformIcon platform={p} size="sm" />
                  <span className="ml-1">{PLATFORM_CONFIG[p].name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={inputMode === 'single' ? 'default' : 'outline'}
              onClick={() => setInputMode('single')}
              className={inputMode === 'single' ? 'bg-[#6C63FF]' : 'border-[#2A2B32]'}
            >
              Один
            </Button>
            <Button
              size="sm"
              variant={inputMode === 'bulk' ? 'default' : 'outline'}
              onClick={() => setInputMode('bulk')}
              className={inputMode === 'bulk' ? 'bg-[#6C63FF]' : 'border-[#2A2B32]'}
            >
              Массовый импорт
            </Button>
          </div>

          {inputMode === 'single' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username"
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>
              {platform === 'telegram' && (
                <div className="space-y-2">
                  <Label>Телефон (опционально)</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+79991234567"
                    className="bg-[#1E1F26] border-[#2A2B32]"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Список аккаунтов</Label>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="username1&#10;username2&#10;username3"
                className="bg-[#1E1F26] border-[#2A2B32] min-h-[120px]"
              />
              <p className="text-xs text-[#8A8A8A]">Один username на строку</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-[#6C63FF]" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Компонент связки аккаунтов
function AccountLinkEditor({
  accounts,
  links,
  onAddLink,
  onRemoveLink,
  requiredPlatforms,
}: {
  accounts: PlatformAccount[];
  links: AccountLink[];
  onAddLink: (link: Omit<AccountLink, 'id'>) => void;
  onRemoveLink: (id: string) => void;
  requiredPlatforms: Platform[];
}) {
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkStrategy, setNewLinkStrategy] = useState<AccountLink['strategy']>('cross-promotion');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  const strategyLabels = {
    'cross-promotion': 'Кросс-промо',
    'funnel': 'Воронка',
    'traffic-pour': 'Пролив',
    'content-repurpose': 'Репостинг',
  };

  const handleAddLink = () => {
    if (!newLinkName) {
      toast.error('Введите название связки');
      return;
    }
    if (selectedSources.length === 0 || selectedTargets.length === 0) {
      toast.error('Выберите источники и приёмники');
      return;
    }

    onAddLink({
      name: newLinkName,
      sourceAccounts: accounts.filter((a) => selectedSources.includes(a.id)),
      targetAccounts: accounts.filter((a) => selectedTargets.includes(a.id)),
      strategy: newLinkStrategy,
      description: `${strategyLabels[newLinkStrategy]}: ${selectedSources.length} → ${selectedTargets.length}`,
    });

    setNewLinkName('');
    setSelectedSources([]);
    setSelectedTargets([]);
  };

  return (
    <div className="space-y-4">
      {/* Существующие связки */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link) => (
            <Card key={link.id} className="bg-[#1E1F26] border-[#2A2B32]">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-[#6C63FF]" />
                      <span className="font-medium text-white">{link.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {strategyLabels[link.strategy]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#8A8A8A]">
                      <span>{link.sourceAccounts.length} источник(ов)</span>
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>{link.targetAccounts.length} приёмник(ов)</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveLink(link.id)}
                    className="text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Добавление новой связки */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="p-4 space-y-4">
          <h4 className="font-medium text-white">Создать связку</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Название</Label>
              <Input
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
                placeholder="Например: TikTok → TG"
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Стратегия</Label>
              <Select value={newLinkStrategy} onValueChange={(v) => setNewLinkStrategy(v as AccountLink['strategy'])}>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectItem value="cross-promotion">Кросс-промо</SelectItem>
                  <SelectItem value="funnel">Воронка</SelectItem>
                  <SelectItem value="traffic-pour">Пролив трафика</SelectItem>
                  <SelectItem value="content-repurpose">Репостинг контента</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-[#8A8A8A]">Источники (откуда идёт трафик)</Label>
              <ScrollArea className="h-[120px] border border-[#2A2B32] rounded-lg p-2">
                {accounts.filter((a) => a.status === 'ready').map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-2 p-2 hover:bg-[#1E1F26] rounded cursor-pointer"
                    onClick={() => {
                      setSelectedSources((prev) =>
                        prev.includes(account.id)
                          ? prev.filter((id) => id !== account.id)
                          : [...prev, account.id]
                      );
                    }}
                  >
                    <Checkbox checked={selectedSources.includes(account.id)} />
                    <PlatformIcon platform={account.platform} size="sm" />
                    <span className="text-sm text-white">@{account.username}</span>
                  </div>
                ))}
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[#8A8A8A]">Приёмники (куда идёт трафик)</Label>
              <ScrollArea className="h-[120px] border border-[#2A2B32] rounded-lg p-2">
                {accounts.filter((a) => a.status === 'ready').map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-2 p-2 hover:bg-[#1E1F26] rounded cursor-pointer"
                    onClick={() => {
                      setSelectedTargets((prev) =>
                        prev.includes(account.id)
                          ? prev.filter((id) => id !== account.id)
                          : [...prev, account.id]
                      );
                    }}
                  >
                    <Checkbox checked={selectedTargets.includes(account.id)} />
                    <PlatformIcon platform={account.platform} size="sm" />
                    <span className="text-sm text-white">@{account.username}</span>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>

          <Button onClick={handleAddLink} className="w-full bg-[#6C63FF]">
            <Plus className="w-4 h-4 mr-2" />
            Добавить связку
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function UnifiedAutoEarnWizard() {
  // Состояния
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedScheme, setSelectedScheme] = useState<MonetizationScheme | null>(null);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [links, setLinks] = useState<AccountLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    budget: 10000,
    geo: ['RU'],
    niche: '',
    dailyLimit: 100,
    autoScale: true,
    pauseOnHighRisk: true,
    autoWarming: true,
    proxyMonitoring: true,
  });

  // Диалоги
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [proxyDialogOpen, setProxyDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const [launchResult, setLaunchResult] = useState<Record<string, unknown> | null>(null);

  // Группировка аккаунтов по платформам
  const accountsByPlatform = useMemo(() => {
    const grouped: Partial<Record<Platform, PlatformAccount[]>> = {};
    accounts.forEach((acc) => {
      if (!grouped[acc.platform]) grouped[acc.platform] = [];
      grouped[acc.platform]!.push(acc);
    });
    return grouped;
  }, [accounts]);

  // Совместимость схемы
  const schemeCompatibility = useMemo(() => {
    const readyAccounts = accounts.filter(
      (a) => a.status === 'ready' && (a.quality?.score || 0) >= 30
    );
    return {
      totalReady: readyAccounts.length,
      byPlatform: Object.fromEntries(
        (Object.keys(PLATFORM_CONFIG) as Platform[]).map((p) => [
          p,
          readyAccounts.filter((a) => a.platform === p).length,
        ])
      ) as Record<Platform, number>,
    };
  }, [accounts]);

  // Проверка совместимости
  const isSchemeCompatible = (scheme: MonetizationScheme) => {
    const readyAccounts = accounts.filter(
      (a) =>
        a.status === 'ready' &&
        (a.quality?.score || 0) >= scheme.minQuality
    );
    return readyAccounts.length >= scheme.minAccounts;
  };

  // Валидация шага
  const validateStep = useCallback((): boolean => {
    switch (currentStep) {
      case 1:
        return selectedScheme !== null;
      case 2:
        const readyAccounts = accounts.filter((a) => a.status === 'ready');
        return readyAccounts.length >= (selectedScheme?.minAccounts || 1);
      case 3:
        // Связки обязательны только если требуются
        if (selectedScheme?.requiresLinks) {
          return links.length > 0;
        }
        return true;
      case 4:
        return settings.budget > 0 && settings.geo.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedScheme, accounts, links, settings]);

  // Навигация
  const nextStep = useCallback(() => {
    if (!validateStep()) {
      toast.error('Заполните все обязательные поля');
      return;
    }
    // Пропускаем шаг связок если не требуется
    if (currentStep === 2 && selectedScheme && !selectedScheme.requiresLinks) {
      setCurrentStep(4);
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  }, [validateStep, currentStep, selectedScheme]);

  const prevStep = useCallback(() => {
    if (currentStep === 4 && selectedScheme && !selectedScheme.requiresLinks) {
      setCurrentStep(2);
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
    }
  }, [currentStep, selectedScheme]);

  // Добавление аккаунтов
  const handleAddAccounts = useCallback(
    (newAccounts: { platform: Platform; username: string; phone?: string }[]) => {
      const accountsToAdd: PlatformAccount[] = newAccounts.map((a) => ({
        id: `acc-${Date.now()}-${Math.random()}`,
        platform: a.platform,
        username: a.username,
        phone: a.phone,
        status: 'pending' as const,
        quality: null,
      }));
      setAccounts((prev) => [...prev, ...accountsToAdd]);
      toast.success(`Добавлено ${newAccounts.length} аккаунт(ов)`);
    },
    []
  );

  // Анализ аккаунта
  const handleAnalyzeAccount = useCallback(async (accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId ? { ...a, status: 'analyzing' as const } : a
      )
    );

    await new Promise((r) => setTimeout(r, 2000));

    const quality: AccountQuality = {
      score: Math.floor(Math.random() * 50) + 30,
      age: Math.floor(Math.random() * 365) + 1,
      hasAvatar: Math.random() > 0.3,
      hasUsername: Math.random() > 0.2,
      lastActive: new Date(),
      riskLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      recommendations: [],
      needsWarming: Math.random() > 0.5,
      warmingDays: Math.floor(Math.random() * 7) + 3,
    };

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId ? { ...a, status: 'ready' as const, quality } : a
      )
    );

    toast.success(`Аккаунт проанализирован: качество ${quality.score}`);
  }, []);

  // Добавление прокси
  const handleAddProxy = useCallback((proxy: ProxyConfig) => {
    if (!selectedAccountId) return;
    setAccounts((prev) =>
      prev.map((a) => (a.id === selectedAccountId ? { ...a, proxy } : a))
    );
    toast.success('Прокси добавлен');
  }, [selectedAccountId]);

  // Удаление аккаунта
  const handleRemoveAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Добавление связки
  const handleAddLink = useCallback((link: Omit<AccountLink, 'id'>) => {
    const newLink: AccountLink = { ...link, id: `link-${Date.now()}` };
    setLinks((prev) => [...prev, newLink]);
    toast.success('Связка создана');
  }, []);

  // Удаление связки
  const handleRemoveLink = useCallback((id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // Запуск кампании
  const handleLaunch = useCallback(async () => {
    if (!selectedScheme) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auto-earn/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemeId: selectedScheme.id,
          accounts: accounts.map((a) => ({
            platform: a.platform,
            username: a.username,
            phone: a.phone,
            proxy: a.proxy,
          })),
          links: links.map((l) => ({
            name: l.name,
            strategy: l.strategy,
            sourceAccountIds: l.sourceAccounts.map((a) => a.id),
            targetAccountIds: l.targetAccounts.map((a) => a.id),
          })),
          settings,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLaunchResult(data);
        toast.success('Кампания успешно запущена!');
      } else {
        throw new Error(data.error || 'Ошибка запуска');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка запуска кампании');
    } finally {
      setLoading(false);
    }
  }, [selectedScheme, accounts, links, settings]);

  // Рендер шага
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Выберите схему монетизации</h3>
              <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
                {MONETIZATION_SCHEMES.length} схем
              </Badge>
            </div>

            {/* Фильтры по категориям */}
            <div className="flex flex-wrap gap-2 mb-4">
              {['all', 'arbitrage', 'content', 'service', 'passive', 'hybrid'].map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant="outline"
                  className="border-[#2A2B32]"
                >
                  {cat === 'all' ? 'Все' : cat === 'arbitrage' ? 'Арбитраж' : cat === 'content' ? 'Контент' : cat === 'service' ? 'Услуги' : cat === 'passive' ? 'Пассивный' : 'Гибрид'}
                </Button>
              ))}
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {MONETIZATION_SCHEMES.map((scheme) => (
                  <SchemeCard
                    key={scheme.id}
                    scheme={scheme}
                    isSelected={selectedScheme?.id === scheme.id}
                    isCompatible={true}
                    onSelect={() => setSelectedScheme(scheme)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Аккаунты платформ</h3>
                <p className="text-sm text-[#8A8A8A]">
                  Добавьте аккаунты для:{' '}
                  {selectedScheme?.platforms.map((p) => PLATFORM_CONFIG[p].name).join(', ')}
                </p>
              </div>
              <Button
                onClick={() => setAddAccountOpen(true)}
                className="bg-[#6C63FF]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </div>

            {/* Статистика по платформам */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
              {selectedScheme?.platforms.map((p) => (
                <Card key={p} className="bg-[#1E1F26] border-[#2A2B32]">
                  <CardContent className="p-3 text-center">
                    <PlatformIcon platform={p} />
                    <p className="text-xs text-[#8A8A8A] mt-1">{PLATFORM_CONFIG[p].name}</p>
                    <p className="text-lg font-bold text-white">
                      {accountsByPlatform[p]?.length || 0}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Список аккаунтов */}
            <ScrollArea className="h-[400px] pr-4">
              {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#8A8A8A]">
                  <Users className="w-12 h-12 mb-4 opacity-50" />
                  <p>Нет добавленных аккаунтов</p>
                  <Button
                    variant="outline"
                    onClick={() => setAddAccountOpen(true)}
                    className="mt-4 border-[#6C63FF] text-[#6C63FF]"
                  >
                    Добавить первый аккаунт
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {accounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onRemove={() => handleRemoveAccount(account.id)}
                      onAnalyze={() => handleAnalyzeAccount(account.id)}
                      onAddProxy={() => {
                        setSelectedAccountId(account.id);
                        setProxyDialogOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Требования */}
            <div className="bg-[#1E1F26] rounded-lg p-4">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#FFB800]" />
                Требования схемы
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#8A8A8A]">Мин. аккаунтов:</span>
                  <span className="text-white ml-2">{selectedScheme?.minAccounts}</span>
                </div>
                <div>
                  <span className="text-[#8A8A8A]">Мин. качество:</span>
                  <span className="text-white ml-2">{selectedScheme?.minQuality}+</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Связки аккаунтов</h3>
                <p className="text-sm text-[#8A8A8A]">
                  Настройте связи между аккаунтами для перекрёстного продвижения
                </p>
              </div>
            </div>

            <AccountLinkEditor
              accounts={accounts}
              links={links}
              onAddLink={handleAddLink}
              onRemoveLink={handleRemoveLink}
              requiredPlatforms={selectedScheme?.platforms || []}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Настройки кампании</h3>

            <div className="grid gap-6">
              {/* Бюджет */}
              <div>
                <Label className="text-white font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#6C63FF]" />
                  Бюджет
                </Label>
                <Input
                  type="number"
                  value={settings.budget}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, budget: parseInt(e.target.value) || 0 }))
                  }
                  className="bg-[#1E1F26] border-[#2A2B32] text-white text-lg font-semibold mt-2"
                />
              </div>

              {/* GEO */}
              <div>
                <Label className="text-white font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#6C63FF]" />
                  Гео (страны)
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['RU', 'UA', 'BY', 'KZ', 'US', 'GB', 'DE', 'FR', 'ES', 'IT', 'BR', 'TR'].map(
                    (geo) => (
                      <Badge
                        key={geo}
                        variant={settings.geo.includes(geo) ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-colors',
                          settings.geo.includes(geo)
                            ? 'bg-[#6C63FF] text-white'
                            : 'border-[#2A2B32] text-[#8A8A8A] hover:border-[#6C63FF]'
                        )}
                        onClick={() => {
                          setSettings((prev) => ({
                            ...prev,
                            geo: prev.geo.includes(geo)
                              ? prev.geo.filter((g) => g !== geo)
                              : [...prev.geo, geo],
                          }));
                        }}
                      >
                        {geo}
                      </Badge>
                    )
                  )}
                </div>
              </div>

              {/* Переключатели */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Авто-масштабирование</p>
                    <p className="text-xs text-[#8A8A8A]">Увеличивать активность при высоком ROI</p>
                  </div>
                  <Switch
                    checked={settings.autoScale}
                    onCheckedChange={(v) => setSettings((prev) => ({ ...prev, autoScale: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Пауза при высоком риске</p>
                    <p className="text-xs text-[#8A8A8A]">Автоматическая остановка при обнаружении угроз</p>
                  </div>
                  <Switch
                    checked={settings.pauseOnHighRisk}
                    onCheckedChange={(v) => setSettings((prev) => ({ ...prev, pauseOnHighRisk: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Авто-прогрев</p>
                    <p className="text-xs text-[#8A8A8A]">Автоматический прогрев новых аккаунтов</p>
                  </div>
                  <Switch
                    checked={settings.autoWarming}
                    onCheckedChange={(v) => setSettings((prev) => ({ ...prev, autoWarming: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Мониторинг прокси</p>
                    <p className="text-xs text-[#8A8A8A]">Автоматическая проверка и замена прокси</p>
                  </div>
                  <Switch
                    checked={settings.proxyMonitoring}
                    onCheckedChange={(v) => setSettings((prev) => ({ ...prev, proxyMonitoring: v }))}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {launchResult ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#00D26A]/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#00D26A]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Кампания запущена!</h3>
                <p className="text-[#8A8A8A]">Автоматический заработок активирован</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-white">Проверка и запуск</h3>

                {/* Сводка */}
                <div className="bg-[#1E1F26] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8A8A]">Схема</span>
                    <span className="text-white font-medium">{selectedScheme?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8A8A]">Аккаунтов</span>
                    <span className="text-white font-medium">{accounts.length}</span>
                  </div>
                  {links.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#8A8A8A]">Связок</span>
                      <span className="text-white font-medium">{links.length}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8A8A]">Бюджет</span>
                    <span className="text-white font-medium">{settings.budget.toLocaleString()} ₽</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8A8A]">Ожидаемый ROI</span>
                    <span className="text-[#00D26A] font-medium">
                      ${selectedScheme?.estimatedROI.min}-${selectedScheme?.estimatedROI.max}/{selectedScheme?.estimatedROI.period}
                    </span>
                  </div>
                </div>

                {/* Предупреждения */}
                {selectedScheme?.warnings && selectedScheme.warnings.length > 0 && (
                  <div className="bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-lg p-4">
                    <h4 className="text-[#FFB800] font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Важно знать
                    </h4>
                    <ul className="text-sm text-[#FFB800]/80 space-y-1">
                      {selectedScheme.warnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-xl flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#FFB800]" />
              Авто-заработок PRO
            </CardTitle>
            <CardDescription className="text-[#8A8A8A]">
              Мульти-платформенная монетизация с AI-автоматизацией
            </CardDescription>
          </div>
        </div>

        {/* Прогресс */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                    currentStep === step.id
                      ? 'bg-[#6C63FF] text-white'
                      : currentStep > step.id
                      ? 'bg-[#00D26A]/20 text-[#00D26A]'
                      : 'bg-[#1E1F26] text-[#8A8A8A]'
                  )}
                >
                  {step.icon}
                  <span className="hidden md:inline text-sm">{step.title}</span>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 mx-1',
                      currentStep > step.id ? 'text-[#00D26A]' : 'text-[#2A2B32]'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-[400px]">{renderStep()}</CardContent>

      <CardFooter className="flex items-center justify-between border-t border-[#2A2B32] pt-4">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1 || loading}
          className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        {currentStep < 5 ? (
          <Button
            onClick={nextStep}
            disabled={!validateStep() || loading}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            Далее
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : !launchResult ? (
          <Button
            onClick={handleLaunch}
            disabled={loading}
            className="bg-[#00D26A] hover:bg-[#00D26A]/80"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Запуск...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Запустить
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => window.location.reload()}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            Создать ещё
          </Button>
        )}
      </CardFooter>

      {/* Диалоги */}
      <AddAccountDialog
        open={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onAdd={handleAddAccounts}
        selectedPlatforms={selectedScheme?.platforms || ['telegram']}
      />

      <ProxyDialog
        open={proxyDialogOpen}
        onClose={() => setProxyDialogOpen(false)}
        onSave={handleAddProxy}
      />

      <AlertDialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
        <AlertDialogContent className="bg-[#14151A] border-[#2A2B32]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Подтверждение запуска</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8A8A8A]">
              Вы уверены, что хотите запустить автоматический заработок?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1E1F26] border-[#2A2B32]">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#00D26A]"
              onClick={() => {
                setConfirmStartOpen(false);
                handleLaunch();
              }}
            >
              Запустить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

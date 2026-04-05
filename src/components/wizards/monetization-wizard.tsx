'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { toast } from 'sonner';
import {
  Rocket,
  Shield,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Wallet,
  TrendingUp,
  Target,
  Zap,
  Brain,
  Globe,
  Lock,
  Clock,
  Activity,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Settings,
  BarChart3,
  Eye,
  Heart,
  MessageSquare,
  Send,
  Link2,
  Coins,
  CreditCard,
  ShoppingBag,
  Gift,
  Crown,
  Star,
  Award,
  ThumbsUp,
  AlertCircle,
  Info,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  UserCheck,
  Gauge,
  Timer,
  Flame,
  Sparkles,
  Network,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== ТИПЫ ====================

interface Account {
  id: string;
  phone: string;
  username?: string;
  status: 'pending' | 'analyzing' | 'ready' | 'error' | 'warming';
  quality: AccountQuality | null;
  proxy?: ProxyConfig;
  warmingStatus?: WarmingStatus;
}

interface AccountQuality {
  score: number; // 0-100
  age: number; // days
  hasAvatar: boolean;
  hasUsername: boolean;
  contactsCount: number;
  groupsCount: number;
  messagesSent: number;
  lastActive: Date | null;
  riskLevel: 'low' | 'medium' | 'high';
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
  actions: WarmingAction[];
  progress: number;
  startedAt: Date;
  estimatedEnd: Date;
}

interface WarmingAction {
  type: string;
  completed: boolean;
  timestamp?: Date;
}

interface MonetizationMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  minAccounts: number;
  minQuality: number;
  estimatedROI: string;
  riskLevel: 'low' | 'medium' | 'high';
  setupTime: string;
  features: string[];
  warnings: string[];
  requirements: string[];
  recommended?: boolean;
  popular?: boolean;
}

interface WizardState {
  step: number;
  accounts: Account[];
  selectedMethod: string | null;
  setupProgress: number;
  isRunning: boolean;
  logs: LogEntry[];
}

interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

// ==================== ДАННЫЕ МЕТОДОВ МОНЕТИЗАЦИИ ====================

const MONETIZATION_METHODS: MonetizationMethod[] = [
  {
    id: 'p2p_rent',
    name: 'P2P Аренда аккаунтов',
    description: 'Сдавайте аккаунты в аренду другим арбитражникам. Пассивный доход без риска бана.',
    icon: <Users className="w-6 h-6" />,
    color: '#00D26A',
    minAccounts: 1,
    minQuality: 30,
    estimatedROI: '$5-12/день за аккаунт',
    riskLevel: 'low',
    setupTime: '5 минут',
    features: [
      'Пассивный доход',
      'Минимальный риск бана',
      'Гибкий график',
      'Страховка от блоков',
    ],
    warnings: [],
    requirements: [
      'Аккаунт старше 7 дней',
      'Наличие аватара',
    ],
    recommended: true,
    popular: true,
  },
  {
    id: 'ofm_chatter',
    name: 'OFM Чаттер (OnlyFans)',
    description: 'Переписка с фанатами моделей OnlyFans. Высокий доход с PPV контента.',
    icon: <Heart className="w-6 h-6" />,
    color: '#FF6B9D',
    minAccounts: 1,
    minQuality: 50,
    estimatedROI: '$500-2000/мес',
    riskLevel: 'low',
    setupTime: '30 минут',
    features: [
      'Высокая оплата за PPV',
      'Бонусы от моделей',
      'Гибкий график',
      'Обучение предоставляется',
    ],
    warnings: [
      'Требует навыков общения',
      'Нужен разговорный английский',
    ],
    requirements: [
      'Аккаунт старше 14 дней',
      'Качество 50+',
    ],
    popular: true,
  },
  {
    id: 'gambling',
    name: 'Gambling (Казино/Ставки)',
    description: 'Привлечение игроков в казино и букмекеры. CPA и RevShare модели.',
    icon: <Coins className="w-6 h-6" />,
    color: '#FFB800',
    minAccounts: 3,
    minQuality: 60,
    estimatedROI: '$50-500/день',
    riskLevel: 'high',
    setupTime: '1-2 часа',
    features: [
      'Высокий CPA ($50-200)',
      'RevShare до 50%',
      'Много офферов',
      'AI-креативы',
    ],
    warnings: [
      'Высокий риск бана',
      'Требует прогрева',
      'Необходимы прокси',
    ],
    requirements: [
      'Минимум 3 аккаунта',
      'Качество 60+',
      'Индивидуальные прокси',
    ],
  },
  {
    id: 'dating',
    name: 'Dating (Дейтинг)',
    description: 'Привлечение пользователей на дейтинг-платформы. Стабильный доход.',
    icon: <MessageCircle className="w-6 h-6" />,
    color: '#FF4D4D',
    minAccounts: 2,
    minQuality: 45,
    estimatedROI: '$30-200/день',
    riskLevel: 'medium',
    setupTime: '1 час',
    features: [
      'Стабильный спрос',
      'SOI/DOI офферы',
      'Высокая конверсия',
      'Много гео',
    ],
    warnings: [
      'Средний риск бана',
      'Требует качественных креативов',
    ],
    requirements: [
      'Минимум 2 аккаунта',
      'Качество 45+',
    ],
    popular: true,
  },
  {
    id: 'crypto',
    name: 'Crypto (Криптовалюты)',
    description: 'Привлечение рефералов на криптобиржи и проекты. Высокий CPA.',
    icon: <CreditCard className="w-6 h-6" />,
    color: '#6C63FF',
    minAccounts: 2,
    minQuality: 55,
    estimatedROI: '$100-1000/день',
    riskLevel: 'medium',
    setupTime: '2 часа',
    features: [
      'CPA до $500',
      'RevShare до 50%',
      'Быстрые выплаты',
      'Глобальный рынок',
    ],
    warnings: [
      'Требует знаний крипты',
      'Средний риск бана',
    ],
    requirements: [
      'Минимум 2 аккаунта',
      'Качество 55+',
      'Прокси для каждого аккаунта',
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce (Товарка)',
    description: 'Продвижение товаров через Telegram. Дропшиппинг и CPA.',
    icon: <ShoppingBag className="w-6 h-6" />,
    color: '#00B8D4',
    minAccounts: 1,
    minQuality: 40,
    estimatedROI: '$20-150/день',
    riskLevel: 'low',
    setupTime: '1 час',
    features: [
      'Низкий риск бана',
      'Много товарок',
      'Белый метод',
      'Стабильный доход',
    ],
    warnings: [
      'Требует качественных фото',
      'Конкуренция',
    ],
    requirements: [
      'Качество 40+',
      'Прокси рекомендуются',
    ],
  },
  {
    id: 'influencer',
    name: 'Influencer (Блогеры)',
    description: 'Управление аккаунтами блогеров. Комментинг и комьюнити.',
    icon: <Star className="w-6 h-6" />,
    color: '#FF9500',
    minAccounts: 1,
    minQuality: 70,
    estimatedROI: '$200-1000/мес',
    riskLevel: 'low',
    setupTime: '30 минут',
    features: [
      'Минимальный риск',
      'Долгосрочное сотрудничество',
      'Бонусы за активность',
      'Рост аккаунтов',
    ],
    warnings: [
      'Требует качественных аккаунтов',
      'Необходимы навыки общения',
    ],
    requirements: [
      'Качество 70+',
      'Аккаунт старше 30 дней',
    ],
  },
  {
    id: 'nutra',
    name: 'Nutra (Нутра)',
    description: 'Продвижение БАДов, косметики. Высокий ROI на сложных гео.',
    icon: <Gift className="w-6 h-6" />,
    color: '#4CAF50',
    minAccounts: 2,
    minQuality: 50,
    estimatedROI: '$50-300/день',
    riskLevel: 'medium',
    setupTime: '1.5 часа',
    features: [
      'Высокий ROI',
      'Много офферов',
      'Трай-апс',
      'Глобальные гео',
    ],
    warnings: [
      'Требует креативов',
      'Средний риск бана',
    ],
    requirements: [
      'Минимум 2 аккаунта',
      'Качество 50+',
    ],
  },
  {
    id: 'crypto_p2p',
    name: 'Crypto P2P Арбитраж',
    description: 'P2P торговля криптовалютой через Telegram. Спреды 2-5%.',
    icon: <Wallet className="w-6 h-6" />,
    color: '#9C27B0',
    minAccounts: 3,
    minQuality: 65,
    estimatedROI: '$100-500/день',
    riskLevel: 'medium',
    setupTime: '3 часа',
    features: [
      'Без офферов',
      'Спреды 2-5%',
      'Быстрые сделки',
      'Минимальные риски бана',
    ],
    warnings: [
      'Требует оборотный капитал',
      'Нужны верифицированные карты',
    ],
    requirements: [
      'Минимум 3 аккаунта',
      'Качество 65+',
      'Капитал от $500',
    ],
  },
  {
    id: 'affiliate_channel',
    name: 'Арбитраж каналов',
    description: 'Создание и рост Telegram каналов с последующей монетизацией.',
    icon: <TrendingUp className="w-6 h-6" />,
    color: '#E91E63',
    minAccounts: 1,
    minQuality: 35,
    estimatedROI: '$100-2000/мес',
    riskLevel: 'low',
    setupTime: '2 часа',
    features: [
      'Долгосрочный актив',
      'Продажа рекламы',
      'Пассивный доход',
      'Рост капитализации',
    ],
    warnings: [
      'Требует времени на рост',
      'Нужен контент',
    ],
    requirements: [
      'Качество 35+',
      'Постоянный доступ',
    ],
    recommended: true,
  },
  {
    id: 'referal_network',
    name: 'Реферальная сеть',
    description: 'Построение реферальной сети в различных проектах.',
    icon: <Network className="w-6 h-6" />,
    color: '#607D8B',
    minAccounts: 1,
    minQuality: 40,
    estimatedROI: '$50-500/мес',
    riskLevel: 'low',
    setupTime: '1 час',
    features: [
      'Пассивный доход',
      'Масштабирование',
      'Минимальные риски',
      'Много проектов',
    ],
    warnings: [
      'Требует времени на построение',
    ],
    requirements: [
      'Качество 40+',
    ],
  },
  {
    id: 'commenting',
    name: 'Комментинг сервис',
    description: 'Комментирование постов в каналах для продвижения.',
    icon: <MessageSquare className="w-6 h-6" />,
    color: '#795548',
    minAccounts: 5,
    minQuality: 30,
    estimatedROI: '$30-100/день',
    riskLevel: 'medium',
    setupTime: '30 минут',
    features: [
      'Быстрый старт',
      'Много заказов',
      'Гибкий график',
    ],
    warnings: [
      'Риск бана при спаме',
      'Требует много аккаунтов',
    ],
    requirements: [
      'Минимум 5 аккаунтов',
      'Прокси для каждого',
    ],
  },
];

// ==================== КОМПОНЕНТЫ ====================

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = [
    { num: 1, title: 'Аккаунты', icon: <Users className="w-4 h-4" /> },
    { num: 2, title: 'Анализ', icon: <Activity className="w-4 h-4" /> },
    { num: 3, title: 'Выбор метода', icon: <Target className="w-4 h-4" /> },
    { num: 4, title: 'Настройка', icon: <Settings className="w-4 h-4" /> },
    { num: 5, title: 'Запуск', icon: <Rocket className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center">
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
              currentStep === step.num
                ? 'bg-[#6C63FF] text-white'
                : currentStep > step.num
                ? 'bg-[#00D26A]/20 text-[#00D26A]'
                : 'bg-[#1E1F26] text-[#8A8A8A]'
            )}
          >
            {step.icon}
            <span className="hidden md:inline text-sm">{step.title}</span>
          </div>
          {i < steps.length - 1 && (
            <ChevronRight
              className={cn(
                'w-4 h-4 mx-1',
                currentStep > step.num ? 'text-[#00D26A]' : 'text-[#2A2B32]'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function AccountCard({
  account,
  onRemove,
  onAnalyze,
  onAddProxy,
}: {
  account: Account;
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
            <div>
              <p className="font-medium text-white">{account.phone}</p>
              {account.username && (
                <p className="text-sm text-[#8A8A8A]">@{account.username}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onAddProxy}>
              <Wifi className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onRemove}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        {account.proxy && (
          <div className="flex items-center gap-2 mb-3 text-sm">
            <Badge
              variant="outline"
              className={cn(
                account.proxy.status === 'active'
                  ? 'border-[#00D26A] text-[#00D26A]'
                  : 'border-[#FF4D4D] text-[#FF4D4D]'
              )}
            >
              {account.proxy.type.toUpperCase()} {account.proxy.host}:{account.proxy.port}
            </Badge>
          </div>
        )}

        {account.quality && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8A8A8A]">Качество</span>
              <span className={cn('font-bold', riskColors[account.quality.riskLevel])}>
                {account.quality.score}/100
              </span>
            </div>
            <Progress value={account.quality.score} className="h-2" />

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#8A8A8A]" />
                <span className="text-[#8A8A8A]">Возраст: </span>
                <span className="text-white">{account.quality.age} дней</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#8A8A8A]" />
                <span className="text-[#8A8A8A]">Контакты: </span>
                <span className="text-white">{account.quality.contactsCount}</span>
              </div>
            </div>

            {account.quality.needsWarming && (
              <div className="p-2 bg-[#FFB800]/10 rounded-lg border border-[#FFB800]/30">
                <div className="flex items-center gap-2 text-[#FFB800] text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Требуется прогрев: {account.quality.warmingDays} дней</span>
                </div>
              </div>
            )}

            {account.warmingStatus && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8A8A8A]">Прогрев</span>
                  <span className="text-white">
                    День {account.warmingStatus.day}/{account.warmingStatus.totalDays}
                  </span>
                </div>
                <Progress value={account.warmingStatus.progress} className="h-2" />
              </div>
            )}
          </div>
        )}

        {account.status === 'pending' && (
          <Button
            size="sm"
            className="w-full mt-3 bg-[#6C63FF]"
            onClick={onAnalyze}
          >
            <Activity className="w-4 h-4 mr-2" />
            Анализировать
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function MethodCard({
  method,
  isSelected,
  isCompatible,
  accountsReady,
  onSelect,
}: {
  method: MonetizationMethod;
  isSelected: boolean;
  isCompatible: boolean;
  accountsReady: number;
  onSelect: () => void;
}) {
  const riskColors = {
    low: { bg: 'bg-[#00D26A]/20', text: 'text-[#00D26A]', label: 'Низкий' },
    medium: { bg: 'bg-[#FFB800]/20', text: 'text-[#FFB800]', label: 'Средний' },
    high: { bg: 'bg-[#FF4D4D]/20', text: 'text-[#FF4D4D]', label: 'Высокий' },
  };

  const risk = riskColors[method.riskLevel];

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
              style={{ backgroundColor: `${method.color}20`, color: method.color }}
            >
              {method.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-white">{method.name}</h3>
                {method.recommended && (
                  <Badge className="bg-[#00D26A]/20 text-[#00D26A] text-xs">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Рекомендуем
                  </Badge>
                )}
                {method.popular && (
                  <Badge className="bg-[#FFB800]/20 text-[#FFB800] text-xs">
                    <Flame className="w-3 h-3 mr-1" />
                    Популярный
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[#8A8A8A]">{method.description}</p>
            </div>
          </div>
          {isSelected && (
            <CheckCircle className="w-6 h-6 text-[#6C63FF]" />
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={cn(risk.bg, risk.text)}>
            Риск: {risk.label}
          </Badge>
          <Badge variant="outline" className="border-[#8A8A8A] text-[#8A8A8A]">
            {method.setupTime}
          </Badge>
          <Badge className="bg-[#00D26A]/20 text-[#00D26A]">
            {method.estimatedROI}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <p className="text-[#8A8A8A] mb-1">Особенности:</p>
            <ul className="space-y-1">
              {method.features.slice(0, 3).map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-white">
                  <CheckCircle className="w-3 h-3 text-[#00D26A]" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          {method.warnings.length > 0 && (
            <div>
              <p className="text-[#8A8A8A] mb-1">Предупреждения:</p>
              <ul className="space-y-1">
                {method.warnings.slice(0, 3).map((warning, i) => (
                  <li key={i} className="flex items-center gap-2 text-white">
                    <AlertTriangle className="w-3 h-3 text-[#FFB800]" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {!isCompatible && (
          <div className="p-2 bg-[#FF4D4D]/10 rounded-lg border border-[#FF4D4D]/30">
            <div className="flex items-center gap-2 text-[#FF4D4D] text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>
                Нужно {method.minAccounts} аккаунт(ов) с качеством {method.minQuality}+
              </span>
            </div>
          </div>
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
    // Reset
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
                <p>Индивидуальный прокси = 1 аккаунт = 1 IP. Это снижает риск бана на 80%.</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button className="bg-[#6C63FF]" onClick={handleSave}>
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddAccountDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (accounts: { phone: string; username?: string }[]) => void;
}) {
  const [inputMode, setInputMode] = useState<'single' | 'bulk'>('single');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [bulkText, setBulkText] = useState('');

  const handleAdd = () => {
    if (inputMode === 'single') {
      if (!phone) {
        toast.error('Введите номер телефона');
        return;
      }
      onAdd([{ phone, username: username || undefined }]);
      setPhone('');
      setUsername('');
    } else {
      const lines = bulkText.split('\n').filter((l) => l.trim());
      if (lines.length === 0) {
        toast.error('Добавьте хотя бы один аккаунт');
        return;
      }
      const accounts = lines.map((line) => {
        const parts = line.split(/[;,|\t]/).map((p) => p.trim());
        return {
          phone: parts[0],
          username: parts[1] || undefined,
        };
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
            Добавьте аккаунты для автоматического заработка
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button
              variant={inputMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputMode('single')}
              className={inputMode === 'single' ? 'bg-[#6C63FF]' : 'border-[#2A2B32]'}
            >
              Один аккаунт
            </Button>
            <Button
              variant={inputMode === 'bulk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputMode('bulk')}
              className={inputMode === 'bulk' ? 'bg-[#6C63FF]' : 'border-[#2A2B32]'}
            >
              Массовый импорт
            </Button>
          </div>

          {inputMode === 'single' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Номер телефона</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+79991234567"
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>
              <div className="space-y-2">
                <Label>Юзернейм (опционально)</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Список аккаунтов</Label>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="+79991234567;username&#10;+79991234568;username2&#10;..."
                className="bg-[#1E1F26] border-[#2A2B32] min-h-[150px]"
              />
              <p className="text-xs text-[#8A8A8A]">
                Формат: номер;юзернейм (один аккаунт на строку)
              </p>
            </div>
          )}

          <div className="p-3 bg-[#FFB800]/10 rounded-lg border border-[#FFB800]/30">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-[#FFB800] mt-0.5" />
              <div className="text-[#8A8A8A]">
                <p className="text-white font-medium mb-1">Безопасность:</p>
                <p>Каждый аккаунт будет проверен на качество и риск бана перед использованием.</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button className="bg-[#6C63FF]" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogViewer({ logs }: { logs: LogEntry[] }) {
  const levelColors = {
    info: 'text-blue-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    success: 'text-green-400',
  };

  return (
    <div className="bg-[#0D0E12] rounded-lg p-3 font-mono text-sm h-[200px] overflow-auto">
      {logs.length === 0 ? (
        <p className="text-[#8A8A8A]">Логи появятся здесь...</p>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <span className="text-[#8A8A8A]">
              [{log.timestamp.toLocaleTimeString()}]
            </span>
            <span className={levelColors[log.level]}>
              [{log.level.toUpperCase()}]
            </span>
            <span className="text-white">{log.message}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function MonetizationWizard() {
  const [state, setState] = useState<WizardState>({
    step: 1,
    accounts: [],
    selectedMethod: null,
    setupProgress: 0,
    isRunning: false,
    logs: [],
  });

  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [proxyDialogOpen, setProxyDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);

  // Подсчет совместимых аккаунтов
  const compatibleAccounts = state.accounts.filter(
    (a) => a.status === 'ready' && (a.quality?.score || 0) >= 30 && a.proxy
  );

  // Добавление логов
  const addLog = (level: LogEntry['level'], message: string) => {
    setState((prev) => ({
      ...prev,
      logs: [...prev.logs, { timestamp: new Date(), level, message }],
    }));
  };

  // Добавление аккаунтов
  const handleAddAccounts = (accounts: { phone: string; username?: string }[]) => {
    const newAccounts: Account[] = accounts.map((a) => ({
      id: Date.now().toString() + Math.random(),
      phone: a.phone,
      username: a.username,
      status: 'pending',
      quality: null,
    }));
    setState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, ...newAccounts],
    }));
    toast.success(`Добавлено ${accounts.length} аккаунт(ов)`);
  };

  // Анализ аккаунта
  const handleAnalyzeAccount = async (accountId: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === accountId ? { ...a, status: 'analyzing' as const } : a
      ),
    }));

    // Имитация анализа
    await new Promise((r) => setTimeout(r, 2000));

    // Генерация случайных данных качества
    const quality: AccountQuality = {
      score: Math.floor(Math.random() * 50) + 30,
      age: Math.floor(Math.random() * 365) + 1,
      hasAvatar: Math.random() > 0.3,
      hasUsername: Math.random() > 0.2,
      contactsCount: Math.floor(Math.random() * 100),
      groupsCount: Math.floor(Math.random() * 20),
      messagesSent: Math.floor(Math.random() * 1000),
      lastActive: new Date(),
      riskLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      recommendations: [
        'Добавьте аватар',
        'Заполните био',
        'Добавьте прокси',
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      needsWarming: Math.random() > 0.5,
      warmingDays: Math.floor(Math.random() * 7) + 3,
    };

    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === accountId ? { ...a, status: 'ready' as const, quality } : a
      ),
    }));

    addLog('success', `Аккаунт ${accountId.slice(-6)} проанализирован: качество ${quality.score}`);
  };

  // Добавление прокси
  const handleAddProxy = (proxy: ProxyConfig) => {
    if (!selectedAccountId) return;
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === selectedAccountId ? { ...a, proxy } : a
      ),
    }));
    addLog('info', `Прокси добавлен для аккаунта ${selectedAccountId.slice(-6)}`);
    toast.success('Прокси добавлен');
  };

  // Удаление аккаунта
  const handleRemoveAccount = (accountId: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== accountId),
    }));
  };

  // Выбор метода монетизации
  const handleSelectMethod = (methodId: string) => {
    setState((prev) => ({ ...prev, selectedMethod: methodId }));
  };

  // Проверка совместимости метода
  const isMethodCompatible = (method: MonetizationMethod) => {
    const readyAccounts = state.accounts.filter(
      (a) =>
        a.status === 'ready' &&
        (a.quality?.score || 0) >= method.minQuality &&
        a.proxy
    );
    return readyAccounts.length >= method.minAccounts;
  };

  // Запуск автоматического заработка
  const handleStartEarning = async () => {
    const method = MONETIZATION_METHODS.find((m) => m.id === state.selectedMethod);
    if (!method) return;

    setState((prev) => ({ ...prev, isRunning: true, step: 5 }));
    addLog('info', `Запуск метода: ${method.name}`);

    // Имитация настройки
    const steps = [
      'Проверка аккаунтов...',
      'Настройка прокси...',
      'Настройка прогрева...',
      'Создание кампаний...',
      'Генерация креативов...',
      'Запуск рассылки...',
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      addLog('info', steps[i]);
      setState((prev) => ({
        ...prev,
        setupProgress: Math.round(((i + 1) / steps.length) * 100),
      }));
    }

    addLog('success', 'Автоматический заработок запущен!');
    toast.success('Автоматический заработок успешно запущен!');
  };

  // Рендер шагов
  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Шаг 1: Добавление аккаунтов</h2>
                <p className="text-[#8A8A8A]">Добавьте Telegram аккаунты для заработка</p>
              </div>
              <Button
                className="bg-[#6C63FF]"
                onClick={() => setAddAccountOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить аккаунты
              </Button>
            </div>

            {/* Предупреждение о безопасности */}
            <Card className="bg-[#FFB800]/10 border-[#FFB800]/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-[#FFB800]" />
                  <div>
                    <h3 className="font-medium text-white mb-2">
                      Главный приоритет: Выживаемость аккаунтов
                    </h3>
                    <ul className="text-sm text-[#8A8A8A] space-y-1">
                      <li>• Каждый аккаунт анализируется на риск бана</li>
                      <li>• Рекомендуем использовать индивидуальные прокси (1 аккаунт = 1 IP)</li>
                      <li>• Автоматический прогрев новых аккаунтов</li>
                      <li>• Мониторинг прокси 24/7 - при отвале автоматическая замена</li>
                      <li>• Smart Rate Limiting - защита от ограничений Telegram</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Список аккаунтов */}
            {state.accounts.length === 0 ? (
              <Card className="bg-[#14151A] border-[#2A2B32] border-dashed">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-[#8A8A8A] mx-auto mb-4" />
                  <p className="text-[#8A8A8A] mb-4">Аккаунты не добавлены</p>
                  <Button
                    variant="outline"
                    onClick={() => setAddAccountOpen(true)}
                    className="border-[#6C63FF] text-[#6C63FF]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить первый аккаунт
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.accounts.map((account) => (
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

            {/* Статистика */}
            {state.accounts.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-[#14151A] border-[#2A2B32]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-white">{state.accounts.length}</p>
                    <p className="text-sm text-[#8A8A8A]">Всего аккаунтов</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#14151A] border-[#2A2B32]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#00D26A]">
                      {state.accounts.filter((a) => a.status === 'ready').length}
                    </p>
                    <p className="text-sm text-[#8A8A8A]">Готовы</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#14151A] border-[#2A2B32]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#FFB800]">
                      {state.accounts.filter((a) => a.quality?.needsWarming).length}
                    </p>
                    <p className="text-sm text-[#8A8A8A]">Требуют прогрева</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#14151A] border-[#2A2B32]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#6C63FF]">
                      {compatibleAccounts.length}
                    </p>
                    <p className="text-sm text-[#8A8A8A]">С прокси</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Кнопка продолжить */}
            <div className="flex justify-end">
              <Button
                className="bg-[#6C63FF]"
                disabled={state.accounts.length === 0}
                onClick={() => setState((prev) => ({ ...prev, step: 2 }))}
              >
                Продолжить
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Шаг 2: Анализ аккаунтов</h2>
              <p className="text-[#8A8A8A]">Оценка качества и рисков для каждого аккаунта</p>
            </div>

            {/* Таблица анализа */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-[#2A2B32]">
                      <tr>
                        <th className="text-left p-4 text-[#8A8A8A] font-medium">Аккаунт</th>
                        <th className="text-center p-4 text-[#8A8A8A] font-medium">Качество</th>
                        <th className="text-center p-4 text-[#8A8A8A] font-medium">Возраст</th>
                        <th className="text-center p-4 text-[#8A8A8A] font-medium">Риск</th>
                        <th className="text-center p-4 text-[#8A8A8A] font-medium">Прогрев</th>
                        <th className="text-center p-4 text-[#8A8A8A] font-medium">Прокси</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.accounts.map((account) => (
                        <tr key={account.id} className="border-b border-[#2A2B32]">
                          <td className="p-4">
                            <div>
                              <p className="text-white">{account.phone}</p>
                              {account.username && (
                                <p className="text-sm text-[#8A8A8A]">@{account.username}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {account.quality ? (
                              <div className="flex items-center justify-center gap-2">
                                <Progress
                                  value={account.quality.score}
                                  className="w-16 h-2"
                                />
                                <span
                                  className={cn(
                                    'font-bold',
                                    account.quality.score >= 70
                                      ? 'text-[#00D26A]'
                                      : account.quality.score >= 40
                                      ? 'text-[#FFB800]'
                                      : 'text-[#FF4D4D]'
                                  )}
                                >
                                  {account.quality.score}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[#8A8A8A]">Не проанализирован</span>
                            )}
                          </td>
                          <td className="p-4 text-center text-white">
                            {account.quality?.age || '-'} дней
                          </td>
                          <td className="p-4 text-center">
                            {account.quality ? (
                              <Badge
                                className={cn(
                                  account.quality.riskLevel === 'low'
                                    ? 'bg-[#00D26A]/20 text-[#00D26A]'
                                    : account.quality.riskLevel === 'medium'
                                    ? 'bg-[#FFB800]/20 text-[#FFB800]'
                                    : 'bg-[#FF4D4D]/20 text-[#FF4D4D]'
                                )}
                              >
                                {account.quality.riskLevel.toUpperCase()}
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {account.quality?.needsWarming ? (
                              <Badge className="bg-[#FFB800]/20 text-[#FFB800]">
                                {account.quality.warmingDays} дней
                              </Badge>
                            ) : (
                              <Badge className="bg-[#00D26A]/20 text-[#00D26A]">
                                Не нужен
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {account.proxy ? (
                              <Badge className="bg-[#00D26A]/20 text-[#00D26A]">
                                {account.proxy.type.toUpperCase()}
                              </Badge>
                            ) : (
                              <Badge className="bg-[#FF4D4D]/20 text-[#FF4D4D]">
                                Не добавлен
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Рекомендации */}
            <Card className="bg-[#6C63FF]/10 border-[#6C63FF]/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Brain className="w-6 h-6 text-[#6C63FF]" />
                  <div>
                    <h3 className="font-medium text-white mb-2">AI-рекомендации</h3>
                    <ul className="text-sm text-[#8A8A8A] space-y-2">
                      {state.accounts.filter((a) => !a.proxy).length > 0 && (
                        <li className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-[#FFB800]" />
                          Добавьте прокси для{' '}
                          {state.accounts.filter((a) => !a.proxy).length} аккаунтов
                        </li>
                      )}
                      {state.accounts.filter((a) => a.quality?.needsWarming).length > 0 && (
                        <li className="flex items-center gap-2">
                          <Timer className="w-4 h-4 text-[#FFB800]" />
                          {state.accounts.filter((a) => a.quality?.needsWarming).length} аккаунтов
                          требуют прогрева перед активной работой
                        </li>
                      )}
                      {state.accounts.filter((a) => (a.quality?.score || 0) >= 60).length > 0 && (
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-[#00D26A]" />
                          {state.accounts.filter((a) => (a.quality?.score || 0) >= 60).length}{' '}
                          аккаунтов отличного качества - готовы к любым методам
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Кнопки */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
                className="border-[#2A2B32]"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
              <Button
                className="bg-[#6C63FF]"
                disabled={compatibleAccounts.length === 0}
                onClick={() => setState((prev) => ({ ...prev, step: 3 }))}
              >
                Продолжить ({compatibleAccounts.length} готовы)
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Шаг 3: Выбор метода монетизации</h2>
              <p className="text-[#8A8A8A]">
                Выберите подходящий метод из {MONETIZATION_METHODS.length} доступных
              </p>
            </div>

            {/* Фильтры */}
            <div className="flex gap-4">
              <Badge className="bg-[#6C63FF]/20 text-[#6C63FF]">
                {compatibleAccounts.length} аккаунтов готовы
              </Badge>
              <Badge className="bg-[#00D26A]/20 text-[#00D26A]">
                {MONETIZATION_METHODS.filter((m) => isMethodCompatible(m)).length} методов
                доступны
              </Badge>
            </div>

            {/* Методы */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {MONETIZATION_METHODS.map((method) => (
                <MethodCard
                  key={method.id}
                  method={method}
                  isSelected={state.selectedMethod === method.id}
                  isCompatible={isMethodCompatible(method)}
                  accountsReady={compatibleAccounts.length}
                  onSelect={() => handleSelectMethod(method.id)}
                />
              ))}
            </div>

            {/* Кнопки */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setState((prev) => ({ ...prev, step: 2 }))}
                className="border-[#2A2B32]"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
              <Button
                className="bg-[#6C63FF]"
                disabled={!state.selectedMethod}
                onClick={() => setState((prev) => ({ ...prev, step: 4 }))}
              >
                Продолжить
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 4:
        const selectedMethod = MONETIZATION_METHODS.find((m) => m.id === state.selectedMethod);

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Шаг 4: Настройка и запуск</h2>
              <p className="text-[#8A8A8A]">Финальная конфигурация перед запуском</p>
            </div>

            {/* Выбранный метод */}
            {selectedMethod && (
              <Card className="bg-gradient-to-br from-[#6C63FF]/20 to-transparent border-[#6C63FF]/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${selectedMethod.color}20`, color: selectedMethod.color }}
                    >
                      {selectedMethod.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{selectedMethod.name}</h3>
                      <p className="text-[#8A8A8A]">{selectedMethod.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#00D26A] font-bold">{selectedMethod.estimatedROI}</p>
                      <p className="text-sm text-[#8A8A8A]">Ожидаемый доход</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Аккаунты для работы */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Аккаунты для работы ({compatibleAccounts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {compatibleAccounts.slice(0, 5).map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-2 bg-[#1E1F26] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-[#00D26A]" />
                        <span className="text-white">{account.phone}</span>
                        {account.proxy && (
                          <Badge className="bg-[#00D26A]/20 text-[#00D26A] text-xs">
                            PROXY
                          </Badge>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          'text-xs',
                          (account.quality?.score || 0) >= 70
                            ? 'bg-[#00D26A]/20 text-[#00D26A]'
                            : 'bg-[#FFB800]/20 text-[#FFB800]'
                        )}
                      >
                        Quality: {account.quality?.score}
                      </Badge>
                    </div>
                  ))}
                  {compatibleAccounts.length > 5 && (
                    <p className="text-sm text-[#8A8A8A] text-center">
                      ...и ещё {compatibleAccounts.length - 5} аккаунтов
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Настройки безопасности */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00D26A]" />
                  Настройки безопасности
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Автоматический прогрев</p>
                    <p className="text-sm text-[#8A8A8A]">
                      Плавное увеличение активности для новых аккаунтов
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-[#2A2B32]" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Мониторинг прокси</p>
                    <p className="text-sm text-[#8A8A8A]">
                      Автоматическая замена при отвале
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-[#2A2B32]" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Smart Rate Limiting</p>
                    <p className="text-sm text-[#8A8A8A]">
                      Адаптивное ограничение запросов
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-[#2A2B32]" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Emergency Stop</p>
                    <p className="text-sm text-[#8A8A8A]">
                      Автоматическая остановка при риске бана
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Кнопки */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setState((prev) => ({ ...prev, step: 3 }))}
                className="border-[#2A2B32]"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
              <Button
                className="bg-[#00D26A]"
                onClick={() => setConfirmStartOpen(true)}
              >
                <Rocket className="w-4 h-4 mr-2" />
                Запустить автоматический заработок
              </Button>
            </div>

            {/* Диалог подтверждения */}
            <AlertDialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
              <AlertDialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-[#6C63FF]" />
                    Запуск автоматического заработка
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[#8A8A8A]">
                    Система автоматически настроит все необходимые компоненты для начала
                    заработка. Ваши аккаунты будут защищены системой безопасности.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-[#00D26A]" />
                    <span className="text-white">Прогрев аккаунтов (если требуется)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-[#00D26A]" />
                    <span className="text-white">Настройка кампаний</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-[#00D26A]" />
                    <span className="text-white">Генерация креативов</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-[#00D26A]" />
                    <span className="text-white">Мониторинг и защита</span>
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-[#1E1F26] border-[#2A2B32]">
                    Отмена
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-[#00D26A]"
                    onClick={() => {
                      setConfirmStartOpen(false);
                      handleStartEarning();
                    }}
                  >
                    Запустить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              {state.isRunning ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#6C63FF]/20 flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-[#6C63FF] animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Настройка в процессе...</h2>
                  <p className="text-[#8A8A8A]">Автоматическая конфигурация системы</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#00D26A]/20 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-[#00D26A]" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Автоматический заработок запущен!</h2>
                  <p className="text-[#8A8A8A]">Система работает в автоматическом режиме</p>
                </>
              )}
            </div>

            {/* Прогресс */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white">Прогресс настройки</span>
                  <span className="text-[#6C63FF] font-bold">{state.setupProgress}%</span>
                </div>
                <Progress value={state.setupProgress} className="h-3" />
              </CardContent>
            </Card>

            {/* Логи */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4" />
                  Логи системы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LogViewer logs={state.logs} />
              </CardContent>
            </Card>

            {/* Статистика в реальном времени */}
            {!state.isRunning && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-[#14151A] border-[#2A2B32]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#00D26A]">3</p>
                    <p className="text-sm text-[#8A8A8A]">Активных аккаунтов</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#14151A] border-[#2A2B32]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#6C63FF]">12</p>
                    <p className="text-sm text-[#8A8A8A]">Сообщений отправлено</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#14151A] border-[#2A2B32]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[#FFB800]">2</p>
                    <p className="text-sm text-[#8A8A8A]">Конверсий</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#14151A] border-[#2A2B32]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-white">$24.50</p>
                    <p className="text-sm text-[#8A8A8A]">Заработано</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Кнопки */}
            {!state.isRunning && (
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  className="border-[#2A2B32]"
                  onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
                >
                  Добавить ещё аккаунтов
                </Button>
                <Button className="bg-[#FF4D4D]">
                  <PauseCircle className="w-4 h-4 mr-2" />
                  Остановить
                </Button>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <StepIndicator currentStep={state.step} totalSteps={5} />
      {renderStep()}

      {/* Диалоги */}
      <AddAccountDialog
        open={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onAdd={handleAddAccounts}
      />
      <ProxyDialog
        open={proxyDialogOpen}
        onClose={() => setProxyDialogOpen(false)}
        onSave={handleAddProxy}
      />
    </div>
  );
}

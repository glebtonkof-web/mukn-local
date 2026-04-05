'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Sparkles,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Типы данных
interface MonetizationStep {
  step: number;
  title: string;
  description: string;
  duration: string;
  automated: boolean;
}

interface RequiredAccount {
  platform: string;
  minCount: number;
  purpose: string;
  requiresWarming: boolean;
}

interface MonetizationScheme {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  requiredAccounts: RequiredAccount[];
  estimatedROI: {
    min: number;
    max: number;
    timeframe: string;
  };
  risk: 'low' | 'medium' | 'high';
  steps: MonetizationStep[];
  recommendedBudget: {
    min: number;
    max: number;
    currency: string;
  };
  features: string[];
  warnings: string[];
  stats?: {
    activeCampaigns: number;
    avgROI: number;
    successRate: number;
    totalUsers: number;
  };
}

interface AccountInput {
  id: string;
  username: string;
  platform: string;
  proxyHost: string;
  proxyPort: string;
  proxyUsername: string;
  proxyPassword: string;
  useProxy: boolean;
}

interface Settings {
  budget: number;
  geo: string[];
  niche: string;
  dailyLimit: number;
  autoScale: boolean;
  pauseOnHighRisk: boolean;
}

// Шаги визарда
const WIZARD_STEPS = [
  { id: 1, title: 'Выбор схемы', description: 'Выберите подходящую схему монетизации' },
  { id: 2, title: 'Аккаунты', description: 'Добавьте аккаунты для работы' },
  { id: 3, title: 'Настройки', description: 'Настройте параметры кампании' },
  { id: 4, title: 'Запуск', description: 'Проверьте и запустите' },
];

// Доступные GEO
const AVAILABLE_GEOS = [
  'RU', 'UA', 'BY', 'KZ', 'US', 'GB', 'DE', 'FR', 'ES', 'IT', 'BR', 'TR', 'IN', 'ID'
];

// Доступные ниши
const AVAILABLE_NICHES = [
  { id: 'gambling', name: 'Гемблинг' },
  { id: 'dating', name: 'Дейтинг' },
  { id: 'crypto', name: 'Криптовалюты' },
  { id: 'nutra', name: 'Нутра' },
  { id: 'finance', name: 'Финансы' },
  { id: 'sweepstakes', name: 'Sweepstakes' },
];

export function AutoEarnWizard() {
  // Состояния
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [schemes, setSchemes] = useState<MonetizationScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<MonetizationScheme | null>(null);
  const [accounts, setAccounts] = useState<AccountInput[]>([]);
  const [settings, setSettings] = useState<Settings>({
    budget: 10000,
    geo: ['RU'],
    niche: '',
    dailyLimit: 100,
    autoScale: true,
    pauseOnHighRisk: true,
  });
  const [launchResult, setLaunchResult] = useState<Record<string, unknown> | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  // Загрузка схем
  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const res = await fetch('/api/auto-earn/schemes');
        const data = await res.json();
        if (data.success) {
          setSchemes(data.schemes);
        }
      } catch (error) {
        console.error('Error fetching schemes:', error);
        toast.error('Ошибка загрузки схем монетизации');
      }
    };
    fetchSchemes();
  }, []);

  // Добавить аккаунт
  const addAccount = useCallback(() => {
    const newAccount: AccountInput = {
      id: `acc-${Date.now()}`,
      username: '',
      platform: selectedScheme?.platforms[0] || 'Telegram',
      proxyHost: '',
      proxyPort: '',
      proxyUsername: '',
      proxyPassword: '',
      useProxy: false,
    };
    setAccounts(prev => [...prev, newAccount]);
  }, [selectedScheme]);

  // Удалить аккаунт
  const removeAccount = useCallback((id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

  // Обновить аккаунт
  const updateAccount = useCallback((id: string, field: keyof AccountInput, value: string | boolean) => {
    setAccounts(prev => prev.map(a => 
      a.id === id ? { ...a, [field]: value } : a
    ));
  }, []);

  // Валидация текущего шага
  const validateStep = useCallback((): boolean => {
    switch (currentStep) {
      case 1:
        return selectedScheme !== null;
      case 2:
        return accounts.length >= (selectedScheme?.requiredAccounts[0]?.minCount || 1) &&
          accounts.every(a => a.username.trim() !== '');
      case 3:
        return settings.budget > 0 && settings.geo.length > 0 && settings.niche !== '';
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedScheme, accounts, settings]);

  // Следующий шаг
  const nextStep = useCallback(() => {
    if (!validateStep()) {
      toast.error('Заполните все обязательные поля');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  }, [validateStep]);

  // Предыдущий шаг
  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  // Запуск кампании
  const launchCampaign = useCallback(async () => {
    if (!selectedScheme) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auto-earn/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemeId: selectedScheme.id,
          accounts: accounts.map(a => ({
            username: a.username,
            platform: a.platform,
            proxyHost: a.useProxy ? a.proxyHost : undefined,
            proxyPort: a.useProxy ? parseInt(a.proxyPort) : undefined,
            proxyUsername: a.useProxy ? a.proxyUsername : undefined,
            proxyPassword: a.useProxy ? a.proxyPassword : undefined,
          })),
          settings: {
            budget: settings.budget,
            geo: settings.geo,
            niche: settings.niche,
            dailyLimit: settings.dailyLimit,
            autoScale: settings.autoScale,
            pauseOnHighRisk: settings.pauseOnHighRisk,
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setLaunchResult(data);
        toast.success(data.message || 'Кампания успешно запущена!');
      } else {
        throw new Error(data.error || 'Ошибка запуска');
      }
    } catch (error) {
      console.error('Error launching campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка запуска кампании');
    } finally {
      setLoading(false);
    }
  }, [selectedScheme, accounts, settings]);

  // Получить цвет риска
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-[#00D26A]';
      case 'medium': return 'text-[#FFB800]';
      case 'high': return 'text-[#FF4D4D]';
      default: return 'text-[#8A8A8A]';
    }
  };

  // Получить название риска
  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'low': return 'Низкий';
      case 'medium': return 'Средний';
      case 'high': return 'Высокий';
      default: return 'Неизвестно';
    }
  };

  // Получить иконку платформы
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'telegram': return '📱';
      case 'instagram': return '📷';
      case 'tiktok': return '🎵';
      case 'twitter': return '🐦';
      case 'youtube': return '▶️';
      default: return '🌐';
    }
  };

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-xl flex items-center gap-2">
              <Rocket className="w-5 h-5 text-[#6C63FF]" />
              Мастер автоматизации
            </CardTitle>
            <CardDescription className="text-[#8A8A8A]">
              Настройте автоматический заработок за 4 простых шага
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInfoDialog(true)}
            className="text-[#8A8A8A] hover:text-white"
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>

        {/* Прогресс шагов */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    currentStep > step.id
                      ? 'bg-[#00D26A] text-white'
                      : currentStep === step.id
                        ? 'bg-[#6C63FF] text-white'
                        : 'bg-[#2A2B32] text-[#8A8A8A]'
                  )}
                >
                  {currentStep > step.id ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-16 h-1 mx-2 rounded',
                      currentStep > step.id ? 'bg-[#00D26A]' : 'bg-[#2A2B32]'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs">
            {WIZARD_STEPS.map(step => (
              <span
                key={step.id}
                className={cn(
                  'transition-colors',
                  currentStep === step.id ? 'text-white' : 'text-[#8A8A8A]'
                )}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-[400px]">
        {/* Шаг 1: Выбор схемы */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Выберите схему монетизации</h3>
              <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
                {schemes.length} схем доступно
              </Badge>
            </div>
            
            <ScrollArea className="h-[350px] pr-4">
              <div className="grid gap-4">
                {schemes.map(scheme => (
                  <Card
                    key={scheme.id}
                    className={cn(
                      'cursor-pointer transition-all hover:border-[#6C63FF]/50',
                      selectedScheme?.id === scheme.id
                        ? 'border-[#6C63FF] bg-[#6C63FF]/10'
                        : 'bg-[#1E1F26] border-[#2A2B32]'
                    )}
                    onClick={() => setSelectedScheme(scheme)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-semibold">{scheme.name}</h4>
                          <p className="text-[#8A8A8A] text-sm mt-1">{scheme.description}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('ml-2', getRiskColor(scheme.risk))}
                        >
                          {getRiskLabel(scheme.risk)} риск
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-[#00D26A]" />
                          <span className="text-[#00D26A]">ROI: {scheme.estimatedROI.min}-{scheme.estimatedROI.max}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-[#8A8A8A]" />
                          <span className="text-[#8A8A8A]">
                            {scheme.recommendedBudget.min.toLocaleString()}-{scheme.recommendedBudget.max.toLocaleString()} {scheme.recommendedBudget.currency}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {scheme.platforms.map(platform => (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {getPlatformIcon(platform)} {platform}
                          </Badge>
                        ))}
                      </div>

                      {scheme.stats && (
                        <div className="mt-3 pt-3 border-t border-[#2A2B32] grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[#8A8A8A]">Активных:</span>
                            <span className="text-white ml-1">{scheme.stats.activeCampaigns}</span>
                          </div>
                          <div>
                            <span className="text-[#8A8A8A]">Успешность:</span>
                            <span className="text-[#00D26A] ml-1">{scheme.stats.successRate}%</span>
                          </div>
                          <div>
                            <span className="text-[#8A8A8A]">Пользователей:</span>
                            <span className="text-white ml-1">{scheme.stats.totalUsers}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Шаг 2: Аккаунты */}
        {currentStep === 2 && selectedScheme && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Добавьте аккаунты</h3>
                <p className="text-[#8A8A8A] text-sm">
                  Минимум {selectedScheme.requiredAccounts[0]?.minCount || 1} аккаунтов для {selectedScheme.requiredAccounts[0]?.platform}
                </p>
              </div>
              <Button onClick={addAccount} className="bg-[#6C63FF] hover:bg-[#6C63FF]/80">
                <Plus className="w-4 h-4 mr-2" />
                Добавить аккаунт
              </Button>
            </div>

            {/* Требования */}
            <div className="bg-[#1E1F26] rounded-lg p-4 mb-4">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#FFB800]" />
                Требования к аккаунтам
              </h4>
              <div className="grid gap-2">
                {selectedScheme.requiredAccounts.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="border-[#2A2B32]">
                      {getPlatformIcon(req.platform)} {req.platform}
                    </Badge>
                    <span className="text-[#8A8A8A]">{req.purpose}</span>
                    {req.requiresWarming && (
                      <Badge className="bg-[#FFB800]/20 text-[#FFB800] text-xs">
                        Требует прогрева
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-3">
                {accounts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#8A8A8A]">
                    <Users className="w-12 h-12 mb-4 opacity-50" />
                    <p>Нет добавленных аккаунтов</p>
                    <Button
                      variant="outline"
                      onClick={addAccount}
                      className="mt-4 border-[#6C63FF] text-[#6C63FF]"
                    >
                      Добавить первый аккаунт
                    </Button>
                  </div>
                ) : (
                  accounts.map(account => (
                    <Card key={account.id} className="bg-[#1E1F26] border-[#2A2B32]">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="border-[#2A2B32]">
                            {getPlatformIcon(account.platform)} {account.platform}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAccount(account.id)}
                            className="text-[#FF4D4D] hover:text-[#FF4D4D] hover:bg-[#FF4D4D]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid gap-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-[#8A8A8A] text-xs">Username</Label>
                              <Input
                                value={account.username}
                                onChange={(e) => updateAccount(account.id, 'username', e.target.value)}
                                placeholder="@username"
                                className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[#8A8A8A] text-xs">Платформа</Label>
                              <Select
                                value={account.platform}
                                onValueChange={(value) => updateAccount(account.id, 'platform', value)}
                              >
                                <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                                  {selectedScheme.platforms.map(p => (
                                    <SelectItem key={p} value={p}>
                                      {getPlatformIcon(p)} {p}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`proxy-${account.id}`}
                              checked={account.useProxy}
                              onCheckedChange={(checked) => updateAccount(account.id, 'useProxy', !!checked)}
                            />
                            <Label htmlFor={`proxy-${account.id}`} className="text-[#8A8A8A] text-sm">
                              Использовать прокси
                            </Label>
                          </div>

                          {account.useProxy && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-[#8A8A8A] text-xs">Proxy Host</Label>
                                <Input
                                  value={account.proxyHost}
                                  onChange={(e) => updateAccount(account.id, 'proxyHost', e.target.value)}
                                  placeholder="proxy.example.com"
                                  className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-[#8A8A8A] text-xs">Port</Label>
                                <Input
                                  value={account.proxyPort}
                                  onChange={(e) => updateAccount(account.id, 'proxyPort', e.target.value)}
                                  placeholder="8080"
                                  className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Шаг 3: Настройки */}
        {currentStep === 3 && selectedScheme && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Настройки кампании</h3>
            
            <div className="grid gap-6">
              {/* Бюджет */}
              <div>
                <Label className="text-white font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#6C63FF]" />
                  Бюджет
                </Label>
                <p className="text-[#8A8A8A] text-xs mb-2">
                  Рекомендуется: {selectedScheme.recommendedBudget.min.toLocaleString()}-{selectedScheme.recommendedBudget.max.toLocaleString()} {selectedScheme.recommendedBudget.currency}
                </p>
                <Input
                  type="number"
                  value={settings.budget}
                  onChange={(e) => setSettings(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white text-lg font-semibold"
                />
              </div>

              {/* GEO */}
              <div>
                <Label className="text-white font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#6C63FF]" />
                  Гео (страны)
                </Label>
                <p className="text-[#8A8A8A] text-xs mb-2">Выберите целевые страны</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_GEOS.map(geo => (
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
                        setSettings(prev => ({
                          ...prev,
                          geo: prev.geo.includes(geo)
                            ? prev.geo.filter(g => g !== geo)
                            : [...prev.geo, geo],
                        }));
                      }}
                    >
                      {geo}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Ниша */}
              <div>
                <Label className="text-white font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#6C63FF]" />
                  Ниша
                </Label>
                <Select
                  value={settings.niche}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, niche: value }))}
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white mt-2">
                    <SelectValue placeholder="Выберите нишу" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {AVAILABLE_NICHES.map(niche => (
                      <SelectItem key={niche.id} value={niche.id} className="text-white hover:bg-[#2A2B32]">
                        {niche.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Дополнительные настройки */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white font-medium">Дневной лимит активности</Label>
                  <Input
                    type="number"
                    value={settings.dailyLimit}
                    onChange={(e) => setSettings(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) || 0 }))}
                    className="bg-[#1E1F26] border-[#2A2B32] text-white mt-2"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="autoScale"
                    checked={settings.autoScale}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoScale: !!checked }))}
                  />
                  <Label htmlFor="autoScale" className="text-white">
                    Автоматическое масштабирование при высоком ROI
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pauseOnHighRisk"
                    checked={settings.pauseOnHighRisk}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pauseOnHighRisk: !!checked }))}
                  />
                  <Label htmlFor="pauseOnHighRisk" className="text-white">
                    Пауза при высоком риске бана
                  </Label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Шаг 4: Запуск */}
        {currentStep === 4 && selectedScheme && !launchResult && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Проверка и запуск</h3>
            
            {/* Сводка */}
            <div className="bg-[#1E1F26] rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Схема</span>
                <span className="text-white font-medium">{selectedScheme.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Аккаунтов</span>
                <span className="text-white font-medium">{accounts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Бюджет</span>
                <span className="text-white font-medium">{settings.budget.toLocaleString()} ₽</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Гео</span>
                <span className="text-white font-medium">{settings.geo.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Ниша</span>
                <span className="text-white font-medium">
                  {AVAILABLE_NICHES.find(n => n.id === settings.niche)?.name || settings.niche}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Ожидаемый ROI</span>
                <span className="text-[#00D26A] font-medium">
                  {selectedScheme.estimatedROI.min}-{selectedScheme.estimatedROI.max}%
                </span>
              </div>
            </div>

            {/* Предупреждения */}
            {selectedScheme.warnings.length > 0 && (
              <div className="bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-lg p-4">
                <h4 className="text-[#FFB800] font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Важно знать
                </h4>
                <ul className="text-sm text-[#FFB800]/80 space-y-1">
                  {selectedScheme.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-[#FFB800]">•</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Шаги запуска */}
            <div className="bg-[#1E1F26] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#6C63FF]" />
                Что произойдёт после запуска
              </h4>
              <div className="space-y-2">
                {selectedScheme.steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-[#6C63FF]/20 flex items-center justify-center text-[#6C63FF] text-xs">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <span className="text-white">{step.title}</span>
                      <span className="text-[#8A8A8A] ml-2">({step.duration})</span>
                    </div>
                    {step.automated && (
                      <Badge className="bg-[#00D26A]/20 text-[#00D26A] text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Авто
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Результат запуска */}
        {launchResult && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#00D26A]/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#00D26A]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Кампания запущена!</h3>
                <p className="text-[#8A8A8A]">Автоматизация успешно активирована</p>
              </div>
            </div>

            <div className="bg-[#1E1F26] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">ID кампании</span>
                <span className="text-white font-mono text-sm">{(launchResult.campaign as Record<string, unknown>)?.id as string}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Аккаунтов</span>
                <span className="text-white">{(launchResult.accounts as unknown[])?.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">На прогреве</span>
                <span className="text-white">{(launchResult.warming as Record<string, unknown>)?.total as number}</span>
              </div>
            </div>

            <div className="bg-[#6C63FF]/10 border border-[#6C63FF]/30 rounded-lg p-4">
              <h4 className="text-[#6C63FF] font-medium mb-2">Следующие шаги</h4>
              <ul className="text-sm text-white space-y-1">
                {((launchResult.nextSteps as Array<{ step: number; action: string; description: string; duration: string }>) || []).map((step, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-[#6C63FF]">{step.step}.</span>
                    {step.description}
                    <span className="text-[#8A8A8A]">({step.duration})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>

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

        {currentStep < 4 ? (
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
            onClick={launchCampaign}
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

      {/* Диалог с информацией */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32]">
          <DialogHeader>
            <DialogTitle className="text-white">О мастере автоматизации</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Мастер автоматизации поможет вам быстро настроить и запустить пассивный заработок.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-[#8A8A8A]">
            <p>
              <span className="text-white font-medium">1. Выберите схему</span> — каждая схема оптимизирована для определённого типа офферов и платформ.
            </p>
            <p>
              <span className="text-white font-medium">2. Добавьте аккаунты</span> — система автоматически прогреет их и подготовит к работе.
            </p>
            <p>
              <span className="text-white font-medium">3. Настройте параметры</span> — укажите бюджет, гео и нишу.
            </p>
            <p>
              <span className="text-white font-medium">4. Запустите</span> — система автоматически создаст кампании, настроит прогрев и начнёт работу.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInfoDialog(false)} className="bg-[#6C63FF]">
              Понятно
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

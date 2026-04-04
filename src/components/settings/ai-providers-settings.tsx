'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  GripVertical,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Типы
interface ModelInfo {
  id: string;
  name: string;
  isFree: boolean;
}

interface ProviderInfo {
  id: string;
  provider: string;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  defaultModel: string;
  priority: number;
  isActive: boolean;
  isFree: boolean;
  balance?: number;
  lastCheckAt?: string;
  lastCheckStatus?: string;
  lastCheckError?: string;
  lastCheckTime?: number;
  requestsCount: number;
  successCount: number;
  errorCount: number;
  models: ModelInfo[];
}

interface GlobalSettings {
  autoFallback: boolean;
  notifyOnSwitch: boolean;
  telegramNotify: boolean;
  useCheapestModel: boolean;
  minBalanceForSwitch: number;
  dailyLimit?: number;
  monthlyLimit?: number;
}

// Названия провайдеров
const PROVIDER_NAMES: Record<string, string> = {
  openrouter: 'OpenRouter',
  gemini: 'Google Gemini',
  groq: 'Groq',
  deepseek: 'DeepSeek',
};

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  openrouter: 'Единый доступ к 450+ моделям (DeepSeek, Claude, GPT-4o, Gemini)',
  gemini: 'Бесплатный API от Google AI Studio',
  groq: 'Быстрый бесплатный API (Llama, Mixtral, DeepSeek R1)',
  deepseek: 'Прямой доступ к DeepSeek API',
};

export function AIProvidersSettings() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    autoFallback: true,
    notifyOnSwitch: true,
    telegramNotify: false,
    useCheapestModel: false,
    minBalanceForSwitch: 5.0,
  });
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState<string | null>(null);

  // Загрузка данных
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
        setGlobalSettings(data.globalSettings || globalSettings);
        
        // Инициализируем ключи пустыми строками
        const keys: Record<string, string> = {};
        data.providers?.forEach((p: ProviderInfo) => {
          keys[p.provider] = '';
        });
        setApiKeys(keys);
      }
    } catch (error) {
      console.error('Failed to load AI providers:', error);
      toast.error('Ошибка загрузки настроек провайдеров');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Сохранение ключа провайдера
  const saveProviderKey = async (providerName: string) => {
    const apiKey = apiKeys[providerName];
    if (!apiKey) {
      toast.error('Введите API ключ');
      return;
    }

    setSaving(providerName);
    try {
      const response = await fetch('/api/ai-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerName,
          apiKey,
          isActive: true,
        }),
      });

      if (response.ok) {
        toast.success('API ключ сохранён');
        setApiKeys(prev => ({ ...prev, [providerName]: '' }));
        loadData(); // Перезагружаем данные
      } else {
        const error = await response.json();
        toast.error(error.error || 'Ошибка сохранения');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(null);
    }
  };

  // Тестирование соединения
  const testConnection = async (providerName: string, model?: string) => {
    const apiKey = apiKeys[providerName];
    if (!apiKey) {
      toast.error('Введите API ключ для тестирования');
      return;
    }

    setTestingProvider(providerName);
    try {
      const response = await fetch('/api/ai-providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerName,
          apiKey,
          model,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Ошибка тестирования');
    } finally {
      setTestingProvider(null);
    }
  };

  // Обновление модели по умолчанию
  const updateDefaultModel = async (providerName: string, model: string) => {
    try {
      await fetch('/api/ai-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerName,
          defaultModel: model,
        }),
      });
      toast.success('Модель обновлена');
    } catch (error) {
      toast.error('Ошибка обновления модели');
    }
  };

  // Обновление глобальных настроек
  const updateGlobalSettings = async (settings: Partial<GlobalSettings>) => {
    try {
      const newSettings = { ...globalSettings, ...settings };
      await fetch('/api/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateGlobalSettings',
          ...newSettings,
        }),
      });
      setGlobalSettings(newSettings);
    } catch (error) {
      toast.error('Ошибка сохранения настроек');
    }
  };

  // Статус провайдера
  const getStatusBadge = (provider: ProviderInfo) => {
    if (testingProvider === provider.provider) {
      return (
        <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Проверка
        </Badge>
      );
    }

    if (provider.lastCheckStatus === 'success') {
      return (
        <Badge variant="outline" className="border-[#00D26A] text-[#00D26A]">
          <CheckCircle className="w-3 h-3 mr-1" />
          {provider.lastCheckTime ? `${(provider.lastCheckTime / 1000).toFixed(2)}s` : 'Активен'}
        </Badge>
      );
    }

    if (provider.lastCheckStatus === 'failed') {
      return (
        <Badge variant="outline" className="border-[#FF4D4D] text-[#FF4D4D]">
          <XCircle className="w-3 h-3 mr-1" />
          Ошибка
        </Badge>
      );
    }

    if (provider.hasApiKey) {
      return (
        <Badge variant="outline" className="border-[#FFB800] text-[#FFB800]">
          <Zap className="w-3 h-3 mr-1" />
          Настроен
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A]">
        Не настроен
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">API ключи провайдеров</h3>
          <p className="text-sm text-[#8A8A8A]">Настройка мульти-провайдеров с автоматическим fallback</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Карточки провайдеров */}
      <div className="space-y-4">
        {providers.map((provider) => (
          <Card key={provider.provider} className="bg-[#1E1F26] border-[#2A2B32]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[#8A8A8A]">
                    <GripVertical className="w-4 h-4 cursor-move" />
                    <span className="text-sm font-medium">{provider.priority}</span>
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">
                      {PROVIDER_NAMES[provider.provider] || provider.provider}
                    </CardTitle>
                    <CardDescription className="text-[#8A8A8A] text-xs">
                      {PROVIDER_DESCRIPTIONS[provider.provider]}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {provider.isFree && (
                    <Badge className="bg-[#00D26A]/20 text-[#00D26A] text-xs">
                      Бесплатный
                    </Badge>
                  )}
                  {provider.balance !== undefined && provider.balance !== null && (
                    <Badge variant="outline" className="border-[#FFB800] text-[#FFB800] text-xs">
                      ${provider.balance.toFixed(2)}
                    </Badge>
                  )}
                  {getStatusBadge(provider)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKeys[provider.provider] ? 'text' : 'password'}
                    placeholder={provider.apiKeyPreview || 'Введите API ключ...'}
                    value={apiKeys[provider.provider] || ''}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [provider.provider]: e.target.value }))}
                    className="bg-[#14151A] border-[#2A2B32] text-white pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowApiKeys(prev => ({ ...prev, [provider.provider]: !prev[provider.provider] }))}
                      className="p-1 text-[#8A8A8A] hover:text-white"
                    >
                      {showApiKeys[provider.provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection(provider.provider, provider.defaultModel)}
                  disabled={!apiKeys[provider.provider] || testingProvider === provider.provider}
                  className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
                >
                  {testingProvider === provider.provider ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Проверить'
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveProviderKey(provider.provider)}
                  disabled={!apiKeys[provider.provider] || isSaving === provider.provider}
                  className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                >
                  {isSaving === provider.provider ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Сохранить'
                  )}
                </Button>
              </div>

              {/* Model Selection */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-[#8A8A8A] text-xs mb-1 block">Модель по умолчанию</Label>
                  <Select
                    value={provider.defaultModel || ''}
                    onValueChange={(v) => updateDefaultModel(provider.provider, v)}
                  >
                    <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white h-8 text-sm">
                      <SelectValue placeholder="Выберите модель" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                      {provider.models?.map((model) => (
                        <SelectItem key={model.id} value={model.id} className="text-white">
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            {model.isFree && (
                              <Badge className="bg-[#00D26A]/20 text-[#00D26A] text-xs">
                                Free
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-[#8A8A8A]">
                  <div className="text-center">
                    <p className="text-white font-medium">{provider.requestsCount}</p>
                    <p>Запросов</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[#00D26A] font-medium">{provider.successCount}</p>
                    <p>Успешно</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[#FF4D4D] font-medium">{provider.errorCount}</p>
                    <p>Ошибок</p>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {provider.lastCheckError && (
                <div className="p-2 bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 rounded text-xs text-[#FF4D4D]">
                  {provider.lastCheckError}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Глобальные настройки */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-base">Приоритет провайдеров</CardTitle>
          </div>
          <CardDescription className="text-[#8A8A8A]">
            Настройки автоматического переключения
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Автоматическое переключение</p>
              <p className="text-xs text-[#8A8A8A]">При ошибке провайдера переключаться на следующий</p>
            </div>
            <Switch
              checked={globalSettings.autoFallback}
              onCheckedChange={(checked) => updateGlobalSettings({ autoFallback: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Уведомлять о переключении</p>
              <p className="text-xs text-[#8A8A8A]">Показывать уведомление при смене провайдера</p>
            </div>
            <Switch
              checked={globalSettings.notifyOnSwitch}
              onCheckedChange={(checked) => updateGlobalSettings({ notifyOnSwitch: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Использовать бесплатные модели</p>
              <p className="text-xs text-[#8A8A8A]">Приоритет бесплатных моделей когда возможно</p>
            </div>
            <Switch
              checked={globalSettings.useCheapestModel}
              onCheckedChange={(checked) => updateGlobalSettings({ useCheapestModel: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Мин. баланс для переключения</p>
              <p className="text-xs text-[#8A8A8A]">Переключаться при балансе менее $</p>
            </div>
            <Input
              type="number"
              value={globalSettings.minBalanceForSwitch}
              onChange={(e) => updateGlobalSettings({ minBalanceForSwitch: parseFloat(e.target.value) || 5 })}
              className="w-20 bg-[#14151A] border-[#2A2B32] text-white h-8 text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

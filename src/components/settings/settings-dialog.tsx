'use client';

import { useAppStore } from '@/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Settings,
  Key,
  Bell,
  Shield,
  Database,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Zap,
  Cpu,
  Globe,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AIProvidersSettings } from './ai-providers-settings';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useTranslation, type LanguageCode } from '@/hooks/use-translation';

// API Key status type
interface ApiKeyStatus {
  provider: string;
  name: string;
  isActive: boolean;
  connected: boolean | null;
  lastUsedAt?: string;
  testing: boolean;
}

// Settings type
interface SettingsState {
  deepseekApiKey: string;
  replicateApiKey: string;
  telegramApiId: string;
  telegramApiHash: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  criticalAlerts: boolean;
  autoBackup: boolean;
  language: string;
  timezone: string;
}

// Provider config
const providers = [
  { id: 'deepseek', name: 'DeepSeek API', description: 'Ключ для генерации текстового контента', placeholder: 'sk-...' },
  { id: 'replicate', name: 'Replicate API (FLUX)', description: 'Ключ для генерации изображений', placeholder: 'r8_...' },
  { id: 'telegram', name: 'Telegram API', description: 'Получить на my.telegram.org', placeholder: 'API Hash' },
];

export function SettingsDialog() {
  const { settingsOpen, setSettingsOpen } = useAppStore();
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState<SettingsState>({
    deepseekApiKey: '',
    replicateApiKey: '',
    telegramApiId: '',
    telegramApiHash: '',
    notificationsEnabled: true,
    emailNotifications: false,
    criticalAlerts: true,
    autoBackup: true,
    language: 'ru',
    timezone: 'Europe/Moscow',
  });

  const { currentLanguage, changeLanguage } = useTranslation();

  const [apiStatuses, setApiStatuses] = useState<Record<string, ApiKeyStatus>>({
    deepseek: { provider: 'deepseek', name: 'DeepSeek API', isActive: false, connected: null, testing: false },
    replicate: { provider: 'replicate', name: 'Replicate API', isActive: false, connected: null, testing: false },
    telegram: { provider: 'telegram', name: 'Telegram API', isActive: false, connected: null, testing: false },
  });

  // Load settings from API
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/api-keys');
      if (response.ok) {
        const data = await response.json();

        // Update settings with existing keys
        if (data.settings) {
          setSettings(prev => ({
            ...prev,
            deepseekApiKey: data.settings.deepseekApiKey || '',
            replicateApiKey: data.settings.replicateApiKey || '',
            telegramApiHash: data.settings.telegramApiHash || '',
          }));
        }

        // Update statuses based on stored keys - use functional update to avoid dependency
        setApiStatuses(prevStatuses => {
          const newStatuses = { ...prevStatuses };
          data.apiKeys?.forEach((key: { provider: string; isActive: boolean; lastUsedAt?: string }) => {
            if (newStatuses[key.provider]) {
              newStatuses[key.provider] = {
                ...newStatuses[key.provider],
                isActive: key.isActive,
                lastUsedAt: key.lastUsedAt,
                connected: null, // Will be tested separately
              };
            }
          });
          return newStatuses;
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    if (settingsOpen) {
      loadSettings();
    }
  }, [settingsOpen, loadSettings]);

  // Test API connection
  const testConnection = async (provider: string) => {
    const key = provider === 'deepseek' 
      ? settings.deepseekApiKey 
      : provider === 'replicate' 
        ? settings.replicateApiKey 
        : settings.telegramApiHash;

    if (!key) {
      toast.error('Введите API ключ');
      return;
    }

    setApiStatuses(prev => ({
      ...prev,
      [provider]: { ...prev[provider], testing: true },
    }));

    try {
      const response = await fetch('/api/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key }),
      });

      const data = await response.json();

      setApiStatuses(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          testing: false,
          connected: data.connected,
        },
      }));

      if (data.connected) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch {
      setApiStatuses(prev => ({
        ...prev,
        [provider]: { ...prev[provider], testing: false, connected: false },
      }));
      toast.error('Ошибка тестирования подключения');
    }
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save each API key
      const savePromises: Promise<Response>[] = [];

      if (settings.deepseekApiKey) {
        savePromises.push(
          fetch('/api/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'deepseek', name: 'DeepSeek API', key: settings.deepseekApiKey }),
          })
        );
      }

      if (settings.replicateApiKey) {
        savePromises.push(
          fetch('/api/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'replicate', name: 'Replicate API', key: settings.replicateApiKey }),
          })
        );
      }

      if (settings.telegramApiId && settings.telegramApiHash) {
        savePromises.push(
          fetch('/api/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'telegram', name: 'Telegram API', key: settings.telegramApiHash }),
          })
        );
      }

      await Promise.all(savePromises);

      toast.success('Настройки сохранены');
      setSettingsOpen(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setIsSaving(false);
    }
  };

  // Get connection status badge
  const getStatusBadge = (provider: string) => {
    const status = apiStatuses[provider];
    if (!status) return null;

    if (status.testing) {
      return (
        <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Проверка
        </Badge>
      );
    }

    if (status.connected === true) {
      return (
        <Badge variant="outline" className="border-[#00D26A] text-[#00D26A]">
          <CheckCircle className="w-3 h-3 mr-1" />
          Подключено
        </Badge>
      );
    }

    if (status.connected === false) {
      return (
        <Badge variant="outline" className="border-[#FF4D4D] text-[#FF4D4D]">
          <XCircle className="w-3 h-3 mr-1" />
          Ошибка
        </Badge>
      );
    }

    if (status.isActive) {
      return (
        <Badge variant="outline" className="border-[#FFB800] text-[#FFB800]">
          <Zap className="w-3 h-3 mr-1" />
          Активен
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A]">
        Не настроен
      </Badge>
    );
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#14151A] border-[#2A2B32] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#6C63FF]" />
            Настройки системы
          </DialogTitle>
          <DialogDescription className="text-[#8A8A8A]">
            Конфигурация API ключей, уведомлений и системных параметров
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai-providers" className="mt-4">
          <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
            <TabsTrigger value="ai-providers" className="data-[state=active]:bg-[#6C63FF]">
              <Cpu className="w-4 h-4 mr-2" />
              AI Провайдеры
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-[#6C63FF]">
              <Key className="w-4 h-4 mr-2" />
              API Ключи
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-[#6C63FF]">
              <Bell className="w-4 h-4 mr-2" />
              Уведомления
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-[#6C63FF]">
              <Shield className="w-4 h-4 mr-2" />
              Безопасность
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-[#6C63FF]">
              <Database className="w-4 h-4 mr-2" />
              Система
            </TabsTrigger>
          </TabsList>

          {/* AI Providers Tab */}
          <TabsContent value="ai-providers" className="mt-4">
            <AIProvidersSettings />
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
              </div>
            ) : (
              <>
                {/* DeepSeek API */}
                <Card className="bg-[#1E1F26] border-[#2A2B32]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">DeepSeek API</CardTitle>
                        <CardDescription className="text-[#8A8A8A]">
                          Ключ для генерации текстового контента
                        </CardDescription>
                      </div>
                      {getStatusBadge('deepseek')}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <Input
                        type={showApiKeys['deepseek'] ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={settings.deepseekApiKey}
                        onChange={(e) => setSettings({ ...settings, deepseekApiKey: e.target.value })}
                        className="bg-[#14151A] border-[#2A2B32] text-white pr-20"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({ ...showApiKeys, deepseek: !showApiKeys['deepseek'] })}
                          className="p-1 text-[#8A8A8A] hover:text-white"
                        >
                          {showApiKeys['deepseek'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection('deepseek')}
                      disabled={!settings.deepseekApiKey || apiStatuses.deepseek.testing}
                      className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
                    >
                      {apiStatuses.deepseek.testing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Проверить подключение
                    </Button>
                  </CardContent>
                </Card>

                {/* Replicate API */}
                <Card className="bg-[#1E1F26] border-[#2A2B32]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">Replicate API (FLUX)</CardTitle>
                        <CardDescription className="text-[#8A8A8A]">
                          Ключ для генерации изображений
                        </CardDescription>
                      </div>
                      {getStatusBadge('replicate')}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <Input
                        type={showApiKeys['replicate'] ? 'text' : 'password'}
                        placeholder="r8_..."
                        value={settings.replicateApiKey}
                        onChange={(e) => setSettings({ ...settings, replicateApiKey: e.target.value })}
                        className="bg-[#14151A] border-[#2A2B32] text-white pr-20"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({ ...showApiKeys, replicate: !showApiKeys['replicate'] })}
                          className="p-1 text-[#8A8A8A] hover:text-white"
                        >
                          {showApiKeys['replicate'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection('replicate')}
                      disabled={!settings.replicateApiKey || apiStatuses.replicate.testing}
                      className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
                    >
                      {apiStatuses.replicate.testing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Проверить подключение
                    </Button>
                  </CardContent>
                </Card>

                {/* Telegram API */}
                <Card className="bg-[#1E1F26] border-[#2A2B32]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">Telegram API</CardTitle>
                        <CardDescription className="text-[#8A8A8A]">
                          Получить на my.telegram.org
                        </CardDescription>
                      </div>
                      {getStatusBadge('telegram')}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[#8A8A8A] text-sm">API ID</Label>
                        <Input
                          placeholder="12345678"
                          value={settings.telegramApiId}
                          onChange={(e) => setSettings({ ...settings, telegramApiId: e.target.value })}
                          className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[#8A8A8A] text-sm">API Hash</Label>
                        <div className="relative mt-1">
                          <Input
                            type={showApiKeys['telegram'] ? 'text' : 'password'}
                            placeholder="abc123..."
                            value={settings.telegramApiHash}
                            onChange={(e) => setSettings({ ...settings, telegramApiHash: e.target.value })}
                            className="bg-[#14151A] border-[#2A2B32] text-white pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKeys({ ...showApiKeys, telegram: !showApiKeys['telegram'] })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-white"
                          >
                            {showApiKeys['telegram'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection('telegram')}
                      disabled={!settings.telegramApiHash || apiStatuses.telegram.testing}
                      className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
                    >
                      {apiStatuses.telegram.testing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Проверить подключение
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4 mt-4">
            <Card className="bg-[#1E1F26] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white text-lg">Настройки уведомлений</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Уведомления включены</p>
                    <p className="text-sm text-[#8A8A8A]">Получать уведомления в интерфейсе</p>
                  </div>
                  <Switch
                    checked={settings.notificationsEnabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, notificationsEnabled: checked })}
                  />
                </div>
                
                <Separator className="bg-[#2A2B32]" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Email уведомления</p>
                    <p className="text-sm text-[#8A8A8A]">Дублировать на email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                  />
                </div>
                
                <Separator className="bg-[#2A2B32]" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Критические уведомления</p>
                    <p className="text-sm text-[#8A8A8A]">Мгновенные при критических ошибках</p>
                  </div>
                  <Switch
                    checked={settings.criticalAlerts}
                    onCheckedChange={(checked) => setSettings({ ...settings, criticalAlerts: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <Card className="bg-[#1E1F26] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white text-lg">Безопасность</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-[#14151A] rounded-lg border border-[#2A2B32]">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-[#00D26A]" />
                    <p className="text-white font-medium">Шифрование данных</p>
                  </div>
                  <p className="text-sm text-[#8A8A8A]">
                    Все чувствительные данные хранятся в зашифрованном виде
                  </p>
                </div>

                <div className="p-4 bg-[#14151A] rounded-lg border border-[#2A2B32]">
                  <div className="flex items-center gap-3 mb-3">
                    <Database className="w-5 h-5 text-[#6C63FF]" />
                    <p className="text-white font-medium">Локальная база данных</p>
                  </div>
                  <p className="text-sm text-[#8A8A8A]">
                    База данных SQLite хранится локально
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-4 mt-4">
            {/* Language Settings */}
            <Card className="bg-[#1E1F26] border-[#2A2B32]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#6C63FF]" />
                  <CardTitle className="text-white text-lg">Язык</CardTitle>
                </div>
                <CardDescription className="text-[#8A8A8A]">
                  Выберите язык интерфейса. Все элементы будут автоматически переведены.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Язык интерфейса</p>
                    <p className="text-sm text-[#8A8A8A]">Автоматический перевод всех элементов</p>
                  </div>
                  <LanguageSelector
                    value={currentLanguage}
                    onChange={(lang: LanguageCode) => {
                      changeLanguage(lang);
                      setSettings({ ...settings, language: lang });
                    }}
                    showFlag={true}
                    showName={true}
                    variant="outline"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1E1F26] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white text-lg">Системные настройки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#8A8A8A] text-sm">Часовой пояс</Label>
                    <Select
                      value={settings.timezone}
                      onValueChange={(v) => setSettings({ ...settings, timezone: v })}
                    >
                      <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                        <SelectItem value="Europe/Moscow" className="text-white">Москва (UTC+3)</SelectItem>
                        <SelectItem value="Europe/Kiev" className="text-white">Киев (UTC+2)</SelectItem>
                        <SelectItem value="Asia/Almaty" className="text-white">Алматы (UTC+6)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-[#2A2B32]" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Автобэкап</p>
                    <p className="text-sm text-[#8A8A8A]">Ежедневное резервное копирование</p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1E1F26] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white text-lg">Информация</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#8A8A8A]">Версия</p>
                    <p className="text-white">1.0.0 Enterprise</p>
                  </div>
                  <div>
                    <p className="text-[#8A8A8A]">База данных</p>
                    <p className="text-white">SQLite</p>
                  </div>
                  <div>
                    <p className="text-[#8A8A8A]">Платформа</p>
                    <p className="text-white">Next.js 16</p>
                  </div>
                  <div>
                    <p className="text-[#8A8A8A]">AI Провайдер</p>
                    <p className="text-white">DeepSeek V4</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#2A2B32]">
          <Button
            variant="outline"
            onClick={() => setSettingsOpen(false)}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

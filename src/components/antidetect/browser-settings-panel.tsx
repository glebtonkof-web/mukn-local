'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Settings,
  Key,
  Globe,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BrowserConfig {
  apiKey?: string;
  apiUrl?: string;
  port?: number;
  isActive?: boolean;
  lastCheckAt?: string;
}

const BROWSER_INFO = {
  mostlogin: {
    name: 'MostLogin',
    icon: '🔹',
    color: 'text-cyan-500',
    defaultPort: 50215,
    description: 'Антидетект браузер для мультиаккаунтинга',
  },
  morelogin: {
    name: 'MoreLogin',
    icon: '🔐',
    color: 'text-green-500',
    defaultPort: 35000,
    description: 'Профессиональный антидетект браузер',
  },
  multilogin: {
    name: 'Multilogin',
    icon: '🌐',
    color: 'text-blue-500',
    defaultPort: 45001,
    description: 'Ведущий антидетект браузер',
  },
  'octo-browser': {
    name: 'Octo Browser',
    icon: '🐙',
    color: 'text-purple-500',
    defaultPort: 51445,
    description: 'Мощный антидетект браузер',
  },
};

export function BrowserSettingsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, BrowserConfig>>({});
  const [connectionStatus, setConnectionStatus] = useState<Record<string, { connected: boolean; error?: string }>>({});
  const [testingBrowser, setTestingBrowser] = useState<string | null>(null);
  
  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBrowser, setEditingBrowser] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    apiKey: '',
    apiUrl: '',
    port: 0,
  });

  // Fetch settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/antidetect/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Test connection
  const testConnection = async (browserType: string) => {
    setTestingBrowser(browserType);
    try {
      const res = await fetch('/api/antidetect/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ browserType }),
      });
      
      const data = await res.json();
      
      setConnectionStatus(prev => ({
        ...prev,
        [browserType]: {
          connected: data.connected,
          error: data.error,
        },
      }));

      if (data.connected) {
        toast({
          title: 'Подключено',
          description: `${BROWSER_INFO[browserType as keyof typeof BROWSER_INFO].name} успешно подключен`,
        });
      } else {
        toast({
          title: 'Ошибка подключения',
          description: data.error || 'Не удалось подключиться к браузеру',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось проверить подключение',
        variant: 'destructive',
      });
    } finally {
      setTestingBrowser(null);
    }
  };

  // Open edit dialog
  const openEditDialog = (browserType: string) => {
    const config = settings[browserType] || {};
    setEditingBrowser(browserType);
    setFormData({
      apiKey: '',
      apiUrl: config.apiUrl || '',
      port: config.port || BROWSER_INFO[browserType as keyof typeof BROWSER_INFO].defaultPort,
    });
    setEditDialogOpen(true);
  };

  // Save settings
  const saveSettings = async () => {
    if (!editingBrowser) return;

    try {
      const res = await fetch('/api/antidetect/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          browserType: editingBrowser,
          apiKey: formData.apiKey || undefined,
          apiUrl: formData.apiUrl || undefined,
          port: formData.port,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Сохранено',
          description: 'Настройки успешно обновлены',
        });
        setEditDialogOpen(false);
        fetchSettings();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройки браузеров
          </h3>
          <p className="text-sm text-muted-foreground">
            Настройте подключение к антидетект браузерам
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchSettings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(BROWSER_INFO).map(([type, info]) => {
          const config = settings[type] || {};
          const status = connectionStatus[type];
          const isTesting = testingBrowser === type;

          return (
            <Card key={type} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{info.icon}</span>
                    <CardTitle className={`text-lg ${info.color}`}>{info.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {status?.connected === true && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Подключен
                      </Badge>
                    )}
                    {status?.connected === false && (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Недоступен
                      </Badge>
                    )}
                    {status === undefined && (
                      <Badge variant="outline">
                        <WifiOff className="h-3 w-3 mr-1" />
                        Не проверено
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>{info.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>Порт: {config.port || info.defaultPort}</span>
                </div>
                {config.apiKey && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Key className="h-4 w-4" />
                    <span>API ключ: {config.apiKey}</span>
                  </div>
                )}
                {config.apiUrl && (
                  <div className="text-sm text-muted-foreground truncate">
                    URL: {config.apiUrl}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(type)}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4 mr-1" />
                    )}
                    Проверить
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(type)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Настроить
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Settings Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingBrowser && (
                <>
                  <span className="text-xl">{BROWSER_INFO[editingBrowser as keyof typeof BROWSER_INFO].icon}</span>
                  Настройки {BROWSER_INFO[editingBrowser as keyof typeof BROWSER_INFO].name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Настройте параметры подключения к браузеру
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API ключ (опционально)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Введите API ключ"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Оставьте пустым, чтобы сохранить существующий ключ
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL (опционально)</Label>
              <Input
                id="apiUrl"
                placeholder="http://127.0.0.1"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Обычно http://127.0.0.1 для локального приложения
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">Порт</Label>
              <Input
                id="port"
                type="number"
                placeholder="Порт API"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                По умолчанию: {editingBrowser && BROWSER_INFO[editingBrowser as keyof typeof BROWSER_INFO].defaultPort}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={saveSettings}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BrowserSettingsPanel;

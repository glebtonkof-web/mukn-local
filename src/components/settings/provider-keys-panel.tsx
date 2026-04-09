'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { ExternalLink, Key, Plus, Trash2, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

interface ProviderKey {
  id: string;
  provider: string;
  keyName: string;
  keyType: string;
  status: string;
  isActive: boolean;
  isValidated: boolean;
  dailyUsed: number;
  dailyLimit: number | null;
  balance: number | null;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  consecutiveErrors: number;
  lastUsedAt: string | null;
  lastError: string | null;
  apiKeyPreview: string | null;
}

interface FreeProviderConfig {
  provider: string;
  registrationUrl: string;
  requiresEmail: boolean;
  requiresPhone: boolean;
  requiresCard: boolean;
  isFree: boolean;
  quotaDaily: number;
  quotaMonthly?: number;
  apiDocUrl?: string;
}

interface Stats {
  totalKeys: number;
  activeKeys: number;
  exhaustedKeys: number;
  invalidKeys: number;
  byProvider: Record<string, { total: number; active: number }>;
}

export function ProviderKeysPanel() {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [freeProviders, setFreeProviders] = useState<Record<string, FreeProviderConfig>>({});
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [adding, setAdding] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/provider-keys');
      const data = await response.json();
      setKeys(data.keys || []);
      setStats(data.stats || null);
      setFreeProviders(data.freeProviders || {});
    } catch (error) {
      console.error('Failed to fetch provider keys:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddKey = async () => {
    if (!selectedProvider || !newApiKey) return;

    setAdding(true);
    try {
      const response = await fetch('/api/provider-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addKey',
          provider: selectedProvider,
          apiKey: newApiKey,
          keyName: newKeyName || `${selectedProvider} key`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchData();
        setAddDialogOpen(false);
        setNewApiKey('');
        setNewKeyName('');
        setSelectedProvider('');
      } else {
        alert(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to add key:', error);
      alert('Ошибка при добавлении ключа');
    } finally {
      setAdding(false);
    }
  };

  const handleValidateKey = async (keyId: string) => {
    setValidating(keyId);
    try {
      const response = await fetch('/api/provider-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validateKey',
          keyId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to validate key:', error);
    } finally {
      setValidating(null);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/provider-keys?keyId=${keyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to delete key:', error);
    }
  };

  const handleValidateAll = async () => {
    try {
      const response = await fetch('/api/provider-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validateAll' }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to validate all keys:', error);
    }
  };

  const getStatusBadge = (status: string, isValidated: boolean) => {
    if (!isValidated) {
      return <Badge variant="secondary">Не проверен</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Активен</Badge>;
      case 'exhausted':
        return <Badge variant="destructive">Исчерпан</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Неверный</Badge>;
      case 'cooldown':
        return <Badge variant="secondary" className="bg-yellow-500">Охлаждение</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      cerebras: '🧠',
      groq: '⚡',
      gemini: '💎',
      openrouter: '🔀',
      deepseek: '🔍',
      stability: '🎨',
      elevenlabs: '🔊',
    };
    return icons[provider] || '🔑';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Загрузка...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.totalKeys || 0}</div>
            <div className="text-sm text-muted-foreground">Всего ключей</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{stats?.activeKeys || 0}</div>
            <div className="text-sm text-muted-foreground">Активных</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-500">{stats?.exhaustedKeys || 0}</div>
            <div className="text-sm text-muted-foreground">Исчерпаны</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{stats?.invalidKeys || 0}</div>
            <div className="text-sm text-muted-foreground">Неверных</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys">Мои ключи</TabsTrigger>
          <TabsTrigger value="register">Бесплатные провайдеры</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">API ключи провайдеров</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleValidateAll}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Проверить все
              </Button>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить ключ
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить API ключ</DialogTitle>
                    <DialogDescription>
                      Добавьте новый API ключ провайдера для использования в Content Studio
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Провайдер</Label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={selectedProvider}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                      >
                        <option value="">Выберите провайдера</option>
                        {Object.keys(freeProviders).map((provider) => (
                          <option key={provider} value={provider}>
                            {getProviderIcon(provider)} {provider.toUpperCase()}
                          </option>
                        ))}
                        <option value="deepseek">🔍 DeepSeek</option>
                      </select>
                    </div>
                    <div>
                      <Label>API ключ</Label>
                      <Input
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder="sk-..."
                        type="password"
                      />
                    </div>
                    <div>
                      <Label>Название (опционально)</Label>
                      <Input
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="Основной ключ"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={handleAddKey} disabled={adding || !selectedProvider || !newApiKey}>
                      {adding ? 'Добавление...' : 'Добавить'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {keys.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет добавленных API ключей</p>
                <p className="text-sm mt-2">Добавьте ключи провайдеров для работы Content Studio</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {keys.map((key) => (
                <Card key={key.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getProviderIcon(key.provider)}</span>
                          <span className="font-semibold">{key.keyName}</span>
                          {getStatusBadge(key.status, key.isValidated)}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {key.apiKeyPreview}
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span>
                            Квота: {key.dailyUsed}/{key.dailyLimit || '∞'}
                          </span>
                          {key.balance !== null && (
                            <span>Баланс: ${key.balance.toFixed(2)}</span>
                          )}
                          <span>
                            Запросов: {key.successfulRequests}/{key.totalRequests}
                          </span>
                        </div>
                        {key.lastError && (
                          <div className="flex items-center gap-2 text-sm text-red-500">
                            <AlertCircle className="h-4 w-4" />
                            {key.lastError}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleValidateKey(key.id)}
                          disabled={validating === key.id}
                        >
                          {validating === key.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить ключ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие нельзя отменить. API ключ будет удален из системы.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteKey(key.id)}>
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="register" className="space-y-4">
          <h3 className="text-lg font-semibold">Бесплатные провайдеры</h3>
          <p className="text-sm text-muted-foreground">
            Зарегистрируйтесь на сайтах провайдеров и получите бесплатные API ключи
          </p>
          <div className="grid gap-4">
            {Object.entries(freeProviders).map(([id, config]) => (
              <Card key={id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getProviderIcon(id)}</span>
                        <span className="font-semibold text-lg">{id.toUpperCase()}</span>
                        {config.isFree && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Бесплатно
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Дневная квота: {config.quotaDaily?.toLocaleString() || 'Не ограничена'} запросов</div>
                        {config.quotaMonthly && (
                          <div>Месячная квота: {config.quotaMonthly.toLocaleString()} запросов</div>
                        )}
                        <div className="flex gap-4 mt-2">
                          {config.requiresEmail && <span>📧 Email</span>}
                          {config.requiresPhone && <span>📱 Телефон</span>}
                          {config.requiresCard && <span>💳 Карта</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {config.apiDocUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={config.apiDocUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Документация
                          </a>
                        </Button>
                      )}
                      <Button size="sm" asChild>
                        <a href={config.registrationUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Получить ключ
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProviderKeysPanel;

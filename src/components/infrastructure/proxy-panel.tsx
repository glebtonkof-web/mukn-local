'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Plus,
  Trash2,
  Edit,
  Loader2,
  RefreshCw,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Типы
interface Proxy {
  id: string;
  type: string;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  country: string | null;
  city: string | null;
  status: string;
  lastCheckAt: Date | null;
  responseTime: number | null;
  purchaseDate: Date | null;
  expiryDate: Date | null;
  provider: string | null;
  price: number | null;
  notes: string | null;
  createdAt: Date;
}

interface ProxyPanelProps {
  onStatsChange?: (stats: { total: number; active: number; inactive: number }) => void;
}

const STATUS_CONFIG = {
  active: { label: 'Активен', color: '#00D26A', icon: CheckCircle },
  inactive: { label: 'Неактивен', color: '#8A8A8A', icon: XCircle },
  failed: { label: 'Ошибка', color: '#FF4D4D', icon: AlertTriangle },
};

const PROXY_TYPES = [
  { id: 'socks5', label: 'SOCKS5' },
  { id: 'socks4', label: 'SOCKS4' },
  { id: 'http', label: 'HTTP' },
  { id: 'https', label: 'HTTPS' },
];

export function ProxyPanel({ onStatsChange }: ProxyPanelProps) {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState<Proxy | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Форма
  const [formData, setFormData] = useState({
    type: 'socks5',
    host: '',
    port: '',
    username: '',
    password: '',
    country: '',
    city: '',
    provider: '',
    price: '',
    expiryDate: '',
    notes: '',
  });

  // Массовый импорт
  const [bulkText, setBulkText] = useState('');

  // Загрузка прокси
  const loadProxies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/proxies');
      if (response.ok) {
        const data = await response.json();
        setProxies(data.proxies || []);

        if (onStatsChange) {
          onStatsChange({
            total: data.proxies?.length || 0,
            active: data.proxies?.filter((p: Proxy) => p.status === 'active').length || 0,
            inactive: data.proxies?.filter((p: Proxy) => p.status !== 'active').length || 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load proxies:', error);
      toast.error('Ошибка загрузки прокси');
    } finally {
      setLoading(false);
    }
  }, [onStatsChange]);

  useEffect(() => {
    loadProxies();
  }, [loadProxies]);

  // Сохранение прокси
  const handleSave = async () => {
    if (!formData.host || !formData.port) {
      toast.error('Укажите хост и порт');
      return;
    }

    setSaving(true);
    try {
      const url = '/api/proxies';
      const method = editingProxy ? 'PUT' : 'POST';

      const body = editingProxy
        ? { id: editingProxy.id, ...formData, port: parseInt(formData.port) }
        : { ...formData, port: parseInt(formData.port) };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingProxy ? 'Прокси обновлён' : 'Прокси добавлен');
        setDialogOpen(false);
        resetForm();
        loadProxies();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Ошибка сохранения');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  // Массовый импорт
  const handleBulkImport = async () => {
    if (!bulkText.trim()) {
      toast.error('Введите список прокси');
      return;
    }

    setSaving(true);
    try {
      // Парсим строки формата: type://user:pass@host:port или host:port
      const lines = bulkText.split('\n').filter(l => l.trim());
      const proxies = lines.map(line => {
        const trimmed = line.trim();
        let type = 'socks5';
        let host = '';
        let port = 0;
        let username = '';
        let password = '';

        // Проверяем формат с протоколом
        const protocolMatch = trimmed.match(/^(socks[45]|https?)\:\/\//);
        if (protocolMatch) {
          type = protocolMatch[1];
        }

        // Убираем протокол для парсинга
        const withoutProtocol = trimmed.replace(/^(socks[45]|https?)\:\/\//, '');

        // Проверяем формат с авторизацией
        const authMatch = withoutProtocol.match(/^(.+?):(.+?)@(.+?):(\d+)$/);
        if (authMatch) {
          username = authMatch[1];
          password = authMatch[2];
          host = authMatch[3];
          port = parseInt(authMatch[4]);
        } else {
          // Формат без авторизации
          const parts = withoutProtocol.split(':');
          if (parts.length >= 2) {
            host = parts[0];
            port = parseInt(parts[1]);
          }
        }

        return { type, host, port, username, password };
      }).filter(p => p.host && p.port);

      if (proxies.length === 0) {
        toast.error('Не удалось распознать ни один прокси');
        return;
      }

      const response = await fetch('/api/proxies/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Добавлено ${data.added} прокси`);
        setBulkDialogOpen(false);
        setBulkText('');
        loadProxies();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Ошибка импорта');
      }
    } catch (error) {
      toast.error('Ошибка импорта');
    } finally {
      setSaving(false);
    }
  };

  // Удаление прокси
  const handleDelete = async (id: string) => {
    if (!confirm('Удалить прокси?')) return;

    try {
      const response = await fetch(`/api/proxies?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Прокси удалён');
        loadProxies();
      } else {
        toast.error('Ошибка удаления');
      }
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  // Копирование прокси
  const copyProxy = (proxy: Proxy) => {
    const auth = proxy.username ? `${proxy.username}:${proxy.password}@` : '';
    const proxyString = `${proxy.type}://${auth}${proxy.host}:${proxy.port}`;
    navigator.clipboard.writeText(proxyString);
    toast.success('Прокси скопирован');
  };

  // Проверка прокси
  const checkProxy = async (id: string) => {
    try {
      const response = await fetch(`/api/proxies/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.active ? 'Прокси работает' : 'Прокси не отвечает');
        loadProxies();
      }
    } catch (error) {
      toast.error('Ошибка проверки');
    }
  };

  // Сброс формы
  const resetForm = () => {
    setFormData({
      type: 'socks5',
      host: '',
      port: '',
      username: '',
      password: '',
      country: '',
      city: '',
      provider: '',
      price: '',
      expiryDate: '',
      notes: '',
    });
    setEditingProxy(null);
  };

  // Открытие диалога редактирования
  const openEditDialog = (proxy: Proxy) => {
    setEditingProxy(proxy);
    setFormData({
      type: proxy.type,
      host: proxy.host,
      port: proxy.port.toString(),
      username: proxy.username || '',
      password: proxy.password || '',
      country: proxy.country || '',
      city: proxy.city || '',
      provider: proxy.provider || '',
      price: proxy.price?.toString() || '',
      expiryDate: proxy.expiryDate ? new Date(proxy.expiryDate).toISOString().split('T')[0] : '',
      notes: proxy.notes || '',
    });
    setDialogOpen(true);
  };

  // Фильтрация
  const filteredProxies = filter === 'all'
    ? proxies
    : proxies.filter(p => p.status === filter);

  return (
    <div className="space-y-4">
      {/* Заголовок и фильтры */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProxies}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Обновить
          </Button>
          <div className="flex bg-[#1E1F26] rounded-lg p-1">
            {[
              { id: 'all', label: 'Все' },
              { id: 'active', label: 'Активные' },
              { id: 'inactive', label: 'Неактивные' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  filter === f.id
                    ? 'bg-[#6C63FF] text-white'
                    : 'text-[#8A8A8A] hover:text-white'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setBulkDialogOpen(true)}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Импорт
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить прокси
          </Button>
        </div>
      </div>

      {/* Список прокси */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
        </div>
      ) : filteredProxies.length === 0 ? (
        <Card className="bg-[#14151A] border-[#2A2B32] p-12 text-center">
          <Globe className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Нет прокси</h3>
          <p className="text-[#8A8A8A] mb-6">Добавьте первый прокси для начала работы</p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(true)}
              className="border-[#6C63FF] text-[#6C63FF]"
            >
              <Upload className="w-4 h-4 mr-2" />
              Массовый импорт
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить прокси
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProxies.map((proxy) => {
            const statusConfig = STATUS_CONFIG[proxy.status as keyof typeof STATUS_CONFIG] ||
              { label: proxy.status, color: '#8A8A8A', icon: AlertTriangle };
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={proxy.id} className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-[#FFB800]" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-sm">{proxy.host}:{proxy.port}</CardTitle>
                        <CardDescription className="text-xs">
                          {proxy.type.toUpperCase()} {proxy.country && `• ${proxy.country}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyProxy(proxy)}
                        className="h-8 w-8 text-[#8A8A8A] hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => checkProxy(proxy.id)}
                        className="h-8 w-8 text-[#8A8A8A] hover:text-white"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(proxy)}
                        className="h-8 w-8 text-[#8A8A8A] hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(proxy.id)}
                        className="h-8 w-8 text-[#8A8A8A] hover:text-[#FF4D4D]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Статус */}
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: statusConfig.color, color: statusConfig.color }}
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                    {proxy.responseTime && (
                      <span className="text-xs text-[#8A8A8A]">{proxy.responseTime}ms</span>
                    )}
                  </div>

                  {/* Авторизация */}
                  {proxy.username && (
                    <div className="text-xs text-[#8A8A8A]">
                      Логин: {proxy.username}
                    </div>
                  )}

                  {/* Информация */}
                  <div className="flex items-center justify-between text-xs text-[#8A8A8A] pt-2 border-t border-[#2A2B32]">
                    {proxy.provider && <span>{proxy.provider}</span>}
                    {proxy.expiryDate && (
                      <span>До {new Date(proxy.expiryDate).toLocaleDateString('ru-RU')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Диалог добавления/редактирования */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>{editingProxy ? 'Редактировать прокси' : 'Добавить прокси'}</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Введите данные прокси-сервера
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Тип</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {PROXY_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-[#8A8A8A]">Хост *</Label>
                <Input
                  value={formData.host}
                  onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="192.168.1.1"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Порт *</Label>
                <Input
                  value={formData.port}
                  onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                  placeholder="1080"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Логин</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="username"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Пароль</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Страна</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="RU"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Город</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Москва"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Провайдер</Label>
                <Input
                  value={formData.provider}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                  placeholder="Proxy-Seller"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Цена (₽)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="100"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Дата окончания</Label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Заметки</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Дополнительная информация"
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingProxy ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог массового импорта */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-lg bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>Массовый импорт прокси</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Введите список прокси (по одному на строку)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Поддерживаемые форматы:</Label>
              <div className="text-xs text-[#8A8A8A] space-y-1 bg-[#1E1F26] p-3 rounded-lg">
                <p>• socks5://user:pass@host:port</p>
                <p>• host:port</p>
                <p>• user:pass@host:port</p>
              </div>
            </div>

            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`socks5://user1:pass1@192.168.1.1:1080\n192.168.1.2:1080\nuser:pass@192.168.1.3:1080`}
              className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[200px] font-mono text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              Отмена
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={saving}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Импортировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

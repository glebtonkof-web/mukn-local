'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Smartphone,
  Globe,
  MessageSquare,
  Video,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Типы
interface Account {
  id: string;
  platform: string;
  username: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  proxyType: string | null;
  proxyHost: string | null;
  proxyPort: number | null;
  riskScore: number;
  commentsCount: number;
  dmCount: number;
  followsCount: number;
  maxComments: number;
  maxDm: number;
  maxFollows: number;
  lastActivityAt: Date | null;
  createdAt: Date;
  simCard?: {
    id: string;
    phoneNumber: string;
    operator: string;
  } | null;
}

interface AccountsPanelProps {
  onStatsChange?: (stats: { total: number; active: number; pending: number }) => void;
}

const PLATFORM_CONFIG = {
  // Мессенджеры
  telegram: { icon: MessageSquare, color: '#0088cc', label: 'Telegram' },
  whatsapp: { icon: MessageSquare, color: '#25D366', label: 'WhatsApp' },
  discord: { icon: MessageSquare, color: '#5865F2', label: 'Discord' },
  
  // Социальные сети
  instagram: { icon: Globe, color: '#E4405F', label: 'Instagram' },
  tiktok: { icon: Video, color: '#000000', label: 'TikTok' },
  youtube: { icon: Video, color: '#FF0000', label: 'YouTube' },
  twitter: { icon: Globe, color: '#1DA1F2', label: 'Twitter/X' },
  facebook: { icon: Globe, color: '#1877F2', label: 'Facebook' },
  snapchat: { icon: Globe, color: '#FFFC00', label: 'Snapchat' },
  reddit: { icon: Globe, color: '#FF4500', label: 'Reddit' },
  pinterest: { icon: Globe, color: '#E60023', label: 'Pinterest' },
  linkedin: { icon: Globe, color: '#0A66C2', label: 'LinkedIn' },
  
  // Российские платформы
  vk: { icon: Globe, color: '#0077FF', label: 'ВКонтакте' },
  ok: { icon: Globe, color: '#EE8208', label: 'Одноклассники' },
  
  // Стриминг и музыка
  twitch: { icon: Video, color: '#9146FF', label: 'Twitch' },
  spotify: { icon: Globe, color: '#1DB954', label: 'Spotify' },
  
  // Другое
  onlyfans: { icon: Globe, color: '#00AFF0', label: 'OnlyFans' },
};

// Список всех платформ для выбора
const ALL_PLATFORMS = Object.keys(PLATFORM_CONFIG);

// Группы платформ для фильтров
const PLATFORM_GROUPS = {
  all: 'Все',
  messengers: 'Мессенджеры',
  social: 'Соцсети',
  russian: 'РФ',
  streaming: 'Стриминг',
};

const PLATFORM_FILTERS: Record<string, string[]> = {
  all: ALL_PLATFORMS,
  messengers: ['telegram', 'whatsapp', 'discord'],
  social: ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'snapchat', 'reddit', 'pinterest', 'linkedin'],
  russian: ['vk', 'ok'],
  streaming: ['twitch', 'spotify'],
};

const STATUS_CONFIG = {
  pending: { label: 'Ожидает', color: '#FFB800', icon: AlertTriangle },
  warming: { label: 'Прогрев', color: '#6C63FF', icon: RefreshCw },
  active: { label: 'Активен', color: '#00D26A', icon: CheckCircle },
  paused: { label: 'Пауза', color: '#8A8A8A', icon: AlertTriangle },
  banned: { label: 'Забанен', color: '#FF4D4D', icon: XCircle },
};

export function AccountsPanel({ onStatsChange }: AccountsPanelProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [showPassword, setShowPassword] = useState(false);

  // Форма
  const [formData, setFormData] = useState({
    platform: 'telegram',
    username: '',
    phone: '',
    email: '',
    password: '',
    sessionData: '',
    apiId: '',
    apiHash: '',
    proxyType: 'socks5',
    proxyHost: '',
    proxyPort: '',
    proxyUsername: '',
    proxyPassword: '',
    simCardId: '',
    maxComments: 50,
    maxDm: 20,
    maxFollows: 100,
  });

  // Загрузка аккаунтов
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);

        if (onStatsChange) {
          onStatsChange({
            total: data.accounts?.length || 0,
            active: data.accounts?.filter((a: Account) => a.status === 'active').length || 0,
            pending: data.accounts?.filter((a: Account) => a.status === 'pending').length || 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
      toast.error('Ошибка загрузки аккаунтов');
    } finally {
      setLoading(false);
    }
  }, [onStatsChange]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Сохранение аккаунта
  const handleSave = async () => {
    if (!formData.username && !formData.phone) {
      toast.error('Укажите username или телефон');
      return;
    }

    setSaving(true);
    try {
      const url = editingAccount ? '/api/accounts' : '/api/accounts';
      const method = editingAccount ? 'PUT' : 'POST';

      const body = editingAccount
        ? { id: editingAccount.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingAccount ? 'Аккаунт обновлён' : 'Аккаунт добавлен');
        setDialogOpen(false);
        resetForm();
        loadAccounts();
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

  // Удаление аккаунта
  const handleDelete = async (id: string) => {
    if (!confirm('Удалить аккаунт?')) return;

    try {
      const response = await fetch(`/api/accounts?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Аккаунт удалён');
        loadAccounts();
      } else {
        toast.error('Ошибка удаления');
      }
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  // Сброс формы
  const resetForm = () => {
    setFormData({
      platform: 'telegram',
      username: '',
      phone: '',
      email: '',
      password: '',
      sessionData: '',
      apiId: '',
      apiHash: '',
      proxyType: 'socks5',
      proxyHost: '',
      proxyPort: '',
      proxyUsername: '',
      proxyPassword: '',
      simCardId: '',
      maxComments: 50,
      maxDm: 20,
      maxFollows: 100,
    });
    setEditingAccount(null);
  };

  // Открытие диалога редактирования
  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      platform: account.platform,
      username: account.username || '',
      phone: account.phone || '',
      email: account.email || '',
      password: '',
      sessionData: '',
      apiId: '',
      apiHash: '',
      proxyType: account.proxyType || 'socks5',
      proxyHost: account.proxyHost || '',
      proxyPort: account.proxyPort?.toString() || '',
      proxyUsername: '',
      proxyPassword: '',
      simCardId: account.simCard?.id || '',
      maxComments: account.maxComments || 50,
      maxDm: account.maxDm || 20,
      maxFollows: account.maxFollows || 100,
    });
    setDialogOpen(true);
  };

  // Фильтрация по группе платформ
  const filteredAccounts = filter === 'all'
    ? accounts
    : accounts.filter(a => PLATFORM_FILTERS[filter]?.includes(a.platform) || false);

  const getRiskColor = (risk: number) => {
    if (risk < 30) return '#00D26A';
    if (risk < 60) return '#FFB800';
    return '#FF4D4D';
  };

  return (
    <div className="space-y-4">
      {/* Заголовок и фильтры */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAccounts}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Обновить
          </Button>
          <div className="flex flex-wrap bg-[#1E1F26] rounded-lg p-1 gap-1">
            {[
              { id: 'all', label: 'Все' },
              { id: 'messengers', label: 'Мессенджеры' },
              { id: 'social', label: 'Соцсети' },
              { id: 'russian', label: 'РФ' },
              { id: 'streaming', label: 'Стриминг' },
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
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить аккаунт
        </Button>
      </div>

      {/* Список аккаунтов */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
        </div>
      ) : filteredAccounts.length === 0 ? (
        <Card className="bg-[#14151A] border-[#2A2B32] p-12 text-center">
          <Smartphone className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Нет аккаунтов</h3>
          <p className="text-[#8A8A8A] mb-6">Добавьте первый аккаунт для начала работы</p>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить аккаунт
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((account) => {
            const platformConfig = PLATFORM_CONFIG[account.platform as keyof typeof PLATFORM_CONFIG] ||
              { icon: Globe, color: '#6C63FF', label: account.platform };
            const statusConfig = STATUS_CONFIG[account.status as keyof typeof STATUS_CONFIG] ||
              { label: account.status, color: '#8A8A8A', icon: AlertTriangle };
            const PlatformIcon = platformConfig.icon;
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={account.id} className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: platformConfig.color + '20' }}
                      >
                        <PlatformIcon className="w-5 h-5" style={{ color: platformConfig.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-white text-sm">
                          {account.username || account.phone || 'Без имени'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {platformConfig.label}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(account)}
                        className="h-8 w-8 text-[#8A8A8A] hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(account.id)}
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
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getRiskColor(account.riskScore) }}
                      />
                      <span
                        className="text-xs"
                        style={{ color: getRiskColor(account.riskScore) }}
                      >
                        {account.riskScore}%
                      </span>
                    </div>
                  </div>

                  {/* Прокси */}
                  {account.proxyHost && (
                    <div className="flex items-center gap-2 text-xs text-[#8A8A8A]">
                      <Globe className="w-3 h-3" />
                      <span>{account.proxyType}://{account.proxyHost}:{account.proxyPort}</span>
                    </div>
                  )}

                  {/* Статистика */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-[#2A2B32]">
                    <div>
                      <p className="text-xs text-[#8A8A8A]">Коммент.</p>
                      <p className="text-sm text-white font-medium">{account.commentsCount}/{account.maxComments}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8A8A8A]">DM</p>
                      <p className="text-sm text-white font-medium">{account.dmCount}/{account.maxDm}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8A8A8A]">Подписки</p>
                      <p className="text-sm text-white font-medium">{account.followsCount}/{account.maxFollows}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Диалог добавления/редактирования */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#14151A] border-[#2A2B32] text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Редактировать аккаунт' : 'Добавить аккаунт'}</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Введите данные аккаунта для {editingAccount ? 'обновления' : 'добавления'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Платформа */}
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Платформа</Label>
              <Select
                value={formData.platform}
                onValueChange={(v) => setFormData(prev => ({ ...prev, platform: v }))}
              >
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32] max-h-60">
                  <SelectItem value="telegram">💬 Telegram</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="discord">💬 Discord</SelectItem>
                  <SelectItem value="instagram">📷 Instagram</SelectItem>
                  <SelectItem value="tiktok">🎬 TikTok</SelectItem>
                  <SelectItem value="youtube">▶️ YouTube</SelectItem>
                  <SelectItem value="twitter">🐦 Twitter/X</SelectItem>
                  <SelectItem value="facebook">📘 Facebook</SelectItem>
                  <SelectItem value="snapchat">👻 Snapchat</SelectItem>
                  <SelectItem value="reddit">🔴 Reddit</SelectItem>
                  <SelectItem value="pinterest">📌 Pinterest</SelectItem>
                  <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                  <SelectItem value="vk">👥 ВКонтакте</SelectItem>
                  <SelectItem value="ok">👥 Одноклассники</SelectItem>
                  <SelectItem value="twitch">🎮 Twitch</SelectItem>
                  <SelectItem value="spotify">🎵 Spotify</SelectItem>
                  <SelectItem value="onlyfans">💎 OnlyFans</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Основные данные */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="@username"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Телефон</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+79991234567"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Пароль</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    className="bg-[#1E1F26] border-[#2A2B32] text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Telegram API (если Telegram) */}
            {formData.platform === 'telegram' && (
              <div className="space-y-4 p-4 bg-[#1E1F26] rounded-lg">
                <p className="text-sm font-medium text-white">Telegram API (опционально)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#8A8A8A]">API ID</Label>
                    <Input
                      value={formData.apiId}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiId: e.target.value }))}
                      placeholder="12345678"
                      className="bg-[#14151A] border-[#2A2B32] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#8A8A8A]">API Hash</Label>
                    <Input
                      value={formData.apiHash}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiHash: e.target.value }))}
                      placeholder="abc123..."
                      className="bg-[#14151A] border-[#2A2B32] text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Session Data (JSON)</Label>
                  <Input
                    value={formData.sessionData}
                    onChange={(e) => setFormData(prev => ({ ...prev, sessionData: e.target.value }))}
                    placeholder='{"session": "..."}'
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
              </div>
            )}

            {/* Прокси */}
            <div className="space-y-4 p-4 bg-[#1E1F26] rounded-lg">
              <p className="text-sm font-medium text-white">Прокси (опционально)</p>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Тип</Label>
                  <Select
                    value={formData.proxyType}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, proxyType: v }))}
                  >
                    <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                      <SelectItem value="socks5">SOCKS5</SelectItem>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[#8A8A8A]">Хост</Label>
                  <Input
                    value={formData.proxyHost}
                    onChange={(e) => setFormData(prev => ({ ...prev, proxyHost: e.target.value }))}
                    placeholder="192.168.1.1"
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Порт</Label>
                  <Input
                    value={formData.proxyPort}
                    onChange={(e) => setFormData(prev => ({ ...prev, proxyPort: e.target.value }))}
                    placeholder="1080"
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Логин прокси</Label>
                  <Input
                    value={formData.proxyUsername}
                    onChange={(e) => setFormData(prev => ({ ...prev, proxyUsername: e.target.value }))}
                    placeholder="username"
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Пароль прокси</Label>
                  <Input
                    type="password"
                    value={formData.proxyPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, proxyPassword: e.target.value }))}
                    placeholder="••••••••"
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
              </div>
            </div>

            {/* Лимиты */}
            <div className="space-y-4 p-4 bg-[#1E1F26] rounded-lg">
              <p className="text-sm font-medium text-white">Лимиты активности</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Макс. комментариев</Label>
                  <Input
                    type="number"
                    value={formData.maxComments}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxComments: parseInt(e.target.value) || 50 }))}
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Макс. DM</Label>
                  <Input
                    type="number"
                    value={formData.maxDm}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxDm: parseInt(e.target.value) || 20 }))}
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Макс. подписок</Label>
                  <Input
                    type="number"
                    value={formData.maxFollows}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxFollows: parseInt(e.target.value) || 100 }))}
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
              </div>
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
              {editingAccount ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

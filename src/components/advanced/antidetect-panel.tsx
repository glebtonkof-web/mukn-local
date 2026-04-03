'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Globe,
  Monitor,
  Clock,
  MoreVertical,
  Plus,
  Trash2,
  UserCheck,
  Search,
  Filter,
  Shield,
  Loader2,
  ExternalLink,
} from 'lucide-react';

// Types
interface AntidetectBrowser {
  id: string;
  browserType: string;
  profileId: string;
  profileName: string | null;
  accountId: string | null;
  proxyHost: string | null;
  proxyPort: number | null;
  proxyUsername: string | null;
  proxyPassword: string | null;
  userAgent: string | null;
  screenResolution: string | null;
  timezone: string | null;
  language: string | null;
  status: string;
  lastUsedAt: string | null;
  sessionsCount: number;
  createdAt: string;
  account?: {
    id: string;
    platform: string;
    username: string | null;
    status: string;
  } | null;
}

interface Account {
  id: string;
  platform: string;
  username: string | null;
  status: string;
}

type BrowserType = 'dolphin' | 'indigo' | 'ads-power' | 'go-login';
type BrowserStatus = 'available' | 'in_use' | 'error';

const BROWSER_TYPES: { value: BrowserType; label: string; icon: string }[] = [
  { value: 'dolphin', label: 'Dolphin Anty', icon: '🐬' },
  { value: 'indigo', label: 'Indigo', icon: '🟣' },
  { value: 'ads-power', label: 'AdsPower', icon: '⚡' },
  { value: 'go-login', label: 'GoLogin', icon: '🔵' },
];

const STATUS_CONFIG: Record<BrowserStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  available: { label: 'Доступен', variant: 'default', color: 'bg-green-500' },
  in_use: { label: 'Используется', variant: 'secondary', color: 'bg-yellow-500' },
  error: { label: 'Ошибка', variant: 'destructive', color: 'bg-red-500' },
};

const TIMEZONES = [
  'Europe/Moscow',
  'Europe/Kiev',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
];

const LANGUAGES = [
  { code: 'ru-RU', label: 'Русский' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'es-ES', label: 'Español' },
];

const SCREEN_RESOLUTIONS = [
  '1920x1080',
  '1366x768',
  '1536x864',
  '1440x900',
  '1280x720',
  '2560x1440',
  '3840x2160',
];

export function AntidetectPanel() {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<AntidetectBrowser[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [browserTypeFilter, setBrowserTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AntidetectBrowser | null>(null);
  
  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    browserType: 'dolphin' as BrowserType,
    profileId: '',
    profileName: '',
    proxyHost: '',
    proxyPort: '',
    proxyUsername: '',
    proxyPassword: '',
    userAgent: '',
    screenResolution: '1920x1080',
    timezone: 'Europe/Moscow',
    language: 'ru-RU',
  });

  // Fetch profiles
  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (browserTypeFilter !== 'all') params.set('browserType', browserTypeFilter);
      
      const res = await fetch(`/api/advanced/antidetect?${params.toString()}`);
      const data = await res.json();
      
      if (data.profiles) {
        setProfiles(data.profiles);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts for assignment
  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts?limit=100');
      const data = await res.json();
      if (data.accounts) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [statusFilter, browserTypeFilter]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Filter profiles by search query
  const filteredProfiles = profiles.filter(profile => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      profile.profileId.toLowerCase().includes(query) ||
      profile.profileName?.toLowerCase().includes(query) ||
      profile.account?.username?.toLowerCase().includes(query)
    );
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      browserType: 'dolphin',
      profileId: '',
      profileName: '',
      proxyHost: '',
      proxyPort: '',
      proxyUsername: '',
      proxyPassword: '',
      userAgent: '',
      screenResolution: '1920x1080',
      timezone: 'Europe/Moscow',
      language: 'ru-RU',
    });
    setEditingProfile(null);
  };

  // Open add dialog
  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (profile: AntidetectBrowser) => {
    setEditingProfile(profile);
    setFormData({
      browserType: profile.browserType as BrowserType,
      profileId: profile.profileId,
      profileName: profile.profileName || '',
      proxyHost: profile.proxyHost || '',
      proxyPort: profile.proxyPort?.toString() || '',
      proxyUsername: profile.proxyUsername || '',
      proxyPassword: profile.proxyPassword || '',
      userAgent: profile.userAgent || '',
      screenResolution: profile.screenResolution || '1920x1080',
      timezone: profile.timezone || 'Europe/Moscow',
      language: profile.language || 'ru-RU',
    });
    setDialogOpen(true);
  };

  // Save profile
  const saveProfile = async () => {
    try {
      const body = {
        browserType: formData.browserType,
        profileId: formData.profileId,
        profileName: formData.profileName || null,
        proxyHost: formData.proxyHost || null,
        proxyPort: formData.proxyPort ? parseInt(formData.proxyPort) : null,
        proxyUsername: formData.proxyUsername || null,
        proxyPassword: formData.proxyPassword || null,
        userAgent: formData.userAgent || null,
        screenResolution: formData.screenResolution || null,
        timezone: formData.timezone || null,
        language: formData.language || null,
      };

      if (editingProfile) {
        // Update existing profile
        await fetch('/api/advanced/antidetect', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProfile.id, ...body }),
        });
      } else {
        // Create new profile
        await fetch('/api/advanced/antidetect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchProfiles();
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  // Delete profile
  const deleteProfile = async (id: string) => {
    if (!confirm('Удалить профиль браузера?')) return;
    
    try {
      await fetch(`/api/advanced/antidetect?id=${id}`, {
        method: 'DELETE',
      });
      fetchProfiles();
    } catch (error) {
      console.error('Error deleting profile:', error);
    }
  };

  // Open assign dialog
  const openAssignDialog = (profileId: string) => {
    setSelectedProfileId(profileId);
    setAssignDialogOpen(true);
  };

  // Assign profile to account
  const assignToAccount = async (accountId: string | null) => {
    if (!selectedProfileId) return;
    
    try {
      const profile = profiles.find(p => p.id === selectedProfileId);
      if (!profile) return;

      await fetch('/api/advanced/antidetect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          profileId: profile.profileId,
          accountId: accountId || null,
        }),
      });

      setAssignDialogOpen(false);
      setSelectedProfileId(null);
      fetchProfiles();
    } catch (error) {
      console.error('Error assigning profile:', error);
    }
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Никогда';
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get browser type info
  const getBrowserTypeInfo = (type: string) => {
    return BROWSER_TYPES.find(bt => bt.value === type) || { label: type, icon: '🌐' };
  };

  // Get status config
  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as BrowserStatus] || STATUS_CONFIG.available;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            Антидетект браузеры
          </h3>
          <p className="text-sm text-muted-foreground">
            Управление профилями Dolphin, Indigo, AdsPower, GoLogin
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить профиль
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по ID, названию или аккаунту..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="available">Доступен</SelectItem>
                <SelectItem value="in_use">Используется</SelectItem>
                <SelectItem value="error">Ошибка</SelectItem>
              </SelectContent>
            </Select>
            <Select value={browserTypeFilter} onValueChange={setBrowserTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <Monitor className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Браузер" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все браузеры</SelectItem>
                {BROWSER_TYPES.map(bt => (
                  <SelectItem key={bt.value} value={bt.value}>
                    {bt.icon} {bt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Profiles List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="max-h-[600px] rounded-md">
          <div className="space-y-3 pr-4">
            {filteredProfiles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Нет профилей браузеров
                  </p>
                  <Button variant="outline" className="mt-4" onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить первый профиль
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredProfiles.map((profile) => {
                const browserInfo = getBrowserTypeInfo(profile.browserType);
                const statusConfig = getStatusConfig(profile.status);

                return (
                  <Card key={profile.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Browser Icon & Info */}
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{browserInfo.icon}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{browserInfo.label}</span>
                                <Badge variant={statusConfig.variant}>
                                  <span className={`w-2 h-2 rounded-full ${statusConfig.color} mr-1`} />
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ID: {profile.profileId}
                                {profile.profileName && ` • ${profile.profileName}`}
                              </div>
                            </div>
                          </div>

                          <Separator orientation="vertical" className="h-10" />

                          {/* Account Binding */}
                          <div className="min-w-[150px]">
                            <div className="text-xs text-muted-foreground mb-1">Привязка</div>
                            {profile.account ? (
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">
                                  @{profile.account.username || profile.account.id.slice(0, 8)}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {profile.account.platform}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Не привязан</span>
                            )}
                          </div>

                          <Separator orientation="vertical" className="h-10" />

                          {/* Stats */}
                          <div className="flex items-center gap-6">
                            <div>
                              <div className="text-xs text-muted-foreground">Сессии</div>
                              <div className="font-medium">{profile.sessionsCount}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Последнее использование
                              </div>
                              <div className="text-sm">{formatDate(profile.lastUsedAt)}</div>
                            </div>
                          </div>

                          {/* Proxy Info */}
                          {profile.proxyHost && (
                            <>
                              <Separator orientation="vertical" className="h-10" />
                              <div className="min-w-[120px]">
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  Прокси
                                </div>
                                <div className="text-sm font-mono">
                                  {profile.proxyHost}:{profile.proxyPort}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignDialog(profile.id)}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Привязать
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(profile)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteProfile(profile.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      )}

      {/* Stats Summary */}
      {profiles.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{profiles.length}</div>
              <div className="text-sm text-muted-foreground">Всего профилей</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-500">
                {profiles.filter(p => p.status === 'available').length}
              </div>
              <div className="text-sm text-muted-foreground">Доступно</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-500">
                {profiles.filter(p => p.status === 'in_use').length}
              </div>
              <div className="text-sm text-muted-foreground">Используются</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {profiles.reduce((acc, p) => acc + p.sessionsCount, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Всего сессий</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Profile Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? 'Редактировать профиль' : 'Добавить новый профиль'}
            </DialogTitle>
            <DialogDescription>
              Настройте профиль антидетект браузера с прокси и фингерпринтом
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Browser Type & Profile ID */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип браузера</Label>
                <Select
                  value={formData.browserType}
                  onValueChange={(v) => setFormData({ ...formData, browserType: v as BrowserType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BROWSER_TYPES.map(bt => (
                      <SelectItem key={bt.value} value={bt.value}>
                        {bt.icon} {bt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profile ID</Label>
                <Input
                  placeholder="Уникальный ID профиля"
                  value={formData.profileId}
                  onChange={(e) => setFormData({ ...formData, profileId: e.target.value })}
                  disabled={!!editingProfile}
                />
              </div>
            </div>

            {/* Profile Name */}
            <div className="space-y-2">
              <Label>Название профиля (опционально)</Label>
              <Input
                placeholder="Моё название"
                value={formData.profileName}
                onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
              />
            </div>

            <Separator />

            {/* Proxy Settings */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Настройки прокси
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Хост</Label>
                  <Input
                    placeholder="proxy.example.com"
                    value={formData.proxyHost}
                    onChange={(e) => setFormData({ ...formData, proxyHost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Порт</Label>
                  <Input
                    placeholder="8080"
                    value={formData.proxyPort}
                    onChange={(e) => setFormData({ ...formData, proxyPort: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    placeholder="user"
                    value={formData.proxyUsername}
                    onChange={(e) => setFormData({ ...formData, proxyUsername: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.proxyPassword}
                    onChange={(e) => setFormData({ ...formData, proxyPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Fingerprint Settings */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Настройки фингерпринта
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>User Agent</Label>
                  <Input
                    placeholder="Mozilla/5.0 ..."
                    value={formData.userAgent}
                    onChange={(e) => setFormData({ ...formData, userAgent: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Разрешение экрана</Label>
                    <Select
                      value={formData.screenResolution}
                      onValueChange={(v) => setFormData({ ...formData, screenResolution: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCREEN_RESOLUTIONS.map(res => (
                          <SelectItem key={res} value={res}>{res}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Часовой пояс</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(v) => setFormData({ ...formData, timezone: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Язык</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(v) => setFormData({ ...formData, language: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={saveProfile} disabled={!formData.profileId}>
              {editingProfile ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Account Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Привязать к аккаунту</DialogTitle>
            <DialogDescription>
              Выберите аккаунт для привязки профиля браузера
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 py-2">
              {/* Option to unassign */}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => assignToAccount(null)}
              >
                <Trash2 className="h-4 w-4 mr-2 text-muted-foreground" />
                Отвязать от аккаунта
              </Button>
              
              <Separator className="my-2" />
              
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Нет доступных аккаунтов
                </p>
              ) : (
                accounts.map((account) => (
                  <Button
                    key={account.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => assignToAccount(account.id)}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    <span>@{account.username || account.id.slice(0, 8)}</span>
                    <Badge variant="secondary" className="ml-2">
                      {account.platform}
                    </Badge>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AntidetectPanel;

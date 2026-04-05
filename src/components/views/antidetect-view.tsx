'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  Monitor,
  Clock,
  MoreHorizontal,
  Plus,
  Trash2,
  UserCheck,
  Search,
  Filter,
  Shield,
  Loader2,
  ExternalLink,
  Play,
  Square,
  Pause,
  RefreshCw,
  Cpu,
  HardDrive,
  Wifi,
  MapPin,
  Languages,
  Fingerprint,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Smartphone,
  Server,
  Eye,
  EyeOff,
  Settings,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrowserSettingsPanel } from '@/components/antidetect/browser-settings-panel';

// Types
interface Account {
  id: string;
  platform: string;
  username: string | null;
  status: string;
}

interface AntidetectProfile {
  id: string;
  browserType: string;
  profileId: string;
  profileName: string | null;
  accountId: string | null;
  platform: string | null;
  proxyType: string | null;
  proxyHost: string | null;
  proxyPort: number | null;
  proxyUsername: string | null;
  proxyPassword: string | null;
  userAgent: string | null;
  screenResolution: string | null;
  timezone: string | null;
  language: string | null;
  geolocation: string | null;
  webglRenderer: string | null;
  fingerprint: string | null;
  fingerprintSettings: string | null;
  status: string;
  lastUsedAt: string | null;
  currentSessionStarted: string | null;
  sessionsCount: number;
  cpuUsage: number;
  memoryUsage: number;
  networkUsage: number;
  createdAt: string;
  account?: Account | null;
}

interface ProfileStats {
  total: number;
  available: number;
  inUse: number;
  paused: number;
  error: number;
  avgCpu: number;
  avgMemory: number;
  totalSessions: number;
}

type BrowserType = 'multilogin' | 'octo-browser' | 'morelogin' | 'mostlogin';
type ProfileStatus = 'available' | 'in_use' | 'paused' | 'error';
type PlatformType = 'instagram' | 'tiktok' | 'youtube';
type ProxyType = 'mobile' | 'residential' | 'datacenter';

const BROWSER_TYPES: { value: BrowserType; label: string; icon: string; color: string }[] = [
  { value: 'multilogin', label: 'Multilogin', icon: '🌐', color: 'text-blue-500' },
  { value: 'octo-browser', label: 'Octo Browser', icon: '🐙', color: 'text-purple-500' },
  { value: 'morelogin', label: 'MoreLogin', icon: '🔐', color: 'text-green-500' },
  { value: 'mostlogin', label: 'MostLogin', icon: '🔹', color: 'text-cyan-500' },
];

const PLATFORMS: { value: PlatformType; label: string; icon: string }[] = [
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'youtube', label: 'YouTube', icon: '▶️' },
];

const PROXY_TYPES: { value: ProxyType; label: string; description: string }[] = [
  { value: 'mobile', label: 'Мобильный', description: '4G/5G прокси, высокий уровень доверия' },
  { value: 'residential', label: 'Резидентный', description: 'Домашние IP, средний уровень доверия' },
  { value: 'datacenter', label: 'Дата-центр', description: 'Серверные IP, низкий уровень доверия' },
];

const STATUS_CONFIG: Record<ProfileStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string; bgColor: string; icon: typeof CheckCircle }> = {
  available: { label: 'Доступен', variant: 'default', color: 'text-green-500', bgColor: 'bg-green-500', icon: CheckCircle },
  in_use: { label: 'Активен', variant: 'secondary', color: 'text-blue-500', bgColor: 'bg-blue-500', icon: Activity },
  paused: { label: 'Пауза', variant: 'outline', color: 'text-yellow-500', bgColor: 'bg-yellow-500', icon: Pause },
  error: { label: 'Ошибка', variant: 'destructive', color: 'text-red-500', bgColor: 'bg-red-500', icon: XCircle },
};

const TIMEZONES = [
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)', offset: '+3' },
  { value: 'Europe/Kiev', label: 'Киев (UTC+2)', offset: '+2' },
  { value: 'Europe/London', label: 'Лондон (UTC+0)', offset: '+0' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1)', offset: '+1' },
  { value: 'Europe/Paris', label: 'Париж (UTC+1)', offset: '+1' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5)', offset: '-5' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8)', offset: '-8' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)', offset: '+4' },
  { value: 'Asia/Singapore', label: 'Сингапур (UTC+8)', offset: '+8' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)', offset: '+9' },
];

const LANGUAGES = [
  { code: 'ru-RU', label: 'Русский' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'es-ES', label: 'Español' },
  { code: 'pt-BR', label: 'Português' },
  { code: 'ja-JP', label: '日本語' },
];

const SCREEN_RESOLUTIONS = [
  '1920x1080',
  '1366x768',
  '1536x864',
  '1440x900',
  '1280x720',
  '2560x1440',
  '3840x2160',
  '2560x1600',
  '1680x1050',
];

// Default User Agents
const DEFAULT_USER_AGENTS: Record<PlatformType, string[]> = {
  instagram: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ],
  tiktok: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  ],
  youtube: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ],
};

export function AntidetectView() {
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<AntidetectProfile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [browserTypeFilter, setBrowserTypeFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AntidetectProfile | null>(null);
  const [launchingProfileId, setLaunchingProfileId] = useState<string | null>(null);
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'profiles' | 'settings'>('profiles');
  
  // Form state
  const [formData, setFormData] = useState({
    browserType: 'multilogin' as BrowserType,
    profileId: '',
    profileName: '',
    platform: '' as PlatformType | '',
    proxyType: 'mobile' as ProxyType,
    proxyHost: '',
    proxyPort: '',
    proxyUsername: '',
    proxyPassword: '',
    userAgent: '',
    screenResolution: '1920x1080',
    timezone: 'Europe/Moscow',
    language: 'ru-RU',
    geolocation: '',
    fingerprintSettings: {
      webgl: true,
      canvas: true,
      audioContext: true,
      webRTC: true,
      fontFingerprint: true,
      hardwareConcurrency: true,
      deviceMemory: true,
    },
  });

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (browserTypeFilter !== 'all') params.set('browserType', browserTypeFilter);
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      
      const res = await fetch(`/api/antidetect/profiles?${params.toString()}`);
      const data = await res.json();
      
      if (data.profiles) {
        setProfiles(data.profiles);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить профили',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, browserTypeFilter, platformFilter, toast]);

  // Fetch accounts for assignment
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts?limit=100');
      const data = await res.json();
      if (data.accounts) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Filter profiles by search query
  const filteredProfiles = profiles.filter(profile => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      profile.profileId.toLowerCase().includes(query) ||
      profile.profileName?.toLowerCase().includes(query) ||
      profile.account?.username?.toLowerCase().includes(query) ||
      profile.platform?.toLowerCase().includes(query)
    );
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      browserType: 'multilogin',
      profileId: '',
      profileName: '',
      platform: '',
      proxyType: 'mobile',
      proxyHost: '',
      proxyPort: '',
      proxyUsername: '',
      proxyPassword: '',
      userAgent: '',
      screenResolution: '1920x1080',
      timezone: 'Europe/Moscow',
      language: 'ru-RU',
      geolocation: '',
      fingerprintSettings: {
        webgl: true,
        canvas: true,
        audioContext: true,
        webRTC: true,
        fontFingerprint: true,
        hardwareConcurrency: true,
        deviceMemory: true,
      },
    });
    setSelectedProfile(null);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (profile: AntidetectProfile) => {
    setSelectedProfile(profile);
    setFormData({
      browserType: profile.browserType as BrowserType,
      profileId: profile.profileId,
      profileName: profile.profileName || '',
      platform: (profile.platform as PlatformType) || '',
      proxyType: (profile.proxyType as ProxyType) || 'mobile',
      proxyHost: profile.proxyHost || '',
      proxyPort: profile.proxyPort?.toString() || '',
      proxyUsername: profile.proxyUsername || '',
      proxyPassword: profile.proxyPassword || '',
      userAgent: profile.userAgent || '',
      screenResolution: profile.screenResolution || '1920x1080',
      timezone: profile.timezone || 'Europe/Moscow',
      language: profile.language || 'ru-RU',
      geolocation: profile.geolocation || '',
      fingerprintSettings: profile.fingerprintSettings 
        ? JSON.parse(profile.fingerprintSettings)
        : {
            webgl: true,
            canvas: true,
            audioContext: true,
            webRTC: true,
            fontFingerprint: true,
            hardwareConcurrency: true,
            deviceMemory: true,
          },
    });
    setEditDialogOpen(true);
  };

  // Save profile (create or update)
  const saveProfile = async (isEdit: boolean) => {
    try {
      const body = {
        ...(isEdit && { id: selectedProfile?.id }),
        browserType: formData.browserType,
        profileId: formData.profileId,
        profileName: formData.profileName || null,
        platform: formData.platform || null,
        proxyType: formData.proxyType,
        proxyHost: formData.proxyHost || null,
        proxyPort: formData.proxyPort ? parseInt(formData.proxyPort) : null,
        proxyUsername: formData.proxyUsername || null,
        proxyPassword: formData.proxyPassword || null,
        userAgent: formData.userAgent || null,
        screenResolution: formData.screenResolution || null,
        timezone: formData.timezone || null,
        language: formData.language || null,
        geolocation: formData.geolocation || null,
        fingerprintSettings: JSON.stringify(formData.fingerprintSettings),
      };

      const res = await fetch('/api/antidetect/profiles', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка сохранения');
      }

      toast({
        title: isEdit ? 'Профиль обновлен' : 'Профиль создан',
        description: `Профиль ${formData.profileId} успешно ${isEdit ? 'обновлен' : 'создан'}`,
      });

      setCreateDialogOpen(false);
      setEditDialogOpen(false);
      resetForm();
      fetchProfiles();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сохранить профиль',
        variant: 'destructive',
      });
    }
  };

  // Delete profile
  const deleteProfile = async () => {
    if (!selectedProfile) return;
    
    try {
      const res = await fetch(`/api/antidetect/profiles/${selectedProfile.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка удаления');
      }

      toast({
        title: 'Профиль удален',
        description: `Профиль ${selectedProfile.profileId} успешно удален`,
      });

      setDeleteDialogOpen(false);
      setSelectedProfile(null);
      fetchProfiles();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить профиль',
        variant: 'destructive',
      });
    }
  };

  // Launch profile
  const launchProfile = async (profile: AntidetectProfile) => {
    setLaunchingProfileId(profile.id);
    try {
      const res = await fetch(`/api/antidetect/profiles/${profile.id}/launch`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка запуска');
      }

      toast({
        title: 'Браузер запущен',
        description: `Профиль ${profile.profileId} успешно запущен`,
      });

      fetchProfiles();
    } catch (error) {
      toast({
        title: 'Ошибка запуска',
        description: error instanceof Error ? error.message : 'Не удалось запустить браузер',
        variant: 'destructive',
      });
    } finally {
      setLaunchingProfileId(null);
    }
  };

  // Stop profile
  const stopProfile = async (profile: AntidetectProfile) => {
    try {
      const res = await fetch(`/api/antidetect/profiles/${profile.id}/launch`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка остановки');
      }

      toast({
        title: 'Браузер остановлен',
        description: `Профиль ${profile.profileId} успешно остановлен`,
      });

      fetchProfiles();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось остановить браузер',
        variant: 'destructive',
      });
    }
  };

  // Assign profile to account
  const assignToAccount = async (accountId: string | null) => {
    if (!selectedProfile) return;
    
    try {
      const res = await fetch('/api/antidetect/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProfile.id,
          accountId: accountId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка привязки');
      }

      toast({
        title: accountId ? 'Профиль привязан' : 'Профиль отвязан',
        description: accountId 
          ? `Профиль привязан к аккаунту` 
          : `Профиль отвязан от аккаунта`,
      });

      setAssignDialogOpen(false);
      setSelectedProfile(null);
      fetchProfiles();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось привязать профиль',
        variant: 'destructive',
      });
    }
  };

  // Update profile status
  const updateStatus = async (profile: AntidetectProfile, status: ProfileStatus) => {
    try {
      const res = await fetch('/api/antidetect/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile.id,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка изменения статуса');
      }

      toast({
        title: 'Статус изменен',
        description: `Статус профиля изменен на "${STATUS_CONFIG[status].label}"`,
      });

      fetchProfiles();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось изменить статус',
        variant: 'destructive',
      });
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
    return BROWSER_TYPES.find(bt => bt.value === type) || { label: type, icon: '🌐', color: 'text-gray-500' };
  };

  // Get status config
  const getStatusConfig = (status: string): typeof STATUS_CONFIG.available => {
    return STATUS_CONFIG[status as ProfileStatus] || STATUS_CONFIG.available;
  };

  // Get platform info
  const getPlatformInfo = (platform: string | null) => {
    return PLATFORMS.find(p => p.value === platform) || null;
  };

  // Generate random User Agent
  const generateRandomUA = () => {
    if (formData.platform) {
      const uas = DEFAULT_USER_AGENTS[formData.platform as PlatformType];
      const randomUA = uas[Math.floor(Math.random() * uas.length)];
      setFormData({ ...formData, userAgent: randomUA });
    } else {
      setFormData({ 
        ...formData, 
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      });
    }
  };

  // Generate random profile ID
  const generateProfileId = () => {
    const id = `${formData.browserType}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
    setFormData({ ...formData, profileId: id });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-500" />
            Антидетект-браузеры
          </h2>
          <p className="text-muted-foreground">
            Управление профилями Multilogin, Octo Browser, MoreLogin, MostLogin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab('settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Настройки
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Создать профиль
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'profiles' | 'settings')}>
        <TabsList>
          <TabsTrigger value="profiles">Профили</TabsTrigger>
          <TabsTrigger value="settings">Настройки подключения</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <BrowserSettingsPanel />
        </TabsContent>

        <TabsContent value="profiles" className="mt-4 space-y-6">

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Всего</span>
              </div>
              <div className="text-2xl font-bold mt-1">{profiles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Доступно</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-green-500">{stats.available}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Активны</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-blue-500">{stats.inUse}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Pause className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Пауза</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-yellow-500">{stats.paused}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Ошибки</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-red-500">{stats.error}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">CPU</span>
              </div>
              <div className="text-2xl font-bold mt-1">{stats.avgCpu.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">RAM</span>
              </div>
              <div className="text-2xl font-bold mt-1">{stats.avgMemory.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-500" />
                <span className="text-sm text-muted-foreground">Сессии</span>
              </div>
              <div className="text-2xl font-bold mt-1">{stats.totalSessions}</div>
            </CardContent>
          </Card>
        </div>
      )}

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
                <SelectItem value="in_use">Активен</SelectItem>
                <SelectItem value="paused">Пауза</SelectItem>
                <SelectItem value="error">Ошибка</SelectItem>
              </SelectContent>
            </Select>
            <Select value={browserTypeFilter} onValueChange={setBrowserTypeFilter}>
              <SelectTrigger className="w-[170px]">
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
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[150px]">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Платформа" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все платформы</SelectItem>
                {PLATFORMS.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.icon} {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fetchProfiles()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profiles List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-400px)] rounded-md">
          <div className="space-y-3 pr-4">
            {filteredProfiles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    Нет профилей браузеров
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Создайте первый профиль для управления антидетект-браузерами
                  </p>
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Создать первый профиль
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredProfiles.map((profile) => {
                const browserInfo = getBrowserTypeInfo(profile.browserType);
                const statusConfig = getStatusConfig(profile.status);
                const platformInfo = getPlatformInfo(profile.platform);
                const StatusIcon = statusConfig.icon;

                return (
                  <Card key={profile.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Browser Icon & Info */}
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="text-3xl">{browserInfo.icon}</div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-semibold ${browserInfo.color}`}>
                                  {browserInfo.label}
                                </span>
                                <Badge variant={statusConfig.variant}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                                {platformInfo && (
                                  <Badge variant="outline" className="text-xs">
                                    {platformInfo.icon} {platformInfo.label}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground font-mono mt-1">
                                {profile.profileId}
                              </div>
                              {profile.profileName && (
                                <div className="text-sm font-medium mt-0.5">
                                  {profile.profileName}
                                </div>
                              )}
                            </div>
                          </div>

                          <Separator orientation="vertical" className="h-24" />

                          {/* Account Binding */}
                          <div className="min-w-[150px]">
                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              Привязка
                            </div>
                            {profile.account ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  @{profile.account.username || profile.account.id.slice(0, 8)}
                                </span>
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {profile.account.platform}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Не привязан</span>
                            )}
                          </div>

                          <Separator orientation="vertical" className="h-24" />

                          {/* Proxy Info */}
                          <div className="min-w-[150px]">
                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Прокси ({profile.proxyType || 'Не указан'})
                            </div>
                            {profile.proxyHost ? (
                              <div className="text-sm font-mono">
                                {profile.proxyHost}:{profile.proxyPort}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Не настроен</span>
                            )}
                          </div>

                          <Separator orientation="vertical" className="h-24" />

                          {/* Stats & Resources */}
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="text-xs text-muted-foreground">Сессии</div>
                              <div className="font-medium">{profile.sessionsCount}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Последний запуск</div>
                              <div className="text-sm">{formatDate(profile.lastUsedAt)}</div>
                            </div>
                            {profile.status === 'in_use' && (
                              <>
                                <div className="min-w-[100px]">
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Cpu className="h-3 w-3" /> CPU
                                  </div>
                                  <Progress value={profile.cpuUsage} className="h-2 mt-1" />
                                  <div className="text-xs text-right mt-0.5">{profile.cpuUsage.toFixed(1)}%</div>
                                </div>
                                <div className="min-w-[100px]">
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <HardDrive className="h-3 w-3" /> RAM
                                  </div>
                                  <Progress value={profile.memoryUsage} className="h-2 mt-1" />
                                  <div className="text-xs text-right mt-0.5">{profile.memoryUsage.toFixed(1)}%</div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {profile.status === 'available' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => launchProfile(profile)}
                              disabled={launchingProfileId === profile.id}
                            >
                              {launchingProfileId === profile.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-1" />
                              )}
                              Запустить
                            </Button>
                          )}
                          {profile.status === 'in_use' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => stopProfile(profile)}
                            >
                              <Square className="h-4 w-4 mr-1" />
                              Остановить
                            </Button>
                          )}
                          {profile.status === 'paused' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus(profile, 'available')}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Возобновить
                            </Button>
                          )}
                          {profile.status === 'error' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus(profile, 'available')}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Сбросить
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(profile)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedProfile(profile);
                                setAssignDialogOpen(true);
                              }}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Привязать к аккаунту
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {profile.status === 'in_use' && (
                                <DropdownMenuItem onClick={() => updateStatus(profile, 'paused')}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Пауза
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedProfile(profile);
                                  setDeleteDialogOpen(true);
                                }}
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

      {/* Create Profile Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Создать профиль браузера
            </DialogTitle>
            <DialogDescription>
              Настройте новый профиль антидетект-браузера с прокси и фингерпринтом
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Основное</TabsTrigger>
              <TabsTrigger value="proxy">Прокси</TabsTrigger>
              <TabsTrigger value="fingerprint">Фингерпринт</TabsTrigger>
              <TabsTrigger value="advanced">Дополнительно</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип браузера *</Label>
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
                  <Label>Profile ID *</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Уникальный ID профиля"
                      value={formData.profileId}
                      onChange={(e) => setFormData({ ...formData, profileId: e.target.value })}
                    />
                    <Button variant="outline" size="icon" onClick={generateProfileId} title="Сгенерировать">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Название профиля</Label>
                <Input
                  placeholder="Моё название для профиля"
                  value={formData.profileName}
                  onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Платформа</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(v) => setFormData({ ...formData, platform: v as PlatformType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите платформу" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.icon} {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="proxy" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Тип прокси</Label>
                <Select
                  value={formData.proxyType}
                  onValueChange={(v) => setFormData({ ...formData, proxyType: v as ProxyType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROXY_TYPES.map(pt => (
                      <SelectItem key={pt.value} value={pt.value}>
                        <div>
                          <span className="font-medium">{pt.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {pt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
            </TabsContent>

            <TabsContent value="fingerprint" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>User Agent</Label>
                  <Button variant="ghost" size="sm" onClick={generateRandomUA}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Сгенерировать
                  </Button>
                </div>
                <Textarea
                  placeholder="Mozilla/5.0 ..."
                  value={formData.userAgent}
                  onChange={(e) => setFormData({ ...formData, userAgent: e.target.value })}
                  className="font-mono text-xs"
                  rows={3}
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
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
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

              <Separator />

              <div>
                <Label className="mb-3 block flex items-center gap-2">
                  <Fingerprint className="h-4 w-4" />
                  Настройки фингерпринта
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">WebGL</span>
                    <Switch
                      checked={formData.fingerprintSettings.webgl}
                      onCheckedChange={(v) => setFormData({
                        ...formData,
                        fingerprintSettings: { ...formData.fingerprintSettings, webgl: v }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Canvas</span>
                    <Switch
                      checked={formData.fingerprintSettings.canvas}
                      onCheckedChange={(v) => setFormData({
                        ...formData,
                        fingerprintSettings: { ...formData.fingerprintSettings, canvas: v }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Audio Context</span>
                    <Switch
                      checked={formData.fingerprintSettings.audioContext}
                      onCheckedChange={(v) => setFormData({
                        ...formData,
                        fingerprintSettings: { ...formData.fingerprintSettings, audioContext: v }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">WebRTC</span>
                    <Switch
                      checked={formData.fingerprintSettings.webRTC}
                      onCheckedChange={(v) => setFormData({
                        ...formData,
                        fingerprintSettings: { ...formData.fingerprintSettings, webRTC: v }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Fonts</span>
                    <Switch
                      checked={formData.fingerprintSettings.fontFingerprint}
                      onCheckedChange={(v) => setFormData({
                        ...formData,
                        fingerprintSettings: { ...formData.fingerprintSettings, fontFingerprint: v }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Hardware</span>
                    <Switch
                      checked={formData.fingerprintSettings.hardwareConcurrency}
                      onCheckedChange={(v) => setFormData({
                        ...formData,
                        fingerprintSettings: { ...formData.fingerprintSettings, hardwareConcurrency: v }
                      })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Геолокация (lat,lng)
                </Label>
                <Input
                  placeholder="55.7558,37.6173"
                  value={formData.geolocation}
                  onChange={(e) => setFormData({ ...formData, geolocation: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Формат: широта,долгота. Должно соответствовать часовому поясу и прокси.
                </p>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Рекомендации по безопасности</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Используйте мобильные прокси для максимальной безопасности</li>
                        <li>• Геолокация должна соответствовать IP прокси</li>
                        <li>• Часовой пояс и язык должны совпадать с регионом</li>
                        <li>• Один профиль = один аккаунт (правило 1:1)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => saveProfile(false)} disabled={!formData.profileId}>
              <Plus className="h-4 w-4 mr-2" />
              Создать профиль
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Редактировать профиль
            </DialogTitle>
            <DialogDescription>
              Измените настройки профиля антидетект-браузера
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Основное</TabsTrigger>
              <TabsTrigger value="proxy">Прокси</TabsTrigger>
              <TabsTrigger value="fingerprint">Фингерпринт</TabsTrigger>
              <TabsTrigger value="advanced">Дополнительно</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
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
                    value={formData.profileId}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Название профиля</Label>
                <Input
                  placeholder="Моё название для профиля"
                  value={formData.profileName}
                  onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Платформа</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(v) => setFormData({ ...formData, platform: v as PlatformType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите платформу" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.icon} {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="proxy" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Тип прокси</Label>
                <Select
                  value={formData.proxyType}
                  onValueChange={(v) => setFormData({ ...formData, proxyType: v as ProxyType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROXY_TYPES.map(pt => (
                      <SelectItem key={pt.value} value={pt.value}>
                        <div>
                          <span className="font-medium">{pt.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {pt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
            </TabsContent>

            <TabsContent value="fingerprint" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>User Agent</Label>
                  <Button variant="ghost" size="sm" onClick={generateRandomUA}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Сгенерировать
                  </Button>
                </div>
                <Textarea
                  placeholder="Mozilla/5.0 ..."
                  value={formData.userAgent}
                  onChange={(e) => setFormData({ ...formData, userAgent: e.target.value })}
                  className="font-mono text-xs"
                  rows={3}
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
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
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

              <Separator />

              <div>
                <Label className="mb-3 block flex items-center gap-2">
                  <Fingerprint className="h-4 w-4" />
                  Настройки фингерпринта
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(formData.fingerprintSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <Switch
                        checked={value as boolean}
                        onCheckedChange={(v) => setFormData({
                          ...formData,
                          fingerprintSettings: { ...formData.fingerprintSettings, [key]: v }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Геолокация (lat,lng)
                </Label>
                <Input
                  placeholder="55.7558,37.6173"
                  value={formData.geolocation}
                  onChange={(e) => setFormData({ ...formData, geolocation: e.target.value })}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => saveProfile(true)}>
              Сохранить изменения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Account Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Привязать к аккаунту
            </DialogTitle>
            <DialogDescription>
              Выберите аккаунт для привязки профиля браузера (1 профиль = 1 аккаунт)
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] mt-4">
            <div className="space-y-2">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Удалить профиль?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить профиль <strong>{selectedProfile?.profileId}</strong>?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={deleteProfile} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AntidetectView;

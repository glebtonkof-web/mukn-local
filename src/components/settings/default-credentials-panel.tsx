'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  Eye,
  EyeOff,
  Loader2,
  Key,
  User,
  Mail,
  Phone,
  Lock,
  Globe,
  MessageSquare,
  Video,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Все платформы
const PLATFORMS = [
  { id: 'telegram', name: 'Telegram', icon: MessageSquare, color: '#0088cc', group: 'messengers' },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: '#25D366', group: 'messengers' },
  { id: 'discord', name: 'Discord', icon: MessageSquare, color: '#5865F2', group: 'messengers' },
  { id: 'instagram', name: 'Instagram', icon: Globe, color: '#E4405F', group: 'social' },
  { id: 'tiktok', name: 'TikTok', icon: Video, color: '#000000', group: 'social' },
  { id: 'youtube', name: 'YouTube', icon: Video, color: '#FF0000', group: 'social' },
  { id: 'twitter', name: 'Twitter/X', icon: Globe, color: '#1DA1F2', group: 'social' },
  { id: 'facebook', name: 'Facebook', icon: Globe, color: '#1877F2', group: 'social' },
  { id: 'snapchat', name: 'Snapchat', icon: Globe, color: '#FFFC00', group: 'social' },
  { id: 'reddit', name: 'Reddit', icon: Globe, color: '#FF4500', group: 'social' },
  { id: 'pinterest', name: 'Pinterest', icon: Globe, color: '#E60023', group: 'social' },
  { id: 'linkedin', name: 'LinkedIn', icon: Globe, color: '#0A66C2', group: 'social' },
  { id: 'vk', name: 'ВКонтакте', icon: Globe, color: '#0077FF', group: 'russian' },
  { id: 'ok', name: 'Одноклассники', icon: Globe, color: '#EE8208', group: 'russian' },
  { id: 'twitch', name: 'Twitch', icon: Video, color: '#9146FF', group: 'streaming' },
  { id: 'spotify', name: 'Spotify', icon: Globe, color: '#1DB954', group: 'streaming' },
  { id: 'onlyfans', name: 'OnlyFans', icon: Globe, color: '#00AFF0', group: 'other' },
];

interface PlatformCredentials {
  platform: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  useSamePassword: boolean;
  useSameEmail: boolean;
  useSameUsername: boolean;
}

interface GlobalCredentials {
  defaultUsername: string;
  defaultPassword: string;
  defaultEmail: string;
  defaultPhone: string;
  autoFillEnabled: boolean;
}

export function DefaultCredentialsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // Глобальные настройки (применяются ко всем платформам)
  const [globalCredentials, setGlobalCredentials] = useState<GlobalCredentials>({
    defaultUsername: '',
    defaultPassword: '',
    defaultEmail: '',
    defaultPhone: '',
    autoFillEnabled: true,
  });

  // Учётные данные для каждой платформы
  const [platformCredentials, setPlatformCredentials] = useState<Record<string, PlatformCredentials>>(() => {
    const initial: Record<string, PlatformCredentials> = {};
    PLATFORMS.forEach(p => {
      initial[p.id] = {
        platform: p.id,
        username: '',
        password: '',
        email: '',
        phone: '',
        useSamePassword: true,
        useSameEmail: true,
        useSameUsername: true,
      };
    });
    return initial;
  });

  // Загрузка данных
  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/default-credentials');
      if (response.ok) {
        const data = await response.json();
        if (data.global) {
          setGlobalCredentials(data.global);
        }
        if (data.platforms) {
          setPlatformCredentials(prev => ({
            ...prev,
            ...data.platforms
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  // Сохранение данных
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/default-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          global: globalCredentials,
          platforms: platformCredentials,
        }),
      });

      if (response.ok) {
        toast.success('Учётные данные сохранены');
      } else {
        toast.error('Ошибка сохранения');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  // Обновление глобальных настроек
  const updateGlobal = (field: keyof GlobalCredentials, value: string | boolean) => {
    setGlobalCredentials(prev => ({ ...prev, [field]: value }));
  };

  // Обновление платформы
  const updatePlatform = (platformId: string, field: keyof PlatformCredentials, value: string | boolean) => {
    setPlatformCredentials(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        [field]: value
      }
    }));
  };

  // Получить значение поля (глобальное или специфичное для платформы)
  const getFieldValue = (platformId: string, field: 'username' | 'password' | 'email' | 'phone') => {
    const platform = platformCredentials[platformId];
    const useSameField = `useSame${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof PlatformCredentials;
    
    if (platform[useSameField] as boolean) {
      return globalCredentials[`default${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof GlobalCredentials];
    }
    return platform[field];
  };

  // Фильтрация платформ
  const filteredPlatforms = activeGroup === 'all' 
    ? PLATFORMS 
    : PLATFORMS.filter(p => p.group === activeGroup);

  // Быстрое применение ко всем
  const applyToAll = (field: 'username' | 'password' | 'email' | 'phone') => {
    const globalField = `default${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof GlobalCredentials;
    const useSameField = `useSame${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof PlatformCredentials;
    
    setPlatformCredentials(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(platformId => {
        updated[platformId] = {
          ...updated[platformId],
          [useSameField]: true,
        };
      });
      return updated;
    });
    toast.success(`Применено ко всем платформам`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Глобальные настройки */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-[#6C63FF]" />
                Учётные данные по умолчанию
              </CardTitle>
              <CardDescription>
                Эти данные будут автоматически подставляться при регистрации аккаунтов
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[#8A8A8A] text-sm">Автозаполнение</Label>
              <Switch
                checked={globalCredentials.autoFillEnabled}
                onCheckedChange={(v) => updateGlobal('autoFillEnabled', v)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Логин по умолчанию */}
            <div className="space-y-2">
              <Label className="text-[#8A8A8A] flex items-center gap-2">
                <User className="w-4 h-4" />
                Логин по умолчанию
              </Label>
              <Input
                value={globalCredentials.defaultUsername}
                onChange={(e) => updateGlobal('defaultUsername', e.target.value)}
                placeholder="username"
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyToAll('username')}
                className="w-full text-xs text-[#8A8A8A] hover:text-white"
              >
                Применить ко всем
              </Button>
            </div>

            {/* Пароль по умолчанию */}
            <div className="space-y-2">
              <Label className="text-[#8A8A8A] flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Пароль по умолчанию
              </Label>
              <div className="relative">
                <Input
                  type={showPasswords['global'] ? 'text' : 'password'}
                  value={globalCredentials.defaultPassword}
                  onChange={(e) => updateGlobal('defaultPassword', e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, global: !prev['global'] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-white"
                >
                  {showPasswords['global'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyToAll('password')}
                className="w-full text-xs text-[#8A8A8A] hover:text-white"
              >
                Применить ко всем
              </Button>
            </div>

            {/* Email по умолчанию */}
            <div className="space-y-2">
              <Label className="text-[#8A8A8A] flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email по умолчанию
              </Label>
              <Input
                type="email"
                value={globalCredentials.defaultEmail}
                onChange={(e) => updateGlobal('defaultEmail', e.target.value)}
                placeholder="email@example.com"
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyToAll('email')}
                className="w-full text-xs text-[#8A8A8A] hover:text-white"
              >
                Применить ко всем
              </Button>
            </div>

            {/* Телефон по умолчанию */}
            <div className="space-y-2">
              <Label className="text-[#8A8A8A] flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Телефон по умолчанию
              </Label>
              <Input
                type="tel"
                value={globalCredentials.defaultPhone}
                onChange={(e) => updateGlobal('defaultPhone', e.target.value)}
                placeholder="+79991234567"
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyToAll('phone')}
                className="w-full text-xs text-[#8A8A8A] hover:text-white"
              >
                Применить ко всем
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Фильтры по группам */}
      <div className="flex flex-wrap bg-[#1E1F26] rounded-lg p-1 gap-1">
        {[
          { id: 'all', label: 'Все платформы' },
          { id: 'messengers', label: 'Мессенджеры' },
          { id: 'social', label: 'Соцсети' },
          { id: 'russian', label: 'РФ' },
          { id: 'streaming', label: 'Стриминг' },
          { id: 'other', label: 'Другое' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveGroup(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              activeGroup === f.id
                ? 'bg-[#6C63FF] text-white'
                : 'text-[#8A8A8A] hover:text-white'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Платформы */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlatforms.map((platform) => {
          const PlatformIcon = platform.icon;
          const creds = platformCredentials[platform.id];
          const hasOverride = !creds.useSamePassword || !creds.useSameEmail || !creds.useSameUsername;

          return (
            <Card key={platform.id} className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: platform.color + '20' }}
                    >
                      <PlatformIcon className="w-5 h-5" style={{ color: platform.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-white text-sm">{platform.name}</CardTitle>
                      {hasOverride && (
                        <Badge variant="outline" className="text-xs mt-1 border-[#6C63FF] text-[#6C63FF]">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Особые настройки
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Использовать глобальные настройки? */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8A8A8A]">Использовать глобальные</span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={creds.useSamePassword && creds.useSameEmail && creds.useSameUsername}
                      onCheckedChange={(v) => {
                        updatePlatform(platform.id, 'useSamePassword', v);
                        updatePlatform(platform.id, 'useSameEmail', v);
                        updatePlatform(platform.id, 'useSameUsername', v);
                      }}
                      className="scale-75"
                    />
                  </div>
                </div>

                {/* Поля платформы */}
                {!(creds.useSameUsername && creds.useSamePassword && creds.useSameEmail) && (
                  <div className="space-y-2 pt-2 border-t border-[#2A2B32]">
                    {!creds.useSameUsername && (
                      <div className="space-y-1">
                        <Label className="text-[#8A8A8A] text-xs">Логин</Label>
                        <Input
                          value={creds.username}
                          onChange={(e) => updatePlatform(platform.id, 'username', e.target.value)}
                          placeholder="username"
                          className="bg-[#1E1F26] border-[#2A2B32] text-white h-8 text-sm"
                        />
                      </div>
                    )}
                    {!creds.useSamePassword && (
                      <div className="space-y-1">
                        <Label className="text-[#8A8A8A] text-xs">Пароль</Label>
                        <div className="relative">
                          <Input
                            type={showPasswords[platform.id] ? 'text' : 'password'}
                            value={creds.password}
                            onChange={(e) => updatePlatform(platform.id, 'password', e.target.value)}
                            placeholder="••••••••"
                            className="bg-[#1E1F26] border-[#2A2B32] text-white h-8 text-sm pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, [platform.id]: !prev[platform.id] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-white"
                          >
                            {showPasswords[platform.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {!creds.useSameEmail && (
                      <div className="space-y-1">
                        <Label className="text-[#8A8A8A] text-xs">Email</Label>
                        <Input
                          type="email"
                          value={creds.email}
                          onChange={(e) => updatePlatform(platform.id, 'email', e.target.value)}
                          placeholder="email@example.com"
                          className="bg-[#1E1F26] border-[#2A2B32] text-white h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Превью */}
                <div className="mt-3 pt-3 border-t border-[#2A2B32]">
                  <p className="text-xs text-[#8A8A8A] mb-2">Будет использовано:</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs border-[#2A2B32]">
                      <User className="w-3 h-3 mr-1" />
                      {getFieldValue(platform.id, 'username') || '—'}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-[#2A2B32]">
                      <Lock className="w-3 h-3 mr-1" />
                      ••••
                    </Badge>
                    <Badge variant="outline" className="text-xs border-[#2A2B32]">
                      <Mail className="w-3 h-3 mr-1" />
                      {getFieldValue(platform.id, 'email') || '—'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Кнопка сохранения */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Сохранить все учётные данные
        </Button>
      </div>
    </div>
  );
}

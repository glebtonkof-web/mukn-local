'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare,
  Instagram,
  Music,
  Youtube,
  Twitter,
  Save,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface PlatformSettingsData {
  id: string;
  platform: string;
  inheritGlobal: boolean;
  apiConfig: string | null;
  publishConfig: string | null;
  storiesConfig: string | null;
  postsConfig: string | null;
  reelsConfig: string | null;
  shortsConfig: string | null;
}

const platforms = [
  { id: 'telegram', name: 'Telegram', icon: MessageSquare, color: '#0088cc' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'tiktok', name: 'TikTok', icon: Music, color: '#000000' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'twitter', name: 'Twitter', icon: Twitter, color: '#1DA1F2' },
];

export function PlatformSettingsTab() {
  const [selectedPlatform, setSelectedPlatform] = useState('telegram');
  const [settings, setSettings] = useState<Record<string, PlatformSettingsData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/platform');
      if (response.ok) {
        const data = await response.json();
        const settingsMap: Record<string, PlatformSettingsData> = {};
        data.forEach((s: PlatformSettingsData) => {
          settingsMap[s.platform] = s;
        });
        setSettings(settingsMap);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек платформ:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Получить текущие настройки для выбранной платформы
  const getCurrentSettings = (): PlatformSettingsData => {
    return settings[selectedPlatform] || {
      id: '',
      platform: selectedPlatform,
      inheritGlobal: true,
      apiConfig: null,
      publishConfig: null,
      storiesConfig: null,
      postsConfig: null,
      reelsConfig: null,
      shortsConfig: null,
    };
  };

  // Обновить настройку для текущей платформы
  const updateSetting = (key: keyof PlatformSettingsData, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [selectedPlatform]: {
        ...getCurrentSettings(),
        [key]: value,
      }
    }));
  };

  // Сохранение настроек
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const currentSettings = getCurrentSettings();
      const response = await fetch('/api/settings/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSettings),
      });

      if (response.ok) {
        toast.success('Настройки платформы сохранены');
      } else {
        throw new Error('Ошибка сохранения');
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    );
  }

  const currentSettings = getCurrentSettings();

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {/* Выбор платформы */}
      <div className="flex gap-2 flex-wrap">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          const isActive = selectedPlatform === platform.id;
          const hasSettings = settings[platform.id];
          
          return (
            <Button
              key={platform.id}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPlatform(platform.id)}
              className={cn(
                'gap-2',
                isActive 
                  ? 'bg-[#6C63FF] hover:bg-[#6C63FF]/80' 
                  : 'border-[#2A2B32] text-[#8A8A8A] hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {platform.name}
              {hasSettings && (
                <Badge variant="outline" className="ml-1 border-[#00D26A] text-[#00D26A] text-xs">
                  <Check className="w-3 h-3" />
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Настройки платформы */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            {platforms.find(p => p.id === selectedPlatform)?.name} настройки
          </CardTitle>
          <CardDescription className="text-[#8A8A8A]">
            Специфичные настройки для {platforms.find(p => p.id === selectedPlatform)?.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Наследование */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Наследовать глобальные</p>
              <p className="text-sm text-[#8A8A8A]">Использовать глобальные настройки по умолчанию</p>
            </div>
            <Switch
              checked={currentSettings.inheritGlobal}
              onCheckedChange={(checked) => updateSetting('inheritGlobal', checked)}
            />
          </div>

          <Separator className="bg-[#2A2B32]" />

          <Tabs defaultValue="api" className="w-full">
            <TabsList className="bg-[#14151A] border-[#2A2B32] w-full">
              <TabsTrigger value="api" className="flex-1 data-[state=active]:bg-[#6C63FF]">
                API
              </TabsTrigger>
              <TabsTrigger value="publish" className="flex-1 data-[state=active]:bg-[#6C63FF]">
                Публикация
              </TabsTrigger>
              <TabsTrigger value="content" className="flex-1 data-[state=active]:bg-[#6C63FF]">
                Контент
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api" className="mt-4 space-y-4">
              <div>
                <Label className="text-[#8A8A8A] text-sm">API конфигурация (JSON)</Label>
                <Textarea
                  placeholder='{"botToken": "...", "apiId": "...", "apiHash": "..."}'
                  value={currentSettings.apiConfig || ''}
                  onChange={(e) => updateSetting('apiConfig', e.target.value || null)}
                  className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[100px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="publish" className="mt-4 space-y-4">
              <div>
                <Label className="text-[#8A8A8A] text-sm">Конфигурация публикации (JSON)</Label>
                <Textarea
                  placeholder='{"mode": "auto", "format": "default", "links": true}'
                  value={currentSettings.publishConfig || ''}
                  onChange={(e) => updateSetting('publishConfig', e.target.value || null)}
                  className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[100px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="content" className="mt-4 space-y-4">
              {selectedPlatform === 'instagram' && (
                <div>
                  <Label className="text-[#8A8A8A] text-sm">Stories конфигурация (JSON)</Label>
                  <Textarea
                    placeholder='{"duration": 15, "format": "9:16", "watermark": false}'
                    value={currentSettings.storiesConfig || ''}
                    onChange={(e) => updateSetting('storiesConfig', e.target.value || null)}
                    className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[80px]"
                  />
                </div>
              )}
              
              {selectedPlatform === 'instagram' && (
                <div>
                  <Label className="text-[#8A8A8A] text-sm">Reels конфигурация (JSON)</Label>
                  <Textarea
                    placeholder='{"duration": 60, "music": true, "subtitles": true}'
                    value={currentSettings.reelsConfig || ''}
                    onChange={(e) => updateSetting('reelsConfig', e.target.value || null)}
                    className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[80px]"
                  />
                </div>
              )}
              
              {selectedPlatform === 'youtube' && (
                <div>
                  <Label className="text-[#8A8A8A] text-sm">Shorts конфигурация (JSON)</Label>
                  <Textarea
                    placeholder='{"duration": 60, "quality": "1080p", "description": true}'
                    value={currentSettings.shortsConfig || ''}
                    onChange={(e) => updateSetting('shortsConfig', e.target.value || null)}
                    className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[80px]"
                  />
                </div>
              )}
              
              {selectedPlatform === 'tiktok' && (
                <div>
                  <Label className="text-[#8A8A8A] text-sm">Посты конфигурация (JSON)</Label>
                  <Textarea
                    placeholder='{"format": "9:16", "filters": [], "hashtags": true}'
                    value={currentSettings.postsConfig || ''}
                    onChange={(e) => updateSetting('postsConfig', e.target.value || null)}
                    className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[80px]"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Кнопки действий */}
      <div className="flex justify-end gap-3 pt-4">
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
    </div>
  );
}

// Helper function
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

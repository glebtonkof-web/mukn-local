'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Ban,
  List,
  Shield,
  Save,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationSettingsData {
  id: string;
  contentCreated: string | null;
  contentPublished: string | null;
  generationError: string | null;
  tokensExhausted: string | null;
  newTrend: string | null;
  achievement: string | null;
}

interface BlacklistSettingsData {
  id: string;
  forbiddenWords: string[];
  forbiddenChannels: string[];
  forbiddenTopics: string[];
  whitelistOnly: boolean;
  whitelist: string[];
}

export function FeaturesTab() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'blacklist'>('notifications');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsData>({
    id: '',
    contentCreated: null,
    contentPublished: null,
    generationError: null,
    tokensExhausted: null,
    newTrend: null,
    achievement: null,
  });
  const [blacklistSettings, setBlacklistSettings] = useState<BlacklistSettingsData>({
    id: '',
    forbiddenWords: [],
    forbiddenChannels: [],
    forbiddenTopics: [],
    whitelistOnly: false,
    whitelist: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newChannel, setNewChannel] = useState('');

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [notifRes, blackRes] = await Promise.all([
        fetch('/api/settings/notifications'),
        fetch('/api/settings/blacklist'),
      ]);

      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotificationSettings(data);
      }
      
      if (blackRes.ok) {
        const data = await blackRes.json();
        setBlacklistSettings({
          ...data,
          forbiddenWords: data.forbiddenWords ? JSON.parse(data.forbiddenWords) : [],
          forbiddenChannels: data.forbiddenChannels ? JSON.parse(data.forbiddenChannels) : [],
          forbiddenTopics: data.forbiddenTopics ? JSON.parse(data.forbiddenTopics) : [],
          whitelist: data.whitelist ? JSON.parse(data.whitelist) : [],
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Сохранение настроек уведомлений
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings),
      });

      if (response.ok) {
        toast.success('Настройки уведомлений сохранены');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  // Сохранение чёрных списков
  const handleSaveBlacklist = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forbiddenWords: JSON.stringify(blacklistSettings.forbiddenWords),
          forbiddenChannels: JSON.stringify(blacklistSettings.forbiddenChannels),
          forbiddenTopics: JSON.stringify(blacklistSettings.forbiddenTopics),
          whitelistOnly: blacklistSettings.whitelistOnly,
          whitelist: JSON.stringify(blacklistSettings.whitelist),
        }),
      });

      if (response.ok) {
        toast.success('Чёрные списки сохранены');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  // Добавить слово
  const addWord = () => {
    if (newWord.trim()) {
      setBlacklistSettings(prev => ({
        ...prev,
        forbiddenWords: [...prev.forbiddenWords, newWord.trim()]
      }));
      setNewWord('');
    }
  };

  // Удалить слово
  const removeWord = (word: string) => {
    setBlacklistSettings(prev => ({
      ...prev,
      forbiddenWords: prev.forbiddenWords.filter(w => w !== word)
    }));
  };

  // Добавить канал
  const addChannel = () => {
    if (newChannel.trim()) {
      setBlacklistSettings(prev => ({
        ...prev,
        forbiddenChannels: [...prev.forbiddenChannels, newChannel.trim()]
      }));
      setNewChannel('');
    }
  };

  // Удалить канал
  const removeChannel = (channel: string) => {
    setBlacklistSettings(prev => ({
      ...prev,
      forbiddenChannels: prev.forbiddenChannels.filter(c => c !== channel)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {/* Переключатель вкладок */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'notifications' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('notifications')}
          className={activeTab === 'notifications' 
            ? 'bg-[#6C63FF] hover:bg-[#6C63FF]/80' 
            : 'border-[#2A2B32] text-[#8A8A8A]'
          }
        >
          <Bell className="w-4 h-4 mr-2" />
          Уведомления
        </Button>
        <Button
          variant={activeTab === 'blacklist' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('blacklist')}
          className={activeTab === 'blacklist' 
            ? 'bg-[#6C63FF] hover:bg-[#6C63FF]/80' 
            : 'border-[#2A2B32] text-[#8A8A8A]'
          }
        >
          <Ban className="w-4 h-4 mr-2" />
          Чёрные списки
        </Button>
      </div>

      {/* Уведомления */}
      {activeTab === 'notifications' && (
        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#6C63FF]" />
              <CardTitle className="text-white text-lg">Настройки уведомлений</CardTitle>
            </div>
            <CardDescription className="text-[#8A8A8A]">
              Настройте типы уведомлений для разных событий
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'contentCreated', label: 'Контент создан', desc: 'Уведомление о создании нового контента' },
              { key: 'contentPublished', label: 'Контент опубликован', desc: 'Уведомление об успешной публикации' },
              { key: 'generationError', label: 'Ошибка генерации', desc: 'Уведомление об ошибках AI' },
              { key: 'tokensExhausted', label: 'Токены закончились', desc: 'Уведомление о балансе токенов' },
              { key: 'newTrend', label: 'Новый тренд', desc: 'Уведомление о найденных трендах' },
              { key: 'achievement', label: 'Достижение', desc: 'Уведомление о разблокировке достижений' },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{item.label}</p>
                    <p className="text-sm text-[#8A8A8A]">{item.desc}</p>
                  </div>
                  <Switch
                    checked={!!notificationSettings[item.key as keyof NotificationSettingsData]}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, [item.key]: checked ? JSON.stringify({ inApp: true }) : null }))
                    }
                  />
                </div>
                <Separator className="bg-[#2A2B32] mt-3" />
              </div>
            ))}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveNotifications}
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
          </CardContent>
        </Card>
      )}

      {/* Чёрные списки */}
      {activeTab === 'blacklist' && (
        <>
          <Card className="bg-[#1E1F26] border-[#2A2B32]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-[#6C63FF]" />
                <CardTitle className="text-white text-lg">Запрещённые слова</CardTitle>
              </div>
              <CardDescription className="text-[#8A8A8A]">
                Слова, которые не должны появляться в контенте
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="Введите слово..."
                  className="bg-[#14151A] border-[#2A2B32] text-white"
                  onKeyDown={(e) => e.key === 'Enter' && addWord()}
                />
                <Button onClick={addWord} size="icon" className="bg-[#6C63FF]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {blacklistSettings.forbiddenWords.map((word) => (
                  <Badge 
                    key={word} 
                    variant="outline" 
                    className="border-[#FF4D4D] text-[#FF4D4D] pr-1"
                  >
                    {word}
                    <button
                      onClick={() => removeWord(word)}
                      className="ml-1 p-0.5 hover:bg-[#FF4D4D]/20 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1E1F26] border-[#2A2B32]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <List className="w-5 h-5 text-[#6C63FF]" />
                <CardTitle className="text-white text-lg">Запрещённые каналы</CardTitle>
              </div>
              <CardDescription className="text-[#8A8A8A]">
                Каналы, которые нельзя использовать для продвижения
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  placeholder="@username или ссылка..."
                  className="bg-[#14151A] border-[#2A2B32] text-white"
                  onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                />
                <Button onClick={addChannel} size="icon" className="bg-[#6C63FF]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {blacklistSettings.forbiddenChannels.map((channel) => (
                  <Badge 
                    key={channel} 
                    variant="outline" 
                    className="border-[#FFB800] text-[#FFB800] pr-1"
                  >
                    {channel}
                    <button
                      onClick={() => removeChannel(channel)}
                      className="ml-1 p-0.5 hover:bg-[#FFB800]/20 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1E1F26] border-[#2A2B32]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#6C63FF]" />
                <CardTitle className="text-white text-lg">Белый список</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Только белый список</p>
                  <p className="text-sm text-[#8A8A8A]">Разрешить продвижение только из белого списка</p>
                </div>
                <Switch
                  checked={blacklistSettings.whitelistOnly}
                  onCheckedChange={(checked) => 
                    setBlacklistSettings(prev => ({ ...prev, whitelistOnly: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveBlacklist}
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
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Globe,
  Cpu,
  Zap,
  Save,
  Database,
  Shield,
  Cloud,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GlobalSettingsData {
  id: string;
  interfaceLanguage: string;
  contentLanguage: string;
  deepseekMode: string;
  hunyuanMode: string;
  fallbackAI: string | null;
  maxThreads: number;
  priority: string;
  cachingEnabled: boolean;
  autosaveInterval: number;
  maxDrafts: number;
  encryptLocalDB: boolean;
  startupPassword: string | null;
  deleteTempFiles: boolean;
  clearBrowserCache: boolean;
  logActions: boolean;
  autoBackupGoogle: boolean;
  syncBetweenPC: boolean;
}

const defaultSettings: GlobalSettingsData = {
  id: '',
  interfaceLanguage: 'ru',
  contentLanguage: 'ru',
  deepseekMode: 'web_chat',
  hunyuanMode: 'web_chat',
  fallbackAI: null,
  maxThreads: 4,
  priority: 'balanced',
  cachingEnabled: true,
  autosaveInterval: 30,
  maxDrafts: 100,
  encryptLocalDB: true,
  startupPassword: null,
  deleteTempFiles: true,
  clearBrowserCache: true,
  logActions: true,
  autoBackupGoogle: false,
  syncBetweenPC: false,
};

export function GlobalSettingsTab() {
  const [settings, setSettings] = useState<GlobalSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/global');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Сохранение настроек
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Настройки сохранены');
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

  // Сброс настроек
  const handleReset = async () => {
    try {
      const response = await fetch('/api/settings/global', {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadSettings();
        toast.success('Настройки сброшены');
      }
    } catch (error) {
      console.error('Ошибка сброса:', error);
      toast.error('Ошибка сброса настроек');
    }
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
      {/* Язык */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Язык</CardTitle>
          </div>
          <CardDescription className="text-[#8A8A8A]">
            Настройки языка интерфейса и контента
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#8A8A8A] text-sm">Язык интерфейса</Label>
              <Select
                value={settings.interfaceLanguage}
                onValueChange={(v) => setSettings({ ...settings, interfaceLanguage: v })}
              >
                <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectItem value="ru" className="text-white">Русский</SelectItem>
                  <SelectItem value="en" className="text-white">English</SelectItem>
                  <SelectItem value="uk" className="text-white">Українська</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#8A8A8A] text-sm">Язык контента</Label>
              <Select
                value={settings.contentLanguage}
                onValueChange={(v) => setSettings({ ...settings, contentLanguage: v })}
              >
                <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectItem value="ru" className="text-white">Русский</SelectItem>
                  <SelectItem value="en" className="text-white">English</SelectItem>
                  <SelectItem value="uk" className="text-white">Українська</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Провайдеры */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">AI Провайдеры</CardTitle>
          </div>
          <CardDescription className="text-[#8A8A8A]">
            Режимы работы AI провайдеров
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#8A8A8A] text-sm">DeepSeek режим</Label>
              <Select
                value={settings.deepseekMode}
                onValueChange={(v) => setSettings({ ...settings, deepseekMode: v })}
              >
                <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectItem value="web_chat" className="text-white">Web Chat</SelectItem>
                  <SelectItem value="api_free" className="text-white">API Free</SelectItem>
                  <SelectItem value="api_paid" className="text-white">API Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#8A8A8A] text-sm">Hunyuan режим</Label>
              <Select
                value={settings.hunyuanMode}
                onValueChange={(v) => setSettings({ ...settings, hunyuanMode: v })}
              >
                <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectItem value="web_chat" className="text-white">Web Chat</SelectItem>
                  <SelectItem value="api" className="text-white">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label className="text-[#8A8A8A] text-sm">Fallback AI (резерв)</Label>
            <Select
              value={settings.fallbackAI || ''}
              onValueChange={(v) => setSettings({ ...settings, fallbackAI: v || null })}
            >
              <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                <SelectValue placeholder="Не выбран" />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                <SelectItem value="" className="text-white">Не выбран</SelectItem>
                <SelectItem value="chatgpt" className="text-white">ChatGPT</SelectItem>
                <SelectItem value="claude" className="text-white">Claude</SelectItem>
                <SelectItem value="gemini" className="text-white">Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Производительность */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Производительность</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[#8A8A8A] text-sm">Макс. потоков</Label>
              <span className="text-white text-sm">{settings.maxThreads}</span>
            </div>
            <Slider
              value={[settings.maxThreads]}
              onValueChange={([v]) => setSettings({ ...settings, maxThreads: v })}
              min={1}
              max={16}
              step={1}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label className="text-[#8A8A8A] text-sm">Приоритет</Label>
            <Select
              value={settings.priority}
              onValueChange={(v) => setSettings({ ...settings, priority: v })}
            >
              <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                <SelectItem value="speed" className="text-white">Скорость</SelectItem>
                <SelectItem value="quality" className="text-white">Качество</SelectItem>
                <SelectItem value="balanced" className="text-white">Баланс</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Кеширование</p>
              <p className="text-sm text-[#8A8A8A]">Ускорение повторных запросов</p>
            </div>
            <Switch
              checked={settings.cachingEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, cachingEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Автосохранение */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Save className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Автосохранение</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#8A8A8A] text-sm">Интервал (сек)</Label>
              <Input
                type="number"
                value={settings.autosaveInterval}
                onChange={(e) => setSettings({ ...settings, autosaveInterval: parseInt(e.target.value) || 30 })}
                className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
                min={10}
                max={300}
              />
            </div>
            <div>
              <Label className="text-[#8A8A8A] text-sm">Макс. черновиков</Label>
              <Input
                type="number"
                value={settings.maxDrafts}
                onChange={(e) => setSettings({ ...settings, maxDrafts: parseInt(e.target.value) || 100 })}
                className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
                min={10}
                max={1000}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Безопасность */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Безопасность</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Шифрование БД</p>
              <p className="text-sm text-[#8A8A8A]">Шифровать локальную базу данных</p>
            </div>
            <Switch
              checked={settings.encryptLocalDB}
              onCheckedChange={(checked) => setSettings({ ...settings, encryptLocalDB: checked })}
            />
          </div>
          
          <Separator className="bg-[#2A2B32]" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Удалять временные файлы</p>
              <p className="text-sm text-[#8A8A8A]">Автоматическая очистка</p>
            </div>
            <Switch
              checked={settings.deleteTempFiles}
              onCheckedChange={(checked) => setSettings({ ...settings, deleteTempFiles: checked })}
            />
          </div>
          
          <Separator className="bg-[#2A2B32]" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Очищать кеш браузера</p>
              <p className="text-sm text-[#8A8A8A]">При завершении сессии</p>
            </div>
            <Switch
              checked={settings.clearBrowserCache}
              onCheckedChange={(checked) => setSettings({ ...settings, clearBrowserCache: checked })}
            />
          </div>
          
          <Separator className="bg-[#2A2B32]" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Логировать действия</p>
              <p className="text-sm text-[#8A8A8A]">Записывать все действия в журнал</p>
            </div>
            <Switch
              checked={settings.logActions}
              onCheckedChange={(checked) => setSettings({ ...settings, logActions: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Облако */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Облачные функции</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Автобэкап в Google</p>
              <p className="text-sm text-[#8A8A8A]">Резервное копирование в Google Drive</p>
            </div>
            <Switch
              checked={settings.autoBackupGoogle}
              onCheckedChange={(checked) => setSettings({ ...settings, autoBackupGoogle: checked })}
            />
          </div>
          
          <Separator className="bg-[#2A2B32]" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Синхронизация между ПК</p>
              <p className="text-sm text-[#8A8A8A]">Синхронизировать настройки на разных устройствах</p>
            </div>
            <Switch
              checked={settings.syncBetweenPC}
              onCheckedChange={(checked) => setSettings({ ...settings, syncBetweenPC: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Кнопки действий */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Сбросить
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
    </div>
  );
}

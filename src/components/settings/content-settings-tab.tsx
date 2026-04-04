'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Type,
  Image,
  Video,
  Clock,
  FlaskConical,
  Save,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

interface ContentSettings {
  campaignId: string;
  inheritPlatform: boolean;
  textSettings: string | null;
  imageSettings: string | null;
  videoSettings: string | null;
  automationMode: string;
  abTestEnabled: boolean;
  abTestVariants: number;
  abTestTraffic: number;
  abTestDuration: number;
  abTestMetric: string;
  scheduleDensity: number;
  scheduleActiveHours: string | null;
  scheduleExcludeDays: string | null;
}

const defaultSettings: ContentSettings = {
  campaignId: '',
  inheritPlatform: true,
  textSettings: null,
  imageSettings: null,
  videoSettings: null,
  automationMode: 'manual',
  abTestEnabled: false,
  abTestVariants: 2,
  abTestTraffic: 20,
  abTestDuration: 24,
  abTestMetric: 'conversion',
  scheduleDensity: 3,
  scheduleActiveHours: null,
  scheduleExcludeDays: null,
};

export function ContentSettingsTab() {
  const [settings, setSettings] = useState<ContentSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/campaign?campaignId=default');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setSettings(data);
        }
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

  // Сохранение настроек
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, campaignId: 'default' }),
      });

      if (response.ok) {
        toast.success('Настройки контента сохранены');
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
    setSettings(defaultSettings);
    toast.success('Настройки сброшены');
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
      {/* Текст */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Текст</CardTitle>
          </div>
          <CardDescription className="text-[#8A8A8A]">
            Настройки генерации текстового контента
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-[#8A8A8A] text-sm">Текстовые настройки (JSON)</Label>
            <Textarea
              placeholder='{"tone": "casual", "length": "medium", "emojis": true, "uniqueness": 90}'
              value={settings.textSettings || ''}
              onChange={(e) => setSettings({ ...settings, textSettings: e.target.value || null })}
              className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Изображения */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Изображения</CardTitle>
          </div>
          <CardDescription className="text-[#8A8A8A]">
            Настройки генерации изображений
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-[#8A8A8A] text-sm">Настройки изображений (JSON)</Label>
            <Textarea
              placeholder='{"size": "1024x1024", "resolution": "high", "style": "realistic"}'
              value={settings.imageSettings || ''}
              onChange={(e) => setSettings({ ...settings, imageSettings: e.target.value || null })}
              className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Видео */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Видео</CardTitle>
          </div>
          <CardDescription className="text-[#8A8A8A]">
            Настройки генерации видео
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-[#8A8A8A] text-sm">Настройки видео (JSON)</Label>
            <Textarea
              placeholder='{"avatar": true, "voice": "male", "subtitles": true}'
              value={settings.videoSettings || ''}
              onChange={(e) => setSettings({ ...settings, videoSettings: e.target.value || null })}
              className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Автоматизация */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white text-lg">Автоматизация</CardTitle>
          <CardDescription className="text-[#8A8A8A]">
            Режим автоматической работы
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-[#8A8A8A] text-sm">Режим автоматизации</Label>
            <Select
              value={settings.automationMode}
              onValueChange={(v) => setSettings({ ...settings, automationMode: v })}
            >
              <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                <SelectItem value="manual" className="text-white">Ручной</SelectItem>
                <SelectItem value="semi" className="text-white">Полуавтоматический</SelectItem>
                <SelectItem value="auto_safe" className="text-white">Авто (безопасный)</SelectItem>
                <SelectItem value="auto_aggressive" className="text-white">Авто (агрессивный)</SelectItem>
                <SelectItem value="night" className="text-white">Ночной режим</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* A/B тестирование */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">A/B тестирование</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Включить A/B тесты</p>
              <p className="text-sm text-[#8A8A8A]">Тестирование разных вариантов контента</p>
            </div>
            <Switch
              checked={settings.abTestEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, abTestEnabled: checked })}
            />
          </div>

          {settings.abTestEnabled && (
            <>
              <Separator className="bg-[#2A2B32]" />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#8A8A8A] text-sm">Количество вариантов</Label>
                  <Input
                    type="number"
                    value={settings.abTestVariants}
                    onChange={(e) => setSettings({ ...settings, abTestVariants: parseInt(e.target.value) || 2 })}
                    className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
                    min={2}
                    max={10}
                  />
                </div>
                <div>
                  <Label className="text-[#8A8A8A] text-sm">Трафик на тест (%)</Label>
                  <Input
                    type="number"
                    value={settings.abTestTraffic}
                    onChange={(e) => setSettings({ ...settings, abTestTraffic: parseInt(e.target.value) || 20 })}
                    className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
                    min={10}
                    max={50}
                  />
                </div>
              </div>

              <div>
                <Label className="text-[#8A8A8A] text-sm">Метрика для определения победителя</Label>
                <Select
                  value={settings.abTestMetric}
                  onValueChange={(v) => setSettings({ ...settings, abTestMetric: v })}
                >
                  <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectItem value="ctr" className="text-white">CTR</SelectItem>
                    <SelectItem value="conversion" className="text-white">Конверсия</SelectItem>
                    <SelectItem value="likes" className="text-white">Лайки</SelectItem>
                    <SelectItem value="views" className="text-white">Просмотры</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Расписание */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Расписание</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[#8A8A8A] text-sm">Постов в день</Label>
              <span className="text-white text-sm">{settings.scheduleDensity}</span>
            </div>
            <Slider
              value={[settings.scheduleDensity]}
              onValueChange={([v]) => setSettings({ ...settings, scheduleDensity: v })}
              min={1}
              max={10}
              step={1}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-[#8A8A8A] text-sm">Активные часы (JSON)</Label>
            <Textarea
              placeholder='{"start": "09:00", "end": "22:00"}'
              value={settings.scheduleActiveHours || ''}
              onChange={(e) => setSettings({ ...settings, scheduleActiveHours: e.target.value || null })}
              className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[60px]"
            />
          </div>

          <div>
            <Label className="text-[#8A8A8A] text-sm">Исключить дни (JSON)</Label>
            <Textarea
              placeholder='["saturday", "sunday"]'
              value={settings.scheduleExcludeDays || ''}
              onChange={(e) => setSettings({ ...settings, scheduleExcludeDays: e.target.value || null })}
              className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[60px]"
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

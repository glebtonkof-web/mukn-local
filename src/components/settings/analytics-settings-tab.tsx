'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Database,
  FileText,
  Clock,
  Save,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsSettingsData {
  id: string;
  collectViews: boolean;
  collectLikes: boolean;
  collectComments: boolean;
  collectShares: boolean;
  collectClicks: boolean;
  collectConversions: boolean;
  collectGeo: boolean;
  collectAge: boolean;
  retentionDays: number;
  dailyReport: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  reportFormat: string;
  reportTime: string;
}

const defaultSettings: AnalyticsSettingsData = {
  id: '',
  collectViews: true,
  collectLikes: true,
  collectComments: true,
  collectShares: true,
  collectClicks: true,
  collectConversions: true,
  collectGeo: false,
  collectAge: false,
  retentionDays: 365,
  dailyReport: true,
  weeklyReport: true,
  monthlyReport: true,
  reportFormat: 'pdf',
  reportTime: '09:00',
};

export function AnalyticsSettingsTab() {
  const [settings, setSettings] = useState<AnalyticsSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/analytics');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
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
      const response = await fetch('/api/settings/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Настройки аналитики сохранены');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  // Сброс настроек
  const handleReset = () => {
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
      {/* Сбор метрик */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Сбор метрик</CardTitle>
          </div>
          <CardDescription className="text-[#8A8A8A]">
            Какие метрики собирать для анализа
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'collectViews', label: 'Просмотры', desc: 'Количество просмотров контента' },
            { key: 'collectLikes', label: 'Лайки', desc: 'Реакции пользователей' },
            { key: 'collectComments', label: 'Комментарии', desc: 'Активность в комментариях' },
            { key: 'collectShares', label: 'Репосты', desc: 'Распространение контента' },
            { key: 'collectClicks', label: 'Клики', desc: 'Переходы по ссылкам' },
            { key: 'collectConversions', label: 'Конверсии', desc: 'Целевые действия' },
            { key: 'collectGeo', label: 'География', desc: 'Геолокация аудитории' },
            { key: 'collectAge', label: 'Возраст', desc: 'Возраст аудитории' },
          ].map((item, index) => (
            <div key={item.key}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{item.label}</p>
                  <p className="text-sm text-[#8A8A8A]">{item.desc}</p>
                </div>
                <Switch
                  checked={settings[item.key as keyof AnalyticsSettingsData] as boolean}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, [item.key]: checked }))
                  }
                />
              </div>
              {index < 7 && <Separator className="bg-[#2A2B32] mt-3" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Хранение */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Хранение данных</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[#8A8A8A] text-sm">Срок хранения (дней)</Label>
              <span className="text-white text-sm">{settings.retentionDays}</span>
            </div>
            <Slider
              value={[settings.retentionDays]}
              onValueChange={([v]) => setSettings(prev => ({ ...prev, retentionDays: v }))}
              min={30}
              max={3650}
              step={30}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-[#8A8A8A] mt-1">
              <span>30 дней</span>
              <span>10 лет</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Отчёты */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Автоматические отчёты</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Ежедневный отчёт</p>
              <p className="text-sm text-[#8A8A8A]">Краткая сводка за день</p>
            </div>
            <Switch
              checked={settings.dailyReport}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, dailyReport: checked }))
              }
            />
          </div>
          
          <Separator className="bg-[#2A2B32]" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Еженедельный отчёт</p>
              <p className="text-sm text-[#8A8A8A]">Аналитика за неделю</p>
            </div>
            <Switch
              checked={settings.weeklyReport}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, weeklyReport: checked }))
              }
            />
          </div>
          
          <Separator className="bg-[#2A2B32]" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Ежемесячный отчёт</p>
              <p className="text-sm text-[#8A8A8A]">Полный отчёт за месяц</p>
            </div>
            <Switch
              checked={settings.monthlyReport}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, monthlyReport: checked }))
              }
            />
          </div>
          
          <Separator className="bg-[#2A2B32]" />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#8A8A8A] text-sm">Формат отчёта</Label>
              <Select
                value={settings.reportFormat}
                onValueChange={(v) => setSettings(prev => ({ ...prev, reportFormat: v }))}
              >
                <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectItem value="pdf" className="text-white">PDF</SelectItem>
                  <SelectItem value="csv" className="text-white">CSV</SelectItem>
                  <SelectItem value="telegram" className="text-white">Telegram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#8A8A8A] text-sm">Время отправки</Label>
              <Input
                type="time"
                value={settings.reportTime}
                onChange={(e) => setSettings(prev => ({ ...prev, reportTime: e.target.value }))}
                className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
              />
            </div>
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

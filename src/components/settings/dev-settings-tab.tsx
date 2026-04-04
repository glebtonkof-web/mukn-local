'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Terminal,
  Bug,
  FileJson,
  Globe,
  Webhook,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface DevSettingsData {
  id: string;
  debugMode: boolean;
  logAIRequests: boolean;
  emulateErrors: boolean;
  testMode: boolean;
  externalApiEndpoint: string | null;
  contentWebhook: string | null;
}

export function DevSettingsTab() {
  const [settings, setSettings] = useState<DevSettingsData>({
    id: '',
    debugMode: false,
    logAIRequests: false,
    emulateErrors: false,
    testMode: false,
    externalApiEndpoint: null,
    contentWebhook: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/dev');
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
      const response = await fetch('/api/settings/dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Настройки разработчика сохранены');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
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

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {/* Предупреждение */}
      <Alert className="bg-[#FFB800]/10 border-[#FFB800]/50 text-[#FFB800]">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Эти настройки предназначены только для разработчиков. Используйте с осторожностью.
        </AlertDescription>
      </Alert>

      {/* Режимы отладки */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Режимы отладки</CardTitle>
          </div>
          <CardDescription className="text-[#8A8A8A]">
            Инструменты для диагностики и тестирования
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bug className="w-5 h-5 text-[#8A8A8A]" />
              <div>
                <p className="text-white font-medium">Режим отладки</p>
                <p className="text-sm text-[#8A8A8A]">Расширенное логирование в консоль</p>
              </div>
            </div>
            <Switch
              checked={settings.debugMode}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, debugMode: checked }))
              }
            />
          </div>
          
          <Separator className="bg-[#2A2B32]" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileJson className="w-5 h-5 text-[#8A8A8A]" />
              <div>
                <p className="text-white font-medium">Логировать AI запросы</p>
                <p className="text-sm text-[#8A8A8A]">Записывать все запросы к AI провайдерам</p>
              </div>
            </div>
            <Switch
              checked={settings.logAIRequests}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, logAIRequests: checked }))
              }
            />
          </div>
          
          <Separator className="bg-[#2A2B32]" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Эмуляция ошибок</p>
              <p className="text-sm text-[#8A8A8A]">Случайные ошибки для тестирования обработки</p>
            </div>
            <Switch
              checked={settings.emulateErrors}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, emulateErrors: checked }))
              }
            />
          </div>
          
          <Separator className="bg-[#2A2B32]" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Тестовый режим</p>
              <p className="text-sm text-[#8A8A8A]">Без реальной публикации контента</p>
            </div>
            <Switch
              checked={settings.testMode}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, testMode: checked }))
              }
            />
          </div>
          
          {settings.testMode && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="border-[#FFB800] text-[#FFB800]">
                ТЕСТОВЫЙ РЕЖИМ АКТИВЕН
              </Badge>
              <span className="text-xs text-[#8A8A8A]">Контент не будет опубликован</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API эндпоинты */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Внешние API</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-[#8A8A8A] text-sm">Внешний API эндпоинт</Label>
            <Input
              placeholder="https://api.example.com/v1"
              value={settings.externalApiEndpoint || ''}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, externalApiEndpoint: e.target.value || null }))
              }
              className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
            />
            <p className="text-xs text-[#8A8A8A] mt-1">
              Использовать для проксирования запросов
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-[#6C63FF]" />
            <CardTitle className="text-white text-lg">Webhooks</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-[#8A8A8A] text-sm">Content Webhook URL</Label>
            <Input
              placeholder="https://your-server.com/webhook/content"
              value={settings.contentWebhook || ''}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, contentWebhook: e.target.value || null }))
              }
              className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
            />
            <p className="text-xs text-[#8A8A8A] mt-1">
              Webhook вызывается при создании нового контента
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Информация */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white text-lg">Системная информация</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#8A8A8A]">Версия API</p>
              <p className="text-white">v2.0.0</p>
            </div>
            <div>
              <p className="text-[#8A8A8A]">Node.js</p>
              <p className="text-white">{process.version || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[#8A8A8A]">Окружение</p>
              <p className="text-white">{process.env.NODE_ENV || 'development'}</p>
            </div>
            <div>
              <p className="text-[#8A8A8A]">База данных</p>
              <p className="text-white">SQLite</p>
            </div>
          </div>
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

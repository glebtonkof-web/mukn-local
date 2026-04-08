'use client';

import { useAppStore } from '@/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Search,
  Download,
  Upload,
  RotateCcw,
  Save,
  Settings2,
  Globe,
  Layers,
  Bot,
  Sparkles,
  BarChart3,
  Terminal,
  Key,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Импорт компонентов вкладок
import { GlobalSettingsTab } from './global-settings-tab';
import { PlatformSettingsTab } from './platform-settings-tab';
import { ContentSettingsTab } from './content-settings-tab';
import { AIAgentTab } from './ai-agent-tab';
import { FeaturesTab } from './features-tab';
import { AnalyticsSettingsTab } from './analytics-settings-tab';
import { DevSettingsTab } from './dev-settings-tab';
import { DefaultCredentialsPanel } from './default-credentials-panel';

// Список всех настроек для поиска
const allSettings = [
  { id: 'interfaceLanguage', tab: 'system', label: 'Язык интерфейса', description: 'Выберите язык интерфейса' },
  { id: 'contentLanguage', tab: 'system', label: 'Язык контента', description: 'Язык генерируемого контента' },
  { id: 'deepseekMode', tab: 'system', label: 'DeepSeek режим', description: 'Режим работы DeepSeek AI' },
  { id: 'maxThreads', tab: 'system', label: 'Максимум потоков', description: 'Количество параллельных задач' },
  { id: 'cachingEnabled', tab: 'system', label: 'Кеширование', description: 'Ускорение повторных запросов' },
  { id: 'telegram', tab: 'platforms', label: 'Telegram', description: 'Настройки Telegram платформы' },
  { id: 'instagram', tab: 'platforms', label: 'Instagram', description: 'Настройки Instagram платформы' },
  { id: 'tiktok', tab: 'platforms', label: 'TikTok', description: 'Настройки TikTok платформы' },
  { id: 'youtube', tab: 'platforms', label: 'YouTube', description: 'Настройки YouTube платформы' },
  { id: 'textSettings', tab: 'content', label: 'Текстовые настройки', description: 'Настройки генерации текста' },
  { id: 'imageSettings', tab: 'content', label: 'Настройки изображений', description: 'Параметры генерации изображений' },
  { id: 'automationMode', tab: 'content', label: 'Автоматизация', description: 'Режим автоматической работы' },
  { id: 'abTestEnabled', tab: 'content', label: 'A/B тестирование', description: 'Включить тестирование вариантов' },
  { id: 'notifications', tab: 'features', label: 'Уведомления', description: 'Настройки уведомлений' },
  { id: 'blacklist', tab: 'features', label: 'Чёрные списки', description: 'Запрещённые слова и каналы' },
  { id: 'collectViews', tab: 'analytics', label: 'Сбор просмотров', description: 'Сбор статистики просмотров' },
  { id: 'reportFormat', tab: 'analytics', label: 'Формат отчётов', description: 'Формат автоматических отчётов' },
  { id: 'debugMode', tab: 'dev', label: 'Режим отладки', description: 'Расширенное логирование' },
  { id: 'testMode', tab: 'dev', label: 'Тестовый режим', description: 'Без реальной публикации' },
  { id: 'defaultCredentials', tab: 'credentials', label: 'Учётные данные', description: 'Логин и пароль по умолчанию для всех платформ' },
  { id: 'autoFillEnabled', tab: 'credentials', label: 'Автозаполнение', description: 'Автоматическое заполнение данных при регистрации' },
];

export function SettingsDialog() {
  const { settingsOpen, setSettingsOpen } = useAppStore();
  const [activeTab, setActiveTab] = useState('system');
  const [searchQuery, setSearchQuery] = useState('');

  // Поиск по настройкам - вычисляем результаты напрямую без useEffect
  const searchResults = searchQuery.trim() 
    ? allSettings.filter(
        s => s.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
             s.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Переход к настройке из поиска
  const handleSearchClick = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Экспорт настроек
  const handleExport = async () => {
    try {
      const [globalRes, platformRes, campaignRes] = await Promise.all([
        fetch('/api/settings/global'),
        fetch('/api/settings/platform'),
        fetch('/api/settings/campaign?campaignId=default'),
      ]);

      const exportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        global: globalRes.ok ? await globalRes.json() : null,
        platforms: platformRes.ok ? await platformRes.json() : [],
        campaign: campaignRes.ok ? await campaignRes.json() : null,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Настройки экспортированы');
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      toast.error('Ошибка экспорта настроек');
    }
  };

  // Сброс всех настроек
  const handleResetAll = async () => {
    if (!confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
      return;
    }

    try {
      await fetch('/api/settings/global', { method: 'DELETE' });
      toast.success('Настройки сброшены');
    } catch (error) {
      toast.error('Ошибка сброса настроек');
    }
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-[#14151A] border-[#2A2B32] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#6C63FF]" />
            Настройки системы
          </DialogTitle>
          <DialogDescription className="text-[#8A8A8A]">
            Иерархическая система расширенных настроек
          </DialogDescription>
        </DialogHeader>

        {/* Поиск */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
          <Input
            placeholder="Поиск настроек..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1E1F26] border-[#2A2B32] text-white"
          />
          
          {/* Результаты поиска */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E1F26] border border-[#2A2B32] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSearchClick(result.tab)}
                  className="w-full px-4 py-3 text-left hover:bg-[#2A2B32] border-b border-[#2A2B32] last:border-0"
                >
                  <p className="text-white font-medium">{result.label}</p>
                  <p className="text-sm text-[#8A8A8A]">{result.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Вкладки */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="bg-[#1E1F26] border-[#2A2B32] flex-wrap h-auto gap-1">
            <TabsTrigger value="system" className="data-[state=active]:bg-[#6C63FF] gap-1">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Система</span>
            </TabsTrigger>
            <TabsTrigger value="platforms" className="data-[state=active]:bg-[#6C63FF] gap-1">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Платформы</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-[#6C63FF] gap-1">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Контент</span>
            </TabsTrigger>
            <TabsTrigger value="ai-agent" className="data-[state=active]:bg-[#6C63FF] gap-1">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI-агент</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="data-[state=active]:bg-[#6C63FF] gap-1">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Фичи</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#6C63FF] gap-1">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Аналитика</span>
            </TabsTrigger>
            <TabsTrigger value="dev" className="data-[state=active]:bg-[#6C63FF] gap-1">
              <Terminal className="w-4 h-4" />
              <span className="hidden sm:inline">DevOps</span>
            </TabsTrigger>
            <TabsTrigger value="credentials" className="data-[state=active]:bg-[#6C63FF] gap-1">
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">Логины</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
            <TabsContent value="system" className="mt-0">
              <GlobalSettingsTab />
            </TabsContent>

            <TabsContent value="platforms" className="mt-0">
              <PlatformSettingsTab />
            </TabsContent>

            <TabsContent value="content" className="mt-0">
              <ContentSettingsTab />
            </TabsContent>

            <TabsContent value="ai-agent" className="mt-0">
              <AIAgentTab />
            </TabsContent>

            <TabsContent value="features" className="mt-0">
              <FeaturesTab />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <AnalyticsSettingsTab />
            </TabsContent>

            <TabsContent value="dev" className="mt-0">
              <DevSettingsTab />
            </TabsContent>

            <TabsContent value="credentials" className="mt-0">
              <DefaultCredentialsPanel />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#2A2B32]">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              className="border-[#2A2B32] text-[#FF4D4D] hover:text-[#FF4D4D] hover:bg-[#FF4D4D]/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Сбросить всё
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Экспорт
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(false)}
              className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

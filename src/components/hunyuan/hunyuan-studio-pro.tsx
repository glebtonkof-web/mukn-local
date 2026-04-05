'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, Play, Image, Video, Edit3, History, Settings, Download,
  Wand2, Film, Camera, ExternalLink, RefreshCw, Home, ArrowLeft, ArrowRight,
  Maximize2, Minimize2, Globe, Zap, Info, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ==================== ТИПЫ ====================

interface GeneratedItem {
  id: string;
  type: 'video' | 'image';
  url: string;
  prompt: string;
  timestamp: Date;
}

// ==================== КОНСТАНТЫ ====================

const HUNYUAN_URLS = {
  main: 'https://hunyuan.tencent.com',
  video: 'https://aivideo.hunyuan.tencent.com',
  image: 'https://hunyuan.tencent.com/image',
};

const QUICK_LINKS = [
  { name: 'Hunyuan Главная', url: 'https://hunyuan.tencent.com', icon: '🏠' },
  { name: 'Генерация видео', url: 'https://aivideo.hunyuan.tencent.com', icon: '🎬' },
  { name: 'Генерация изображений', url: 'https://hunyuan.tencent.com/image', icon: '🖼️' },
  { name: 'Text-to-Video', url: 'https://aivideo.hunyuan.tencent.com/text2video', icon: '📝' },
  { name: 'Image-to-Video', url: 'https://aivideo.hunyuan.tencent.com/image2video', icon: '📸' },
];

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function HunyuanStudioPro() {
  // Состояния
  const [activeTab, setActiveTab] = useState('studio');
  const [browserUrl, setBrowserUrl] = useState(HUNYUAN_URLS.video);
  const [browserInput, setBrowserInput] = useState(HUNYUAN_URLS.video);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [prompt, setPrompt] = useState('');
  
  // Browser history
  const [browserHistory, setBrowserHistory] = useState<string[]>([HUNYUAN_URLS.video]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Загрузка истории
  useEffect(() => {
    const savedHistory = localStorage.getItem('hunyuan_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Сохранение истории
  const saveToHistory = (item: GeneratedItem) => {
    const newHistory = [item, ...history].slice(0, 50);
    setHistory(newHistory);
    localStorage.setItem('hunyuan_history', JSON.stringify(newHistory));
  };

  // Browser navigation
  const navigateTo = (url: string) => {
    let finalUrl = url;
    if (!url.startsWith('http')) {
      finalUrl = 'https://' + url;
    }
    setBrowserUrl(finalUrl);
    setBrowserInput(finalUrl);
    setBrowserHistory(prev => [...prev.slice(0, historyIndex + 1), finalUrl]);
    setHistoryIndex(prev => prev + 1);
    setIsLoading(true);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      const newUrl = browserHistory[historyIndex - 1];
      setBrowserUrl(newUrl);
      setBrowserInput(newUrl);
      setIsLoading(true);
    }
  };

  const goForward = () => {
    if (historyIndex < browserHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      const newUrl = browserHistory[historyIndex + 1];
      setBrowserUrl(newUrl);
      setBrowserInput(newUrl);
      setIsLoading(true);
    }
  };

  const refreshBrowser = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = browserUrl;
    }
  };

  const goHome = () => {
    navigateTo(HUNYUAN_URLS.main);
  };

  // Открыть в новой вкладке
  const openInNewTab = () => {
    window.open(browserUrl, '_blank');
  };

  // ==================== РЕНДЕР ====================

  return (
    <div className="h-full flex flex-col bg-[#0f0f12]">
      {/* Header */}
      <div className="border-b border-[#2A2B32] p-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Hunyuan Studio Pro</h1>
              <p className="text-xs text-[#8A8A8A]">Интеграция с hunyuan.tencent.com</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#00D26A] text-[#00D26A]">
              <Globe className="w-3 h-3 mr-1" />
              Tencent Hunyuan
            </Badge>
            <Button 
              variant="outline" 
              size="icon"
              onClick={openInNewTab}
              title="Открыть в новой вкладке"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 px-4 pt-2 shrink-0">
            <TabsTrigger value="studio" className="text-xs py-2">
              <Film className="w-3 h-3 mr-1" />
              Студия
            </TabsTrigger>
            <TabsTrigger value="browser" className="text-xs py-2">
              <Globe className="w-3 h-3 mr-1" />
              Браузер
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs py-2">
              <History className="w-3 h-3 mr-1" />
              История
            </TabsTrigger>
          </TabsList>

          {/* Studio Tab - Full iframe */}
          <TabsContent value="studio" className="flex-1 flex flex-col m-0">
            {/* Quick Links */}
            <div className="px-4 py-2 border-b border-[#2A2B32] shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto">
                {QUICK_LINKS.map((link) => (
                  <Button
                    key={link.url}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateTo(link.url)}
                    className={cn(
                      "h-7 px-2 text-xs whitespace-nowrap",
                      browserUrl === link.url 
                        ? "bg-[#6C63FF] text-white hover:bg-[#6C63FF]/80"
                        : "text-[#8A8A8A] hover:text-white"
                    )}
                  >
                    <span className="mr-1">{link.icon}</span>
                    {link.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Browser Toolbar */}
            <div className="px-4 py-2 border-b border-[#2A2B32] flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack} disabled={historyIndex <= 0}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goForward} disabled={historyIndex >= browserHistory.length - 1}>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refreshBrowser}>
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goHome}>
                <Home className="w-4 h-4" />
              </Button>
              <Input
                value={browserInput}
                onChange={(e) => setBrowserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigateTo(browserInput);
                  }
                }}
                className="flex-1 h-8 bg-[#1E1F26] border-[#2A2B32] text-white text-sm"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={openInNewTab}
                title="Открыть в новой вкладке"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>

            {/* IFRAME */}
            <div className="flex-1 relative bg-[#1E1F26]">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f12] z-10">
                  <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-[#6C63FF] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-[#8A8A8A]">Загрузка Hunyuan...</p>
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={browserUrl}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
                title="Hunyuan Tencent"
                onLoad={() => setIsLoading(false)}
              />
            </div>

            {/* Info Bar */}
            <div className="px-4 py-2 bg-[#1E1F26] border-t border-[#2A2B32] shrink-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#8A8A8A]">
                  <Info className="w-3 h-3" />
                  <span>Tencent Hunyuan Video — 13B параметров для генерации видео</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-[#2A2B32]">
                    {browserUrl.replace('https://', '').split('/')[0]}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Browser Tab - Direct access */}
          <TabsContent value="browser" className="flex-1 flex flex-col m-0">
            <div className="p-4 flex-1 flex flex-col gap-4">
              {/* Info Card */}
              <Card className="bg-[#1E1F26] border-[#2A2B32]">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#6C63FF]" />
                    Hunyuan Tencent — Официальный сервис
                  </CardTitle>
                  <CardDescription>
                    Прямой доступ к AI генерации видео и изображений от Tencent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {QUICK_LINKS.map((link) => (
                      <Button
                        key={link.url}
                        variant="outline"
                        onClick={() => {
                          navigateTo(link.url);
                          setActiveTab('studio');
                        }}
                        className="h-auto py-4 flex flex-col border-[#2A2B32] text-[#8A8A8A] hover:text-white hover:border-[#6C63FF]"
                      >
                        <span className="text-2xl mb-2">{link.icon}</span>
                        <span className="text-xs">{link.name}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Capabilities */}
              <Card className="bg-[#1E1F26] border-[#2A2B32]">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Возможности Hunyuan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-[#6C63FF]" />
                      <span className="text-[#8A8A8A]">Text-to-Video</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-[#00D26A]" />
                      <span className="text-[#8A8A8A]">Image-to-Video</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#FFB800]" />
                      <span className="text-[#8A8A8A]">720p/1080p/4K</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#FF4D4D]" />
                      <span className="text-[#8A8A8A]">13B параметров</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warning */}
              <div className="p-4 rounded-lg bg-[#FFB800]/10 border border-[#FFB800]/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#FFB800] shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-[#FFB800] font-medium mb-1">Требуется авторизация</p>
                    <p className="text-[#8A8A8A]">
                      Для полноценной работы с Hunyuan Tencent необходимо авторизоваться на сайте. 
                      Нажмите "Открыть в новой вкладке" для доступа к полному функционалу.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="flex-1 m-0">
            <ScrollArea className="h-full p-4">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto text-[#8A8A8A] mb-3" />
                  <p className="text-[#8A8A8A]">История пуста</p>
                  <p className="text-xs text-[#8A8A8A] mt-1">Сгенерированный контент появится здесь</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {history.map((item) => (
                    <Card
                      key={item.id}
                      className="bg-[#1E1F26] border-[#2A2B32] cursor-pointer hover:border-[#6C63FF] transition-colors"
                      onClick={() => {
                        navigateTo(item.url);
                        setActiveTab('studio');
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="aspect-video rounded bg-[#14151A] flex items-center justify-center mb-2">
                          {item.type === 'video' ? (
                            <Film className="w-8 h-8 text-[#6C63FF]" />
                          ) : (
                            <Image className="w-8 h-8 text-[#00D26A]" />
                          )}
                        </div>
                        <p className="text-xs text-white truncate">{item.prompt}</p>
                        <p className="text-xs text-[#8A8A8A] mt-1">
                          {new Date(item.timestamp).toLocaleString('ru-RU')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default HunyuanStudioPro;

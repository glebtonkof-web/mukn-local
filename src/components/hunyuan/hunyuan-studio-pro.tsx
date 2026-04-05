'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, Play, Image, Video, Edit3, History, Settings, Download,
  Wand2, Film, Camera, ExternalLink, RefreshCw, Home, ArrowLeft, ArrowRight,
  Maximize2, Minimize2, Globe, Zap, Info, AlertCircle, Loader2, CheckCircle,
  XCircle, Clock, Trash2
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
  status: 'pending' | 'completed' | 'failed';
}

interface GenerationTask {
  id: string;
  type: 'video' | 'image';
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  resultUrl?: string;
  error?: string;
  createdAt: Date;
}

// ==================== КОНСТАНТЫ ====================

const HUNYUAN_URLS = {
  main: 'https://hunyuan.tencent.com',
  video: 'https://aivideo.hunyuan.tencent.com',
  image: 'https://hunyuan.tencent.com/image',
};

const VIDEO_STYLES = [
  { id: 'cinematic', name: 'Кинематографичный' },
  { id: 'anime', name: 'Аниме' },
  { id: 'realistic', name: 'Реалистичный' },
  { id: '3d', name: '3D Анимация' },
  { id: 'cartoon', name: 'Мультфильм' },
];

const IMAGE_STYLES = [
  { id: 'photorealistic', name: 'Фотореализм' },
  { id: 'digital-art', name: 'Цифровое искусство' },
  { id: 'oil-painting', name: 'Масляная живопись' },
  { id: 'watercolor', name: 'Акварель' },
  { id: 'anime', name: 'Аниме' },
];

const ASPECT_RATIOS = [
  { id: '16:9', name: '16:9 (Широкий)' },
  { id: '9:16', name: '9:16 (Вертикальный)' },
  { id: '1:1', name: '1:1 (Квадрат)' },
  { id: '4:3', name: '4:3 (Стандарт)' },
];

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function HunyuanStudioPro() {
  // Состояния
  const [activeTab, setActiveTab] = useState('generate');
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  
  // Генерация видео
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoStyle, setVideoStyle] = useState('cinematic');
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoGenerating, setVideoGenerating] = useState(false);
  
  // Генерация изображений
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('photorealistic');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageGenerating, setImageGenerating] = useState(false);
  
  // Редактор
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editing, setEditing] = useState(false);

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

  // Генерация видео через API
  const generateVideo = async () => {
    if (!videoPrompt.trim()) {
      toast.error('Введите описание видео');
      return;
    }
    
    setVideoGenerating(true);
    const taskId = `video-${Date.now()}`;
    
    // Добавляем задачу
    setTasks(prev => [...prev, {
      id: taskId,
      type: 'video',
      prompt: videoPrompt,
      status: 'processing',
      progress: 0,
      createdAt: new Date(),
    }]);
    
    try {
      const response = await fetch('/api/hunyuan/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          style: videoStyle,
          duration: videoDuration,
        }),
      });
      
      const data = await response.json();
      
      if (data.success || data.taskId) {
        toast.success('Видео генерируется...', { description: 'Это может занять несколько минут' });
        
        // Сохраняем в историю как pending
        saveToHistory({
          id: taskId,
          type: 'video',
          url: data.resultUrl || '',
          prompt: videoPrompt,
          timestamp: new Date(),
          status: 'pending',
        });
        
        // Обновляем задачу
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: 'completed', progress: 100, resultUrl: data.resultUrl }
            : t
        ));
        
        setVideoPrompt('');
      } else {
        throw new Error(data.error || 'Ошибка генерации');
      }
    } catch (error: any) {
      toast.error('Ошибка генерации видео', { description: error.message });
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: 'failed', error: error.message }
          : t
      ));
    } finally {
      setVideoGenerating(false);
    }
  };

  // Генерация изображения через API
  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Введите описание изображения');
      return;
    }
    
    setImageGenerating(true);
    const taskId = `image-${Date.now()}`;
    
    setTasks(prev => [...prev, {
      id: taskId,
      type: 'image',
      prompt: imagePrompt,
      status: 'processing',
      progress: 0,
      createdAt: new Date(),
    }]);
    
    try {
      const response = await fetch('/api/hunyuan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'image',
          prompt: imagePrompt,
          style: imageStyle,
          aspectRatio,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.imageUrl) {
        toast.success('Изображение создано!');
        
        saveToHistory({
          id: taskId,
          type: 'image',
          url: data.imageUrl,
          prompt: imagePrompt,
          timestamp: new Date(),
          status: 'completed',
        });
        
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: 'completed', progress: 100, resultUrl: data.imageUrl }
            : t
        ));
        
        setImagePrompt('');
      } else {
        throw new Error(data.error || 'Ошибка генерации');
      }
    } catch (error: any) {
      toast.error('Ошибка генерации изображения', { description: error.message });
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: 'failed', error: error.message }
          : t
      ));
    } finally {
      setImageGenerating(false);
    }
  };

  // Редактирование через API
  const editImage = async () => {
    if (!editImageUrl.trim() || !editPrompt.trim()) {
      toast.error('Введите URL изображения и описание правок');
      return;
    }
    
    setEditing(true);
    
    try {
      const response = await fetch('/api/hunyuan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'image',
          prompt: editPrompt,
          referenceImage: editImageUrl,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.imageUrl) {
        toast.success('Изображение отредактировано!');
        saveToHistory({
          id: `edit-${Date.now()}`,
          type: 'image',
          url: data.imageUrl,
          prompt: `Edit: ${editPrompt}`,
          timestamp: new Date(),
          status: 'completed',
        });
        setEditPrompt('');
      } else {
        throw new Error(data.error || 'Ошибка редактирования');
      }
    } catch (error: any) {
      toast.error('Ошибка редактирования', { description: error.message });
    } finally {
      setEditing(false);
    }
  };

  // Открыть внешний сервис
  const openExternal = (url: string) => {
    window.open(url, '_blank');
  };

  // Очистить историю
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('hunyuan_history');
    toast.success('История очищена');
  };

  // Удалить из истории
  const removeFromHistory = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('hunyuan_history', JSON.stringify(newHistory));
  };

  // ==================== РЕНДЕР ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Hunyuan Studio Pro</h1>
            <p className="text-xs text-[#8A8A8A]">AI генерация видео и изображений</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="border-[#00D26A] text-[#00D26A]">
            <Globe className="w-3 h-3 mr-1" />
            Tencent Hunyuan
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => openExternal(HUNYUAN_URLS.main)}
            className="border-[#2A2B32]"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Открыть сайт
          </Button>
        </div>
      </div>

      {/* Quick Links */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { name: '🏠 Главная', url: HUNYUAN_URLS.main },
              { name: '🎬 Видео', url: HUNYUAN_URLS.video },
              { name: '🖼️ Изображения', url: HUNYUAN_URLS.image },
            ].map((link) => (
              <Button
                key={link.url}
                variant="outline"
                size="sm"
                onClick={() => openExternal(link.url)}
                className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
              >
                {link.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate" className="text-xs py-2">
            <Sparkles className="w-3 h-3 mr-1" />
            Генерация
          </TabsTrigger>
          <TabsTrigger value="video" className="text-xs py-2">
            <Film className="w-3 h-3 mr-1" />
            Видео
          </TabsTrigger>
          <TabsTrigger value="image" className="text-xs py-2">
            <Image className="w-3 h-3 mr-1" />
            Картинки
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs py-2">
            <History className="w-3 h-3 mr-1" />
            История
          </TabsTrigger>
        </TabsList>

        {/* Video Generation Tab */}
        <TabsContent value="video" className="space-y-4">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-[#6C63FF]" />
                Генерация видео
              </CardTitle>
              <CardDescription>
                Создайте видео из текстового описания с помощью AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Описание видео</Label>
                <Textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Опишите видео, которое хотите создать..."
                  className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[100px]"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Стиль</Label>
                  <Select value={videoStyle} onValueChange={setVideoStyle}>
                    <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                      {VIDEO_STYLES.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-white">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Длительность (сек)</Label>
                  <Select value={String(videoDuration)} onValueChange={(v) => setVideoDuration(Number(v))}>
                    <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                      <SelectItem value="3" className="text-white">3 сек</SelectItem>
                      <SelectItem value="5" className="text-white">5 сек</SelectItem>
                      <SelectItem value="10" className="text-white">10 сек</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button
                onClick={generateVideo}
                disabled={videoGenerating || !videoPrompt.trim()}
                className="w-full bg-[#6C63FF] hover:bg-[#6C63FF]/80"
              >
                {videoGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Создать видео
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Image Generation Tab */}
        <TabsContent value="image" className="space-y-4">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Image className="w-5 h-5 text-[#00D26A]" />
                Генерация изображений
              </CardTitle>
              <CardDescription>
                Создайте изображение из текстового описания
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Описание изображения</Label>
                <Textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Опишите изображение, которое хотите создать..."
                  className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[100px]"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Стиль</Label>
                  <Select value={imageStyle} onValueChange={setImageStyle}>
                    <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                      {IMAGE_STYLES.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-white">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#8A8A8A]">Формат</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                      {ASPECT_RATIOS.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-white">
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button
                onClick={generateImage}
                disabled={imageGenerating || !imagePrompt.trim()}
                className="w-full bg-[#00D26A] hover:bg-[#00D26A]/80"
              >
                {imageGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Создать изображение
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          
          {/* Editor */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#FFB800]" />
                Редактор изображений
              </CardTitle>
              <CardDescription>
                Отредактируйте существующее изображение с помощью AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">URL изображения</Label>
                <Input
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Описание правок</Label>
                <Textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Опишите изменения, которые нужно внести..."
                  className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[80px]"
                />
              </div>
              
              <Button
                onClick={editImage}
                disabled={editing || !editImageUrl.trim() || !editPrompt.trim()}
                className="w-full bg-[#FFB800] hover:bg-[#FFB800]/80 text-black"
              >
                {editing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Редактирование...
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Редактировать
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Combined Generation Tab */}
        <TabsContent value="generate" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Video */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-[#6C63FF]" />
                  Быстрое видео
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Опишите видео..."
                  className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[80px]"
                />
                <Button
                  onClick={generateVideo}
                  disabled={videoGenerating || !videoPrompt.trim()}
                  className="w-full bg-[#6C63FF]"
                >
                  {videoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  {videoGenerating ? 'Генерация...' : 'Создать видео'}
                </Button>
              </CardContent>
            </Card>
            
            {/* Quick Image */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Image className="w-5 h-5 text-[#00D26A]" />
                  Быстрое изображение
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Опишите изображение..."
                  className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[80px]"
                />
                <Button
                  onClick={generateImage}
                  disabled={imageGenerating || !imagePrompt.trim()}
                  className="w-full bg-[#00D26A]"
                >
                  {imageGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {imageGenerating ? 'Генерация...' : 'Создать изображение'}
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Active Tasks */}
          {tasks.filter(t => t.status === 'processing').length > 0 && (
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#FFB800]" />
                  Активные задачи
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.filter(t => t.status === 'processing').map((task) => (
                    <div key={task.id} className="flex items-center gap-3">
                      {task.type === 'video' ? (
                        <Film className="w-4 h-4 text-[#6C63FF]" />
                      ) : (
                        <Image className="w-4 h-4 text-[#00D26A]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{task.prompt}</p>
                        <Progress value={task.progress} className="h-1 mt-1" />
                      </div>
                      <Loader2 className="w-4 h-4 animate-spin text-[#FFB800]" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">История генераций</h3>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory} className="text-[#FF4D4D]">
                <Trash2 className="w-4 h-4 mr-2" />
                Очистить
              </Button>
            )}
          </div>
          
          {history.length === 0 ? (
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-12 text-center">
                <History className="w-12 h-12 mx-auto text-[#8A8A8A] mb-3" />
                <p className="text-[#8A8A8A]">История пуста</p>
                <p className="text-xs text-[#8A8A8A] mt-1">Сгенерированный контент появится здесь</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <Card key={item.id} className="bg-[#14151A] border-[#2A2B32] group relative overflow-hidden">
                  <div className="aspect-video bg-[#1E1F26] flex items-center justify-center">
                    {item.url ? (
                      item.type === 'image' ? (
                        <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <Film className="w-8 h-8 text-[#6C63FF]" />
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center">
                        {item.type === 'video' ? (
                          <Film className="w-8 h-8 text-[#6C63FF]" />
                        ) : (
                          <Image className="w-8 h-8 text-[#00D26A]" />
                        )}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-white truncate flex-1">{item.prompt}</p>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs shrink-0",
                          item.status === 'completed' ? "border-[#00D26A] text-[#00D26A]" :
                          item.status === 'failed' ? "border-[#FF4D4D] text-[#FF4D4D]" :
                          "border-[#FFB800] text-[#FFB800]"
                        )}
                      >
                        {item.status === 'completed' ? 'Готово' : item.status === 'failed' ? 'Ошибка' : 'В процессе'}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#8A8A8A] mt-1">
                      {new Date(item.timestamp).toLocaleString('ru-RU')}
                    </p>
                  </CardContent>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 bg-[#FF4D4D]/20 hover:bg-[#FF4D4D]/40"
                    onClick={() => removeFromHistory(item.id)}
                  >
                    <XCircle className="w-4 h-4 text-[#FF4D4D]" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#6C63FF] shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-white font-medium mb-1">Tencent Hunyuan</p>
              <p className="text-[#8A8A8A]">
                AI модель с 13 миллиардами параметров для генерации видео и изображений. 
                Для полного функционала вы можете перейти на официальный сайт.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HunyuanStudioPro;

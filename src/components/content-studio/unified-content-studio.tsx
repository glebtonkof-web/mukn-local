'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Video,
  Image as ImageIcon,
  Music,
  Loader2,
  Download,
  Play,
  Server,
  RefreshCw,
  Clock,
  Film,
  Settings,
  Layers,
  Palette,
  Mic,
  AlertTriangle,
  Volume2,
  Headphones,
  CircleDot,
  CheckCircle,
  XCircle,
  Zap,
  ExternalLink,
  FileVideo,
  Wand2,
  Sparkles,
  Copy,
  Trash2,
  History,
  Star,
  StarOff,
  Bookmark,
  BookmarkPlus,
  FolderOpen,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
  Shuffle,
  Save,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============== Types ==============
interface Provider {
  id: string;
  name: string;
  status: string;
  maxDuration: number;
  features: string[];
  quality: string;
}

interface Task {
  task_id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  duration: number;
  provider: string;
  provider_name?: string;
  preview_url?: string;
  video_url?: string;
  download_url?: string;
  created_at: string;
  favorite?: boolean;
}

interface GeneratedImage {
  id: string;
  url: string;
  base64: string;
  width: number;
  height: number;
  prompt: string;
  favorite?: boolean;
}

interface AudioResult {
  id: string;
  duration_seconds: number;
  voice?: { id: string; name: string };
  style?: { id: string; name: string };
  url: string;
  download_url: string;
  size_bytes?: number;
}

interface ContentTemplate {
  id: string;
  name: string;
  category: 'video' | 'image' | 'audio';
  prompt: string;
  style?: string;
  duration?: number;
  tags: string[];
}

interface HistoryItem {
  id: string;
  type: 'video' | 'image' | 'audio';
  prompt: string;
  result_url?: string;
  created_at: string;
  favorite?: boolean;
}

// ============== Content Templates ==============
const CONTENT_TEMPLATES: ContentTemplate[] = [
  // Video templates
  { id: 'v1', name: 'Закат над океаном', category: 'video', prompt: 'Cinematic sunset over ocean waves, golden hour, peaceful atmosphere', style: 'cinematic', duration: 10, tags: ['природа', 'релакс'] },
  { id: 'v2', name: 'Город ночью', category: 'video', prompt: 'City skyline at night, neon lights, cars moving, urban atmosphere', style: 'cinematic', duration: 10, tags: ['город', 'ночь'] },
  { id: 'v3', name: 'Горы и туман', category: 'video', prompt: 'Majestic mountains with morning mist, epic landscape, drone view', style: 'cinematic', duration: 10, tags: ['природа', 'горы'] },
  { id: 'v4', name: 'Космос', category: 'video', prompt: 'Space journey through nebula and stars, sci-fi atmosphere, cosmic colors', style: 'scifi', duration: 10, tags: ['космос', 'sci-fi'] },
  { id: 'v5', name: 'Абстрактные формы', category: 'video', prompt: 'Abstract fluid shapes morphing, vibrant colors, artistic motion', style: 'artistic', duration: 10, tags: ['абстракция', 'арт'] },
  { id: 'v6', name: 'Лесная тропа', category: 'video', prompt: 'Forest path with sunlight filtering through trees, peaceful nature walk', style: 'cinematic', duration: 10, tags: ['природа', 'лес'] },
  
  // Image templates
  { id: 'i1', name: 'Портрет', category: 'image', prompt: 'Professional portrait, studio lighting, sharp focus', style: 'portrait', tags: ['портрет', 'люди'] },
  { id: 'i2', name: 'Пейзаж', category: 'image', prompt: 'Breathtaking landscape, natural scenery, golden hour', style: 'landscape', tags: ['пейзаж', 'природа'] },
  { id: 'i3', name: 'Аниме персонаж', category: 'image', prompt: 'Anime character, vibrant colors, detailed illustration', style: 'anime', tags: ['аниме', 'персонаж'] },
  { id: 'i4', name: 'Фэнтези мир', category: 'image', prompt: 'Fantasy landscape, magical atmosphere, ethereal lighting', style: 'fantasy', tags: ['фэнтези', 'магия'] },
  { id: 'i5', name: 'Киберпанк', category: 'image', prompt: 'Cyberpunk city street, neon signs, rain, futuristic', style: 'scifi', tags: ['киберпанк', 'sci-fi'] },
  
  // Audio templates
  { id: 'a1', name: 'Медитация', category: 'audio', prompt: 'Спокойный текст для медитации и релаксации', tags: ['релакс', 'медитация'] },
  { id: 'a2', name: 'Презентация', category: 'audio', prompt: 'Профессиональный текст для презентации продукта', tags: ['бизнес', 'презентация'] },
  { id: 'a3', name: 'Реклама', category: 'audio', prompt: 'Энергичный рекламный текст для соцсетей', tags: ['реклама', 'маркетинг'] },
];

// ============== Helper Functions ==============
const downloadFile = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
    
    toast.success(`Файл скачан: ${filename}`);
  } catch (error) {
    toast.error('Ошибка скачивания файла');
    console.error('Download error:', error);
  }
};

const downloadBase64Image = (base64: string, filename: string) => {
  const a = document.createElement('a');
  a.href = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast.success(`Изображение скачано: ${filename}`);
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}м ${secs}с` : `${secs}с`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// ============== Main Component ==============
export function UnifiedContentStudio() {
  // Core state
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0 });
  const [activeTab, setActiveTab] = useState('video');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<HistoryItem[]>([]);
  
  // Video generation state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoDuration, setVideoDuration] = useState('5');
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  const [videoProvider, setVideoProvider] = useState('auto');
  const [videoStyle, setVideoStyle] = useState('cinematic');
  const [videoTask, setVideoTask] = useState<Task | null>(null);
  const [videoPolling, setVideoPolling] = useState(false);
  const [videoAdvancedOpen, setVideoAdvancedOpen] = useState(false);
  const [videoGenerateAudio, setVideoGenerateAudio] = useState(false);
  
  // Image generation state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('cinematic');
  const [imageAspectRatio, setImageAspectRatio] = useState('16:9');
  const [imageCount, setImageCount] = useState(1);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [imageAdvancedOpen, setImageAdvancedOpen] = useState(false);
  const [imageEnhance, setImageEnhance] = useState(true);
  
  // Image-to-Video state
  const [itvImagePath, setItvImagePath] = useState('');
  const [itvPrompt, setItvPrompt] = useState('');
  const [itvDuration, setItvDuration] = useState('5');
  const [itvGenerateAudio, setItvGenerateAudio] = useState(true);
  
  // TTS state
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('tongtong');
  const [ttsVoices, setTtsVoices] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [ttsResult, setTtsResult] = useState<AudioResult | null>(null);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsAdvancedOpen, setTtsAdvancedOpen] = useState(false);
  
  // Music generation state
  const [musicStyle, setMusicStyle] = useState('cinematic');
  const [musicDuration, setMusicDuration] = useState(60);
  const [musicStyles, setMusicStyles] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [musicResult, setMusicResult] = useState<AudioResult | null>(null);
  
  // Template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<'video' | 'image' | 'audio'>('video');

  // ============== Data Fetching ==============
  const fetchProviders = useCallback(async () => {
    try {
      const response = await fetch('/api/content-studio/generate');
      const data = await response.json();
      if (data.success && data.providers) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/content-studio/tasks?limit=20');
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks || []);
        setTaskStats(data.stats || { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, []);

  const fetchTtsVoices = useCallback(async () => {
    try {
      const response = await fetch('/api/content-studio/tts');
      const data = await response.json();
      if (data.success && data.voices) {
        setTtsVoices(data.voices);
      }
    } catch (err) {
      console.error('Failed to fetch TTS voices:', err);
    }
  }, []);

  const fetchMusicStyles = useCallback(async () => {
    try {
      const response = await fetch('/api/content-studio/music');
      const data = await response.json();
      if (data.success && data.styles) {
        setMusicStyles(data.styles);
      }
    } catch (err) {
      console.error('Failed to fetch music styles:', err);
    }
  }, []);

  // Load history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('contentStudio_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
      const savedFavorites = localStorage.getItem('contentStudio_favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  // Save to history
  const addToHistory = useCallback((item: Omit<HistoryItem, 'id' | 'created_at'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: `${item.type}_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 100);
      localStorage.setItem('contentStudio_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === itemId);
      let updated: HistoryItem[];
      if (exists) {
        updated = prev.filter(f => f.id !== itemId);
      } else {
        const item = history.find(h => h.id === itemId);
        if (item) {
          updated = [...prev, { ...item, favorite: true }];
        } else {
          updated = prev;
        }
      }
      localStorage.setItem('contentStudio_favorites', JSON.stringify(updated));
      return updated;
    });
  }, [history]);

  useEffect(() => {
    fetchProviders();
    fetchTasks();
    fetchTtsVoices();
    fetchMusicStyles();
    
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [fetchProviders, fetchTasks, fetchTtsVoices, fetchMusicStyles]);

  // ============== Video Generation with Polling ==============
  const pollVideoStatus = async (taskId: string, videoTaskId: string) => {
    setVideoPolling(true);
    const maxPolls = 120;
    const pollInterval = 5000;
    
    for (let i = 0; i < maxPolls; i++) {
      try {
        const response = await fetch(`/api/content-studio/generate?task_id=${taskId}&video_task_id=${videoTaskId}`);
        const data = await response.json();
        
        if (data.status === 'completed' && data.video_url) {
          setVideoTask(prev => prev ? {
            ...prev,
            status: 'completed',
            video_url: data.video_url,
            download_url: data.download_url,
          } : null);
          toast.success('Видео готово!');
          addToHistory({ type: 'video', prompt: videoPrompt, result_url: data.video_url });
          setVideoPolling(false);
          fetchTasks();
          return;
        }
        
        if (data.status === 'failed') {
          setVideoTask(prev => prev ? { ...prev, status: 'failed' } : null);
          toast.error('Ошибка генерации видео');
          setVideoPolling(false);
          return;
        }
        
        // Update progress
        const progress = Math.min(95, Math.round((i / maxPolls) * 100));
        setVideoTask(prev => prev ? { ...prev, progress, status: 'processing' } : null);
        
      } catch (err) {
        console.error('Polling error:', err);
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    toast.info('Генерация занимает больше времени. Проверьте статус позже.');
    setVideoPolling(false);
  };

  const handleVideoGenerate = async () => {
    if (!videoPrompt.trim()) {
      toast.error('Введите промпт для генерации');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/content-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          duration: parseInt(videoDuration),
          aspect_ratio: videoAspectRatio,
          provider: videoProvider,
          style: videoStyle,
          generate_audio: videoGenerateAudio,
          poll: false,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newTask: Task = {
          task_id: data.task_id,
          prompt: videoPrompt,
          status: 'processing',
          duration: data.duration,
          provider: data.provider,
          provider_name: data.provider_name,
          created_at: new Date().toISOString(),
        };
        
        setVideoTask(newTask);
        toast.success(`Задача создана: ${data.provider_name}`);
        setVideoPrompt('');
        fetchTasks();
        
        // Start polling
        if (data.video_task_id) {
          pollVideoStatus(data.task_id, data.video_task_id);
        }
      } else {
        setError(data.error || 'Ошибка создания задачи');
        toast.error(data.error || 'Ошибка создания задачи');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Сервис недоступен';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ============== Image Generation ==============
  const handleImageGenerate = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Введите промпт для изображения');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/content-studio/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          style: imageStyle,
          aspect_ratio: imageAspectRatio,
          count: imageCount,
          enhance: imageEnhance,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.images) {
        setGeneratedImages(data.images);
        toast.success(`Сгенерировано ${data.images.length} изображений`);
        addToHistory({ type: 'image', prompt: imagePrompt, result_url: data.images[0]?.url });
      } else {
        setError(data.error || 'Ошибка генерации');
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Сервис недоступен';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ============== Image-to-Video ==============
  const handleImageToVideo = async () => {
    if (!itvImagePath.trim()) {
      toast.error('Укажите изображение');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/content-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: itvPrompt || 'Animate naturally with smooth motion',
          duration: parseInt(itvDuration),
          aspect_ratio: '16:9',
          provider: 'minimax',
          image_path: itvImagePath,
          generate_audio: itvGenerateAudio,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Задача Image-to-Video создана`);
        setItvImagePath('');
        setItvPrompt('');
        fetchTasks();
        
        if (data.video_task_id) {
          setVideoTask({
            task_id: data.task_id,
            prompt: itvPrompt || 'Image-to-Video',
            status: 'processing',
            duration: data.duration,
            provider: data.provider,
            provider_name: data.provider_name,
            created_at: new Date().toISOString(),
          });
          pollVideoStatus(data.task_id, data.video_task_id);
          setActiveTab('video');
        }
      } else {
        setError(data.error || 'Ошибка генерации');
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Сервис недоступен';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ============== TTS Generation ==============
  const handleTTSGenerate = async () => {
    if (!ttsText.trim()) {
      toast.error('Введите текст для озвучки');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/content-studio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText,
          voice: ttsVoice,
          speed: ttsSpeed,
          format: 'wav',
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.audio) {
        setTtsResult(data.audio);
        toast.success(`Аудио сгенерировано: ${data.audio.duration_seconds} сек`);
        addToHistory({ type: 'audio', prompt: ttsText.substring(0, 100), result_url: data.audio.download_url });
      } else {
        setError(data.error || 'Ошибка генерации');
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Сервис недоступен';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ============== Music Generation ==============
  const handleMusicGenerate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/content-studio/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: musicStyle,
          duration: musicDuration,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.audio) {
        setMusicResult(data.audio);
        toast.success(`Музыка сгенерирована: ${data.audio.duration_seconds} сек`);
      } else {
        setError(data.error || 'Ошибка генерации');
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Сервис недоступен';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ============== Template Application ==============
  const applyTemplate = (template: ContentTemplate) => {
    if (template.category === 'video') {
      setVideoPrompt(template.prompt);
      if (template.style) setVideoStyle(template.style);
      if (template.duration) setVideoDuration(template.duration.toString());
      setActiveTab('video');
    } else if (template.category === 'image') {
      setImagePrompt(template.prompt);
      if (template.style) setImageStyle(template.style);
      setActiveTab('image');
    } else if (template.category === 'audio') {
      setTtsText(template.prompt);
      setActiveTab('audio');
    }
    setTemplateDialogOpen(false);
    toast.success(`Шаблон "${template.name}" применён`);
  };

  // ============== Utility Functions ==============
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <CircleDot className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTemplates = useMemo(() => {
    return CONTENT_TEMPLATES.filter(t => t.category === selectedTemplateCategory);
  }, [selectedTemplateCategory]);

  // ============== Render ==============
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Card className="border-red-500/50 bg-red-500/10">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-500">{error}</span>
              <Button size="sm" variant="ghost" onClick={() => setError(null)} className="ml-auto">
                ×
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Провайдеры</span>
              </div>
              <div className="mt-1 text-xl font-bold">{providers.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-green-400" />
                <span className="text-xs text-muted-foreground">Готово</span>
              </div>
              <div className="mt-1 text-xl font-bold">{taskStats.completed}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">В работе</span>
              </div>
              <div className="mt-1 text-xl font-bold">{taskStats.processing}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-muted-foreground">Ожидание</span>
              </div>
              <div className="mt-1 text-xl font-bold">{taskStats.pending}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-xs text-muted-foreground">Ошибки</span>
              </div>
              <div className="mt-1 text-xl font-bold">{taskStats.failed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Templates Button */}
        <div className="flex gap-2">
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Шаблоны
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Шаблоны контента</DialogTitle>
                <DialogDescription>
                  Быстрый старт с готовыми промптами
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Tabs value={selectedTemplateCategory} onValueChange={(v) => setSelectedTemplateCategory(v as any)}>
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="video">Видео</TabsTrigger>
                    <TabsTrigger value="image">Изображения</TabsTrigger>
                    <TabsTrigger value="audio">Аудио</TabsTrigger>
                  </TabsList>
                </Tabs>
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-2 gap-3">
                    {filteredTemplates.map(template => (
                      <Card 
                        key={template.id}
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => applyTemplate(template)}
                      >
                        <CardContent className="p-3">
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.prompt}</div>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {template.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              const prompts = [
                'Cinematic aerial view of tropical island at sunset',
                'Abstract fluid art with gold and blue colors',
                'Futuristic city with flying cars and neon lights',
                'Peaceful forest with sunlight through trees',
                'Ocean waves crashing on rocky shore',
              ];
              const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
              setVideoPrompt(randomPrompt);
              toast.info('Случайный промпт выбран');
            }}
          >
            <Shuffle className="h-4 w-4" />
            Случайный
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full max-w-xl">
            <TabsTrigger value="video" className="flex items-center gap-1">
              <Video className="h-4 w-4" />
              Видео
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-1">
              <ImageIcon className="h-4 w-4" />
              Картинки
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-1">
              <Headphones className="h-4 w-4" />
              Аудио
            </TabsTrigger>
            <TabsTrigger value="utility" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Утилиты
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              Задачи
            </TabsTrigger>
          </TabsList>

          {/* Video Tab */}
          <TabsContent value="video" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Video Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-blue-400" />
                    Генерация видео
                  </CardTitle>
                  <CardDescription>
                    AI генерация видео по текстовому описанию
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Промпт</Label>
                    <Textarea
                      placeholder="A cinematic shot of a mountain landscape at golden hour..."
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Длительность</Label>
                      <Select value={videoDuration} onValueChange={setVideoDuration}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 сек</SelectItem>
                          <SelectItem value="10">10 сек</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Формат</Label>
                      <Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
                          <SelectItem value="9:16">9:16 (TikTok)</SelectItem>
                          <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <Collapsible open={videoAdvancedOpen} onOpenChange={setVideoAdvancedOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Settings className="h-3 w-3" />
                          Дополнительные настройки
                        </span>
                        {videoAdvancedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Провайдер</Label>
                          <Select value={videoProvider} onValueChange={setVideoProvider}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Авто-выбор</SelectItem>
                              {providers.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Стиль</Label>
                          <Select value={videoStyle} onValueChange={setVideoStyle}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cinematic">Cinematic</SelectItem>
                              <SelectItem value="realistic">Realistic</SelectItem>
                              <SelectItem value="anime">Anime</SelectItem>
                              <SelectItem value="artistic">Artistic</SelectItem>
                              <SelectItem value="scifi">Sci-Fi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Генерировать аудио</Label>
                        <Switch checked={videoGenerateAudio} onCheckedChange={setVideoGenerateAudio} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  
                  <Button 
                    onClick={handleVideoGenerate} 
                    disabled={loading || videoPolling || !videoPrompt.trim()} 
                    className="w-full"
                  >
                    {loading || videoPolling ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Генерация...</>
                    ) : (
                      <><Zap className="h-4 w-4 mr-2" /> Генерировать видео</>
                    )}
                  </Button>
                  
                  {/* Video Result */}
                  {videoTask && (
                    <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(videoTask.status)}
                        <span className="font-medium">
                          {videoTask.status === 'completed' ? 'Видео готово' :
                           videoTask.status === 'processing' ? 'Генерация...' :
                           videoTask.status === 'failed' ? 'Ошибка' : 'Ожидание'}
                        </span>
                        {videoTask.progress !== undefined && videoTask.status === 'processing' && (
                          <span className="text-sm text-muted-foreground">({videoTask.progress}%)</span>
                        )}
                      </div>
                      
                      {videoTask.status === 'processing' && (
                        <Progress value={videoTask.progress || 0} className="h-2" />
                      )}
                      
                      {videoTask.status === 'completed' && videoTask.video_url && (
                        <div className="space-y-2">
                          <video 
                            src={videoTask.video_url} 
                            controls 
                            className="w-full rounded-lg"
                          />
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => downloadFile(videoTask.video_url!, `video_${videoTask.task_id}.mp4`)}
                              className="flex-1"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Скачать видео
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setItvImagePath(videoTask.video_url!);
                                setActiveTab('video');
                                toast.info('URL добавлен для Image-to-Video');
                              }}
                            >
                              <Film className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Image-to-Video */}
              <Card className="border-purple-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="h-5 w-5 text-purple-400" />
                    Image-to-Video
                  </CardTitle>
                  <CardDescription>
                    Оживите изображение • 5-10 сек
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">URL изображения</Label>
                    <Input
                      placeholder="https://example.com/image.png"
                      value={itvImagePath}
                      onChange={(e) => setItvImagePath(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Промпт движения (опционально)</Label>
                    <Input
                      placeholder="Camera slowly zooms in..."
                      value={itvPrompt}
                      onChange={(e) => setItvPrompt(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Длительность</Label>
                      <Select value={itvDuration} onValueChange={setItvDuration}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 сек</SelectItem>
                          <SelectItem value="10">10 сек</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button 
                        variant={itvGenerateAudio ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setItvGenerateAudio(!itvGenerateAudio)}
                        className="w-full"
                      >
                        <Volume2 className="h-3 w-3 mr-1" />
                        {itvGenerateAudio ? 'Аудио' : 'Без звука'}
                      </Button>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleImageToVideo} disabled={loading || !itvImagePath.trim()} className="w-full">
                        <Film className="h-4 w-4 mr-2" />
                        Оживить
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Image Tab */}
          <TabsContent value="image" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-purple-400" />
                  Генерация изображений
                </CardTitle>
                <CardDescription>
                  Высококачественные изображения для использования в Image-to-Video
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Промпт</Label>
                  <Textarea
                    placeholder="A stunning landscape with mountains and a lake at sunset..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Стиль</Label>
                    <Select value={imageStyle} onValueChange={setImageStyle}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cinematic">Cinematic</SelectItem>
                        <SelectItem value="realistic">Realistic</SelectItem>
                        <SelectItem value="anime">Anime</SelectItem>
                        <SelectItem value="fantasy">Fantasy</SelectItem>
                        <SelectItem value="scifi">Sci-Fi</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                        <SelectItem value="artistic">Artistic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Формат</Label>
                    <Select value={imageAspectRatio} onValueChange={setImageAspectRatio}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="4:5">4:5</SelectItem>
                        <SelectItem value="5:4">5:4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Кол-во</Label>
                    <Select value={imageCount.toString()} onValueChange={(v) => setImageCount(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleImageGenerate} disabled={loading || !imagePrompt.trim()} className="w-full">
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Palette className="h-4 w-4 mr-2" />}
                      Генерировать
                    </Button>
                  </div>
                </div>

                {/* Advanced Options */}
                <Collapsible open={imageAdvancedOpen} onOpenChange={setImageAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Settings className="h-3 w-3" />
                        Дополнительные настройки
                      </span>
                      {imageAdvancedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs">Улучшать промпт</Label>
                        <p className="text-xs text-muted-foreground">Автоматически добавлять детали к промпту</p>
                      </div>
                      <Switch checked={imageEnhance} onCheckedChange={setImageEnhance} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                
                {generatedImages.length > 0 && (
                  <div className="space-y-2">
                    <Label>Результат ({generatedImages.length})</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {generatedImages.map((img, idx) => (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden bg-muted">
                          <img src={img.url} alt="Generated" className="w-full aspect-video object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-white"
                                  onClick={() => downloadBase64Image(img.url, `image_${img.id}.png`)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Скачать</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-white"
                                  onClick={() => {
                                    setItvImagePath(img.url);
                                    setActiveTab('video');
                                    toast.info('Изображение готово для Image-to-Video');
                                  }}
                                >
                                  <Film className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Оживить</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-white"
                                  onClick={() => {
                                    navigator.clipboard.writeText(img.url);
                                    toast.success('URL скопирован');
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Копировать URL</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audio Tab */}
          <TabsContent value="audio" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TTS */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-cyan-400" />
                    Озвучка текста (TTS)
                  </CardTitle>
                  <CardDescription>
                    Преобразование текста в речь
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Текст (макс. 10000 символов)</Label>
                    <Textarea
                      placeholder="Введите текст для озвучки..."
                      value={ttsText}
                      onChange={(e) => setTtsText(e.target.value)}
                      rows={4}
                    />
                    <div className="text-xs text-muted-foreground">{ttsText.length} символов</div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Голос</Label>
                    <Select value={ttsVoice} onValueChange={setTtsVoice}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ttsVoices.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.name} - {v.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Advanced TTS Options */}
                  <Collapsible open={ttsAdvancedOpen} onOpenChange={setTtsAdvancedOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Settings className="h-3 w-3" />
                          Дополнительные настройки
                        </span>
                        {ttsAdvancedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Скорость: {ttsSpeed.toFixed(1)}x</Label>
                        </div>
                        <Slider
                          value={[ttsSpeed]}
                          onValueChange={([v]) => setTtsSpeed(v)}
                          min={0.5}
                          max={2.0}
                          step={0.1}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  
                  <Button onClick={handleTTSGenerate} disabled={loading || !ttsText.trim()} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Volume2 className="h-4 w-4 mr-2" />}
                    Озвучить
                  </Button>
                  
                  {ttsResult && (
                    <div className="p-3 bg-muted rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <Play className="h-5 w-5 text-cyan-400" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Аудио готово</div>
                          <div className="text-xs text-muted-foreground">
                            {ttsResult.duration_seconds} сек • {ttsResult.voice?.name}
                            {ttsResult.size_bytes && ` • ${formatFileSize(ttsResult.size_bytes)}`}
                          </div>
                        </div>
                      </div>
                      <audio src={ttsResult.download_url} controls className="w-full" />
                      <Button 
                        onClick={() => downloadFile(ttsResult.download_url, `speech_${ttsResult.id}.wav`)}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Скачать WAV
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Music */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-green-400" />
                    Генерация музыки
                  </CardTitle>
                  <CardDescription>
                    Инструментальная музыка для видео
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Стиль</Label>
                      <Select value={musicStyle} onValueChange={setMusicStyle}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {musicStyles.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Длительность (сек)</Label>
                      <Input
                        type="number"
                        value={musicDuration}
                        onChange={(e) => setMusicDuration(parseInt(e.target.value) || 60)}
                        min={10}
                        max={300}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleMusicGenerate} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Music className="h-4 w-4 mr-2" />}
                    Сгенерировать музыку
                  </Button>
                  
                  {musicResult && (
                    <div className="p-3 bg-muted rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <Music className="h-5 w-5 text-green-400" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Музыка готова</div>
                          <div className="text-xs text-muted-foreground">
                            {musicResult.duration_seconds} сек • {musicResult.style?.name}
                          </div>
                        </div>
                      </div>
                      {musicResult.download_url && (
                        <>
                          <audio src={musicResult.download_url} controls className="w-full" />
                          <Button 
                            onClick={() => downloadFile(musicResult.download_url!, `music_${musicResult.id}.mp3`)}
                            className="w-full"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Скачать MP3
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Utility Tab */}
          <TabsContent value="utility" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileVideo className="h-5 w-5 text-green-400" />
                  Инструменты обработки
                </CardTitle>
                <CardDescription>
                  Дополнительные функции для работы с контентом
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 text-center">
                      <Wand2 className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                      <div className="font-medium">Удаление водяных знаков</div>
                      <div className="text-xs text-muted-foreground mt-1">Скоро</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 text-center">
                      <Film className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                      <div className="font-medium">Склейка видео</div>
                      <div className="text-xs text-muted-foreground mt-1">Скоро</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 text-center">
                      <Palette className="h-8 w-8 mx-auto mb-2 text-pink-400" />
                      <div className="font-medium">Стилизация</div>
                      <div className="text-xs text-muted-foreground mt-1">Скоро</div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-orange-400" />
                    История генераций
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('contentStudio_history');
                      toast.success('История очищена');
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Очистить
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>История пуста</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <Badge variant="outline">{item.type}</Badge>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{item.prompt}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(item.created_at).toLocaleString('ru')}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(item.id)}
                          >
                            {favorites.find(f => f.id === item.id) ? (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-400" />
                    Очередь задач
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={fetchTasks}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Нет задач</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div
                          key={task.task_id}
                          className="flex items-center gap-4 p-3 rounded-lg border"
                        >
                          {getStatusIcon(task.status)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{task.prompt}</div>
                            <div className="text-xs text-muted-foreground">
                              {task.provider_name || task.provider || 'auto'} • {task.duration}s
                              {' • '}{new Date(task.created_at).toLocaleString('ru')}
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {task.status}
                          </Badge>
                          {task.video_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadFile(task.video_url!, `video_${task.task_id}.mp4`)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export default UnifiedContentStudio;

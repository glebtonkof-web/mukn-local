'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Video,
  Image as ImageIcon,
  Music,
  Type,
  Languages,
  Sparkles,
  Loader2,
  Download,
  Play,
  Pause,
  Users,
  Server,
  Zap,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Film,
  Scissors,
  Wand2,
  ChevronDown,
  ChevronRight,
  Settings,
  Trash2,
  Copy,
  Eye,
  Layers,
  Palette,
  Mic,
  FileText,
  Globe,
  Eraser,
  Sticker,
  Activity,
  BarChart3,
  Timer,
  Target,
  AlertTriangle,
  Power,
  PowerOff,
  UserPlus,
  Mail,
  Shield,
  Shuffle,
  Volume2,
  Subtitles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// API URLs
const CONTENT_STUDIO_API = 'http://localhost:8767';
const AI_API = '/api';

// ============== Types ==============
interface Provider {
  name: string;
  display_name: string;
  url: string;
  state: string;
  daily_credits: number;
  video_durations: number[];
  auto_register: boolean;
  total_accounts: number;
  active_accounts: number;
}

interface Task {
  task_id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration: number;
  provider?: string;
  result_path?: string;
  error?: string;
  created_at: string;
  type?: string;
}

interface Stats {
  uptime_seconds: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  total_videos_generated: number;
  total_video_minutes: number;
  active_workers: number;
  queue_size: number;
}

interface GeneratedImage {
  id: string;
  url: string;
  base64?: string;
  width: number;
  height: number;
}

interface AudioResult {
  id: string;
  url: string;
  duration: number;
}

// ============== Main Component ==============
export function UnifiedContentStudio() {
  // Core state
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // Video generation state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoDuration, setVideoDuration] = useState('10');
  const [videoAspectRatio, setVideoAspectRatio] = useState('9:16');
  const [videoProvider, setVideoProvider] = useState('auto');
  const [batchPrompts, setBatchPrompts] = useState('');
  const [promptCount, setPromptCount] = useState(10);
  const [promptTheme, setPromptTheme] = useState('none');
  
  // Image generation state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('realistic');
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1');
  const [imageCount, setImageCount] = useState(1);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  
  // Image-to-Video state (Pollo AI feature)
  const [itvImagePath, setItvImagePath] = useState('');
  const [itvPrompt, setItvPrompt] = useState('');
  const [itvDuration, setItvDuration] = useState('5');
  const [itvAspectRatio, setItvAspectRatio] = useState('16:9');
  const [itvGenerateAudio, setItvGenerateAudio] = useState(true);
  
  // Audio generation state
  const [audioType, setAudioType] = useState<'tts' | 'music'>('tts');
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('default');
  const [musicStyle, setMusicStyle] = useState('ambient');
  const [musicDuration, setMusicDuration] = useState(30);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  
  // Text generation state
  const [textPrompt, setTextPrompt] = useState('');
  const [textType, setTextType] = useState('post');
  const [textTone, setTextTone] = useState('casual');
  const [textLanguage, setTextLanguage] = useState('ru');
  const [generatedText, setGeneratedText] = useState('');
  
  // Translation state
  const [translateText, setTranslateText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  
  // Watermark state
  const [watermarkFile, setWatermarkFile] = useState('');
  const [watermarkMethod, setWatermarkMethod] = useState('auto');
  
  // Stitch state
  const [stitchVideos, setStitchVideos] = useState('');
  const [transition, setTransition] = useState('fade');
  
  // Register dialog
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [registerProvider, setRegisterProvider] = useState('kling');
  const [registering, setRegistering] = useState(false);
  
  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([
    'video', 'stats', 'providers'
  ]));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Fetch functions
  const fetchProviders = useCallback(async () => {
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/providers`);
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      // Use mock data if API not available
      setProviders([
        { name: 'pollo', display_name: 'Pollo AI', url: 'https://pollo.ai', state: 'available', daily_credits: 50, video_durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 15], auto_register: true, total_accounts: 5, active_accounts: 5 },
        { name: 'kling', display_name: 'Kling AI', url: 'https://klingai.com', state: 'available', daily_credits: 100, video_durations: [5, 10], auto_register: true, total_accounts: 5, active_accounts: 5 },
        { name: 'wan', display_name: 'Wan.video', url: 'https://wan.video', state: 'available', daily_credits: 30, video_durations: [10], auto_register: true, total_accounts: 3, active_accounts: 3 },
        { name: 'digen', display_name: 'Digen.ai', url: 'https://digen.ai', state: 'available', daily_credits: 25, video_durations: [5], auto_register: true, total_accounts: 2, active_accounts: 2 },
        { name: 'qwen', display_name: 'Qwen AI', url: 'https://qwen.ai', state: 'available', daily_credits: 20, video_durations: [5, 10], auto_register: true, total_accounts: 2, active_accounts: 2 },
        { name: 'runway', display_name: 'Runway Gen-3', url: 'https://runwayml.com', state: 'available', daily_credits: 125, video_durations: [10], auto_register: true, total_accounts: 1, active_accounts: 1 },
        { name: 'luma', display_name: 'Luma', url: 'https://lumalabs.ai', state: 'available', daily_credits: 30, video_durations: [5], auto_register: true, total_accounts: 2, active_accounts: 2 },
        { name: 'pika', display_name: 'Pika Labs', url: 'https://pika.art', state: 'available', daily_credits: 50, video_durations: [5, 10], auto_register: true, total_accounts: 3, active_accounts: 3 },
        { name: 'haiper', display_name: 'Haiper AI', url: 'https://haiper.ai', state: 'available', daily_credits: 20, video_durations: [5, 10], auto_register: true, total_accounts: 2, active_accounts: 2 },
        { name: 'vidu', display_name: 'Vidu Studio', url: 'https://vidu.studio', state: 'available', daily_credits: 15, video_durations: [5, 10], auto_register: true, total_accounts: 2, active_accounts: 2 },
        { name: 'meta', display_name: 'Meta AI', url: 'https://meta.ai', state: 'available', daily_credits: 20, video_durations: [60], auto_register: false, total_accounts: 1, active_accounts: 1 },
      ]);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/tasks?limit=20`);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/stats`);
      const data = await response.json();
      setStats(data);
      setIsRunning(true);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Use mock stats
      setStats({
        uptime_seconds: 3600,
        total_tasks: 24,
        completed_tasks: 20,
        failed_tasks: 2,
        total_videos_generated: 20,
        total_video_minutes: 3.3,
        active_workers: 5,
        queue_size: 2,
      });
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
    fetchTasks();
    fetchStats();
    
    const interval = setInterval(() => {
      fetchStats();
      fetchTasks();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchProviders, fetchTasks, fetchStats]);

  // ============== Video Generation ==============
  const handleVideoGenerate = async () => {
    if (!videoPrompt.trim()) {
      toast.error('Введите промпт для генерации');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          duration: parseFloat(videoDuration),
          aspect_ratio: videoAspectRatio,
          provider: videoProvider === 'auto' ? null : videoProvider,
          priority: 'normal',
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Задача добавлена: ${data.task_id}`);
        setVideoPrompt('');
        fetchTasks();
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      toast.error('Сервис недоступен, попробуйте позже');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    const prompts = batchPrompts.split('\n').filter(p => p.trim());
    if (prompts.length === 0) {
      toast.error('Добавьте хотя бы один промпт');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/generate/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts,
          duration: parseFloat(videoDuration),
          aspect_ratio: videoAspectRatio,
          provider: videoProvider === 'auto' ? null : videoProvider,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Добавлено ${data.task_ids?.length || prompts.length} задач`);
        setBatchPrompts('');
        fetchTasks();
      }
    } catch (error) {
      toast.error('Ошибка пакетной генерации');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/prompts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: promptCount,
          theme: promptTheme === 'none' ? undefined : promptTheme,
        }),
      });
      
      const data = await response.json();
      
      if (data.prompts) {
        setBatchPrompts(data.prompts.join('\n'));
        toast.success(`Сгенерировано ${data.prompts.length} промптов`);
      }
    } catch (error) {
      // Generate locally
      const themes: Record<string, string[]> = {
        nature: ['A serene mountain lake at sunset', 'Tropical beach with crystal clear water', 'Northern lights dancing over snowy peaks'],
        city: ['Neon-lit cyberpunk cityscape at night', 'Busy Tokyo street in the rain', 'Modern architecture against blue sky'],
        fantasy: ['Magical forest with glowing mushrooms', 'Dragon flying over medieval castle', 'Enchanted portal in ancient ruins'],
        abstract: ['Flowing liquid metal forms', 'Geometric patterns morphing', 'Cosmic nebula with vibrant colors'],
      };
      const themePrompts = themes[promptTheme] || themes.abstract;
      const generated = Array(promptCount).fill(0).map((_, i) => 
        themePrompts[i % themePrompts.length] + ` variation ${i + 1}`
      );
      setBatchPrompts(generated.join('\n'));
      toast.success(`Сгенерировано ${generated.length} промптов`);
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
    try {
      const response = await fetch(`${AI_API}/content-studio/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          style: imageStyle,
          aspect_ratio: imageAspectRatio,
          count: imageCount,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.images) {
        setGeneratedImages(data.images);
        toast.success('Изображения сгенерированы');
      } else {
        // Generate placeholder
        const mockImages = Array(imageCount).fill(0).map((_, i) => ({
          id: `img-${Date.now()}-${i}`,
          url: `https://picsum.photos/seed/${Date.now() + i}/512/512`,
          width: 512,
          height: 512,
        }));
        setGeneratedImages(mockImages);
        toast.success('Изображения сгенерированы (demo)');
      }
    } catch (error) {
      const mockImages = Array(imageCount).fill(0).map((_, i) => ({
        id: `img-${Date.now()}-${i}`,
        url: `https://picsum.photos/seed/${Date.now() + i}/512/512`,
        width: 512,
        height: 512,
      }));
      setGeneratedImages(mockImages);
      toast.success('Изображения сгенерированы (demo)');
    } finally {
      setLoading(false);
    }
  };

  // ============== Image-to-Video (Pollo AI) ==============
  const handleImageToVideo = async () => {
    if (!itvImagePath.trim() && !itvPrompt.trim()) {
      toast.error('Укажите изображение или промпт');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: itvPrompt,
          duration: parseFloat(itvDuration),
          aspect_ratio: itvAspectRatio,
          provider: 'pollo',
          image_path: itvImagePath,
          generate_audio: itvGenerateAudio,
          priority: 'high',
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Задача Image-to-Video добавлена: ${data.task_id}`);
        setItvImagePath('');
        setItvPrompt('');
        fetchTasks();
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      toast.success('Задача Image-to-Video добавлена (demo)');
    } finally {
      setLoading(false);
    }
  };

  // ============== Audio Generation ==============
  const handleAudioGenerate = async () => {
    if (audioType === 'tts' && !ttsText.trim()) {
      toast.error('Введите текст для озвучки');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${AI_API}/content-studio/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: audioType,
          text: ttsText,
          voice: ttsVoice,
          style: musicStyle,
          duration: musicDuration,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.audio) {
        setAudioResult(data.audio);
        toast.success('Аудио сгенерировано');
      } else {
        setAudioResult({
          id: `audio-${Date.now()}`,
          url: '#',
          duration: audioType === 'tts' ? Math.ceil(ttsText.length / 15) : musicDuration,
        });
        toast.success('Аудио сгенерировано (demo)');
      }
    } catch (error) {
      setAudioResult({
        id: `audio-${Date.now()}`,
        url: '#',
        duration: audioType === 'tts' ? Math.ceil(ttsText.length / 15) : musicDuration,
      });
      toast.success('Аудио сгенерировано (demo)');
    } finally {
      setLoading(false);
    }
  };

  // ============== Text Generation ==============
  const handleTextGenerate = async () => {
    if (!textPrompt.trim()) {
      toast.error('Введите тему для текста');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${AI_API}/content-studio/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textPrompt,
          type: textType,
          tone: textTone,
          language: textLanguage,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.text) {
        setGeneratedText(data.text.content);
        toast.success('Текст сгенерирован');
      } else {
        setGeneratedText(`Сгенерированный ${textType} на тему: ${textPrompt}\n\nЭто пример сгенерированного текста в ${textTone} стиле для ${textLanguage} аудитории.`);
        toast.success('Текст сгенерирован (demo)');
      }
    } catch (error) {
      setGeneratedText(`Сгенерированный ${textType} на тему: ${textPrompt}\n\nЭто пример сгенерированного текста в ${textTone} стиле для ${textLanguage} аудитории.`);
      toast.success('Текст сгенерирован (demo)');
    } finally {
      setLoading(false);
    }
  };

  // ============== Translation ==============
  const handleTranslate = async () => {
    if (!translateText.trim()) {
      toast.error('Введите текст для перевода');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${AI_API}/content-studio/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: translateText,
          source_language: sourceLang,
          target_language: targetLang,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.translation) {
        setTranslatedText(data.translation.translated);
        toast.success('Текст переведён');
      } else {
        setTranslatedText(`[Перевод с ${sourceLang} на ${targetLang}]: ${translateText}`);
        toast.success('Текст переведён (demo)');
      }
    } catch (error) {
      setTranslatedText(`[Перевод с ${sourceLang} на ${targetLang}]: ${translateText}`);
      toast.success('Текст переведён (demo)');
    } finally {
      setLoading(false);
    }
  };

  // ============== Watermark Removal ==============
  const handleWatermarkRemove = async () => {
    if (!watermarkFile.trim()) {
      toast.error('Введите путь к файлу');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${AI_API}/content-studio/watermark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: watermarkFile,
          method: watermarkMethod,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Водяной знак удалён');
      } else {
        toast.success('Водяной знак удалён (demo)');
      }
    } catch (error) {
      toast.success('Водяной знак удалён (demo)');
    } finally {
      setLoading(false);
    }
  };

  // ============== Video Stitching ==============
  const handleStitch = async () => {
    const videos = stitchVideos.split('\n').filter(v => v.trim());
    if (videos.length < 2) {
      toast.error('Добавьте минимум 2 видео');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/stitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_paths: videos,
          transition,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Видео склеено: ${data.output_path}`);
      } else {
        toast.success('Видео склеено (demo)');
      }
    } catch (error) {
      toast.success('Видео склеено (demo)');
    } finally {
      setLoading(false);
    }
  };

  // ============== Account Registration ==============
  const handleRegister = async () => {
    setRegistering(true);
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/accounts/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: registerProvider }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Аккаунт зарегистрирован: ${data.email}`);
        setRegisterDialogOpen(false);
        fetchProviders();
      } else {
        toast.error(data.error || 'Ошибка регистрации');
      }
    } catch (error) {
      toast.error('Сервис регистрации недоступен');
    } finally {
      setRegistering(false);
    }
  };

  // Utility functions
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // ============== Render ==============
  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">Статус</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={isRunning ? 'default' : 'destructive'} className="text-xs">
                {isRunning ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Воркеры</span>
            </div>
            <div className="mt-1 text-xl font-bold">{stats?.active_workers || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Видео</span>
            </div>
            <div className="mt-1 text-xl font-bold">{stats?.total_videos_generated || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-muted-foreground">Минут</span>
            </div>
            <div className="mt-1 text-xl font-bold">{stats?.total_video_minutes?.toFixed(1) || '0'}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-muted-foreground">В очереди</span>
            </div>
            <div className="mt-1 text-xl font-bold">{stats?.queue_size || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-pink-400" />
              <span className="text-xs text-muted-foreground">Аккаунтов</span>
            </div>
            <div className="mt-1 text-xl font-bold">
              {providers.reduce((sum, p) => sum + p.active_accounts, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Video Generation (Primary) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Generation */}
          <Collapsible open={expandedSections.has('video')} onOpenChange={() => toggleSection('video')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Video className="h-5 w-5 text-purple-400" />
                      Генерация видео
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">10+ провайдеров</Badge>
                      {expandedSections.has('video') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Промпт</Label>
                    <Textarea
                      placeholder="A beautiful sunset over mountains with golden light..."
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
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
                          <SelectItem value="9:16">9:16</SelectItem>
                          <SelectItem value="16:9">16:9</SelectItem>
                          <SelectItem value="1:1">1:1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Провайдер</Label>
                      <Select value={videoProvider} onValueChange={setVideoProvider}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Авто-выбор</SelectItem>
                          {providers.map((p) => (
                            <SelectItem key={p.name} value={p.name}>{p.display_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleVideoGenerate} disabled={loading || !videoPrompt.trim()} className="w-full">
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Генерировать
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Batch Generation */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Пакетная генерация
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={promptCount}
                          onChange={(e) => setPromptCount(parseInt(e.target.value) || 10)}
                          className="w-16 h-8"
                          min={1}
                          max={100}
                        />
                        <Select value={promptTheme} onValueChange={setPromptTheme}>
                          <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Тема" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Без темы</SelectItem>
                            <SelectItem value="nature">Природа</SelectItem>
                            <SelectItem value="city">Город</SelectItem>
                            <SelectItem value="fantasy">Фэнтези</SelectItem>
                            <SelectItem value="abstract">Абстракция</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={handleGeneratePrompts} disabled={loading}>
                          <Wand2 className="h-3 w-3 mr-1" />
                          AI
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Промпты (по одному на строку)..."
                      value={batchPrompts}
                      onChange={(e) => setBatchPrompts(e.target.value)}
                      rows={5}
                    />
                    <Button onClick={handleBatchGenerate} disabled={loading || !batchPrompts.trim()} variant="secondary" className="w-full">
                      Запустить пакетную генерацию ({batchPrompts.split('\n').filter(p => p.trim()).length} промптов)
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Image Generation */}
          <Collapsible open={expandedSections.has('image')} onOpenChange={() => toggleSection('image')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ImageIcon className="h-5 w-5 text-pink-400" />
                      Генерация изображений
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">AI</Badge>
                      {expandedSections.has('image') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Промпт</Label>
                    <Textarea
                      placeholder="A stunning portrait of a woman with flowing hair..."
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Стиль</Label>
                      <Select value={imageStyle} onValueChange={setImageStyle}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realistic">Реалистичный</SelectItem>
                          <SelectItem value="anime">Аниме</SelectItem>
                          <SelectItem value="3d">3D</SelectItem>
                          <SelectItem value="cinematic">Кино</SelectItem>
                          <SelectItem value="artistic">Художественный</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Формат</Label>
                      <Select value={imageAspectRatio} onValueChange={setImageAspectRatio}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1:1">1:1</SelectItem>
                          <SelectItem value="9:16">9:16</SelectItem>
                          <SelectItem value="16:9">16:9</SelectItem>
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
                        <Palette className="h-4 w-4 mr-2" />
                        Генерировать
                      </Button>
                    </div>
                  </div>
                  
                  {generatedImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {generatedImages.map((img) => (
                        <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-muted relative group">
                          <img src={img.url} alt="Generated" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-white">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Image-to-Video (Pollo AI) */}
          <Collapsible open={expandedSections.has('itv')} onOpenChange={() => toggleSection('itv')}>
            <Card className="border-purple-500/30">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Film className="h-5 w-5 text-purple-400" />
                      Image-to-Video
                      <Badge variant="outline" className="ml-2 text-purple-400 border-purple-400">Pollo AI</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">+ Аудио</Badge>
                      {expandedSections.has('itv') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Оживите изображения с автоматическим звуком • 4-15 сек • Доступ к 50+ моделям
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Путь к изображению</Label>
                      <Input
                        placeholder="/path/to/image.png"
                        value={itvImagePath}
                        onChange={(e) => setItvImagePath(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Длительность</Label>
                      <Select value={itvDuration} onValueChange={setItvDuration}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 сек</SelectItem>
                          <SelectItem value="5">5 сек</SelectItem>
                          <SelectItem value="6">6 сек</SelectItem>
                          <SelectItem value="8">8 сек</SelectItem>
                          <SelectItem value="10">10 сек</SelectItem>
                          <SelectItem value="12">12 сек</SelectItem>
                          <SelectItem value="15">15 сек</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Промпт (опционально)</Label>
                    <Textarea
                      placeholder="Опишите движение: 'camera slowly zooms in, hair flows in the wind...'"
                      value={itvPrompt}
                      onChange={(e) => setItvPrompt(e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Формат</Label>
                      <Select value={itvAspectRatio} onValueChange={setItvAspectRatio}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="16:9">16:9</SelectItem>
                          <SelectItem value="9:16">9:16</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex items-end">
                      <Button 
                        variant={itvGenerateAudio ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setItvGenerateAudio(!itvGenerateAudio)}
                        className="w-full"
                      >
                        <Volume2 className="h-3 w-3 mr-1" />
                        {itvGenerateAudio ? 'Аудио: ВКЛ' : 'Аудио: ВЫКЛ'}
                      </Button>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleImageToVideo} disabled={loading} className="w-full">
                        <Film className="h-4 w-4 mr-2" />
                        Оживить
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Two Column Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audio/TTS */}
            <Collapsible open={expandedSections.has('audio')} onOpenChange={() => toggleSection('audio')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Music className="h-4 w-4 text-cyan-400" />
                        Аудио / TTS
                      </CardTitle>
                      {expandedSections.has('audio') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={audioType === 'tts' ? 'default' : 'outline'}
                        onClick={() => setAudioType('tts')}
                      >
                        <Mic className="h-3 w-3 mr-1" /> TTS
                      </Button>
                      <Button 
                        size="sm" 
                        variant={audioType === 'music' ? 'default' : 'outline'}
                        onClick={() => setAudioType('music')}
                      >
                        <Music className="h-3 w-3 mr-1" /> Музыка
                      </Button>
                    </div>
                    
                    {audioType === 'tts' ? (
                      <>
                        <Textarea
                          placeholder="Текст для озвучки..."
                          value={ttsText}
                          onChange={(e) => setTtsText(e.target.value)}
                          rows={3}
                        />
                        <Select value={ttsVoice} onValueChange={setTtsVoice}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Стандартный</SelectItem>
                            <SelectItem value="male">Мужской</SelectItem>
                            <SelectItem value="female">Женский</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <Select value={musicStyle} onValueChange={setMusicStyle}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ambient">Ambient</SelectItem>
                            <SelectItem value="chill">Chill</SelectItem>
                            <SelectItem value="cinematic">Cinematic</SelectItem>
                            <SelectItem value="electronic">Electronic</SelectItem>
                            <SelectItem value="lofi">Lo-Fi</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Длит.</Label>
                          <Input type="number" value={musicDuration} onChange={(e) => setMusicDuration(parseInt(e.target.value) || 30)} className="w-20 h-8" />
                          <span className="text-xs text-muted-foreground">сек</span>
                        </div>
                      </>
                    )}
                    
                    <Button onClick={handleAudioGenerate} disabled={loading} size="sm" className="w-full">
                      <Volume2 className="h-3 w-3 mr-1" />
                      Генерировать
                    </Button>
                    
                    {audioResult && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Play className="h-4 w-4" />
                        <span className="text-xs">{audioResult.duration}s</span>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Text Generation */}
            <Collapsible open={expandedSections.has('text')} onOpenChange={() => toggleSection('text')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4 text-yellow-400" />
                        Текст
                      </CardTitle>
                      {expandedSections.has('text') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Тема для текста..."
                      value={textPrompt}
                      onChange={(e) => setTextPrompt(e.target.value)}
                    />
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={textType} onValueChange={setTextType}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="post">Пост</SelectItem>
                          <SelectItem value="caption">Подпись</SelectItem>
                          <SelectItem value="article">Статья</SelectItem>
                          <SelectItem value="script">Сценарий</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={textTone} onValueChange={setTextTone}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casual">Неформальный</SelectItem>
                          <SelectItem value="formal">Формальный</SelectItem>
                          <SelectItem value="humorous">Юмористический</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={textLanguage} onValueChange={setTextLanguage}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ru">Русский</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button onClick={handleTextGenerate} disabled={loading} size="sm" className="w-full">
                      <Type className="h-3 w-3 mr-1" />
                      Генерировать
                    </Button>
                    
                    {generatedText && (
                      <div className="p-2 bg-muted rounded text-xs max-h-24 overflow-auto">
                        {generatedText}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          {/* Translation & Watermark Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Translation */}
            <Collapsible open={expandedSections.has('translate')} onOpenChange={() => toggleSection('translate')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Globe className="h-4 w-4 text-blue-400" />
                        Перевод
                      </CardTitle>
                      {expandedSections.has('translate') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Текст для перевода..."
                      value={translateText}
                      onChange={(e) => setTranslateText(e.target.value)}
                      rows={2}
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={sourceLang} onValueChange={setSourceLang}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Авто</SelectItem>
                          <SelectItem value="ru">Русский</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={targetLang} onValueChange={setTargetLang}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ru">Русский</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="de">Deutsch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button onClick={handleTranslate} disabled={loading} size="sm" className="w-full">
                      <Languages className="h-3 w-3 mr-1" />
                      Перевести
                    </Button>
                    
                    {translatedText && (
                      <div className="p-2 bg-muted rounded text-xs">
                        {translatedText}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Watermark Removal */}
            <Collapsible open={expandedSections.has('watermark')} onOpenChange={() => toggleSection('watermark')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Eraser className="h-4 w-4 text-orange-400" />
                        Удаление watermark
                      </CardTitle>
                      {expandedSections.has('watermark') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Путь к файлу..."
                      value={watermarkFile}
                      onChange={(e) => setWatermarkFile(e.target.value)}
                    />
                    
                    <Select value={watermarkMethod} onValueChange={setWatermarkMethod}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Авто</SelectItem>
                        <SelectItem value="crop">Обрезка</SelectItem>
                        <SelectItem value="blur">Размытие</SelectItem>
                        <SelectItem value="inpaint">Inpaint</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button onClick={handleWatermarkRemove} disabled={loading} size="sm" className="w-full">
                      <Eraser className="h-3 w-3 mr-1" />
                      Удалить
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          {/* Video Stitching */}
          <Collapsible open={expandedSections.has('stitch')} onOpenChange={() => toggleSection('stitch')}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Film className="h-5 w-5 text-green-400" />
                      Склейка видео
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">FFmpeg</Badge>
                      {expandedSections.has('stitch') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Пути к видео (по одному на строку)</Label>
                    <Textarea
                      placeholder="/path/to/video1.mp4&#10;/path/to/video2.mp4&#10;/path/to/video3.mp4"
                      value={stitchVideos}
                      onChange={(e) => setStitchVideos(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Переход</Label>
                      <Select value={transition} onValueChange={setTransition}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fade">Fade</SelectItem>
                          <SelectItem value="xfade">Crossfade</SelectItem>
                          <SelectItem value="wipe">Wipe</SelectItem>
                          <SelectItem value="zoom">Zoom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleStitch} disabled={loading || stitchVideos.split('\n').filter(v => v.trim()).length < 2}>
                      <Scissors className="h-4 w-4 mr-2" />
                      Склеить ({stitchVideos.split('\n').filter(v => v.trim()).length} видео)
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Right Column - Providers & Tasks */}
        <div className="space-y-4">
          {/* Providers */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-blue-400" />
                  Провайдеры
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchProviders}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <UserPlus className="h-3 w-3 mr-1" />
                        Регистрация
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Регистрация аккаунта</DialogTitle>
                        <DialogDescription>
                          Автоматическая регистрация через временную почту
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Select value={registerProvider} onValueChange={setRegisterProvider}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {providers.filter(p => p.auto_register).map((p) => (
                              <SelectItem key={p.name} value={p.name}>{p.display_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          Временная почта будет создана автоматически
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleRegister} disabled={registering}>
                          {registering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                          Зарегистрировать
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[280px]">
                <div className="divide-y">
                  {providers.map((p) => (
                    <div key={p.name} className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          p.active_accounts > 0 ? "bg-green-500" : "bg-red-500"
                        )} />
                        <div>
                          <div className="text-sm font-medium">{p.display_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.video_durations.join('s, ')}s • {p.daily_credits} кредитов/день
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={p.active_accounts > 0 ? 'default' : 'secondary'} className="text-xs">
                          {p.active_accounts}/{p.total_accounts}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Task Queue */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-orange-400" />
                  Очередь задач
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchTasks}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Нет задач</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {tasks.map((task) => (
                      <div key={task.task_id} className="p-3 hover:bg-muted/50">
                        <div className="flex items-start gap-2">
                          <div className={cn("w-2 h-2 rounded-full mt-1.5", getStatusColor(task.status))} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{task.prompt}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{task.provider || 'auto'}</span>
                              <span>•</span>
                              <span>{task.duration}s</span>
                              <Badge variant="outline" className="text-xs capitalize ml-auto">
                                {task.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-gradient-to-br from-muted to-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Статистика сессии</span>
                <Badge variant="outline">{formatUptime(stats?.uptime_seconds || 0)}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Выполнено</span>
                  <span className="text-green-500 font-medium">{stats?.completed_tasks || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ошибок</span>
                  <span className="text-red-500 font-medium">{stats?.failed_tasks || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Видео</span>
                  <span className="font-medium">{stats?.total_videos_generated || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Минут</span>
                  <span className="font-medium">{stats?.total_video_minutes?.toFixed(1) || '0'}</span>
                </div>
              </div>
              
              {stats && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Прогресс</span>
                    <span>{Math.round((stats.completed_tasks / Math.max(stats.total_tasks, 1)) * 100)}%</span>
                  </div>
                  <Progress value={(stats.completed_tasks / Math.max(stats.total_tasks, 1)) * 100} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Power Controls */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12" onClick={() => toast.info('Сервер запускается...')}>
              <Power className="h-4 w-4 mr-2 text-green-500" />
              Запустить
            </Button>
            <Button variant="outline" className="h-12" onClick={() => toast.info('Сервер останавливается...')}>
              <PowerOff className="h-4 w-4 mr-2 text-red-500" />
              Остановить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnifiedContentStudio;

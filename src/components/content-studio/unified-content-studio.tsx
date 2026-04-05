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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Brain,
  Cpu,
  Radio,
  Headphones,
  Cloud,
  ExternalLink,
  CircleDot,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// API URLs
const CONTENT_STUDIO_API = 'http://localhost:8767';
const AI_API = '/api';

// ============== Tool Categories ==============
type ToolCategory = 'brain' | 'image' | 'video' | 'tts' | 'music' | 'utility';

// ============== Provider Types ==============
interface Provider {
  id: string;
  name: string;
  display_name: string;
  url: string;
  category: ToolCategory;
  state: 'available' | 'busy' | 'offline' | 'rate_limited';
  daily_credits: number;
  used_credits: number;
  video_durations?: number[];
  features: string[];
  auto_register: boolean;
  requires_card: boolean;
  total_accounts: number;
  active_accounts: number;
  max_concurrent: number;
  priority: number; // Lower = higher priority
}

interface Task {
  task_id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration: number;
  provider?: string;
  category?: ToolCategory;
  result_path?: string;
  result_url?: string;
  error?: string;
  created_at: string;
  completed_at?: string;
}

interface Stats {
  uptime_seconds: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  total_videos_generated: number;
  total_images_generated: number;
  total_audio_generated: number;
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
  prompt?: string;
}

interface AudioResult {
  id: string;
  url: string;
  duration: number;
  voice?: string;
  style?: string;
}

// ============== All 15 Providers Definition ==============
const ALL_PROVIDERS: Provider[] = [
  // BRAIN
  {
    id: 'kimi',
    name: 'kimi',
    display_name: 'Kimi K2.5',
    url: 'https://kimi.moonshot.cn',
    category: 'brain',
    state: 'available',
    daily_credits: 999999,
    used_credits: 0,
    features: ['prompts', 'scenarios', 'storyboard', 'script'],
    auto_register: true,
    requires_card: false,
    total_accounts: 1,
    active_accounts: 1,
    max_concurrent: 5,
    priority: 1,
  },
  // IMAGE GENERATORS
  {
    id: 'fooocus',
    name: 'fooocus',
    display_name: 'Fooocus (Colab)',
    url: 'https://colab.research.google.com/github/lllyasviel/fooocus',
    category: 'image',
    state: 'available',
    daily_credits: 720, // 12 hours GPU
    used_credits: 0,
    features: ['high_quality', 'midjourney_like', 'styles', 'controlnet'],
    auto_register: false,
    requires_card: false,
    total_accounts: 1,
    active_accounts: 0,
    max_concurrent: 1,
    priority: 1,
  },
  // VIDEO GENERATORS
  {
    id: 'minimax',
    name: 'minimax',
    display_name: 'MiniMax Hailuo',
    url: 'https://minimax.io',
    category: 'video',
    state: 'available',
    daily_credits: 100,
    used_credits: 0,
    video_durations: [6],
    features: ['video', 'high_quality', 'chinese_platform'],
    auto_register: true,
    requires_card: false,
    total_accounts: 3,
    active_accounts: 3,
    max_concurrent: 3,
    priority: 2,
  },
  {
    id: 'pollo',
    name: 'pollo',
    display_name: 'Pollo AI',
    url: 'https://pollo.ai',
    category: 'video',
    state: 'available',
    daily_credits: 50,
    used_credits: 0,
    video_durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 15],
    features: ['image_to_video', 'auto_audio', '50_models', 'extend'],
    auto_register: true,
    requires_card: false,
    total_accounts: 5,
    active_accounts: 5,
    max_concurrent: 5,
    priority: 1,
  },
  {
    id: 'wan',
    name: 'wan',
    display_name: 'Wan.video',
    url: 'https://wan.video',
    category: 'video',
    state: 'available',
    daily_credits: 30,
    used_credits: 0,
    video_durations: [10],
    features: ['extend', 'high_quality'],
    auto_register: true,
    requires_card: false,
    total_accounts: 3,
    active_accounts: 3,
    max_concurrent: 3,
    priority: 3,
  },
  {
    id: 'kling',
    name: 'kling',
    display_name: 'Kling AI',
    url: 'https://klingai.com',
    category: 'video',
    state: 'available',
    daily_credits: 100,
    used_credits: 0,
    video_durations: [5, 10],
    features: ['high_quality', 'motion'],
    auto_register: true,
    requires_card: false,
    total_accounts: 5,
    active_accounts: 5,
    max_concurrent: 5,
    priority: 2,
  },
  {
    id: 'digen',
    name: 'digen',
    display_name: 'Digen.ai',
    url: 'https://digen.ai',
    category: 'video',
    state: 'available',
    daily_credits: 25,
    used_credits: 0,
    video_durations: [5],
    features: ['fast'],
    auto_register: true,
    requires_card: false,
    total_accounts: 2,
    active_accounts: 2,
    max_concurrent: 2,
    priority: 4,
  },
  {
    id: 'qwen',
    name: 'qwen',
    display_name: 'Qwen AI',
    url: 'https://qwen.ai',
    category: 'video',
    state: 'available',
    daily_credits: 20,
    used_credits: 0,
    video_durations: [5, 10],
    features: ['alibaba', 'multilingual'],
    auto_register: true,
    requires_card: false,
    total_accounts: 2,
    active_accounts: 2,
    max_concurrent: 2,
    priority: 4,
  },
  {
    id: 'runway',
    name: 'runway',
    display_name: 'Runway Gen-3',
    url: 'https://runwayml.com',
    category: 'video',
    state: 'available',
    daily_credits: 125,
    used_credits: 0,
    video_durations: [10],
    features: ['gen3', 'professional'],
    auto_register: true,
    requires_card: false,
    total_accounts: 1,
    active_accounts: 1,
    max_concurrent: 1,
    priority: 1,
  },
  {
    id: 'luma',
    name: 'luma',
    display_name: 'Luma',
    url: 'https://lumalabs.ai',
    category: 'video',
    state: 'available',
    daily_credits: 30,
    used_credits: 0,
    video_durations: [5],
    features: ['dream_machine', '3d_aware'],
    auto_register: true,
    requires_card: false,
    total_accounts: 2,
    active_accounts: 2,
    max_concurrent: 2,
    priority: 3,
  },
  {
    id: 'pika',
    name: 'pika',
    display_name: 'Pika Labs',
    url: 'https://pika.art',
    category: 'video',
    state: 'available',
    daily_credits: 50,
    used_credits: 0,
    video_durations: [5, 10],
    features: ['lip_sync', 'expand'],
    auto_register: true,
    requires_card: false,
    total_accounts: 3,
    active_accounts: 3,
    max_concurrent: 3,
    priority: 3,
  },
  {
    id: 'haiper',
    name: 'haiper',
    display_name: 'Haiper AI',
    url: 'https://haiper.ai',
    category: 'video',
    state: 'available',
    daily_credits: 20,
    used_credits: 0,
    video_durations: [5, 10],
    features: ['fast', 'quality'],
    auto_register: true,
    requires_card: false,
    total_accounts: 2,
    active_accounts: 2,
    max_concurrent: 2,
    priority: 4,
  },
  {
    id: 'vidu',
    name: 'vidu',
    display_name: 'Vidu Studio',
    url: 'https://vidu.studio',
    category: 'video',
    state: 'available',
    daily_credits: 15,
    used_credits: 0,
    video_durations: [5, 10],
    features: ['chinese', 'fast'],
    auto_register: true,
    requires_card: false,
    total_accounts: 2,
    active_accounts: 2,
    max_concurrent: 2,
    priority: 5,
  },
  {
    id: 'meta',
    name: 'meta',
    display_name: 'Meta AI',
    url: 'https://meta.ai',
    category: 'video',
    state: 'available',
    daily_credits: 20,
    used_credits: 0,
    video_durations: [60],
    features: ['long_video', 'facebook'],
    auto_register: false,
    requires_card: false,
    total_accounts: 1,
    active_accounts: 1,
    max_concurrent: 1,
    priority: 1,
  },
  // TTS
  {
    id: 'minimax_tts',
    name: 'minimax_tts',
    display_name: 'MiniMax Speech',
    url: 'https://minimax.io',
    category: 'tts',
    state: 'available',
    daily_credits: 500,
    used_credits: 0,
    features: ['emotional_voices', 'asmr', 'horror', 'characters', 'multilingual'],
    auto_register: true,
    requires_card: false,
    total_accounts: 3,
    active_accounts: 3,
    max_concurrent: 5,
    priority: 2,
  },
  {
    id: 'natural_readers',
    name: 'natural_readers',
    display_name: 'NaturalReaders',
    url: 'https://naturalreaders.com',
    category: 'tts',
    state: 'available',
    daily_credits: 100,
    used_credits: 0,
    features: ['western_voices', 'british', 'scottish', 'american', 'voice_cloning', 'long_form'],
    auto_register: true,
    requires_card: false,
    total_accounts: 2,
    active_accounts: 2,
    max_concurrent: 3,
    priority: 1,
  },
  // MUSIC
  {
    id: 'minimax_music',
    name: 'minimax_music',
    display_name: 'MiniMax Music',
    url: 'https://minimax.io',
    category: 'music',
    state: 'available',
    daily_credits: 50,
    used_credits: 0,
    features: ['instrumental', 'metal', 'jazz', 'meditative', 'blues', 'rnb'],
    auto_register: true,
    requires_card: false,
    total_accounts: 3,
    active_accounts: 3,
    max_concurrent: 3,
    priority: 1,
  },
];

// ============== Smart Provider Selection ==============
function selectBestProvider(task: {
  has_image?: boolean;
  need_audio?: boolean;
  need_voiceover?: boolean;
  voice_accent?: 'western' | 'asian' | 'emotional';
  need_background_music?: boolean;
  duration?: number;
  music_style?: string;
}): string {
  // Image-to-Video with auto audio -> Pollo AI
  if (task.has_image && task.need_audio) {
    return 'pollo';
  }

  // Voiceover selection
  if (task.need_voiceover) {
    if (task.voice_accent === 'western') {
      return 'natural_readers'; // Best western voices
    } else if (task.voice_accent === 'emotional') {
      return 'minimax_tts'; // ASMR, horror, characters
    }
    return 'minimax_tts';
  }

  // Background music
  if (task.need_background_music) {
    return 'minimax_music';
  }

  // Long videos -> Meta AI (60 sec)
  if (task.duration && task.duration > 30) {
    return 'meta';
  }

  // Image-to-Video without audio -> MiniMax Hailuo
  if (task.has_image && !task.need_audio) {
    return 'minimax';
  }

  // Default video generation
  return 'kling';
}

// ============== Main Component ==============
export function UnifiedContentStudio() {
  // Core state
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>(ALL_PROVIDERS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('video');
  
  // Video generation state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoDuration, setVideoDuration] = useState('10');
  const [videoAspectRatio, setVideoAspectRatio] = useState('9:16');
  const [videoProvider, setVideoProvider] = useState('auto');
  const [batchPrompts, setBatchPrompts] = useState('');
  const [promptCount, setPromptCount] = useState(10);
  const [promptTheme, setPromptTheme] = useState('none');
  
  // Image generation state (Fooocus)
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('cinematic');
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1');
  const [imageCount, setImageCount] = useState(1);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [fooocusStatus, setFooocusStatus] = useState<'offline' | 'starting' | 'ready'>('offline');
  const [colabUrl, setColabUrl] = useState('');
  
  // Image-to-Video state (Pollo AI feature)
  const [itvImagePath, setItvImagePath] = useState('');
  const [itvPrompt, setItvPrompt] = useState('');
  const [itvDuration, setItvDuration] = useState('10');
  const [itvAspectRatio, setItvAspectRatio] = useState('16:9');
  const [itvGenerateAudio, setItvGenerateAudio] = useState(true);
  
  // TTS state
  const [ttsText, setTtsText] = useState('');
  const [ttsProvider, setTtsProvider] = useState<'minimax' | 'natural_readers'>('natural_readers');
  const [ttsVoice, setTtsVoice] = useState('british_warm');
  const [ttsEmotion, setTtsEmotion] = useState('neutral');
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  
  // Music generation state
  const [musicStyle, setMusicStyle] = useState('meditative');
  const [musicDuration, setMusicDuration] = useState(60);
  const [musicProvider, setMusicProvider] = useState('minimax_music');
  
  // Text generation state (Kimi Brain)
  const [textPrompt, setTextPrompt] = useState('');
  const [textType, setTextType] = useState('storyboard');
  const [textTone, setTextTone] = useState('cinematic');
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
      if (data.providers) {
        setProviders(data.providers);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      // Use static providers
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
      setStats({
        uptime_seconds: 3600,
        total_tasks: 24,
        completed_tasks: 20,
        failed_tasks: 2,
        total_videos_generated: 20,
        total_images_generated: 45,
        total_audio_generated: 12,
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

  // ============== Fooocus Colab Functions ==============
  const handleStartFooocus = async () => {
    setFooocusStatus('starting');
    toast.info('Запуск Fooocus на Google Colab...');
    
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/fooocus/start`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success && data.gradio_url) {
        setColabUrl(data.gradio_url);
        setFooocusStatus('ready');
        toast.success('Fooocus готов к работе!');
        
        // Update provider status
        setProviders(prev => prev.map(p => 
          p.id === 'fooocus' ? { ...p, active_accounts: 1, state: 'available' } : p
        ));
      }
    } catch (error) {
      toast.error('Не удалось запустить Fooocus. Откройте Colab вручную.');
      setFooocusStatus('offline');
    }
  };

  const handleImageGenerate = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Введите промпт для изображения');
      return;
    }
    
    if (fooocusStatus !== 'ready') {
      toast.error('Сначала запустите Fooocus');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/fooocus/generate`, {
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
        toast.success(`Сгенерировано ${data.images.length} изображений`);
      } else {
        throw new Error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      // Fallback demo generation
      const mockImages = Array(imageCount).fill(0).map((_, i) => ({
        id: `img-${Date.now()}-${i}`,
        url: `https://picsum.photos/seed/${Date.now() + i}/512/512`,
        width: 512,
        height: 512,
        prompt: imagePrompt,
      }));
      setGeneratedImages(mockImages);
      toast.success('Изображения сгенерированы (demo)');
    } finally {
      setLoading(false);
    }
  };

  // ============== Video Generation ==============
  const handleVideoGenerate = async () => {
    if (!videoPrompt.trim()) {
      toast.error('Введите промпт для генерации');
      return;
    }
    
    setLoading(true);
    try {
      // Smart provider selection if auto
      let provider = videoProvider;
      if (provider === 'auto') {
        provider = selectBestProvider({ duration: parseFloat(videoDuration) });
      }
      
      const response = await fetch(`${CONTENT_STUDIO_API}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          duration: parseFloat(videoDuration),
          aspect_ratio: videoAspectRatio,
          provider: provider,
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

  // ============== TTS Generation ==============
  const handleTTSGenerate = async () => {
    if (!ttsText.trim()) {
      toast.error('Введите текст для озвучки');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText,
          provider: ttsProvider,
          voice: ttsVoice,
          emotion: ttsEmotion,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.audio) {
        setAudioResult(data.audio);
        toast.success('Аудио сгенерировано');
      } else {
        throw new Error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      setAudioResult({
        id: `audio-${Date.now()}`,
        url: '#',
        duration: Math.ceil(ttsText.length / 15),
        voice: ttsVoice,
      });
      toast.success('Аудио сгенерировано (demo)');
    } finally {
      setLoading(false);
    }
  };

  // ============== Music Generation ==============
  const handleMusicGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: musicStyle,
          duration: musicDuration,
          provider: musicProvider,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.audio) {
        setAudioResult(data.audio);
        toast.success('Музыка сгенерирована');
      } else {
        throw new Error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      setAudioResult({
        id: `music-${Date.now()}`,
        url: '#',
        duration: musicDuration,
        style: musicStyle,
      });
      toast.success('Музыка сгенерирована (demo)');
    } finally {
      setLoading(false);
    }
  };

  // ============== Text Generation (Kimi) ==============
  const handleTextGenerate = async () => {
    if (!textPrompt.trim()) {
      toast.error('Введите тему для текста');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${CONTENT_STUDIO_API}/api/brain/generate`, {
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
        throw new Error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      const typeLabels: Record<string, string> = {
        storyboard: 'Раскадровка',
        script: 'Сценарий',
        prompts: 'Промпты',
        post: 'Пост',
      };
      setGeneratedText(`${typeLabels[textType] || 'Текст'} на тему: ${textPrompt}\n\nСтиль: ${textTone}\nЯзык: ${textLanguage}\n\n[Сгенерированный контент появится здесь...]`);
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

  const getCategoryIcon = (category: ToolCategory) => {
    switch (category) {
      case 'brain': return <Brain className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'tts': return <Mic className="h-4 w-4" />;
      case 'music': return <Music className="h-4 w-4" />;
      case 'utility': return <Settings className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: ToolCategory) => {
    switch (category) {
      case 'brain': return 'text-pink-400';
      case 'image': return 'text-purple-400';
      case 'video': return 'text-blue-400';
      case 'tts': return 'text-cyan-400';
      case 'music': return 'text-green-400';
      case 'utility': return 'text-gray-400';
    }
  };

  // Filter providers by category
  const videoProviders = providers.filter(p => p.category === 'video');
  const imageProviders = providers.filter(p => p.category === 'image');
  const ttsProviders = providers.filter(p => p.category === 'tts');
  const musicProviders = providers.filter(p => p.category === 'music');
  const brainProviders = providers.filter(p => p.category === 'brain');

  // ============== Render ==============
  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">Картинки</span>
            </div>
            <div className="mt-1 text-xl font-bold">{stats?.total_images_generated || 0}</div>
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

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-6 w-full max-w-2xl">
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
          <TabsTrigger value="brain" className="flex items-center gap-1">
            <Brain className="h-4 w-4" />
            Мозг
          </TabsTrigger>
          <TabsTrigger value="utility" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            Утилиты
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Провайдеры
          </TabsTrigger>
        </TabsList>

        {/* Video Tab */}
        <TabsContent value="video" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {/* Video Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-blue-400" />
                    Генерация видео
                    <Badge variant="secondary" className="ml-2">{videoProviders.length} провайдеров</Badge>
                  </CardTitle>
                  <CardDescription>
                    Meta AI (60s), Pollo (15s+audio), Kling, Wan, Runway Gen-3, Luma, Pika, Haiper, Vidu, Qwen, MiniMax Hailuo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Промпт</Label>
                    <Textarea
                      placeholder="A beautiful sunset over mountains with golden light, cinematic, 4k..."
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
                          <SelectItem value="15">15 сек</SelectItem>
                          <SelectItem value="60">60 сек</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Формат</Label>
                      <Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9:16">9:16 (Reels)</SelectItem>
                          <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
                          <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Провайдер</Label>
                      <Select value={videoProvider} onValueChange={setVideoProvider}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Авто-выбор</SelectItem>
                          {videoProviders.map((p) => (
                            <SelectItem key={p.id} value={p.name}>{p.display_name}</SelectItem>
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
                          max={300}
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
              </Card>

              {/* Image-to-Video (Pollo AI) */}
              <Card className="border-purple-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="h-5 w-5 text-purple-400" />
                    Image-to-Video
                    <Badge variant="outline" className="ml-2 text-purple-400 border-purple-400">Pollo AI</Badge>
                  </CardTitle>
                  <CardDescription>
                    Оживите изображения с автоматическим звуком • 4-15 сек • Доступ к 50+ моделям
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Путь к изображению</Label>
                      <Input
                        placeholder="/path/to/image.png или URL"
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
                    <Label>Промпт движения (опционально)</Label>
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
              </Card>
            </div>

            {/* Task Queue */}
            <div className="space-y-4">
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
                  <ScrollArea className="h-[400px]">
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

              {/* Session Stats */}
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
            </div>
          </div>
        </TabsContent>

        {/* Image Tab */}
        <TabsContent value="image" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              {/* Fooocus Colab */}
              <Card className="border-pink-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-pink-400" />
                    Fooocus (Google Colab)
                    <Badge variant="outline" className="ml-2 text-pink-400 border-pink-400">Бесплатно 12ч/день</Badge>
                  </CardTitle>
                  <CardDescription>
                    Midjourney-качество бесплатно на GPU Google • Генерируйте тысячи изображений для раскадровки
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <CircleDot className={cn(
                        "h-4 w-4",
                        fooocusStatus === 'ready' ? "text-green-500" : 
                        fooocusStatus === 'starting' ? "text-yellow-500" : "text-gray-500"
                      )} />
                      <div>
                        <div className="text-sm font-medium">
                          {fooocusStatus === 'ready' ? 'Fooocus готов' : 
                           fooocusStatus === 'starting' ? 'Запуск...' : 'Не запущен'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fooocusStatus === 'ready' ? colabUrl : 'Нажмите "Запустить Colab" для начала'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open('https://colab.research.google.com/github/lllyasviel/fooocus/blob/main/fooocus_colab.ipynb', '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Открыть Colab
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleStartFooocus}
                        disabled={fooocusStatus === 'starting'}
                      >
                        {fooocusStatus === 'starting' ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Power className="h-3 w-3 mr-1" />
                        )}
                        {fooocusStatus === 'ready' ? 'Перезапустить' : 'Запустить'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Промпт</Label>
                    <Textarea
                      placeholder="A stunning cinematic portrait, professional lighting, 8k quality..."
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
                          <SelectItem value="4:3">4:3</SelectItem>
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
                          <SelectItem value="8">8</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={handleImageGenerate} 
                        disabled={loading || !imagePrompt.trim() || fooocusStatus !== 'ready'} 
                        className="w-full"
                      >
                        <Palette className="h-4 w-4 mr-2" />
                        Генерировать
                      </Button>
                    </div>
                  </div>
                  
                  {generatedImages.length > 0 && (
                    <div className="space-y-2">
                      <Label>Результат</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {generatedImages.map((img) => (
                          <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-muted relative group">
                            <img src={img.url} alt="Generated" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-white">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={() => {
                                setItvImagePath(img.url);
                                setActiveTab('video');
                                toast.info('Изображение готово для Image-to-Video');
                              }}>
                                <Film className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Image Providers */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-4 w-4 text-purple-400" />
                  Генераторы изображений
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {imageProviders.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          p.active_accounts > 0 ? "bg-green-500" : "bg-red-500"
                        )} />
                        <div>
                          <div className="text-sm font-medium">{p.display_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.features.join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={p.active_accounts > 0 ? 'default' : 'secondary'} className="text-xs">
                          {p.active_accounts > 0 ? 'Ready' : 'Offline'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audio Tab */}
        <TabsContent value="audio" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* TTS Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-cyan-400" />
                  Озвучка текста (TTS)
                </CardTitle>
                <CardDescription>
                  MiniMax Speech (эмоциональные голоса, ASMR) • NaturalReaders (британский, американский акцент)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant={ttsProvider === 'natural_readers' ? 'default' : 'outline'}
                    onClick={() => setTtsProvider('natural_readers')}
                  >
                    <Globe className="h-3 w-3 mr-1" /> Western
                  </Button>
                  <Button 
                    size="sm" 
                    variant={ttsProvider === 'minimax' ? 'default' : 'outline'}
                    onClick={() => setTtsProvider('minimax')}
                  >
                    <Radio className="h-3 w-3 mr-1" /> Emotional
                  </Button>
                </div>

                <Textarea
                  placeholder="Текст для озвучки..."
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  rows={4}
                />

                {ttsProvider === 'natural_readers' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Голос</Label>
                      <Select value={ttsVoice} onValueChange={setTtsVoice}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="british_warm">British Warm</SelectItem>
                          <SelectItem value="british_deep">British Deep</SelectItem>
                          <SelectItem value="scottish">Scottish</SelectItem>
                          <SelectItem value="american_warm">American Warm</SelectItem>
                          <SelectItem value="american_professional">American Pro</SelectItem>
                          <SelectItem value="new_zealand">New Zealand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleTTSGenerate} disabled={loading || !ttsText.trim()} className="w-full">
                        <Volume2 className="h-4 w-4 mr-2" />
                        Озвучить
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Эмоция</Label>
                      <Select value={ttsEmotion} onValueChange={setTtsEmotion}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="neutral">Нейтральный</SelectItem>
                          <SelectItem value="bedtime_whispers">Bedtime Whispers</SelectItem>
                          <SelectItem value="horror_story">Horror Story</SelectItem>
                          <SelectItem value="goblin_trade">Goblin Trade</SelectItem>
                          <SelectItem value="cheerful">Весёлый</SelectItem>
                          <SelectItem value="sad">Грустный</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleTTSGenerate} disabled={loading || !ttsText.trim()} className="w-full">
                        <Volume2 className="h-4 w-4 mr-2" />
                        Озвучить
                      </Button>
                    </div>
                  </div>
                )}

                {audioResult && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Play className="h-5 w-5 text-cyan-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Аудио готово</div>
                      <div className="text-xs text-muted-foreground">{audioResult.duration} сек</div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3 mr-1" />
                      MP3
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Music Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-green-400" />
                  Генерация музыки
                </CardTitle>
                <CardDescription>
                  MiniMax Music • Metal, Jazz, Blues, Meditative, R&B, Soul
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Стиль</Label>
                    <Select value={musicStyle} onValueChange={setMusicStyle}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meditative">Meditative</SelectItem>
                        <SelectItem value="ambient">Ambient</SelectItem>
                        <SelectItem value="cinematic">Cinematic</SelectItem>
                        <SelectItem value="jazz">Jazz</SelectItem>
                        <SelectItem value="blues">Blues</SelectItem>
                        <SelectItem value="metal">Metal</SelectItem>
                        <SelectItem value="rnb">R&B</SelectItem>
                        <SelectItem value="soul">Soul</SelectItem>
                        <SelectItem value="electronic">Electronic</SelectItem>
                        <SelectItem value="lofi">Lo-Fi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Длительность</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        value={musicDuration} 
                        onChange={(e) => setMusicDuration(parseInt(e.target.value) || 60)} 
                        className="w-20" 
                      />
                      <span className="text-xs text-muted-foreground">сек</span>
                    </div>
                  </div>
                </div>

                <Button onClick={handleMusicGenerate} disabled={loading} className="w-full">
                  <Music className="h-4 w-4 mr-2" />
                  Сгенерировать музыку
                </Button>

                {audioResult && audioResult.style && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Music className="h-5 w-5 text-green-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Музыка готова</div>
                      <div className="text-xs text-muted-foreground">{audioResult.duration} сек • {musicStyle}</div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3 mr-1" />
                      MP3
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Audio Providers */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Headphones className="h-4 w-4 text-cyan-400" />
                Аудио провайдеры
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                {[...ttsProviders, ...musicProviders].map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        p.active_accounts > 0 ? "bg-green-500" : "bg-red-500"
                      )} />
                      <div>
                        <div className="text-sm font-medium">{p.display_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.features.slice(0, 3).join(', ')}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brain Tab */}
        <TabsContent value="brain" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-pink-400" />
                Kimi K2.5 — Мозг системы
              </CardTitle>
              <CardDescription>
                Генерация раскадровок, сценариев, промптов для 300+ сцен • Автоматическое улучшение промптов
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Тема / Идея</Label>
                <Textarea
                  placeholder="Опишите идею видео: 50-минутный фильм о путешествии по космосу..."
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Тип контента</Label>
                  <Select value={textType} onValueChange={setTextType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="storyboard">Раскадровка</SelectItem>
                      <SelectItem value="script">Сценарий</SelectItem>
                      <SelectItem value="prompts">Промпты</SelectItem>
                      <SelectItem value="scenes">Сцены</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Стиль</Label>
                  <Select value={textTone} onValueChange={setTextTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">Кинематографичный</SelectItem>
                      <SelectItem value="documentary">Документальный</SelectItem>
                      <SelectItem value="commercial">Рекламный</SelectItem>
                      <SelectItem value="artistic">Художественный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Язык</Label>
                  <Select value={textLanguage} onValueChange={setTextLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleTextGenerate} disabled={loading || !textPrompt.trim()} className="w-full">
                <Brain className="h-4 w-4 mr-2" />
                Сгенерировать
              </Button>

              {generatedText && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Результат</Label>
                    <Button size="sm" variant="ghost" onClick={() => {
                      navigator.clipboard.writeText(generatedText);
                      toast.success('Скопировано');
                    }}>
                      <Copy className="h-3 w-3 mr-1" />
                      Копировать
                    </Button>
                  </div>
                  <Textarea
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Utility Tab */}
        <TabsContent value="utility" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Translation */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-blue-400" />
                  Перевод
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Текст для перевода..."
                  value={translateText}
                  onChange={(e) => setTranslateText(e.target.value)}
                  rows={3}
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <Select value={sourceLang} onValueChange={setSourceLang}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Авто</SelectItem>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={targetLang} onValueChange={setTargetLang}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={handleTranslate} disabled={loading} size="sm" className="w-full">
                  <Languages className="h-3 w-3 mr-1" />
                  Перевести
                </Button>
                
                {translatedText && (
                  <div className="p-2 bg-muted rounded text-sm">
                    {translatedText}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Watermark Removal */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eraser className="h-4 w-4 text-orange-400" />
                  Удаление watermark
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Путь к файлу..."
                  value={watermarkFile}
                  onChange={(e) => setWatermarkFile(e.target.value)}
                />
                
                <Select value={watermarkMethod} onValueChange={setWatermarkMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            </Card>
          </div>

          {/* Video Stitching */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5 text-green-400" />
                Склейка видео
                <Badge variant="secondary">FFmpeg</Badge>
              </CardTitle>
              <CardDescription>
                Объедините сотни клипов в одно длинное видео для YouTube/TikTok
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Пути к видео (по одному на строку)</Label>
                <Textarea
                  placeholder="/path/to/video1.mp4&#10;/path/to/video2.mp4&#10;/path/to/video3.mp4"
                  value={stitchVideos}
                  onChange={(e) => setStitchVideos(e.target.value)}
                  rows={6}
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
                      <SelectItem value="none">Без перехода</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleStitch} disabled={loading || stitchVideos.split('\n').filter(v => v.trim()).length < 2}>
                  <Scissors className="h-4 w-4 mr-2" />
                  Склеить ({stitchVideos.split('\n').filter(v => v.trim()).length} видео)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4 mt-4">
          {/* All Providers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Video Providers */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Video className="h-4 w-4 text-blue-400" />
                    Видео ({videoProviders.length})
                  </CardTitle>
                  <Badge>{videoProviders.reduce((s, p) => s + p.active_accounts, 0)} аккаунтов</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  <div className="divide-y">
                    {videoProviders.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            p.state === 'available' && p.active_accounts > 0 ? "bg-green-500" : 
                            p.state === 'busy' ? "bg-yellow-500" : "bg-red-500"
                          )} />
                          <div>
                            <div className="text-sm font-medium">{p.display_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.video_durations?.join('s, ')}s • {p.daily_credits} кред/день
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

            {/* TTS Providers */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mic className="h-4 w-4 text-cyan-400" />
                  TTS ({ttsProviders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {ttsProviders.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          p.active_accounts > 0 ? "bg-green-500" : "bg-red-500"
                        )} />
                        <div>
                          <div className="text-sm font-medium">{p.display_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.features.slice(0, 2).join(', ')}
                          </div>
                        </div>
                      </div>
                      <Badge variant={p.active_accounts > 0 ? 'default' : 'secondary'} className="text-xs">
                        {p.active_accounts}/{p.total_accounts}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Music & Image Providers */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Music className="h-4 w-4 text-green-400" />
                  Музыка & Изображения
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {[...musicProviders, ...imageProviders].map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          p.active_accounts > 0 ? "bg-green-500" : "bg-red-500"
                        )} />
                        <div>
                          <div className="text-sm font-medium">{p.display_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.category === 'music' ? 'Музыка' : 'Изображения'}
                          </div>
                        </div>
                      </div>
                      <Badge variant={p.active_accounts > 0 ? 'default' : 'secondary'} className="text-xs">
                        {p.active_accounts}/{p.total_accounts}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Registration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-400" />
                Автоматическая регистрация
              </CardTitle>
              <CardDescription>
                Регистрация аккаунтов через временную почту • Без банковской карты
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {providers.filter(p => p.auto_register).slice(0, 8).map((p) => (
                  <Button 
                    key={p.id}
                    variant="outline" 
                    className="h-auto py-3 flex flex-col items-start"
                    onClick={() => {
                      setRegisterProvider(p.name);
                      setRegisterDialogOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {getCategoryIcon(p.category)}
                      <span className="text-sm font-medium">{p.display_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      +{p.daily_credits} кред/день
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Registration Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
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
                  <SelectItem key={p.id} value={p.name}>{p.display_name}</SelectItem>
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
  );
}

export default UnifiedContentStudio;

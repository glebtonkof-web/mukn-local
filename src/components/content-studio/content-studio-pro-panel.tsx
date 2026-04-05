'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Type,
  Languages,
  Workflow,
  Sparkles,
  Loader2,
  Download,
  Copy,
  Trash2,
  Wand2,
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
} from 'lucide-react';

const API_URL = 'http://localhost:8767';

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
  status: string;
  duration: number;
  provider?: string;
  result_path?: string;
  error?: string;
  created_at: string;
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

export function ContentStudioProPanel() {
  // State
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // Generation state
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('10');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [provider, setProvider] = useState('auto');
  const [priority, setPriority] = useState('normal');
  
  // Batch generation
  const [batchPrompts, setBatchPrompts] = useState('');
  const [promptCount, setPromptCount] = useState(10);
  const [promptTheme, setPromptTheme] = useState('');
  
  // Stitch state
  const [stitchVideos, setStitchVideos] = useState('');
  const [transition, setTransition] = useState('fade');
  
  // Register dialog
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [registerProvider, setRegisterProvider] = useState('kling');
  const [registering, setRegistering] = useState(false);

  // Fetch data
  const fetchProviders = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/providers`);
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks?limit=20`);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats`);
      const data = await response.json();
      setStats(data);
      setIsRunning(true);
    } catch (error) {
      console.error('Error fetching stats:', error);
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
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchProviders, fetchTasks, fetchStats]);

  // Generate single
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          duration: parseFloat(duration),
          aspect_ratio: aspectRatio,
          provider: provider === 'auto' ? null : provider,
          priority,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPrompt('');
        fetchTasks();
      }
    } catch (error) {
      console.error('Error generating:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate batch
  const handleBatchGenerate = async () => {
    const prompts = batchPrompts.split('\n').filter(p => p.trim());
    if (prompts.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/generate/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts,
          duration: parseFloat(duration),
          aspect_ratio: aspectRatio,
          provider: provider === 'auto' ? null : provider,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBatchPrompts('');
        fetchTasks();
      }
    } catch (error) {
      console.error('Error batch generating:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate prompts
  const handleGeneratePrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/prompts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: promptCount,
          theme: promptTheme || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.prompts) {
        setBatchPrompts(data.prompts.join('\n'));
      }
    } catch (error) {
      console.error('Error generating prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Register account
  const handleRegister = async () => {
    setRegistering(true);
    try {
      const response = await fetch(`${API_URL}/api/accounts/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: registerProvider }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRegisterDialogOpen(false);
        fetchProviders();
      }
    } catch (error) {
      console.error('Error registering:', error);
    } finally {
      setRegistering(false);
    }
  };

  // Stitch videos
  const handleStitch = async () => {
    const videos = stitchVideos.split('\n').filter(v => v.trim());
    if (videos.length < 2) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/stitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_paths: videos,
          transition,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Video stitched: ${data.output_path}`);
      }
    } catch (error) {
      console.error('Error stitching:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Stats Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4" />
              Статус системы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Состояние</span>
              <Badge variant={isRunning ? 'default' : 'destructive'}>
                {isRunning ? 'Работает' : 'Остановлен'}
              </Badge>
            </div>
            
            {stats && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <span className="text-sm font-medium">{formatUptime(stats.uptime_seconds)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Воркеры</span>
                  <span className="text-sm font-medium">{stats.active_workers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">В очереди</span>
                  <Badge variant="outline">{stats.queue_size}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Статистика
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Задач</span>
                  <span className="text-sm font-medium">{stats.total_tasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Выполнено</span>
                  <span className="text-sm font-medium text-green-600">{stats.completed_tasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ошибок</span>
                  <span className="text-sm font-medium text-red-600">{stats.failed_tasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Видео</span>
                  <span className="text-sm font-medium">{stats.total_videos_generated}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Минут видео</span>
                  <span className="text-sm font-medium">{stats.total_video_minutes.toFixed(1)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Providers */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Провайдеры
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchProviders}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {providers.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <div>
                      <div className="text-sm font-medium">{p.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.active_accounts}/{p.total_accounts} аккаунтов
                      </div>
                    </div>
                    <Badge
                      variant={p.state === 'available' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {p.active_accounts > 0 ? `${p.active_accounts}` : '—'}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <Plus className="h-3 w-3 mr-2" />
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.name} value={p.name} disabled={!p.auto_register}>
                          {p.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button onClick={handleRegister} disabled={registering}>
                    {registering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Зарегистрировать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        <Tabs defaultValue="generate">
          <TabsList>
            <TabsTrigger value="generate">
              <Video className="h-4 w-4 mr-2" />
              Генерация
            </TabsTrigger>
            <TabsTrigger value="batch">
              <Workflow className="h-4 w-4 mr-2" />
              Пакетная
            </TabsTrigger>
            <TabsTrigger value="stitch">
              <Film className="h-4 w-4 mr-2" />
              Склейка
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <Clock className="h-4 w-4 mr-2" />
              Задачи
            </TabsTrigger>
          </TabsList>

          {/* Single Generation */}
          <TabsContent value="generate">
            <Card>
              <CardHeader>
                <CardTitle>Генерация видео</CardTitle>
                <CardDescription>
                  Бесплатная генерация через 10+ провайдеров с авто-ротацией аккаунтов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Промпт</Label>
                  <Textarea
                    placeholder="A beautiful sunset over mountains with golden light..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Длительность</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 сек</SelectItem>
                        <SelectItem value="10">10 сек</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Формат</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9:16">9:16</SelectItem>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Провайдер</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Авто-выбор</SelectItem>
                        {providers.map((p) => (
                          <SelectItem key={p.name} value={p.name}>{p.display_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Приоритет</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Низкий</SelectItem>
                        <SelectItem value="normal">Обычный</SelectItem>
                        <SelectItem value="high">Высокий</SelectItem>
                        <SelectItem value="urgent">Срочный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Сгенерировать видео
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Batch Generation */}
          <TabsContent value="batch">
            <Card>
              <CardHeader>
                <CardTitle>Пакетная генерация</CardTitle>
                <CardDescription>
                  Генерация множества видео из списка промптов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Количество промптов</Label>
                    <Input
                      type="number"
                      value={promptCount}
                      onChange={(e) => setPromptCount(parseInt(e.target.value) || 10)}
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Тема (опционально)</Label>
                    <Select value={promptTheme} onValueChange={setPromptTheme}>
                      <SelectTrigger><SelectValue placeholder="Выберите тему" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Без темы</SelectItem>
                        <SelectItem value="nature_journey">Природа</SelectItem>
                        <SelectItem value="city_nights">Город</SelectItem>
                        <SelectItem value="fantasy_adventure">Фэнтези</SelectItem>
                        <SelectItem value="sci_fi_space">Космос</SelectItem>
                        <SelectItem value="romantic">Романтика</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleGeneratePrompts} disabled={loading}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Генерировать
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Промпты (по одному на строку)</Label>
                  <Textarea
                    placeholder="A cat playing with a ball...&#10;Beautiful sunset over ocean...&#10;City lights at night..."
                    value={batchPrompts}
                    onChange={(e) => setBatchPrompts(e.target.value)}
                    rows={10}
                  />
                </div>
                
                <Button
                  onClick={handleBatchGenerate}
                  disabled={loading || !batchPrompts.trim()}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Workflow className="h-4 w-4 mr-2" />
                  )}
                  Запустить пакетную генерацию
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Stitching */}
          <TabsContent value="stitch">
            <Card>
              <CardHeader>
                <CardTitle>Склейка видео</CardTitle>
                <CardDescription>
                  Объединение коротких видео в одно длинное
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
                
                <div className="space-y-2">
                  <Label>Переход</Label>
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
                
                <Button
                  onClick={handleStitch}
                  disabled={loading || stitchVideos.split('\n').filter(v => v.trim()).length < 2}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Film className="h-4 w-4 mr-2" />
                  )}
                  Склеить видео
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Queue */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Очередь задач</CardTitle>
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
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{task.prompt}</div>
                            <div className="text-xs text-muted-foreground">
                              {task.provider || 'auto'} • {task.duration}s
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {task.status}
                          </Badge>
                          {task.result_path && (
                            <Button variant="ghost" size="sm">
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
    </div>
  );
}

export default ContentStudioProPanel;

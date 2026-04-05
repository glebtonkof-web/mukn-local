'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Video, 
  Play, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader2,
  Film,
  Sparkles
} from 'lucide-react';

interface ProviderStatus {
  name: string;
  state: string;
  available: boolean;
  credits_remaining: number;
  requests_today: number;
  requests_this_hour: number;
}

interface GenerationStatus {
  status: string;
  healthy: boolean;
  providers: Record<string, ProviderStatus>;
  queue: {
    total_tasks: number;
    completed: number;
    failed: number;
  };
}

export function FreeVideoGenPanel() {
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Short video form
  const [shortPrompt, setShortPrompt] = useState('');
  const [shortDuration, setShortDuration] = useState('10');
  const [shortProvider, setShortProvider] = useState('auto');
  const [shortStyle, setShortStyle] = useState('cinematic');
  
  // Long video form
  const [longPrompt, setLongPrompt] = useState('');
  const [longDuration, setLongDuration] = useState('60');
  const [longStyle, setLongStyle] = useState('cinematic');
  const [voiceover, setVoiceover] = useState(false);
  const [musicStyle, setMusicStyle] = useState('ambient');
  
  // Task tracking
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<any>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/video-gen/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const generateShortVideo = async () => {
    if (!shortPrompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/video-gen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: shortPrompt,
          duration: parseFloat(shortDuration),
          ratio: '9:16',
          provider: shortProvider === 'auto' ? null : shortProvider,
          style: shortStyle,
        }),
      });
      
      const data = await response.json();
      setTaskId(data.task_id);
      
      // Poll for status
      pollTaskStatus(data.task_id);
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateLongVideo = async () => {
    if (!longPrompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/video-gen/generate/long', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: longPrompt,
          target_duration: parseFloat(longDuration),
          ratio: '9:16',
          style: longStyle,
          voiceover,
          music_style: musicStyle,
        }),
      });
      
      const data = await response.json();
      setTaskId(data.task_id);
      
      // Poll for status
      pollTaskStatus(data.task_id);
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollTaskStatus = async (id: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/video-gen/task/${id}`);
        const data = await response.json();
        setTaskStatus(data);
        
        if (data.status === 'pending' || data.status === 'running') {
          setTimeout(poll, 3000);
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };
    
    poll();
  };

  const getProviderBadge = (provider: ProviderStatus) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      available: 'default',
      rate_limited: 'secondary',
      error: 'destructive',
      unknown: 'outline',
    };
    
    return (
      <Badge variant={variants[provider.state] || 'outline'} key={provider.name}>
        {provider.name}: {provider.credits_remaining} credits
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Free Video Generator
              </CardTitle>
              <CardDescription>
                Генерация видео через Kling AI, Luma, Runway (бесплатно)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {status ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {status.healthy ? (
                  <Badge className="bg-green-500">Система работает</Badge>
                ) : (
                  <Badge variant="destructive">Нет доступных провайдеров</Badge>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {Object.values(status.providers || {}).map((provider) => (
                  getProviderBadge(provider)
                ))}
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">В очереди:</span>
                  <span className="ml-2 font-medium">{status.queue?.total_tasks || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Готово:</span>
                  <span className="ml-2 font-medium text-green-500">{status.queue?.completed || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ошибок:</span>
                  <span className="ml-2 font-medium text-red-500">{status.queue?.failed || 0}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Загрузка статуса...</div>
          )}
        </CardContent>
      </Card>

      {/* Generation Tabs */}
      <Tabs defaultValue="short">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="short">
            <Play className="h-4 w-4 mr-2" />
            Короткое видео
          </TabsTrigger>
          <TabsTrigger value="long">
            <Film className="h-4 w-4 mr-2" />
            Длинное видео
          </TabsTrigger>
        </TabsList>

        {/* Short Video Tab */}
        <TabsContent value="short">
          <Card>
            <CardHeader>
              <CardTitle>Короткое видео (5-10 сек)</CardTitle>
              <CardDescription>
                Быстрая генерация одного клипа
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Описание видео</Label>
                <Textarea
                  placeholder="A cat playing with a ball in a sunny garden, cinematic, slow motion..."
                  value={shortPrompt}
                  onChange={(e) => setShortPrompt(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Длительность</Label>
                  <Select value={shortDuration} onValueChange={setShortDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 сек</SelectItem>
                      <SelectItem value="10">10 сек</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Провайдер</Label>
                  <Select value={shortProvider} onValueChange={setShortProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Авто</SelectItem>
                      <SelectItem value="kling">Kling AI</SelectItem>
                      <SelectItem value="luma">Luma</SelectItem>
                      <SelectItem value="runway">Runway</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Стиль</Label>
                  <Select value={shortStyle} onValueChange={setShortStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">Кинематографичный</SelectItem>
                      <SelectItem value="anime">Аниме</SelectItem>
                      <SelectItem value="realistic">Реалистичный</SelectItem>
                      <SelectItem value="3d">3D</SelectItem>
                      <SelectItem value="vintage">Винтаж</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={generateShortVideo} 
                disabled={loading || !shortPrompt.trim()}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Сгенерировать
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Long Video Tab */}
        <TabsContent value="long">
          <Card>
            <CardHeader>
              <CardTitle>Длинное видео (30-180 сек)</CardTitle>
              <CardDescription>
                Сценарий разбивается на сцены, которые склеиваются в одно видео
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Сценарий видео</Label>
                <Textarea
                  placeholder="Путешествие по Токио: утро в Сибуе, людный перекресток, неоновые вывески. Затем поезд мимо горы Фудзи, сакура за окном. Закат в парке..."
                  value={longPrompt}
                  onChange={(e) => setLongPrompt(e.target.value)}
                  rows={5}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Длительность (сек)</Label>
                  <Select value={longDuration} onValueChange={setLongDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 сек</SelectItem>
                      <SelectItem value="60">1 минута</SelectItem>
                      <SelectItem value="90">1.5 минуты</SelectItem>
                      <SelectItem value="120">2 минуты</SelectItem>
                      <SelectItem value="180">3 минуты</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Стиль</Label>
                  <Select value={longStyle} onValueChange={setLongStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">Кинематографичный</SelectItem>
                      <SelectItem value="anime">Аниме</SelectItem>
                      <SelectItem value="realistic">Реалистичный</SelectItem>
                      <SelectItem value="dark">Мрачный</SelectItem>
                      <SelectItem value="bright">Яркий</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={voiceover}
                    onCheckedChange={setVoiceover}
                  />
                  <Label>Озвучка</Label>
                </div>
                
                {voiceover && (
                  <div className="space-y-2 flex-1">
                    <Select value={musicStyle} onValueChange={setMusicStyle}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ambient">Эмбиент</SelectItem>
                        <SelectItem value="chill">Чилл</SelectItem>
                        <SelectItem value="cinematic">Кино</SelectItem>
                        <SelectItem value="upbeat">Энергичный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={generateLongVideo} 
                disabled={loading || !longPrompt.trim()}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Film className="h-4 w-4 mr-2" />
                )}
                Сгенерировать длинное видео
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Status */}
      {taskStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {taskStatus.status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : taskStatus.status === 'failed' ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
              Статус задачи
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge>{taskStatus.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  ID: {taskStatus.id}
                </span>
              </div>
              
              {taskStatus.progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Прогресс</span>
                    <span>{taskStatus.progress.completed}/{taskStatus.progress.total}</span>
                  </div>
                  <Progress 
                    value={(taskStatus.progress.completed / taskStatus.progress.total) * 100} 
                  />
                </div>
              )}
              
              {taskStatus.output_path && (
                <Button asChild>
                  <a href={taskStatus.output_path} download>
                    <Download className="h-4 w-4 mr-2" />
                    Скачать видео
                  </a>
                </Button>
              )}
              
              {taskStatus.error && (
                <div className="text-red-500 text-sm">
                  Ошибка: {taskStatus.error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default FreeVideoGenPanel;

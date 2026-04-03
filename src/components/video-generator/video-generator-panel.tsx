'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Video,
  Upload,
  Play,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  FileJson,
  Sparkles,
  Film,
  Youtube,
  Instagram,
} from 'lucide-react';
import { toast } from 'sonner';

interface VideoScript {
  id: string;
  title: string;
  orientation: 'portrait' | 'landscape' | 'square';
  voice: string;
  script: string;
  tags?: string[];
  hashtags?: string[];
  description?: string;
}

interface GenerationProgress {
  stage: 'parsing' | 'tts' | 'visual' | 'assembly' | 'publishing' | 'complete' | 'error';
  progress: number;
  message: string;
  currentScene?: number;
  totalScenes?: number;
  outputPath?: string;
  error?: string;
}

interface Dependencies {
  ffmpeg: boolean;
  edgeTTS: boolean;
  pexels: boolean;
}

const STAGES = {
  parsing: { label: 'Парсинг', icon: FileJson },
  tts: { label: 'Озвучка', icon: Sparkles },
  visual: { label: 'Видео', icon: Film },
  assembly: { label: 'Сборка', icon: Video },
  publishing: { label: 'Публикация', icon: Upload },
  complete: { label: 'Готово', icon: CheckCircle },
  error: { label: 'Ошибка', icon: XCircle },
};

const VOICES = [
  { id: 'ru-RU-SvetlanaNeural', name: 'Светлана (RU)', gender: 'female' },
  { id: 'ru-RU-DmitryNeural', name: 'Дмитрий (RU)', gender: 'male' },
  { id: 'en-US-JennyNeural', name: 'Jenny (EN)', gender: 'female' },
  { id: 'en-US-GuyNeural', name: 'Guy (EN)', gender: 'male' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (EN-GB)', gender: 'female' },
];

const SAMPLE_SCRIPT: VideoScript = {
  id: 'sample-1',
  title: 'Как заработать на крипте в 2026?',
  orientation: 'portrait',
  voice: 'ru-RU-SvetlanaNeural',
  script: `[Visual: bitcoin chart] Привет, друзья! Сегодня разберём топ-3 монеты на 2026 год.

[Visual: solana logo] Первая — Solana. Рост 200% за последний месяц!

[Visual: ethereum logo] Вторая — Ethereum. Обновление сети сделало транзакции быстрее.

[Visual: subscribe button] Подписывайся на канал — там больше секретов!`,
  hashtags: ['#крипта', '#инвестиции', '#биткоин'],
};

export function VideoGeneratorPanel() {
  const [script, setScript] = useState<VideoScript>(SAMPLE_SCRIPT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<Dependencies | null>(null);
  const [publishPlatforms, setPublishPlatforms] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Проверка зависимостей
  const checkDependencies = useCallback(async () => {
    try {
      const response = await fetch('/api/video-generator/generate');
      const data = await response.json();
      setDependencies(data.dependencies);
    } catch (error) {
      console.error('Failed to check dependencies:', error);
    }
  }, []);

  // Загрузка JSON файла
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Если массив, берём первый элемент
        const scriptData = Array.isArray(parsed) ? parsed[0] : parsed;
        setScript(scriptData);
        toast.success('Сценарий загружен');
      } catch {
        toast.error('Ошибка парсинга JSON');
      }
    };
    reader.readAsText(file);
  }, []);

  // Генерация видео
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setProgress(null);
    setOutputPath(null);

    try {
      const response = await fetch('/api/video-generator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          publish: publishPlatforms.length > 0,
          platforms: publishPlatforms,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOutputPath(data.outputPath);
        setProgress({ stage: 'complete', progress: 100, message: 'Видео готово!' });
        toast.success('Видео успешно создано!');
      } else {
        setProgress({ stage: 'error', progress: 0, message: data.error || 'Ошибка генерации' });
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setProgress({ stage: 'error', progress: 0, message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [script, publishPlatforms]);

  // Скачивание видео
  const handleDownload = useCallback(() => {
    if (!outputPath) return;
    
    // Создаём ссылку для скачивания
    const link = document.createElement('a');
    link.href = `/api/video-generator/download?path=${encodeURIComponent(outputPath)}`;
    link.download = script.title + '.mp4';
    link.click();
  }, [outputPath, script.title]);

  return (
    <div className="space-y-6 p-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Video className="w-6 h-6 text-[#6C63FF]" />
            Генератор видео
          </h2>
          <p className="text-[#8A8A8A] text-sm mt-1">
            Автоматическое создание видео из текстовых сценариев
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkDependencies}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            Проверить систему
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Загрузить JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Статус зависимостей */}
      {dependencies && (
        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant={dependencies.ffmpeg ? 'default' : 'destructive'} className={dependencies.ffmpeg ? 'bg-[#00D26A]' : ''}>
                FFmpeg {dependencies.ffmpeg ? '✓' : '✗'}
              </Badge>
              <Badge variant={dependencies.edgeTTS ? 'default' : 'outline'} className={dependencies.edgeTTS ? 'bg-[#00D26A]' : ''}>
                Edge-TTS {dependencies.edgeTTS ? '✓' : '✗'}
              </Badge>
              <Badge variant={dependencies.pexels ? 'default' : 'outline'} className={dependencies.pexels ? 'bg-[#6C63FF]' : ''}>
                Pexels API {dependencies.pexels ? '✓' : '—'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Форма сценария */}
        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white text-lg">Сценарий</CardTitle>
            <CardDescription className="text-[#8A8A8A]">
              Используйте [Visual: описание] для указания визуального ряда
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Название */}
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Название видео</Label>
              <Input
                value={script.title}
                onChange={(e) => setScript({ ...script, title: e.target.value })}
                placeholder="Название видео"
                className="bg-[#14151A] border-[#2A2B32] text-white"
              />
            </div>

            {/* Ориентация и голос */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Ориентация</Label>
                <Select
                  value={script.orientation}
                  onValueChange={(v) => setScript({ ...script, orientation: v as 'portrait' | 'landscape' | 'square' })}
                >
                  <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectItem value="portrait" className="text-white">Вертикальное (9:16)</SelectItem>
                    <SelectItem value="landscape" className="text-white">Горизонтальное (16:9)</SelectItem>
                    <SelectItem value="square" className="text-white">Квадрат (1:1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Голос</Label>
                <Select
                  value={script.voice}
                  onValueChange={(v) => setScript({ ...script, voice: v })}
                >
                  <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id} className="text-white">
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Текст сценария */}
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Текст сценария</Label>
              <Textarea
                value={script.script}
                onChange={(e) => setScript({ ...script, script: e.target.value })}
                placeholder="[Visual: описание] Текст сцены..."
                className="bg-[#14151A] border-[#2A2B32] text-white min-h-[200px] font-mono text-sm"
              />
            </div>

            {/* Хештеги */}
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Хештеги (через запятую)</Label>
              <Input
                value={script.hashtags?.join(', ') || ''}
                onChange={(e) => setScript({ ...script, hashtags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                placeholder="#крипта, #инвестиции"
                className="bg-[#14151A] border-[#2A2B32] text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Настройки и прогресс */}
        <div className="space-y-4">
          {/* Публикация */}
          <Card className="bg-[#1E1F26] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white text-lg">Публикация</CardTitle>
              <CardDescription className="text-[#8A8A8A]">
                Выберите платформы для публикации
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={publishPlatforms.includes('tiktok') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPublishPlatforms(prev =>
                      prev.includes('tiktok')
                        ? prev.filter(p => p !== 'tiktok')
                        : [...prev, 'tiktok']
                    );
                  }}
                  className={publishPlatforms.includes('tiktok') ? 'bg-[#000]' : 'border-[#2A2B32]'}
                >
                  TikTok
                </Button>
                <Button
                  variant={publishPlatforms.includes('instagram') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPublishPlatforms(prev =>
                      prev.includes('instagram')
                        ? prev.filter(p => p !== 'instagram')
                        : [...prev, 'instagram']
                    );
                  }}
                  className={publishPlatforms.includes('instagram') ? 'bg-[#E4405F]' : 'border-[#2A2B32]'}
                >
                  <Instagram className="w-4 h-4 mr-1" />
                  Instagram
                </Button>
                <Button
                  variant={publishPlatforms.includes('youtube') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPublishPlatforms(prev =>
                      prev.includes('youtube')
                        ? prev.filter(p => p !== 'youtube')
                        : [...prev, 'youtube']
                    );
                  }}
                  className={publishPlatforms.includes('youtube') ? 'bg-[#FF0000]' : 'border-[#2A2B32]'}
                >
                  <Youtube className="w-4 h-4 mr-1" />
                  YouTube
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Прогресс */}
          {progress && (
            <Card className="bg-[#1E1F26] border-[#2A2B32]">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {progress.stage === 'complete' ? (
                      <CheckCircle className="w-5 h-5 text-[#00D26A]" />
                    ) : progress.stage === 'error' ? (
                      <XCircle className="w-5 h-5 text-[#FF4D4D]" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-[#6C63FF] animate-spin" />
                    )}
                    <span className="text-white font-medium">
                      {STAGES[progress.stage]?.label || progress.stage}
                    </span>
                  </div>
                  <span className="text-[#8A8A8A] text-sm">{progress.progress}%</span>
                </div>

                <Progress value={progress.progress} className="h-2" />

                <p className="text-[#8A8A8A] text-sm">{progress.message}</p>

                {progress.error && (
                  <div className="p-2 bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 rounded text-[#FF4D4D] text-sm">
                    {progress.error}
                  </div>
                )}

                {progress.currentScene && progress.totalScenes && (
                  <p className="text-[#8A8A8A] text-xs">
                    Сцена {progress.currentScene} из {progress.totalScenes}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Кнопки действий */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !script.script}
              className="flex-1 bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isGenerating ? 'Генерация...' : 'Сгенерировать видео'}
            </Button>

            {outputPath && (
              <Button
                variant="outline"
                onClick={handleDownload}
                className="border-[#00D26A] text-[#00D26A] hover:bg-[#00D26A]/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Скачать
              </Button>
            )}
          </div>

          {/* Результат */}
          {outputPath && (
            <Card className="bg-[#00D26A]/10 border-[#00D26A]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-[#00D26A]" />
                  <div>
                    <p className="text-white font-medium">Видео создано!</p>
                    <p className="text-[#8A8A8A] text-sm">{outputPath}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

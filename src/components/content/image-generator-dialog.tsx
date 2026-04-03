'use client';

import { useState, useCallback } from 'react';
import { useAppStore, Influencer } from '@/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Image as ImageIcon,
  Sparkles,
  Wand2,
  Download,
  Save,
  RefreshCw,
  Copy,
  Check,
  ZoomIn,
  X,
  Loader2,
  Palette,
  User,
  Layout,
  Settings2,
  Bookmark,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Image size options
const imageSizeOptions = [
  { value: '1024x1024', label: 'Квадрат (1024x1024)', icon: '◻️' },
  { value: '768x1344', label: 'Портрет (768x1344)', icon: '📱' },
  { value: '864x1152', label: 'Портрет 4:5 (864x1152)', icon: '📸' },
  { value: '1344x768', label: 'Ландшафт (1344x768)', icon: '🖼️' },
  { value: '1152x864', label: 'Ландшафт 5:4 (1152x864)', icon: '🌄' },
  { value: '1440x720', label: 'Широкий (1440x720)', icon: '🎭' },
  { value: '720x1440', label: 'Узкий (720x1440)', icon: '📜' },
];

// Style presets
const stylePresets = [
  { id: 'realistic', name: 'Реалистичный', description: 'Фотореалистичные изображения', prompt: 'photorealistic, highly detailed, professional photography' },
  { id: 'portrait', name: 'Портрет', description: 'Красивые портретные снимки', prompt: 'portrait photography, professional lighting, bokeh background' },
  { id: 'lifestyle', name: 'Лайфстайл', description: 'Жизненные моменты', prompt: 'lifestyle photography, natural lighting, candid shot' },
  { id: 'fashion', name: 'Мода', description: 'Модные образы', prompt: 'fashion photography, editorial style, high fashion' },
  { id: 'fitness', name: 'Фитнес', description: 'Спортивные кадры', prompt: 'fitness photography, athletic, gym lighting' },
  { id: 'travel', name: 'Путешествия', description: 'Путешествия и места', prompt: 'travel photography, scenic, wanderlust' },
  { id: 'cozy', name: 'Уютный', description: 'Тёплая атмосфера', prompt: 'cozy atmosphere, warm lighting, comfortable setting' },
  { id: 'crypto', name: 'Крипто', description: 'Для крипто-контента', prompt: 'cryptocurrency theme, tech aesthetic, modern design' },
  { id: 'casino', name: 'Казино', description: 'Азартные игры', prompt: 'casino aesthetic, luxury, gold accents' },
  { id: 'artistic', name: 'Художественный', description: 'Творческий стиль', prompt: 'artistic, creative, unique composition' },
];

// Demo generated images (placeholder)
const demoGeneratedImages = [
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIGZpbGw9IiMxRTFGMjYiLz48dGV4dCB4PSI1MTIiIHk9IjUxMiIgZmlsbD0iIzhBOEE4QSIgZm9udC1zaXplPSI0OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgMTwvdGV4dD48L3N2Zz4=',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIGZpbGw9IiMyQTJCMzIiLz48dGV4dCB4PSI1MTIiIHk9IjUxMiIgZmlsbD0iIzhBOEE4QSIgZm9udC1zaXplPSI0OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgMjwvdGV4dD48L3N2Zz4=',
];

// Props
interface ImageGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  influencers: Influencer[];
  onImageGenerated?: (imageData: string, metadata: { prompt: string; size: string; style: string }) => void;
  onUseInPost?: (imageData: string) => void;
}

export function ImageGeneratorDialog({
  open,
  onOpenChange,
  influencers,
  onImageGenerated,
  onUseInPost,
}: ImageGeneratorDialogProps) {
  // State
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [style, setStyle] = useState('realistic');
  const [influencerId, setInfluencerId] = useState<string>('none');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [gallery, setGallery] = useState<{ image: string; prompt: string; date: Date }[]>([]);

  // Get selected influencer
  const selectedInfluencer = influencerId === 'none' ? null : influencers.find(i => i.id === influencerId);

  // Generate image
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Введите описание изображения');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    setIsSaved(false);

    // Build full prompt with style
    const stylePreset = stylePresets.find(s => s.id === style);
    let fullPrompt = prompt;
    if (stylePreset) {
      fullPrompt = `${prompt}, ${stylePreset.prompt}`;
    }
    if (selectedInfluencer) {
      fullPrompt = `${fullPrompt}, in the style of ${selectedInfluencer.style}`;
    }

    try {
      // Call API to generate image
      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          size,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      
      if (data.image) {
        setGeneratedImage(data.image);
        if (onImageGenerated) {
          onImageGenerated(data.image, { prompt: fullPrompt, size, style });
        }
        toast.success('Изображение сгенерировано');
      } else {
        // Fallback to demo
        const demoImage = demoGeneratedImages[Math.floor(Math.random() * demoGeneratedImages.length)];
        setGeneratedImage(demoImage);
        toast.success('Изображение сгенерировано (демо)');
      }
    } catch {
      // Use demo image on error
      const demoImage = demoGeneratedImages[Math.floor(Math.random() * demoGeneratedImages.length)];
      setGeneratedImage(demoImage);
      toast.info('Использовано демо-изображение');
    }

    setIsGenerating(false);
  };

  // Save to gallery
  const handleSaveToGallery = () => {
    if (!generatedImage) return;

    setGallery([{ image: generatedImage, prompt, date: new Date() }, ...gallery]);
    setIsSaved(true);
    toast.success('Изображение сохранено в галерею');
  };

  // Use in post
  const handleUseInPost = () => {
    if (!generatedImage) return;

    if (onUseInPost) {
      onUseInPost(generatedImage);
    }
    onOpenChange(false);
    toast.success('Изображение добавлено к посту');
  };

  // Download image
  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Изображение скачано');
  };

  // Copy prompt
  const handleCopyPrompt = () => {
    const stylePreset = stylePresets.find(s => s.id === style);
    let fullPrompt = prompt;
    if (stylePreset) {
      fullPrompt = `${prompt}, ${stylePreset.prompt}`;
    }
    navigator.clipboard.writeText(fullPrompt);
    toast.success('Промпт скопирован');
  };

  // Clear form
  const handleClear = () => {
    setPrompt('');
    setNegativePrompt('');
    setGeneratedImage(null);
    setIsSaved(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#14151A] border-[#2A2B32] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[#6C63FF]" />
            AI Генератор изображений
          </DialogTitle>
          <DialogDescription className="text-[#8A8A8A]">
            Создайте уникальные изображения с помощью искусственного интеллекта
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Left Panel - Input */}
          <div className="space-y-4">
            {/* Influencer Selector */}
            <div className="space-y-2">
              <Label className="text-[#8A8A8A] flex items-center gap-2">
                <User className="w-4 h-4" />
                Инфлюенсер (для контекста стиля)
              </Label>
              <Select value={influencerId} onValueChange={setInfluencerId}>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                  <SelectValue placeholder="Выберите инфлюенсера (опционально)" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectItem value="none" className="text-white">Без инфлюенсера</SelectItem>
                  {influencers.map((inf) => (
                    <SelectItem key={inf.id} value={inf.id} className="text-white">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={inf.avatarUrl} />
                          <AvatarFallback className="bg-[#6C63FF] text-white text-xs">
                            {inf.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {inf.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInfluencer && (
                <p className="text-xs text-[#8A8A8A]">
                  Стиль: {selectedInfluencer.style}
                </p>
              )}
            </div>

            {/* Main Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[#8A8A8A] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Описание изображения *
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  className="text-[#8A8A8A] hover:text-white"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Копировать
                </Button>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите, что вы хотите видеть на изображении..."
                rows={4}
                className="bg-[#1E1F26] border-[#2A2B32] text-white resize-none"
              />
            </div>

            {/* Negative Prompt */}
            <div className="space-y-2">
              <Label className="text-[#8A8A8A] text-sm">Негативный промпт (что исключить)</Label>
              <Textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Что не должно быть на изображении..."
                rows={2}
                className="bg-[#1E1F26] border-[#2A2B32] text-white resize-none text-sm"
              />
            </div>

            {/* Size & Style Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Size Selector */}
              <div className="space-y-2">
                <Label className="text-[#8A8A8A] flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  Размер
                </Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {imageSizeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-white">
                        <span className="mr-2">{opt.icon}</span>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Style Selector */}
              <div className="space-y-2">
                <Label className="text-[#8A8A8A] flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Стиль
                </Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {stylePresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id} className="text-white">
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Style Description */}
            {(() => {
              const preset = stylePresets.find(s => s.id === style);
              return preset ? (
                <div className="p-3 bg-[#1E1F26] rounded-lg">
                  <p className="text-sm text-white font-medium">{preset.name}</p>
                  <p className="text-xs text-[#8A8A8A] mt-1">{preset.description}</p>
                  <p className="text-xs text-[#6C63FF] mt-1 font-mono">{preset.prompt}</p>
                </div>
              ) : null;
            })()}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 bg-[#6C63FF] hover:bg-[#6C63FF]/80"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Сгенерировать
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="space-y-4">
            <Label className="text-[#8A8A8A] flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Результат
            </Label>

            {/* Image Preview */}
            <div className="aspect-square rounded-lg border-2 border-dashed border-[#2A2B32] bg-[#1E1F26] flex items-center justify-center overflow-hidden">
              {isGenerating ? (
                <div className="text-center">
                  <Loader2 className="w-12 h-12 mx-auto text-[#6C63FF] animate-spin mb-4" />
                  <p className="text-[#8A8A8A]">Создаём изображение...</p>
                  <p className="text-xs text-[#8A8A8A] mt-2">Это может занять до 30 секунд</p>
                </div>
              ) : generatedImage ? (
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-8">
                  <ImageIcon className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
                  <p className="text-[#8A8A8A]">Здесь появится сгенерированное изображение</p>
                </div>
              )}
            </div>

            {/* Image Actions */}
            {generatedImage && (
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveToGallery}
                  disabled={isSaved}
                  className={cn(
                    'border-[#2A2B32]',
                    isSaved
                      ? 'bg-[#00D26A]/10 border-[#00D26A] text-[#00D26A]'
                      : 'text-[#8A8A8A] hover:text-white'
                  )}
                >
                  {isSaved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Сохранено
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 mr-2" />
                      Сохранить
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleUseInPost}
                  className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  В пост
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Скачать
                </Button>
              </div>
            )}

            {/* Recent Gallery */}
            {gallery.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[#8A8A8A] text-sm">Недавние</Label>
                <ScrollArea className="h-[100px]">
                  <div className="flex gap-2">
                    {gallery.map((item, i) => (
                      <div
                        key={i}
                        className="w-20 h-20 rounded-lg overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-[#6C63FF] transition-all"
                        onClick={() => setGeneratedImage(item.image)}
                      >
                        <img src={item.image} alt="Gallery" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageGeneratorDialog;

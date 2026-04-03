'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Image as ImageIcon,
  Sparkles,
  Link,
  Clock,
  Eye,
  MousePointer,
  Share2,
  Send,
  Trash2,
  Calendar,
  Wand2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface OFMStory {
  id: string;
  profileId: string;
  profileName: string;
  profileAvatar?: string;
  text: string;
  imageUrl?: string;
  linkUrl?: string;
  linkButtonText?: string;
  status: 'draft' | 'published' | 'expired';
  expirationHours: number;
  metrics: {
    views: number;
    clicks: number;
    forwards: number;
  };
  createdAt: Date;
  publishedAt?: Date;
  expiresAt?: Date;
}

// Mock profiles for dropdown
const mockProfiles = [
  { id: '1', name: 'Анна Секрет', avatar: '' },
  { id: '2', name: 'Макс Крипто', avatar: '' },
  { id: '3', name: 'Лена Бизнес', avatar: '' },
];

// Mock stories data
const mockStories: OFMStory[] = [
  {
    id: '1',
    profileId: '1',
    profileName: 'Анна Секрет',
    text: 'Новый секрет отношений, который изменил мою жизнь... 👀',
    imageUrl: '/story1.jpg',
    linkUrl: 'https://t.me/secret_channel',
    linkButtonText: 'Узнать секрет',
    status: 'published',
    expirationHours: 24,
    metrics: { views: 1234, clicks: 156, forwards: 45 },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000),
  },
  {
    id: '2',
    profileId: '2',
    profileName: 'Макс Крипто',
    text: '🚀 Токен, который взорвёт рынок! Связка внутри...',
    imageUrl: '/story2.jpg',
    linkUrl: 'https://t.me/crypto_signals',
    linkButtonText: 'Сигналы',
    status: 'published',
    expirationHours: 12,
    metrics: { views: 567, clicks: 89, forwards: 23 },
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
  },
  {
    id: '3',
    profileId: '1',
    profileName: 'Анна Секрет',
    text: 'Черновик новой сторис...',
    status: 'draft',
    expirationHours: 24,
    metrics: { views: 0, clicks: 0, forwards: 0 },
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  },
];

export function StoriesPanel() {
  const [stories, setStories] = useState<OFMStory[]>(mockStories);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [storyText, setStoryText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkButtonText, setLinkButtonText] = useState('');
  const [expirationHours, setExpirationHours] = useState(24);
  const [autoPublish, setAutoPublish] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleGenerateText = async () => {
    if (!selectedProfile) {
      toast.error('Выберите профиль');
      return;
    }

    setIsGenerating(true);
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const generatedTexts = [
      'Секрет, который поможет тебе в отношениях... 👀💕',
      'То, что никто не расскажет о психологии...',
      'История, которая изменит твой взгляд на любовь...',
    ];
    
    setStoryText(generatedTexts[Math.floor(Math.random() * generatedTexts.length)]);
    setIsGenerating(false);
    toast.success('Текст сгенерирован');
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    // Simulate image generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setImageUrl('/generated-story.jpg');
    setIsGeneratingImage(false);
    toast.success('Изображение сгенерировано');
  };

  const handleCreateStory = () => {
    if (!selectedProfile || !storyText.trim()) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    const profile = mockProfiles.find((p) => p.id === selectedProfile);
    const newStory: OFMStory = {
      id: Date.now().toString(),
      profileId: selectedProfile,
      profileName: profile?.name || 'Неизвестный',
      text: storyText,
      imageUrl: imageUrl || undefined,
      linkUrl: linkUrl || undefined,
      linkButtonText: linkButtonText || undefined,
      status: 'draft',
      expirationHours,
      metrics: { views: 0, clicks: 0, forwards: 0 },
      createdAt: new Date(),
    };

    setStories([newStory, ...stories]);
    
    // Reset form
    setSelectedProfile('');
    setStoryText('');
    setImageUrl('');
    setLinkUrl('');
    setLinkButtonText('');
    
    toast.success('Сторис создана');
  };

  const handlePublishStory = (id: string) => {
    setStories(stories.map((s) =>
      s.id === id
        ? {
            ...s,
            status: 'published' as const,
            publishedAt: new Date(),
            expiresAt: new Date(Date.now() + s.expirationHours * 60 * 60 * 1000),
          }
        : s
    ));
    toast.success('Сторис опубликована');
  };

  const handleDeleteStory = (id: string) => {
    setStories(stories.filter((s) => s.id !== id));
    toast.success('Сторис удалена');
  };

  const getStatusBadge = (status: OFMStory['status']) => {
    const styles = {
      draft: 'bg-[#FFB800]/20 text-[#FFB800] border-[#FFB800]/30',
      published: 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]/30',
      expired: 'bg-[#FF4D4D]/20 text-[#FF4D4D] border-[#FF4D4D]/30',
    };

    const labels = {
      draft: 'Черновик',
      published: 'Опубликована',
      expired: 'Истекла',
    };

    return (
      <Badge variant="outline" className={cn('text-xs', styles[status])}>
        {labels[status]}
      </Badge>
    );
  };

  const formatTimeRemaining = (expiresAt?: Date) => {
    if (!expiresAt) return '-';
    const diff = expiresAt.getTime() - Date.now();
    if (diff <= 0) return 'Истекла';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}ч ${minutes}м`;
  };

  const draftStories = stories.filter((s) => s.status === 'draft');
  const publishedStories = stories.filter((s) => s.status === 'published');
  const expiredStories = stories.filter((s) => s.status === 'expired');

  return (
    <div className="space-y-6">
      {/* Create Story Form */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#FF6B9D]" />
            Создать сторис
          </CardTitle>
          <CardDescription>Создайте новую сторис для профиля</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile Selection */}
          <div className="space-y-2">
            <label className="text-sm text-[#8A8A8A]">Профиль</label>
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white">
                <SelectValue placeholder="Выберите профиль" />
              </SelectTrigger>
              <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                {mockProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-white">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Text Input with AI Generate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[#8A8A8A]">Текст сторис</label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateText}
                disabled={isGenerating || !selectedProfile}
                className="border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-1" />
                )}
                AI Генерация
              </Button>
            </div>
            <Textarea
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="Текст вашей сторис..."
              className="bg-[#14151A] border-[#2A2B32] text-white min-h-[100px]"
            />
          </div>

          {/* Image Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[#8A8A8A]">Изображение</label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
                className="border-[#FF6B9D] text-[#FF6B9D] hover:bg-[#FF6B9D]/10"
              >
                {isGeneratingImage ? (
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                AI Генерация
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL изображения или загрузите..."
                className="flex-1 bg-[#14151A] border-[#2A2B32] text-white"
              />
              <Button
                variant="outline"
                className="border-[#2A2B32] text-[#8A8A8A]"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Link Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">Ссылка</label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="pl-10 bg-[#14151A] border-[#2A2B32] text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">Текст кнопки</label>
              <Input
                value={linkButtonText}
                onChange={(e) => setLinkButtonText(e.target.value)}
                placeholder="Подписаться"
                className="bg-[#14151A] border-[#2A2B32] text-white"
              />
            </div>
          </div>

          {/* Expiration and Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#8A8A8A]" />
                <Select
                  value={expirationHours.toString()}
                  onValueChange={(v) => setExpirationHours(parseInt(v))}
                >
                  <SelectTrigger className="w-32 bg-[#14151A] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                    <SelectItem value="6">6 часов</SelectItem>
                    <SelectItem value="12">12 часов</SelectItem>
                    <SelectItem value="24">24 часа</SelectItem>
                    <SelectItem value="48">48 часов</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
                <span className="text-sm text-[#8A8A8A]">Авто-публикация</span>
              </div>
            </div>

            <Button
              onClick={handleCreateStory}
              disabled={!selectedProfile || !storyText.trim()}
              className="bg-[#FF6B9D] hover:bg-[#FF6B9D]/80"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stories List */}
      <div className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-[#1E1F26] border-[#2A2B32]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[#FFB800]">{draftStories.length}</p>
              <p className="text-xs text-[#8A8A8A]">Черновиков</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1E1F26] border-[#2A2B32]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[#00D26A]">{publishedStories.length}</p>
              <p className="text-xs text-[#8A8A8A]">Активных</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1E1F26] border-[#2A2B32]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[#FF4D4D]">{expiredStories.length}</p>
              <p className="text-xs text-[#8A8A8A]">Истекших</p>
            </CardContent>
          </Card>
        </div>

        {/* Stories Grid */}
        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
            {stories.map((story) => {
              const ctr = story.metrics.views > 0
                ? ((story.metrics.clicks / story.metrics.views) * 100).toFixed(1)
                : '0';

              return (
                <Card
                  key={story.id}
                  className={cn(
                    'bg-[#1E1F26] border-[#2A2B32] overflow-hidden',
                    story.status === 'expired' && 'opacity-60'
                  )}
                >
                  {/* Image Preview */}
                  <div className="relative aspect-[9/16] bg-gradient-to-br from-[#FF6B9D]/20 to-[#6C63FF]/20">
                    {story.imageUrl ? (
                      <img
                        src={story.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-[#8A8A8A] opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(story.status)}
                    </div>
                    {story.status === 'published' && (
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-xs text-white flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeRemaining(story.expiresAt)}
                      </div>
                    )}
                  </div>

                  <CardContent className="p-3 space-y-2">
                    {/* Profile Name */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {story.profileName}
                      </span>
                    </div>

                    {/* Text Preview */}
                    <p className="text-xs text-[#8A8A8A] line-clamp-2">{story.text}</p>

                    {/* Link Badge */}
                    {story.linkUrl && (
                      <div className="flex items-center gap-1 text-xs text-[#6C63FF]">
                        <Link className="w-3 h-3" />
                        <span className="truncate">{story.linkButtonText || 'Ссылка'}</span>
                      </div>
                    )}

                    {/* Metrics */}
                    {story.status === 'published' && (
                      <div className="flex items-center gap-3 text-xs pt-2 border-t border-[#2A2B32]">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-[#8A8A8A]" />
                          <span className="text-white">{story.metrics.views}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MousePointer className="w-3 h-3 text-[#8A8A8A]" />
                          <span className="text-white">{story.metrics.clicks}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Share2 className="w-3 h-3 text-[#8A8A8A]" />
                          <span className="text-white">{story.metrics.forwards}</span>
                        </div>
                        <Badge variant="outline" className="text-[#00D26A] border-[#00D26A]/30 text-xs ml-auto">
                          {ctr}% CTR
                        </Badge>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {story.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handlePublishStory(story.id)}
                          className="flex-1 bg-[#00D26A] hover:bg-[#00D26A]/80"
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Опубликовать
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteStory(story.id)}
                        className="border-[#FF4D4D] text-[#FF4D4D] hover:bg-[#FF4D4D]/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

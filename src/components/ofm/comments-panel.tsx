'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/dialog';
import {
  Plus,
  Wand2,
  RefreshCw,
  Send,
  Trash2,
  MessageSquare,
  Heart,
  Reply,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface OFMComment {
  id: string;
  profileId: string;
  profileName: string;
  profileAvatar?: string;
  targetChannel: string;
  targetPostId: string;
  text: string;
  style: 'playful' | 'mysterious' | 'friendly' | 'provocative';
  status: 'pending' | 'posted' | 'deleted';
  metrics: {
    likes: number;
    replies: number;
    profileClicks: number;
  };
  createdAt: Date;
  postedAt?: Date;
}

// Mock profiles
const mockProfiles = [
  { id: '1', name: 'Анна Секрет', avatar: '' },
  { id: '2', name: 'Макс Крипто', avatar: '' },
  { id: '3', name: 'Лена Бизнес', avatar: '' },
];

const styleOptions = [
  { value: 'playful', label: 'Игривый', color: '#FF6B9D' },
  { value: 'mysterious', label: 'Загадочный', color: '#6C63FF' },
  { value: 'friendly', label: 'Дружелюбный', color: '#00D26A' },
  { value: 'provocative', label: 'Провокационный', color: '#FFB800' },
];

// Mock comments
const mockComments: OFMComment[] = [
  {
    id: '1',
    profileId: '1',
    profileName: 'Анна Секрет',
    targetChannel: '@crypto_news',
    targetPostId: '1234',
    text: 'Ого, это действительно работает! Уже опробовала 💕',
    style: 'playful',
    status: 'posted',
    metrics: { likes: 23, replies: 5, profileClicks: 12 },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '2',
    profileId: '2',
    profileName: 'Макс Крипто',
    targetChannel: '@finance_tips',
    targetPostId: '5678',
    text: 'Интересный взгляд на рынок... Есть над чем подумать 🤔',
    style: 'mysterious',
    status: 'posted',
    metrics: { likes: 45, replies: 8, profileClicks: 23 },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: '3',
    profileId: '1',
    profileName: 'Анна Секрет',
    targetChannel: '@relationship_tips',
    targetPostId: '9012',
    text: 'Ожидаю генерации...',
    style: 'friendly',
    status: 'pending',
    metrics: { likes: 0, replies: 0, profileClicks: 0 },
    createdAt: new Date(Date.now() - 10 * 60 * 1000),
  },
];

export function CommentsPanel() {
  const [comments, setComments] = useState<OFMComment[]>(mockComments);
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    profileId: '',
    targetChannel: '',
    postUrlOrId: '',
    style: 'playful' as OFMComment['style'],
  });

  const handleGenerateComments = async () => {
    if (!formData.profileId || !formData.targetChannel) {
      toast.error('Заполните все поля');
      return;
    }

    setIsGenerating(true);
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const variants = [
      'Это действительно работает! Мой личный опыт подтверждает 💫',
      'Никогда бы не подумала, что всё так просто... Спасибо за инсайт! 🙏',
      'Нужный пост в нужное время! Как раз искала эту информацию 💕',
    ];

    setGeneratedVariants(variants);
    setShowVariants(true);
    setIsGenerating(false);
  };

  const handleSelectVariant = (variant: string) => {
    const profile = mockProfiles.find((p) => p.id === formData.profileId);
    const newComment: OFMComment = {
      id: Date.now().toString(),
      profileId: formData.profileId,
      profileName: profile?.name || 'Неизвестный',
      targetChannel: formData.targetChannel,
      targetPostId: formData.postUrlOrId || 'unknown',
      text: variant,
      style: formData.style,
      status: 'pending',
      metrics: { likes: 0, replies: 0, profileClicks: 0 },
      createdAt: new Date(),
    };

    setComments([newComment, ...comments]);
    setShowVariants(false);
    setGeneratedVariants([]);
    
    // Reset form
    setFormData({
      profileId: '',
      targetChannel: '',
      postUrlOrId: '',
      style: 'playful',
    });

    toast.success('Комментарий создан');
  };

  const handleBulkGenerate = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const newComments: OFMComment[] = [];
    const baseTexts = [
      'Очень полезный пост! Сохранила себе 👍',
      'Спасибо за информацию! 🙏',
      'Интересно... Надо будет изучить подробнее 🤔',
    ];

    mockProfiles.forEach((profile, idx) => {
      newComments.push({
        id: `bulk-${Date.now()}-${idx}`,
        profileId: profile.id,
        profileName: profile.name,
        targetChannel: formData.targetChannel || '@target_channel',
        targetPostId: `bulk-${Date.now()}`,
        text: baseTexts[idx % baseTexts.length],
        style: 'friendly',
        status: 'pending',
        metrics: { likes: 0, replies: 0, profileClicks: 0 },
        createdAt: new Date(),
      });
    });

    setComments([...newComments, ...comments]);
    setIsGenerating(false);
    toast.success('Создано 10 комментариев');
  };

  const handlePostSelected = async () => {
    if (selectedComments.length === 0) {
      toast.error('Выберите комментарии');
      return;
    }

    // Simulate posting
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setComments(comments.map((c) =>
      selectedComments.includes(c.id)
        ? { ...c, status: 'posted' as const, postedAt: new Date() }
        : c
    ));

    setSelectedComments([]);
    toast.success(`Опубликовано ${selectedComments.length} комментариев`);
  };

  const handleDeleteSelected = () => {
    setComments(comments.filter((c) => !selectedComments.includes(c.id)));
    setSelectedComments([]);
    toast.success('Комментарии удалены');
  };

  const handleCopyComment = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано в буфер обмена');
  };

  const toggleSelectAll = () => {
    if (selectedComments.length === comments.filter((c) => c.status === 'pending').length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(comments.filter((c) => c.status === 'pending').map((c) => c.id));
    }
  };

  const getStatusBadge = (status: OFMComment['status']) => {
    const styles = {
      pending: 'bg-[#FFB800]/20 text-[#FFB800] border-[#FFB800]/30',
      posted: 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]/30',
      deleted: 'bg-[#FF4D4D]/20 text-[#FF4D4D] border-[#FF4D4D]/30',
    };

    const icons = {
      pending: Clock,
      posted: CheckCircle,
      deleted: XCircle,
    };

    const labels = {
      pending: 'Ожидает',
      posted: 'Опубликован',
      deleted: 'Удалён',
    };

    const Icon = icons[status];

    return (
      <Badge variant="outline" className={cn('text-xs flex items-center gap-1', styles[status])}>
        <Icon className="w-3 h-3" />
        {labels[status]}
      </Badge>
    );
  };

  const pendingCount = comments.filter((c) => c.status === 'pending').length;
  const postedCount = comments.filter((c) => c.status === 'posted').length;
  const totalEngagement = comments.reduce((acc, c) => acc + c.metrics.likes + c.metrics.replies, 0);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <p className="text-xs text-[#8A8A8A]">Ожидают</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{postedCount}</p>
                <p className="text-xs text-[#8A8A8A]">Опубликовано</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B9D]/20 flex items-center justify-center">
                <Heart className="w-5 h-5 text-[#FF6B9D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalEngagement}</p>
                <p className="text-xs text-[#8A8A8A]">Вовлечённость</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {comments.reduce((acc, c) => acc + c.metrics.profileClicks, 0)}
                </p>
                <p className="text-xs text-[#8A8A8A]">Переходов</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comment Generation Form */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[#FF6B9D]" />
            Генерация комментариев
          </CardTitle>
          <CardDescription>Создайте AI-комментарий для целевого канала</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">Профиль</label>
              <Select
                value={formData.profileId}
                onValueChange={(v) => setFormData({ ...formData, profileId: v })}
              >
                <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white">
                  <SelectValue placeholder="Выберите" />
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

            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">Целевой канал</label>
              <Input
                value={formData.targetChannel}
                onChange={(e) => setFormData({ ...formData, targetChannel: e.target.value })}
                placeholder="@channel_name"
                className="bg-[#14151A] border-[#2A2B32] text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">URL/ID поста</label>
              <Input
                value={formData.postUrlOrId}
                onChange={(e) => setFormData({ ...formData, postUrlOrId: e.target.value })}
                placeholder="https://t.me/..."
                className="bg-[#14151A] border-[#2A2B32] text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">Стиль</label>
              <Select
                value={formData.style}
                onValueChange={(v) => setFormData({ ...formData, style: v as OFMComment['style'] })}
              >
                <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                  {styleOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerateComments}
              disabled={isGenerating || !formData.profileId}
              className="bg-[#FF6B9D] hover:bg-[#FF6B9D]/80"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              AI Генерация
            </Button>

            <Button
              variant="outline"
              onClick={handleBulkGenerate}
              disabled={isGenerating}
              className="border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
            >
              <Zap className="w-4 h-4 mr-2" />
              Сгенерировать 10
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedComments.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-[#1E1F26] rounded-lg border border-[#2A2B32]">
          <Checkbox
            checked={selectedComments.length === pendingCount}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-white">
            Выбрано: {selectedComments.length}
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              onClick={handlePostSelected}
              className="bg-[#00D26A] hover:bg-[#00D26A]/80"
            >
              <Send className="w-4 h-4 mr-1" />
              Опубликовать все
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeleteSelected}
              className="border-[#FF4D4D] text-[#FF4D4D] hover:bg-[#FF4D4D]/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Удалить
            </Button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {comments.map((comment) => {
            const styleInfo = styleOptions.find((s) => s.value === comment.style);
            const isSelected = selectedComments.includes(comment.id);

            return (
              <Card
                key={comment.id}
                className={cn(
                  'bg-[#1E1F26] border-[#2A2B32] transition-all',
                  isSelected && 'border-[#FF6B9D]',
                  comment.status === 'deleted' && 'opacity-60'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox for pending comments */}
                    {comment.status === 'pending' && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedComments([...selectedComments, comment.id]);
                          } else {
                            setSelectedComments(selectedComments.filter((id) => id !== comment.id));
                          }
                        }}
                        className="mt-1"
                      />
                    )}

                    {/* Avatar */}
                    <Avatar className="w-10 h-10 border-2" style={{ borderColor: styleInfo?.color }}>
                      <AvatarFallback className="bg-gradient-to-br from-[#FF6B9D] to-[#6C63FF] text-white">
                        {comment.profileName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{comment.profileName}</span>
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: styleInfo?.color, color: styleInfo?.color }}
                        >
                          {styleInfo?.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs border-[#2A2B32] text-[#8A8A8A]"
                        >
                          {comment.targetChannel}
                        </Badge>
                        {getStatusBadge(comment.status)}
                      </div>

                      <p className="text-sm text-white mb-2">{comment.text}</p>

                      {/* Metrics */}
                      {comment.status === 'posted' && (
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-[#FF6B9D]" />
                            <span className="text-white">{comment.metrics.likes}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Reply className="w-3 h-3 text-[#6C63FF]" />
                            <span className="text-white">{comment.metrics.replies}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <UserPlus className="w-3 h-3 text-[#00D26A]" />
                            <span className="text-white">{comment.metrics.profileClicks}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopyComment(comment.text)}
                        className="h-8 w-8 text-[#8A8A8A] hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {comment.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setComments(comments.map((c) =>
                              c.id === comment.id
                                ? { ...c, status: 'posted' as const, postedAt: new Date() }
                                : c
                            ));
                            toast.success('Комментарий опубликован');
                          }}
                          className="bg-[#00D26A] hover:bg-[#00D26A]/80"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {comments.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
              <p className="text-[#8A8A8A]">Нет комментариев</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Variants Dialog */}
      <Dialog open={showVariants} onOpenChange={setShowVariants}>
        <DialogContent className="max-w-lg bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Выберите вариант</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {generatedVariants.map((variant, idx) => (
              <Card
                key={idx}
                className="bg-[#1E1F26] border-[#2A2B32] cursor-pointer hover:border-[#FF6B9D] transition-colors"
                onClick={() => handleSelectVariant(variant)}
              >
                <CardContent className="p-4">
                  <p className="text-white">{variant}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

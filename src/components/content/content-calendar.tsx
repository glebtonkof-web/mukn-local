'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAppStore, Influencer } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Clock,
  User,
  Edit,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  FileText,
  Instagram,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addDays, setHours, setMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';

// Types for scheduled posts
interface ScheduledPost {
  id: string;
  influencerId: string;
  influencerName: string;
  platform: 'telegram' | 'instagram' | 'tiktok' | 'youtube';
  title: string;
  content: string;
  scheduledAt: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'carousel';
}

// Demo scheduled posts
const demoScheduledPosts: ScheduledPost[] = [
  {
    id: '1',
    influencerId: '1',
    influencerName: 'София',
    platform: 'telegram',
    title: 'Крипто-обзор недели',
    content: 'Разбираем главные тренды крипторынка...',
    scheduledAt: new Date(2025, 0, 21, 10, 0),
    status: 'scheduled',
  },
  {
    id: '2',
    influencerId: '1',
    influencerName: 'София',
    platform: 'instagram',
    title: 'История успеха',
    content: 'Как я увеличила портфель в 3 раза...',
    scheduledAt: new Date(2025, 0, 21, 15, 30),
    status: 'scheduled',
    mediaType: 'image',
  },
  {
    id: '3',
    influencerId: '2',
    influencerName: 'Максим',
    platform: 'telegram',
    title: 'Выигрыш 500k!',
    content: 'Друзья, невероятная удача! Выиграл...',
    scheduledAt: new Date(2025, 0, 22, 12, 0),
    status: 'draft',
  },
  {
    id: '4',
    influencerId: '3',
    influencerName: 'Алиса',
    platform: 'instagram',
    title: 'Утреннее селфи',
    content: 'Доброе утро, мои хорошие! ❤️',
    scheduledAt: new Date(2025, 0, 23, 9, 0),
    status: 'scheduled',
    mediaType: 'image',
  },
  {
    id: '5',
    influencerId: '4',
    influencerName: 'Артём',
    platform: 'telegram',
    title: 'Фитнес-челлендж',
    content: 'Стартуем новый 30-дневный челлендж...',
    scheduledAt: new Date(2025, 0, 24, 18, 0),
    status: 'scheduled',
  },
];

// Status colors
const statusColors: Record<string, string> = {
  draft: '#8A8A8A',
  scheduled: '#6C63FF',
  published: '#00D26A',
  failed: '#FF4D4D',
};

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  scheduled: 'Запланирован',
  published: 'Опубликован',
  failed: 'Ошибка',
};

// Platform icons
const platformIcons: Record<string, typeof Instagram> = {
  telegram: MessageCircle,
  instagram: Instagram,
  tiktok: FileText,
  youtube: FileText,
};

// Platform colors
const platformColors: Record<string, string> = {
  telegram: '#0088cc',
  instagram: '#E4405F',
  tiktok: '#000000',
  youtube: '#FF0000',
};

// Drag item type for DnD
interface DragItem {
  id: string;
  type: 'post';
  post: ScheduledPost;
}

export function ContentCalendar() {
  const { influencers } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [filterInfluencer, setFilterInfluencer] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [posts, setPosts] = useState<ScheduledPost[]>(demoScheduledPosts);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draggedPost, setDraggedPost] = useState<ScheduledPost | null>(null);

  // Get days in current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (filterInfluencer !== 'all' && post.influencerId !== filterInfluencer) return false;
      if (filterPlatform !== 'all' && post.platform !== filterPlatform) return false;
      if (filterStatus !== 'all' && post.status !== filterStatus) return false;
      return true;
    });
  }, [posts, filterInfluencer, filterPlatform, filterStatus]);

  // Get posts for a specific day
  const getPostsForDay = useCallback((date: Date) => {
    return filteredPosts.filter(post => isSameDay(post.scheduledAt, date));
  }, [filteredPosts]);

  // Navigation handlers
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, post: ScheduledPost) => {
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (draggedPost) {
      // Update post date
      const updatedPosts = posts.map(post => {
        if (post.id === draggedPost.id) {
          const newDate = new Date(targetDate);
          newDate.setHours(draggedPost.scheduledAt.getHours());
          newDate.setMinutes(draggedPost.scheduledAt.getMinutes());
          return { ...post, scheduledAt: newDate };
        }
        return post;
      });
      setPosts(updatedPosts);
      toast.success(`Пост "${draggedPost.title}" перенесён на ${format(targetDate, 'd MMMM', { locale: ru })}`);
      setDraggedPost(null);
    }
  };

  // Create post handler
  const handleCreatePost = (date: Date) => {
    setSelectedDate(date);
    setIsCreateDialogOpen(true);
  };

  // Delete post handler
  const handleDeletePost = (postId: string) => {
    setPosts(posts.filter(p => p.id !== postId));
    setSelectedPost(null);
    toast.success('Пост удалён');
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth} className="border-[#2A2B32] text-[#8A8A8A] hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handleToday} className="border-[#2A2B32] text-[#8A8A8A] hover:text-white">
            Сегодня
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth} className="border-[#2A2B32] text-[#8A8A8A] hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold text-white ml-2">
            {format(currentDate, 'LLLL yyyy', { locale: ru })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-[#1E1F26] rounded-lg p-1">
            {(['month', 'week'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  viewMode === mode
                    ? 'bg-[#6C63FF] text-white'
                    : 'text-[#8A8A8A] hover:text-white'
                )}
              >
                {mode === 'month' ? 'Месяц' : 'Неделя'}
              </button>
            ))}
          </div>

          {/* Filters */}
          <Select value={filterInfluencer} onValueChange={setFilterInfluencer}>
            <SelectTrigger className="w-[140px] bg-[#1E1F26] border-[#2A2B32] text-white">
              <SelectValue placeholder="Инфлюенсер" />
            </SelectTrigger>
            <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
              <SelectItem value="all" className="text-white">Все</SelectItem>
              {influencers.map((inf) => (
                <SelectItem key={inf.id} value={inf.id} className="text-white">{inf.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-[130px] bg-[#1E1F26] border-[#2A2B32] text-white">
              <SelectValue placeholder="Платформа" />
            </SelectTrigger>
            <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
              <SelectItem value="all" className="text-white">Все</SelectItem>
              <SelectItem value="telegram" className="text-white">Telegram</SelectItem>
              <SelectItem value="instagram" className="text-white">Instagram</SelectItem>
              <SelectItem value="tiktok" className="text-white">TikTok</SelectItem>
              <SelectItem value="youtube" className="text-white">YouTube</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] bg-[#1E1F26] border-[#2A2B32] text-white">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
              <SelectItem value="all" className="text-white">Все</SelectItem>
              <SelectItem value="draft" className="text-white">Черновики</SelectItem>
              <SelectItem value="scheduled" className="text-white">Запланированные</SelectItem>
              <SelectItem value="published" className="text-white">Опубликованные</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#2A2B32]">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-[#8A8A8A] border-r border-[#2A2B32] last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before month start */}
            {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[120px] border-r border-b border-[#2A2B32] last:border-r-0 bg-[#0A0B0E]/50"
              />
            ))}

            {/* Actual days */}
            {days.map((day) => {
              const dayPosts = getPostsForDay(day);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[120px] border-r border-b border-[#2A2B32] last:border-r-0 p-2 cursor-pointer transition-colors hover:bg-[#1E1F26]/50',
                    isCurrentDay && 'bg-[#6C63FF]/10'
                  )}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                  onClick={() => dayPosts.length === 0 && handleCreatePost(day)}
                >
                  {/* Day number */}
                  <div className={cn(
                    'flex items-center justify-between mb-2',
                    isCurrentDay && 'text-[#6C63FF] font-bold'
                  )}>
                    <span className={cn(
                      'text-sm font-medium',
                      isCurrentDay ? 'text-[#6C63FF]' : 'text-white'
                    )}>
                      {format(day, 'd')}
                    </span>
                    {dayPosts.length === 0 && (
                      <Plus className="w-4 h-4 text-[#8A8A8A] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>

                  {/* Posts */}
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((post) => {
                      const PlatformIcon = platformIcons[post.platform] || FileText;
                      return (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, post)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPost(post);
                          }}
                          className={cn(
                            'flex items-center gap-1.5 p-1.5 rounded text-xs cursor-pointer transition-all hover:scale-[1.02] group',
                            post.status === 'scheduled' && 'bg-[#6C63FF]/20 border border-[#6C63FF]/30',
                            post.status === 'draft' && 'bg-[#8A8A8A]/20 border border-[#8A8A8A]/30',
                            post.status === 'published' && 'bg-[#00D26A]/20 border border-[#00D26A]/30',
                            post.status === 'failed' && 'bg-[#FF4D4D]/20 border border-[#FF4D4D]/30'
                          )}
                        >
                          <GripVertical className="w-3 h-3 text-[#8A8A8A] opacity-0 group-hover:opacity-100 transition-opacity" />
                          <PlatformIcon
                            className="w-3 h-3 shrink-0"
                            style={{ color: platformColors[post.platform] }}
                          />
                          <span className="truncate text-white">{post.title}</span>
                          <span className="text-[#8A8A8A] ml-auto shrink-0">
                            {format(post.scheduledAt, 'HH:mm')}
                          </span>
                        </div>
                      );
                    })}
                    {dayPosts.length > 3 && (
                      <div className="text-xs text-[#8A8A8A] text-center">
                        +{dayPosts.length - 3} ещё
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-[#8A8A8A]">Статусы:</span>
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: statusColors[key] }}
            />
            <span className="text-white">{label}</span>
          </div>
        ))}
      </div>

      {/* Post Detail Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-lg bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPost && (
                <>
                  {(() => {
                    const Icon = platformIcons[selectedPost.platform] || FileText;
                    return <Icon className="w-5 h-5" style={{ color: platformColors[selectedPost.platform] }} />;
                  })()}
                  {selectedPost.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              {selectedPost?.influencerName} • {selectedPost && format(selectedPost.scheduledAt, 'd MMMM yyyy, HH:mm', { locale: ru })}
            </DialogDescription>
          </DialogHeader>

          {selectedPost && (
            <div className="space-y-4 mt-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: statusColors[selectedPost.status] + '20',
                    borderColor: statusColors[selectedPost.status],
                    color: statusColors[selectedPost.status]
                  }}
                >
                  {statusLabels[selectedPost.status]}
                </Badge>
                <Badge
                  variant="outline"
                  style={{
                    borderColor: platformColors[selectedPost.platform],
                    color: platformColors[selectedPost.platform]
                  }}
                >
                  {selectedPost.platform.charAt(0).toUpperCase() + selectedPost.platform.slice(1)}
                </Badge>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <p className="text-sm text-[#8A8A8A]">Содержание:</p>
                <p className="text-white bg-[#1E1F26] p-3 rounded-lg">{selectedPost.content}</p>
              </div>

              {/* Media */}
              {selectedPost.mediaType && (
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#8A8A8A]" />
                  <span className="text-sm text-[#8A8A8A]">
                    {selectedPost.mediaType === 'image' ? 'Изображение' : selectedPost.mediaType === 'video' ? 'Видео' : 'Карусель'}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-[#2A2B32]">
                <Button
                  variant="outline"
                  className="flex-1 border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
                  onClick={() => {
                    toast.info('Редактирование поста');
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Редактировать
                </Button>
                <Button
                  variant="outline"
                  className="border-[#FF4D4D] text-[#FF4D4D] hover:bg-[#FF4D4D]/10"
                  onClick={() => handleDeletePost(selectedPost.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        selectedDate={selectedDate}
        influencers={influencers}
        onCreatePost={(post) => {
          setPosts([...posts, post]);
          setIsCreateDialogOpen(false);
          toast.success('Пост создан и добавлен в расписание');
        }}
      />
    </div>
  );
}

// Create Post Dialog Component
function CreatePostDialog({
  open,
  onOpenChange,
  selectedDate,
  influencers,
  onCreatePost,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  influencers: Influencer[];
  onCreatePost: (post: ScheduledPost) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState<string>('telegram');
  const [influencerId, setInfluencerId] = useState<string>('');
  const [date, setDate] = useState<Date>(selectedDate || new Date());
  const [time, setTime] = useState('12:00');

  const handleCreate = () => {
    if (!title.trim() || !content.trim() || !influencerId) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes);

    const influencer = influencers.find(i => i.id === influencerId);

    onCreatePost({
      id: Date.now().toString(),
      influencerId,
      influencerName: influencer?.name || 'Unknown',
      platform: platform as 'telegram' | 'instagram' | 'tiktok' | 'youtube',
      title,
      content,
      scheduledAt,
      status: 'scheduled',
    });

    // Reset form
    setTitle('');
    setContent('');
    setPlatform('telegram');
    setInfluencerId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#14151A] border-[#2A2B32] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#6C63FF]" />
            Создать пост
          </DialogTitle>
          <DialogDescription className="text-[#8A8A8A]">
            Запланируйте новый пост для публикации
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Influencer */}
          <div className="space-y-2">
            <Label className="text-[#8A8A8A]">Инфлюенсер *</Label>
            <Select value={influencerId} onValueChange={setInfluencerId}>
              <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                <SelectValue placeholder="Выберите инфлюенсера" />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                {influencers.map((inf) => (
                  <SelectItem key={inf.id} value={inf.id} className="text-white">
                    {inf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <Label className="text-[#8A8A8A]">Платформа</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                <SelectItem value="telegram" className="text-white">Telegram</SelectItem>
                <SelectItem value="instagram" className="text-white">Instagram</SelectItem>
                <SelectItem value="tiktok" className="text-white">TikTok</SelectItem>
                <SelectItem value="youtube" className="text-white">YouTube</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[#8A8A8A]">Заголовок *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название поста"
              className="bg-[#1E1F26] border-[#2A2B32] text-white"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label className="text-[#8A8A8A]">Содержание *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Текст поста..."
              rows={4}
              className="bg-[#1E1F26] border-[#2A2B32] text-white resize-none"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Дата</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full bg-[#1E1F26] border-[#2A2B32] text-white justify-start"
                  >
                    <CalendarDays className="w-4 h-4 mr-2" />
                    {format(date, 'd MMM yyyy', { locale: ru })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#1E1F26] border-[#2A2B32]">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    className="text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Время</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-[#2A2B32]">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              className="flex-1 bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContentCalendar;

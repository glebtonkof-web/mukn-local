'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Heart,
  Search,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface OFMProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  avatarUrl?: string;
  niche: 'relationships' | 'psychology' | 'humor' | 'business' | 'crypto';
  style: 'playful' | 'mysterious' | 'friendly' | 'provocative';
  customCommentPrompt?: string;
  customStoryPrompt?: string;
  isActive: boolean;
  metrics: {
    commentsCount: number;
    storiesCount: number;
    followersGained: number;
    revenue: number;
  };
  createdAt: Date;
}

const nicheOptions = [
  { value: 'relationships', label: 'Отношения', color: '#FF6B9D' },
  { value: 'psychology', label: 'Психология', color: '#6C63FF' },
  { value: 'humor', label: 'Юмор', color: '#FFB800' },
  { value: 'business', label: 'Бизнес', color: '#00D26A' },
  { value: 'crypto', label: 'Крипта', color: '#00D4AA' },
];

const styleOptions = [
  { value: 'playful', label: 'Игривый' },
  { value: 'mysterious', label: 'Загадочный' },
  { value: 'friendly', label: 'Дружелюбный' },
  { value: 'provocative', label: 'Провокационный' },
];

// Mock data
const mockProfiles: OFMProfile[] = [
  {
    id: '1',
    name: 'Анна Секрет',
    age: 24,
    bio: 'Психолог по жизни, эксперт по отношениям 💕',
    niche: 'relationships',
    style: 'playful',
    customCommentPrompt: 'Комментируй как игривая девушка, используй эмодзи',
    isActive: true,
    metrics: { commentsCount: 1234, storiesCount: 89, followersGained: 567, revenue: 15000 },
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Макс Крипто',
    age: 28,
    bio: 'Крипто-энтузиаст, делюсь инсайтами',
    niche: 'crypto',
    style: 'mysterious',
    isActive: true,
    metrics: { commentsCount: 567, storiesCount: 45, followersGained: 234, revenue: 8500 },
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '3',
    name: 'Лена Бизнес',
    age: 26,
    bio: 'Строю бизнес с нуля, показываю путь',
    niche: 'business',
    style: 'friendly',
    isActive: false,
    metrics: { commentsCount: 890, storiesCount: 67, followersGained: 345, revenue: 12000 },
    createdAt: new Date('2024-01-20'),
  },
];

export function ProfilesPanel() {
  const [profiles, setProfiles] = useState<OFMProfile[]>(mockProfiles);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNiche, setFilterNiche] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<OFMProfile | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: 18,
    bio: '',
    niche: 'relationships' as OFMProfile['niche'],
    style: 'playful' as OFMProfile['style'],
    customCommentPrompt: '',
    customStoryPrompt: '',
  });

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNiche = filterNiche === 'all' || p.niche === filterNiche;
    return matchesSearch && matchesNiche;
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Введите имя профиля');
      return;
    }

    const newProfile: OFMProfile = {
      id: Date.now().toString(),
      name: formData.name,
      age: formData.age,
      bio: formData.bio,
      niche: formData.niche,
      style: formData.style,
      customCommentPrompt: formData.customCommentPrompt || undefined,
      customStoryPrompt: formData.customStoryPrompt || undefined,
      isActive: true,
      metrics: { commentsCount: 0, storiesCount: 0, followersGained: 0, revenue: 0 },
      createdAt: new Date(),
    };

    setProfiles([newProfile, ...profiles]);
    setIsCreateOpen(false);
    resetForm();
    toast.success('Профиль создан');
  };

  const handleEdit = () => {
    if (!editingProfile) return;

    setProfiles(profiles.map((p) =>
      p.id === editingProfile.id
        ? {
            ...p,
            name: formData.name,
            age: formData.age,
            bio: formData.bio,
            niche: formData.niche,
            style: formData.style,
            customCommentPrompt: formData.customCommentPrompt || undefined,
            customStoryPrompt: formData.customStoryPrompt || undefined,
          }
        : p
    ));

    setEditingProfile(null);
    resetForm();
    toast.success('Профиль обновлён');
  };

  const handleDelete = (id: string) => {
    setProfiles(profiles.filter((p) => p.id !== id));
    toast.success('Профиль удалён');
  };

  const handleToggleActive = (id: string) => {
    setProfiles(profiles.map((p) =>
      p.id === id ? { ...p, isActive: !p.isActive } : p
    ));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age: 18,
      bio: '',
      niche: 'relationships',
      style: 'playful',
      customCommentPrompt: '',
      customStoryPrompt: '',
    });
  };

  const openEditDialog = (profile: OFMProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      age: profile.age,
      bio: profile.bio,
      niche: profile.niche,
      style: profile.style,
      customCommentPrompt: profile.customCommentPrompt || '',
      customStoryPrompt: profile.customStoryPrompt || '',
    });
  };

  const totalStats = profiles.reduce(
    (acc, p) => ({
      comments: acc.comments + p.metrics.commentsCount,
      stories: acc.stories + p.metrics.storiesCount,
      followers: acc.followers + p.metrics.followersGained,
      revenue: acc.revenue + p.metrics.revenue,
    }),
    { comments: 0, stories: 0, followers: 0, revenue: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{profiles.length}</p>
                <p className="text-xs text-[#8A8A8A]">Профилей</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStats.comments.toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Комментариев</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalStats.followers.toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Подписчиков</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B9D]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#FF6B9D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${totalStats.revenue.toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Доход</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Search and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
            <Input
              placeholder="Поиск профилей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1E1F26] border-[#2A2B32] text-white"
            />
          </div>
          <Select value={filterNiche} onValueChange={setFilterNiche}>
            <SelectTrigger className="w-40 bg-[#1E1F26] border-[#2A2B32] text-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Ниша" />
            </SelectTrigger>
            <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
              <SelectItem value="all">Все ниши</SelectItem>
              {nicheOptions.map((n) => (
                <SelectItem key={n.value} value={n.value}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="bg-[#FF6B9D] hover:bg-[#FF6B9D]/80"
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать профиль
        </Button>
      </div>

      {/* Profiles List */}
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {filteredProfiles.map((profile) => {
            const nicheInfo = nicheOptions.find((n) => n.value === profile.niche);
            const styleInfo = styleOptions.find((s) => s.value === profile.style);

            return (
              <Card
                key={profile.id}
                className={cn(
                  'bg-[#1E1F26] border-[#2A2B32] transition-all hover:border-[#FF6B9D]/50',
                  !profile.isActive && 'opacity-60'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-14 h-14 border-2" style={{ borderColor: nicheInfo?.color }}>
                      <AvatarImage src={profile.avatarUrl} />
                      <AvatarFallback className="bg-gradient-to-br from-[#FF6B9D] to-[#6C63FF] text-white text-lg">
                        {profile.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{profile.name}</h3>
                        <span className="text-sm text-[#8A8A8A]">{profile.age} лет</span>
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: nicheInfo?.color, color: nicheInfo?.color }}
                        >
                          {nicheInfo?.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs border-[#2A2B32] text-[#8A8A8A]"
                        >
                          {styleInfo?.label}
                        </Badge>
                      </div>

                      <p className="text-sm text-[#8A8A8A] mb-3 line-clamp-1">{profile.bio}</p>

                      <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-[#6C63FF]" />
                          <span className="text-white">{profile.metrics.commentsCount}</span>
                          <span className="text-[#8A8A8A]">коммент.</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-[#FF6B9D]" />
                          <span className="text-white">{profile.metrics.storiesCount}</span>
                          <span className="text-[#8A8A8A]">сторис</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-[#00D26A]" />
                          <span className="text-white">+{profile.metrics.followersGained}</span>
                          <span className="text-[#8A8A8A]">подп.</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-[#FFB800]" />
                          <span className="text-white">${profile.metrics.revenue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={profile.isActive}
                        onCheckedChange={() => handleToggleActive(profile.id)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A]">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1E1F26] border-[#2A2B32]">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(profile)}
                            className="text-white focus:bg-[#2A2B32]"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(profile.id)}
                            className="text-[#FF4D4D] focus:bg-[#FF4D4D]/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredProfiles.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
              <p className="text-[#8A8A8A]">Профили не найдены</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingProfile} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingProfile(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingProfile ? 'Редактировать профиль' : 'Создать новый профиль'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-[#8A8A8A]">Имя *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Имя профиля"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[#8A8A8A]">Возраст</label>
                <Input
                  type="number"
                  min={18}
                  max={99}
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 18 })}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">О себе</label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Краткое описание профиля..."
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-[#8A8A8A]">Ниша</label>
                <Select
                  value={formData.niche}
                  onValueChange={(v) => setFormData({ ...formData, niche: v as OFMProfile['niche'] })}
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {nicheOptions.map((n) => (
                      <SelectItem key={n.value} value={n.value}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[#8A8A8A]">Стиль</label>
                <Select
                  value={formData.style}
                  onValueChange={(v) => setFormData({ ...formData, style: v as OFMProfile['style'] })}
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {styleOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">Промпт для комментариев (опционально)</label>
              <Textarea
                value={formData.customCommentPrompt}
                onChange={(e) => setFormData({ ...formData, customCommentPrompt: e.target.value })}
                placeholder="Особые инструкции для генерации комментариев..."
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#8A8A8A]">Промпт для сторис (опционально)</label>
              <Textarea
                value={formData.customStoryPrompt}
                onChange={(e) => setFormData({ ...formData, customStoryPrompt: e.target.value })}
                placeholder="Особые инструкции для генерации сторис..."
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingProfile(null);
                resetForm();
              }}
              className="border-[#2A2B32] text-[#8A8A8A]"
            >
              Отмена
            </Button>
            <Button
              onClick={editingProfile ? handleEdit : handleCreate}
              className="bg-[#FF6B9D] hover:bg-[#FF6B9D]/80"
            >
              {editingProfile ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

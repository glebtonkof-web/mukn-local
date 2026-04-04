'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  UserCircle, Plus, DollarSign, TrendingUp, ExternalLink,
  Edit, Trash2, Instagram, Youtube, Twitter, Loader2, AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// Типы данных
interface Influencer {
  id: string;
  name: string;
  age: number;
  gender: string;
  niche: string;
  role: string;
  style: string;
  country: string;
  language: string;
  avatarUrl: string | null;
  status: string;
  telegramUsername: string | null;
  telegramChannel: string | null;
  instagramUsername: string | null;
  tiktokUsername: string | null;
  youtubeChannelId: string | null;
  subscribersCount: number;
  postsCount: number;
  leadsCount: number;
  revenue: number;
  banRisk: number;
  createdAt: string;
  account?: {
    id: string;
    platform: string;
    username: string | null;
  } | null;
  _count?: {
    posts: number;
    comments: number;
  };
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Платформы для иконок
const getPlatformIcon = (platform: string | undefined) => {
  switch (platform?.toLowerCase()) {
    case 'instagram': return Instagram;
    case 'tiktok': return Youtube;
    case 'youtube': return Youtube;
    case 'twitter': return Twitter;
    case 'telegram': return UserCircle;
    default: return UserCircle;
  }
};

// Определение платформы по username
const getPrimaryPlatform = (influencer: Influencer): string => {
  if (influencer.instagramUsername) return 'Instagram';
  if (influencer.tiktokUsername) return 'TikTok';
  if (influencer.youtubeChannelId) return 'YouTube';
  if (influencer.telegramUsername) return 'Telegram';
  return influencer.account?.platform || 'Unknown';
};

// Статусы для бейджей
const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Черновик', className: 'bg-gray-500/20 text-gray-400' },
  active: { label: 'Активен', className: 'bg-green-500/20 text-green-400' },
  paused: { label: 'Пауза', className: 'bg-yellow-500/20 text-yellow-400' },
  banned: { label: 'Забанен', className: 'bg-red-500/20 text-red-400' },
};

export function InfluencersView() {
  // Состояния данных
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтрация и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Модальные окна
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  
  // Состояния форм
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'female',
    niche: '',
    role: 'model',
    style: '',
    country: 'RU',
    language: 'ru',
    telegramUsername: '',
    instagramUsername: '',
    tiktokUsername: '',
    bio: '',
  });

  // Загрузка данных
  const fetchInfluencers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '50');
      params.append('offset', '0');
      
      const response = await fetch(`/api/influencers?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      
      const data = await response.json();
      setInfluencers(data.influencers || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      toast.error('Не удалось загрузить список инфлюенсеров');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInfluencers();
  }, [fetchInfluencers]);

  // Фильтрация по поиску
  const filteredInfluencers = influencers.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.niche.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.telegramUsername?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (i.instagramUsername?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Статистика
  const totalRevenue = influencers.reduce((a, i) => a + i.revenue, 0);
  const totalSubscribers = influencers.reduce((a, i) => a + i.subscribersCount, 0);
  const avgEngagement = influencers.length > 0 
    ? (influencers.reduce((a, i) => a + (i._count?.posts || 0), 0) / influencers.length).toFixed(1)
    : '0';

  // Добавление инфлюенсера
  const handleAddInfluencer = async () => {
    // Валидация
    if (!formData.name || !formData.age || !formData.niche || !formData.style) {
      toast.error('Заполните обязательные поля');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          age: parseInt(formData.age),
          gender: formData.gender,
          niche: formData.niche,
          role: formData.role,
          style: formData.style,
          country: formData.country,
          language: formData.language,
          telegramUsername: formData.telegramUsername || null,
          instagramUsername: formData.instagramUsername || null,
          tiktokUsername: formData.tiktokUsername || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка создания');
      }

      toast.success('Инфлюенсер успешно добавлен');
      setIsAddDialogOpen(false);
      resetForm();
      fetchInfluencers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка при добавлении');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Удаление инфлюенсера
  const handleDeleteInfluencer = async () => {
    if (!selectedInfluencer) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/influencers/${selectedInfluencer.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления');
      }

      toast.success('Инфлюенсер удален');
      setIsDeleteDialogOpen(false);
      setSelectedInfluencer(null);
      fetchInfluencers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка при удалении');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обновление инфлюенсера
  const handleUpdateInfluencer = async () => {
    if (!selectedInfluencer) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/influencers/${selectedInfluencer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          age: parseInt(formData.age),
          gender: formData.gender,
          niche: formData.niche,
          role: formData.role,
          style: formData.style,
          country: formData.country,
          language: formData.language,
          telegramUsername: formData.telegramUsername || null,
          instagramUsername: formData.instagramUsername || null,
          tiktokUsername: formData.tiktokUsername || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка обновления');
      }

      toast.success('Данные обновлены');
      setIsDetailDialogOpen(false);
      setSelectedInfluencer(null);
      fetchInfluencers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка при обновлении');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Открытие деталий
  const openDetailDialog = async (influencer: Influencer) => {
    setSelectedInfluencer(influencer);
    setFormData({
      name: influencer.name,
      age: influencer.age.toString(),
      gender: influencer.gender,
      niche: influencer.niche,
      role: influencer.role,
      style: influencer.style,
      country: influencer.country,
      language: influencer.language,
      telegramUsername: influencer.telegramUsername || '',
      instagramUsername: influencer.instagramUsername || '',
      tiktokUsername: influencer.tiktokUsername || '',
      bio: '',
    });
    setIsDetailDialogOpen(true);
  };

  // Сброс формы
  const resetForm = () => {
    setFormData({
      name: '',
      age: '',
      gender: 'female',
      niche: '',
      role: 'model',
      style: '',
      country: 'RU',
      language: 'ru',
      telegramUsername: '',
      instagramUsername: '',
      tiktokUsername: '',
      bio: '',
    });
  };

  // Открытие внешней ссылки
  const openExternalLink = (influencer: Influencer) => {
    let url = '';
    if (influencer.instagramUsername) {
      url = `https://instagram.com/${influencer.instagramUsername}`;
    } else if (influencer.tiktokUsername) {
      url = `https://tiktok.com/@${influencer.tiktokUsername}`;
    } else if (influencer.telegramUsername) {
      url = `https://t.me/${influencer.telegramUsername}`;
    } else if (influencer.youtubeChannelId) {
      url = `https://youtube.com/channel/${influencer.youtubeChannelId}`;
    }
    
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.info('Нет внешней ссылки');
    }
  };

  // Рендер скелетона загрузки
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="w-14 h-14 rounded-full bg-[#1E1F26]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32 bg-[#1E1F26]" />
                <Skeleton className="h-4 w-24 bg-[#1E1F26]" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-16 bg-[#1E1F26]" />
              <Skeleton className="h-16 bg-[#1E1F26]" />
              <Skeleton className="h-16 bg-[#1E1F26]" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Рендер ошибки
  const renderError = () => (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardContent className="py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Ошибка загрузки</h3>
        <p className="text-[#8A8A8A] mb-4">{error}</p>
        <Button onClick={fetchInfluencers} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Попробовать снова
        </Button>
      </CardContent>
    </Card>
  );

  // Рендер формы добавления/редактирования
  const renderForm = (isEdit: boolean = false) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2 col-span-2">
        <Label htmlFor="name">Имя *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Имя инфлюенсера"
          className="bg-[#1E1F26] border-[#2A2B32]"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="age">Возраст *</Label>
        <Input
          id="age"
          type="number"
          min="18"
          max="80"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          placeholder="18-80"
          className="bg-[#1E1F26] border-[#2A2B32]"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="gender">Пол</Label>
        <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
          <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="female">Женский</SelectItem>
            <SelectItem value="male">Мужской</SelectItem>
            <SelectItem value="other">Другой</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="niche">Ниша *</Label>
        <Input
          id="niche"
          value={formData.niche}
          onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
          placeholder="crypto, fitness, lifestyle..."
          className="bg-[#1E1F26] border-[#2A2B32]"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role">Роль</Label>
        <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
          <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="model">Модель</SelectItem>
            <SelectItem value="creator">Контент-мейкер</SelectItem>
            <SelectItem value="influencer">Инфлюенсер</SelectItem>
            <SelectItem value="blogger">Блогер</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2 col-span-2">
        <Label htmlFor="style">Стиль общения *</Label>
        <Textarea
          id="style"
          value={formData.style}
          onChange={(e) => setFormData({ ...formData, style: e.target.value })}
          placeholder="Опишите стиль общения с аудиторией..."
          className="bg-[#1E1F26] border-[#2A2B32] min-h-[80px]"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="country">Страна</Label>
        <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
          <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RU">Россия</SelectItem>
            <SelectItem value="UA">Украина</SelectItem>
            <SelectItem value="BY">Беларусь</SelectItem>
            <SelectItem value="KZ">Казахстан</SelectItem>
            <SelectItem value="US">США</SelectItem>
            <SelectItem value="OTHER">Другая</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="language">Язык</Label>
        <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
          <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ru">Русский</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="uk">Українська</SelectItem>
            <SelectItem value="de">Deutsch</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="telegram">Telegram</Label>
        <Input
          id="telegram"
          value={formData.telegramUsername}
          onChange={(e) => setFormData({ ...formData, telegramUsername: e.target.value })}
          placeholder="@username"
          className="bg-[#1E1F26] border-[#2A2B32]"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="instagram">Instagram</Label>
        <Input
          id="instagram"
          value={formData.instagramUsername}
          onChange={(e) => setFormData({ ...formData, instagramUsername: e.target.value })}
          placeholder="username"
          className="bg-[#1E1F26] border-[#2A2B32]"
        />
      </div>
      
      <div className="space-y-2 col-span-2">
        <Label htmlFor="tiktok">TikTok</Label>
        <Input
          id="tiktok"
          value={formData.tiktokUsername}
          onChange={(e) => setFormData({ ...formData, tiktokUsername: e.target.value })}
          placeholder="username"
          className="bg-[#1E1F26] border-[#2A2B32]"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCircle className="w-7 h-7 text-[#6C63FF]" />
            Инфлюенсеры
          </h1>
          <p className="text-[#8A8A8A]">
            {isLoading ? 'Загрузка...' : `${influencers.length} партнёров`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchInfluencers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button className="bg-[#6C63FF]" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить инфлюенсера
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalRevenue.toLocaleString()}₽</p>
                <p className="text-xs text-[#8A8A8A]">Доход</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{(totalSubscribers / 1000).toFixed(0)}K</p>
                <p className="text-xs text-[#8A8A8A]">Подписчиков</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{influencers.length}</p>
                <p className="text-xs text-[#8A8A8A]">Инфлюенсеров</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E4405F]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#E4405F]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{avgEngagement}%</p>
                <p className="text-xs text-[#8A8A8A]">Сред. постов</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="py-4">
          <div className="flex gap-4">
            <Input
              placeholder="Поиск по имени, нише, username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1E1F26] border-[#2A2B32] flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] w-48">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="draft">Черновики</SelectItem>
                <SelectItem value="paused">На паузе</SelectItem>
                <SelectItem value="banned">Забаненные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Список инфлюенсеров */}
      {isLoading ? (
        renderSkeletons()
      ) : error ? (
        renderError()
      ) : filteredInfluencers.length === 0 ? (
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="py-12 text-center">
            <UserCircle className="w-12 h-12 text-[#8A8A8A] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Нет инфлюенсеров</h3>
            <p className="text-[#8A8A8A] mb-4">
              {searchQuery || statusFilter 
                ? 'Попробуйте изменить параметры поиска'
                : 'Добавьте первого инфлюенсера для начала работы'}
            </p>
            {!searchQuery && !statusFilter && (
              <Button className="bg-[#6C63FF]" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить инфлюенсера
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
          {filteredInfluencers.map((influencer) => {
            const platform = getPrimaryPlatform(influencer);
            const PlatformIcon = getPlatformIcon(platform);
            const status = statusConfig[influencer.status] || statusConfig.draft;
            
            return (
              <Card key={influencer.id} className="bg-[#14151A] border-[#2A2B32] hover:border-[#3A3B42] transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#1E1F26] flex items-center justify-center text-2xl overflow-hidden">
                      {influencer.avatarUrl ? (
                        <img src={influencer.avatarUrl} alt={influencer.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium truncate">{influencer.name}</h4>
                        <Badge className={status.className}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <PlatformIcon className="w-4 h-4 text-[#8A8A8A]" />
                        <span className="text-sm text-[#8A8A8A]">{platform}</span>
                        <span className="text-sm text-[#8A8A8A]">•</span>
                        <span className="text-sm text-[#8A8A8A]">{influencer.niche}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openExternalLink(influencer)}
                        title="Открыть профиль"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openDetailDialog(influencer)}
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => { setSelectedInfluencer(influencer); setIsDeleteDialogOpen(true); }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-[#1E1F26] rounded">
                      <p className="text-sm font-bold text-white">
                        {influencer.subscribersCount > 0 
                          ? `${(influencer.subscribersCount / 1000).toFixed(0)}K`
                          : '0'}
                      </p>
                      <p className="text-xs text-[#8A8A8A]">Подписчики</p>
                    </div>
                    <div className="p-2 bg-[#1E1F26] rounded">
                      <p className="text-sm font-bold text-[#6C63FF]">{influencer._count?.posts || 0}</p>
                      <p className="text-xs text-[#8A8A8A]">Постов</p>
                    </div>
                    <div className="p-2 bg-[#1E1F26] rounded">
                      <p className="text-sm font-bold text-[#FFB800]">{influencer.leadsCount}</p>
                      <p className="text-xs text-[#8A8A8A]">Лидов</p>
                    </div>
                    <div className="p-2 bg-[#1E1F26] rounded">
                      <p className="text-sm font-bold text-[#00D26A]">{influencer.revenue.toLocaleString()}₽</p>
                      <p className="text-xs text-[#8A8A8A]">Доход</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Диалог добавления */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Добавить инфлюенсера</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Заполните данные нового инфлюенсера
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {renderForm(false)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button className="bg-[#6C63FF]" onClick={handleAddInfluencer} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Редактировать инфлюенсера</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Измените данные инфлюенсера
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {renderForm(true)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => { setIsDetailDialogOpen(false); setIsDeleteDialogOpen(true); }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </Button>
            <Button className="bg-[#6C63FF]" onClick={handleUpdateInfluencer} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#14151A] border-[#2A2B32]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Удалить инфлюенсера?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8A8A8A]">
              Вы уверены, что хотите удалить <strong>{selectedInfluencer?.name}</strong>? 
              Это действие нельзя отменить. Все связанные данные (посты, комментарии, аналитика) будут также удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#2A2B32]">Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteInfluencer}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

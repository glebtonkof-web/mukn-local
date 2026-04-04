'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Target,
  Plus,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Loader2,
  AlertCircle,
  RefreshCw,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Offer {
  id: string;
  name: string;
  description?: string | null;
  network?: string | null;
  networkOfferId?: string | null;
  affiliateLink: string;
  niche?: string | null;
  geo?: string | null;
  payout: number;
  currency: string;
  status: string;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

interface OffersStats {
  total: number;
  active: number;
  totalClicks: number;
  totalLeads: number;
  totalRevenue: number;
}

interface OffersResponse {
  offers: Offer[];
  stats: OffersStats;
}

const OFFER_TYPES = [
  { value: 'crypto', label: 'Крипта' },
  { value: 'casino', label: 'Казино' },
  { value: 'dating', label: 'Дейтинг' },
  { value: 'nutra', label: 'Нутра' },
  { value: 'finance', label: 'Финансы' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'other', label: 'Другое' },
];

const CURRENCIES = [
  { value: 'USD', label: '$' },
  { value: 'RUB', label: '₽' },
  { value: 'EUR', label: '€' },
];

export function OffersView() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState<OffersStats>({
    total: 0,
    active: 0,
    totalClicks: 0,
    totalLeads: 0,
    totalRevenue: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Состояния для диалога создания/редактирования
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    network: '',
    affiliateLink: '',
    niche: '',
    geo: '',
    payout: 0,
    currency: 'USD',
  });

  // Состояние для диалога удаления
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);

  // Загрузка офферов
  const fetchOffers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/offers');

      if (!response.ok) {
        throw new Error('Не удалось загрузить офферы');
      }

      const data: OffersResponse = await response.json();
      setOffers(data.offers);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching offers:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке');
      toast.error('Не удалось загрузить офферы');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Фильтрация офферов
  const filteredOffers = offers.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.network?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (o.niche?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Переключение статуса
  const toggleStatus = async (offer: Offer) => {
    const newStatus = offer.status === 'active' ? 'paused' : 'active';
    setActionLoading(offer.id);

    try {
      const response = await fetch(`/api/offers/${offer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Не удалось изменить статус');
      }

      const data = await response.json();

      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, status: newStatus } : o))
      );

      setStats((prev) => ({
        ...prev,
        active: newStatus === 'active' ? prev.active + 1 : prev.active - 1,
      }));

      toast.success(`Оффер ${newStatus === 'active' ? 'активирован' : 'приостановлен'}`);
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error('Не удалось изменить статус оффера');
    } finally {
      setActionLoading(null);
    }
  };

  // Открытие диалога создания
  const openCreateDialog = () => {
    setEditingOffer(null);
    setFormData({
      name: '',
      description: '',
      network: '',
      affiliateLink: '',
      niche: '',
      geo: '',
      payout: 0,
      currency: 'USD',
    });
    setIsDialogOpen(true);
  };

  // Открытие диалога редактирования
  const openEditDialog = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      description: offer.description || '',
      network: offer.network || '',
      affiliateLink: offer.affiliateLink,
      niche: offer.niche || '',
      geo: offer.geo || '',
      payout: offer.payout,
      currency: offer.currency,
    });
    setIsDialogOpen(true);
  };

  // Создание/обновление оффера
  const handleSaveOffer = async () => {
    if (!formData.name.trim()) {
      toast.error('Введите название оффера');
      return;
    }

    if (!formData.affiliateLink.trim()) {
      toast.error('Введите партнёрскую ссылку');
      return;
    }

    setActionLoading('form');

    try {
      if (editingOffer) {
        // Обновление
        const response = await fetch(`/api/offers/${editingOffer.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Не удалось обновить оффер');
        }

        const data = await response.json();

        setOffers((prev) =>
          prev.map((o) => (o.id === editingOffer.id ? { ...o, ...formData } : o))
        );

        toast.success('Оффер обновлён');
      } else {
        // Создание
        const response = await fetch('/api/offers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            status: 'active',
          }),
        });

        if (!response.ok) {
          throw new Error('Не удалось создать оффер');
        }

        const data = await response.json();

        setOffers((prev) => [data.offer, ...prev]);
        setStats((prev) => ({
          ...prev,
          total: prev.total + 1,
          active: prev.active + 1,
        }));

        toast.success('Оффер создан');
      }

      setIsDialogOpen(false);
    } catch (err) {
      console.error('Error saving offer:', err);
      toast.error(
        editingOffer ? 'Не удалось обновить оффер' : 'Не удалось создать оффер'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Удаление оффера
  const handleDeleteOffer = async () => {
    if (!offerToDelete) return;

    setActionLoading(offerToDelete.id);

    try {
      const response = await fetch(`/api/offers/${offerToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Не удалось удалить оффер');
      }

      setOffers((prev) => prev.filter((o) => o.id !== offerToDelete.id));

      setStats((prev) => ({
        ...prev,
        total: prev.total - 1,
        active: offerToDelete.status === 'active' ? prev.active - 1 : prev.active,
      }));

      toast.success('Оффер удалён');
      setDeleteDialogOpen(false);
      setOfferToDelete(null);
    } catch (err) {
      console.error('Error deleting offer:', err);
      toast.error('Не удалось удалить оффер');
    } finally {
      setActionLoading(null);
    }
  };

  // Копирование ссылки
  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Ссылка скопирована');
  };

  // Получение символа валюты
  const getCurrencySymbol = (currency: string) => {
    return CURRENCIES.find((c) => c.value === currency)?.label || currency;
  };

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#6C63FF] animate-spin" />
          <p className="text-[#8A8A8A]">Загрузка офферов...</p>
        </div>
      </div>
    );
  }

  // Состояние ошибки
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-[#E4405F]" />
          <div>
            <h3 className="text-lg font-medium text-white">Ошибка загрузки</h3>
            <p className="text-[#8A8A8A]">{error}</p>
          </div>
          <Button onClick={fetchOffers} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-7 h-7 text-[#6C63FF]" />
            Офферы
          </h1>
          <p className="text-[#8A8A8A]">{stats.active} активных</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchOffers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          <Button className="bg-[#6C63FF]" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить оффер
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats.totalRevenue.toLocaleString()}₽
                </p>
                <p className="text-xs text-[#8A8A8A]">Общий доход</p>
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
                <p className="text-2xl font-bold text-white">
                  {stats.totalClicks.toLocaleString()}
                </p>
                <p className="text-xs text-[#8A8A8A]">Кликов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalLeads}</p>
                <p className="text-xs text-[#8A8A8A]">Лидов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E4405F]/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#E4405F]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-[#8A8A8A]">Офферов</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="py-4">
          <Input
            placeholder="Поиск офферов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#1E1F26] border-[#2A2B32]"
          />
        </CardContent>
      </Card>

      {/* Offers Grid */}
      {filteredOffers.length === 0 ? (
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <Target className="w-12 h-12 text-[#8A8A8A]" />
              <div>
                <h3 className="text-lg font-medium text-white">
                  {searchQuery ? 'Офферы не найдены' : 'Нет офферов'}
                </h3>
                <p className="text-[#8A8A8A]">
                  {searchQuery
                    ? 'Попробуйте изменить поисковый запрос'
                    : 'Добавьте первый оффер для начала работы'}
                </p>
              </div>
              {!searchQuery && (
                <Button className="bg-[#6C63FF]" onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить оффер
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOffers.map((offer) => (
            <Card
              key={offer.id}
              className={cn(
                'bg-[#14151A] border-[#2A2B32]',
                offer.status === 'active' && 'border-l-4 border-l-[#00D26A]'
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-white font-medium">{offer.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {offer.network && (
                        <Badge className="bg-[#6C63FF]/20 text-[#6C63FF]">
                          {offer.network}
                        </Badge>
                      )}
                      {offer.niche && (
                        <Badge className="bg-[#FFB800]/20 text-[#FFB800]">
                          {offer.niche}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        offer.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#8A8A8A]'
                      }
                    >
                      {offer.status === 'active' ? 'Активен' : 'Остановлен'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStatus(offer)}
                      disabled={actionLoading === offer.id}
                    >
                      {actionLoading === offer.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : offer.status === 'active' ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="p-2 bg-[#1E1F26] rounded">
                    <p className="text-sm font-bold text-white">{offer.clicks}</p>
                    <p className="text-xs text-[#8A8A8A]">Клики</p>
                  </div>
                  <div className="p-2 bg-[#1E1F26] rounded">
                    <p className="text-sm font-bold text-white">{offer.leads}</p>
                    <p className="text-xs text-[#8A8A8A]">Лиды</p>
                  </div>
                  <div className="p-2 bg-[#1E1F26] rounded">
                    <p className="text-sm font-bold text-[#00D26A]">
                      {offer.payout}
                      {getCurrencySymbol(offer.currency)}
                    </p>
                    <p className="text-xs text-[#8A8A8A]">Выплата</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#00D26A] font-bold text-lg">
                    {offer.revenue.toLocaleString()}₽
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(offer.affiliateLink)}
                      title="Копировать ссылку"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(offer.affiliateLink, '_blank')}
                      title="Открыть ссылку"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(offer)}
                      title="Редактировать"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1E1F26] border-[#2A2B32]">
                        <DropdownMenuItem
                          onClick={() => navigator.clipboard.writeText(offer.id)}
                          className="text-[#8A8A8A] focus:text-white"
                        >
                          Копировать ID
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleStatus(offer)}
                          className="text-[#8A8A8A] focus:text-white"
                        >
                          {offer.status === 'active' ? 'Остановить' : 'Активировать'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setOfferToDelete(offer);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-[#E4405F] focus:text-[#E4405F]"
                        >
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOffer ? 'Редактировать оффер' : 'Новый оффер'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Название оффера"
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="affiliateLink">Партнёрская ссылка *</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
                <Input
                  id="affiliateLink"
                  value={formData.affiliateLink}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      affiliateLink: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="bg-[#1E1F26] border-[#2A2B32] pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="network">Партнёрская сеть</Label>
                <Input
                  id="network"
                  value={formData.network}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, network: e.target.value }))
                  }
                  placeholder="Например: Admitad"
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="niche">Ниша</Label>
                <Select
                  value={formData.niche}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, niche: value }))
                  }
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectValue placeholder="Выберите нишу" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {OFFER_TYPES.map((type) => (
                      <SelectItem
                        key={type.value}
                        value={type.value}
                        className="focus:bg-[#2A2B32]"
                      >
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payout">Выплата</Label>
                <Input
                  id="payout"
                  type="number"
                  value={formData.payout}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      payout: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                  className="bg-[#1E1F26] border-[#2A2B32]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Валюта</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, currency: value }))
                  }
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {CURRENCIES.map((currency) => (
                      <SelectItem
                        key={currency.value}
                        value={currency.value}
                        className="focus:bg-[#2A2B32]"
                      >
                        {currency.label} ({currency.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="geo">GEO</Label>
              <Input
                id="geo"
                value={formData.geo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, geo: e.target.value }))
                }
                placeholder="Например: RU, UA, KZ"
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Описание оффера..."
                className="bg-[#1E1F26] border-[#2A2B32] min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={actionLoading === 'form'}
            >
              Отмена
            </Button>
            <Button
              className="bg-[#6C63FF]"
              onClick={handleSaveOffer}
              disabled={actionLoading === 'form'}
            >
              {actionLoading === 'form' && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingOffer ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#E4405F]">Удалить оффер?</DialogTitle>
          </DialogHeader>
          <p className="text-[#8A8A8A] py-4">
            Вы уверены, что хотите удалить оффер "{offerToDelete?.name}"? Это
            действие нельзя отменить.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={actionLoading === offerToDelete?.id}
            >
              Отмена
            </Button>
            <Button
              className="bg-[#E4405F]"
              onClick={handleDeleteOffer}
              disabled={actionLoading === offerToDelete?.id}
            >
              {actionLoading === offerToDelete?.id && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

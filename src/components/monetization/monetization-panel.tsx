'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  DollarSign,
  ShoppingCart,
  Users,
  FileText,
  Star,
  Zap,
  Crown,
  Target,
  Wallet,
  RefreshCw,
  Shield,
  Sparkles,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== ТИПЫ ====================

interface ROISubscription {
  id: string;
  subscriptionType: string;
  commissionRate: number;
  trackerType?: string;
  trackerUrl?: string;
  totalLeads: number;
  totalRevenue: number;
  commissionEarned: number;
  status: string;
  lastSyncAt?: Date;
}

interface MarketplaceListing {
  id: string;
  bundleId: string;
  sellerName?: string;
  category: string;
  price: number;
  currency: string;
  salesCount: number;
  avgRating: number;
  isFeatured: boolean;
  isVerified: boolean;
}

interface AccountForSale {
  id: string;
  platform: string;
  niche?: string;
  warmingProgress: number;
  warmingComplete: boolean;
  salePrice: number;
  currency: string;
  status: string;
}

interface PartnerOffer {
  id: string;
  network: string;
  category: string;
  basePayout: number;
  ourPayout: number;
  geo?: string;
  isHot: boolean;
  isFeatured: boolean;
  popularity: number;
  avgROI: number;
}

interface LegalTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  currency: string;
  salesCount: number;
}

// ==================== КОМПОНЕНТЫ ====================

// Блок ROI-подписки
function SubscriptionBlock() {
  const [subscription, setSubscription] = useState<ROISubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/monetization/subscription');
      const data = await res.json();
      if (data.success) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/monetization/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Синхронизировано с трекером');
        setSubscription(data.subscription);
      }
    } catch (error) {
      toast.error('Ошибка синхронизации');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="p-6">
          <div className="h-32 animate-pulse bg-[#1E1F26] rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#00D26A]" />
              ROI-подписка
            </CardTitle>
            <CardDescription>
              Платите только когда зарабатываете
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigOpen(true)}
              className="border-[#2A2B32]"
            >
              Настройки
            </Button>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="bg-[#00D26A] hover:bg-[#00D26A]/80"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Синхронизировать
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[#1E1F26] rounded-lg">
              <p className="text-sm text-[#8A8A8A]">Комиссия</p>
              <p className="text-2xl font-bold text-white">
                {((subscription?.commissionRate || 0.05) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-[#8A8A8A]">от слитого трафика</p>
            </div>
            <div className="p-4 bg-[#1E1F26] rounded-lg">
              <p className="text-sm text-[#8A8A8A]">Лидов за период</p>
              <p className="text-2xl font-bold text-[#00D26A]">
                {subscription?.totalLeads || 0}
              </p>
            </div>
            <div className="p-4 bg-[#1E1F26] rounded-lg">
              <p className="text-sm text-[#8A8A8A]">Доход за период</p>
              <p className="text-2xl font-bold text-white">
                ${(subscription?.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-[#1E1F26] rounded-lg">
              <p className="text-sm text-[#8A8A8A]">Заработано комиссии</p>
              <p className="text-2xl font-bold text-[#FFB800]">
                ${(subscription?.commissionEarned || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {subscription?.trackerType && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline" className="border-[#00D26A] text-[#00D26A]">
                {subscription.trackerType.toUpperCase()}
              </Badge>
              <span className="text-sm text-[#8A8A8A]">
                Последняя синхронизация: {subscription.lastSyncAt ? new Date(subscription.lastSyncAt).toLocaleString('ru-RU') : 'никогда'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>Настройки подписки</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Подключите трекер для автоматического расчёта комиссии
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Тип подписки</Label>
              <Select defaultValue="roi_based">
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roi_based">% от ROI</SelectItem>
                  <SelectItem value="fixed">Фиксированная</SelectItem>
                  <SelectItem value="hybrid">Гибридная</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Трекер</Label>
              <Select>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectValue placeholder="Выберите трекер" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keitaro">Keitaro</SelectItem>
                  <SelectItem value="binom">Binom</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API URL трекера</Label>
              <Input
                placeholder="https://tracker.example.com/api"
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Введите API ключ"
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Отмена
            </Button>
            <Button className="bg-[#6C63FF]" onClick={() => setConfigOpen(false)}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Маркетплейс связок
function MarketplaceBlock() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);

  useEffect(() => {
    fetchListings();
  }, [selectedCategory]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/monetization/marketplace?category=${selectedCategory}`);
      const data = await res.json();
      if (data.success) {
        setListings(data.listings);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedListing) return;
    try {
      const res = await fetch('/api/monetization/marketplace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: selectedListing.id, buyerId: 'default' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Связка успешно куплена!');
        setPurchaseOpen(false);
      }
    } catch (error) {
      toast.error('Ошибка покупки');
    }
  };

  const categoryColors: Record<string, string> = {
    gambling: '#FF4D4D',
    crypto: '#FFB800',
    nutra: '#00D26A',
    dating: '#FF6B9D',
    finance: '#00D4AA',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-[#1E1F26] rounded-lg p-1 flex-wrap">
          {['all', 'gambling', 'crypto', 'nutra', 'dating', 'finance'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                selectedCategory === cat
                  ? 'bg-[#6C63FF] text-white'
                  : 'text-[#8A8A8A] hover:text-white'
              )}
            >
              {cat === 'all' ? 'Все' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
        <Button className="bg-[#6C63FF]">
          <Sparkles className="w-4 h-4 mr-2" />
          Продать связку
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-[#1E1F26] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card className="bg-[#14151A] border-[#2A2B32] p-8 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
          <p className="text-[#8A8A8A]">Нет связок в этой категории</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <Card
              key={listing.id}
              className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedListing(listing);
                setPurchaseOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge
                    style={{
                      backgroundColor: `${categoryColors[listing.category] || '#6C63FF'}20`,
                      color: categoryColors[listing.category] || '#6C63FF',
                    }}
                  >
                    {listing.category}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {listing.isVerified && (
                      <Shield className="w-4 h-4 text-[#00D26A]" />
                    )}
                    {listing.isFeatured && (
                      <Star className="w-4 h-4 text-[#FFB800]" fill="#FFB800" />
                    )}
                  </div>
                </div>
                <h3 className="font-medium text-white mb-2">
                  Связка #{listing.bundleId.slice(0, 8)}
                </h3>
                <p className="text-sm text-[#8A8A8A] mb-3">
                  Продавец: {listing.sellerName || 'Аноним'}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">
                      {listing.price} {listing.currency}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-[#8A8A8A]">
                      <Star className="w-3 h-3" fill="#FFB800" />
                      {listing.avgRating.toFixed(1)} · {listing.salesCount} продаж
                    </div>
                  </div>
                  <Button size="sm" className="bg-[#00D26A]">
                    Купить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>Купить связку</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Вы получите полную конфигурацию кампании после оплаты
            </DialogDescription>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-[#1E1F26] rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-[#8A8A8A]">Цена</span>
                  <span className="text-white font-medium">
                    {selectedListing.price} {selectedListing.currency}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-[#8A8A8A]">Комиссия платформы (20%)</span>
                  <span className="text-white">
                    {selectedListing.price * 0.2} {selectedListing.currency}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#2A2B32]">
                  <span className="text-white font-medium">Итого</span>
                  <span className="text-[#00D26A] font-bold">
                    {selectedListing.price} {selectedListing.currency}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseOpen(false)}>
              Отмена
            </Button>
            <Button className="bg-[#00D26A]" onClick={handlePurchase}>
              Купить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Продажа аккаунтов
function AccountsBlock() {
  const [accounts, setAccounts] = useState<AccountForSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/monetization/accounts?status=available');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async (platform: string, quantity: number) => {
    try {
      const res = await fetch('/api/monetization/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          quantity,
          warmingDays: 3,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchAccounts();
      }
    } catch (error) {
      toast.error('Ошибка заказа');
    }
  };

  const platformIcons: Record<string, string> = {
    telegram: '📱',
    instagram: '📷',
    tiktok: '🎵',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4 text-center">
            <span className="text-4xl">📱</span>
            <h3 className="font-medium text-white mt-2">Telegram</h3>
            <p className="text-sm text-[#8A8A8A] mb-3">Прогретые аккаунты</p>
            <Button
              className="w-full bg-[#0088cc] hover:bg-[#0088cc]/80"
              onClick={() => handleOrder('telegram', 10)}
            >
              Заказать 10 шт.
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4 text-center">
            <span className="text-4xl">📷</span>
            <h3 className="font-medium text-white mt-2">Instagram</h3>
            <p className="text-sm text-[#8A8A8A] mb-3">Прогретые аккаунты</p>
            <Button
              className="w-full bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#dc2743]"
              onClick={() => handleOrder('instagram', 10)}
            >
              Заказать 10 шт.
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4 text-center">
            <span className="text-4xl">🎵</span>
            <h3 className="font-medium text-white mt-2">TikTok</h3>
            <p className="text-sm text-[#8A8A8A] mb-3">Прогретые аккаунты</p>
            <Button
              className="w-full bg-black border border-white/20"
              onClick={() => handleOrder('tiktok', 10)}
            >
              Заказать 10 шт.
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white text-lg">Доступные аккаунты</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-[#1E1F26] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-[#8A8A8A]">
              <Users className="w-12 h-12 mx-auto opacity-50 mb-2" />
              <p>Нет доступных аккаунтов</p>
              <p className="text-sm">Закажите прогрев выше</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 bg-[#1E1F26] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{platformIcons[account.platform]}</span>
                      <div>
                        <p className="font-medium text-white">{account.platform}</p>
                        <p className="text-sm text-[#8A8A8A]">
                          {account.niche || 'Универсальный'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">
                        ${account.salePrice}
                      </p>
                      <div className="flex items-center gap-2">
                        <Progress value={account.warmingProgress} className="w-16 h-1" />
                        <span className="text-xs text-[#8A8A8A]">
                          {account.warmingProgress}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Партнёрские офферы
function PartnersBlock() {
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const res = await fetch('/api/monetization/partners');
      const data = await res.json();
      if (data.success) {
        setOffers(data.offers);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-[#FFB800]/20 to-[#FF4D4D]/20 border-[#FFB800]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-6 h-6 text-[#FFB800]" />
              <h3 className="font-medium text-white">Горячие офферы</h3>
            </div>
            <p className="text-sm text-[#8A8A8A] mb-3">
              Партнёрки с повышенными ставками и мягкой модерацией
            </p>
            <Button className="w-full bg-[#FFB800] text-black">
              Смотреть все
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#6C63FF]/20 to-[#00D26A]/20 border-[#6C63FF]/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Crown className="w-6 h-6 text-[#6C63FF]" />
              <h3 className="font-medium text-white">Топ месяца</h3>
            </div>
            <p className="text-sm text-[#8A8A8A] mb-3">
              Офферы с лучшим ROI за последние 30 дней
            </p>
            <Button className="w-full bg-[#6C63FF]">
              Смотреть все
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-[#00D26A]" />
            Доступные офферы
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-[#1E1F26] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-8 text-[#8A8A8A]">
              <Briefcase className="w-12 h-12 mx-auto opacity-50 mb-2" />
              <p>Нет доступных офферов</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="flex items-center justify-between p-3 bg-[#1E1F26] rounded-lg hover:bg-[#2A2B32] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{offer.network}</p>
                          {offer.isHot && (
                            <Badge className="bg-[#FF4D4D] text-white text-xs">HOT</Badge>
                          )}
                          {offer.isFeatured && (
                            <Badge className="bg-[#FFB800] text-black text-xs">TOP</Badge>
                          )}
                        </div>
                        <p className="text-sm text-[#8A8A8A]">
                          {offer.category} · {offer.geo || 'Worldwide'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#00D26A]">
                        ${offer.ourPayout}
                      </p>
                      <p className="text-xs text-[#8A8A8A]">
                        База: ${offer.basePayout}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Юридические шаблоны
function TemplatesBlock() {
  const [templates, setTemplates] = useState<LegalTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/monetization/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    disclaimer: 'Дисклеймеры',
    privacy: 'Политика конфиденциальности',
    terms: 'Условия использования',
    compliance: 'Соответствие законодательству',
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#6C63FF]" />
            Юридические шаблоны
          </CardTitle>
          <CardDescription>
            Готовые документы для «обеления» схем
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-[#1E1F26] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-[#8A8A8A]">
              <FileText className="w-12 h-12 mx-auto opacity-50 mb-2" />
              <p>Нет доступных шаблонов</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 bg-[#1E1F26] rounded-lg hover:bg-[#2A2B32] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
                      {categoryLabels[template.category] || template.category}
                    </Badge>
                    <span className="text-[#FFB800] font-bold">
                      ${template.price}
                    </span>
                  </div>
                  <h4 className="font-medium text-white mb-1">{template.name}</h4>
                  <p className="text-sm text-[#8A8A8A] mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8A8A8A]">
                      {template.salesCount} продаж
                    </span>
                    <Button size="sm" className="bg-[#6C63FF]">
                      Купить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function MonetizationPanel() {
  const [activeTab, setActiveTab] = useState('subscription');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Монетизация</h1>
          <p className="text-[#8A8A8A]">Инструменты для заработка на платформе</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#00D26A]/20 text-[#00D26A]">
            <Wallet className="w-3 h-3 mr-1" />
            Баланс: $0.00
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32] flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="subscription" className="data-[state=active]:bg-[#6C63FF]">
            <DollarSign className="w-4 h-4 mr-2" />
            ROI-подписка
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="data-[state=active]:bg-[#6C63FF]">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Маркетплейс
          </TabsTrigger>
          <TabsTrigger value="accounts" className="data-[state=active]:bg-[#6C63FF]">
            <Users className="w-4 h-4 mr-2" />
            Аккаунты
          </TabsTrigger>
          <TabsTrigger value="partners" className="data-[state=active]:bg-[#6C63FF]">
            <Briefcase className="w-4 h-4 mr-2" />
            Партнёрки
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-[#6C63FF]">
            <FileText className="w-4 h-4 mr-2" />
            Шаблоны
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="mt-6">
          <SubscriptionBlock />
        </TabsContent>

        <TabsContent value="marketplace" className="mt-6">
          <MarketplaceBlock />
        </TabsContent>

        <TabsContent value="accounts" className="mt-6">
          <AccountsBlock />
        </TabsContent>

        <TabsContent value="partners" className="mt-6">
          <PartnersBlock />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesBlock />
        </TabsContent>
      </Tabs>
    </div>
  );
}

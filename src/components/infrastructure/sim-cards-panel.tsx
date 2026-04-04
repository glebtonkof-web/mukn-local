'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Plus,
  Trash2,
  Edit,
  Loader2,
  RefreshCw,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Signal,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Типы
interface SimCard {
  id: string;
  phoneNumber: string;
  operator: string;
  country: string;
  status: string;
  purchaseDate: Date | null;
  purchasePrice: number | null;
  notes: string | null;
  createdAt: Date;
  accounts?: Array<{ id: string; platform: string; username: string }>;
  influencers?: Array<{ id: string; name: string; status: string }>;
}

interface SimCardsPanelProps {
  onStatsChange?: (stats: { total: number; available: number; inUse: number }) => void;
}

const STATUS_CONFIG = {
  available: { label: 'Доступна', color: '#00D26A', icon: CheckCircle },
  in_use: { label: 'Используется', color: '#6C63FF', icon: Signal },
  blocked: { label: 'Заблокирована', color: '#FF4D4D', icon: XCircle },
  expired: { label: 'Истекла', color: '#8A8A8A', icon: AlertTriangle },
};

const OPERATORS = [
  { id: 'mts', label: 'МТС', country: 'RU' },
  { id: 'beeline', label: 'Билайн', country: 'RU' },
  { id: 'megafon', label: 'Мегафон', country: 'RU' },
  { id: 'tele2', label: 'Tele2', country: 'RU' },
  { id: 'yota', label: 'Yota', country: 'RU' },
  { id: 'other', label: 'Другой', country: 'RU' },
];

export function SimCardsPanel({ onStatsChange }: SimCardsPanelProps) {
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, inUse: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSimCard, setEditingSimCard] = useState<SimCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Форма
  const [formData, setFormData] = useState({
    phoneNumber: '',
    operator: 'mts',
    country: 'RU',
    purchaseDate: '',
    purchasePrice: '',
    notes: '',
  });

  // Загрузка SIM-карт
  const loadSimCards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sim-cards');
      if (response.ok) {
        const data = await response.json();
        setSimCards(data.simCards || []);
        setStats(data.stats || { total: 0, available: 0, inUse: 0, blocked: 0 });

        if (onStatsChange) {
          onStatsChange({
            total: data.stats?.total || 0,
            available: data.stats?.available || 0,
            inUse: data.stats?.inUse || 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load SIM cards:', error);
      toast.error('Ошибка загрузки SIM-карт');
    } finally {
      setLoading(false);
    }
  }, [onStatsChange]);

  useEffect(() => {
    loadSimCards();
  }, [loadSimCards]);

  // Сохранение SIM-карты
  const handleSave = async () => {
    if (!formData.phoneNumber) {
      toast.error('Укажите номер телефона');
      return;
    }

    setSaving(true);
    try {
      const url = '/api/sim-cards';
      const method = editingSimCard ? 'PUT' : 'POST';

      const body = editingSimCard
        ? { id: editingSimCard.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingSimCard ? 'SIM-карта обновлена' : 'SIM-карта добавлена');
        setDialogOpen(false);
        resetForm();
        loadSimCards();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Ошибка сохранения');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  // Удаление SIM-карты
  const handleDelete = async (id: string) => {
    if (!confirm('Удалить SIM-карту?')) return;

    try {
      const response = await fetch(`/api/sim-cards?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('SIM-карта удалена');
        loadSimCards();
      } else {
        toast.error('Ошибка удаления');
      }
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  // Сброс формы
  const resetForm = () => {
    setFormData({
      phoneNumber: '',
      operator: 'mts',
      country: 'RU',
      purchaseDate: '',
      purchasePrice: '',
      notes: '',
    });
    setEditingSimCard(null);
  };

  // Открытие диалога редактирования
  const openEditDialog = (simCard: SimCard) => {
    setEditingSimCard(simCard);
    setFormData({
      phoneNumber: simCard.phoneNumber,
      operator: simCard.operator || 'mts',
      country: simCard.country || 'RU',
      purchaseDate: simCard.purchaseDate ? new Date(simCard.purchaseDate).toISOString().split('T')[0] : '',
      purchasePrice: simCard.purchasePrice?.toString() || '',
      notes: simCard.notes || '',
    });
    setDialogOpen(true);
  };

  // Фильтрация
  const filteredSimCards = filter === 'all'
    ? simCards
    : simCards.filter(s => s.status === filter);

  return (
    <div className="space-y-4">
      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-[#8A8A8A]">Всего</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.available}</p>
                <p className="text-xs text-[#8A8A8A]">Доступно</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Signal className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.inUse}</p>
                <p className="text-xs text-[#8A8A8A]">В использовании</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF4D4D]/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-[#FF4D4D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.blocked}</p>
                <p className="text-xs text-[#8A8A8A]">Заблокировано</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Заголовок и фильтры */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSimCards}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Обновить
          </Button>
          <div className="flex bg-[#1E1F26] rounded-lg p-1">
            {[
              { id: 'all', label: 'Все' },
              { id: 'available', label: 'Доступные' },
              { id: 'in_use', label: 'В использовании' },
              { id: 'blocked', label: 'Заблокированные' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  filter === f.id
                    ? 'bg-[#6C63FF] text-white'
                    : 'text-[#8A8A8A] hover:text-white'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить SIM
        </Button>
      </div>

      {/* Список SIM-карт */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
        </div>
      ) : filteredSimCards.length === 0 ? (
        <Card className="bg-[#14151A] border-[#2A2B32] p-12 text-center">
          <Smartphone className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Нет SIM-карт</h3>
          <p className="text-[#8A8A8A] mb-6">Добавьте первую SIM-карту для начала работы</p>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить SIM
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSimCards.map((simCard) => {
            const statusConfig = STATUS_CONFIG[simCard.status as keyof typeof STATUS_CONFIG] ||
              { label: simCard.status, color: '#8A8A8A', icon: AlertTriangle };
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={simCard.id} className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-[#6C63FF]" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-sm">{simCard.phoneNumber}</CardTitle>
                        <CardDescription className="text-xs">
                          {simCard.operator} • {simCard.country}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(simCard)}
                        className="h-8 w-8 text-[#8A8A8A] hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(simCard.id)}
                        className="h-8 w-8 text-[#8A8A8A] hover:text-[#FF4D4D]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Статус */}
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: statusConfig.color, color: statusConfig.color }}
                  >
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>

                  {/* Привязанные аккаунты */}
                  {simCard.accounts && simCard.accounts.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-[#8A8A8A]">Привязанные аккаунты:</p>
                      <div className="flex flex-wrap gap-1">
                        {simCard.accounts.map((acc) => (
                          <Badge key={acc.id} variant="secondary" className="text-xs">
                            {acc.platform}: {acc.username}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Цена и дата */}
                  <div className="flex items-center justify-between text-xs text-[#8A8A8A] pt-2 border-t border-[#2A2B32]">
                    {simCard.purchasePrice && (
                      <span>{simCard.purchasePrice} ₽</span>
                    )}
                    {simCard.purchaseDate && (
                      <span>{new Date(simCard.purchaseDate).toLocaleDateString('ru-RU')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Диалог добавления/редактирования */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>{editingSimCard ? 'Редактировать SIM-карту' : 'Добавить SIM-карту'}</DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              Введите данные SIM-карты
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Номер телефона *</Label>
              <Input
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="+79991234567"
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Оператор</Label>
                <Select
                  value={formData.operator}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, operator: v }))}
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.id} value={op.id}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Страна</Label>
                <Select
                  value={formData.country}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, country: v }))}
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectItem value="RU">Россия</SelectItem>
                    <SelectItem value="UA">Украина</SelectItem>
                    <SelectItem value="BY">Беларусь</SelectItem>
                    <SelectItem value="KZ">Казахстан</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Дата покупки</Label>
                <Input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#8A8A8A]">Цена (₽)</Label>
                <Input
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                  placeholder="500"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#8A8A8A]">Заметки</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Дополнительная информация"
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingSimCard ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

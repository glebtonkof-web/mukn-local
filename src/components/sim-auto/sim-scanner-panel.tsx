'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Smartphone,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Signal,
  DollarSign,
  MapPin,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SimCard {
  id: string;
  phoneNumber: string;
  operator: string;
  country: string;
  status: 'available' | 'in_use' | 'registered' | 'error';
  registeredPlatforms: string[];
  balance: number;
  detectedAt: Date | string;
}

interface SimScannerPanelProps {
  onScanComplete?: (sims: SimCard[]) => void;
  disabled?: boolean;
}

export function SimScannerPanel({ onScanComplete, disabled }: SimScannerPanelProps) {
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  const scanSimCards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sim-auto/full-auto', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      });

      if (!response.ok) throw new Error('Ошибка сканирования');

      const data = await response.json();
      setSimCards(data.sims || []);
      setLastScan(new Date());
      onScanComplete?.(data.sims || []);
      toast.success(`Найдено ${data.sims?.length || 0} SIM-карт`);
    } catch (error) {
      console.error('Error scanning SIM cards:', error);
      toast.error('Ошибка сканирования SIM-карт');
    } finally {
      setLoading(false);
    }
  }, [onScanComplete]);

  const getStatusColor = (status: SimCard['status']) => {
    switch (status) {
      case 'available': return 'bg-[#00D26A]';
      case 'in_use': return 'bg-[#FFB800]';
      case 'registered': return 'bg-[#6C63FF]';
      case 'error': return 'bg-[#FF4D4D]';
      default: return 'bg-[#8A8A8A]';
    }
  };

  const getStatusLabel = (status: SimCard['status']) => {
    switch (status) {
      case 'available': return 'Доступна';
      case 'in_use': return 'В использовании';
      case 'registered': return 'Зарегистрирована';
      case 'error': return 'Ошибка';
      default: return status;
    }
  };

  const getOperatorColor = (operator: string) => {
    const colors: Record<string, string> = {
      'МТС': 'text-[#E42313]',
      'Билайн': 'text-[#FFD800]',
      'Мегафон': 'text-[#009B3A]',
      'Tele2': 'text-[#1E1E1E]',
      'Yota': 'text-[#00BFFF]',
    };
    return colors[operator] || 'text-white';
  };

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#6C63FF]" />
              SIM-карты
            </CardTitle>
            <CardDescription className="text-[#8A8A8A]">
              Обнаруженные SIM-карты для регистрации
            </CardDescription>
          </div>
          <Button
            onClick={scanSimCards}
            disabled={loading || disabled}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Сканировать
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="bg-[#1E1F26] rounded-lg p-3">
            <div className="text-xs text-[#8A8A8A] mb-1">Всего</div>
            <div className="text-xl font-bold text-white">{simCards.length}</div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3">
            <div className="text-xs text-[#8A8A8A] mb-1">Доступно</div>
            <div className="text-xl font-bold text-[#00D26A]">
              {simCards.filter(s => s.status === 'available').length}
            </div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3">
            <div className="text-xs text-[#8A8A8A] mb-1">Зарегистрировано</div>
            <div className="text-xl font-bold text-[#6C63FF]">
              {simCards.filter(s => s.status === 'registered').length}
            </div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3">
            <div className="text-xs text-[#8A8A8A] mb-1">Общий баланс</div>
            <div className="text-xl font-bold text-[#FFB800]">
              {simCards.reduce((sum, s) => sum + s.balance, 0)} ₽
            </div>
          </div>
        </div>

        {/* SIM List */}
        <ScrollArea className="h-[300px]">
          {simCards.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-[#2A2B32] hover:bg-transparent">
                  <TableHead className="text-[#8A8A8A]">Номер</TableHead>
                  <TableHead className="text-[#8A8A8A]">Оператор</TableHead>
                  <TableHead className="text-[#8A8A8A]">Статус</TableHead>
                  <TableHead className="text-[#8A8A8A]">Платформы</TableHead>
                  <TableHead className="text-[#8A8A8A]">Баланс</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simCards.map((sim) => (
                  <TableRow key={sim.id} className="border-[#2A2B32]">
                    <TableCell className="text-white font-mono">
                      {sim.phoneNumber}
                    </TableCell>
                    <TableCell>
                      <span className={cn('font-medium', getOperatorColor(sim.operator))}>
                        {sim.operator}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'text-white',
                          getStatusColor(sim.status)
                        )}
                      >
                        {getStatusLabel(sim.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sim.registeredPlatforms.length > 0 ? (
                          sim.registeredPlatforms.map((platform) => (
                            <Badge
                              key={platform}
                              variant="outline"
                              className="border-[#6C63FF] text-[#6C63FF] text-xs"
                            >
                              {platform}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[#8A8A8A] text-sm">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#FFB800]">
                      {sim.balance} ₽
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#8A8A8A] py-12">
              <Smartphone className="w-12 h-12 mb-4 opacity-50" />
              <p>SIM-карты не обнаружены</p>
              <p className="text-sm mt-2">Нажмите "Сканировать" для поиска</p>
            </div>
          )}
        </ScrollArea>

        {/* Last scan info */}
        {lastScan && (
          <div className="mt-4 text-xs text-[#8A8A8A] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Последнее сканирование: {lastScan.toLocaleTimeString('ru-RU')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SimScannerPanel;

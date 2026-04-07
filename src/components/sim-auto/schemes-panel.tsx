'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp,
  DollarSign,
  Shield,
  Play,
  Pause,
  CheckCircle,
  Loader2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Scheme {
  id: string;
  name: string;
  platform: string;
  category: string;
  expectedRevenue: number;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'active' | 'paused' | 'completed';
  accounts: string[];
  score: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  totalRevenue: number;
  conversionRate: number;
}

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: '📷',
  TikTok: '🎵',
  Telegram: '✈️',
  X: '𝕏',
  YouTube: '▶️',
};

const CATEGORY_COLORS: Record<string, string> = {
  crypto: 'bg-orange-500/20 text-orange-400',
  casino: 'bg-purple-500/20 text-purple-400',
  nutra: 'bg-green-500/20 text-green-400',
  content: 'bg-blue-500/20 text-blue-400',
  dating: 'bg-pink-500/20 text-pink-400',
};

const RISK_COLORS = {
  low: 'text-[#00D26A]',
  medium: 'text-[#FFB800]',
  high: 'text-[#FF4D4D]',
};

const RISK_BG = {
  low: 'bg-[#00D26A]/20',
  medium: 'bg-[#FFB800]/20',
  high: 'bg-[#FF4D4D]/20',
};

export function SchemesPanel() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);

  useEffect(() => {
    fetchSchemes();
    const interval = setInterval(fetchSchemes, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSchemes = async () => {
    try {
      const response = await fetch('/api/sim-auto/profit');
      if (response.ok) {
        const data = await response.json();
        setSchemes(data.schemes || []);
      }
    } catch (error) {
      console.error('Error fetching schemes:', error);
    }
  };

  const toggleScheme = async (schemeId: string, currentStatus: string) => {
    setLoading(true);
    try {
      const action = currentStatus === 'active' ? 'pause' : 'apply';
      const response = await fetch('/api/sim-auto/profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, schemeId }),
      });

      if (!response.ok) throw new Error('Ошибка');

      toast.success(
        currentStatus === 'active' ? 'Схема приостановлена' : 'Схема активирована'
      );
      fetchSchemes();
    } catch (error) {
      toast.error('Ошибка изменения статуса схемы');
    } finally {
      setLoading(false);
    }
  };

  const applyTop50 = async () => {
    setApplyingAll(true);
    try {
      const pendingSchemes = schemes
        .filter(s => s.status === 'pending')
        .slice(0, 50);

      let applied = 0;
      for (const scheme of pendingSchemes) {
        const response = await fetch('/api/sim-auto/profit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'apply', schemeId: scheme.id }),
        });
        if (response.ok) applied++;
      }

      toast.success(`Применено ${applied} схем`);
      fetchSchemes();
    } catch (error) {
      toast.error('Ошибка применения схем');
    } finally {
      setApplyingAll(false);
    }
  };

  // Sort schemes by score
  const sortedSchemes = [...schemes].sort((a, b) => b.score - a.score);

  // Stats
  const stats = {
    total: schemes.length,
    active: schemes.filter(s => s.status === 'active').length,
    pending: schemes.filter(s => s.status === 'pending').length,
    paused: schemes.filter(s => s.status === 'paused').length,
    totalDailyRevenue: schemes
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + s.dailyRevenue, 0),
  };

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00D26A]" />
              Схемы монетизации
            </CardTitle>
            <CardDescription className="text-[#8A8A8A]">
              Ранжированные схемы по эффективности
            </CardDescription>
          </div>
          {stats.pending > 0 && (
            <Button
              onClick={applyTop50}
              disabled={applyingAll}
              className="bg-[#00D26A] hover:bg-[#00D26A]/80"
            >
              {applyingAll ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Применить ТОП-50
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-[#8A8A8A]">Всего схем</div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[#00D26A]">{stats.active}</div>
            <div className="text-xs text-[#8A8A8A]">Активных</div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[#8A8A8A]">{stats.pending}</div>
            <div className="text-xs text-[#8A8A8A]">Ожидают</div>
          </div>
          <div className="bg-[#1E1F26] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[#FFB800]">
              {stats.totalDailyRevenue.toLocaleString()}₽
            </div>
            <div className="text-xs text-[#8A8A8A]">В день</div>
          </div>
        </div>

        {/* Schemes List */}
        <ScrollArea className="h-[450px]">
          {sortedSchemes.length > 0 ? (
            <div className="space-y-2">
              {sortedSchemes.map((scheme, index) => (
                <div
                  key={scheme.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    'bg-[#1E1F26] border-[#2A2B32]',
                    scheme.status === 'active' && 'border-[#00D26A]/30',
                    index < 3 && 'ring-1 ring-[#FFB800]/50'
                  )}
                >
                  {/* Rank */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm',
                    index === 0 && 'bg-yellow-500 text-black',
                    index === 1 && 'bg-gray-400 text-black',
                    index === 2 && 'bg-amber-700 text-white',
                    index > 2 && 'bg-[#2A2B32] text-[#8A8A8A]'
                  )}>
                    {index + 1}
                  </div>

                  {/* Platform & Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{PLATFORM_ICONS[scheme.platform] || '📱'}</span>
                      <span className="font-medium text-white truncate">{scheme.name}</span>
                      <Badge className={cn('text-xs', CATEGORY_COLORS[scheme.category] || 'bg-gray-500/20')}>
                        {scheme.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#8A8A8A]">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ~{scheme.expectedRevenue.toLocaleString()}₽/мес
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {scheme.conversionRate}% конверсия
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span className={RISK_COLORS[scheme.riskLevel]}>
                          {scheme.riskLevel === 'low' ? 'Низкий' : 
                           scheme.riskLevel === 'medium' ? 'Средний' : 'Высокий'} риск
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-center shrink-0">
                    <div className="text-lg font-bold text-[#FFB800]">{scheme.score}</div>
                    <div className="text-xs text-[#8A8A8A]">Score</div>
                  </div>

                  {/* Revenue */}
                  {scheme.status === 'active' && (
                    <div className="text-center shrink-0">
                      <div className="text-lg font-bold text-[#00D26A]">
                        {scheme.dailyRevenue.toLocaleString()}₽
                      </div>
                      <div className="text-xs text-[#8A8A8A]">Сегодня</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="shrink-0">
                    {scheme.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleScheme(scheme.id, scheme.status)}
                        disabled={loading}
                        className="border-[#FFB800] text-[#FFB800] hover:bg-[#FFB800]/10"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    ) : scheme.status === 'paused' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleScheme(scheme.id, scheme.status)}
                        disabled={loading}
                        className="border-[#00D26A] text-[#00D26A] hover:bg-[#00D26A]/10"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => toggleScheme(scheme.id, scheme.status)}
                        disabled={loading}
                        className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Применить
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Active Indicator */}
                  {scheme.status === 'active' && (
                    <CheckCircle className="w-5 h-5 text-[#00D26A] shrink-0" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#8A8A8A] py-12">
              <TrendingUp className="w-12 h-12 mb-4 opacity-50" />
              <p>Схемы не найдены</p>
              <p className="text-sm mt-2">Запустите полный автозапуск для анализа</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default SchemesPanel;

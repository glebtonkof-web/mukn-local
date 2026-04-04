'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, Search, Zap, Target, MessageSquare, 
  Star, CheckCircle, AlertTriangle, Play, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Типы данных
type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

interface TrafficMethod {
  id: number;
  name: string;
  risk: RiskLevel;
  category: string;
}

interface PlatformMethods {
  name: string;
  icon: React.ElementType;
  color: string;
  methods: (TrafficMethod & { platform: string })[];
}

interface ApiResponse {
  methods: Record<string, TrafficMethod[]>;
  totalMethods: number;
  categories: string[];
  counts: Record<string, number>;
}

// Маппинг категорий API на отображаемые платформы
const categoryConfig: Record<string, { name: string; color: string }> = {
  telegram: { name: 'Telegram', color: '#0088cc' },
  instagram: { name: 'Instagram', color: '#E4405F' },
  tiktok: { name: 'TikTok', color: '#000000' },
  cross_platform: { name: 'Cross-Platform', color: '#6C63FF' },
  ai_powered: { name: 'AI Powered', color: '#FFB800' },
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'low': return 'bg-[#00D26A]';
    case 'medium': return 'bg-[#FFB800]';
    case 'high': return 'bg-[#FF4D4D]';
    case 'extreme': return 'bg-[#8B0000]';
    default: return 'bg-[#8A8A8A]';
  }
};

const getRiskLabel = (risk: string) => {
  switch (risk) {
    case 'low': return 'Низкий';
    case 'medium': return 'Средний';
    case 'high': return 'Высокий';
    case 'extreme': return 'Экстремальный';
    default: return risk;
  }
};

export function TrafficView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [activeMethods, setActiveMethods] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [methods, setMethods] = useState<Record<string, TrafficMethod[]>>({});
  const [totalMethods, setTotalMethods] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Загрузка методов трафика
  const fetchMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/traffic/methods');
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      setMethods(data.methods);
      setTotalMethods(data.totalMethods);
      setCounts(data.counts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
      toast.error(`Ошибка загрузки методов: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  // Фильтрация методов
  const filteredMethods = searchQuery
    ? Object.entries(methods).reduce((acc, [key, methodList]) => {
        const filtered = methodList.filter(m => 
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[key] = filtered;
        }
        return acc;
      }, {} as Record<string, TrafficMethod[]>)
    : selectedPlatform === 'all' 
      ? methods 
      : { [selectedPlatform]: methods[selectedPlatform] || [] };

  const toggleMethod = (id: number) => {
    setActiveMethods(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const toggleFavorite = (id: number) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  // Запуск выбранных методов
  const runSelectedMethods = async () => {
    if (activeMethods.length === 0) return;
    
    setRunning(true);
    const results: { success: number[]; failed: number[] } = { success: [], failed: [] };
    
    try {
      // Запускаем методы параллельно
      const promises = activeMethods.map(async (methodId) => {
        try {
          const response = await fetch('/api/traffic/methods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ methodId }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          return { methodId, success: true, data };
        } catch (err) {
          console.error(`Method ${methodId} failed:`, err);
          return { methodId, success: false };
        }
      });
      
      const responses = await Promise.all(promises);
      
      responses.forEach(({ methodId, success }) => {
        if (success) {
          results.success.push(methodId);
        } else {
          results.failed.push(methodId);
        }
      });
      
      if (results.success.length > 0) {
        toast.success(`Успешно запущено ${results.success.length} методов`);
      }
      
      if (results.failed.length > 0) {
        toast.error(`Ошибка при запуске ${results.failed.length} методов`);
      }
      
      // Очищаем выбранные методы после успешного запуска
      if (results.success.length > 0) {
        setActiveMethods([]);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      toast.error(`Ошибка запуска: ${message}`);
    } finally {
      setRunning(false);
    }
  };

  // Подсчет методов с высоким риском
  const highRiskCount = Object.values(methods).flat().filter(m => m.risk === 'high' || m.risk === 'extreme').length;

  // Состояние загрузки
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
          <p className="text-[#8A8A8A]">Загрузка методов трафика...</p>
        </div>
      </div>
    );
  }

  // Состояние ошибки
  if (error && Object.keys(methods).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-12 h-12 text-[#FF4D4D]" />
          <div>
            <h3 className="text-lg font-medium text-white mb-1">Ошибка загрузки</h3>
            <p className="text-[#8A8A8A] mb-4">{error}</p>
            <Button onClick={fetchMethods} variant="outline">
              Попробовать снова
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-[#6C63FF]" />
            Методы трафика
          </h1>
          <p className="text-[#8A8A8A]">Всего {totalMethods} методов для привлечения трафика</p>
        </div>
        {activeMethods.length > 0 && (
          <Button 
            onClick={runSelectedMethods} 
            className="bg-[#00D26A] hover:bg-[#00D26A]/80"
            disabled={running}
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Запуск...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Запустить ({activeMethods.length})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Поиск и фильтры */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="flex flex-wrap gap-4 py-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
            <Input
              placeholder="Поиск методов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1E1F26] border-[#2A2B32]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedPlatform === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPlatform('all')}
              className={selectedPlatform === 'all' ? 'bg-[#6C63FF]' : 'border-[#2A2B32]'}
            >
              Все
            </Button>
            {Object.entries(categoryConfig).map(([key, config]) => {
              const count = counts[key] || 0;
              return (
                <Button
                  key={key}
                  variant={selectedPlatform === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPlatform(key)}
                  className={selectedPlatform === key ? 'bg-[#6C63FF]' : 'border-[#2A2B32]'}
                >
                  <span 
                    className="w-2 h-2 rounded-full mr-2" 
                    style={{ backgroundColor: config.color }}
                  />
                  {config.name}
                  <Badge className="ml-2 bg-[#1E1F26] text-[#8A8A8A] text-xs">{count}</Badge>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Методы по категориям */}
      <div className="space-y-6">
        {Object.entries(filteredMethods).map(([key, methodList]) => {
          const config = categoryConfig[key] || { name: key, color: '#8A8A8A' };
          
          return (
            <Card key={key} className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <span 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: config.color }}
                  />
                  {config.name}
                  <Badge className="bg-[#1E1F26] text-[#8A8A8A]">{methodList.length} методов</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {methodList.map((method) => {
                    const isActive = activeMethods.includes(method.id);
                    const isFavorite = favorites.includes(method.id);
                    
                    return (
                      <div
                        key={method.id}
                        className={cn(
                          'p-4 rounded-lg border transition-all cursor-pointer',
                          isActive 
                            ? 'bg-[#6C63FF]/10 border-[#6C63FF]' 
                            : 'bg-[#1E1F26] border-[#2A2B32] hover:border-[#6C63FF]/50'
                        )}
                        onClick={() => toggleMethod(method.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-medium">{method.name}</h4>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(method.id); }}
                              className="p-1"
                            >
                              <Star className={cn('w-4 h-4', isFavorite ? 'fill-[#FFB800] text-[#FFB800]' : 'text-[#8A8A8A]')} />
                            </button>
                            {isActive && <CheckCircle className="w-4 h-4 text-[#00D26A]" />}
                          </div>
                        </div>
                        <p className="text-xs text-[#8A8A8A] mb-3">Категория: {method.category}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn('text-xs text-white', getRiskColor(method.risk))}>
                            {getRiskLabel(method.risk)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalMethods}</p>
                <p className="text-xs text-[#8A8A8A]">Методов всего</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeMethods.length}</p>
                <p className="text-xs text-[#8A8A8A]">Выбрано</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{favorites.length}</p>
                <p className="text-xs text-[#8A8A8A]">Избранных</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF4D4D]/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#FF4D4D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{highRiskCount}</p>
                <p className="text-xs text-[#8A8A8A]">Высокий риск</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

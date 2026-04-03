'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  Target,
  MessageSquare,
  Clock,
  Users,
  Zap,
  RefreshCw,
  Plus,
  BarChart3,
  Award,
  Lightbulb,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Pattern {
  id: string;
  patternType: string;
  patternData: string;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgROI: number;
  avgConversion: number;
  totalRevenue: number;
  niche: string | null;
  geo: string | null;
  offerType: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  samplesCount: number;
}

interface GlobalStats {
  totalSamples: number;
  successfulPatterns: number;
  bestCommentStyles: string | null;
  bestTimingByNiche: string | null;
  lastLearningAt: string | null;
}

interface PatternTypeStats {
  type: string;
  count: number;
  avgSuccessRate: number;
  avgROI: number;
}

const PATTERN_TYPES = [
  { value: 'comment_style', label: 'Стиль комментариев', icon: MessageSquare },
  { value: 'timing', label: 'Тайминг', icon: Clock },
  { value: 'channel_targeting', label: 'Таргетинг каналов', icon: Target },
  { value: 'offer_matching', label: 'Подбор офферов', icon: TrendingUp }
];

const NICHES = ['gambling', 'crypto', 'nutra', 'bait', 'lifestyle', 'dating'];
const GEOS = ['RU', 'US', 'DE', 'UK', 'FR', 'ES', 'IT', 'BR', 'IN'];

export function LearningPanel() {
  const [loading, setLoading] = useState(false);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [patternsByType, setPatternsByType] = useState<PatternTypeStats[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterNiche, setFilterNiche] = useState<string>('all');
  const [filterGeo, setFilterGeo] = useState<string>('all');
  
  // New sample form
  const [sampleForm, setSampleForm] = useState({
    patternType: 'comment_style',
    patternData: '',
    inputContext: '',
    action: '',
    outcome: '',
    wasSuccessful: true,
    revenue: 0,
    conversionRate: 0,
    niche: '',
    geo: 'RU',
    offerType: ''
  });

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('patternType', filterType);
      if (filterNiche !== 'all') params.set('niche', filterNiche);
      if (filterGeo !== 'all') params.set('geo', filterGeo);
      params.set('activeOnly', 'true');

      const res = await fetch(`/api/advanced/learning?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setPatterns(data.patterns);
        setGlobalStats(data.globalStats);
        setPatternsByType(data.patternsByType);
      }
    } catch (error) {
      console.error('Error fetching learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get recommendations
  const getRecommendations = async () => {
    try {
      const res = await fetch('/api/advanced/learning', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: filterNiche !== 'all' ? filterNiche : undefined,
          geo: filterGeo !== 'all' ? filterGeo : undefined,
          limit: 5
        })
      });
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.analysis.recommendations);
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
    }
  };

  // Record new sample
  const recordSample = async () => {
    try {
      const res = await fetch('/api/advanced/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sampleForm,
          inputContext: sampleForm.inputContext ? JSON.parse(sampleForm.inputContext) : {},
          action: sampleForm.action ? JSON.parse(sampleForm.action) : {},
          outcome: sampleForm.outcome ? JSON.parse(sampleForm.outcome) : {}
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        setSampleForm({
          patternType: 'comment_style',
          patternData: '',
          inputContext: '',
          action: '',
          outcome: '',
          wasSuccessful: true,
          revenue: 0,
          conversionRate: 0,
          niche: '',
          geo: 'RU',
          offerType: ''
        });
      }
    } catch (error) {
      console.error('Error recording sample:', error);
    }
  };

  // Recalculate patterns
  const recalculatePatterns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/advanced/learning', {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Error recalculating patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    getRecommendations();
  }, [filterType, filterNiche, filterGeo]);

  const getPatternTypeLabel = (type: string) => {
    return PATTERN_TYPES.find(p => p.value === type)?.label || type;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.7) return 'text-green-500';
    if (rate >= 0.4) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Всего образцов</span>
            </div>
            <p className="text-2xl font-bold mt-2">{globalStats?.totalSamples || 0}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Успешных</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-green-500">
              {globalStats?.successfulPatterns || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Активных паттернов</span>
            </div>
            <p className="text-2xl font-bold mt-2">{patterns.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Средний ROI</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              ${patternsByType.reduce((sum, p) => sum + (p.avgROI || 0), 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pattern Types Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-500" />
            Паттерны по типам
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PATTERN_TYPES.map(pt => {
              const stats = patternsByType.find(p => p.type === pt.value);
              const Icon = pt.icon;
              return (
                <div key={pt.value} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{pt.label}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Количество:</span>
                      <span className="font-bold">{stats?.count || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Успешность:</span>
                      <span className={getSuccessRateColor(stats?.avgSuccessRate || 0)}>
                        {((stats?.avgSuccessRate || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={(stats?.avgSuccessRate || 0) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="patterns" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patterns">Топ паттерны</TabsTrigger>
          <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
          <TabsTrigger value="input">Добавить образец</TabsTrigger>
        </TabsList>

        {/* Top Patterns */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Лучшие паттерны
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Тип паттерна" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все типы</SelectItem>
                      {PATTERN_TYPES.map(pt => (
                        <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterNiche} onValueChange={setFilterNiche}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Ниша" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все ниши</SelectItem>
                      {NICHES.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterGeo} onValueChange={setFilterGeo}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Гео" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      {GEOS.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={recalculatePatterns}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {patterns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет данных для отображения</p>
                    <p className="text-sm">Добавьте образцы для начала обучения</p>
                  </div>
                ) : (
                  patterns.map((pattern, index) => (
                    <div 
                      key={pattern.id} 
                      className="p-4 rounded-lg border bg-gradient-to-r from-background to-muted/30 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            index < 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-muted-foreground/30'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <Badge variant="outline">{getPatternTypeLabel(pattern.patternType)}</Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {pattern.patternData.length > 50 
                                ? `${pattern.patternData.substring(0, 50)}...` 
                                : pattern.patternData}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getSuccessRateColor(pattern.successRate)}`}>
                            {(pattern.successRate * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pattern.successCount}/{pattern.successCount + pattern.failureCount} успехов
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                          <span>ROI: ${pattern.avgROI.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4 text-blue-500" />
                          <span>Conv: {(pattern.avgConversion * 100).toFixed(1)}%</span>
                        </div>
                        {pattern.niche && (
                          <Badge variant="secondary" className="text-xs">{pattern.niche}</Badge>
                        )}
                        {pattern.geo && (
                          <Badge variant="secondary" className="text-xs">{pattern.geo}</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                AI Рекомендации
              </CardTitle>
              <CardDescription>
                На основе анализа успешных паттернов для вашего контекста
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={getRecommendations} className="mb-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Получить рекомендации
              </Button>
              
              <div className="space-y-4">
                {recommendations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нажмите кнопку для получения рекомендаций</p>
                  </div>
                ) : (
                  recommendations.map((rec, index) => (
                    <div key={rec.id} className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <Badge>{getPatternTypeLabel(rec.patternType)}</Badge>
                        <span className={`font-bold ${getSuccessRateColor(rec.successRate)}`}>
                          {(rec.successRate * 100).toFixed(1)}% успешность
                        </span>
                      </div>
                      <p className="font-medium mb-2">{rec.patternData}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>ROI: ${rec.avgROI.toFixed(2)}</span>
                        <span>{rec.successCount} успешных применений</span>
                      </div>
                      {rec.recentSuccessSamples?.length > 0 && (
                        <div className="mt-3 p-3 rounded bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Последний успешный пример:</p>
                          <p className="text-sm">{JSON.stringify(rec.recentSuccessSamples[0].action)}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Input */}
        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-500" />
                Добавить образец обучения
              </CardTitle>
              <CardDescription>
                Запишите результат действия для обучения нейросети
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Тип паттерна</label>
                  <Select 
                    value={sampleForm.patternType} 
                    onValueChange={(v) => setSampleForm({...sampleForm, patternType: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PATTERN_TYPES.map(pt => (
                        <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ниша</label>
                  <Select 
                    value={sampleForm.niche} 
                    onValueChange={(v) => setSampleForm({...sampleForm, niche: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите нишу" />
                    </SelectTrigger>
                    <SelectContent>
                      {NICHES.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Данные паттерна (стратегия/подход)</label>
                <Textarea 
                  placeholder="Например: casual_question_with_emoji"
                  value={sampleForm.patternData}
                  onChange={(e) => setSampleForm({...sampleForm, patternData: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Входной контекст (JSON)</label>
                <Textarea 
                  placeholder='{"channelType": "crypto", "audienceAge": "25-35"}'
                  value={sampleForm.inputContext}
                  onChange={(e) => setSampleForm({...sampleForm, inputContext: e.target.value})}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Действие (JSON)</label>
                <Textarea 
                  placeholder='{"commentStyle": "casual", "emoji": true}'
                  value={sampleForm.action}
                  onChange={(e) => setSampleForm({...sampleForm, action: e.target.value})}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Результат:</label>
                  <div className="flex gap-2">
                    <Button
                      variant={sampleForm.wasSuccessful ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSampleForm({...sampleForm, wasSuccessful: true})}
                    >
                      <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                      Успех
                    </Button>
                    <Button
                      variant={!sampleForm.wasSuccessful ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setSampleForm({...sampleForm, wasSuccessful: false})}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Неудача
                    </Button>
                  </div>
                </div>
              </div>

              {sampleForm.wasSuccessful && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Доход ($)</label>
                    <Input 
                      type="number"
                      value={sampleForm.revenue}
                      onChange={(e) => setSampleForm({...sampleForm, revenue: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Конверсия (%)</label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={sampleForm.conversionRate * 100}
                      onChange={(e) => setSampleForm({...sampleForm, conversionRate: (parseFloat(e.target.value) || 0) / 100})}
                    />
                  </div>
                </div>
              )}

              <Button onClick={recordSample} className="w-full">
                <Brain className="h-4 w-4 mr-2" />
                Записать образец
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LearningPanel;

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FlaskConical,
  Plus,
  Trash2,
  Play,
  Square,
  CheckCircle,
  Trophy,
  TrendingUp,
  Eye,
  MousePointer,
  Target,
  Minus
} from 'lucide-react';

// Types
interface ABTestVariant {
  id: string;
  style: string;
  trafficPercent: number;
  comments: number;
  views: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed';
  styles: string[];
  winnerStyle?: string;
  winnerReason?: string;
  variants: ABTestVariant[];
  createdAt: string;
}

const STYLE_OPTIONS = [
  { value: 'casual', label: 'Casual', description: 'Непринужденный, дружелюбный' },
  { value: 'expert', label: 'Expert', description: 'Экспертный, авторитетный' },
  { value: 'friendly', label: 'Friendly', description: 'Дружелюбный, теплый' },
  { value: 'provocative', label: 'Provocative', description: 'Провокационный, цепляющий' },
  { value: 'storytelling', label: 'Storytelling', description: 'Сторителлинг, истории' },
  { value: 'humor', label: 'Humor', description: 'Юмористический, веселый' },
];

const STYLE_COLORS: Record<string, string> = {
  casual: 'bg-blue-500',
  expert: 'bg-purple-500',
  friendly: 'bg-green-500',
  provocative: 'bg-red-500',
  storytelling: 'bg-amber-500',
  humor: 'bg-pink-500',
};

export function ABTestingPanel() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [newTestName, setNewTestName] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [trafficPercents, setTrafficPercents] = useState<Record<string, number>>({});

  // Load tests on mount
  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const res = await fetch('/api/advanced/ab-testing');
      const data = await res.json();
      if (data.success) {
        setTests(data.tests || []);
      }
    } catch (error) {
      console.error('Error loading A/B tests:', error);
    }
  };

  // Add style to selection
  const addStyle = (style: string) => {
    if (!selectedStyles.includes(style)) {
      const newStyles = [...selectedStyles, style];
      setSelectedStyles(newStyles);
      // Distribute traffic equally
      const equalPercent = Math.floor(100 / newStyles.length);
      const newPercents: Record<string, number> = {};
      newStyles.forEach((s, i) => {
        newPercents[s] = i === newStyles.length - 1 ? 100 - equalPercent * (newStyles.length - 1) : equalPercent;
      });
      setTrafficPercents(newPercents);
    }
  };

  // Remove style from selection
  const removeStyle = (style: string) => {
    const newStyles = selectedStyles.filter(s => s !== style);
    setSelectedStyles(newStyles);
    const newPercents = { ...trafficPercents };
    delete newPercents[style];
    // Redistribute remaining traffic
    if (newStyles.length > 0) {
      const equalPercent = Math.floor(100 / newStyles.length);
      newStyles.forEach((s, i) => {
        newPercents[s] = i === newStyles.length - 1 ? 100 - equalPercent * (newStyles.length - 1) : equalPercent;
      });
    }
    setTrafficPercents(newPercents);
  };

  // Update traffic percentage for a style
  const updateTrafficPercent = (style: string, percent: number) => {
    setTrafficPercents(prev => ({ ...prev, [style]: percent }));
  };

  // Create new A/B test
  const createTest = async () => {
    if (!newTestName.trim() || selectedStyles.length < 2) return;

    setLoading('create');
    try {
      const res = await fetch('/api/advanced/ab-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTestName,
          styles: selectedStyles,
          trafficPercents,
          userId: 'default-user',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTestName('');
        setSelectedStyles([]);
        setTrafficPercents({});
        loadTests();
      }
    } catch (error) {
      console.error('Error creating A/B test:', error);
    } finally {
      setLoading(null);
    }
  };

  // Start test
  const startTest = async (testId: string) => {
    setLoading(`start-${testId}`);
    try {
      const res = await fetch('/api/advanced/ab-testing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, status: 'running' }),
      });
      const data = await res.json();
      if (data.success) {
        loadTests();
      }
    } catch (error) {
      console.error('Error starting test:', error);
    } finally {
      setLoading(null);
    }
  };

  // Stop test
  const stopTest = async (testId: string) => {
    setLoading(`stop-${testId}`);
    try {
      const res = await fetch('/api/advanced/ab-testing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, status: 'draft' }),
      });
      const data = await res.json();
      if (data.success) {
        loadTests();
      }
    } catch (error) {
      console.error('Error stopping test:', error);
    } finally {
      setLoading(null);
    }
  };

  // Complete test
  const completeTest = async (testId: string) => {
    setLoading(`complete-${testId}`);
    try {
      const res = await fetch('/api/advanced/ab-testing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, status: 'completed' }),
      });
      const data = await res.json();
      if (data.success) {
        loadTests();
      }
    } catch (error) {
      console.error('Error completing test:', error);
    } finally {
      setLoading(null);
    }
  };

  // Delete test
  const deleteTest = async (testId: string) => {
    if (!confirm('Удалить этот тест?')) return;
    
    setLoading(`delete-${testId}`);
    try {
      const res = await fetch(`/api/advanced/ab-testing?testId=${testId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadTests();
      }
    } catch (error) {
      console.error('Error deleting test:', error);
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Черновик</Badge>;
      case 'running':
        return <Badge className="bg-green-500 text-white">Запущен</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500 text-white">Завершён</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalTraffic = Object.values(trafficPercents).reduce((sum, p) => sum + p, 0);
  const trafficValid = totalTraffic === 100 && selectedStyles.length >= 2;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-500" />
            A/B Тестирование комментариев
          </h3>
          <p className="text-sm text-muted-foreground">
            Тестируйте разные стили комментариев и находите наиболее эффективные
          </p>
        </div>
      </div>

      {/* Create new test */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Создать новый тест</CardTitle>
          <CardDescription>
            Выберите минимум 2 стиля для тестирования
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Название теста"
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              className="flex-1"
            />
            <Select onValueChange={addStyle}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Добавить стиль" />
              </SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.filter(opt => !selectedStyles.includes(opt.value)).map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${STYLE_COLORS[opt.value]}`} />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected styles with traffic percentages */}
          {selectedStyles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Распределение трафика</Label>
                <Badge variant={trafficValid ? "default" : "destructive"}>
                  {totalTraffic}%
                </Badge>
              </div>
              
              {selectedStyles.map(style => {
                const styleInfo = STYLE_OPTIONS.find(s => s.value === style);
                return (
                  <div key={style} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`w-3 h-3 rounded-full ${STYLE_COLORS[style]}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{styleInfo?.label}</span>
                        <span className="text-sm font-bold">{trafficPercents[style] || 0}%</span>
                      </div>
                      <Slider
                        value={[trafficPercents[style] || 0]}
                        onValueChange={([value]) => updateTrafficPercent(style, value)}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStyle(style)}
                      className="h-8 w-8"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            onClick={createTest}
            disabled={!newTestName.trim() || selectedStyles.length < 2 || !trafficValid || loading === 'create'}
            className="w-full"
          >
            {loading === 'create' ? 'Создание...' : 'Создать тест'}
          </Button>
        </CardContent>
      </Card>

      {/* Tests list */}
      <div className="space-y-4">
        {tests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Нет созданных тестов</p>
              <p className="text-sm">Создайте первый тест выше</p>
            </CardContent>
          </Card>
        ) : (
          tests.map(test => (
            <Card key={test.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{test.name}</CardTitle>
                    {getStatusBadge(test.status)}
                  </div>
                  <div className="flex gap-1">
                    {test.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startTest(test.id)}
                        disabled={loading === `start-${test.id}`}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Запустить
                      </Button>
                    )}
                    {test.status === 'running' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => stopTest(test.id)}
                          disabled={loading === `stop-${test.id}`}
                        >
                          <Square className="h-4 w-4 mr-1" />
                          Остановить
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => completeTest(test.id)}
                          disabled={loading === `complete-${test.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Завершить
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTest(test.id)}
                      disabled={loading === `delete-${test.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Winner announcement */}
                {test.status === 'completed' && test.winnerStyle && (
                  <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-green-700">
                        Победитель: {STYLE_OPTIONS.find(s => s.value === test.winnerStyle)?.label}
                      </p>
                      {test.winnerReason && (
                        <p className="text-sm text-green-600">{test.winnerReason}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Variants */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {test.variants?.map(variant => (
                    <div
                      key={variant.id}
                      className={`p-3 rounded-lg border ${
                        test.winnerStyle === variant.style
                          ? 'border-green-500 bg-green-500/5'
                          : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${STYLE_COLORS[variant.style]}`} />
                        <span className="font-medium text-sm capitalize">{variant.style}</span>
                        {test.winnerStyle === variant.style && (
                          <Trophy className="h-4 w-4 text-green-500 ml-auto" />
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {variant.views} просмотров
                        </div>
                        <div className="flex items-center gap-1">
                          <MousePointer className="h-3 w-3" />
                          {variant.clicks} кликов
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {variant.conversions} конверсий
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {(variant.conversionRate * 100).toFixed(1)}% CR
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <Progress value={variant.conversionRate * 100} className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default ABTestingPanel;

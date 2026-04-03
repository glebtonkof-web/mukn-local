'use client';

// AI Comments Panel - Главная панель AI-комментирования
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Shield,
  Calculator,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Target,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Типы
type OfferTheme = 'gambling' | 'crypto' | 'bait' | 'nutra' | 'dating' | 'finance' | 'lifestyle';
type CommentStyle = 'casual' | 'expert' | 'friendly' | 'provocative' | 'storytelling' | 'humor';
type PromotionMethod = 'bait' | 'direct_ad' | 'fake_review' | 'native_ad' | 'influencer';

// Константы
const OFFER_THEMES: Record<OfferTheme, { label: string; color: string }> = {
  gambling: { label: 'Казино', color: '#FF4D4D' },
  crypto: { label: 'Крипта', color: '#FFB800' },
  bait: { label: 'Байт', color: '#E4405F' },
  nutra: { label: 'Нутра', color: '#00D26A' },
  dating: { label: 'Дейтинг', color: '#FF6B9D' },
  finance: { label: 'Финансы', color: '#00D4AA' },
  lifestyle: { label: 'Лайфстайл', color: '#6C63FF' },
};

const COMMENT_STYLES: Record<CommentStyle, { label: string; description: string }> = {
  casual: { label: 'Небрежный', description: 'Разговорный стиль' },
  expert: { label: 'Экспертный', description: 'Уверенный тон' },
  friendly: { label: 'Дружелюбный', description: 'Тёплый подход' },
  provocative: { label: 'Провокационный', description: 'Цепляет эмоции' },
  storytelling: { label: 'История', description: 'Личный опыт' },
  humor: { label: 'С юмором', description: 'Лёгкий тон' },
};

const PROMOTION_METHODS: Record<PromotionMethod, { label: string; risk: string }> = {
  bait: { label: 'Байт/Кликбейт', risk: 'high' },
  direct_ad: { label: 'Прямая реклама', risk: 'medium' },
  fake_review: { label: 'Фейковый отзыв', risk: 'high' },
  native_ad: { label: 'Нативная реклама', risk: 'low' },
  influencer: { label: 'Через инфлюенсера', risk: 'medium' },
};

// ==================== ГЕНЕРАТОР КОММЕНТАРИЕВ ====================

function CommentGeneratorTab() {
  const [postText, setPostText] = useState('');
  const [channelTopic, setChannelTopic] = useState('');
  const [targetOffer, setTargetOffer] = useState<string>('');
  const [style, setStyle] = useState<CommentStyle>('casual');
  const [temperature, setTemperature] = useState(0.9);
  const [loading, setLoading] = useState(false);
  const [generatedComments, setGeneratedComments] = useState<Array<{
    id: string;
    text: string;
    style: string;
    copied: boolean;
  }>>([]);

  const generateComments = useCallback(async () => {
    if (!postText.trim()) {
      toast.error('Введите текст поста');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai-comments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            postText,
            channelTopic,
            targetOffer: targetOffer || 'general',
          },
          count: 3,
          config: {
            offerTheme: (targetOffer || 'lifestyle') as OfferTheme,
            style,
            temperature,
            maxTokens: 200,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedComments(
          data.comments.map((c: { id: string; text: string; style: string }) => ({
            id: c.id,
            text: c.text,
            style: c.style,
            copied: false,
          }))
        );
        toast.success(`Сгенерировано ${data.comments.length} комментариев`);
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch (error) {
      toast.error('Ошибка подключения к API');
    } finally {
      setLoading(false);
    }
  }, [postText, channelTopic, targetOffer, style, temperature]);

  const copyComment = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setGeneratedComments(prev =>
      prev.map(c => (c.id === id ? { ...c, copied: true } : c))
    );
    toast.success('Скопировано в буфер');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Настройки */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#6C63FF]" />
              Настройки генерации
            </CardTitle>
            <CardDescription>
              Настройте параметры для генерации уникальных комментариев
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Текст поста *</Label>
              <Textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Вставьте текст поста, под который нужен комментарий..."
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Тема оффера</Label>
                <Select value={targetOffer} onValueChange={setTargetOffer}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue placeholder="Выберите тему" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {Object.entries(OFFER_THEMES).map(([key, { label, color }]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-[#2A2B32]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Стиль комментария</Label>
                <Select value={style} onValueChange={(v) => setStyle(v as CommentStyle)}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {Object.entries(COMMENT_STYLES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-[#2A2B32]">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Тема канала (опционально)</Label>
              <Input
                value={channelTopic}
                onChange={(e) => setChannelTopic(e.target.value)}
                placeholder="Например: криптовалюты, инвестиции"
                className="bg-[#1E1F26] border-[#2A2B32] text-white"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white">Температура: {temperature.toFixed(1)}</Label>
                <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A]">
                  {temperature < 0.8 ? 'Предсказуемо' : temperature > 1.0 ? 'Креативно' : 'Сбалансировано'}
                </Badge>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={(v) => setTemperature(v[0])}
                min={0.7}
                max={1.2}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-[#8A8A8A]">
                Выше = более разнообразные комментарии, но менее предсказуемые
              </p>
            </div>

            <Button
              onClick={generateComments}
              disabled={loading || !postText.trim()}
              className="w-full bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Сгенерировать 3 варианта
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Результаты */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#FFB800]" />
              Сгенерированные комментарии
            </CardTitle>
            <CardDescription>
              {generatedComments.length > 0
                ? 'Выберите лучший вариант'
                : 'Результаты появятся здесь'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedComments.length === 0 ? (
              <div className="text-center py-12 text-[#8A8A8A]">
                <MessageSquare className="w-12 h-12 mx-auto opacity-50 mb-4" />
                <p>Настройте параметры и нажмите "Сгенерировать"</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {generatedComments.map((comment, index) => (
                    <div
                      key={comment.id}
                      className="p-4 rounded-lg bg-[#1E1F26] border border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
                              Вариант {index + 1}
                            </Badge>
                            <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A]">
                              {COMMENT_STYLES[comment.style as CommentStyle]?.label}
                            </Badge>
                          </div>
                          <p className="text-white text-sm">{comment.text}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyComment(comment.id, comment.text)}
                            className="text-[#8A8A8A] hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
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
    </div>
  );
}

// ==================== РИСК-АНАЛИЗ ====================

function RiskAnalysisTab() {
  const [offerTheme, setOfferTheme] = useState<OfferTheme>('gambling');
  const [promotionMethod, setPromotionMethod] = useState<PromotionMethod>('native_ad');
  const [sampleText, setSampleText] = useState('');
  const [loading, setLoading] = useState(false);
  const [riskResult, setRiskResult] = useState<{
    riskLevel: string;
    riskScore: number;
    warningText: string;
    possibleArticles: string[];
    recommendation: string;
  } | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const analyzeRisk = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-comments/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerTheme,
          promotionMethod,
          sampleText: sampleText || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRiskResult({
          riskLevel: data.riskLevel,
          riskScore: data.riskScore,
          warningText: data.warningText,
          possibleArticles: data.possibleArticles,
          recommendation: data.recommendation,
        });
        setShowWarning(true);
        toast.success('Анализ завершён');
      } else {
        toast.error(data.error || 'Ошибка анализа');
      }
    } catch (error) {
      toast.error('Ошибка подключения к API');
    } finally {
      setLoading(false);
    }
  }, [offerTheme, promotionMethod, sampleText]);

  const riskColors: Record<string, string> = {
    green: '#00D26A',
    yellow: '#FFB800',
    red: '#FF4D4D',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#00D26A]" />
              Оценка юридических рисков
            </CardTitle>
            <CardDescription>
              AI проанализирует вашу схему и предупредит о рисках
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Тема оффера</Label>
                <Select value={offerTheme} onValueChange={(v) => setOfferTheme(v as OfferTheme)}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {Object.entries(OFFER_THEMES).map(([key, { label, color }]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-[#2A2B32]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Способ продвижения</Label>
                <Select value={promotionMethod} onValueChange={(v) => setPromotionMethod(v as PromotionMethod)}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {Object.entries(PROMOTION_METHODS).map(([key, { label, risk }]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-[#2A2B32]">
                        <div className="flex items-center gap-2">
                          {label}
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              risk === 'high' ? 'border-[#FF4D4D] text-[#FF4D4D]' :
                              risk === 'medium' ? 'border-[#FFB800] text-[#FFB800]' :
                              'border-[#00D26A] text-[#00D26A]'
                            )}
                          >
                            {risk === 'high' ? 'Высокий риск' : risk === 'medium' ? 'Средний' : 'Низкий'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Пример текста (опционально)</Label>
              <Textarea
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                placeholder="Вставьте пример вашего комментария для анализа..."
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[100px]"
              />
            </div>

            <Button
              onClick={analyzeRisk}
              disabled={loading}
              className="w-full bg-[#FFB800] hover:bg-[#FFB800]/80 text-black"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Анализ...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Оценить риски
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Результаты анализа */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white">Результат анализа</CardTitle>
          </CardHeader>
          <CardContent>
            {!riskResult ? (
              <div className="text-center py-12 text-[#8A8A8A]">
                <Shield className="w-12 h-12 mx-auto opacity-50 mb-4" />
                <p>Нажмите "Оценить риски" для анализа</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Индикатор риска */}
                <div
                  className="p-6 rounded-lg text-center"
                  style={{ backgroundColor: `${riskColors[riskResult.riskLevel]}20` }}
                >
                  <div
                    className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white"
                    style={{ backgroundColor: riskColors[riskResult.riskLevel] }}
                  >
                    {riskResult.riskScore}
                  </div>
                  <Badge
                    className="text-lg px-4 py-1 text-white"
                    style={{ backgroundColor: riskColors[riskResult.riskLevel] }}
                  >
                    {riskResult.riskLevel === 'green' ? 'Низкий риск' :
                     riskResult.riskLevel === 'yellow' ? 'Средний риск' : 'Высокий риск'}
                  </Badge>
                </div>

                {/* Предупреждение */}
                <div className="p-4 rounded-lg bg-[#1E1F26]">
                  <p className="text-white">{riskResult.warningText}</p>
                </div>

                {/* Статьи УК РФ */}
                {riskResult.possibleArticles.length > 0 && (
                  <div>
                    <Label className="text-white mb-2 block">Возможные статьи:</Label>
                    <div className="flex flex-wrap gap-2">
                      {riskResult.possibleArticles.map((article, i) => (
                        <Badge key={i} variant="outline" className="border-[#FF4D4D] text-[#FF4D4D]">
                          {article}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Рекомендация */}
                {riskResult.recommendation && (
                  <div className="p-4 rounded-lg bg-[#6C63FF]/10 border border-[#6C63FF]/30">
                    <p className="text-sm text-[#8A8A8A]">
                      <strong className="text-[#6C63FF]">Рекомендация:</strong> {riskResult.recommendation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Диалог предупреждения */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#FFB800]" />
              Предупреждение о рисках
            </DialogTitle>
            <DialogDescription className="text-[#8A8A8A]">
              {riskResult?.warningText}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-[#8A8A8A]">
              Вы понимаете риски и хотите продолжить настройку кампании?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarning(false)} className="border-[#2A2B32]">
              Отмена
            </Button>
            <Button
              onClick={() => setShowWarning(false)}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              Я понимаю риски, продолжить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== РАСЧЁТ БЮДЖЕТА ====================

function BudgetCalculatorTab() {
  const [dailyGoal, setDailyGoal] = useState(500);
  const [conversionRate, setConversionRate] = useState(2);
  const [accountCost, setAccountCost] = useState(10);
  const [proxyCost, setProxyCost] = useState(5);
  const [commentsPerAccount, setCommentsPerAccount] = useState(50);
  const [includeProxies, setIncludeProxies] = useState(true);
  const [loading, setLoading] = useState(false);
  const [budgetResult, setBudgetResult] = useState<{
    commentsNeeded: number;
    accountsNeeded: number;
    proxiesNeeded: number;
    dailyBudget: number;
    monthlyBudget: number;
    recommendations: string[];
    formatted: Record<string, string>;
  } | null>(null);

  const calculateBudget = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-comments/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyGoal,
          conversionRate,
          accountCost,
          proxyCost,
          commentsPerAccount,
          includeProxies,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBudgetResult({
          ...data.raw,
          formatted: data.formatted,
        });
        toast.success('Бюджет рассчитан');
      } else {
        toast.error(data.error || 'Ошибка расчёта');
      }
    } catch (error) {
      toast.error('Ошибка подключения к API');
    } finally {
      setLoading(false);
    }
  }, [dailyGoal, conversionRate, accountCost, proxyCost, commentsPerAccount, includeProxies]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#00D4AA]" />
              Калькулятор бюджета
            </CardTitle>
            <CardDescription>
              AI рассчитает оптимальные параметры для вашей цели
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Цель: {dailyGoal} переходов в день</Label>
              <Slider
                value={[dailyGoal]}
                onValueChange={(v) => setDailyGoal(v[0])}
                min={50}
                max={2000}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#8A8A8A]">
                <span>50</span>
                <span>2000</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Конверсия: {conversionRate}%</Label>
                <Input
                  type="number"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(Number(e.target.value))}
                  min={0.5}
                  max={20}
                  step={0.5}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Комментариев на аккаунт</Label>
                <Input
                  type="number"
                  value={commentsPerAccount}
                  onChange={(e) => setCommentsPerAccount(Number(e.target.value))}
                  min={10}
                  max={100}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Стоимость аккаунта (₽)</Label>
                <Input
                  type="number"
                  value={accountCost}
                  onChange={(e) => setAccountCost(Number(e.target.value))}
                  min={1}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Стоимость прокси (₽)</Label>
                <Input
                  type="number"
                  value={proxyCost}
                  onChange={(e) => setProxyCost(Number(e.target.value))}
                  min={1}
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-white">Использовать прокси</Label>
              <Switch checked={includeProxies} onCheckedChange={setIncludeProxies} />
            </div>

            <Button
              onClick={calculateBudget}
              disabled={loading}
              className="w-full bg-[#00D4AA] hover:bg-[#00D4AA]/80 text-black"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Расчёт...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Рассчитать с AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Результаты */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#FFB800]" />
              Результат расчёта
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!budgetResult ? (
              <div className="text-center py-12 text-[#8A8A8A]">
                <Calculator className="w-12 h-12 mx-auto opacity-50 mb-4" />
                <p>Нажмите "Рассчитать" для получения результатов</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-[#1E1F26] text-center">
                    <p className="text-xs text-[#8A8A8A] mb-1">Комментариев в день</p>
                    <p className="text-2xl font-bold text-white">{budgetResult.formatted.commentsNeeded}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-[#1E1F26] text-center">
                    <p className="text-xs text-[#8A8A8A] mb-1">Аккаунтов нужно</p>
                    <p className="text-2xl font-bold text-[#6C63FF]">{budgetResult.formatted.accountsNeeded}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-[#1E1F26] text-center">
                    <p className="text-xs text-[#8A8A8A] mb-1">Прокси нужно</p>
                    <p className="text-2xl font-bold text-[#00D4AA]">{budgetResult.formatted.proxiesNeeded}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-[#6C63FF]/20 border border-[#6C63FF]/30 text-center">
                    <p className="text-xs text-[#8A8A8A] mb-1">Бюджет в день</p>
                    <p className="text-2xl font-bold text-[#6C63FF]">{budgetResult.formatted.dailyBudget}</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#FFB800]/10 border border-[#FFB800]/30 text-center">
                  <p className="text-xs text-[#8A8A8A] mb-1">Бюджет в месяц</p>
                  <p className="text-3xl font-bold text-[#FFB800]">{budgetResult.formatted.monthlyBudget}</p>
                </div>

                {/* Рекомендации */}
                {budgetResult.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-white">AI-рекомендации:</Label>
                    <div className="space-y-2">
                      {budgetResult.recommendations.map((rec, i) => (
                        <div key={i} className="p-3 rounded-lg bg-[#1E1F26] text-sm text-[#8A8A8A]">
                          💡 {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== АНАЛИЗ КАНАЛА ====================

function ChannelAnalysisTab() {
  const [posts, setPosts] = useState('');
  const [targetOffer, setTargetOffer] = useState<OfferTheme>('gambling');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    topic: string;
    tone: string;
    hasModeration: boolean;
    engagement: string;
    suitability: { score: number; allOffers: Record<string, number> };
    recommendation: string;
    warnings: string[];
    verdict: { canSpam: boolean; riskLevel: string; expectedConversion: string };
  } | null>(null);

  const analyzeChannel = useCallback(async () => {
    if (!posts.trim()) {
      toast.error('Вставьте посты канала');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai-comments/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posts: posts.split('\n---\n').filter(p => p.trim()),
          targetOffer,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysisResult({
          topic: data.analysis.topic,
          tone: data.analysis.tone,
          hasModeration: data.analysis.hasModeration,
          engagement: data.analysis.engagement,
          suitability: data.suitability,
          recommendation: data.recommendation,
          warnings: data.warnings,
          verdict: data.verdict,
        });
        toast.success('Канал проанализирован');
      } else {
        toast.error(data.error || 'Ошибка анализа');
      }
    } catch (error) {
      toast.error('Ошибка подключения к API');
    } finally {
      setLoading(false);
    }
  }, [posts, targetOffer]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-[#6C63FF]" />
              Анализ канала
            </CardTitle>
            <CardDescription>
              AI определит тематику, тон и подходит ли канал для вашего оффера
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Посты канала (разделите "---")</Label>
              <Textarea
                value={posts}
                onChange={(e) => setPosts(e.target.value)}
                placeholder="Вставьте тексты 3-5 последних постов канала...

---
Второй пост...
---
Третий пост..."
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[200px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Ваш оффер</Label>
              <Select value={targetOffer} onValueChange={(v) => setTargetOffer(v as OfferTheme)}>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                  {Object.entries(OFFER_THEMES).map(([key, { label, color }]) => (
                    <SelectItem key={key} value={key} className="text-white hover:bg-[#2A2B32]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={analyzeChannel}
              disabled={loading || !posts.trim()}
              className="w-full bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Анализ...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Проанализировать канал
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Результаты */}
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white">Результат анализа</CardTitle>
          </CardHeader>
          <CardContent>
            {!analysisResult ? (
              <div className="text-center py-12 text-[#8A8A8A]">
                <Search className="w-12 h-12 mx-auto opacity-50 mb-4" />
                <p>Вставьте посты канала для анализа</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Вердикт */}
                <div
                  className={cn(
                    'p-4 rounded-lg text-center',
                    analysisResult.verdict.canSpam
                      ? 'bg-[#00D26A]/20 border border-[#00D26A]/30'
                      : 'bg-[#FF4D4D]/20 border border-[#FF4D4D]/30'
                  )}
                >
                  {analysisResult.verdict.canSpam ? (
                    <CheckCircle className="w-8 h-8 mx-auto text-[#00D26A] mb-2" />
                  ) : (
                    <XCircle className="w-8 h-8 mx-auto text-[#FF4D4D] mb-2" />
                  )}
                  <p className="font-medium text-white">
                    {analysisResult.verdict.canSpam ? 'Канал подходит' : 'Канал не рекомендуется'}
                  </p>
                </div>

                {/* Информация */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[#1E1F26]">
                    <p className="text-xs text-[#8A8A8A]">Тема канала</p>
                    <p className="font-medium text-white">{analysisResult.topic}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1E1F26]">
                    <p className="text-xs text-[#8A8A8A]">Тон</p>
                    <p className="font-medium text-white capitalize">{analysisResult.tone}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1E1F26]">
                    <p className="text-xs text-[#8A8A8A]">Модерация</p>
                    <p className="font-medium text-white">
                      {analysisResult.hasModeration ? '🛡️ Есть' : '✅ Нет'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1E1F26]">
                    <p className="text-xs text-[#8A8A8A]">Вовлечённость</p>
                    <p className="font-medium text-white capitalize">{analysisResult.engagement}</p>
                  </div>
                </div>

                {/* Соответствие офферу */}
                <div className="space-y-2">
                  <Label className="text-white">Соответствие офферу</Label>
                  <div className="w-full h-4 rounded-full bg-[#1E1F26] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(analysisResult.suitability.score || 0) * 100}%`,
                        backgroundColor: (analysisResult.suitability.score || 0) >= 0.5 ? '#00D26A' : '#FFB800',
                      }}
                    />
                  </div>
                  <p className="text-sm text-[#8A8A8A]">
                    Score: {((analysisResult.suitability.score || 0) * 100).toFixed(0)}%
                  </p>
                </div>

                {/* Предупреждения */}
                {analysisResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    {analysisResult.warnings.map((warning, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#FFB800]/10 border border-[#FFB800]/30 text-sm text-[#FFB800]">
                        {warning}
                      </div>
                    ))}
                  </div>
                )}

                {/* Рекомендация */}
                <div className="p-4 rounded-lg bg-[#6C63FF]/10 border border-[#6C63FF]/30">
                  <p className="text-sm text-white">{analysisResult.recommendation}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function AICommentsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-[#6C63FF]" />
            AI-комментирование
          </h1>
          <p className="text-[#8A8A8A]">Умная генерация комментариев с помощью DeepSeek</p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="bg-[#1E1F26] border-[#2A2B32] w-full justify-start">
          <TabsTrigger value="generate" className="data-[state=active]:bg-[#6C63FF]">
            <MessageSquare className="w-4 h-4 mr-2" />
            Генератор
          </TabsTrigger>
          <TabsTrigger value="risk" className="data-[state=active]:bg-[#6C63FF]">
            <Shield className="w-4 h-4 mr-2" />
            Риск-анализ
          </TabsTrigger>
          <TabsTrigger value="budget" className="data-[state=active]:bg-[#6C63FF]">
            <Calculator className="w-4 h-4 mr-2" />
            Бюджет
          </TabsTrigger>
          <TabsTrigger value="channel" className="data-[state=active]:bg-[#6C63FF]">
            <Search className="w-4 h-4 mr-2" />
            Анализ каналов
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <CommentGeneratorTab />
        </TabsContent>
        <TabsContent value="risk" className="mt-6">
          <RiskAnalysisTab />
        </TabsContent>
        <TabsContent value="budget" className="mt-6">
          <BudgetCalculatorTab />
        </TabsContent>
        <TabsContent value="channel" className="mt-6">
          <ChannelAnalysisTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AICommentsPanel;

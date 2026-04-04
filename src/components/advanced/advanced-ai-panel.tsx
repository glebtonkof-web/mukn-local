'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  Shield, 
  MessageSquare, 
  Target, 
  Users, 
  Bot,
  Mic,
  Rocket,
  Layers,
  FileText,
  Sparkles,
  Globe,
  ArrowRightLeft,
  Server,
  FlaskConical,
  GraduationCap
} from 'lucide-react';
import { AntidetectPanel } from './antidetect-panel';
import { CrossPostPanel } from './cross-post-panel';
import { LoadBalancerPanel } from './load-balancer-panel';
import { ABTestingPanel } from './ab-testing-panel';
import { ForgetfulnessPanel } from './forgetfulness-panel';
import { DynamicOfferPanel } from './dynamic-offer-panel';
import { ShadowAccountsPanel } from './shadow-accounts-panel';
import { LearningPanel } from './learning-panel';

// Типы
interface ChannelPrediction {
  spamDeleteMinutes: number | null;
  banProbability: number;
  bestCommentStyle: string;
  bestTimeToPost: string;
  moderationStrictness: number;
  confidence: number;
}

interface ViralStep {
  content: string;
  style: string;
  delayMinutes: number;
}

interface EmotionalProfile {
  primaryEmotion: string;
  emotionScores: Record<string, number>;
  recommendedStyle: string;
  recommendedTone: string;
  avoidTopics: string[];
}

export function AdvancedAIPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const [userId] = useState('default-user');

  // Состояния для функций
  const [channelId, setChannelId] = useState('');
  const [channelPrediction, setChannelPrediction] = useState<ChannelPrediction | null>(null);
  
  const [postContent, setPostContent] = useState('');
  const [offerName, setOfferName] = useState('');
  const [viralChain, setViralChain] = useState<ViralStep[]>([]);
  
  const [emotionalProfile, setEmotionalProfile] = useState<EmotionalProfile | null>(null);
  const [emotionalComment, setEmotionalComment] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [turboEnabled, setTurboEnabled] = useState(false);
  const [aggressionLevel, setAggressionLevel] = useState(50);
  
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResult, setVoiceResult] = useState<any>(null);
  
  const [legendTheme, setLegendTheme] = useState('');
  const [generatedLegend, setGeneratedLegend] = useState<any>(null);

  // 1. Предиктивный анализ канала
  const analyzeChannel = async () => {
    setLoading('channel');
    try {
      const res = await fetch('/api/advanced/channel-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          channelData: { name: channelId },
          userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChannelPrediction(data.prediction);
      }
    } catch (error) {
      console.error('Error analyzing channel:', error);
    } finally {
      setLoading(null);
    }
  };

  // 2. Генерация вирусной цепочки
  const generateViralChainHandler = async () => {
    setLoading('viral');
    try {
      const res = await fetch('/api/advanced/viral-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postContent,
          offerInfo: { name: offerName, niche: 'general' },
          userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setViralChain(data.scenario.steps);
      }
    } catch (error) {
      console.error('Error generating viral chain:', error);
    } finally {
      setLoading(null);
    }
  };

  // 3. Эмоциональный анализ
  const analyzeEmotion = async () => {
    setLoading('emotion');
    try {
      const res = await fetch('/api/advanced/emotion-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postContent,
          offerInfo: { name: offerName },
          userId,
          generateComment: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmotionalProfile(data.emotionalProfile);
        setEmotionalComment(data.comment);
      }
    } catch (error) {
      console.error('Error analyzing emotion:', error);
    } finally {
      setLoading(null);
    }
  };

  // 6. Нейросетевой поиск
  const neuralSearch = async () => {
    setLoading('search');
    try {
      const res = await fetch('/api/advanced/neural-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          filters: { niche: 'general' },
          userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(null);
    }
  };

  // 13. Турбо-профит
  const updateTurboSettings = async (enabled: boolean, level: number) => {
    try {
      const res = await fetch('/api/advanced/turbo-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          enabled,
          aggressionLevel: level,
          settings: {
            shortDelays: true,
            riskyStyles: true,
            complexOffers: level > 70,
            maxBanRisk: level,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTurboEnabled(enabled);
        setAggressionLevel(level);
      }
    } catch (error) {
      console.error('Error updating turbo settings:', error);
    }
  };

  // 20. Голосовое управление
  const processVoice = async () => {
    setLoading('voice');
    try {
      const res = await fetch('/api/advanced/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: voiceTranscript,
          userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVoiceResult(data.result);
      }
    } catch (error) {
      console.error('Error processing voice:', error);
    } finally {
      setLoading(null);
    }
  };

  // 17. Генерация легенды
  const generateLegend = async () => {
    setLoading('legend');
    try {
      const res = await fetch('/api/advanced/legend-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelTheme: legendTheme,
          userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedLegend(data.legend);
      }
    } catch (error) {
      console.error('Error generating legend:', error);
    } finally {
      setLoading(null);
    }
  };

  const emotionColors: Record<string, string> = {
    anger: 'bg-red-500',
    joy: 'bg-yellow-500',
    sadness: 'bg-blue-500',
    fear: 'bg-purple-500',
    surprise: 'bg-orange-500',
    neutral: 'bg-gray-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            Advanced AI Engine
          </h2>
          <p className="text-muted-foreground">20 интеллектуальных функций для максимальной эффективности</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Уровень 1-4
        </Badge>
      </div>

      <Tabs defaultValue="level1" className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="level1" className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            Уровень 1
          </TabsTrigger>
          <TabsTrigger value="level2" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Уровень 2
          </TabsTrigger>
          <TabsTrigger value="level3" className="flex items-center gap-1">
            <Layers className="h-4 w-4" />
            Уровень 3
          </TabsTrigger>
          <TabsTrigger value="level4" className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            Уровень 4
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-1">
            <FlaskConical className="h-4 w-4" />
            A/B Тест
          </TabsTrigger>
          <TabsTrigger value="dynamic-offer" className="flex items-center gap-1">
            <ArrowRightLeft className="h-4 w-4" />
            Офферы
          </TabsTrigger>
          <TabsTrigger value="shadow-accounts" className="flex items-center gap-1">
            <Server className="h-4 w-4" />
            Защита
          </TabsTrigger>
          <TabsTrigger value="antidetect" className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            Браузеры
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            Обучение
          </TabsTrigger>
        </TabsList>

        {/* УРОВЕНЬ 1 */}
        <TabsContent value="level1" className="space-y-4">
          {/* 1. Предиктивный анализ канала */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                1. Предиктивный анализ канала
              </CardTitle>
              <CardDescription>
                DeepSeek анализирует канал и предсказывает: через сколько минут удалят спам, 
                вероятность бана, лучший стиль комментария
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="ID или username канала"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={analyzeChannel} disabled={loading === 'channel'}>
                  {loading === 'channel' ? 'Анализ...' : 'Анализировать'}
                </Button>
              </div>
              
              {channelPrediction && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Удаление спама</p>
                    <p className="text-xl font-bold">
                      {channelPrediction.spamDeleteMinutes 
                        ? `~${channelPrediction.spamDeleteMinutes} мин` 
                        : 'Не удаляют'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Риск бана</p>
                    <div className="flex items-center gap-2">
                      <Progress value={channelPrediction.banProbability} className="h-2 w-16" />
                      <span className="font-bold">{channelPrediction.banProbability}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Лучший стиль</p>
                    <Badge>{channelPrediction.bestCommentStyle}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Лучшее время</p>
                    <p className="font-bold">{channelPrediction.bestTimeToPost}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Вирусные цепочки */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                2. Вирусные цепочки комментариев
              </CardTitle>
              <CardDescription>
                Сценарий из 3-5 сообщений, который разворачивается в течение часа, 
                создавая иллюзию живого обсуждения
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Textarea
                  placeholder="Содержимое поста..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={3}
                />
                <Input
                  placeholder="Название оффера"
                  value={offerName}
                  onChange={(e) => setOfferName(e.target.value)}
                />
              </div>
              <Button onClick={generateViralChainHandler} disabled={loading === 'viral'}>
                {loading === 'viral' ? 'Генерация...' : 'Создать цепочку'}
              </Button>
              
              {viralChain.length > 0 && (
                <div className="space-y-2 mt-4">
                  {viralChain.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{step.content}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{step.style}</Badge>
                          <Badge variant="outline" className="text-xs">+{step.delayMinutes} мин</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Эмоциональный интеллект */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-pink-500" />
                3. Эмоциональный интеллект
              </CardTitle>
              <CardDescription>
                Определяет эмоциональный фон поста и подбирает комментарий, который резонирует
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={analyzeEmotion} disabled={loading === 'emotion'}>
                {loading === 'emotion' ? 'Анализ...' : 'Анализировать эмоции'}
              </Button>
              
              {emotionalProfile && (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Главная эмоция:</span>
                    <Badge className={`${emotionColors[emotionalProfile.primaryEmotion] || 'bg-gray-500'} text-white`}>
                      {emotionalProfile.primaryEmotion}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(emotionalProfile.emotionScores).map(([emotion, score]) => (
                      <div key={emotion} className="text-center">
                        <div className="text-xs text-muted-foreground capitalize">{emotion}</div>
                        <Progress value={(score as number) * 100} className="h-2 mt-1" />
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge variant="outline">Стиль: {emotionalProfile.recommendedStyle}</Badge>
                    <Badge variant="outline">Тон: {emotionalProfile.recommendedTone}</Badge>
                  </div>
                  
                  {emotionalComment && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm font-medium mb-1">Рекомендуемый комментарий:</p>
                      <p>{emotionalComment}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Кросспостинг с обогащением */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-purple-500" />
                5. Кросспостинг с обогащением
              </CardTitle>
              <CardDescription>
                Адаптация успешных комментариев для разных каналов с помощью DeepSeek AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CrossPostPanel />
            </CardContent>
          </Card>

          {/* 4. Имитация забывчивости */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-rose-500" />
                4. Имитация забывчивости
              </CardTitle>
              <CardDescription>
                Имитация естественного поведения: аккаунт "забывает" упомянуть оффер, а потом "вспоминает"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ForgetfulnessPanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* УРОВЕНЬ 2 */}
        <TabsContent value="level2" className="space-y-4">
          {/* 6. Нейросетевой поиск */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-500" />
                6. Нейросетевой поиск каналов
              </CardTitle>
              <CardDescription>
                Поиск каналов по смыслу, не по ключевым словам. AI находит аудиторию, 
                заинтересованную в вашем оффере
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Опишите идеальную аудиторию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={neuralSearch} disabled={loading === 'search'}>
                  {loading === 'search' ? 'Поиск...' : 'Найти'}
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-2 mt-4">
                  {searchResults.map((result, i) => (
                    <div key={i} className="p-3 rounded-lg border flex justify-between items-center">
                      <div>
                        <p className="font-medium">{result.channelName}</p>
                        <p className="text-sm text-muted-foreground">{result.reason}</p>
                      </div>
                      <div className="text-right">
                        <Badge>{result.relevanceScore}% match</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 10. Детект ботов */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-red-500" />
                10. Анти-фрод: детект ботов
              </CardTitle>
              <CardDescription>
                Анализ подписчиков канала и определение процента ботов. 
                Если ботов больше 70% — канал исключается
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                <div>
                  <p className="font-medium">Проверить канал</p>
                  <p className="text-sm text-muted-foreground">
                    Введите ID канала для анализа
                  </p>
                </div>
                <Button variant="outline">Проверить</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* УРОВЕНЬ 3 */}
        <TabsContent value="level3" className="space-y-4">
          {/* 13. Турбо-профит */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-orange-500" />
                13. Режим «Турбо-профит»
              </CardTitle>
              <CardDescription>
                Агрессивные настройки для опытных арбитражников: короткие задержки, 
                рискованные стили, более высокий профит
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Включить турбо-режим</Label>
                  <p className="text-sm text-muted-foreground">
                    Риск бана выше, но профит в 2-3 раза больше
                  </p>
                </div>
                <Switch
                  checked={turboEnabled}
                  onCheckedChange={(checked) => updateTurboSettings(checked, aggressionLevel)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Уровень агрессии</Label>
                  <span className="font-bold">{aggressionLevel}%</span>
                </div>
                <Slider
                  value={[aggressionLevel]}
                  onValueChange={([value]) => updateTurboSettings(turboEnabled, value)}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Безопасно</span>
                  <span>Максимальный риск</span>
                </div>
              </div>
              
              {turboEnabled && aggressionLevel > 70 && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-600 font-medium">
                    ⚠️ Высокий уровень агрессии! Риск бана аккаунтов значительно повышен.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 15. Кейсы */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-500" />
                15. Авто-генерация кейсов
              </CardTitle>
              <CardDescription>
                AI генерирует красивые кейсы на основе реальной статистики для продажи обучения
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Сгенерировать кейс из кампании</Button>
            </CardContent>
          </Card>

          {/* 12. Балансировка нагрузки */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-cyan-500" />
                12. Балансировка нагрузки
              </CardTitle>
              <CardDescription>
                Управление серверами и прокси с автоматическим выбором лучшего
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoadBalancerPanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* УРОВЕНЬ 4 */}
        <TabsContent value="level4" className="space-y-4">
          {/* 17. Легенды */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-500" />
                17. Авто-легенды под канал
              </CardTitle>
              <CardDescription>
                DeepSeek пишет уникальную историю для аккаунта на основе тематики канала
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Тематика канала (например: крипта, рыбалка)"
                  value={legendTheme}
                  onChange={(e) => setLegendTheme(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={generateLegend} disabled={loading === 'legend'}>
                  {loading === 'legend' ? 'Генерация...' : 'Создать легенду'}
                </Button>
              </div>
              
              {generatedLegend && (
                <div className="p-4 rounded-lg bg-muted space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Возраст:</span>
                      <p className="font-medium">{generatedLegend.age} лет</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Город:</span>
                      <p className="font-medium">{generatedLegend.city}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Профессия:</span>
                      <p className="font-medium">{generatedLegend.occupation}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Хобби:</span>
                      <p className="font-medium">{generatedLegend.hobbies?.join(', ')}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Биография:</span>
                    <p className="font-medium">{generatedLegend.bio}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 20. Голосовое управление */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-rose-500" />
                20. Голосовое управление
              </CardTitle>
              <CardDescription>
                Управление кампаниями голосом: «Запусти кампанию на казино, бюджет 50 баксов»
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Текст команды или нажмите для записи"
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={processVoice} disabled={loading === 'voice'}>
                  {loading === 'voice' ? 'Обработка...' : 'Выполнить'}
                </Button>
              </div>
              
              {voiceResult && (
                <div className="p-4 rounded-lg bg-muted space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Команда:</span>
                    <Badge>{voiceResult.intent}</Badge>
                  </div>
                  {Object.keys(voiceResult.entities || {}).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(voiceResult.entities || {}).map(([key, value]: [string, unknown]) => (
                        value !== null && value !== undefined && <Badge key={key} variant="outline">{key}: {String(value)}</Badge>
                      ))}
                    </div>
                  )}
                  {voiceResult.executable ? (
                    <Button size="sm" className="mt-2">Выполнить команду</Button>
                  ) : (
                    <p className="text-sm text-amber-600">Требуется уточнение</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ДИНАМИЧЕСКАЯ ЗАМЕНА ОФФЕРА */}
        <TabsContent value="dynamic-offer" className="space-y-4">
          <DynamicOfferPanel />
        </TabsContent>

        {/* ТЕНЕВЫЕ АККАУНТЫ ПОДДЕРЖКИ */}
        <TabsContent value="shadow-accounts" className="space-y-4">
          <ShadowAccountsPanel />
        </TabsContent>

        {/* АНТИДЕТЕКТ БРАУЗЕРЫ */}
        <TabsContent value="antidetect" className="space-y-4">
          <AntidetectPanel />
        </TabsContent>

        {/* A/B ТЕСТИРОВАНИЕ */}
        <TabsContent value="testing" className="space-y-4">
          <ABTestingPanel />
        </TabsContent>

        {/* САМООБУЧЕНИЕ */}
        <TabsContent value="learning" className="space-y-4">
          <LearningPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdvancedAIPanel;

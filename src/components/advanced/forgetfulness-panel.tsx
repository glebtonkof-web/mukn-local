'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Brain,
  Clock,
  RefreshCw,
  Sparkles,
  Eye,
  Save,
  Shuffle
} from 'lucide-react';

// Types
interface ForgetfulnessSettings {
  id: string;
  campaignId?: string;
  influencerId?: string;
  forgetProbability: number;
  rememberDelayDays: number;
  forgotPhrases: string[];
  enabled: boolean;
}

const DEFAULT_PHRASES = [
  'Забыл добавить...',
  'Чуть не забыл!',
  'Вспомнил важное:',
  'Кстати, забыл сказать:',
  'Упс, забыл упомянуть:',
  'Дополнение к предыдущему:',
  'Пока не забыл -',
  'Ах да, ещё хотел сказать:',
  'Забыл поделиться:',
  'Мимо проходил, вспомнил:',
];

export function ForgetfulnessPanel() {
  const [settings, setSettings] = useState<ForgetfulnessSettings | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [forgetProbability, setForgetProbability] = useState(15);
  const [rememberDelay, setRememberDelay] = useState(2);
  const [phrases, setPhrases] = useState(DEFAULT_PHRASES.join('\n'));
  const [enabled, setEnabled] = useState(true);
  const [previewPhrase, setPreviewPhrase] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/advanced/forgetfulness');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setForgetProbability(Math.round(data.settings.forgetProbability * 100));
        setRememberDelay(data.settings.rememberDelayDays);
        setEnabled(data.settings.enabled ?? true);
        if (data.settings.forgotPhrases?.length > 0) {
          setPhrases(data.settings.forgotPhrases.join('\n'));
        }
      }
    } catch (error) {
      console.error('Error loading forgetfulness settings:', error);
    }
  };

  // Save settings
  const saveSettings = async () => {
    setLoading('save');
    try {
      const parsedPhrases = phrases
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const res = await fetch('/api/advanced/forgetfulness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forgetProbability: forgetProbability / 100,
          rememberDelayDays: rememberDelay,
          forgotPhrases: parsedPhrases,
          enabled,
          userId: 'default-user',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error saving forgetfulness settings:', error);
    } finally {
      setLoading(null);
    }
  };

  // Generate preview phrase
  const generatePreview = async () => {
    setLoading('preview');
    try {
      const res = await fetch('/api/advanced/forgetfulness', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewPhrase(data.phrase);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setLoading(null);
    }
  };

  // Get random phrase for local preview
  const getRandomPhrase = () => {
    const parsedPhrases = phrases
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    if (parsedPhrases.length === 0) return null;
    return parsedPhrases[Math.floor(Math.random() * parsedPhrases.length)];
  };

  const getProbabilityColor = (prob: number) => {
    if (prob <= 15) return 'text-green-500';
    if (prob <= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getDelayDescription = (days: number) => {
    if (days === 1) return 'очень быстро';
    if (days <= 3) return 'быстро';
    if (days <= 5) return 'умеренно';
    return 'медленно';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-pink-500" />
            Имитация забывчивости
          </h3>
          <p className="text-sm text-muted-foreground">
            Имитация естественного поведения с «забывчивыми» комментариями
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="forget-toggle" className="text-sm">Включено</Label>
          <Switch
            id="forget-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Probability slider */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-purple-500" />
              Вероятность забыть
            </CardTitle>
            <CardDescription>
              Как часто аккаунт будет «забывать» упомянуть оффер
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${getProbabilityColor(forgetProbability)}`}>
                {forgetProbability}%
              </span>
              <Badge variant="outline">
                {forgetProbability <= 15 ? 'Низкая' : forgetProbability <= 30 ? 'Средняя' : 'Высокая'}
              </Badge>
            </div>
            <Slider
              value={[forgetProbability]}
              onValueChange={([value]) => setForgetProbability(value)}
              max={50}
              step={1}
              disabled={!enabled}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0% (всегда помнит)</span>
              <span>50% (часто забывает)</span>
            </div>
            <Progress value={forgetProbability} className="h-2" />
          </CardContent>
        </Card>

        {/* Remember delay slider */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Задержка «вспоминания»
            </CardTitle>
            <CardDescription>
              Через сколько дней аккаунт «вспомнит» оффер
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-500">
                {rememberDelay} {rememberDelay === 1 ? 'день' : rememberDelay <= 4 ? 'дня' : 'дней'}
              </span>
              <Badge variant="outline">{getDelayDescription(rememberDelay)}</Badge>
            </div>
            <Slider
              value={[rememberDelay]}
              onValueChange={([value]) => setRememberDelay(value)}
              min={1}
              max={7}
              step={1}
              disabled={!enabled}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 день (быстро)</span>
              <span>7 дней (медленно)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phrases editor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Фразы «забывчивости»
          </CardTitle>
          <CardDescription>
            Шаблоны фраз для имитации «вспоминания» (каждая фраза с новой строки)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Введите фразы для забывчивости, каждая с новой строки..."
            value={phrases}
            onChange={(e) => setPhrases(e.target.value)}
            rows={8}
            disabled={!enabled}
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {phrases.split('\n').filter(p => p.trim().length > 0).length} фраз
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPhrases(DEFAULT_PHRASES.join('\n'))}
              disabled={!enabled}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-green-500" />
            Предпросмотр
          </CardTitle>
          <CardDescription>
            Пример сгенерированной фразы «забывчивости»
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {previewPhrase ? (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="font-medium">{previewPhrase}</p>
              <p className="text-sm text-muted-foreground mt-1">
                + комментарий с оффером через ~{rememberDelay} дней
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 text-center text-muted-foreground">
              Нажмите «Показать пример» для предпросмотра
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const phrase = getRandomPhrase();
                if (phrase) setPreviewPhrase(phrase);
              }}
              disabled={!enabled}
            >
              <Eye className="h-4 w-4 mr-1" />
              Показать пример
            </Button>
            <Button
              onClick={saveSettings}
              disabled={loading === 'save' || !enabled}
            >
              <Save className="h-4 w-4 mr-1" />
              {loading === 'save' ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      {settings && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm">
              {enabled ? 'Имитация активна' : 'Имитация отключена'}
            </span>
          </div>
          <Badge variant="outline">
            Вероятность: {Math.round(settings.forgetProbability * 100)}%
          </Badge>
        </div>
      )}
    </div>
  );
}

export default ForgetfulnessPanel;

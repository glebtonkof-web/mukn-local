// Hypothesis Tester - Авто-тестирование гипотез
// Автоматическое формирование и проверка гипотез на части трафика

import { EventEmitter } from 'events';

// ==================== ТИПЫ ====================

export interface Hypothesis {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'timing' | 'targeting' | 'format' | 'cta';
  variants: {
    id: string;
    name: string;
    config: Record<string, any>;
  }[];
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  trafficPercent: number; // процент трафика на тест
  startDate: number;
  endDate?: number;
  results?: HypothesisResult;
  metrics: {
    samplesControl: number;
    samplesTest: number;
    conversionsControl: number;
    conversionsTest: number;
  };
}

export interface HypothesisResult {
  winner: string | null; // ID варианта-победителя
  confidence: number; // 0-1
  improvement: number; // процент улучшения
  isSignificant: boolean;
  recommendation: string;
}

export interface HypothesisConfig {
  defaultTrafficPercent: number;
  minSamplesForSignificance: number;
  confidenceLevel: number; // 0.95 = 95%
  maxDuration: number; // ms - максимальная длительность теста
  autoStopOnSignificance: boolean;
  checkInterval: number; // ms - интервал проверки результатов
}

// ==================== КОНФИГУРАЦИЯ ====================

const DEFAULT_CONFIG: HypothesisConfig = {
  defaultTrafficPercent: 10,
  minSamplesForSignificance: 100,
  confidenceLevel: 0.95,
  maxDuration: 7 * 24 * 60 * 60 * 1000, // 7 дней
  autoStopOnSignificance: true,
  checkInterval: 3600000, // 1 час
};

// ==================== HYPOTHESIS TESTER ====================

class HypothesisTesterService extends EventEmitter {
  private config: HypothesisConfig;
  private activeHypotheses: Map<string, Hypothesis> = new Map();
  private completedHypotheses: Hypothesis[] = [];
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<HypothesisConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startPeriodicCheck();
  }

  // Запуск периодической проверки
  private startPeriodicCheck(): void {
    this.checkInterval = setInterval(() => {
      this.checkAllHypotheses();
    }, this.config.checkInterval);
  }

  // Создание новой гипотезы
  createHypothesis(
    name: string,
    description: string,
    category: Hypothesis['category'],
    variants: Hypothesis['variants'],
    trafficPercent?: number
  ): Hypothesis {
    const hypothesis: Hypothesis = {
      id: `hyp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      variants,
      status: 'draft',
      trafficPercent: trafficPercent || this.config.defaultTrafficPercent,
      startDate: Date.now(),
      metrics: {
        samplesControl: 0,
        samplesTest: 0,
        conversionsControl: 0,
        conversionsTest: 0,
      },
    };
    
    console.log(`[Hypothesis] Created: ${name} (${hypothesis.id})`);
    this.emit('hypothesis:created', { hypothesis });
    
    return hypothesis;
  }

  // Запуск гипотезы
  startHypothesis(hypothesis: Hypothesis): void {
    if (hypothesis.status !== 'draft') {
      throw new Error(`Cannot start hypothesis in status: ${hypothesis.status}`);
    }
    
    hypothesis.status = 'running';
    hypothesis.startDate = Date.now();
    this.activeHypotheses.set(hypothesis.id, hypothesis);
    
    console.log(`[Hypothesis] Started: ${hypothesis.name}`);
    this.emit('hypothesis:started', { hypothesis });
  }

  // Приостановка гипотезы
  pauseHypothesis(hypothesisId: string): void {
    const hypothesis = this.activeHypotheses.get(hypothesisId);
    if (!hypothesis) return;
    
    hypothesis.status = 'paused';
    console.log(`[Hypothesis] Paused: ${hypothesis.name}`);
    this.emit('hypothesis:paused', { hypothesis });
  }

  // Возобновление гипотезы
  resumeHypothesis(hypothesisId: string): void {
    const hypothesis = this.activeHypotheses.get(hypothesisId);
    if (!hypothesis || hypothesis.status !== 'paused') return;
    
    hypothesis.status = 'running';
    console.log(`[Hypothesis] Resumed: ${hypothesis.name}`);
    this.emit('hypothesis:resumed', { hypothesis });
  }

  // Запись события для гипотезы
  recordEvent(
    hypothesisId: string,
    variantId: string,
    eventType: 'impression' | 'conversion'
  ): void {
    const hypothesis = this.activeHypotheses.get(hypothesisId);
    if (!hypothesis || hypothesis.status !== 'running') return;
    
    const isControl = variantId === hypothesis.variants[0]?.id;
    
    if (eventType === 'impression') {
      if (isControl) {
        hypothesis.metrics.samplesControl++;
      } else {
        hypothesis.metrics.samplesTest++;
      }
    } else if (eventType === 'conversion') {
      if (isControl) {
        hypothesis.metrics.conversionsControl++;
      } else {
        hypothesis.metrics.conversionsTest++;
      }
    }
    
    this.emit('hypothesis:event', { hypothesisId, variantId, eventType });
  }

  // Получение варианта для пользователя
  getVariantForUser(hypothesisId: string, userId: string): string | null {
    const hypothesis = this.activeHypotheses.get(hypothesisId);
    if (!hypothesis || hypothesis.status !== 'running') return null;
    
    // Детерминированное распределение на основе ID пользователя
    const hash = this.hashUserId(userId);
    const percent = (hash % 100) + 1;
    
    // Пользователи вне теста
    if (percent > hypothesis.trafficPercent) {
      return null;
    }
    
    // Распределение между вариантами
    const variantIndex = Math.floor((hash % hypothesis.trafficPercent) / (hypothesis.trafficPercent / hypothesis.variants.length));
    return hypothesis.variants[Math.min(variantIndex, hypothesis.variants.length - 1)].id;
  }

  // Хеширование ID пользователя
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Проверка всех активных гипотез
  private checkAllHypotheses(): void {
    for (const [id, hypothesis] of this.activeHypotheses) {
      if (hypothesis.status !== 'running') continue;
      
      // Проверяем длительность
      const duration = Date.now() - hypothesis.startDate;
      if (duration >= this.config.maxDuration) {
        this.completeHypothesis(id);
        continue;
      }
      
      // Проверяем статистическую значимость
      const result = this.calculateSignificance(hypothesis);
      hypothesis.results = result;
      
      if (result.isSignificant && this.config.autoStopOnSignificance) {
        console.log(`[Hypothesis] Significant result found for: ${hypothesis.name}`);
        this.completeHypothesis(id);
      }
    }
  }

  // Расчёт статистической значимости
  private calculateSignificance(hypothesis: Hypothesis): HypothesisResult {
    const { samplesControl, samplesTest, conversionsControl, conversionsTest } = hypothesis.metrics;
    
    // Минимальное количество сэмплов
    if (samplesControl < this.config.minSamplesForSignificance || 
        samplesTest < this.config.minSamplesForSignificance) {
      return {
        winner: null,
        confidence: 0,
        improvement: 0,
        isSignificant: false,
        recommendation: 'Недостаточно данных для анализа',
      };
    }
    
    // Конверсии
    const controlRate = conversionsControl / samplesControl;
    const testRate = conversionsTest / samplesTest;
    
    // Z-test для пропорций
    const pooledRate = (conversionsControl + conversionsTest) / (samplesControl + samplesTest);
    const standardError = Math.sqrt(
      pooledRate * (1 - pooledRate) * (1 / samplesControl + 1 / samplesTest)
    );
    
    const zScore = standardError > 0 ? (testRate - controlRate) / standardError : 0;
    
    // P-value (двусторонний тест)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    
    // Доверительная вероятность
    const confidence = 1 - pValue;
    
    // Улучшение
    const improvement = controlRate > 0 ? ((testRate - controlRate) / controlRate) * 100 : 0;
    
    // Значимость
    const isSignificant = confidence >= this.config.confidenceLevel;
    
    // Определение победителя
    let winner: string | null = null;
    let recommendation = '';
    
    if (isSignificant) {
      if (testRate > controlRate) {
        winner = hypothesis.variants[1]?.id || null;
        recommendation = `Вариант "${hypothesis.variants[1]?.name}" лучше на ${improvement.toFixed(1)}%. Рекомендуется применить ко всему трафику.`;
      } else {
        winner = hypothesis.variants[0]?.id || null;
        recommendation = `Контрольный вариант лучше. Изменения не рекомендуются.`;
      }
    } else {
      recommendation = 'Разница статистически незначима. Продолжите тестирование.';
    }
    
    return {
      winner,
      confidence,
      improvement,
      isSignificant,
      recommendation,
    };
  }

  // Нормальное распределение CDF
  private normalCDF(x: number): number {
    // Аппроксимация
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
  }

  // Завершение гипотезы
  completeHypothesis(hypothesisId: string): HypothesisResult | null {
    const hypothesis = this.activeHypotheses.get(hypothesisId);
    if (!hypothesis) return null;
    
    hypothesis.status = 'completed';
    hypothesis.endDate = Date.now();
    
    if (!hypothesis.results) {
      hypothesis.results = this.calculateSignificance(hypothesis);
    }
    
    this.completedHypotheses.push(hypothesis);
    this.activeHypotheses.delete(hypothesisId);
    
    console.log(`[Hypothesis] Completed: ${hypothesis.name}`);
    console.log(`[Hypothesis] Winner: ${hypothesis.results?.winner || 'none'}, Improvement: ${hypothesis.results?.improvement.toFixed(1)}%`);
    
    this.emit('hypothesis:completed', { hypothesis, result: hypothesis.results });
    
    return hypothesis.results;
  }

  // Автоматическая генерация гипотез
  async generateHypotheses(
    historicalData: {
      successfulPosts: Array<{ content: string; ctr: number; engagement: number }>;
      averageCtr: number;
    }
  ): Promise<Hypothesis[]> {
    const hypotheses: Hypothesis[] = [];
    
    // Анализ успешных постов
    const topPosts = historicalData.successfulPosts
      .filter(p => p.ctr > historicalData.averageCtr * 1.5)
      .slice(0, 10);
    
    if (topPosts.length < 5) {
      console.log('[Hypothesis] Not enough successful posts for analysis');
      return hypotheses;
    }
    
    // Генерируем гипотезы на основе паттернов
    
    // 1. Гипотеза о времени публикации
    const hourCounts = new Map<number, number>();
    for (const post of topPosts) {
      // Предполагаем, что у нас есть время публикации
      // В реальности нужно парсить из данных
    }
    
    hypotheses.push(this.createHypothesis(
      'Оптимальное время публикации',
      'Публикация в вечерние часы (19:00-21:00) увеличивает CTR',
      'timing',
      [
        { id: 'control', name: 'Текущее время', config: { hour: 12 } },
        { id: 'test', name: 'Вечернее время', config: { hour: 20 } },
      ],
      15
    ));
    
    // 2. Гипотеза о длине контента
    const avgLength = topPosts.reduce((sum, p) => sum + p.content.length, 0) / topPosts.length;
    
    hypotheses.push(this.createHypothesis(
      'Длина контента',
      `Короткие посты (${Math.floor(avgLength * 0.7)} символов) работают лучше`,
      'content',
      [
        { id: 'control', name: 'Текущая длина', config: { targetLength: avgLength } },
        { id: 'test', name: 'Короткий формат', config: { targetLength: Math.floor(avgLength * 0.7) } },
      ],
      10
    ));
    
    // 3. Гипотеза о CTA
    hypotheses.push(this.createHypothesis(
      'Призыв к действию',
      'Добавление CTA в конце поста увеличивает вовлечённость',
      'cta',
      [
        { id: 'control', name: 'Без CTA', config: { includeCta: false } },
        { id: 'test', name: 'С CTA', config: { includeCta: true, ctaText: 'Пиши в комменты!' } },
      ],
      10
    ));
    
    // 4. Гипотеза об эмодзи
    hypotheses.push(this.createHypothesis(
      'Использование эмодзи',
      'Посты с 3-5 эмодзи в начале привлекают больше внимания',
      'format',
      [
        { id: 'control', name: 'Минимум эмодзи', config: { emojiCount: 1 } },
        { id: 'test', name: 'Умеренное количество', config: { emojiCount: 4 } },
      ],
      10
    ));
    
    console.log(`[Hypothesis] Generated ${hypotheses.length} hypotheses`);
    this.emit('hypotheses:generated', { count: hypotheses.length });
    
    return hypotheses;
  }

  // Получение активных гипотез
  getActiveHypotheses(): Hypothesis[] {
    return Array.from(this.activeHypotheses.values());
  }

  // Получение завершённых гипотез
  getCompletedHypotheses(): Hypothesis[] {
    return [...this.completedHypotheses];
  }

  // Получение гипотезы по ID
  getHypothesis(id: string): Hypothesis | undefined {
    return this.activeHypotheses.get(id) || 
           this.completedHypotheses.find(h => h.id === id);
  }

  // Остановка сервиса
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// ==================== SINGLETON ====================

let hypothesisTesterInstance: HypothesisTesterService | null = null;

export function getHypothesisTester(config?: Partial<HypothesisConfig>): HypothesisTesterService {
  if (!hypothesisTesterInstance) {
    hypothesisTesterInstance = new HypothesisTesterService(config);
  }
  return hypothesisTesterInstance;
}

export const hypothesisTester = {
  createHypothesis: (name: string, desc: string, cat: Hypothesis['category'], variants: Hypothesis['variants'], traffic?: number) =>
    getHypothesisTester().createHypothesis(name, desc, cat, variants, traffic),
  startHypothesis: (h: Hypothesis) => getHypothesisTester().startHypothesis(h),
  pauseHypothesis: (id: string) => getHypothesisTester().pauseHypothesis(id),
  resumeHypothesis: (id: string) => getHypothesisTester().resumeHypothesis(id),
  recordEvent: (hid: string, vid: string, type: 'impression' | 'conversion') =>
    getHypothesisTester().recordEvent(hid, vid, type),
  getVariantForUser: (hid: string, uid: string) => getHypothesisTester().getVariantForUser(hid, uid),
  generateHypotheses: (data: any) => getHypothesisTester().generateHypotheses(data),
  getActiveHypotheses: () => getHypothesisTester().getActiveHypotheses(),
  getCompletedHypotheses: () => getHypothesisTester().getCompletedHypotheses(),
};

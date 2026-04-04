// Suspicion Handler - Авто-смена поведения при подозрении на бан
// Адаптивное снижение активности и смена стратегии

import { EventEmitter } from 'events';

// ==================== ТИПЫ ====================

export interface SuspicionSignals {
  captcha: number;
  timeout: number;
  error_403: number;
  error_429: number;
  login_required: number;
  rate_limit: number;
  shadowban: number;
}

export interface SuspicionConfig {
  warningThresholds: {
    low: number;     // уровень подозрений для轻度 реакции
    medium: number;  // уровень подозрений для средней реакции
    high: number;    // уровень подозрений для сильной реакции
    critical: number; // уровень для полной остановки
  };
  decayRate: number; // скорость затухания подозрений (0-1 в час)
  delayMultipliers: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  activityReduction: {
    low: number;     // 0-1, доля оставшейся активности
    medium: number;
    high: number;
    critical: number;
  };
  cooldownPeriod: number; // ms - время до снижения уровня подозрений
}

export type SuspicionLevel = 'normal' | 'low' | 'medium' | 'high' | 'critical';

export interface AdaptiveBehavior {
  delayMultiplier: number;
  activityReduction: number;
  styleMode: 'aggressive' | 'normal' | 'neutral' | 'safe' | 'minimal';
  useProxyRotation: boolean;
  useAccountSwitch: boolean;
  pauseDuration: number; // ms
}

// ==================== КОНФИГУРАЦИЯ ====================

const DEFAULT_CONFIG: SuspicionConfig = {
  warningThresholds: {
    low: 2,
    medium: 5,
    high: 10,
    critical: 20,
  },
  decayRate: 0.5, // 50% затухание в час
  delayMultipliers: {
    low: 2,
    medium: 3,
    high: 5,
    critical: 10,
  },
  activityReduction: {
    low: 0.8,
    medium: 0.5,
    high: 0.3,
    critical: 0.1,
  },
  cooldownPeriod: 3600000, // 1 час
};

const STYLE_MODES = ['aggressive', 'normal', 'neutral', 'safe', 'minimal'] as const;

// ==================== SUSPICION HANDLER ====================

class SuspicionHandlerService extends EventEmitter {
  private config: SuspicionConfig;
  private signals: SuspicionSignals;
  private currentLevel: SuspicionLevel = 'normal';
  private lastSignalTime: number = 0;
  private decayTimer: NodeJS.Timeout | null = null;
  private behaviorHistory: Array<{
    timestamp: number;
    level: SuspicionLevel;
    signals: SuspicionSignals;
  }> = [];

  constructor(config: Partial<SuspicionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.signals = this.createEmptySignals();
    this.startDecayTimer();
  }

  private createEmptySignals(): SuspicionSignals {
    return {
      captcha: 0,
      timeout: 0,
      error_403: 0,
      error_429: 0,
      login_required: 0,
      rate_limit: 0,
      shadowban: 0,
    };
  }

  // Запуск таймера затухания
  private startDecayTimer(): void {
    this.decayTimer = setInterval(() => {
      this.decaySignals();
    }, 60000); // каждую минуту
  }

  // Затухание сигналов
  private decaySignals(): void {
    const decayPerMinute = this.config.decayRate / 60;
    
    for (const key of Object.keys(this.signals) as (keyof SuspicionSignals)[]) {
      this.signals[key] = Math.max(0, this.signals[key] * (1 - decayPerMinute));
    }
    
    // Пересчитываем уровень
    const totalScore = this.calculateTotalScore();
    const newLevel = this.determineLevel(totalScore);
    
    if (newLevel !== this.currentLevel) {
      this.emit('level:changed', { from: this.currentLevel, to: newLevel });
      this.currentLevel = newLevel;
    }
  }

  // Регистрация сигнала подозрения
  reportSignal(signalType: keyof SuspicionSignals, count: number = 1): void {
    this.signals[signalType] += count;
    this.lastSignalTime = Date.now();
    
    const totalScore = this.calculateTotalScore();
    const previousLevel = this.currentLevel;
    this.currentLevel = this.determineLevel(totalScore);
    
    // Логируем
    console.log(`[Suspicion] Signal: ${signalType} (+${count}), total score: ${totalScore.toFixed(1)}, level: ${this.currentLevel}`);
    
    // Записываем в историю
    this.behaviorHistory.push({
      timestamp: Date.now(),
      level: this.currentLevel,
      signals: { ...this.signals },
    });
    
    // Ограничиваем историю
    if (this.behaviorHistory.length > 1000) {
      this.behaviorHistory.shift();
    }
    
    // Эмитим событие
    this.emit('signal:reported', {
      type: signalType,
      count,
      totalScore,
      level: this.currentLevel,
    });
    
    if (this.currentLevel !== previousLevel) {
      this.emit('level:changed', { from: previousLevel, to: this.currentLevel });
      
      // При критическом уровне - эмитим особое событие
      if (this.currentLevel === 'critical') {
        this.emit('critical:reached', { signals: this.signals });
      }
    }
  }

  // Расчёт общего балла подозрений
  private calculateTotalScore(): number {
    const weights = {
      captcha: 5,
      timeout: 1,
      error_403: 3,
      error_429: 4,
      login_required: 4,
      rate_limit: 3,
      shadowban: 10,
    };
    
    let total = 0;
    for (const [key, weight] of Object.entries(weights)) {
      total += this.signals[key as keyof SuspicionSignals] * weight;
    }
    
    return total;
  }

  // Определение уровня подозрений
  private determineLevel(score: number): SuspicionLevel {
    const { low, medium, high, critical } = this.config.warningThresholds;
    
    if (score >= critical) return 'critical';
    if (score >= high) return 'high';
    if (score >= medium) return 'medium';
    if (score >= low) return 'low';
    return 'normal';
  }

  // Получение адаптивного поведения
  getAdaptiveBehavior(): AdaptiveBehavior {
    const level = this.currentLevel;
    const thresholds = this.config.warningThresholds;
    
    const baseDelay = this.config.delayMultipliers[level === 'normal' ? 'low' : level] || 1;
    const baseActivity = this.config.activityReduction[level === 'normal' ? 'low' : level] || 1;
    
    // Определяем стиль на основе уровня
    const styleIndex = Math.min(
      STYLE_MODES.length - 1,
      ['normal', 'low', 'medium', 'high', 'critical'].indexOf(level)
    );
    const styleMode = STYLE_MODES[styleIndex];
    
    return {
      delayMultiplier: baseDelay,
      activityReduction: baseActivity,
      styleMode,
      useProxyRotation: level === 'medium' || level === 'high' || level === 'critical',
      useAccountSwitch: level === 'high' || level === 'critical',
      pauseDuration: level === 'critical' ? 3600000 : 
                     level === 'high' ? 1800000 :
                     level === 'medium' ? 600000 : 
                     level === 'low' ? 300000 : 0,
    };
  }

  // Применить задержку на основе текущего уровня
  async applyDelay(baseDelayMs: number): Promise<void> {
    const behavior = this.getAdaptiveBehavior();
    const adjustedDelay = baseDelayMs * behavior.delayMultiplier;
    
    // Добавляем случайный джиттер
    const jitter = adjustedDelay * 0.2 * (Math.random() * 2 - 1);
    const finalDelay = Math.max(0, adjustedDelay + jitter);
    
    if (finalDelay > 0) {
      console.log(`[Suspicion] Applying delay: ${finalDelay.toFixed(0)}ms (base: ${baseDelayMs}ms, multiplier: ${behavior.delayMultiplier})`);
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }

  // Проверка, можно ли выполнять действие
  canPerformAction(): boolean {
    const behavior = this.getAdaptiveBehavior();
    
    // При критическом уровне - блокируем все действия
    if (this.currentLevel === 'critical') {
      return false;
    }
    
    // Вероятностная блокировка на основе activityReduction
    return Math.random() < behavior.activityReduction;
  }

  // Принудительное снижение уровня (например, после смены аккаунта/прокси)
  forceReduce(factor: number = 0.5): void {
    for (const key of Object.keys(this.signals) as (keyof SuspicionSignals)[]) {
      this.signals[key] *= factor;
    }
    
    const totalScore = this.calculateTotalScore();
    const previousLevel = this.currentLevel;
    this.currentLevel = this.determineLevel(totalScore);
    
    console.log(`[Suspicion] Force reduced by ${(factor * 100).toFixed(0)}%, new level: ${this.currentLevel}`);
    
    if (this.currentLevel !== previousLevel) {
      this.emit('level:changed', { from: previousLevel, to: this.currentLevel });
    }
  }

  // Полный сброс (например, при переключении на новый аккаунт)
  reset(): void {
    this.signals = this.createEmptySignals();
    const previousLevel = this.currentLevel;
    this.currentLevel = 'normal';
    
    console.log('[Suspicion] Reset to normal level');
    
    if (previousLevel !== 'normal') {
      this.emit('level:changed', { from: previousLevel, to: 'normal' });
    }
    
    this.emit('reset');
  }

  // Получение текущего состояния
  getStatus(): {
    level: SuspicionLevel;
    score: number;
    signals: SuspicionSignals;
    behavior: AdaptiveBehavior;
    lastSignalTime: number;
  } {
    return {
      level: this.currentLevel,
      score: this.calculateTotalScore(),
      signals: { ...this.signals },
      behavior: this.getAdaptiveBehavior(),
      lastSignalTime: this.lastSignalTime,
    };
  }

  // Получение истории
  getHistory(limit: number = 100): typeof this.behaviorHistory {
    return this.behaviorHistory.slice(-limit);
  }

  // Остановка сервиса
  stop(): void {
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
      this.decayTimer = null;
    }
  }
}

// ==================== SINGLETON ====================

let suspicionHandlerInstance: SuspicionHandlerService | null = null;

export function getSuspicionHandler(config?: Partial<SuspicionConfig>): SuspicionHandlerService {
  if (!suspicionHandlerInstance) {
    suspicionHandlerInstance = new SuspicionHandlerService(config);
  }
  return suspicionHandlerInstance;
}

export const suspicionHandler = {
  reportSignal: (type: keyof SuspicionSignals, count?: number) =>
    getSuspicionHandler().reportSignal(type, count),
  getAdaptiveBehavior: () => getSuspicionHandler().getAdaptiveBehavior(),
  applyDelay: (baseDelay: number) => getSuspicionHandler().applyDelay(baseDelay),
  canPerformAction: () => getSuspicionHandler().canPerformAction(),
  forceReduce: (factor?: number) => getSuspicionHandler().forceReduce(factor),
  reset: () => getSuspicionHandler().reset(),
  getStatus: () => getSuspicionHandler().getStatus(),
};

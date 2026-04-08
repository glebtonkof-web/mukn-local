/**
 * Adaptive Rate Controller
 * 
 * Адаптивный контроль скорости запросов
 * Автоматическая подстройка под ограничения провайдеров
 */

import { ProviderType, getProviderLimitRegistry, ProviderLimitRegistry } from './provider-limit-registry';

// Интерфейсы
export interface RateState {
  provider: ProviderType;
  accountId?: string;
  
  // Текущая скорость
  currentRate: number; // запросов в минуту
  targetRate: number;
  maxRate: number;
  
  // Адаптация
  adaptationFactor: number;
  lastAdaptation: Date;
  
  // История
  recentLatencies: number[];
  recentErrors: number;
  recentSuccesses: number;
  
  // Состояние
  isThrottled: boolean;
  throttleReason?: string;
  nextAvailableAt?: Date;
}

export interface AdaptiveConfig {
  // Начальная скорость
  initialRate: number;
  
  // Параметры адаптации
  increaseFactor: number;     // Множитель увеличения скорости
  decreaseFactor: number;     // Множитель уменьшения скорости
  adaptationWindowMs: number; // Окно для анализа
  
  // Пороги
  errorRateThreshold: number; // Порог ошибок для снижения скорости
  latencyThresholdMs: number; // Порог задержки
  
  // Лимиты
  minRate: number;
  maxRate: number;
  
  // Backoff
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  maxBackoffMs: number;
  baseBackoffMs: number;
}

// Конфигурация по умолчанию
const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  initialRate: 10,
  increaseFactor: 1.1,
  decreaseFactor: 0.7,
  adaptationWindowMs: 60000, // 1 минута
  errorRateThreshold: 0.1, // 10%
  latencyThresholdMs: 5000, // 5 секунд
  minRate: 1,
  maxRate: 1000,
  backoffStrategy: 'exponential',
  maxBackoffMs: 300000, // 5 минут
  baseBackoffMs: 1000, // 1 секунда
};

/**
 * Adaptive Rate Controller
 */
export class AdaptiveRateController {
  private registry: ProviderLimitRegistry;
  private states: Map<string, RateState> = new Map();
  private config: AdaptiveConfig;
  private pendingRequests: Map<string, Array<{
    resolve: (value: void) => void;
    timestamp: number;
  }>> = new Map();
  
  constructor(config: Partial<AdaptiveConfig> = {}) {
    this.registry = getProviderLimitRegistry();
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
    
    // Запускаем периодическую адаптацию
    this.startAdaptationLoop();
  }
  
  /**
   * Получение разрешения на запрос
   */
  async acquireSlot(
    provider: ProviderType,
    accountId?: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<{ allowed: boolean; waitMs: number }> {
    const key = this.getStateKey(provider, accountId);
    const state = this.getOrCreateState(provider, accountId);
    const limits = this.registry.getLimits(provider);
    
    // Проверяем throttled состояние
    if (state.isThrottled) {
      if (state.nextAvailableAt && state.nextAvailableAt > new Date()) {
        const waitMs = state.nextAvailableAt.getTime() - Date.now();
        return { allowed: false, waitMs };
      } else {
        // Throttle истёк
        state.isThrottled = false;
        state.throttleReason = undefined;
      }
    }
    
    // Проверяем статические лимиты реестра
    const limitCheck = this.registry.canMakeRequest(provider, accountId);
    if (!limitCheck.allowed) {
      return { allowed: false, waitMs: limitCheck.waitTime || 1000 };
    }
    
    // Проверяем адаптивную скорость
    const now = Date.now();
    const windowStart = now - this.config.adaptationWindowMs;
    const requestsInWindow = this.countRecentRequests(key, windowStart);
    
    if (requestsInWindow >= state.currentRate) {
      // Превышена текущая адаптивная скорость
      const waitMs = Math.ceil(this.config.adaptationWindowMs / state.currentRate);
      return { allowed: false, waitMs };
    }
    
    // Проверяем максимальный рейт провайдера
    const maxRate = limits.requestsPerMinute || this.config.maxRate;
    if (state.currentRate > maxRate) {
      state.currentRate = maxRate;
    }
    
    return { allowed: true, waitMs: 0 };
  }
  
  /**
   * Запись результата запроса
   */
  recordResult(
    provider: ProviderType,
    accountId: string | undefined,
    success: boolean,
    latencyMs: number,
    isRateLimit: boolean = false
  ): void {
    const key = this.getStateKey(provider, accountId);
    const state = this.getOrCreateState(provider, accountId);
    
    // Обновляем историю
    state.recentLatencies.push(latencyMs);
    if (state.recentLatencies.length > 100) {
      state.recentLatencies.shift();
    }
    
    if (success) {
      state.recentSuccesses++;
    } else {
      state.recentErrors++;
    }
    
    // Обрабатываем rate limit
    if (isRateLimit) {
      this.handleRateLimit(state);
    }
    
    // Записываем в реестр
    this.registry.recordRequest(provider, accountId, 0, success, latencyMs);
    
    this.states.set(key, state);
  }
  
  /**
   * Получение текущего состояния
   */
  getState(provider: ProviderType, accountId?: string): RateState {
    return this.getOrCreateState(provider, accountId);
  }
  
  /**
   * Принудительное снижение скорости
   */
  throttle(
    provider: ProviderType,
    accountId: string | undefined,
    reason: string,
    durationMs?: number
  ): void {
    const state = this.getOrCreateState(provider, accountId);
    
    state.isThrottled = true;
    state.throttleReason = reason;
    state.nextAvailableAt = new Date(Date.now() + (durationMs || 60000));
    state.currentRate = Math.max(
      state.currentRate * this.config.decreaseFactor,
      this.config.minRate
    );
    
    this.states.set(this.getStateKey(provider, accountId), state);
  }
  
  /**
   * Сброс состояния
   */
  reset(provider: ProviderType, accountId?: string): void {
    const key = this.getStateKey(provider, accountId);
    this.states.delete(key);
  }
  
  /**
   * Получение рекомендаций по скорости
   */
  getRecommendations(): Array<{
    provider: ProviderType;
    accountId?: string;
    currentRate: number;
    recommendedRate: number;
    healthScore: number;
    issues: string[];
  }> {
    const recommendations: Array<{
      provider: ProviderType;
      accountId?: string;
      currentRate: number;
      recommendedRate: number;
      healthScore: number;
      issues: string[];
    }> = [];
    
    for (const [key, state] of this.states) {
      const issues: string[] = [];
      let healthScore = 100;
      
      // Анализируем ошибки
      const totalRecent = state.recentSuccesses + state.recentErrors;
      if (totalRecent > 0) {
        const errorRate = state.recentErrors / totalRecent;
        if (errorRate > this.config.errorRateThreshold) {
          issues.push(`Высокий уровень ошибок: ${(errorRate * 100).toFixed(1)}%`);
          healthScore -= errorRate * 100;
        }
      }
      
      // Анализируем задержки
      if (state.recentLatencies.length > 0) {
        const avgLatency = state.recentLatencies.reduce((a, b) => a + b, 0) / state.recentLatencies.length;
        if (avgLatency > this.config.latencyThresholdMs) {
          issues.push(`Высокая задержка: ${(avgLatency / 1000).toFixed(1)}s`);
          healthScore -= 20;
        }
      }
      
      // Проверяем throttle
      if (state.isThrottled) {
        issues.push(`Throttled: ${state.throttleReason}`);
        healthScore -= 30;
      }
      
      // Рассчитываем рекомендуемую скорость
      const limits = this.registry.getLimits(state.provider);
      const maxAllowed = limits.requestsPerMinute || this.config.maxRate;
      const recommendedRate = Math.min(
        state.currentRate * (issues.length > 0 ? 0.8 : 1.1),
        maxAllowed
      );
      
      recommendations.push({
        provider: state.provider,
        accountId: state.accountId,
        currentRate: state.currentRate,
        recommendedRate: Math.round(recommendedRate),
        healthScore: Math.max(0, healthScore),
        issues,
      });
    }
    
    return recommendations;
  }
  
  // Private methods
  
  private getStateKey(provider: ProviderType, accountId?: string): string {
    return accountId ? `${provider}:${accountId}` : provider;
  }
  
  private getOrCreateState(provider: ProviderType, accountId?: string): RateState {
    const key = this.getStateKey(provider, accountId);
    
    if (!this.states.has(key)) {
      const limits = this.registry.getLimits(provider);
      const initialRate = Math.min(
        this.config.initialRate,
        limits.requestsPerMinute || this.config.maxRate
      );
      
      const state: RateState = {
        provider,
        accountId,
        currentRate: initialRate,
        targetRate: initialRate,
        maxRate: limits.requestsPerMinute || this.config.maxRate,
        adaptationFactor: 1,
        lastAdaptation: new Date(),
        recentLatencies: [],
        recentErrors: 0,
        recentSuccesses: 0,
        isThrottled: false,
      };
      
      this.states.set(key, state);
    }
    
    return this.states.get(key)!;
  }
  
  private countRecentRequests(key: string, since: number): number {
    const pending = this.pendingRequests.get(key) || [];
    return pending.filter(r => r.timestamp >= since).length;
  }
  
  private handleRateLimit(state: RateState): void {
    // Применяем backoff
    let backoffMs: number;
    
    switch (this.config.backoffStrategy) {
      case 'exponential':
        backoffMs = Math.min(
          this.config.baseBackoffMs * Math.pow(2, state.recentErrors),
          this.config.maxBackoffMs
        );
        break;
      case 'linear':
        backoffMs = Math.min(
          this.config.baseBackoffMs * state.recentErrors,
          this.config.maxBackoffMs
        );
        break;
      case 'fixed':
      default:
        backoffMs = this.config.baseBackoffMs;
    }
    
    state.isThrottled = true;
    state.throttleReason = 'rate_limit';
    state.nextAvailableAt = new Date(Date.now() + backoffMs);
    
    // Уменьшаем скорость
    state.currentRate = Math.max(
      state.currentRate * this.config.decreaseFactor,
      this.config.minRate
    );
  }
  
  private startAdaptationLoop(): void {
    setInterval(() => {
      this.adaptRates();
    }, this.config.adaptationWindowMs);
  }
  
  private adaptRates(): void {
    const now = Date.now();
    
    for (const [key, state] of this.states) {
      // Пропускаем throttled состояния
      if (state.isThrottled) continue;
      
      // Анализируем производительность
      const totalRecent = state.recentSuccesses + state.recentErrors;
      
      if (totalRecent > 0) {
        const errorRate = state.recentErrors / totalRecent;
        const avgLatency = state.recentLatencies.length > 0
          ? state.recentLatencies.reduce((a, b) => a + b, 0) / state.recentLatencies.length
          : 0;
        
        // Адаптируем скорость
        if (errorRate > this.config.errorRateThreshold || avgLatency > this.config.latencyThresholdMs) {
          // Плохая производительность - снижаем скорость
          state.currentRate = Math.max(
            state.currentRate * this.config.decreaseFactor,
            this.config.minRate
          );
        } else if (errorRate < this.config.errorRateThreshold / 2 && avgLatency < this.config.latencyThresholdMs / 2) {
          // Хорошая производительность - повышаем скорость
          state.currentRate = Math.min(
            state.currentRate * this.config.increaseFactor,
            state.maxRate
          );
        }
      }
      
      // Сбрасываем счетчики окна
      state.recentSuccesses = 0;
      state.recentErrors = 0;
      state.lastAdaptation = new Date();
      
      this.states.set(key, state);
    }
  }
}

// Singleton instance
let controllerInstance: AdaptiveRateController | null = null;

export function getAdaptiveRateController(
  config?: Partial<AdaptiveConfig>
): AdaptiveRateController {
  if (!controllerInstance) {
    controllerInstance = new AdaptiveRateController(config);
  }
  return controllerInstance;
}

export default AdaptiveRateController;

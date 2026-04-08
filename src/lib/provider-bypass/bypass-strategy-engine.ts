/**
 * Bypass Strategy Engine
 * 
 * Главная координационная система обхода ограничений
 * Объединяет все стратегии: ротация аккаунтов, proxy, адаптивная скорость
 */

import { ProviderType, getProviderLimitRegistry } from './provider-limit-registry';
import { 
  getProviderRotationManager, 
  ProviderAccount, 
  RotationResult,
  ProviderRotationManager 
} from './provider-rotation-manager';
import { 
  getAdaptiveRateController,
  AdaptiveRateController 
} from './adaptive-rate-controller';
import { getCircuitBreakerManager } from '../circuit-breaker';

// Типы контента
export type ContentType = 'text' | 'image' | 'video' | 'audio';

// Стратегии обхода
export type BypassStrategyType = 
  | 'account_rotation'
  | 'provider_fallback'
  | 'proxy_rotation'
  | 'rate_adaptation'
  | 'delay_spread'
  | 'request_bundling'
  | 'priority_queue'
  | 'circuit_breaker';

// Результат выполнения
export interface BypassExecutionResult {
  success: boolean;
  content?: string;
  provider: ProviderType;
  accountId?: string;
  strategies: BypassStrategyType[];
  totalAttempts: number;
  totalTime: number;
  tokensUsed: number;
  cost: number;
  error?: string;
}

// Конфигурация движка
export interface BypassEngineConfig {
  // Стратегии
  enabledStrategies: BypassStrategyType[];
  strategyPriority: BypassStrategyType[];
  
  // Ретраи
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  
  // Fallback
  fallbackChain: ProviderType[];
  fallbackOnErrors: string[];
  
  // Timeouts
  requestTimeoutMs: number;
  totalTimeoutMs: number;
  
  // Cost control
  maxCostPerRequest: number;
  dailyCostLimit: number;
  
  // Monitoring
  logSuccessfulBypasses: boolean;
  alertOnExhaustion: boolean;
}

// Конфигурация по умолчанию
const DEFAULT_ENGINE_CONFIG: BypassEngineConfig = {
  enabledStrategies: [
    'account_rotation',
    'provider_fallback',
    'rate_adaptation',
    'circuit_breaker',
    'proxy_rotation',
  ],
  strategyPriority: [
    'rate_adaptation',
    'account_rotation',
    'proxy_rotation',
    'provider_fallback',
    'circuit_breaker',
  ],
  maxRetries: 5,
  retryDelayMs: 1000,
  retryBackoffMultiplier: 2,
  fallbackChain: ['cerebras', 'groq', 'gemini', 'deepseek'],
  fallbackOnErrors: ['rate_limit', '429', 'quota_exceeded', 'timeout'],
  requestTimeoutMs: 60000,
  totalTimeoutMs: 300000,
  maxCostPerRequest: 1.0,
  dailyCostLimit: 100,
  logSuccessfulBypasses: true,
  alertOnExhaustion: true,
};

/**
 * Bypass Strategy Engine
 */
export class BypassStrategyEngine {
  private registry = getProviderLimitRegistry();
  private rotationManager: ProviderRotationManager;
  private rateController: AdaptiveRateController;
  private circuitBreaker = getCircuitBreakerManager();
  private config: BypassEngineConfig;
  
  // Статистика
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private bypassesUsed: Map<BypassStrategyType, number> = new Map();
  private dailyCost = 0;
  
  constructor(config: Partial<BypassEngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.rotationManager = getProviderRotationManager();
    this.rateController = getAdaptiveRateController();
    
    // Инициализация счетчиков стратегий
    for (const strategy of this.config.enabledStrategies) {
      this.bypassesUsed.set(strategy, 0);
    }
  }
  
  /**
   * Выполнение запроса с обходом ограничений
   */
  async executeWithBypass<T>(
    requestFn: (provider: ProviderType, account: ProviderAccount, proxy?: RotationResult['proxy']) => Promise<T>,
    options: {
      provider?: ProviderType;
      contentType?: ContentType;
      tokensNeeded?: number;
      priority?: 'high' | 'normal' | 'low';
      maxCost?: number;
    } = {}
  ): Promise<BypassExecutionResult & { result?: T }> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: string | undefined;
    const strategiesUsed: BypassStrategyType[] = [];
    
    // Определяем начальный провайдер
    let currentProvider = options.provider || this.selectBestProvider(options.contentType);
    
    // Проверяем дневной лимит стоимости
    if (this.dailyCost >= this.config.dailyCostLimit) {
      return {
        success: false,
        provider: currentProvider,
        strategies: [],
        totalAttempts: 0,
        totalTime: Date.now() - startTime,
        tokensUsed: 0,
        cost: 0,
        error: 'Daily cost limit exceeded',
      };
    }
    
    this.totalRequests++;
    
    // Цикл попыток с различными стратегиями
    while (attempts < this.config.maxRetries) {
      attempts++;
      
      // Проверяем таймаут
      if (Date.now() - startTime > this.config.totalTimeoutMs) {
        break;
      }
      
      try {
        // 1. Получаем слот с адаптивной скоростью
        const rateSlot = await this.rateController.acquireSlot(
          currentProvider,
          undefined,
          options.priority || 'normal'
        );
        
        if (!rateSlot.allowed) {
          // Стратегия: rate_adaptation
          strategiesUsed.push('rate_adaptation');
          this.bypassesUsed.set('rate_adaptation', (this.bypassesUsed.get('rate_adaptation') || 0) + 1);
          
          if (rateSlot.waitMs > 0) {
            await this.delay(rateSlot.waitMs);
          }
        }
        
        // 2. Получаем лучший аккаунт
        const rotation = this.rotationManager.getBestAccount(
          currentProvider,
          options.tokensNeeded
        );
        
        if (!rotation) {
          // Стратегия: provider_fallback
          const fallback = this.tryFallbackProvider(currentProvider, options);
          if (fallback) {
            currentProvider = fallback;
            strategiesUsed.push('provider_fallback');
            this.bypassesUsed.set('provider_fallback', (this.bypassesUsed.get('provider_fallback') || 0) + 1);
            continue;
          }
          
          throw new Error('No available accounts or providers');
        }
        
        // Записываем использованные стратегии
        if (rotation.bypassStrategy !== 'primary') {
          const strategyParts = rotation.bypassStrategy.split('+');
          for (const part of strategyParts) {
            const strategy = part as BypassStrategyType;
            if (this.config.enabledStrategies.includes(strategy)) {
              strategiesUsed.push(strategy);
              this.bypassesUsed.set(strategy, (this.bypassesUsed.get(strategy) || 0) + 1);
            }
          }
        }
        
        // 3. Выполняем через circuit breaker
        const result = await this.circuitBreaker.execute(
          `${currentProvider}:${rotation.account.id}`,
          async () => {
            return await requestFn(currentProvider, rotation.account, rotation.proxy);
          }
        );
        
        // Успех
        const responseTime = Date.now() - startTime;
        this.rotationManager.recordSuccess(
          currentProvider,
          rotation.account.id,
          0, // tokens - можно передать из результата
          responseTime
        );
        this.rateController.recordResult(currentProvider, rotation.account.id, true, responseTime);
        
        this.successfulRequests++;
        
        return {
          success: true,
          result,
          provider: currentProvider,
          accountId: rotation.account.id,
          strategies: [...new Set(strategiesUsed)],
          totalAttempts: attempts,
          totalTime: responseTime,
          tokensUsed: 0,
          cost: 0,
        };
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        
        // Определяем тип ошибки
        const errorType = this.classifyError(lastError);
        
        // Записываем ошибку
        const isRateLimit = errorType === 'rate_limit';
        this.rateController.recordResult(
          currentProvider,
          undefined,
          false,
          Date.now() - startTime,
          isRateLimit
        );
        
        // Обрабатываем ошибку
        const handling = this.handleError(currentProvider, errorType, lastError, attempts);
        
        if (handling.strategy) {
          strategiesUsed.push(handling.strategy);
          this.bypassesUsed.set(handling.strategy, (this.bypassesUsed.get(handling.strategy) || 0) + 1);
        }
        
        if (handling.newProvider) {
          currentProvider = handling.newProvider;
        }
        
        if (!handling.shouldRetry) {
          break;
        }
        
        if (handling.delayMs > 0) {
          await this.delay(handling.delayMs);
        }
      }
    }
    
    this.failedRequests++;
    
    return {
      success: false,
      provider: currentProvider,
      strategies: [...new Set(strategiesUsed)],
      totalAttempts: attempts,
      totalTime: Date.now() - startTime,
      tokensUsed: 0,
      cost: 0,
      error: lastError,
    };
  }
  
  /**
   * Массовое выполнение с оптимизацией
   */
  async executeBatch<T>(
    requests: Array<{
      requestFn: (provider: ProviderType, account: ProviderAccount, proxy?: RotationResult['proxy']) => Promise<T>;
      options?: {
        provider?: ProviderType;
        contentType?: ContentType;
        priority?: 'high' | 'normal' | 'low';
      };
    }>,
    options: {
      maxConcurrent?: number;
      stopOnError?: boolean;
      progressCallback?: (completed: number, total: number) => void;
    } = {}
  ): Promise<Array<BypassExecutionResult & { result?: T }>> {
    const maxConcurrent = options.maxConcurrent || 5;
    const results: Array<BypassExecutionResult & { result?: T }> = [];
    let completed = 0;
    
    // Разбиваем на батчи
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      
      const batchResults = await Promise.all(
        batch.map(async (req) => {
          try {
            return await this.executeWithBypass(req.requestFn, req.options);
          } catch (error) {
            return {
              success: false,
              provider: req.options?.provider || 'custom' as ProviderType,
              strategies: [],
              totalAttempts: 0,
              totalTime: 0,
              tokensUsed: 0,
              cost: 0,
              error: error instanceof Error ? error.message : String(error),
            } as BypassExecutionResult & { result?: T };
          }
        })
      );
      
      results.push(...batchResults);
      completed += batch.length;
      
      if (options.progressCallback) {
        options.progressCallback(completed, requests.length);
      }
      
      // Если stopOnError и есть ошибка
      if (options.stopOnError && batchResults.some(r => !r.success)) {
        break;
      }
      
      // Небольшая пауза между батчами
      if (i + maxConcurrent < requests.length) {
        await this.delay(100);
      }
    }
    
    return results;
  }
  
  /**
   * Получение статистики движка
   */
  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    bypassesUsed: Record<string, number>;
    dailyCost: number;
    providerStats: Array<{
      provider: ProviderType;
      available: boolean;
      remainingQuota: number;
    }>;
  } {
    const successRate = this.totalRequests > 0 
      ? this.successfulRequests / this.totalRequests 
      : 0;
    
    const bypassStats: Record<string, number> = {};
    for (const [strategy, count] of this.bypassesUsed) {
      bypassStats[strategy] = count;
    }
    
    const providerStats = this.registry.getAvailableProviders().map(p => ({
      provider: p.provider,
      available: p.remaining > 0,
      remainingQuota: p.remaining,
    }));
    
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      successRate,
      bypassesUsed: bypassStats,
      dailyCost: this.dailyCost,
      providerStats,
    };
  }
  
  /**
   * Сброс дневной статистики
   */
  resetDailyStats(): void {
    this.dailyCost = 0;
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    
    for (const strategy of this.config.enabledStrategies) {
      this.bypassesUsed.set(strategy, 0);
    }
    
    this.rotationManager.resetDailyStats();
  }
  
  /**
   * Регистрация аккаунтов провайдеров
   */
  registerAccounts(accounts: ProviderAccount[]): void {
    this.rotationManager.registerAccounts(accounts);
  }
  
  // Private methods
  
  private selectBestProvider(contentType?: ContentType): ProviderType {
    const available = this.registry.getAvailableProviders(contentType);
    
    if (available.length === 0) {
      return this.config.fallbackChain[0];
    }
    
    // Сортируем по остатку квоты и возвращаем лучший
    return available[0].provider;
  }
  
  private tryFallbackProvider(
    currentProvider: ProviderType,
    options: { contentType?: ContentType }
  ): ProviderType | null {
    for (const fallback of this.config.fallbackChain) {
      if (fallback === currentProvider) continue;
      
      const check = this.registry.canMakeRequest(fallback);
      if (check.allowed) {
        return fallback;
      }
    }
    
    return null;
  }
  
  private classifyError(error: string): string {
    const errorPatterns: Record<string, RegExp> = {
      rate_limit: /rate.?limit|429|too.?many.?requests/i,
      quota_exceeded: /quota.?exceeded|limit.?exceeded|out.?of.?quota/i,
      timeout: /timeout|timed.?out|etimedout/i,
      auth_error: /unauthorized|401|invalid.?api.?key|authentication/i,
      server_error: /500|502|503|504|server.?error|internal.?error/i,
      banned: /banned|blocked|forbidden|403/i,
    };
    
    for (const [type, pattern] of Object.entries(errorPatterns)) {
      if (pattern.test(error)) {
        return type;
      }
    }
    
    return 'unknown';
  }
  
  private handleError(
    provider: ProviderType,
    errorType: string,
    errorMessage: string,
    attempt: number
  ): {
    shouldRetry: boolean;
    delayMs: number;
    strategy?: BypassStrategyType;
    newProvider?: ProviderType;
  } {
    const shouldFallback = this.config.fallbackOnErrors.some(e => 
      errorType.includes(e) || errorMessage.toLowerCase().includes(e)
    );
    
    switch (errorType) {
      case 'rate_limit':
        this.rotationManager.recordError(provider, undefined, errorMessage, true);
        return {
          shouldRetry: true,
          delayMs: this.calculateRetryDelay(attempt),
          strategy: 'rate_adaptation',
        };
        
      case 'quota_exceeded':
        if (shouldFallback) {
          const fallback = this.tryFallbackProvider(provider, {});
          if (fallback) {
            return {
              shouldRetry: true,
              delayMs: 0,
              strategy: 'provider_fallback',
              newProvider: fallback,
            };
          }
        }
        return {
          shouldRetry: false,
          delayMs: 0,
        };
        
      case 'timeout':
        return {
          shouldRetry: attempt < 3,
          delayMs: this.config.retryDelayMs * attempt,
        };
        
      case 'server_error':
        return {
          shouldRetry: attempt < 2,
          delayMs: this.config.retryDelayMs * 2,
          strategy: 'circuit_breaker',
        };
        
      case 'banned':
        this.rotationManager.recordError(provider, undefined, errorMessage, false);
        if (shouldFallback) {
          const fallback = this.tryFallbackProvider(provider, {});
          if (fallback) {
            return {
              shouldRetry: true,
              delayMs: 0,
              strategy: 'provider_fallback',
              newProvider: fallback,
            };
          }
        }
        return {
          shouldRetry: false,
          delayMs: 0,
        };
        
      default:
        return {
          shouldRetry: attempt < this.config.maxRetries,
          delayMs: this.calculateRetryDelay(attempt),
        };
    }
  }
  
  private calculateRetryDelay(attempt: number): number {
    return Math.min(
      this.config.retryDelayMs * Math.pow(this.config.retryBackoffMultiplier, attempt - 1),
      60000 // Максимум 1 минута
    );
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let engineInstance: BypassStrategyEngine | null = null;

export function getBypassStrategyEngine(
  config?: Partial<BypassEngineConfig>
): BypassStrategyEngine {
  if (!engineInstance) {
    engineInstance = new BypassStrategyEngine(config);
  }
  return engineInstance;
}

export default BypassStrategyEngine;

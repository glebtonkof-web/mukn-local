/**
 * Circuit Breaker
 * 
 * Предотвращает каскадные сбои при недоступности внешних сервисов.
 * Автоматически восстанавливает соединение после остывания.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Количество ошибок для открытия
  successThreshold: number;      // Количество успехов для закрытия
  timeout: number;               // ms до попытки восстановления
  halfOpenMaxCalls: number;      // Максимум вызовов в half-open
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000, // 1 минута
  halfOpenMaxCalls: 1
};

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private openedAt?: Date;
  private halfOpenCalls = 0;
  private totalCalls = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Выполнить функцию через circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Проверяем состояние
    if (this.state === 'open') {
      // Проверяем, можно ли перейти в half-open
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
        this.halfOpenCalls = 0;
        console.log(`🔄 [Circuit:${this.name}] Переход в half-open`);
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
    }

    this.totalCalls++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Успешный вызов
   */
  private onSuccess(): void {
    this.successes++;
    this.totalSuccesses++;
    this.lastSuccess = new Date();

    if (this.state === 'half-open') {
      this.halfOpenCalls++;
      if (this.successes >= this.config.successThreshold) {
        this.close();
      }
    } else if (this.state === 'closed') {
      this.failures = 0;
    }
  }

  /**
   * Неудачный вызов
   */
  private onFailure(): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailure = new Date();

    if (this.state === 'half-open') {
      this.open();
    } else if (this.state === 'closed') {
      if (this.failures >= this.config.failureThreshold) {
        this.open();
      }
    }
  }

  /**
   * Открыть circuit
   */
  private open(): void {
    this.state = 'open';
    this.openedAt = new Date();
    this.successes = 0;
    console.warn(`🔴 [Circuit:${this.name}] Открыт (failures: ${this.failures})`);
  }

  /**
   * Закрыть circuit
   */
  private close(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.openedAt = undefined;
    console.log(`🟢 [Circuit:${this.name}] Закрыт`);
  }

  /**
   * Проверить, можно ли попытаться восстановить
   */
  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return false;
    return Date.now() - this.openedAt.getTime() >= this.config.timeout;
  }

  /**
   * Получить статистику
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }

  /**
   * Принудительно открыть
   */
  forceOpen(): void {
    this.open();
  }

  /**
   * Принудительно закрыть
   */
  forceClose(): void {
    this.close();
  }

  /**
   * Сбросить статистику
   */
  reset(): void {
    this.close();
    this.totalCalls = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
  }
}

/**
 * Менеджер Circuit Breakers
 */
class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Получить или создать circuit breaker
   */
  getBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Выполнить через circuit breaker
   */
  async execute<T>(name: string, fn: () => Promise<T>, config?: CircuitBreakerConfig): Promise<T> {
    return this.getBreaker(name, config).execute(fn);
  }

  /**
   * Получить все статистики
   */
  getAllStats(): Record<string, CircuitStats> {
    const result: Record<string, CircuitStats> = {};
    for (const [name, breaker] of this.breakers) {
      result[name] = breaker.getStats();
    }
    return result;
  }

  /**
   * Сбросить все
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Singleton
let managerInstance: CircuitBreakerManager | null = null;

export function getCircuitBreakerManager(): CircuitBreakerManager {
  if (!managerInstance) {
    managerInstance = new CircuitBreakerManager();
  }
  return managerInstance;
}

// Предустановленные circuit breakers для внешних API
export const ExternalServices = {
  CAPTCHA_2CAPTCHA: 'captcha-2captcha',
  CAPTCHA_ANTICAPTCHA: 'captcha-anticaptcha',
  CAPTCHA_CAPMONSTER: 'captcha-capmonster',
  TEMP_EMAIL_1SECMAIL: 'temp-email-1secmail',
  TEMP_EMAIL_TEMPMAIL: 'temp-email-tempmail',
  PROXY_CHECKER: 'proxy-checker',
  TELEGRAM_API: 'telegram-api',
  SMTP: 'smtp'
} as const;

export { CircuitBreaker };

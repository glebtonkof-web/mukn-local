/**
 * Provider Limit Registry
 * 
 * Центральный реестр ограничений всех провайдеров
 * Поддержка 10+ провайдеров с автоматическим определением лимитов
 */

// Типы провайдеров
export type ProviderType = 
  | 'openrouter'
  | 'gemini'
  | 'groq'
  | 'deepseek'
  | 'cerebras'
  | 'claude'
  | 'gpt4'
  | 'kling'
  | 'luma'
  | 'runway'
  | 'pollo'
  | 'pika'
  | 'sora'
  | 'midjourney'
  | 'stability'
  | 'elevenlabs'
  | 'custom';

// Типы ограничений
export interface ProviderLimit {
  // Rate limits
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  requestsPerMonth?: number;
  
  // Token limits
  tokensPerMinute?: number;
  tokensPerHour?: number;
  tokensPerDay?: number;
  tokensPerRequest?: number;
  
  // Concurrent requests
  maxConcurrent?: number;
  
  // Quotas
  dailyQuota?: number;
  monthlyQuota?: number;
  
  // Time-based
  cooldownMinutes?: number;
  rateLimitWindowMs?: number;
  
  // Account-based
  accountsRequired?: number;
  multiAccountSupported?: boolean;
  
  // Proxy requirements
  proxyRequired?: boolean;
  proxyRotationEnabled?: boolean;
  stickySessionRequired?: boolean;
  
  // Feature limits
  imageGeneration?: number;
  videoGeneration?: number;
  audioGeneration?: number;
  textGeneration?: number;
  
  // Pricing
  isFree?: boolean;
  costPerToken?: number;
  costPerRequest?: number;
  
  // Error handling
  maxRetries?: number;
  retryDelayMs?: number;
  backoffMultiplier?: number;
  
  // Geo restrictions
  geoRestricted?: string[];
  geoAllowed?: string[];
}

// Известные ограничения провайдеров
export const PROVIDER_LIMITS: Record<ProviderType, ProviderLimit> = {
  openrouter: {
    requestsPerMinute: 20,
    requestsPerHour: 200,
    requestsPerDay: 50, // Free tier
    tokensPerRequest: 128000,
    maxConcurrent: 5,
    dailyQuota: 50,
    isFree: true,
    multiAccountSupported: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 1000,
    backoffMultiplier: 2,
    textGeneration: Infinity,
    imageGeneration: 0,
    videoGeneration: 0,
  },
  
  gemini: {
    requestsPerMinute: 15,
    requestsPerHour: 100,
    requestsPerDay: 500, // Free tier
    tokensPerMinute: 1000000,
    tokensPerRequest: 200000,
    maxConcurrent: 10,
    dailyQuota: 500,
    isFree: true,
    multiAccountSupported: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 500,
    backoffMultiplier: 1.5,
    textGeneration: Infinity,
    imageGeneration: 0,
    videoGeneration: 0,
  },
  
  groq: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    requestsPerDay: 1000,
    tokensPerMinute: 18000,
    tokensPerRequest: 131072,
    maxConcurrent: 5,
    dailyQuota: 1000,
    isFree: true,
    multiAccountSupported: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 300,
    backoffMultiplier: 1.5,
    textGeneration: Infinity,
  },
  
  deepseek: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    tokensPerMinute: 1000000,
    tokensPerRequest: 64000,
    maxConcurrent: 10,
    isFree: false,
    costPerToken: 0.00014, // $0.14 per 1M tokens input
    multiAccountSupported: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 1000,
    backoffMultiplier: 2,
    textGeneration: Infinity,
  },
  
  cerebras: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    requestsPerDay: 14400,
    tokensPerMinute: 60000000, // 60M tokens/min
    tokensPerRequest: 128000,
    maxConcurrent: 10,
    dailyQuota: 14400,
    isFree: true,
    multiAccountSupported: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 200,
    backoffMultiplier: 1.3,
    textGeneration: Infinity,
  },
  
  claude: {
    requestsPerMinute: 5,
    requestsPerHour: 100,
    tokensPerMinute: 100000,
    tokensPerRequest: 200000,
    maxConcurrent: 3,
    isFree: false,
    costPerToken: 0.003, // $3 per 1M tokens input
    multiAccountSupported: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 2000,
    backoffMultiplier: 2,
    textGeneration: Infinity,
  },
  
  gpt4: {
    requestsPerMinute: 500, // Tier 1
    requestsPerHour: 10000,
    tokensPerMinute: 200000,
    tokensPerRequest: 128000,
    maxConcurrent: 10,
    isFree: false,
    costPerToken: 0.0025, // $2.50 per 1M tokens input
    multiAccountSupported: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 1000,
    backoffMultiplier: 2,
    textGeneration: Infinity,
    imageGeneration: 500,
  },
  
  kling: {
    requestsPerMinute: 5,
    requestsPerHour: 50,
    requestsPerDay: 100,
    maxConcurrent: 2,
    dailyQuota: 100,
    isFree: true,
    multiAccountSupported: true,
    proxyRequired: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 5000,
    backoffMultiplier: 2,
    videoGeneration: 100,
    cooldownMinutes: 30,
  },
  
  luma: {
    requestsPerMinute: 3,
    requestsPerHour: 30,
    requestsPerDay: 50,
    maxConcurrent: 2,
    dailyQuota: 50,
    isFree: true,
    multiAccountSupported: true,
    proxyRequired: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 3000,
    backoffMultiplier: 2,
    videoGeneration: 50,
    cooldownMinutes: 20,
  },
  
  runway: {
    requestsPerMinute: 2,
    requestsPerHour: 20,
    requestsPerDay: 30,
    maxConcurrent: 1,
    dailyQuota: 30,
    isFree: true,
    multiAccountSupported: true,
    proxyRequired: true,
    proxyRotationEnabled: true,
    stickySessionRequired: true,
    maxRetries: 2,
    retryDelayMs: 10000,
    backoffMultiplier: 3,
    videoGeneration: 30,
    cooldownMinutes: 60,
  },
  
  pollo: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 200,
    maxConcurrent: 5,
    dailyQuota: 200,
    isFree: true,
    multiAccountSupported: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 1000,
    backoffMultiplier: 1.5,
    textGeneration: 200,
    imageGeneration: 200,
  },
  
  pika: {
    requestsPerMinute: 3,
    requestsPerHour: 30,
    requestsPerDay: 50,
    maxConcurrent: 2,
    dailyQuota: 50,
    isFree: true,
    multiAccountSupported: true,
    proxyRequired: true,
    proxyRotationEnabled: true,
    maxRetries: 2,
    retryDelayMs: 5000,
    backoffMultiplier: 2,
    videoGeneration: 50,
    cooldownMinutes: 30,
  },
  
  sora: {
    requestsPerMinute: 2,
    requestsPerHour: 10,
    requestsPerDay: 20,
    maxConcurrent: 1,
    dailyQuota: 20,
    isFree: false,
    costPerRequest: 0.20,
    multiAccountSupported: true,
    proxyRequired: true,
    maxRetries: 2,
    retryDelayMs: 10000,
    backoffMultiplier: 3,
    videoGeneration: 20,
    cooldownMinutes: 60,
  },
  
  midjourney: {
    requestsPerMinute: 1,
    requestsPerHour: 20,
    requestsPerDay: 100,
    maxConcurrent: 3,
    isFree: false,
    costPerRequest: 0.10,
    multiAccountSupported: true,
    proxyRequired: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 5000,
    backoffMultiplier: 2,
    imageGeneration: 100,
    cooldownMinutes: 15,
  },
  
  stability: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 500,
    maxConcurrent: 5,
    dailyQuota: 500,
    isFree: true,
    multiAccountSupported: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 1000,
    backoffMultiplier: 1.5,
    imageGeneration: 500,
  },
  
  elevenlabs: {
    requestsPerMinute: 5,
    requestsPerHour: 50,
    requestsPerDay: 100,
    tokensPerMonth: 5000, // characters
    maxConcurrent: 3,
    dailyQuota: 100,
    isFree: true,
    multiAccountSupported: true,
    proxyRotationEnabled: true,
    maxRetries: 3,
    retryDelayMs: 2000,
    backoffMultiplier: 2,
    audioGeneration: 100,
  },
  
  custom: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    maxConcurrent: 20,
    isFree: true,
    multiAccountSupported: true,
    proxyRotationEnabled: true,
    maxRetries: 5,
    retryDelayMs: 500,
    backoffMultiplier: 1.5,
  },
};

// Динамические лимиты (определяются в runtime)
export interface DynamicLimit {
  provider: ProviderType;
  limitType: string;
  currentValue: number;
  maxValue: number;
  resetAt: Date;
  detectedAt: Date;
  source: 'api' | 'header' | 'error' | 'manual';
}

// Статистика использования провайдера
export interface ProviderUsageStats {
  provider: ProviderType;
  accountId?: string;
  
  // Текущее использование
  currentMinuteRequests: number;
  currentHourRequests: number;
  currentDayRequests: number;
  currentMonthRequests: number;
  
  // Токены
  currentMinuteTokens: number;
  currentHourTokens: number;
  currentDayTokens: number;
  
  // Временные метки
  minuteStartedAt: Date;
  hourStartedAt: Date;
  dayStartedAt: Date;
  
  // Ошибки
  consecutiveErrors: number;
  lastError?: string;
  lastErrorAt?: Date;
  
  // Кулдаун
  cooldownUntil?: Date;
  
  // Успешность
  totalRequests: number;
  successfulRequests: number;
  avgResponseTime: number;
}

/**
 * Provider Limit Registry Class
 */
export class ProviderLimitRegistry {
  private limits: Map<string, ProviderLimit> = new Map();
  private dynamicLimits: Map<string, DynamicLimit> = new Map();
  private usageStats: Map<string, ProviderUsageStats> = new Map();
  private lastResetMinute: Date = new Date();
  private lastResetHour: Date = new Date();
  private lastResetDay: Date = new Date();
  
  constructor() {
    // Инициализация предустановленных лимитов
    for (const [provider, limits] of Object.entries(PROVIDER_LIMITS)) {
      this.limits.set(provider, limits);
    }
    
    // Запускаем периодический сброс счетчиков
    this.startResetTimers();
  }
  
  /**
   * Получить лимиты провайдера
   */
  getLimits(provider: ProviderType): ProviderLimit {
    return this.limits.get(provider) || PROVIDER_LIMITS.custom;
  }
  
  /**
   * Обновить лимиты провайдера
   */
  updateLimits(provider: ProviderType, limits: Partial<ProviderLimit>): void {
    const existing = this.getLimits(provider);
    this.limits.set(provider, { ...existing, ...limits });
  }
  
  /**
   * Получить статистику использования
   */
  getUsageStats(provider: ProviderType, accountId?: string): ProviderUsageStats {
    const key = accountId ? `${provider}:${accountId}` : provider;
    
    if (!this.usageStats.has(key)) {
      this.usageStats.set(key, this.createEmptyStats(provider, accountId));
    }
    
    return this.usageStats.get(key)!;
  }
  
  /**
   * Проверить, можно ли выполнить запрос
   */
  canMakeRequest(
    provider: ProviderType,
    accountId?: string,
    tokensNeeded: number = 0
  ): { allowed: boolean; reason?: string; waitTime?: number } {
    const limits = this.getLimits(provider);
    const stats = this.getUsageStats(provider, accountId);
    const now = new Date();
    
    // Проверка кулдауна
    if (stats.cooldownUntil && stats.cooldownUntil > now) {
      return {
        allowed: false,
        reason: 'cooldown',
        waitTime: stats.cooldownUntil.getTime() - now.getTime(),
      };
    }
    
    // Проверка минутного лимита
    if (limits.requestsPerMinute && stats.currentMinuteRequests >= limits.requestsPerMinute) {
      const waitTime = 60000 - (now.getTime() - stats.minuteStartedAt.getTime());
      return {
        allowed: false,
        reason: 'minute_limit',
        waitTime: Math.max(0, waitTime),
      };
    }
    
    // Проверка часового лимита
    if (limits.requestsPerHour && stats.currentHourRequests >= limits.requestsPerHour) {
      const waitTime = 3600000 - (now.getTime() - stats.hourStartedAt.getTime());
      return {
        allowed: false,
        reason: 'hour_limit',
        waitTime: Math.max(0, waitTime),
      };
    }
    
    // Проверка дневного лимита
    if (limits.requestsPerDay && stats.currentDayRequests >= limits.requestsPerDay) {
      const waitTime = 86400000 - (now.getTime() - stats.dayStartedAt.getTime());
      return {
        allowed: false,
        reason: 'day_limit',
        waitTime: Math.max(0, waitTime),
      };
    }
    
    // Проверка дневной квоты
    if (limits.dailyQuota && stats.currentDayRequests >= limits.dailyQuota) {
      const waitTime = 86400000 - (now.getTime() - stats.dayStartedAt.getTime());
      return {
        allowed: false,
        reason: 'daily_quota',
        waitTime: Math.max(0, waitTime),
      };
    }
    
    // Проверка токенов
    if (limits.tokensPerMinute && stats.currentMinuteTokens + tokensNeeded > limits.tokensPerMinute) {
      const waitTime = 60000 - (now.getTime() - stats.minuteStartedAt.getTime());
      return {
        allowed: false,
        reason: 'token_limit',
        waitTime: Math.max(0, waitTime),
      };
    }
    
    // Проверка последовательных ошибок
    if (stats.consecutiveErrors >= 3) {
      return {
        allowed: false,
        reason: 'error_backoff',
        waitTime: Math.min(30000 * Math.pow(2, stats.consecutiveErrors - 3), 300000),
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Записать запрос
   */
  recordRequest(
    provider: ProviderType,
    accountId?: string,
    tokens: number = 0,
    success: boolean = true,
    responseTime: number = 0
  ): void {
    const stats = this.getUsageStats(provider, accountId);
    const now = new Date();
    
    // Обновляем счетчики
    stats.currentMinuteRequests++;
    stats.currentHourRequests++;
    stats.currentDayRequests++;
    stats.currentMonthRequests++;
    stats.currentMinuteTokens += tokens;
    stats.currentHourTokens += tokens;
    stats.currentDayTokens += tokens;
    
    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
      stats.consecutiveErrors = 0;
      
      // Обновляем среднее время ответа
      stats.avgResponseTime = 
        (stats.avgResponseTime * (stats.successfulRequests - 1) + responseTime) / 
        stats.successfulRequests;
    } else {
      stats.consecutiveErrors++;
      stats.lastError = 'Request failed';
      stats.lastErrorAt = now;
    }
    
    this.usageStats.set(accountId ? `${provider}:${accountId}` : provider, stats);
  }
  
  /**
   * Записать ошибку с деталями
   */
  recordError(
    provider: ProviderType,
    accountId: string | undefined,
    error: string,
    isRateLimit: boolean = false
  ): void {
    const stats = this.getUsageStats(provider, accountId);
    const now = new Date();
    
    stats.consecutiveErrors++;
    stats.lastError = error;
    stats.lastErrorAt = now;
    
    // Если это rate limit, устанавливаем кулдаун
    if (isRateLimit) {
      const limits = this.getLimits(provider);
      const cooldownMs = (limits.cooldownMinutes || 5) * 60000;
      stats.cooldownUntil = new Date(now.getTime() + cooldownMs);
    }
    
    this.usageStats.set(accountId ? `${provider}:${accountId}` : provider, stats);
    
    // Пытаемся определить динамический лимит из ошибки
    this.detectDynamicLimit(provider, error);
  }
  
  /**
   * Установить кулдаун
   */
  setCooldown(
    provider: ProviderType,
    accountId: string | undefined,
    durationMs: number
  ): void {
    const stats = this.getUsageStats(provider, accountId);
    stats.cooldownUntil = new Date(Date.now() + durationMs);
    this.usageStats.set(accountId ? `${provider}:${accountId}` : provider, stats);
  }
  
  /**
   * Сбросить дневные счетчики
   */
  resetDailyStats(): void {
    for (const [key, stats] of this.usageStats) {
      stats.currentDayRequests = 0;
      stats.currentDayTokens = 0;
      stats.dayStartedAt = new Date();
      this.usageStats.set(key, stats);
    }
    this.lastResetDay = new Date();
  }
  
  /**
   * Получить всех провайдеров с доступной квотой
   */
  getAvailableProviders(
    contentType?: 'text' | 'image' | 'video' | 'audio'
  ): Array<{ provider: ProviderType; remaining: number }> {
    const result: Array<{ provider: ProviderType; remaining: number }> = [];
    
    for (const [providerName, limits] of this.limits) {
      // Проверяем поддержку типа контента
      if (contentType) {
        const limitKey = `${contentType}Generation` as keyof ProviderLimit;
        const contentLimit = limits[limitKey];
        if (contentLimit === 0) continue;
      }
      
      const stats = this.getUsageStats(providerName as ProviderType);
      const dailyQuota = limits.dailyQuota || limits.requestsPerDay || Infinity;
      const remaining = Math.max(0, dailyQuota - stats.currentDayRequests);
      
      if (remaining > 0) {
        result.push({
          provider: providerName as ProviderType,
          remaining,
        });
      }
    }
    
    return result.sort((a, b) => b.remaining - a.remaining);
  }
  
  /**
   * Обновить динамический лимит из ответа API
   */
  updateFromHeaders(
    provider: ProviderType,
    headers: Record<string, string>
  ): void {
    const limitMappings: Record<string, keyof DynamicLimit> = {
      'x-ratelimit-limit': 'maxValue',
      'x-ratelimit-remaining': 'currentValue',
      'x-ratelimit-reset': 'resetAt',
      'retry-after': 'resetAt',
    };
    
    for (const [header, limitType] of Object.entries(limitMappings)) {
      const value = headers[header] || headers[header.toLowerCase()];
      if (value) {
        this.updateDynamicLimit(provider, header, value);
      }
    }
  }
  
  // Private methods
  
  private createEmptyStats(provider: ProviderType, accountId?: string): ProviderUsageStats {
    const now = new Date();
    return {
      provider,
      accountId,
      currentMinuteRequests: 0,
      currentHourRequests: 0,
      currentDayRequests: 0,
      currentMonthRequests: 0,
      currentMinuteTokens: 0,
      currentHourTokens: 0,
      currentDayTokens: 0,
      minuteStartedAt: now,
      hourStartedAt: now,
      dayStartedAt: now,
      consecutiveErrors: 0,
      totalRequests: 0,
      successfulRequests: 0,
      avgResponseTime: 0,
    };
  }
  
  private updateDynamicLimit(
    provider: ProviderType,
    limitType: string,
    value: string
  ): void {
    const key = `${provider}:${limitType}`;
    const existing = this.dynamicLimits.get(key);
    
    const dynamicLimit: DynamicLimit = {
      provider,
      limitType,
      currentValue: parseInt(value) || 0,
      maxValue: existing?.maxValue || 0,
      resetAt: existing?.resetAt || new Date(),
      detectedAt: new Date(),
      source: 'header',
    };
    
    // Парсим время сброса
    if (limitType.includes('reset') || limitType.includes('retry')) {
      const resetSeconds = parseInt(value);
      if (!isNaN(resetSeconds)) {
        dynamicLimit.resetAt = new Date(Date.now() + resetSeconds * 1000);
      }
    }
    
    this.dynamicLimits.set(key, dynamicLimit);
  }
  
  private detectDynamicLimit(provider: ProviderType, error: string): void {
    // Пытаемся извлечь лимиты из сообщения об ошибке
    const rateLimitMatch = error.match(/rate.?limit|too.?many.?requests|429/i);
    if (rateLimitMatch) {
      // Извлекаем время ожидания
      const waitMatch = error.match(/(\d+)\s*(second|minute|hour)/i);
      if (waitMatch) {
        const value = parseInt(waitMatch[1]);
        const unit = waitMatch[2].toLowerCase();
        let waitMs = value * 1000;
        if (unit === 'minute') waitMs *= 60;
        if (unit === 'hour') waitMs *= 3600;
        
        this.setCooldown(provider, undefined, waitMs);
      }
    }
  }
  
  private startResetTimers(): void {
    // Сброс минутных счетчиков
    setInterval(() => {
      const now = new Date();
      for (const [key, stats] of this.usageStats) {
        if (now.getTime() - stats.minuteStartedAt.getTime() >= 60000) {
          stats.currentMinuteRequests = 0;
          stats.currentMinuteTokens = 0;
          stats.minuteStartedAt = now;
          this.usageStats.set(key, stats);
        }
      }
    }, 10000); // Проверка каждые 10 секунд
    
    // Сброс часовых счетчиков
    setInterval(() => {
      const now = new Date();
      for (const [key, stats] of this.usageStats) {
        if (now.getTime() - stats.hourStartedAt.getTime() >= 3600000) {
          stats.currentHourRequests = 0;
          stats.currentHourTokens = 0;
          stats.hourStartedAt = now;
          this.usageStats.set(key, stats);
        }
      }
    }, 60000); // Проверка каждую минуту
    
    // Сброс дневных счетчиков в полночь
    const msUntilMidnight = this.getMsUntilMidnight();
    setTimeout(() => {
      this.resetDailyStats();
      setInterval(() => this.resetDailyStats(), 86400000);
    }, msUntilMidnight);
  }
  
  private getMsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }
}

// Singleton instance
let registryInstance: ProviderLimitRegistry | null = null;

export function getProviderLimitRegistry(): ProviderLimitRegistry {
  if (!registryInstance) {
    registryInstance = new ProviderLimitRegistry();
  }
  return registryInstance;
}

export default ProviderLimitRegistry;

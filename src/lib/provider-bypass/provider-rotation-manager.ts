/**
 * Provider Rotation Manager
 * 
 * Умная ротация провайдеров и аккаунтов для обхода ограничений
 * Поддержка multi-account, proxy rotation, fallback chains
 */

import { 
  ProviderType, 
  ProviderLimit, 
  getProviderLimitRegistry,
  ProviderLimitRegistry 
} from './provider-limit-registry';
import { getCircuitBreakerManager } from '../circuit-breaker';

// Интерфейсы
export interface ProviderAccount {
  id: string;
  provider: ProviderType;
  apiKey?: string;
  email?: string;
  password?: string;
  sessionData?: string;
  cookies?: string;
  
  // Proxy
  proxyId?: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  proxyType?: 'http' | 'https' | 'socks4' | 'socks5';
  
  // Status
  isActive: boolean;
  status: 'active' | 'cooldown' | 'exhausted' | 'banned' | 'error';
  priority: number;
  
  // Limits
  hourlyLimit?: number;
  hourlyUsed: number;
  dailyLimit?: number;
  dailyUsed: number;
  
  // Stats
  totalRequests: number;
  successfulRequests: number;
  consecutiveErrors: number;
  lastError?: string;
  lastUsedAt?: Date;
  cooldownUntil?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface RotationConfig {
  // Стратегия ротации
  strategy: 'round-robin' | 'least-used' | 'fastest' | 'random' | 'smart';
  
  // Параметры
  minCooldownMs: number;
  maxCooldownMs: number;
  errorBackoffMultiplier: number;
  maxConsecutiveErrors: number;
  
  // Fallback
  fallbackEnabled: boolean;
  fallbackProviders: ProviderType[];
  
  // Proxy
  rotateProxyOnBan: boolean;
  stickyProxySession: boolean;
  
  // Account
  rotateAccountOnLimit: boolean;
  minAccountIntervalMs: number;
}

export interface RotationResult {
  account: ProviderAccount;
  provider: ProviderType;
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    type: string;
  };
  bypassStrategy: string;
  estimatedWaitMs: number;
}

// Конфигурация по умолчанию
const DEFAULT_CONFIG: RotationConfig = {
  strategy: 'smart',
  minCooldownMs: 1000,
  maxCooldownMs: 300000, // 5 минут
  errorBackoffMultiplier: 2,
  maxConsecutiveErrors: 5,
  fallbackEnabled: true,
  fallbackProviders: ['cerebras', 'groq', 'gemini'],
  rotateProxyOnBan: true,
  stickyProxySession: false,
  rotateAccountOnLimit: true,
  minAccountIntervalMs: 500,
};

/**
 * Provider Rotation Manager
 */
export class ProviderRotationManager {
  private registry: ProviderLimitRegistry;
  private circuitBreaker = getCircuitBreakerManager();
  private accounts: Map<string, ProviderAccount> = new Map();
  private accountsByProvider: Map<ProviderType, string[]> = new Map();
  private lastRotationTime: Map<string, Date> = new Map();
  private config: RotationConfig;
  
  constructor(config: Partial<RotationConfig> = {}) {
    this.registry = getProviderLimitRegistry();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Регистрация аккаунта провайдера
   */
  registerAccount(account: ProviderAccount): void {
    this.accounts.set(account.id, account);
    
    // Группируем по провайдеру
    const providerAccounts = this.accountsByProvider.get(account.provider) || [];
    if (!providerAccounts.includes(account.id)) {
      providerAccounts.push(account.id);
      this.accountsByProvider.set(account.provider, providerAccounts);
    }
  }
  
  /**
   * Массовая регистрация аккаунтов
   */
  registerAccounts(accounts: ProviderAccount[]): void {
    for (const account of accounts) {
      this.registerAccount(account);
    }
  }
  
  /**
   * Удаление аккаунта
   */
  unregisterAccount(accountId: string): void {
    const account = this.accounts.get(accountId);
    if (account) {
      const providerAccounts = this.accountsByProvider.get(account.provider) || [];
      const index = providerAccounts.indexOf(accountId);
      if (index > -1) {
        providerAccounts.splice(index, 1);
        this.accountsByProvider.set(account.provider, providerAccounts);
      }
      this.accounts.delete(accountId);
    }
  }
  
  /**
   * Получение лучшего аккаунта для провайдера
   */
  getBestAccount(
    provider: ProviderType,
    tokensNeeded: number = 0
  ): RotationResult | null {
    const accounts = this.getAvailableAccounts(provider);
    
    if (accounts.length === 0) {
      // Пробуем fallback провайдеры
      if (this.config.fallbackEnabled) {
        return this.getFallbackAccount(provider, tokensNeeded);
      }
      return null;
    }
    
    // Выбираем аккаунт по стратегии
    const selectedAccount = this.selectAccountByStrategy(accounts, provider);
    
    // Проверяем лимиты
    const limitCheck = this.registry.canMakeRequest(
      provider,
      selectedAccount.id,
      tokensNeeded
    );
    
    if (!limitCheck.allowed) {
      // Если лимит, пробуем другой аккаунт или fallback
      if (this.config.rotateAccountOnLimit) {
        const otherAccounts = accounts.filter(a => a.id !== selectedAccount.id);
        if (otherAccounts.length > 0) {
          return this.getBestAccount(provider, tokensNeeded);
        }
      }
      
      if (this.config.fallbackEnabled) {
        return this.getFallbackAccount(provider, tokensNeeded);
      }
      
      return null;
    }
    
    // Формируем результат
    const result: RotationResult = {
      account: selectedAccount,
      provider,
      bypassStrategy: this.getBypassStrategy(selectedAccount),
      estimatedWaitMs: limitCheck.waitTime || 0,
      proxy: this.getAccountProxy(selectedAccount),
    };
    
    // Записываем время ротации
    this.lastRotationTime.set(`${provider}:${selectedAccount.id}`, new Date());
    
    return result;
  }
  
  /**
   * Запись успешного запроса
   */
  recordSuccess(
    provider: ProviderType,
    accountId: string,
    tokens: number = 0,
    responseTime: number = 0
  ): void {
    const account = this.accounts.get(accountId);
    if (!account) return;
    
    account.totalRequests++;
    account.successfulRequests++;
    account.consecutiveErrors = 0;
    account.lastUsedAt = new Date();
    account.hourlyUsed++;
    account.dailyUsed++;
    account.status = 'active';
    
    this.accounts.set(accountId, account);
    this.registry.recordRequest(provider, accountId, tokens, true, responseTime);
  }
  
  /**
   * Запись ошибки
   */
  recordError(
    provider: ProviderType,
    accountId: string,
    error: string,
    isRateLimit: boolean = false
  ): void {
    const account = this.accounts.get(accountId);
    if (!account) return;
    
    account.totalRequests++;
    account.consecutiveErrors++;
    account.lastError = error;
    account.lastUsedAt = new Date();
    
    // Определяем статус
    if (isRateLimit) {
      account.status = 'cooldown';
      const cooldownMs = this.calculateCooldown(account);
      account.cooldownUntil = new Date(Date.now() + cooldownMs);
      
      // Ротация proxy если включена
      if (this.config.rotateProxyOnBan) {
        this.rotateProxy(account);
      }
    } else if (account.consecutiveErrors >= this.config.maxConsecutiveErrors) {
      account.status = 'exhausted';
    }
    
    this.accounts.set(accountId, account);
    this.registry.recordError(provider, accountId, error, isRateLimit);
    
    // Обновляем circuit breaker
    this.circuitBreaker.getBreaker(`${provider}:${accountId}`).execute(async () => {
      throw new Error(error);
    }).catch(() => {});
  }
  
  /**
   * Получение статистики всех аккаунтов
   */
  getAccountsStats(): Array<{
    provider: ProviderType;
    accounts: number;
    active: number;
    exhausted: number;
    totalCapacity: number;
    usedCapacity: number;
  }> {
    const stats: Array<{
      provider: ProviderType;
      accounts: number;
      active: number;
      exhausted: number;
      totalCapacity: number;
      usedCapacity: number;
    }> = [];
    
    for (const [provider, accountIds] of this.accountsByProvider) {
      const accounts = accountIds.map(id => this.accounts.get(id)!).filter(Boolean);
      const active = accounts.filter(a => a.status === 'active').length;
      const exhausted = accounts.filter(a => a.status === 'exhausted' || a.status === 'banned').length;
      
      const totalCapacity = accounts.reduce((sum, a) => sum + (a.dailyLimit || 1000), 0);
      const usedCapacity = accounts.reduce((sum, a) => sum + a.dailyUsed, 0);
      
      stats.push({
        provider,
        accounts: accounts.length,
        active,
        exhausted,
        totalCapacity,
        usedCapacity,
      });
    }
    
    return stats;
  }
  
  /**
   * Сброс дневных счетчиков
   */
  resetDailyStats(): void {
    for (const [id, account] of this.accounts) {
      account.dailyUsed = 0;
      account.hourlyUsed = 0;
      if (account.status === 'exhausted') {
        account.status = 'active';
        account.consecutiveErrors = 0;
      }
      this.accounts.set(id, account);
    }
    this.registry.resetDailyStats();
  }
  
  /**
   * Получение доступных аккаунтов для провайдера
   */
  private getAvailableAccounts(provider: ProviderType): ProviderAccount[] {
    const accountIds = this.accountsByProvider.get(provider) || [];
    const now = new Date();
    
    return accountIds
      .map(id => this.accounts.get(id)!)
      .filter(Boolean)
      .filter(account => {
        // Проверяем активность
        if (!account.isActive) return false;
        
        // Проверяем статус
        if (account.status === 'banned') return false;
        
        // Проверяем кулдаун
        if (account.cooldownUntil && account.cooldownUntil > now) return false;
        
        // Проверяем circuit breaker
        const breakerStats = this.circuitBreaker.getBreaker(`${provider}:${account.id}`).getStats();
        if (breakerStats.state === 'open') return false;
        
        // Проверяем минимальный интервал между запросами
        const lastRotation = this.lastRotationTime.get(`${provider}:${account.id}`);
        if (lastRotation && now.getTime() - lastRotation.getTime() < this.config.minAccountIntervalMs) {
          return false;
        }
        
        return true;
      });
  }
  
  /**
   * Выбор аккаунта по стратегии
   */
  private selectAccountByStrategy(
    accounts: ProviderAccount[],
    provider: ProviderType
  ): ProviderAccount {
    switch (this.config.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(accounts, provider);
      
      case 'least-used':
        return this.selectLeastUsed(accounts);
      
      case 'fastest':
        return this.selectFastest(accounts);
      
      case 'random':
        return accounts[Math.floor(Math.random() * accounts.length)];
      
      case 'smart':
      default:
        return this.selectSmart(accounts, provider);
    }
  }
  
  private selectRoundRobin(accounts: ProviderAccount[], provider: ProviderType): ProviderAccount {
    const key = `rr:${provider}`;
    const lastIndex = parseInt(localStorage?.getItem(key) || '0');
    const nextIndex = (lastIndex + 1) % accounts.length;
    localStorage?.setItem(key, nextIndex.toString());
    return accounts[nextIndex];
  }
  
  private selectLeastUsed(accounts: ProviderAccount[]): ProviderAccount {
    return accounts.sort((a, b) => {
      const aUsage = a.dailyUsed / (a.dailyLimit || 1000);
      const bUsage = b.dailyUsed / (b.dailyLimit || 1000);
      return aUsage - bUsage;
    })[0];
  }
  
  private selectFastest(accounts: ProviderAccount[]): ProviderAccount {
    const registry = this.registry;
    
    return accounts.sort((a, b) => {
      const aStats = registry.getUsageStats(a.provider, a.id);
      const bStats = registry.getUsageStats(b.provider, b.id);
      return aStats.avgResponseTime - bStats.avgResponseTime;
    })[0];
  }
  
  private selectSmart(accounts: ProviderAccount[], provider: ProviderType): ProviderAccount {
    // Комбинированная стратегия:
    // 1. Приоритет по success rate
    // 2. Наименее использованный
    // 3. С лучшим временем ответа
    
    const scored = accounts.map(account => {
      const stats = this.registry.getUsageStats(provider, account.id);
      const successRate = stats.totalRequests > 0 
        ? stats.successfulRequests / stats.totalRequests 
        : 1;
      
      const usageScore = 1 - (account.dailyUsed / (account.dailyLimit || 1000));
      const speedScore = stats.avgResponseTime > 0 
        ? Math.max(0, 1 - stats.avgResponseTime / 10000) 
        : 0.5;
      
      const priorityBonus = account.priority * 0.1;
      
      const score = (successRate * 0.4) + (usageScore * 0.3) + (speedScore * 0.2) + priorityBonus;
      
      return { account, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored[0].account;
  }
  
  /**
   * Получение fallback аккаунта
   */
  private getFallbackAccount(
    originalProvider: ProviderType,
    tokensNeeded: number
  ): RotationResult | null {
    for (const fallbackProvider of this.config.fallbackProviders) {
      if (fallbackProvider === originalProvider) continue;
      
      const accounts = this.getAvailableAccounts(fallbackProvider);
      if (accounts.length === 0) continue;
      
      const limitCheck = this.registry.canMakeRequest(
        fallbackProvider,
        undefined,
        tokensNeeded
      );
      
      if (limitCheck.allowed) {
        const selectedAccount = this.selectAccountByStrategy(accounts, fallbackProvider);
        
        return {
          account: selectedAccount,
          provider: fallbackProvider,
          bypassStrategy: 'fallback',
          estimatedWaitMs: 0,
          proxy: this.getAccountProxy(selectedAccount),
        };
      }
    }
    
    return null;
  }
  
  /**
   * Расчет кулдауна
   */
  private calculateCooldown(account: ProviderAccount): number {
    const baseCooldown = this.config.minCooldownMs;
    const backoff = Math.pow(
      this.config.errorBackoffMultiplier,
      account.consecutiveErrors - 1
    );
    return Math.min(baseCooldown * backoff, this.config.maxCooldownMs);
  }
  
  /**
   * Получение стратегии обхода
   */
  private getBypassStrategy(account: ProviderAccount): string {
    const strategies: string[] = ['primary'];
    
    if (account.proxyId) strategies.push('proxy');
    if (account.consecutiveErrors > 0) strategies.push('backoff');
    if (account.hourlyUsed > (account.hourlyLimit || 100) / 2) strategies.push('throttled');
    
    return strategies.join('+');
  }
  
  /**
   * Получение прокси аккаунта
   */
  private getAccountProxy(account: ProviderAccount): RotationResult['proxy'] {
    if (!account.proxyHost) return undefined;
    
    return {
      host: account.proxyHost,
      port: account.proxyPort!,
      username: account.proxyUsername,
      password: account.proxyPassword,
      type: account.proxyType || 'http',
    };
  }
  
  /**
   * Ротация прокси для аккаунта
   */
  private rotateProxy(account: ProviderAccount): void {
    // Интеграция с ProxyManager будет добавлена позже
    // Сейчас просто помечаем аккаунт для ротации
    account.metadata = {
      ...account.metadata,
      proxyRotationNeeded: true,
      proxyRotationAt: new Date(),
    };
    this.accounts.set(account.id, account);
  }
}

// Singleton instance
let rotationManagerInstance: ProviderRotationManager | null = null;

export function getProviderRotationManager(
  config?: Partial<RotationConfig>
): ProviderRotationManager {
  if (!rotationManagerInstance) {
    rotationManagerInstance = new ProviderRotationManager(config);
  }
  return rotationManagerInstance;
}

export default ProviderRotationManager;

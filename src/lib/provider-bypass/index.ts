/**
 * Provider Bypass System
 * 
 * Комплексная система обхода ограничений провайдеров
 * Поддержка 10+ провайдеров для 24/365 генерации контента
 */

// Core modules
export { 
  ProviderLimitRegistry,
  getProviderLimitRegistry,
  PROVIDER_LIMITS,
  type ProviderType,
  type ProviderLimit,
  type ProviderUsageStats,
  type DynamicLimit,
} from './provider-limit-registry';

export {
  ProviderRotationManager,
  getProviderRotationManager,
  type ProviderAccount,
  type RotationConfig,
  type RotationResult,
} from './provider-rotation-manager';

export {
  AdaptiveRateController,
  getAdaptiveRateController,
  type RateState,
  type AdaptiveConfig,
} from './adaptive-rate-controller';

export {
  BypassStrategyEngine,
  getBypassStrategyEngine,
  type BypassExecutionResult,
  type BypassEngineConfig,
  type BypassStrategyType,
  type ContentType,
} from './bypass-strategy-engine';

// Content Studio Integration
export {
  ContentStudioWithBypass,
  getContentStudio,
  type ContentGenerationResult,
  type GenerationConfig,
  type StudioContentType,
} from './content-studio-integration';

// Infinite Generation Manager (24/365)
export {
  InfiniteGenerationManager,
  getInfiniteGenerationManager,
  type InfiniteGenerationConfig,
  type GenerationStats,
  type GeneratorState,
  type GenerationStatus,
  type ContentType as InfiniteContentType,
} from './infinite-generation-manager';

// Auto Registration Service
export {
  AutoRegistrationService,
  getAutoRegistrationService,
  PROVIDER_REGISTRATION_CONFIGS,
  type ProviderRegistrationConfig,
  type RegistrationStatus,
  type ProviderCategory,
} from './auto-registration-service';

// Proxy Pool Manager
export {
  ProxyPoolManager,
  getProxyPoolManager,
  PROXY_PROVIDER_CONFIGS,
  type ProxyConfig,
  type ProxyType,
  type ProxyStatus,
  type ProxyProvider,
  type ProxyProviderConfig,
} from './proxy-pool-manager';

// Health Monitor Service
export {
  HealthMonitorService,
  getHealthMonitor,
  type HealthStatus,
  type ComponentType,
  type AlertSeverity,
  type HealthCheckResult,
  type SystemHealth,
  type SystemMetrics,
  type Alert,
} from './health-monitor-service';

// Auto API Key Manager
export {
  AutoApiKeyManager,
  getAutoApiKeyManager,
  FREE_PROVIDER_CONFIGS,
  type KeyStatus,
  type KeyType,
} from './auto-api-key-manager';

// Convenience function for quick access
import { getBypassStrategyEngine } from './bypass-strategy-engine';
import { getProviderLimitRegistry } from './provider-limit-registry';
import { getProviderRotationManager } from './provider-rotation-manager';
import { getAdaptiveRateController } from './adaptive-rate-controller';

/**
 * Инициализация системы обхода с предустановленными аккаунтами
 */
export async function initializeBypassSystem(options: {
  accounts?: Array<{
    id: string;
    provider: string;
    apiKey?: string;
    email?: string;
    password?: string;
    proxy?: {
      host: string;
      port: number;
      username?: string;
      password?: string;
      type?: string;
    };
    priority?: number;
    dailyLimit?: number;
  }>;
  config?: {
    maxRetries?: number;
    fallbackChain?: string[];
    dailyCostLimit?: number;
  };
} = {}): Promise<{
  engine: ReturnType<typeof getBypassStrategyEngine>;
  registry: ReturnType<typeof getProviderLimitRegistry>;
  rotationManager: ReturnType<typeof getProviderRotationManager>;
  rateController: ReturnType<typeof getAdaptiveRateController>;
}> {
  const engine = getBypassStrategyEngine(options.config || {});
  const registry = getProviderLimitRegistry();
  const rotationManager = getProviderRotationManager();
  const rateController = getAdaptiveRateController();
  
  // Регистрируем аккаунты
  if (options.accounts && options.accounts.length > 0) {
    const accounts = options.accounts.map(acc => ({
      id: acc.id,
      provider: acc.provider as any,
      apiKey: acc.apiKey,
      email: acc.email,
      password: acc.password,
      proxyHost: acc.proxy?.host,
      proxyPort: acc.proxy?.port,
      proxyUsername: acc.proxy?.username,
      proxyPassword: acc.proxy?.password,
      proxyType: acc.proxy?.type as any,
      isActive: true,
      status: 'active' as const,
      priority: acc.priority || 1,
      dailyLimit: acc.dailyLimit,
      dailyUsed: 0,
      hourlyUsed: 0,
      totalRequests: 0,
      successfulRequests: 0,
      consecutiveErrors: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    rotationManager.registerAccounts(accounts);
  }
  
  return {
    engine,
    registry,
    rotationManager,
    rateController,
  };
}

/**
 * Быстрый доступ к генерации с обходом
 */
export const bypassGenerate = {
  /**
   * Выполнить запрос с автоматическим обходом
   */
  async execute<T>(
    requestFn: (...args: unknown[]) => Promise<T>,
    options?: {
      provider?: string;
      contentType?: 'text' | 'image' | 'video' | 'audio';
      priority?: 'high' | 'normal' | 'low';
    }
  ): Promise<T> {
    const engine = getBypassStrategyEngine();
    
    const result = await engine.executeWithBypass(
      async (provider, account, proxy) => {
        return requestFn(provider, account, proxy);
      },
      options as any
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Request failed after all bypass attempts');
    }
    
    return result.result as T;
  },
  
  /**
   * Массовое выполнение
   */
  async executeBatch<T>(
    requests: Array<{
      requestFn: (...args: unknown[]) => Promise<T>;
      options?: {
        provider?: string;
        contentType?: 'text' | 'image' | 'video' | 'audio';
        priority?: 'high' | 'normal' | 'low';
      };
    }>,
    batchOptions?: {
      maxConcurrent?: number;
      stopOnError?: boolean;
      progressCallback?: (completed: number, total: number) => void;
    }
  ): Promise<Array<{ success: boolean; result?: T; error?: string }>> {
    const engine = getBypassStrategyEngine();
    
    const results = await engine.executeBatch(
      requests.map(r => ({
        requestFn: r.requestFn as any,
        options: r.options as any,
      })),
      batchOptions
    );
    
    return results.map(r => ({
      success: r.success,
      result: r.result,
      error: r.error,
    }));
  },
  
  /**
   * Получить статистику
   */
  getStats() {
    return getBypassStrategyEngine().getStats();
  },
};

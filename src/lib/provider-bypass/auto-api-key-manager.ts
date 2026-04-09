/**
 * Auto API Key Manager
 * 
 * Автоматическое управление API ключами провайдеров
 * - Автоматическая регистрация ключей для бесплатных провайдеров
 * - Валидация ключей
 * - Ротация при лимитах
 * - Интеграция с Content Studio
 */

import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { PROVIDER_LIMITS, ProviderType } from './provider-limit-registry';

// Типы
export type KeyStatus = 'active' | 'exhausted' | 'expired' | 'invalid' | 'banned' | 'cooldown';
export type KeyType = 'official' | 'free_tier' | 'trial' | 'custom';

// Конфигурация провайдеров для автоматической регистрации
export interface ProviderRegistrationConfig {
  provider: ProviderType;
  registrationUrl: string;
  requiresEmail: boolean;
  requiresPhone: boolean;
  requiresCard: boolean;
  isFree: boolean;
  quotaDaily: number;
  quotaMonthly?: number;
  apiDocUrl?: string;
}

// Конфигурации бесплатных провайдеров
export const FREE_PROVIDER_CONFIGS: Record<string, ProviderRegistrationConfig> = {
  cerebras: {
    provider: 'cerebras',
    registrationUrl: 'https://cloud.cerebras.ai/',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    isFree: true,
    quotaDaily: 14400,
    apiDocUrl: 'https://inference-docs.cerebras.ai/',
  },
  groq: {
    provider: 'groq',
    registrationUrl: 'https://console.groq.com/',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    isFree: true,
    quotaDaily: 1000,
    quotaMonthly: 30000,
    apiDocUrl: 'https://console.groq.com/docs/quickstart',
  },
  gemini: {
    provider: 'gemini',
    registrationUrl: 'https://aistudio.google.com/app/apikey',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    isFree: true,
    quotaDaily: 500,
    quotaMonthly: 15000,
    apiDocUrl: 'https://ai.google.dev/docs',
  },
  openrouter: {
    provider: 'openrouter',
    registrationUrl: 'https://openrouter.ai/keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    isFree: true,
    quotaDaily: 50,
    apiDocUrl: 'https://openrouter.ai/docs',
  },
  stability: {
    provider: 'stability',
    registrationUrl: 'https://platform.stability.ai/account/keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    isFree: true,
    quotaDaily: 500,
    apiDocUrl: 'https://platform.stability.ai/docs',
  },
  elevenlabs: {
    provider: 'elevenlabs',
    registrationUrl: 'https://elevenlabs.io/app/settings/api-keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    isFree: true,
    quotaDaily: 100,
    quotaMonthly: 5000,
    apiDocUrl: 'https://elevenlabs.io/docs',
  },
};

/**
 * Auto API Key Manager Class
 */
export class AutoApiKeyManager {
  private settings: {
    autoRegisterEnabled: boolean;
    autoValidateEnabled: boolean;
    autoRotateEnabled: boolean;
    autoRemoveInvalid: boolean;
    autoRegisterProviders: string[];
    minKeysPerProvider: number;
    maxKeysPerProvider: number;
    validateIntervalHours: number;
    errorThreshold: number;
  };

  constructor() {
    this.settings = {
      autoRegisterEnabled: true,
      autoValidateEnabled: true,
      autoRotateEnabled: true,
      autoRemoveInvalid: true,
      autoRegisterProviders: ['cerebras', 'groq', 'gemini', 'openrouter'],
      minKeysPerProvider: 1,
      maxKeysPerProvider: 10,
      validateIntervalHours: 24,
      errorThreshold: 3,
    };
  }

  /**
   * Инициализация менеджера
   */
  async initialize(userId: string): Promise<void> {
    // Загружаем настройки пользователя
    const settings = await db.autoApiKeySettings.findUnique({
      where: { userId },
    });

    if (settings) {
      this.settings = {
        autoRegisterEnabled: settings.autoRegisterEnabled,
        autoValidateEnabled: settings.autoValidateEnabled,
        autoRotateEnabled: settings.autoRotateEnabled,
        autoRemoveInvalid: settings.autoRemoveInvalid,
        autoRegisterProviders: settings.autoRegisterProviders 
          ? JSON.parse(settings.autoRegisterProviders) 
          : ['cerebras', 'groq', 'gemini'],
        minKeysPerProvider: settings.minKeysPerProvider,
        maxKeysPerProvider: settings.maxKeysPerProvider,
        validateIntervalHours: settings.validateIntervalHours,
        errorThreshold: settings.errorThreshold,
      };
    }

    // Автоматически обеспечиваем минимальное количество ключей
    if (this.settings.autoRegisterEnabled) {
      await this.ensureMinimumKeys(userId);
    }

    // Валидируем ключи при старте
    if (this.settings.autoValidateEnabled) {
      await this.validateAllKeys(userId);
    }
  }

  /**
   * Добавить API ключ вручную
   */
  async addApiKey(params: {
    provider: string;
    apiKey: string;
    apiSecret?: string;
    keyName?: string;
    keyType?: KeyType;
    accountEmail?: string;
    userId?: string;
  }): Promise<{ success: boolean; keyId?: string; error?: string }> {
    try {
      // Проверяем, не существует ли уже такой ключ
      const existing = await db.providerApiKey.findUnique({
        where: {
          provider_apiKey: {
            provider: params.provider,
            apiKey: params.apiKey,
          },
        },
      });

      if (existing) {
        return { success: false, error: 'API key already exists' };
      }

      // Получаем лимиты провайдера
      const providerLimits = PROVIDER_LIMITS[params.provider as ProviderType];
      const freeConfig = FREE_PROVIDER_CONFIGS[params.provider];

      // Создаем ключ
      const key = await db.providerApiKey.create({
        data: {
          id: nanoid(),
          provider: params.provider,
          apiKey: params.apiKey,
          apiSecret: params.apiSecret,
          keyName: params.keyName || `${params.provider} key`,
          keyType: params.keyType || 'official',
          accountEmail: params.accountEmail,
          dailyLimit: providerLimits?.dailyQuota || freeConfig?.quotaDaily,
          freeQuotaDaily: freeConfig?.quotaDaily,
          freeQuotaMonthly: freeConfig?.quotaMonthly,
          isValidated: false,
          userId: params.userId,
        },
      });

      // Валидируем ключ
      const validation = await this.validateKey(key.id);

      return { 
        success: validation.isValid, 
        keyId: key.id,
        error: validation.error,
      };
    } catch (error) {
      console.error('[AutoApiKeyManager] Failed to add API key:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Получить все активные ключи для провайдера
   */
  async getActiveKeys(provider: string, userId?: string): Promise<{
    id: string;
    apiKey: string;
    status: string;
    dailyUsed: number;
    dailyLimit: number | null;
    priority: number;
  }[]> {
    const keys = await db.providerApiKey.findMany({
      where: {
        provider,
        isActive: true,
        status: 'active',
        userId: userId || null,
        OR: [
          { cooldownUntil: null },
          { cooldownUntil: { lt: new Date() } },
        ],
      },
      orderBy: [
        { priority: 'asc' },
        { dailyUsed: 'asc' },
      ],
    });

    return keys.map(k => ({
      id: k.id,
      apiKey: k.apiKey,
      status: k.status,
      dailyUsed: k.dailyUsed,
      dailyLimit: k.dailyLimit,
      priority: k.priority,
    }));
  }

  /**
   * Получить лучший доступный ключ для провайдера
   */
  async getBestKey(provider: string, userId?: string): Promise<{
    id: string;
    apiKey: string;
  } | null> {
    const keys = await this.getActiveKeys(provider, userId);
    
    // Фильтруем ключи, у которых еще есть квота
    const availableKeys = keys.filter(k => 
      !k.dailyLimit || k.dailyUsed < k.dailyLimit
    );

    if (availableKeys.length === 0) {
      return null;
    }

    return {
      id: availableKeys[0].id,
      apiKey: availableKeys[0].apiKey,
    };
  }

  /**
   * Записать использование ключа
   */
  async recordUsage(keyId: string, params: {
    tokensIn?: number;
    tokensOut?: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    const key = await db.providerApiKey.findUnique({
      where: { id: keyId },
    });

    if (!key) return;

    const updateData: Record<string, unknown> = {
      lastUsedAt: new Date(),
      totalRequests: { increment: 1 },
    };

    if (params.success) {
      updateData.successfulRequests = { increment: 1 };
      updateData.consecutiveErrors = 0;
      
      if (params.tokensIn) {
        updateData.totalTokensIn = { increment: params.tokensIn };
      }
      if (params.tokensOut) {
        updateData.totalTokensOut = { increment: params.tokensOut };
      }
    } else {
      updateData.failedRequests = { increment: 1 };
      updateData.consecutiveErrors = { increment: 1 };
      updateData.lastError = params.error;
      updateData.lastErrorAt = new Date();

      // Если слишком много ошибок, ставим на кулдаун
      if (key.consecutiveErrors + 1 >= this.settings.errorThreshold) {
        const cooldownMinutes = 30;
        updateData.cooldownUntil = new Date(Date.now() + cooldownMinutes * 60000);
        updateData.status = 'cooldown';
      }
    }

    await db.providerApiKey.update({
      where: { id: keyId },
      data: updateData,
    });
  }

  /**
   * Валидировать API ключ
   */
  async validateKey(keyId: string): Promise<{
    isValid: boolean;
    balance?: number;
    remainingQuota?: number;
    error?: string;
  }> {
    const key = await db.providerApiKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      return { isValid: false, error: 'Key not found' };
    }

    const startTime = Date.now();
    let isValid = false;
    let balance: number | undefined;
    let remainingQuota: number | undefined;
    let errorMessage: string | undefined;

    try {
      switch (key.provider) {
        case 'cerebras':
          const cerebrasResult = await this.validateCerebrasKey(key.apiKey);
          isValid = cerebrasResult.isValid;
          errorMessage = cerebrasResult.error;
          break;

        case 'groq':
          const groqResult = await this.validateGroqKey(key.apiKey);
          isValid = groqResult.isValid;
          errorMessage = groqResult.error;
          break;

        case 'gemini':
          const geminiResult = await this.validateGeminiKey(key.apiKey);
          isValid = geminiResult.isValid;
          errorMessage = geminiResult.error;
          break;

        case 'openrouter':
          const openrouterResult = await this.validateOpenRouterKey(key.apiKey);
          isValid = openrouterResult.isValid;
          balance = openrouterResult.balance;
          remainingQuota = openrouterResult.remainingQuota;
          errorMessage = openrouterResult.error;
          break;

        case 'deepseek':
          const deepseekResult = await this.validateDeepSeekKey(key.apiKey);
          isValid = deepseekResult.isValid;
          balance = deepseekResult.balance;
          errorMessage = deepseekResult.error;
          break;

        default:
          // Для неизвестных провайдеров просто проверяем, что ключ не пустой
          isValid = !!key.apiKey && key.apiKey.length > 10;
      }
    } catch (error) {
      isValid = false;
      errorMessage = error instanceof Error ? error.message : 'Validation failed';
    }

    const responseTime = Date.now() - startTime;

    // Обновляем статус ключа
    await db.providerApiKey.update({
      where: { id: keyId },
      data: {
        isValidated: true,
        lastValidatedAt: new Date(),
        validationError: errorMessage,
        status: isValid ? 'active' : 'invalid',
        balance,
        balanceUpdatedAt: balance ? new Date() : undefined,
      },
    });

    // Логируем валидацию
    await db.apiKeyValidationLog.create({
      data: {
        id: nanoid(),
        keyId,
        provider: key.provider,
        isValid,
        validationType: 'scheduled',
        responseTime,
        balance,
        remainingQuota,
        errorMessage,
      },
    });

    return { isValid, balance, remainingQuota, error: errorMessage };
  }

  /**
   * Валидировать все ключи пользователя
   */
  async validateAllKeys(userId?: string): Promise<void> {
    const keys = await db.providerApiKey.findMany({
      where: {
        userId: userId || null,
        isActive: true,
        OR: [
          { lastValidatedAt: null },
          { 
            lastValidatedAt: { 
              lt: new Date(Date.now() - this.settings.validateIntervalHours * 3600000) 
            } 
          },
        ],
      },
    });

    for (const key of keys) {
      try {
        await this.validateKey(key.id);
      } catch (error) {
        console.error(`[AutoApiKeyManager] Failed to validate key ${key.id}:`, error);
      }
    }
  }

  /**
   * Обеспечить минимальное количество ключей для каждого провайдера
   */
  async ensureMinimumKeys(userId?: string): Promise<void> {
    for (const provider of this.settings.autoRegisterProviders) {
      const keys = await this.getActiveKeys(provider, userId);
      
      if (keys.length < this.settings.minKeysPerProvider) {
        console.log(`[AutoApiKeyManager] Need more keys for ${provider}. Current: ${keys.length}, Min: ${this.settings.minKeysPerProvider}`);
        
        // Добавляем в очередь регистрации
        await this.queueKeyRegistration(provider, userId);
      }
    }
  }

  /**
   * Добавить задачу на регистрацию ключа в очередь
   */
  async queueKeyRegistration(provider: string, userId?: string): Promise<void> {
    const config = FREE_PROVIDER_CONFIGS[provider];
    
    if (!config || !config.isFree) {
      console.log(`[AutoApiKeyManager] Cannot auto-register for ${provider}`);
      return;
    }

    // Проверяем, нет ли уже задачи в очереди
    const existing = await db.apiKeyRegistrationQueue.findFirst({
      where: {
        provider,
        status: { in: ['pending', 'processing'] },
      },
    });

    if (existing) {
      return;
    }

    await db.apiKeyRegistrationQueue.create({
      data: {
        id: nanoid(),
        provider,
        status: 'pending',
        registrationData: JSON.stringify({
          userId,
          config,
        }),
        priority: 5,
      },
    });
  }

  /**
   * Обработать очередь регистрации ключей
   */
  async processRegistrationQueue(): Promise<void> {
    const tasks = await db.apiKeyRegistrationQueue.findMany({
      where: {
        status: 'pending',
        scheduledAt: { lte: new Date() },
      },
      orderBy: { priority: 'asc' },
      take: 5,
    });

    for (const task of tasks) {
      try {
        await db.apiKeyRegistrationQueue.update({
          where: { id: task.id },
          data: { status: 'processing', startedAt: new Date() },
        });

        const result = await this.registerProviderKey(task.provider, task.registrationData);

        if (result.success) {
          await db.apiKeyRegistrationQueue.update({
            where: { id: task.id },
            data: {
              status: 'completed',
              resultKeyId: result.keyId,
              resultApiKey: result.apiKey,
              completedAt: new Date(),
            },
          });
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await db.apiKeyRegistrationQueue.update({
          where: { id: task.id },
          data: {
            status: task.retryCount >= task.maxRetries - 1 ? 'failed' : 'pending',
            error: errorMessage,
            retryCount: { increment: 1 },
          },
        });
      }
    }
  }

  /**
   * Зарегистрировать ключ провайдера (для бесплатных провайдеров)
   */
  async registerProviderKey(provider: string, registrationData?: string | null): Promise<{
    success: boolean;
    keyId?: string;
    apiKey?: string;
    error?: string;
  }> {
    const config = FREE_PROVIDER_CONFIGS[provider];
    
    if (!config) {
      return { success: false, error: 'Unknown provider' };
    }

    // Для большинства бесплатных провайдеров ключи нужно получать вручную через веб-интерфейс
    // Здесь мы создаем заготовку и инструкцию
    
    console.log(`[AutoApiKeyManager] To get API key for ${provider}:`);
    console.log(`  1. Visit: ${config.registrationUrl}`);
    console.log(`  2. Sign up/Login`);
    console.log(`  3. Generate API key`);
    console.log(`  4. Add key via API: POST /api/provider-keys`);

    // Возвращаем инструкции, но не сам ключ
    return { 
      success: false, 
      error: `Please get API key manually from ${config.registrationUrl}`,
    };
  }

  /**
   * Сбросить дневные квоты
   */
  async resetDailyQuotas(): Promise<void> {
    await db.providerApiKey.updateMany({
      data: {
        dailyUsed: 0,
        status: 'active',
        cooldownUntil: null,
      },
    });
  }

  /**
   * Получить статистику ключей
   */
  async getStats(userId?: string): Promise<{
    totalKeys: number;
    activeKeys: number;
    exhaustedKeys: number;
    invalidKeys: number;
    byProvider: Record<string, { total: number; active: number }>;
  }> {
    const keys = await db.providerApiKey.findMany({
      where: { userId: userId || null },
    });

    const stats = {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.status === 'active').length,
      exhaustedKeys: keys.filter(k => k.status === 'exhausted').length,
      invalidKeys: keys.filter(k => k.status === 'invalid').length,
      byProvider: {} as Record<string, { total: number; active: number }>,
    };

    for (const key of keys) {
      if (!stats.byProvider[key.provider]) {
        stats.byProvider[key.provider] = { total: 0, active: 0 };
      }
      stats.byProvider[key.provider].total++;
      if (key.status === 'active') {
        stats.byProvider[key.provider].active++;
      }
    }

    return stats;
  }

  // === Методы валидации для конкретных провайдеров ===

  private async validateCerebrasKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.cerebras.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      
      if (response.ok) {
        return { isValid: true };
      }
      
      const error = await response.json().catch(() => ({}));
      return { isValid: false, error: JSON.stringify(error) };
    } catch (error) {
      return { isValid: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  private async validateGroqKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      
      if (response.ok) {
        return { isValid: true };
      }
      
      const error = await response.json().catch(() => ({}));
      return { isValid: false, error: JSON.stringify(error) };
    } catch (error) {
      return { isValid: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  private async validateGeminiKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      
      if (response.ok) {
        return { isValid: true };
      }
      
      const error = await response.json().catch(() => ({}));
      return { isValid: false, error: JSON.stringify(error) };
    } catch (error) {
      return { isValid: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  private async validateOpenRouterKey(apiKey: string): Promise<{ 
    isValid: boolean; 
    balance?: number;
    remainingQuota?: number;
    error?: string;
  }> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        return { 
          isValid: true, 
          balance: data.data?.limit_remaining || data.data?.usage,
          remainingQuota: data.data?.limit_remaining,
        };
      }
      
      const error = await response.json().catch(() => ({}));
      return { isValid: false, error: JSON.stringify(error) };
    } catch (error) {
      return { isValid: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  private async validateDeepSeekKey(apiKey: string): Promise<{ 
    isValid: boolean; 
    balance?: number;
    error?: string;
  }> {
    try {
      const response = await fetch('https://api.deepseek.com/user/balance', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        return { 
          isValid: true, 
          balance: data.is_available ? data.balance_infos?.[0]?.total_balance : 0,
        };
      }
      
      const error = await response.json().catch(() => ({}));
      return { isValid: false, error: JSON.stringify(error) };
    } catch (error) {
      return { isValid: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }
}

// Singleton instance
let managerInstance: AutoApiKeyManager | null = null;

export function getAutoApiKeyManager(): AutoApiKeyManager {
  if (!managerInstance) {
    managerInstance = new AutoApiKeyManager();
  }
  return managerInstance;
}

export default AutoApiKeyManager;

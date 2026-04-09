/**
 * Infinite Generation Manager
 * 
 * Менеджер непрерывной генерации контента 24/365
 * - Автоматическое переключение провайдеров при лимитах
 * - Интеллектуальная ротация аккаунтов
 * - Автовосстановление при ошибках
 * - Мониторинг и оповещения
 */

import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { getProviderLimitRegistry, ProviderType, PROVIDER_LIMITS } from './provider-limit-registry';
import { getAutoApiKeyManager } from './auto-api-key-manager';
import { getBypassStrategyEngine } from './bypass-strategy-engine';

// Типы
export type GenerationStatus = 'running' | 'paused' | 'stopped' | 'error';
export type ContentType = 'video' | 'image' | 'text' | 'audio';

// Конфигурация непрерывной генерации
export interface InfiniteGenerationConfig {
  id: string;
  name: string;
  contentType: ContentType;
  prompts: string[];
  promptsFile?: string;
  
  // Расписание
  intervalSeconds: number;
  randomizeInterval: boolean;
  intervalMinSeconds?: number;
  intervalMaxSeconds?: number;
  
  // Провайдеры
  preferredProviders: ProviderType[];
  fallbackProviders: ProviderType[];
  autoSwitchOnLimit: boolean;
  
  // Лимиты
  maxGenerations?: number;
  maxGenerationsPerDay?: number;
  maxGenerationsPerHour?: number;
  maxCostPerDay?: number;
  
  // Параметры генерации
  style?: string;
  negativePrompt?: string;
  temperature?: number;
  maxTokens?: number;
  
  // Поведение при ошибках
  maxRetries: number;
  retryDelayMs: number;
  pauseOnErrorCount: number;
  autoResumeMinutes: number;
  
  // Уведомления
  notifyOnSuccess: boolean;
  notifyOnError: boolean;
  notifyOnLimit: boolean;
  notifyOnSwitch: boolean;
  telegramChatId?: string;
  
  // Webhook
  webhookUrl?: string;
  webhookOnSuccess?: boolean;
  webhookOnError?: boolean;
  
  // Метаданные
  metadata?: Record<string, unknown>;
  userId?: string;
  campaignId?: string;
  influencerId?: string;
}

// Статистика генерации
export interface GenerationStats {
  totalGenerated: number;
  successfulGenerated: number;
  failedGenerated: number;
  totalCost: number;
  totalTokens: number;
  avgGenerationTime: number;
  successRate: number;
  
  todayGenerated: number;
  todaySuccessful: number;
  todayCost: number;
  
  hourGenerated: number;
  hourSuccessful: number;
  
  byProvider: Record<string, { count: number; success: number; cost: number }>;
  byHour: Record<number, number>;
  
  errors: Array<{ time: Date; error: string; provider: string }>;
  lastGenerationAt?: Date;
  nextGenerationAt?: Date;
}

// Состояние генератора
export interface GeneratorState {
  id: string;
  configId: string;
  status: GenerationStatus;
  
  currentProvider: ProviderType;
  currentAccountIndex: number;
  
  generated: number;
  errors: number;
  consecutiveErrors: number;
  
  lastError?: string;
  lastErrorAt?: Date;
  lastSuccessAt?: Date;
  
  startedAt: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  
  nextGenerationAt: Date;
  
  dailyGenerated: number;
  dailyResetAt: Date;
  hourlyGenerated: number;
  hourlyResetAt: Date;
  dailyCost: number;
  
  activePrompts: string[];
  currentPromptIndex: number;
}

/**
 * Infinite Generation Manager Class
 */
export class InfiniteGenerationManager {
  private registry = getProviderLimitRegistry();
  private keyManager = getAutoApiKeyManager();
  private engine = getBypassStrategyEngine();
  
  private generators: Map<string, GeneratorState> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private stats: Map<string, GenerationStats> = new Map();
  
  constructor() {
    // Восстанавливаем состояние при старте
    this.restoreGenerators();
    
    // Запускаем периодические задачи
    this.startMaintenanceTasks();
  }

  /**
   * Запустить непрерывную генерацию
   */
  async startGeneration(config: InfiniteGenerationConfig): Promise<{
    success: boolean;
    generatorId?: string;
    error?: string;
  }> {
    try {
      const generatorId = config.id || nanoid();
      
      // Проверяем, не запущен ли уже генератор с таким ID
      if (this.generators.has(generatorId)) {
        const existing = this.generators.get(generatorId)!;
        if (existing.status === 'running') {
          return { success: false, error: 'Generator already running' };
        }
      }

      // Создаем состояние генератора
      const state: GeneratorState = {
        id: generatorId,
        configId: config.id || generatorId,
        status: 'running',
        currentProvider: config.preferredProviders[0] || 'cerebras',
        currentAccountIndex: 0,
        generated: 0,
        errors: 0,
        consecutiveErrors: 0,
        startedAt: new Date(),
        nextGenerationAt: new Date(),
        dailyGenerated: 0,
        dailyResetAt: new Date(new Date().setHours(24, 0, 0, 0)),
        hourlyGenerated: 0,
        hourlyResetAt: new Date(Date.now() + 3600000),
        dailyCost: 0,
        activePrompts: config.prompts,
        currentPromptIndex: 0,
      };

      // Сохраняем в БД
      await db.infiniteGenerationJob.create({
        data: {
          id: generatorId,
          status: 'running',
          totalGenerated: 0,
          config: JSON.stringify(config),
          startedAt: new Date(),
        },
      }).catch(() => {
        // Если запись существует, обновляем
        return db.infiniteGenerationJob.update({
          where: { id: generatorId },
          data: {
            status: 'running',
            startedAt: new Date(),
          },
        });
      });

      // Инициализируем статистику
      this.stats.set(generatorId, this.createEmptyStats());

      // Запускаем генерацию
      this.generators.set(generatorId, state);
      this.scheduleNextGeneration(generatorId, config);

      console.log(`[InfiniteGeneration] Started generator ${generatorId}`);
      
      return { success: true, generatorId };
      
    } catch (error) {
      console.error('[InfiniteGeneration] Failed to start:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Остановить генерацию
   */
  async stopGeneration(generatorId: string): Promise<{ success: boolean }> {
    const state = this.generators.get(generatorId);
    if (!state) {
      return { success: false };
    }

    // Останавливаем интервал
    const interval = this.intervals.get(generatorId);
    if (interval) {
      clearTimeout(interval);
      this.intervals.delete(generatorId);
    }

    // Обновляем состояние
    state.status = 'stopped';
    this.generators.set(generatorId, state);

    // Обновляем БД
    await db.infiniteGenerationJob.update({
      where: { id: generatorId },
      data: {
        status: 'stopped',
        completedAt: new Date(),
      },
    }).catch(console.error);

    console.log(`[InfiniteGeneration] Stopped generator ${generatorId}`);
    
    return { success: true };
  }

  /**
   * Поставить генерацию на паузу
   */
  async pauseGeneration(generatorId: string): Promise<{ success: boolean }> {
    const state = this.generators.get(generatorId);
    if (!state || state.status !== 'running') {
      return { success: false };
    }

    const interval = this.intervals.get(generatorId);
    if (interval) {
      clearTimeout(interval);
      this.intervals.delete(generatorId);
    }

    state.status = 'paused';
    state.pausedAt = new Date();
    this.generators.set(generatorId, state);

    await db.infiniteGenerationJob.update({
      where: { id: generatorId },
      data: { status: 'paused' },
    }).catch(console.error);

    return { success: true };
  }

  /**
   * Возобновить генерацию
   */
  async resumeGeneration(generatorId: string): Promise<{ success: boolean }> {
    const state = this.generators.get(generatorId);
    if (!state || state.status !== 'paused') {
      return { success: false };
    }

    state.status = 'running';
    state.resumedAt = new Date();
    this.generators.set(generatorId, state);

    // Получаем конфигурацию
    const job = await db.infiniteGenerationJob.findUnique({
      where: { id: generatorId },
    });
    
    if (job) {
      const config = JSON.parse(job.config || '{}') as InfiniteGenerationConfig;
      this.scheduleNextGeneration(generatorId, config);
    }

    await db.infiniteGenerationJob.update({
      where: { id: generatorId },
      data: { status: 'running' },
    }).catch(console.error);

    return { success: true };
  }

  /**
   * Получить состояние генератора
   */
  getState(generatorId: string): GeneratorState | null {
    return this.generators.get(generatorId) || null;
  }

  /**
   * Получить статистику
   */
  getStats(generatorId: string): GenerationStats | null {
    return this.stats.get(generatorId) || null;
  }

  /**
   * Получить все активные генераторы
   */
  getActiveGenerators(): Array<{ id: string; state: GeneratorState; stats: GenerationStats }> {
    const result: Array<{ id: string; state: GeneratorState; stats: GenerationStats }> = [];
    
    for (const [id, state] of this.generators) {
      result.push({
        id,
        state,
        stats: this.stats.get(id) || this.createEmptyStats(),
      });
    }
    
    return result;
  }

  // === Private Methods ===

  /**
   * Запланировать следующую генерацию
   */
  private scheduleNextGeneration(generatorId: string, config: InfiniteGenerationConfig): void {
    const state = this.generators.get(generatorId);
    if (!state || state.status !== 'running') {
      return;
    }

    // Вычисляем интервал
    let intervalMs = config.intervalSeconds * 1000;
    
    if (config.randomizeInterval && config.intervalMinSeconds && config.intervalMaxSeconds) {
      intervalMs = (config.intervalMinSeconds + Math.random() * (config.intervalMaxSeconds - config.intervalMinSeconds)) * 1000;
    }

    // Проверяем ограничения
    if (config.maxGenerations && state.generated >= config.maxGenerations) {
      console.log(`[InfiniteGeneration] Generator ${generatorId} reached max generations`);
      this.stopGeneration(generatorId);
      return;
    }

    if (config.maxGenerationsPerDay && state.dailyGenerated >= config.maxGenerationsPerDay) {
      // Ждем до следующего дня
      const msUntilMidnight = this.getMsUntilMidnight();
      intervalMs = Math.max(intervalMs, msUntilMidnight);
    }

    if (config.maxGenerationsPerHour && state.hourlyGenerated >= config.maxGenerationsPerHour) {
      // Ждем до конца часа
      const msUntilHourEnd = this.getMsUntilHourEnd();
      intervalMs = Math.max(intervalMs, msUntilHourEnd);
    }

    state.nextGenerationAt = new Date(Date.now() + intervalMs);
    this.generators.set(generatorId, state);

    // Планируем генерацию
    const timeout = setTimeout(() => {
      this.executeGeneration(generatorId, config);
    }, intervalMs);

    this.intervals.set(generatorId, timeout);
  }

  /**
   * Выполнить генерацию
   */
  private async executeGeneration(generatorId: string, config: InfiniteGenerationConfig): Promise<void> {
    const state = this.generators.get(generatorId);
    if (!state || state.status !== 'running') {
      return;
    }

    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    let content: string | undefined;
    let tokensUsed = 0;
    let cost = 0;
    let provider = state.currentProvider;

    try {
      // Получаем следующий промпт
      const prompt = this.getNextPrompt(state, config);
      
      // Проверяем доступность провайдера
      const canUse = this.registry.canMakeRequest(state.currentProvider);
      
      if (!canUse.allowed && config.autoSwitchOnLimit) {
        provider = await this.switchProvider(state, config, canUse.reason);
      }

      // Выполняем генерацию с обходом ограничений
      const result = await this.engine.executeWithBypass(
        async (prov, account, proxy) => {
          return this.callProviderAPI(prov, account, proxy, prompt, config);
        },
        {
          provider,
          contentType: config.contentType as 'text' | 'image' | 'video' | 'audio',
          maxCost: config.maxCostPerDay ? config.maxCostPerDay - state.dailyCost : undefined,
        }
      );

      success = result.success;
      content = result.content;
      error = result.error;
      tokensUsed = result.tokensUsed;
      cost = result.cost;
      provider = result.provider;
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[InfiniteGeneration] Error in ${generatorId}:`, error);
    }

    const generationTime = Date.now() - startTime;

    // Обновляем состояние
    state.generated++;
    state.currentProvider = provider;
    
    if (success) {
      state.consecutiveErrors = 0;
      state.lastSuccessAt = new Date();
    } else {
      state.errors++;
      state.consecutiveErrors++;
      state.lastError = error;
      state.lastErrorAt = new Date();
    }

    state.dailyGenerated++;
    state.hourlyGenerated++;
    state.dailyCost += cost;

    this.generators.set(generatorId, state);

    // Обновляем статистику
    this.updateStats(generatorId, {
      success,
      provider,
      tokensUsed,
      cost,
      generationTime,
      error,
    });

    // Логируем
    await this.logGeneration(generatorId, {
      success,
      provider,
      prompt: this.getNextPrompt(state, config),
      content: content?.substring(0, 500),
      error,
      generationTime,
      tokensUsed,
      cost,
    });

    // Сохраняем результат
    if (success && content) {
      await this.saveContent(generatorId, config, {
        content,
        provider,
        tokensUsed,
        cost,
        generationTime,
      });
    }

    // Обновляем БД
    await db.infiniteGenerationJob.update({
      where: { id: generatorId },
      data: {
        totalGenerated: { increment: 1 },
        lastGeneratedAt: new Date(),
      },
    }).catch(console.error);

    // Проверяем критические ошибки
    if (state.consecutiveErrors >= config.pauseOnErrorCount) {
      console.log(`[InfiniteGeneration] Pausing ${generatorId} due to consecutive errors`);
      await this.pauseGeneration(generatorId);
      
      // Автовосстановление
      if (config.autoResumeMinutes > 0) {
        setTimeout(() => {
          this.resumeGeneration(generatorId);
        }, config.autoResumeMinutes * 60000);
      }
      
      return;
    }

    // Уведомления
    await this.sendNotifications(generatorId, config, {
      success,
      provider,
      error,
    });

    // Webhook
    await this.sendWebhook(generatorId, config, {
      success,
      content,
      provider,
      error,
    });

    // Планируем следующую генерацию
    this.scheduleNextGeneration(generatorId, config);
  }

  /**
   * Переключить провайдера
   */
  private async switchProvider(
    state: GeneratorState,
    config: InfiniteGenerationConfig,
    reason?: string
  ): Promise<ProviderType> {
    console.log(`[InfiniteGeneration] Switching provider due to: ${reason}`);
    
    // Пробуем fallback провайдеры
    for (const provider of config.fallbackProviders) {
      const canUse = this.registry.canMakeRequest(provider);
      if (canUse.allowed) {
        state.currentProvider = provider;
        state.currentAccountIndex = 0;
        this.generators.set(state.id, state);
        return provider;
      }
    }

    // Если все fallback недоступны, ищем любого доступного
    const available = this.registry.getAvailableProviders(config.contentType as 'text' | 'image' | 'video' | 'audio');
    if (available.length > 0) {
      state.currentProvider = available[0].provider;
      state.currentAccountIndex = 0;
      this.generators.set(state.id, state);
      return available[0].provider;
    }

    // Если никто недоступен, остаёмся на текущем и ждём
    return state.currentProvider;
  }

  /**
   * Вызвать API провайдера
   */
  private async callProviderAPI(
    provider: ProviderType,
    account: { apiKey?: string; email?: string; password?: string; id: string },
    proxy: { host: string; port: number; username?: string; password?: string; type: string } | undefined,
    prompt: string,
    config: InfiniteGenerationConfig
  ): Promise<{ content: string; tokensUsed: number; cost: number }> {
    // Получаем API ключ
    let apiKey = account.apiKey;
    
    if (!apiKey) {
      const bestKey = await this.keyManager.getBestKey(provider, config.userId);
      if (bestKey) {
        apiKey = bestKey.apiKey;
      }
    }

    // Определяем endpoint и параметры в зависимости от провайдера
    switch (provider) {
      case 'cerebras':
        return this.callCerebras(apiKey, prompt, config);
      case 'groq':
        return this.callGroq(apiKey, prompt, config);
      case 'gemini':
        return this.callGemini(apiKey, prompt, config);
      case 'deepseek':
        return this.callDeepSeek(apiKey, prompt, config);
      case 'openrouter':
        return this.callOpenRouter(apiKey, prompt, config);
      default:
        // Используем SDK для остальных
        return this.callViaSDK(prompt, config);
    }
  }

  /**
   * Вызвать Cerebras API
   */
  private async callCerebras(
    apiKey: string | undefined,
    prompt: string,
    config: InfiniteGenerationConfig
  ): Promise<{ content: string; tokensUsed: number; cost: number }> {
    if (!apiKey) {
      throw new Error('Cerebras API key required');
    }

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages: [
          ...(config.style ? [{ role: 'system', content: config.style }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Cerebras error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
    
    return {
      content: data.choices[0]?.message?.content || '',
      tokensUsed,
      cost: 0, // Cerebras бесплатный
    };
  }

  /**
   * Вызвать Groq API
   */
  private async callGroq(
    apiKey: string | undefined,
    prompt: string,
    config: InfiniteGenerationConfig
  ): Promise<{ content: string; tokensUsed: number; cost: number }> {
    if (!apiKey) {
      throw new Error('Groq API key required');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          ...(config.style ? [{ role: 'system', content: config.style }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Groq error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
    
    return {
      content: data.choices[0]?.message?.content || '',
      tokensUsed,
      cost: 0, // Groq бесплатный
    };
  }

  /**
   * Вызвать Gemini API
   */
  private async callGemini(
    apiKey: string | undefined,
    prompt: string,
    config: InfiniteGenerationConfig
  ): Promise<{ content: string; tokensUsed: number; cost: number }> {
    if (!apiKey) {
      throw new Error('Gemini API key required');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(config.style ? { systemInstruction: { parts: [{ text: config.style }] } } : {}),
          generationConfig: {
            temperature: config.temperature ?? 0.7,
            maxOutputTokens: config.maxTokens ?? 2000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Gemini error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const tokensUsed = (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.candidatesTokenCount || 0);
    
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      tokensUsed,
      cost: 0, // Gemini бесплатный
    };
  }

  /**
   * Вызвать DeepSeek API
   */
  private async callDeepSeek(
    apiKey: string | undefined,
    prompt: string,
    config: InfiniteGenerationConfig
  ): Promise<{ content: string; tokensUsed: number; cost: number }> {
    if (!apiKey) {
      throw new Error('DeepSeek API key required');
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          ...(config.style ? [{ role: 'system', content: config.style }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
    const cost = tokensUsed * 0.00014 / 1000000 * 100; // В копейках примерно
    
    return {
      content: data.choices[0]?.message?.content || '',
      tokensUsed,
      cost,
    };
  }

  /**
   * Вызвать OpenRouter API
   */
  private async callOpenRouter(
    apiKey: string | undefined,
    prompt: string,
    config: InfiniteGenerationConfig
  ): Promise<{ content: string; tokensUsed: number; cost: number }> {
    if (!apiKey) {
      throw new Error('OpenRouter API key required');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'МУКН Infinite Generation',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          ...(config.style ? [{ role: 'system', content: config.style }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
    
    return {
      content: data.choices[0]?.message?.content || '',
      tokensUsed,
      cost: 0, // Бесплатная модель
    };
  }

  /**
   * Вызвать через SDK
   */
  private async callViaSDK(
    prompt: string,
    config: InfiniteGenerationConfig
  ): Promise<{ content: string; tokensUsed: number; cost: number }> {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        ...(config.style ? [{ role: 'system' as const, content: config.style }] : []),
        { role: 'user' as const, content: prompt },
      ],
      temperature: config.temperature ?? 0.7,
    });

    const tokensUsed = (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0);
    
    return {
      content: completion.choices[0]?.message?.content || '',
      tokensUsed,
      cost: 0,
    };
  }

  /**
   * Получить следующий промпт
   */
  private getNextPrompt(state: GeneratorState, config: InfiniteGenerationConfig): string {
    const prompts = config.prompts;
    const prompt = prompts[state.currentPromptIndex % prompts.length];
    state.currentPromptIndex++;
    return prompt;
  }

  /**
   * Обновить статистику
   */
  private updateStats(
    generatorId: string,
    data: {
      success: boolean;
      provider: string;
      tokensUsed: number;
      cost: number;
      generationTime: number;
      error?: string;
    }
  ): void {
    const stats = this.stats.get(generatorId) || this.createEmptyStats();
    
    stats.totalGenerated++;
    if (data.success) {
      stats.successfulGenerated++;
    } else {
      stats.failedGenerated++;
    }
    
    stats.totalCost += data.cost;
    stats.totalTokens += data.tokensUsed;
    stats.avgGenerationTime = 
      (stats.avgGenerationTime * (stats.totalGenerated - 1) + data.generationTime) / stats.totalGenerated;
    stats.successRate = stats.successfulGenerated / stats.totalGenerated;
    
    stats.todayGenerated++;
    if (data.success) stats.todaySuccessful++;
    stats.todayCost += data.cost;
    
    stats.hourGenerated++;
    if (data.success) stats.hourSuccessful++;
    
    if (!stats.byProvider[data.provider]) {
      stats.byProvider[data.provider] = { count: 0, success: 0, cost: 0 };
    }
    stats.byProvider[data.provider].count++;
    if (data.success) stats.byProvider[data.provider].success++;
    stats.byProvider[data.provider].cost += data.cost;
    
    const hour = new Date().getHours();
    stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    
    if (data.error) {
      stats.errors.push({
        time: new Date(),
        error: data.error,
        provider: data.provider,
      });
      // Храним только последние 100 ошибок
      if (stats.errors.length > 100) {
        stats.errors.shift();
      }
    }
    
    stats.lastGenerationAt = new Date();
    
    this.stats.set(generatorId, stats);
  }

  /**
   * Логировать генерацию
   */
  private async logGeneration(
    generatorId: string,
    data: {
      success: boolean;
      provider: string;
      prompt: string;
      content?: string;
      error?: string;
      generationTime: number;
      tokensUsed: number;
      cost: number;
    }
  ): Promise<void> {
    try {
      await db.bypassLog.create({
        data: {
          id: nanoid(),
          provider: data.provider,
          strategy: 'infinite_generation',
          success: data.success,
          waitMs: data.generationTime,
          totalAttempts: 1,
        },
      });
    } catch (error) {
      console.error('[InfiniteGeneration] Failed to log:', error);
    }
  }

  /**
   * Сохранить контент
   */
  private async saveContent(
    generatorId: string,
    config: InfiniteGenerationConfig,
    data: {
      content: string;
      provider: string;
      tokensUsed: number;
      cost: number;
      generationTime: number;
    }
  ): Promise<void> {
    try {
      await db.aIGeneratedContent.create({
        data: {
          id: nanoid(),
          contentType: config.contentType,
          prompt: config.prompts[0], // Сохраняем первый промпт как основной
          generatedText: data.content,
          aiProvider: data.provider,
          aiModel: data.provider,
          usedInMethod: config.campaignId,
          influencerId: config.influencerId,
        },
      });
    } catch (error) {
      console.error('[InfiniteGeneration] Failed to save content:', error);
    }
  }

  /**
   * Отправить уведомления
   */
  private async sendNotifications(
    generatorId: string,
    config: InfiniteGenerationConfig,
    data: { success: boolean; provider: string; error?: string }
  ): Promise<void> {
    // TODO: Интеграция с Telegram и email уведомлениями
  }

  /**
   * Отправить webhook
   */
  private async sendWebhook(
    generatorId: string,
    config: InfiniteGenerationConfig,
    data: { success: boolean; content?: string; provider: string; error?: string }
  ): Promise<void> {
    if (!config.webhookUrl) return;
    
    const shouldSend = (data.success && config.webhookOnSuccess) || 
                       (!data.success && config.webhookOnError);
    
    if (!shouldSend) return;
    
    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generatorId,
          timestamp: new Date().toISOString(),
          success: data.success,
          provider: data.provider,
          content: data.content?.substring(0, 1000),
          error: data.error,
        }),
      });
    } catch (error) {
      console.error('[InfiniteGeneration] Webhook failed:', error);
    }
  }

  /**
   * Создать пустую статистику
   */
  private createEmptyStats(): GenerationStats {
    return {
      totalGenerated: 0,
      successfulGenerated: 0,
      failedGenerated: 0,
      totalCost: 0,
      totalTokens: 0,
      avgGenerationTime: 0,
      successRate: 0,
      todayGenerated: 0,
      todaySuccessful: 0,
      todayCost: 0,
      hourGenerated: 0,
      hourSuccessful: 0,
      byProvider: {},
      byHour: {},
      errors: [],
    };
  }

  /**
   * Восстановить генераторы из БД
   */
  private async restoreGenerators(): Promise<void> {
    try {
      const jobs = await db.infiniteGenerationJob.findMany({
        where: {
          status: 'running',
        },
      });

      for (const job of jobs) {
        try {
          const config = JSON.parse(job.config || '{}') as InfiniteGenerationConfig;
          await this.startGeneration(config);
          console.log(`[InfiniteGeneration] Restored generator ${job.id}`);
        } catch (error) {
          console.error(`[InfiniteGeneration] Failed to restore ${job.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[InfiniteGeneration] Failed to restore generators:', error);
    }
  }

  /**
   * Запустить периодические задачи
   */
  private startMaintenanceTasks(): void {
    // Сброс часовых счетчиков
    setInterval(() => {
      const now = new Date();
      
      for (const [id, state] of this.generators) {
        if (now >= state.hourlyResetAt) {
          state.hourlyGenerated = 0;
          state.hourlyResetAt = new Date(Date.now() + 3600000);
          this.generators.set(id, state);
        }
      }
    }, 60000);

    // Сброс дневных счетчиков
    setInterval(() => {
      const now = new Date();
      
      for (const [id, state] of this.generators) {
        if (now >= state.dailyResetAt) {
          state.dailyGenerated = 0;
          state.dailyCost = 0;
          state.dailyResetAt = new Date(new Date().setHours(24, 0, 0, 0));
          this.generators.set(id, state);
          
          // Также обновляем статистику
          const stats = this.stats.get(id);
          if (stats) {
            stats.todayGenerated = 0;
            stats.todaySuccessful = 0;
            stats.todayCost = 0;
            this.stats.set(id, stats);
          }
        }
      }
    }, 60000);

    // Проверка здоровья каждые 5 минут
    setInterval(() => {
      this.healthCheck();
    }, 300000);
  }

  /**
   * Проверка здоровья генераторов
   */
  private healthCheck(): void {
    for (const [id, state] of this.generators) {
      if (state.status === 'running') {
        const stats = this.stats.get(id);
        if (stats && stats.successRate < 0.5 && stats.totalGenerated > 10) {
          console.warn(`[InfiniteGeneration] Generator ${id} has low success rate: ${stats.successRate}`);
          // Можно добавить автовосстановление или уведомление
        }
      }
    }
  }

  /**
   * Миллисекунды до полуночи
   */
  private getMsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }

  /**
   * Миллисекунды до конца часа
   */
  private getMsUntilHourEnd(): number {
    const now = new Date();
    const hourEnd = new Date(now);
    hourEnd.setHours(now.getHours() + 1, 0, 0, 0);
    return hourEnd.getTime() - now.getTime();
  }
}

// Singleton instance
let managerInstance: InfiniteGenerationManager | null = null;

export function getInfiniteGenerationManager(): InfiniteGenerationManager {
  if (!managerInstance) {
    managerInstance = new InfiniteGenerationManager();
  }
  return managerInstance;
}

export default InfiniteGenerationManager;

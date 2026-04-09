// AI Multi-Provider Manager with Failover and Load Balancing
// Поддержка: OpenRouter, Gemini, Groq, DeepSeek, Cerebras
// Автопереключение при ошибках, балансировка нагрузки

import { db } from './db';
import { AIContextCache, getAICache, CacheEntry } from './ai-cache';
import { nanoid } from 'nanoid';
import { getZAI } from './z-ai';

// Типы провайдеров
export type ProviderName = 'openrouter' | 'gemini' | 'groq' | 'deepseek' | 'cerebras';

// Типы задач для оптимизации выбора провайдера
export type TaskType = 
  | 'critical_comment'     // Финальный комментарий (критическая)
  | 'legal_risk'           // Юридический риск-анализ
  | 'adaptive_regen'       // Адаптивная перегенерация
  | 'mass_generation'      // Массовая генерация черновиков
  | 'ab_testing'           // A/B тестирование
  | 'channel_analysis'     // Анализ канала
  | 'dialogue_reply'       // Ответы в диалоге
  | 'content_generation'   // Генерация контента
  | 'campaign_analysis';   // Аналитика кампаний

export interface ProviderConfig {
  name: ProviderName;
  apiKey: string | null;
  defaultModel: string;
  priority: number;
  isActive: boolean;
  isFree: boolean;
  balance?: number;
  dailyQuota: number;
  dailyUsed: number;
  models: string[];
  lastError?: string;
  lastErrorTime?: number;
  consecutiveErrors: number;
  avgResponseTime: number;
  successRate: number;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  model?: string;
  systemPrompt?: string;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  useCache?: boolean;
  cacheContext?: string;
  taskType?: TaskType;
}

export interface GenerationResult {
  content: string;
  provider: ProviderName;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  responseTime: number;
  cached: boolean;
  similarity?: number;
}

// Доступные модели для каждого провайдера
export const PROVIDER_MODELS: Record<ProviderName, { id: string; name: string; isFree: boolean; maxTokens: number }[]> = {
  openrouter: [
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', isFree: false, maxTokens: 64000 },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', isFree: false, maxTokens: 64000 },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', isFree: false, maxTokens: 200000 },
    { id: 'openai/gpt-4o', name: 'GPT-4o', isFree: false, maxTokens: 128000 },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', isFree: false, maxTokens: 128000 },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', isFree: true, maxTokens: 32000 },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', isFree: false, maxTokens: 128000 },
    { id: 'qwen/qwq-32b-preview', name: 'QwQ 32B', isFree: false, maxTokens: 32000 },
  ],
  gemini: [
    { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro', isFree: false, maxTokens: 200000 },
    { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', isFree: true, maxTokens: 100000 },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', isFree: true, maxTokens: 32000 },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', isFree: false, maxTokens: 200000 },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', isFree: true, maxTokens: 100000 },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', isFree: true, maxTokens: 128000 },
    { id: 'llama-3.3-70b-specdec', name: 'Llama 3.3 70B SpecDec', isFree: true, maxTokens: 128000 },
    { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', isFree: true, maxTokens: 128000 },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', isFree: true, maxTokens: 32768 },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', isFree: true, maxTokens: 8192 },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', isFree: false, maxTokens: 64000 },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', isFree: false, maxTokens: 64000 },
  ],
  cerebras: [
    { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', isFree: true, maxTokens: 128000 },
    { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', isFree: true, maxTokens: 128000 },
    { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', isFree: true, maxTokens: 8192 },
  ],
};

// Модели по умолчанию
const DEFAULT_MODELS: Record<ProviderName, string> = {
  openrouter: 'deepseek/deepseek-chat',
  gemini: 'gemini-2.5-flash-preview-05-20',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
  cerebras: 'llama-3.3-70b',
};

// Дневные квоты (бесплатные)
const DAILY_QUOTAS: Record<ProviderName, number> = {
  cerebras: 14400,
  gemini: 500,
  groq: 1000,
  openrouter: 50,
  deepseek: Infinity, // Платный
};

// Приоритет провайдеров по типу задачи
const TASK_PRIORITY: Record<TaskType, ProviderName[]> = {
  critical_comment: ['deepseek', 'cerebras', 'gemini', 'groq'],
  legal_risk: ['deepseek'], // Только DeepSeek R1
  adaptive_regen: ['deepseek', 'cerebras', 'gemini'],
  mass_generation: ['cerebras', 'groq', 'gemini', 'openrouter'],
  ab_testing: ['cerebras', 'groq', 'gemini'],
  channel_analysis: ['gemini', 'groq', 'cerebras'],
  dialogue_reply: ['cerebras', 'groq', 'gemini'],
  content_generation: ['deepseek', 'cerebras', 'groq', 'gemini'],
  campaign_analysis: ['deepseek', 'gemini', 'groq'],
};

// Порог ошибок для временного исключения провайдера
const ERROR_THRESHOLD = 3;
const RECOVERY_TIME = 5 * 60 * 1000; // 5 минут

/**
 * AI Multi-Provider Manager Class
 */
export class AIProviderManager {
  private providers: Map<ProviderName, ProviderConfig> = new Map();
  private providerOrder: ProviderName[] = [];
  private cache: AIContextCache;
  private globalSettings = {
    autoFallback: true,
    notifyOnSwitch: true,
    useCheapestModel: false,
    minBalanceForSwitch: 5.0,
    dailyLimit: null as number | null,
    monthlyLimit: null as number | null,
  };

  constructor() {
    this.cache = getAICache();
  }

  /**
   * Инициализация провайдеров из БД
   */
  async initialize(userId: string): Promise<void> {
    const providerSettings = await db.aIProviderSettings.findMany({
      where: { userId },
      orderBy: { priority: 'asc' },
    });

    const globalSettings = await db.aIGlobalSettings.findFirst({
      where: { userId },
    });

    if (globalSettings) {
      this.globalSettings = {
        autoFallback: globalSettings.autoFallback,
        notifyOnSwitch: globalSettings.notifyOnSwitch,
        useCheapestModel: globalSettings.useCheapestModel,
        minBalanceForSwitch: globalSettings.minBalanceForSwitch,
        dailyLimit: globalSettings.dailyLimit,
        monthlyLimit: globalSettings.monthlyLimit,
      };
    }

    this.providers.clear();
    this.providerOrder = [];

    for (const setting of providerSettings) {
      if (setting.isActive && setting.apiKey) {
        const provider: ProviderConfig = {
          name: setting.provider as ProviderName,
          apiKey: setting.apiKey,
          defaultModel: setting.defaultModel || DEFAULT_MODELS[setting.provider as ProviderName],
          priority: setting.priority,
          isActive: setting.isActive,
          isFree: setting.isFree,
          balance: setting.balance || undefined,
          dailyQuota: setting.dailyQuota || DAILY_QUOTAS[setting.provider as ProviderName],
          dailyUsed: setting.dailyUsed,
          models: setting.models 
            ? JSON.parse(setting.models) 
            : PROVIDER_MODELS[setting.provider as ProviderName]?.map(m => m.id) || [],
          consecutiveErrors: setting.errorCount > 0 ? 1 : 0,
          avgResponseTime: setting.lastCheckTime || 0,
          successRate: setting.requestsCount > 0 
            ? setting.successCount / setting.requestsCount 
            : 1,
          lastError: setting.lastCheckError || undefined,
          lastErrorTime: undefined,
        };
        this.providers.set(provider.name, provider);
        this.providerOrder.push(provider.name);
      }
    }
  }

  /**
   * Проверка доступности провайдера
   */
  private isProviderAvailable(provider: ProviderConfig): boolean {
    if (!provider.isActive) return false;
    
    // Проверка квоты
    if (provider.isFree && provider.dailyUsed >= provider.dailyQuota) {
      return false;
    }
    
    // Проверка баланса для платных
    if (!provider.isFree && provider.balance !== undefined && provider.balance < this.globalSettings.minBalanceForSwitch) {
      return false;
    }
    
    // Проверка последовательных ошибок
    if (provider.consecutiveErrors >= ERROR_THRESHOLD) {
      if (provider.lastErrorTime && Date.now() - provider.lastErrorTime < RECOVERY_TIME) {
        return false;
      }
      // Время восстановления прошло - сбрасываем счётчик
      provider.consecutiveErrors = 0;
    }
    
    return true;
  }

  /**
   * Получение лучшего провайдера для задачи
   */
  private getBestProvider(taskType?: TaskType): ProviderConfig | null {
    const priority = taskType ? TASK_PRIORITY[taskType] : this.providerOrder;
    
    for (const providerName of priority) {
      const provider = this.providers.get(providerName);
      if (provider && this.isProviderAvailable(provider)) {
        return provider;
      }
    }
    
    // Fallback - любой доступный
    for (const providerName of this.providerOrder) {
      const provider = this.providers.get(providerName);
      if (provider && this.isProviderAvailable(provider)) {
        return provider;
      }
    }
    
    return null;
  }

  /**
   * Генерация с автоматическим выбором провайдера
   */
  async generate(
    prompt: string,
    options: GenerationOptions = {},
    userId?: string
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    
    // Проверка кэша
    if (options.useCache !== false) {
      const cached = this.cache.findSimilar(prompt, options.cacheContext);
      if (cached) {
        return {
          content: cached.response,
          provider: cached.provider as ProviderName,
          model: cached.model,
          tokensIn: cached.tokensIn,
          tokensOut: cached.tokensOut,
          cost: 0, // Сэкономлено
          responseTime: Date.now() - startTime,
          cached: true,
          similarity: cached.similarity,
        };
      }
    }

    // Если нет провайдеров, используем SDK
    if (this.providers.size === 0) {
      return this.generateWithSDK(prompt, options);
    }

    const providers = this.getActiveProviders();
    if (providers.length === 0) {
      return this.generateWithSDK(prompt, options);
    }

    let lastError: Error | null = null;
    const triedProviders: string[] = [];

    // Пробуем провайдеры по приоритету
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      triedProviders.push(provider.name);

      try {
        console.log(`[AIProviderManager] Trying provider: ${provider.name}`);
        
        const result = await this.callProvider(provider, prompt, options);
        
        // Успех - обновляем статистику
        await this.updateProviderStats(
          provider.name,
          true,
          result.tokensIn,
          result.tokensOut,
          result.responseTime,
          userId,
          undefined
        );
        
        // Сбрасываем счётчик ошибок
        provider.consecutiveErrors = 0;
        
        // Сохраняем в кэш
        if (options.useCache !== false) {
          this.cache.set(prompt, result.content, {
            provider: result.provider,
            model: result.model,
            tokensIn: result.tokensIn,
            tokensOut: result.tokensOut,
            cost: result.cost,
            context: options.cacheContext,
          });
        }
        
        // Логируем переключение если было
        if (i > 0 && this.globalSettings.notifyOnSwitch && userId) {
          await this.logProviderSwitch(triedProviders, provider.name, userId);
        }
        
        return { ...result, cached: false };
      } catch (error) {
        console.error(`[AIProviderManager] Provider ${provider.name} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Обновляем статистику ошибки
        provider.consecutiveErrors++;
        provider.lastError = lastError.message;
        provider.lastErrorTime = Date.now();
        
        await this.updateProviderStats(
          provider.name,
          false,
          0,
          0,
          Date.now() - startTime,
          userId,
          lastError.message
        );
        
        if (!this.globalSettings.autoFallback) {
          break;
        }
      }
    }

    // Fallback на SDK
    console.log('[AIProviderManager] All providers failed, falling back to SDK');
    try {
      const result = await this.generateWithSDK(prompt, options);
      return { ...result, cached: false };
    } catch (sdkError) {
      throw new Error(
        `All providers failed. Last error: ${lastError?.message}. SDK error: ${
          sdkError instanceof Error ? sdkError.message : String(sdkError)
        }`
      );
    }
  }

  /**
   * Получение активных провайдеров
   */
  getActiveProviders(): ProviderConfig[] {
    return this.providerOrder
      .map(name => this.providers.get(name)!)
      .filter(Boolean)
      .filter(p => this.isProviderAvailable(p));
  }

  /**
   * Вызов конкретного провайдера
   */
  private async callProvider(
    provider: ProviderConfig,
    prompt: string,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const model = options.model || provider.defaultModel;

    switch (provider.name) {
      case 'openrouter':
        return this.callOpenRouter(provider, prompt, options, model, startTime);
      case 'gemini':
        return this.callGemini(provider, prompt, options, model, startTime);
      case 'groq':
        return this.callGroq(provider, prompt, options, model, startTime);
      case 'deepseek':
        return this.callDeepSeek(provider, prompt, options, model, startTime);
      case 'cerebras':
        return this.callCerebras(provider, prompt, options, model, startTime);
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
  }

  /**
   * OpenRouter API
   */
  private async callOpenRouter(
    provider: ProviderConfig,
    prompt: string,
    options: GenerationOptions,
    model: string,
    startTime: number
  ): Promise<GenerationResult> {
    const messages = options.messages || [
      ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'МУКН | Трафик',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.maxTokens ?? 2000,
        top_p: options.topP,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;

    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'openrouter',
      model,
      tokensIn,
      tokensOut,
      cost: this.calculateCost('openrouter', model, tokensIn, tokensOut),
      responseTime: Date.now() - startTime,
      cached: false,
    };
  }

  /**
   * Gemini API
   */
  private async callGemini(
    provider: ProviderConfig,
    prompt: string,
    options: GenerationOptions,
    model: string,
    startTime: number
  ): Promise<GenerationResult> {
    const systemInstruction = options.systemPrompt
      ? { parts: [{ text: options.systemPrompt }] }
      : undefined;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${provider.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction,
          generationConfig: {
            temperature: options.temperature ?? 0.8,
            maxOutputTokens: options.maxTokens ?? 2000,
            topP: options.topP,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Gemini error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokensIn = data.usageMetadata?.promptTokenCount || 0;
    const tokensOut = data.usageMetadata?.candidatesTokenCount || 0;

    return {
      content,
      provider: 'gemini',
      model,
      tokensIn,
      tokensOut,
      cost: 0, // Gemini free tier
      responseTime: Date.now() - startTime,
      cached: false,
    };
  }

  /**
   * Groq API
   */
  private async callGroq(
    provider: ProviderConfig,
    prompt: string,
    options: GenerationOptions,
    model: string,
    startTime: number
  ): Promise<GenerationResult> {
    const messages = options.messages || [
      ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.maxTokens ?? 2000,
        top_p: options.topP,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Groq error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;

    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'groq',
      model,
      tokensIn,
      tokensOut,
      cost: 0, // Groq free tier
      responseTime: Date.now() - startTime,
      cached: false,
    };
  }

  /**
   * DeepSeek API
   */
  private async callDeepSeek(
    provider: ProviderConfig,
    prompt: string,
    options: GenerationOptions,
    model: string,
    startTime: number
  ): Promise<GenerationResult> {
    const messages = options.messages || [
      ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ];

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;

    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'deepseek',
      model,
      tokensIn,
      tokensOut,
      cost: this.calculateCost('deepseek', model, tokensIn, tokensOut),
      responseTime: Date.now() - startTime,
      cached: false,
    };
  }

  /**
   * Cerebras API
   */
  private async callCerebras(
    provider: ProviderConfig,
    prompt: string,
    options: GenerationOptions,
    model: string,
    startTime: number
  ): Promise<GenerationResult> {
    const messages = options.messages || [
      ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ];

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Cerebras error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;

    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'cerebras',
      model,
      tokensIn,
      tokensOut,
      cost: 0, // Cerebras free tier
      responseTime: Date.now() - startTime,
      cached: false,
    };
  }

  /**
   * Fallback на SDK
   */
  private async generateWithSDK(
    prompt: string,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    const zai = await getZAI();

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await zai.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.8,
    });

    const tokensIn = completion.usage?.prompt_tokens || 0;
    const tokensOut = completion.usage?.completion_tokens || 0;

    const result: GenerationResult = {
      content: completion.choices[0]?.message?.content || '',
      provider: 'deepseek',
      model: 'deepseek-chat',
      tokensIn,
      tokensOut,
      cost: this.calculateCost('deepseek', 'deepseek-chat', tokensIn, tokensOut),
      responseTime: Date.now() - startTime,
      cached: false,
    };

    // Сохраняем в кэш
    if (options.useCache !== false) {
      this.cache.set(prompt, result.content, {
        provider: result.provider,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        cost: result.cost,
        context: options.cacheContext,
      });
    }

    return result;
  }

  /**
   * Расчёт стоимости
   */
  private calculateCost(
    provider: ProviderName,
    model: string,
    tokensIn: number,
    tokensOut: number
  ): number {
    const prices: Record<string, { input: number; output: number }> = {
      'deepseek/deepseek-chat': { input: 0.14, output: 0.28 },
      'deepseek/deepseek-r1': { input: 0.55, output: 2.19 },
      'deepseek-chat': { input: 0.14, output: 0.28 },
      'deepseek-reasoner': { input: 0.55, output: 2.19 },
      'anthropic/claude-3.5-sonnet': { input: 3, output: 15 },
      'openai/gpt-4o': { input: 2.5, output: 10 },
      'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
    };

    const price = prices[model] || { input: 0, output: 0 };
    return (tokensIn / 1_000_000) * price.input + (tokensOut / 1_000_000) * price.output;
  }

  /**
   * Обновление статистики провайдера
   */
  private async updateProviderStats(
    providerName: string,
    success: boolean,
    tokensIn: number,
    tokensOut: number,
    responseTime: number,
    userId?: string,
    errorMessage?: string
  ): Promise<void> {
    if (!userId) return;

    try {
      await db.aIProviderSettings.updateMany({
        where: { provider: providerName, userId },
        data: {
          requestsCount: { increment: 1 },
          successCount: success ? { increment: 1 } : undefined,
          errorCount: success ? undefined : { increment: 1 },
          totalTokensIn: { increment: tokensIn },
          totalTokensOut: { increment: tokensOut },
          totalCost: success
            ? { increment: this.calculateCost(providerName as ProviderName, '', tokensIn, tokensOut) }
            : undefined,
          lastCheckAt: new Date(),
          lastCheckStatus: success ? 'success' : 'failed',
          lastCheckTime: responseTime,
          lastCheckError: errorMessage || null,
          dailyUsed: { increment: 1 },
        },
      });
    } catch (error) {
      console.error('[AIProviderManager] Failed to update stats:', error);
    }
  }

  /**
   * Логирование переключения провайдера
   */
  private async logProviderSwitch(
    triedProviders: string[],
    currentProvider: string,
    userId: string
  ): Promise<void> {
    try {
      await db.actionLog.create({
        data: {
          id: nanoid(),
          action: 'ai_provider_switch',
          entityType: 'ai_provider',
          details: JSON.stringify({
            tried: triedProviders,
            current: currentProvider,
            timestamp: new Date().toISOString(),
          }),
          userId,
        },
      });
    } catch (error) {
      console.error('[AIProviderManager] Failed to log switch:', error);
    }
  }

  /**
   * Проверка соединения с провайдером
   */
  async testConnection(
    providerName: ProviderName,
    apiKey: string,
    model?: string
  ): Promise<{ success: boolean; responseTime: number; error?: string; balance?: number }> {
    const startTime = Date.now();
    const testModel = model || DEFAULT_MODELS[providerName];

    try {
      const provider: ProviderConfig = {
        name: providerName,
        apiKey,
        defaultModel: testModel,
        priority: 1,
        isActive: true,
        isFree: providerName === 'gemini' || providerName === 'groq' || providerName === 'cerebras',
        dailyQuota: DAILY_QUOTAS[providerName],
        dailyUsed: 0,
        models: PROVIDER_MODELS[providerName]?.map(m => m.id) || [],
        consecutiveErrors: 0,
        avgResponseTime: 0,
        successRate: 1,
      };

      await this.callProvider(provider, 'Say "OK" in one word.', { maxTokens: 10 });

      const responseTime = Date.now() - startTime;

      // Получаем баланс для OpenRouter
      let balance: number | undefined;
      if (providerName === 'openrouter') {
        try {
          const balanceResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (balanceResponse.ok) {
            const data = await balanceResponse.json();
            balance = data.data?.limit_remaining || data.data?.usage;
          }
        } catch {
          // Ignore balance check errors
        }
      }

      return { success: true, responseTime, balance };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Получение статуса всех провайдеров
   */
  getProvidersStatus(): Array<{
    provider: ProviderName;
    isActive: boolean;
    isFree: boolean;
    dailyQuota: number;
    dailyUsed: number;
    remaining: number;
    percentUsed: number;
    successRate: number;
    avgResponseTime: number;
    isAvailable: boolean;
  }> {
    const result: Array<{
      provider: ProviderName;
      isActive: boolean;
      isFree: boolean;
      dailyQuota: number;
      dailyUsed: number;
      remaining: number;
      percentUsed: number;
      successRate: number;
      avgResponseTime: number;
      isAvailable: boolean;
    }> = [];

    for (const [name, provider] of this.providers) {
      result.push({
        provider: name,
        isActive: provider.isActive,
        isFree: provider.isFree,
        dailyQuota: provider.dailyQuota,
        dailyUsed: provider.dailyUsed,
        remaining: Math.max(0, provider.dailyQuota - provider.dailyUsed),
        percentUsed: (provider.dailyUsed / provider.dailyQuota) * 100,
        successRate: provider.successRate,
        avgResponseTime: provider.avgResponseTime,
        isAvailable: this.isProviderAvailable(provider),
      });
    }

    return result;
  }

  /**
   * Сброс дневных квот (крон в 00:00)
   */
  static async resetDailyQuotas(): Promise<void> {
    await db.aIProviderSettings.updateMany({
      data: {
        dailyUsed: 0,
        quotaResetAt: new Date(),
      },
    });
  }

  /**
   * Получение статистики кэша
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Очистка кэша
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
let managerInstance: AIProviderManager | null = null;

/**
 * Получение singleton менеджера
 */
export async function getAIProviderManager(userId: string): Promise<AIProviderManager> {
  if (!managerInstance) {
    managerInstance = new AIProviderManager();
  }
  await managerInstance.initialize(userId);
  return managerInstance;
}

/**
 * Быстрый доступ к генерации
 */
export const aiGenerate = {
  generate: async (prompt: string, options: GenerationOptions = {}, userId?: string) => {
    const manager = userId ? await getAIProviderManager(userId) : new AIProviderManager();
    return manager.generate(prompt, options, userId);
  },
  testConnection: async (provider: ProviderName, apiKey: string, model?: string) => {
    const manager = new AIProviderManager();
    return manager.testConnection(provider, apiKey, model);
  },
};

export default AIProviderManager;

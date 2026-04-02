// AI Multi-Provider Manager
// Управляет несколькими AI провайдерами с автоматическим fallback

import { db } from './db';

// Типы провайдеров
export type ProviderName = 'openrouter' | 'gemini' | 'groq' | 'deepseek';

export interface AIProvider {
  name: ProviderName;
  apiKey: string | null;
  defaultModel: string;
  priority: number;
  isActive: boolean;
  isFree: boolean;
  balance?: number;
  models: string[];
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  model?: string;
  systemPrompt?: string;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

export interface GenerationResult {
  content: string;
  provider: ProviderName;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  responseTime: number;
}

// Доступные модели для каждого провайдера
export const PROVIDER_MODELS: Record<ProviderName, { id: string; name: string; isFree: boolean }[]> = {
  openrouter: [
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', isFree: false },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', isFree: false },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', isFree: false },
    { id: 'openai/gpt-4o', name: 'GPT-4o', isFree: false },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', isFree: false },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', isFree: true },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', isFree: false },
    { id: 'qwen/qwq-32b-preview', name: 'QwQ 32B', isFree: false },
  ],
  gemini: [
    { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro', isFree: false },
    { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', isFree: true },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', isFree: true },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', isFree: false },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', isFree: true },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', isFree: true },
    { id: 'llama-3.3-70b-specdec', name: 'Llama 3.3 70B SpecDec', isFree: true },
    { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', isFree: true },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', isFree: true },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', isFree: true },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', isFree: false },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', isFree: false },
  ],
};

// Модели по умолчанию
const DEFAULT_MODELS: Record<ProviderName, string> = {
  openrouter: 'deepseek/deepseek-chat',
  gemini: 'gemini-2.5-flash-preview-05-20',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
};

// Класс AI Manager
export class AIManager {
  private providers: Map<ProviderName, AIProvider> = new Map();
  private providerOrder: ProviderName[] = [];
  private currentProviderIndex: number = 0;
  private globalSettings: {
    autoFallback: boolean;
    notifyOnSwitch: boolean;
    useCheapestModel: boolean;
    minBalanceForSwitch: number;
  } = {
    autoFallback: true,
    notifyOnSwitch: true,
    useCheapestModel: false,
    minBalanceForSwitch: 5.0,
  };

  // Инициализация провайдеров из БД
  async initialize(userId: string): Promise<void> {
    // Загружаем настройки провайдеров
    const providerSettings = await db.aIProviderSettings.findMany({
      where: { userId },
      orderBy: { priority: 'asc' },
    });

    // Загружаем глобальные настройки
    const globalSettings = await db.aIGlobalSettings.findFirst({
      where: { userId },
    });

    if (globalSettings) {
      this.globalSettings = {
        autoFallback: globalSettings.autoFallback,
        notifyOnSwitch: globalSettings.notifyOnSwitch,
        useCheapestModel: globalSettings.useCheapestModel,
        minBalanceForSwitch: globalSettings.minBalanceForSwitch,
      };
    }

    // Инициализируем провайдеры
    this.providers.clear();
    this.providerOrder = [];

    for (const setting of providerSettings) {
      if (setting.isActive && setting.apiKey) {
        const provider: AIProvider = {
          name: setting.provider as ProviderName,
          apiKey: setting.apiKey,
          defaultModel: setting.defaultModel || DEFAULT_MODELS[setting.provider as ProviderName],
          priority: setting.priority,
          isActive: setting.isActive,
          isFree: setting.isFree,
          balance: setting.balance || undefined,
          models: setting.models ? JSON.parse(setting.models) : PROVIDER_MODELS[setting.provider as ProviderName]?.map(m => m.id) || [],
        };
        this.providers.set(provider.name, provider);
        this.providerOrder.push(provider.name);
      }
    }

    // Если нет активных провайдеров, добавляем дефолтный DeepSeek через SDK
    if (this.providers.size === 0) {
      console.log('[AIManager] No active providers configured, using default SDK');
    }
  }

  // Получить список активных провайдеров
  getActiveProviders(): AIProvider[] {
    return this.providerOrder.map(name => this.providers.get(name)!).filter(Boolean);
  }

  // Получить текущий провайдер
  getCurrentProvider(): AIProvider | null {
    const name = this.providerOrder[this.currentProviderIndex];
    return name ? this.providers.get(name) || null : null;
  }

  // Генерация контента с fallback
  async generate(
    prompt: string,
    options: GenerationOptions = {},
    userId: string
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    // Если нет провайдеров, используем SDK
    if (this.providers.size === 0) {
      return this.generateWithSDK(prompt, options);
    }

    const providers = this.getActiveProviders();
    if (providers.length === 0) {
      // Fallback на SDK
      return this.generateWithSDK(prompt, options);
    }

    let lastError: Error | null = null;
    const triedProviders: string[] = [];

    // Пробуем провайдеры по очереди
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      triedProviders.push(provider.name);

      try {
        console.log(`[AIManager] Trying provider: ${provider.name}`);
        
        const result = await this.callProvider(provider, prompt, options);
        
        // Успех - обновляем статистику
        await this.updateProviderStats(provider.name, true, result.tokensIn, result.tokensOut, result.responseTime, userId);
        
        // Если переключились на резервный провайдер, логируем
        if (i > 0 && this.globalSettings.notifyOnSwitch) {
          await this.logProviderSwitch(triedProviders, provider.name, userId);
        }
        
        return result;
      } catch (error) {
        console.error(`[AIManager] Provider ${provider.name} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Обновляем статистику ошибки
        await this.updateProviderStats(provider.name, false, 0, 0, Date.now() - startTime, userId, lastError.message);
        
        // Если автопереключение выключено, не пробуем следующие
        if (!this.globalSettings.autoFallback) {
          break;
        }
      }
    }

    // Все провайдеры не сработали - fallback на SDK
    console.log('[AIManager] All providers failed, falling back to SDK');
    try {
      const result = await this.generateWithSDK(prompt, options);
      return result;
    } catch (sdkError) {
      throw new Error(`All providers failed. Last error: ${lastError?.message}. SDK error: ${sdkError instanceof Error ? sdkError.message : String(sdkError)}`);
    }
  }

  // Вызов конкретного провайдера
  private async callProvider(
    provider: AIProvider,
    prompt: string,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const model = options.model || provider.defaultModel;

    switch (provider.name) {
      case 'openrouter':
        return this.callOpenRouter(provider, prompt, options, model);
      case 'gemini':
        return this.callGemini(provider, prompt, options, model);
      case 'groq':
        return this.callGroq(provider, prompt, options, model);
      case 'deepseek':
        return this.callDeepSeek(provider, prompt, options, model);
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
  }

  // OpenRouter API
  private async callOpenRouter(
    provider: AIProvider,
    prompt: string,
    options: GenerationOptions,
    model: string
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    
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
    const responseTime = Date.now() - startTime;

    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'openrouter',
      model,
      tokensIn: data.usage?.prompt_tokens || 0,
      tokensOut: data.usage?.completion_tokens || 0,
      cost: this.calculateCost('openrouter', model, data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0),
      responseTime,
    };
  }

  // Gemini API
  private async callGemini(
    provider: AIProvider,
    prompt: string,
    options: GenerationOptions,
    model: string
  ): Promise<GenerationResult> {
    const startTime = Date.now();

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
    const responseTime = Date.now() - startTime;

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content,
      provider: 'gemini',
      model,
      tokensIn: data.usageMetadata?.promptTokenCount || 0,
      tokensOut: data.usageMetadata?.candidatesTokenCount || 0,
      cost: 0, // Gemini free tier
      responseTime,
    };
  }

  // Groq API
  private async callGroq(
    provider: AIProvider,
    prompt: string,
    options: GenerationOptions,
    model: string
  ): Promise<GenerationResult> {
    const startTime = Date.now();

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
    const responseTime = Date.now() - startTime;

    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'groq',
      model,
      tokensIn: data.usage?.prompt_tokens || 0,
      tokensOut: data.usage?.completion_tokens || 0,
      cost: 0, // Groq free tier
      responseTime,
    };
  }

  // DeepSeek API (прямой)
  private async callDeepSeek(
    provider: AIProvider,
    prompt: string,
    options: GenerationOptions,
    model: string
  ): Promise<GenerationResult> {
    const startTime = Date.now();

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
    const responseTime = Date.now() - startTime;

    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'deepseek',
      model,
      tokensIn: data.usage?.prompt_tokens || 0,
      tokensOut: data.usage?.completion_tokens || 0,
      cost: this.calculateCost('deepseek', model, data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0),
      responseTime,
    };
  }

  // Fallback на SDK
  private async generateWithSDK(prompt: string, options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();

    // Динамический импорт SDK
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await zai.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.8,
    });

    const responseTime = Date.now() - startTime;
    const tokensIn = completion.usage?.prompt_tokens || 0;
    const tokensOut = completion.usage?.completion_tokens || 0;

    return {
      content: completion.choices[0]?.message?.content || '',
      provider: 'deepseek',
      model: 'deepseek-chat',
      tokensIn,
      tokensOut,
      cost: this.calculateCost('deepseek', 'deepseek-chat', tokensIn, tokensOut),
      responseTime,
    };
  }

  // Расчёт стоимости
  private calculateCost(provider: ProviderName, model: string, tokensIn: number, tokensOut: number): number {
    // Примерные цены за 1M токенов
    const prices: Record<string, { input: number; output: number }> = {
      'deepseek/deepseek-chat': { input: 0.14, output: 0.28 },
      'deepseek/deepseek-r1': { input: 0.55, output: 2.19 },
      'deepseek-chat': { input: 0.14, output: 0.28 },
      'anthropic/claude-3.5-sonnet': { input: 3, output: 15 },
      'openai/gpt-4o': { input: 2.5, output: 10 },
      'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
    };

    const price = prices[model] || { input: 0, output: 0 };
    return (tokensIn / 1_000_000) * price.input + (tokensOut / 1_000_000) * price.output;
  }

  // Обновление статистики провайдера
  private async updateProviderStats(
    providerName: string,
    success: boolean,
    tokensIn: number,
    tokensOut: number,
    responseTime: number,
    userId: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.aIProviderSettings.updateMany({
        where: { provider: providerName, userId },
        data: {
          requestsCount: { increment: 1 },
          successCount: success ? { increment: 1 } : undefined,
          errorCount: success ? undefined : { increment: 1 },
          totalTokensIn: { increment: tokensIn },
          totalTokensOut: { increment: tokensOut },
          totalCost: success ? { increment: this.calculateCost(providerName as ProviderName, '', tokensIn, tokensOut) } : undefined,
          lastCheckAt: new Date(),
          lastCheckStatus: success ? 'success' : 'failed',
          lastCheckTime: responseTime,
          lastCheckError: errorMessage || null,
        },
      });
    } catch (error) {
      console.error('[AIManager] Failed to update stats:', error);
    }
  }

  // Логирование переключения провайдера
  private async logProviderSwitch(
    triedProviders: string[],
    currentProvider: string,
    userId: string
  ): Promise<void> {
    try {
      await db.actionLog.create({
        data: {
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
      console.error('[AIManager] Failed to log switch:', error);
    }
  }

  // Проверка соединения с провайдером
  async testConnection(
    providerName: ProviderName,
    apiKey: string,
    model?: string
  ): Promise<{ success: boolean; responseTime: number; error?: string; balance?: number }> {
    const startTime = Date.now();
    const testModel = model || DEFAULT_MODELS[providerName];

    try {
      const provider: AIProvider = {
        name: providerName,
        apiKey,
        defaultModel: testModel,
        priority: 1,
        isActive: true,
        isFree: providerName === 'gemini' || providerName === 'groq',
        models: PROVIDER_MODELS[providerName]?.map(m => m.id) || [],
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
}

// Singleton instance
let aiManagerInstance: AIManager | null = null;

export async function getAIManager(userId: string): Promise<AIManager> {
  if (!aiManagerInstance) {
    aiManagerInstance = new AIManager();
  }
  await aiManagerInstance.initialize(userId);
  return aiManagerInstance;
}

// Экспорт для удобства
export const aiManager = {
  generate: async (prompt: string, options: GenerationOptions, userId: string) => {
    const manager = await getAIManager(userId);
    return manager.generate(prompt, options, userId);
  },
  testConnection: async (provider: ProviderName, apiKey: string, model?: string) => {
    const manager = new AIManager();
    return manager.testConnection(provider, apiKey, model);
  },
};

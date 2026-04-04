// AI Dispatcher - Диспетчер распределения задач по API
// Приоритет: бесплатные API → DeepSeek (платное ядро)

import { db } from './db';
import { AIBudgetManager, getAIBudgetManager } from './ai-budget-manager';

// Типы провайдеров
export type ProviderName = 'cerebras' | 'gemini' | 'groq' | 'openrouter' | 'deepseek';

// Типы задач
export type TaskType = 
  | 'critical_comment'     // Финальный комментарий (критическая)
  | 'legal_risk'           // Юридический риск-анализ (критическая)
  | 'adaptive_regen'       // Адаптивная перегенерация (критическая)
  | 'mass_generation'      // Массовая генерация черновиков
  | 'ab_testing'           // A/B тестирование
  | 'channel_analysis'     // Анализ канала
  | 'dialogue_reply';      // Ответы в диалоге

// Квоты бесплатных API (в день)
const FREE_API_QUOTAS: Record<ProviderName, number> = {
  cerebras: 14400,      // 14,400 запросов/день
  gemini: 500,          // 500 запросов/день (Flash)
  groq: 1000,           // ~1000 запросов/день
  openrouter: 50,       // ~50 запросов/день (free tier)
  deepseek: Infinity,   // Платный, без лимита
};

// Модели по умолчанию
const DEFAULT_MODELS: Record<ProviderName, string> = {
  cerebras: 'llama-3.3-70b',
  gemini: 'gemini-2.5-flash-preview-05-20',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'google/gemini-2.0-flash-exp:free',
  deepseek: 'deepseek-chat',
};

// Приоритет провайдеров по типу задачи
const TASK_PRIORITY: Record<TaskType, ProviderName[]> = {
  // Критические задачи: DeepSeek → бесплатные
  critical_comment: ['deepseek', 'cerebras', 'gemini', 'groq'],
  legal_risk: ['deepseek'], // Только DeepSeek R1 для юридического анализа
  adaptive_regen: ['deepseek', 'cerebras', 'gemini'],
  
  // Массовые задачи: бесплатные в приоритете
  mass_generation: ['cerebras', 'groq', 'gemini', 'openrouter'],
  ab_testing: ['cerebras', 'groq', 'gemini'],
  channel_analysis: ['gemini', 'groq', 'cerebras'],
  dialogue_reply: ['cerebras', 'groq', 'gemini'],
};

export interface APIProvider {
  name: ProviderName;
  apiKey: string | null;
  model: string;
  isFree: boolean;
  dailyQuota: number;
  dailyUsed: number;
  isActive: boolean;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
}

export interface GenerationResult {
  content: string;
  provider: ProviderName;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  responseTime: number;
  wasFree: boolean;
}

/**
 * Класс диспетчера API
 */
export class AIDispatcher {
  private userId: string;
  private providers: Map<ProviderName, APIProvider> = new Map();
  private budgetManager: AIBudgetManager;
  
  constructor(userId: string) {
    this.userId = userId;
    this.budgetManager = getAIBudgetManager(userId);
  }
  
  /**
   * Инициализация - загрузка провайдеров из БД
   */
  async initialize(): Promise<void> {
    const settings = await db.aIProviderSettings.findMany({
      where: { userId: this.userId },
    });
    
    this.providers.clear();
    
    for (const setting of settings) {
      if (setting.isActive && setting.apiKey) {
        const provider: APIProvider = {
          name: setting.provider as ProviderName,
          apiKey: setting.apiKey,
          model: setting.defaultModel || DEFAULT_MODELS[setting.provider as ProviderName],
          isFree: setting.isFree,
          dailyQuota: setting.dailyQuota || FREE_API_QUOTAS[setting.provider as ProviderName],
          dailyUsed: setting.dailyUsed,
          isActive: setting.isActive,
        };
        this.providers.set(provider.name, provider);
      }
    }
    
    // Инициализируем бюджет-менеджер
    await this.budgetManager.initialize();
  }
  
  /**
   * Получить приоритетный провайдер для задачи
   */
  async getProviderForTask(taskType: TaskType): Promise<APIProvider | null> {
    const priority = TASK_PRIORITY[taskType];
    
    for (const providerName of priority) {
      const provider = this.providers.get(providerName);
      
      if (!provider || !provider.isActive) continue;
      
      // Для критических задач с DeepSeek - проверяем бюджет
      if (providerName === 'deepseek' && !provider.isFree) {
        const budget = await this.budgetManager.canMakeRequest();
        if (!budget.allowed) {
          // Бюджет исчерпан, пропускаем DeepSeek
          continue;
        }
      }
      
      // Для бесплатных - проверяем квоту
      if (provider.isFree && provider.dailyUsed >= provider.dailyQuota) {
        continue; // Квота исчерпана
      }
      
      return provider;
    }
    
    return null;
  }
  
  /**
   * Генерация с автоматическим выбором провайдера
   */
  async generate(
    prompt: string,
    taskType: TaskType,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    await this.initialize();
    
    const provider = await this.getProviderForTask(taskType);
    
    if (!provider) {
      // Fallback на SDK
      return this.generateWithSDK(prompt, options);
    }
    
    const result = await this.callProvider(provider, prompt, options);
    
    // Обновляем статистику
    await this.updateStats(provider, result);
    
    return result;
  }
  
  /**
   * Вызов конкретного провайдера
   */
  private async callProvider(
    provider: APIProvider,
    prompt: string,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const model = options.model || provider.model;
    
    switch (provider.name) {
      case 'cerebras':
        return this.callCerebras(provider, prompt, options, model, startTime);
      case 'gemini':
        return this.callGemini(provider, prompt, options, model, startTime);
      case 'groq':
        return this.callGroq(provider, prompt, options, model, startTime);
      case 'openrouter':
        return this.callOpenRouter(provider, prompt, options, model, startTime);
      case 'deepseek':
        return this.callDeepSeek(provider, prompt, options, model, startTime);
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
  }
  
  /**
   * Cerebras API (бесплатный)
   */
  private async callCerebras(
    provider: APIProvider,
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
        max_tokens: options.maxTokens ?? 500,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Cerebras error: ${response.status} - ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'cerebras',
      model,
      tokensIn: data.usage?.prompt_tokens || 0,
      tokensOut: data.usage?.completion_tokens || 0,
      cost: 0, // Бесплатный
      responseTime: Date.now() - startTime,
      wasFree: true,
    };
  }
  
  /**
   * Gemini API
   */
  private async callGemini(
    provider: APIProvider,
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
            maxOutputTokens: options.maxTokens ?? 500,
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
    
    return {
      content,
      provider: 'gemini',
      model,
      tokensIn: data.usageMetadata?.promptTokenCount || 0,
      tokensOut: data.usageMetadata?.candidatesTokenCount || 0,
      cost: 0,
      responseTime: Date.now() - startTime,
      wasFree: true,
    };
  }
  
  /**
   * Groq API
   */
  private async callGroq(
    provider: APIProvider,
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
        max_tokens: options.maxTokens ?? 500,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Groq error: ${response.status} - ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'groq',
      model,
      tokensIn: data.usage?.prompt_tokens || 0,
      tokensOut: data.usage?.completion_tokens || 0,
      cost: 0,
      responseTime: Date.now() - startTime,
      wasFree: true,
    };
  }
  
  /**
   * OpenRouter API
   */
  private async callOpenRouter(
    provider: APIProvider,
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
        max_tokens: options.maxTokens ?? 500,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter error: ${response.status} - ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'openrouter',
      model,
      tokensIn: data.usage?.prompt_tokens || 0,
      tokensOut: data.usage?.completion_tokens || 0,
      cost: 0,
      responseTime: Date.now() - startTime,
      wasFree: model.includes(':free'),
    };
  }
  
  /**
   * DeepSeek API (платный)
   */
  private async callDeepSeek(
    provider: APIProvider,
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
        max_tokens: options.maxTokens ?? 500,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek error: ${response.status} - ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;
    
    // Расчёт стоимости
    const prices = model === 'deepseek-reasoner' 
      ? { input: 0.55, output: 2.19 }
      : { input: 0.14, output: 0.28 };
    
    const cost = (tokensIn / 1_000_000) * prices.input + (tokensOut / 1_000_000) * prices.output;
    
    // Записываем расход
    await this.budgetManager.recordExpense(cost, tokensIn, tokensOut);
    
    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'deepseek',
      model,
      tokensIn,
      tokensOut,
      cost,
      responseTime: Date.now() - startTime,
      wasFree: false,
    };
  }
  
  /**
   * Fallback на SDK
   */
  private async generateWithSDK(prompt: string, options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    
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
    
    return {
      content: completion.choices[0]?.message?.content || '',
      provider: 'deepseek',
      model: 'deepseek-chat',
      tokensIn: completion.usage?.prompt_tokens || 0,
      tokensOut: completion.usage?.completion_tokens || 0,
      cost: 0,
      responseTime: Date.now() - startTime,
      wasFree: false,
    };
  }
  
  /**
   * Обновление статистики провайдера
   */
  private async updateStats(provider: APIProvider, result: GenerationResult): Promise<void> {
    await db.aIProviderSettings.updateMany({
      where: { provider: provider.name, userId: this.userId },
      data: {
        requestsCount: { increment: 1 },
        successCount: { increment: 1 },
        totalTokensIn: { increment: result.tokensIn },
        totalTokensOut: { increment: result.tokensOut },
        totalCost: { increment: result.cost },
        dailyUsed: { increment: 1 },
        lastCheckAt: new Date(),
        lastCheckStatus: 'success',
      },
    });
  }
  
  /**
   * Получить статус всех провайдеров
   */
  async getProvidersStatus(): Promise<Array<{
    provider: ProviderName;
    isActive: boolean;
    isFree: boolean;
    dailyQuota: number;
    dailyUsed: number;
    remaining: number;
    percentUsed: number;
  }>> {
    await this.initialize();
    
    const result: { provider: ProviderName; isActive: boolean; isFree: boolean; dailyQuota: number; dailyUsed: number; remaining: number; percentUsed: number }[] = [];
    
    for (const [name, provider] of this.providers) {
      result.push({
        provider: name,
        isActive: provider.isActive,
        isFree: provider.isFree,
        dailyQuota: provider.dailyQuota,
        dailyUsed: provider.dailyUsed,
        remaining: Math.max(0, provider.dailyQuota - provider.dailyUsed),
        percentUsed: (provider.dailyUsed / provider.dailyQuota) * 100,
      });
    }
    
    return result;
  }
  
  /**
   * Сброс дневных квот (вызывать по крону в 00:00)
   */
  static async resetDailyQuotas(): Promise<void> {
    await db.aIProviderSettings.updateMany({
      data: {
        dailyUsed: 0,
        quotaResetAt: new Date(),
      },
    });
  }
}

// Экспорт singleton factory
export function getAIDispatcher(userId: string): AIDispatcher {
  return new AIDispatcher(userId);
}

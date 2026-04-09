/**
 * Content Studio Integration with Provider Bypass
 * 
 * Интеграция системы обхода ограничений с Content Studio
 * Для 24/365 генерации контента
 * 
 * Включает автоматическое управление API ключами провайдеров
 */

import { 
  getBypassStrategyEngine,
  getProviderLimitRegistry,
  ProviderType,
  ContentType,
} from '@/lib/provider-bypass';
import { getAutoApiKeyManager } from './auto-api-key-manager';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// Типы контента
export type StudioContentType = 'text' | 'image' | 'video' | 'audio' | 'mixed';

// Результат генерации
export interface ContentGenerationResult {
  id: string;
  success: boolean;
  contentType: StudioContentType;
  content?: string;
  mediaUrl?: string;
  mediaBase64?: string;
  provider: ProviderType;
  accountId?: string;
  bypassStrategies: string[];
  attempts: number;
  generationTime: number;
  tokensUsed: number;
  cost: number;
  error?: string;
}

// Конфигурация генерации
export interface GenerationConfig {
  // Контент
  contentType: StudioContentType;
  prompt: string;
  negativePrompt?: string;
  style?: string;
  
  // Параметры
  temperature?: number;
  maxTokens?: number;
  
  // Провайдер
  preferredProvider?: ProviderType;
  fallbackProviders?: ProviderType[];
  
  // Стоимость
  maxCost?: number;
  
  // Приоритет
  priority?: 'high' | 'normal' | 'low';
  
  // Связи
  campaignId?: string;
  influencerId?: string;
  templateId?: string;
  
  // Метаданные
  metadata?: Record<string, unknown>;
}

/**
 * Content Studio с интеграцией Provider Bypass
 */
export class ContentStudioWithBypass {
  private engine = getBypassStrategyEngine();
  private registry = getProviderLimitRegistry();
  private keyManager = getAutoApiKeyManager();
  
  /**
   * Генерация контента с обходом ограничений
   */
  async generate(config: GenerationConfig): Promise<ContentGenerationResult> {
    const startTime = Date.now();
    const id = nanoid();
    
    // Создаем запись в очереди
    const queueItem = await db.contentGenerationQueue.create({
      data: {
        id: nanoid(),
        jobId: id,
        contentType: config.contentType,
        prompt: config.prompt,
        params: JSON.stringify({
          negativePrompt: config.negativePrompt,
          style: config.style,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          metadata: config.metadata,
        }),
        priority: config.priority === 'high' ? 1 : config.priority === 'low' ? 9 : 5,
        status: 'processing',
        scheduledAt: new Date(),
      },
    });
    
    try {
      // Определяем провайдеры по типу контента
      const providers = this.getProvidersForContentType(config.contentType, config.preferredProvider);
      
      // Выполняем генерацию с обходом
      const result = await this.engine.executeWithBypass(
        async (provider, account, proxy) => {
          return this.callProvider(provider, account, proxy, config);
        },
        {
          provider: providers[0],
          contentType: config.contentType as ContentType,
          priority: config.priority,
          maxCost: config.maxCost,
        }
      );
      
      const generationTime = Date.now() - startTime;
      
      // Обновляем запись в очереди
      await db.contentGenerationQueue.update({
        where: { id: queueItem.id },
        data: {
          status: result.success ? 'completed' : 'failed',
          result: JSON.stringify(result),
          error: result.error,
          completedAt: new Date(),
        },
      });
      
      // Сохраняем результат
      if (result.success && result.content) {
        await this.saveGeneratedContent({
          id,
          contentType: config.contentType,
          prompt: config.prompt,
          content: result.content,
          provider: result.provider,
          accountId: result.accountId,
          campaignId: config.campaignId,
          influencerId: config.influencerId,
          templateId: config.templateId,
          metadata: config.metadata,
          generationTime,
          tokensUsed: result.tokensUsed,
          cost: result.cost,
        });
      }
      
      return {
        id,
        success: result.success,
        contentType: config.contentType,
        content: result.content,
        provider: result.provider,
        accountId: result.accountId,
        bypassStrategies: result.strategies,
        attempts: result.totalAttempts,
        generationTime,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        error: result.error,
      };
      
    } catch (error) {
      const generationTime = Date.now() - startTime;
      
      // Обновляем запись об ошибке
      await db.contentGenerationQueue.update({
        where: { id: queueItem.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });
      
      return {
        id,
        success: false,
        contentType: config.contentType,
        provider: config.preferredProvider || 'custom',
        bypassStrategies: [],
        attempts: 1,
        generationTime,
        tokensUsed: 0,
        cost: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Массовая генерация контента
   */
  async generateBatch(
    configs: GenerationConfig[],
    options: {
      maxConcurrent?: number;
      stopOnError?: boolean;
      progressCallback?: (completed: number, total: number, results: ContentGenerationResult[]) => void;
    } = {}
  ): Promise<ContentGenerationResult[]> {
    const results: ContentGenerationResult[] = [];
    const maxConcurrent = options.maxConcurrent || 3;
    
    // Разбиваем на батчи
    for (let i = 0; i < configs.length; i += maxConcurrent) {
      const batch = configs.slice(i, i + maxConcurrent);
      
      const batchResults = await Promise.all(
        batch.map(config => this.generate(config))
      );
      
      results.push(...batchResults);
      
      if (options.progressCallback) {
        options.progressCallback(results.length, configs.length, results);
      }
      
      if (options.stopOnError && batchResults.some(r => !r.success)) {
        break;
      }
      
      // Небольшая пауза между батчами
      await this.delay(100);
    }
    
    return results;
  }
  
  /**
   * Непрерывная генерация (24/365 режим)
   */
  async startContinuousGeneration(config: {
    prompts: string[];
    contentType: StudioContentType;
    intervalMinutes: number;
    maxGenerations?: number;
    style?: string;
    preferredProvider?: ProviderType;
    campaignId?: string;
    influencerId?: string;
    callback?: (result: ContentGenerationResult) => void;
  }): Promise<{ jobId: string; stop: () => void }> {
    const jobId = nanoid();
    let stopped = false;
    let generated = 0;
    
    // Создаем job в БД
    const job = await db.infiniteGenerationJob.create({
      data: {
        id: jobId,
        status: 'running',
        totalGenerated: 0,
        config: JSON.stringify(config),
        startedAt: new Date(),
      },
    });
    
    // Запускаем генерацию в фоне
    const runGeneration = async () => {
      let promptIndex = 0;
      
      while (!stopped && (!config.maxGenerations || generated < config.maxGenerations)) {
        try {
          // Получаем следующий промпт
          const prompt = config.prompts[promptIndex % config.prompts.length];
          promptIndex++;
          
          // Вариативность промпта
          const variedPrompt = await this.varyPrompt(prompt);
          
          // Генерируем контент
          const result = await this.generate({
            contentType: config.contentType,
            prompt: variedPrompt,
            style: config.style,
            preferredProvider: config.preferredProvider,
            campaignId: config.campaignId,
            influencerId: config.influencerId,
            priority: 'normal',
          });
          
          generated++;
          
          // Обновляем статистику
          await db.infiniteGenerationJob.update({
            where: { id: jobId },
            data: {
              totalGenerated: generated,
              lastGeneratedAt: new Date(),
            },
          });
          
          // Callback
          if (config.callback) {
            config.callback(result);
          }
          
          // Логируем результат
          await db.bypassLog.create({
            data: {
              id: nanoid(),
              provider: result.provider,
              accountId: result.accountId,
              strategy: result.bypassStrategies.join(','),
              success: result.success,
              waitMs: result.generationTime,
              totalAttempts: result.attempts,
            },
          });
          
        } catch (error) {
          console.error('[Continuous Generation] Error:', error);
        }
        
        // Ждем до следующей генерации
        await this.delay(config.intervalMinutes * 60000);
      }
      
      // Завершаем job
      await db.infiniteGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          totalGenerated: generated,
        },
      });
    };
    
    // Запускаем в фоне
    runGeneration().catch(console.error);
    
    return {
      jobId,
      stop: () => {
        stopped = true;
      },
    };
  }
  
  /**
   * Получение статистики генерации
   */
  async getStats(): Promise<{
    totalGenerated: number;
    successfulRate: number;
    avgGenerationTime: number;
    totalCost: number;
    providersUsed: Record<string, number>;
    strategiesUsed: Record<string, number>;
  }> {
    const logs = await db.bypassLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // За последние 24 часа
        },
      },
    });
    
    const totalGenerated = logs.length;
    const successful = logs.filter(l => l.success).length;
    const avgGenerationTime = logs.reduce((sum, l) => sum + (l.waitMs || 0), 0) / (totalGenerated || 1);
    
    const providersUsed: Record<string, number> = {};
    const strategiesUsed: Record<string, number> = {};
    
    for (const log of logs) {
      providersUsed[log.provider] = (providersUsed[log.provider] || 0) + 1;
      
      const strategies = log.strategy.split(',');
      for (const strategy of strategies) {
        if (strategy) {
          strategiesUsed[strategy] = (strategiesUsed[strategy] || 0) + 1;
        }
      }
    }
    
    return {
      totalGenerated,
      successfulRate: totalGenerated > 0 ? successful / totalGenerated : 0,
      avgGenerationTime,
      totalCost: 0, // TODO: считать из транзакций
      providersUsed,
      strategiesUsed,
    };
  }
  
  // Private methods
  
  private getProvidersForContentType(
    contentType: StudioContentType,
    preferred?: ProviderType
  ): ProviderType[] {
    const textProviders: ProviderType[] = ['cerebras', 'groq', 'gemini', 'deepseek', 'openrouter'];
    const imageProviders: ProviderType[] = ['stability', 'midjourney', 'gpt4'];
    const videoProviders: ProviderType[] = ['kling', 'luma', 'runway', 'pika', 'sora'];
    const audioProviders: ProviderType[] = ['elevenlabs'];
    
    let providers: ProviderType[];
    
    switch (contentType) {
      case 'text':
        providers = textProviders;
        break;
      case 'image':
        providers = imageProviders;
        break;
      case 'video':
        providers = videoProviders;
        break;
      case 'audio':
        providers = audioProviders;
        break;
      case 'mixed':
        providers = [...textProviders, ...imageProviders, ...videoProviders];
        break;
      default:
        providers = textProviders;
    }
    
    // Перемещаем preferred в начало
    if (preferred && providers.includes(preferred)) {
      providers = [preferred, ...providers.filter(p => p !== preferred)];
    }
    
    // Фильтруем по доступности
    const available = this.registry.getAvailableProviders(contentType as ContentType);
    const availableSet = new Set(available.map(a => a.provider));
    
    return providers.filter(p => availableSet.has(p));
  }
  
  private async callProvider(
    provider: ProviderType,
    account: { apiKey?: string; email?: string; password?: string; id: string },
    proxy: { host: string; port: number; username?: string; password?: string; type: string } | undefined,
    config: GenerationConfig
  ): Promise<{ content: string; tokensUsed: number }> {
    // Пытаемся получить API ключ из менеджера ключей
    let apiKey = account.apiKey;
    
    if (!apiKey) {
      // Если ключ не передан в account, получаем лучший ключ из менеджера
      const bestKey = await this.keyManager.getBestKey(provider);
      if (bestKey) {
        apiKey = bestKey.apiKey;
        // Записываем использование для отслеживания квоты
        const startTime = Date.now();
        try {
          const result = await this.executeProviderCall(provider, apiKey, config);
          await this.keyManager.recordUsage(bestKey.id, {
            tokensIn: result.tokensUsed,
            success: true,
          });
          return result;
        } catch (error) {
          await this.keyManager.recordUsage(bestKey.id, {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      }
    }
    
    // Если ключ есть в account или не нашли в менеджере, используем SDK
    return this.executeProviderCall(provider, apiKey, config);
  }

  /**
   * Выполнить вызов провайдера с API ключом
   */
  private async executeProviderCall(
    provider: ProviderType,
    apiKey: string | undefined,
    config: GenerationConfig
  ): Promise<{ content: string; tokensUsed: number }> {
    // Если есть API ключ, используем прямой вызов провайдера
    if (apiKey) {
      switch (provider) {
        case 'cerebras':
          return this.callCerebras(apiKey, config);
        case 'groq':
          return this.callGroq(apiKey, config);
        case 'gemini':
          return this.callGemini(apiKey, config);
        case 'deepseek':
          return this.callDeepSeek(apiKey, config);
        case 'openrouter':
          return this.callOpenRouter(apiKey, config);
      }
    }
    
    // Fallback на AI Provider Manager или SDK
    switch (provider) {
      case 'cerebras':
      case 'groq':
      case 'gemini':
      case 'deepseek':
      case 'openrouter':
        // Используем AI Provider Manager
        const { aiGenerate } = await import('@/lib/ai-provider-manager');
        const result = await aiGenerate.generate(
          config.prompt,
          {
            temperature: config.temperature ?? 0.7,
            maxTokens: config.maxTokens ?? 2000,
            systemPrompt: config.style ? `Style: ${config.style}` : undefined,
          }
        );
        return {
          content: result.content,
          tokensUsed: result.tokensIn + result.tokensOut,
        };
        
      default:
        // Для других провайдеров используем SDK
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();
        
        const completion = await zai.chat.completions.create({
          messages: [
            ...(config.style ? [{ role: 'system' as const, content: `Style: ${config.style}` }] : []),
            { role: 'user' as const, content: config.prompt },
          ],
          temperature: config.temperature ?? 0.7,
        });
        
        return {
          content: completion.choices[0]?.message?.content || '',
          tokensUsed: (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0),
        };
    }
  }

  /**
   * Прямой вызов Cerebras API
   */
  private async callCerebras(apiKey: string, config: GenerationConfig): Promise<{ content: string; tokensUsed: number }> {
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages: [
          ...(config.style ? [{ role: 'system', content: `Style: ${config.style}` }] : []),
          { role: 'user', content: config.prompt },
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
    return {
      content: data.choices[0]?.message?.content || '',
      tokensUsed: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
    };
  }

  /**
   * Прямой вызов Groq API
   */
  private async callGroq(apiKey: string, config: GenerationConfig): Promise<{ content: string; tokensUsed: number }> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          ...(config.style ? [{ role: 'system', content: `Style: ${config.style}` }] : []),
          { role: 'user', content: config.prompt },
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
    return {
      content: data.choices[0]?.message?.content || '',
      tokensUsed: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
    };
  }

  /**
   * Прямой вызов Gemini API
   */
  private async callGemini(apiKey: string, config: GenerationConfig): Promise<{ content: string; tokensUsed: number }> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: config.prompt }] }],
          ...(config.style ? { systemInstruction: { parts: [{ text: `Style: ${config.style}` }] } } : {}),
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
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      tokensUsed: (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.candidatesTokenCount || 0),
    };
  }

  /**
   * Прямой вызов DeepSeek API
   */
  private async callDeepSeek(apiKey: string, config: GenerationConfig): Promise<{ content: string; tokensUsed: number }> {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          ...(config.style ? [{ role: 'system', content: `Style: ${config.style}` }] : []),
          { role: 'user', content: config.prompt },
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
    return {
      content: data.choices[0]?.message?.content || '',
      tokensUsed: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
    };
  }

  /**
   * Прямой вызов OpenRouter API
   */
  private async callOpenRouter(apiKey: string, config: GenerationConfig): Promise<{ content: string; tokensUsed: number }> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'МУКН Content Studio',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          ...(config.style ? [{ role: 'system', content: `Style: ${config.style}` }] : []),
          { role: 'user', content: config.prompt },
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
    return {
      content: data.choices[0]?.message?.content || '',
      tokensUsed: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
    };
  }
  
  private async saveGeneratedContent(data: {
    id: string;
    contentType: StudioContentType;
    prompt: string;
    content: string;
    provider: ProviderType;
    accountId?: string;
    campaignId?: string;
    influencerId?: string;
    templateId?: string;
    metadata?: Record<string, unknown>;
    generationTime: number;
    tokensUsed: number;
    cost: number;
  }): Promise<void> {
    await db.aIGeneratedContent.create({
      data: {
        id: data.id,
        contentType: data.contentType,
        prompt: data.prompt,
        generatedText: data.content,
        aiProvider: data.provider,
        aiModel: data.provider,
        usedInMethod: data.campaignId,
        influencerId: data.influencerId,
      },
    });
  }
  
  private async varyPrompt(prompt: string): Promise<string> {
    // Простая вариация промпта
    const variations = [
      prompt,
      `${prompt} (вариация ${Math.floor(Math.random() * 100)})`,
      `[Уникальный] ${prompt}`,
    ];
    
    return variations[Math.floor(Math.random() * variations.length)];
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let studioInstance: ContentStudioWithBypass | null = null;

export function getContentStudio(): ContentStudioWithBypass {
  if (!studioInstance) {
    studioInstance = new ContentStudioWithBypass();
  }
  return studioInstance;
}

export default ContentStudioWithBypass;

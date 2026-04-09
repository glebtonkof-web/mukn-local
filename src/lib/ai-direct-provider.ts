/**
 * Direct AI Provider Integration
 * Bypasses SDK and uses direct API calls to AI providers
 * Supports: DeepSeek, Gemini, Groq, Cerebras, OpenRouter
 */

import { db } from './db';

// Types
export interface AIProviderConfig {
  provider: string;
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;
  isActive: boolean;
  dailyQuota: number;
  dailyUsed: number;
  isFree: boolean;
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
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  responseTime: number;
}

// Provider configurations
const PROVIDER_CONFIGS: Record<string, {
  baseUrl: string;
  defaultModel: string;
  isFree: boolean;
  dailyQuota: number;
  models: string[];
}> = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    isFree: false,
    dailyQuota: Infinity,
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    isFree: true,
    dailyQuota: 500,
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    isFree: true,
    dailyQuota: 1000,
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  },
  cerebras: {
    baseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama-3.3-70b',
    isFree: true,
    dailyQuota: 14400,
    models: ['llama-3.3-70b', 'llama-3.1-70b', 'llama-3.1-8b'],
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat',
    isFree: false,
    dailyQuota: 50,
    models: ['deepseek/deepseek-chat', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o'],
  },
};

// Price per 1M tokens (input, output)
const PRICING: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  'deepseek/deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek/deepseek-r1': { input: 0.55, output: 2.19 },
  'anthropic/claude-3.5-sonnet': { input: 3, output: 15 },
  'openai/gpt-4o': { input: 2.5, output: 10 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
};

/**
 * Direct AI Provider Client
 */
export class DirectAIProvider {
  private providers: Map<string, AIProviderConfig> = new Map();
  private providerOrder: string[] = ['deepseek', 'gemini', 'groq', 'cerebras', 'openrouter'];

  /**
   * Initialize providers from database
   */
  async initialize(userId?: string): Promise<void> {
    this.providers.clear();

    if (userId) {
      try {
        const settings = await db.aIProviderSettings.findMany({
          where: { 
            userId,
            isActive: true,
            apiKey: { not: null },
          },
          orderBy: { priority: 'asc' },
        });

        for (const setting of settings) {
          if (setting.apiKey) {
            const config = PROVIDER_CONFIGS[setting.provider];
            if (config) {
              this.providers.set(setting.provider, {
                provider: setting.provider,
                apiKey: setting.apiKey,
                defaultModel: setting.defaultModel || config.defaultModel,
                baseUrl: config.baseUrl,
                isActive: setting.isActive,
                dailyQuota: setting.dailyQuota || config.dailyQuota,
                dailyUsed: setting.dailyUsed,
                isFree: setting.isFree ?? config.isFree,
              });
            }
          }
        }
      } catch (error) {
        console.error('[DirectAIProvider] Failed to load providers from DB:', error);
      }
    }

    // If no providers loaded, check environment variables
    if (this.providers.size === 0) {
      this.loadFromEnvironment();
    }
  }

  /**
   * Load providers from environment variables
   */
  private loadFromEnvironment(): void {
    const envProviders = [
      { name: 'deepseek', key: process.env.DEEPSEEK_API_KEY },
      { name: 'gemini', key: process.env.GEMINI_API_KEY },
      { name: 'groq', key: process.env.GROQ_API_KEY },
      { name: 'cerebras', key: process.env.CEREBRAS_API_KEY },
      { name: 'openrouter', key: process.env.OPENROUTER_API_KEY },
    ];

    for (const { name, key } of envProviders) {
      if (key) {
        const config = PROVIDER_CONFIGS[name];
        if (config) {
          this.providers.set(name, {
            provider: name,
            apiKey: key,
            defaultModel: config.defaultModel,
            baseUrl: config.baseUrl,
            isActive: true,
            dailyQuota: config.dailyQuota,
            dailyUsed: 0,
            isFree: config.isFree,
          });
        }
      }
    }
  }

  /**
   * Check if provider is available
   */
  private isProviderAvailable(provider: AIProviderConfig): boolean {
    if (!provider.isActive) return false;
    if (provider.isFree && provider.dailyUsed >= provider.dailyQuota) return false;
    return true;
  }

  /**
   * Get best available provider
   */
  private getBestProvider(): AIProviderConfig | null {
    for (const name of this.providerOrder) {
      const provider = this.providers.get(name);
      if (provider && this.isProviderAvailable(provider)) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Generate text using AI provider
   */
  async generate(prompt: string, options: GenerationOptions = {}): Promise<GenerationResult> {
    const startTime = Date.now();

    const provider = this.getBestProvider();
    if (!provider) {
      throw new Error('No AI providers available. Please configure API keys in settings.');
    }

    const model = options.model || provider.defaultModel;

    try {
      let result: GenerationResult;

      switch (provider.provider) {
        case 'gemini':
          result = await this.callGemini(provider, prompt, options, model, startTime);
          break;
        case 'groq':
          result = await this.callGroq(provider, prompt, options, model, startTime);
          break;
        case 'cerebras':
          result = await this.callCerebras(provider, prompt, options, model, startTime);
          break;
        case 'deepseek':
          result = await this.callDeepSeek(provider, prompt, options, model, startTime);
          break;
        case 'openrouter':
          result = await this.callOpenRouter(provider, prompt, options, model, startTime);
          break;
        default:
          throw new Error(`Unknown provider: ${provider.provider}`);
      }

      // Update daily usage
      provider.dailyUsed++;

      return result;
    } catch (error) {
      console.error(`[DirectAIProvider] ${provider.provider} failed:`, error);
      throw error;
    }
  }

  /**
   * Call Gemini API
   */
  private async callGemini(
    provider: AIProviderConfig,
    prompt: string,
    options: GenerationOptions,
    model: string,
    startTime: number
  ): Promise<GenerationResult> {
    const url = `${provider.baseUrl}/models/${model}:generateContent?key=${provider.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: options.systemPrompt
          ? { parts: [{ text: options.systemPrompt }] }
          : undefined,
        generationConfig: {
          temperature: options.temperature ?? 0.8,
          maxOutputTokens: options.maxTokens ?? 2000,
          topP: options.topP,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini error: ${response.status} - ${error}`);
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
    };
  }

  /**
   * Call Groq API
   */
  private async callGroq(
    provider: AIProviderConfig,
    prompt: string,
    options: GenerationOptions,
    model: string,
    startTime: number
  ): Promise<GenerationResult> {
    const messages = options.messages || [
      ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ];

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
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
      const error = await response.text();
      throw new Error(`Groq error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;

    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'groq',
      model,
      tokensIn,
      tokensOut,
      cost: 0, // Groq free tier
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * Call Cerebras API
   */
  private async callCerebras(
    provider: AIProviderConfig,
    prompt: string,
    options: GenerationOptions,
    model: string,
    startTime: number
  ): Promise<GenerationResult> {
    const messages = options.messages || [
      ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ];

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
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
      const error = await response.text();
      throw new Error(`Cerebras error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;

    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'cerebras',
      model,
      tokensIn,
      tokensOut,
      cost: 0, // Cerebras free tier
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * Call DeepSeek API
   */
  private async callDeepSeek(
    provider: AIProviderConfig,
    prompt: string,
    options: GenerationOptions,
    model: string,
    startTime: number
  ): Promise<GenerationResult> {
    const messages = options.messages || [
      ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ];

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
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
      const error = await response.text();
      throw new Error(`DeepSeek error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;

    const pricing = PRICING[model] || { input: 0, output: 0 };
    const cost = (tokensIn / 1_000_000) * pricing.input + (tokensOut / 1_000_000) * pricing.output;

    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'deepseek',
      model,
      tokensIn,
      tokensOut,
      cost,
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * Call OpenRouter API
   */
  private async callOpenRouter(
    provider: AIProviderConfig,
    prompt: string,
    options: GenerationOptions,
    model: string,
    startTime: number
  ): Promise<GenerationResult> {
    const messages = options.messages || [
      ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ];

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
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
      const error = await response.text();
      throw new Error(`OpenRouter error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;

    const pricing = PRICING[model] || { input: 0, output: 0 };
    const cost = (tokensIn / 1_000_000) * pricing.input + (tokensOut / 1_000_000) * pricing.output;

    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'openrouter',
      model,
      tokensIn,
      tokensOut,
      cost,
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): Array<{
    provider: string;
    isActive: boolean;
    isFree: boolean;
    dailyQuota: number;
    dailyUsed: number;
    remaining: number;
  }> {
    const result: Array<{
      provider: string;
      isActive: boolean;
      isFree: boolean;
      dailyQuota: number;
      dailyUsed: number;
      remaining: number;
    }> = [];

    for (const [name, config] of this.providers) {
      result.push({
        provider: name,
        isActive: config.isActive,
        isFree: config.isFree,
        dailyQuota: config.dailyQuota,
        dailyUsed: config.dailyUsed,
        remaining: Math.max(0, config.dailyQuota - config.dailyUsed),
      });
    }

    return result;
  }

  /**
   * Check if any provider is configured
   */
  hasProviders(): boolean {
    return this.providers.size > 0;
  }

  /**
   * Get list of available provider names
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Add provider manually
   */
  addProvider(name: string, config: AIProviderConfig): void {
    this.providers.set(name, config);
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): AIProviderConfig | undefined {
    return this.providers.get(name);
  }
}

// Singleton instance
let directProviderInstance: DirectAIProvider | null = null;

export function getDirectAIProvider(): DirectAIProvider {
  if (!directProviderInstance) {
    directProviderInstance = new DirectAIProvider();
  }
  return directProviderInstance;
}

/**
 * Quick generation function
 */
export async function generateWithAI(
  prompt: string,
  options: GenerationOptions = {},
  userId?: string
): Promise<GenerationResult> {
  const provider = getDirectAIProvider();
  await provider.initialize(userId);
  return provider.generate(prompt, options);
}

export default DirectAIProvider;

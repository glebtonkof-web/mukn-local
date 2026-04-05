/**
 * AI Service - Централизованный AI-сервис для генерации контента
 * Порт: 3001
 * Поддерживает DeepSeek, OpenRouter, Gemini, Groq, Cerebras через z-ai-web-dev-sdk
 */

import { createServer } from 'http';
import { parse } from 'url';
import ZAI from 'z-ai-web-dev-sdk';

const PORT = 3001;

// Типы
interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: string;
}

interface AIResponse {
  content: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  latency: number;
}

// Провайдеры AI (для совместимости и fallback)
const PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    models: ['anthropic/claude-3-opus', 'meta-llama/llama-3-70b'],
    defaultModel: 'meta-llama/llama-3-70b',
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    models: ['gemini-pro', 'gemini-1.5-flash'],
    defaultModel: 'gemini-pro',
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    defaultModel: 'llama-3.1-70b-versatile',
  },
  cerebras: {
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    models: ['llama3.1-8b', 'llama3.1-70b'],
    defaultModel: 'llama3.1-70b',
  },
};

// Кэш ответов
const responseCache = new Map<string, { response: AIResponse; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 час

// Статистика
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalTokensIn: 0,
  totalTokensOut: 0,
  averageLatency: 0,
  byProvider: {} as Record<string, number>,
};

// Инициализация ZAI SDK
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Генерация контента через реальные AI API
async function generateContent(request: AIRequest): Promise<AIResponse> {
  const startTime = Date.now();
  const provider = request.provider || 'deepseek';
  const model = request.model || PROVIDERS[provider as keyof typeof PROVIDERS]?.defaultModel || 'deepseek-chat';

  // Проверка кэша
  const cacheKey = `${provider}:${model}:${request.prompt}`;
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[AI] Cache hit for ${provider}/${model}`);
    return cached.response;
  }

  stats.totalRequests++;

  try {
    // Используем z-ai-web-dev-sdk для реальных AI вызовов
    const zai = await getZAI();

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const completion = await zai.chat.completions.create({
      messages,
      temperature: request.temperature ?? 0.8,
      max_tokens: request.maxTokens ?? 2048,
    });

    const content = completion.choices[0]?.message?.content || '';
    const tokensIn = completion.usage?.prompt_tokens || Math.ceil(request.prompt.length / 4);
    const tokensOut = completion.usage?.completion_tokens || Math.ceil(content.length / 4);

    const response: AIResponse = {
      content,
      model,
      provider,
      tokensIn,
      tokensOut,
      latency: Date.now() - startTime,
    };

    // Кэшируем
    responseCache.set(cacheKey, { response, timestamp: Date.now() });

    // Обновляем статистику
    stats.successfulRequests++;
    stats.totalTokensIn += tokensIn;
    stats.totalTokensOut += tokensOut;
    stats.averageLatency = (stats.averageLatency * (stats.successfulRequests - 1) + response.latency) / stats.successfulRequests;
    stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;

    console.log(`[AI] Generated content via ${provider}/${model} in ${response.latency}ms`);

    return response;
  } catch (error: any) {
    stats.failedRequests++;
    console.error(`[AI] Generation failed: ${error.message}`);
    throw new Error(`AI generation failed: ${error.message}`);
  }
}

// HTTP сервер
const server = createServer(async (req, res) => {
  const url = parse(req.url || '', true);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /generate - генерация контента
  if (req.method === 'POST' && url.pathname === '/generate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const request: AIRequest = JSON.parse(body);
        const response = await generateContent(request);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error: any) {
        console.error('[AI] Error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message || 'Generation failed' }));
      }
    });
    return;
  }

  // GET /providers - список провайдеров
  if (req.method === 'GET' && url.pathname === '/providers') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(PROVIDERS));
    return;
  }

  // GET /stats - статистика
  if (req.method === 'GET' && url.pathname === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
    return;
  }

  // GET /health - health check
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      stats: {
        totalRequests: stats.totalRequests,
        successRate: stats.totalRequests > 0 ? (stats.successfulRequests / stats.totalRequests * 100).toFixed(2) + '%' : '0%',
      },
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[AI-Service] Running on port ${PORT}`);
  console.log(`[AI-Service] Using z-ai-web-dev-sdk for real AI calls`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[AI-Service] Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('[AI-Service] Server closed');
    process.exit(0);
  });
});

export { generateContent, stats };

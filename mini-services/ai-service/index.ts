/**
 * AI Service - Централизованный AI-сервис для генерации контента
 * Порт: 3001
 * Поддерживает DeepSeek, OpenRouter, Gemini, Groq, Cerebras
 */

import { createServer } from 'http';
import { parse } from 'url';

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

// Провайдеры AI
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

// Генерация контента
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
    // В реальной реализации - вызов API провайдера
    // const response = await fetch(PROVIDERS[provider].baseUrl, {...})

    // Симуляция ответа
    const latency = 500 + Math.random() * 1500;
    await new Promise(resolve => setTimeout(resolve, Math.min(latency, 100)));

    const tokensIn = Math.ceil(request.prompt.length / 4);
    const tokensOut = 100 + Math.floor(Math.random() * 400);

    const response: AIResponse = {
      content: generateSimulatedContent(request.prompt, request.systemPrompt),
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
  } catch (error) {
    stats.failedRequests++;
    throw error;
  }
}

// Симуляция генерации контента
function generateSimulatedContent(prompt: string, systemPrompt?: string): string {
  const templates = [
    '🔥 Отличная возможность! Сегодня удача на моей стороне. Кто со мной?',
    '💰 Жизнь — это игра, и я играю по своим правилам. Главное — знать момент для выхода.',
    '📈 Рынок показывает интересные тренды. Время действовать!',
    '💎 Успех приходит к тем, кто принимает решения. Момент настал.',
    '🚀 Новые горизонты открываются каждый день. Не упускай свой шанс!',
    '⚡ Энергия, решимость, результат. Начни свой путь сегодня!',
  ];

  // Персонализация на основе промпта
  if (prompt.toLowerCase().includes('коммент')) {
    const comments = [
      'Отличный пост! 🔥',
      'Согласен на 100%!',
      'Спасибо за полезную информацию!',
      'Очень вдохновляет! 👏',
      'Интересная мысль...',
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }

  if (prompt.toLowerCase().includes('пост') || prompt.toLowerCase().includes('текст')) {
    return templates[Math.floor(Math.random() * templates.length)];
  }

  return templates[Math.floor(Math.random() * templates.length)];
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
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Generation failed' }));
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

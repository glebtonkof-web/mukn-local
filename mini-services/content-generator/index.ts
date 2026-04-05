/**
 * Content Generator Service - Генерация контента для инфлюенсеров
 * Порт: 3002
 * Использует z-ai-web-dev-sdk для реальной AI генерации
 */

import { createServer } from 'http';
import { parse } from 'url';
import ZAI from 'z-ai-web-dev-sdk';

const PORT = 3002;

// Типы контента
type ContentType = 'post' | 'comment' | 'story' | 'dm' | 'bio';
type NicheType = 'gambling' | 'crypto' | 'nutra' | 'bait' | 'lifestyle';

interface ContentRequest {
  type: ContentType;
  niche: NicheType;
  style?: string;
  tone?: string;
  language?: string;
  context?: string;
  influencerId?: string;
  count?: number;
}

interface GeneratedContent {
  id: string;
  type: ContentType;
  content: string;
  niche: NicheType;
  style: string;
  tone: string;
  language: string;
  hashtags?: string[];
  emojis?: string[];
  createdAt: Date;
}

// Описания ниш для AI промптов
const NICHE_DESCRIPTIONS: Record<NicheType, string> = {
  gambling: 'азартные игры, казино, ставки, выигрыши',
  crypto: 'криптовалюты, трейдинг, инвестиции, блокчейн',
  nutra: 'здоровье, фитнес, питание, трансформация тела',
  bait: 'лайфстайл, красота, стиль, настроение',
  lifestyle: 'мотивация, успех, саморазвитие, путешествия',
};

// Описания типов контента
const TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  post: 'пост для соцсетей (Instagram, Telegram, VK)',
  comment: 'комментарий для взаимодействия с аудиторией',
  story: 'короткий текст для сторис (до 100 символов)',
  dm: 'сообщение для личных диалогов',
  bio: 'текст для био профиля',
};

// Стандартные хештеги по нишам (добавляются к AI-контенту)
const NICHE_HASHTAGS: Record<NicheType, string[]> = {
  gambling: ['#казино', '#выигрыш', '#удача', '#игры', '#онлайнказино'],
  crypto: ['#криптовалюта', '#биткоин', '#инвестиции', '#трейдинг', '#crypto'],
  nutra: ['#здоровье', '#фитнес', '#пп', '#трансформация', '#здоровыйобразжизни'],
  bait: ['#красота', '#стиль', '#настроение', '#life', '#vibes'],
  lifestyle: ['#жизнь', '#мотивация', '#успех', '#inspiration', '#lifestyle'],
};

// Инициализация ZAI SDK
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Извлечение эмодзи
function extractEmojis(text: string): string[] {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const matches = text.match(emojiRegex);
  return matches || [];
}

// Построение промпта для AI
function buildPrompt(request: ContentRequest): string {
  const nicheDesc = NICHE_DESCRIPTIONS[request.niche];
  const typeDesc = TYPE_DESCRIPTIONS[request.type];
  const style = request.style || 'casual';
  const tone = request.tone || 'friendly';
  const language = request.language || 'ru';

  let prompt = `Создай ${typeDesc} для ниши "${nicheDesc}".
Стиль: ${style}
Тон: ${tone}
Язык: ${language}`;

  if (request.context) {
    prompt += `\n\nКонтекст: ${request.context}`;
  }

  prompt += `\n\nТребования:
- Текст должен быть естественным и живым
- Используй эмодзи уместно
- Не используй штампы и клише
- Текст должен вовлекать аудиторию`;

  if (request.type === 'post') {
    prompt += `\n- Длина: 100-300 символов`;
  } else if (request.type === 'comment') {
    prompt += `\n- Длина: 20-80 символов`;
  } else if (request.type === 'story') {
    prompt += `\n- Длина: до 100 символов`;
  } else if (request.type === 'dm') {
    prompt += `\n- Длина: 50-150 символов`;
    prompt += `\n- Должен начинаться с приветствия`;
  } else if (request.type === 'bio') {
    prompt += `\n- Длина: до 150 символов`;
    prompt += `\n- Должен быть кратким и запоминающимся`;
  }

  prompt += `\n\nВерни только готовый текст без объяснений.`;

  return prompt;
}

// Генерация контента через AI
async function generateContent(request: ContentRequest): Promise<GeneratedContent[]> {
  const results: GeneratedContent[] = [];
  const count = request.count || 1;

  try {
    const zai = await getZAI();

    for (let i = 0; i < count; i++) {
      const prompt = buildPrompt(request);

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Ты опытный копирайтер для соцсетей. Создаёшь вовлекающий контент на русском языке. Всегда возвращай только готовый текст без markdown разметки и объяснений.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9, // Высокая креативность
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content?.trim() || '';

      // Извлекаем эмодзи из сгенерированного текста
      const emojis = extractEmojis(content);

      results.push({
        id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: request.type,
        content,
        niche: request.niche,
        style: request.style || 'casual',
        tone: request.tone || 'friendly',
        language: request.language || 'ru',
        hashtags: NICHE_HASHTAGS[request.niche]?.slice(0, 3) || NICHE_HASHTAGS.lifestyle.slice(0, 3),
        emojis,
        createdAt: new Date(),
      });

      // Небольшая задержка между запросами для вариативности
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[ContentGenerator] Generated ${results.length} items for niche=${request.niche}, type=${request.type}`);

  } catch (error: any) {
    console.error(`[ContentGenerator] Generation failed: ${error.message}`);
    throw new Error(`Content generation failed: ${error.message}`);
  }

  return results;
}

// Статистика
const stats = {
  totalGenerated: 0,
  byType: {} as Record<ContentType, number>,
  byNiche: {} as Record<NicheType, number>,
};

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
        const request: ContentRequest = JSON.parse(body);
        const contents = await generateContent(request);

        stats.totalGenerated += contents.length;
        stats.byType[request.type] = (stats.byType[request.type] || 0) + contents.length;
        stats.byNiche[request.niche] = (stats.byNiche[request.niche] || 0) + contents.length;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ contents, count: contents.length }));
      } catch (error: any) {
        console.error('[ContentGenerator] Error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message || 'Generation failed' }));
      }
    });
    return;
  }

  // GET /niches - получить ниши
  if (req.method === 'GET' && url.pathname === '/niches') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(NICHE_DESCRIPTIONS));
    return;
  }

  // GET /types - получить типы контента
  if (req.method === 'GET' && url.pathname === '/types') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(TYPE_DESCRIPTIONS));
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
      totalGenerated: stats.totalGenerated,
      usingRealAI: true,
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[ContentGenerator] Running on port ${PORT}`);
  console.log(`[ContentGenerator] Using z-ai-web-dev-sdk for real AI generation`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[ContentGenerator] Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('[ContentGenerator] Server closed');
    process.exit(0);
  });
});

export { generateContent, NICHE_DESCRIPTIONS, TYPE_DESCRIPTIONS };

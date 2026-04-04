/**
 * Content Generator Service - Генерация контента для инфлюенсеров
 * Порт: 3002
 */

import { createServer } from 'http';
import { parse } from 'url';

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

// Шаблоны контента по нишам
const CONTENT_TEMPLATES: Record<NicheType, Record<ContentType, string[]>> = {
  gambling: {
    post: [
      '🎰 Сегодня удача на моей стороне! Очередной выигрыш заставляет сердце биться быстрее. Кто со мной?',
      '💰 Жизнь — это игра, и я играю по своим правилам. Главное — знать момент для выхода.',
      '🔥 Еще одна ночь, еще одна победа. Это не просто удача, это интуиция.',
      '💎 Когда шансы на твоей стороне, остается только нажать кнопку.',
      '⭐ Звезды сошлись! Сегодня мой день.',
    ],
    comment: [
      'Отличный пост! 🔥',
      'Согласен! Сам вчера выиграл!',
      'Какой автомат?',
      'Удачи всем! 🍀',
      'Проверено — работает!',
    ],
    story: [
      '🎰 Live! Смотрим игру вместе',
      '💰 Результат дня',
      '🔥 Горячая серия',
      '⚡ Quick tip для новичков',
    ],
    dm: [
      'Привет! Заинтересовал твой комментарий. Расскажешь подробнее?',
      'Привет! Вижу, ты тоже в теме. Может обменяемся опытом?',
    ],
    bio: [
      '🎰 Живу в ритме удачи',
      '💰 Играю умно, выигрываю часто',
      '🔥 Тот самый, кому везёт',
    ],
  },
  crypto: {
    post: [
      '📈 Рынок снова показывает интересные движения. Кто следит за трендами?',
      '💎 HODL — это не просто стратегия, это философия. Держим позиции!',
      '🚀 Блокчейн меняет мир, и я рад быть частью этого процесса.',
      '⚡ Быки или медведи? Время покажет, а я уже подготовился.',
      '🌐 Децентрализация — будущее финансов.',
    ],
    comment: [
      'Верное наблюдение! 📊',
      'Технический анализ подтверждает',
      'Long-term перспективы отличные',
      'Ключевые уровни пробиты',
    ],
    story: [
      '📊 Анализ рынка сегодня',
      '📈 Токен дня',
      '💡 Инсайт для подписчиков',
    ],
    dm: [
      'Привет! Вижу, ты разбираешься в рынке. Есть вопрос.',
      'Привет! Интересный портфель. Обсудим?',
    ],
    bio: [
      '📈 Crypto enthusiast | Not financial advice',
      '🌐 Web3 believer | HODLer since 2019',
    ],
  },
  nutra: {
    post: [
      '💪 Трансформация продолжается! Результаты превышают ожидания.',
      '🥗 Здоровое питание — это не диета, это образ жизни.',
      '✨ Энергия, уверенность, результат. Начни свой путь к лучшей версии себя.',
      '🌟 30 дней дисциплины изменили всё. Делюсь секретами.',
    ],
    comment: [
      'Отличный результат! 💪',
      'Какой курс используешь?',
      'Вдохновляет!',
      'Подписываюсь под каждым словом',
    ],
    story: [
      '💪 Прогресс дня',
      '🥗 Меню на сегодня',
      '💡 Полезный совет',
    ],
    dm: [
      'Привет! Заинтересовал твой результат. Подскажешь с чего начать?',
    ],
    bio: [
      '💪 Здоровый образ жизни | Трансформация',
      '🥗 Nutrition coach | Wellness advocate',
    ],
  },
  bait: {
    post: [
      '🔥 Иногда достаточно одного взгляда... Угадайте, о чем я думаю?',
      '💋 Загадочная улыбка может рассказать больше, чем тысячи слов.',
      '💕 Настроение — бунтарское. Кто готов к приключениям?',
      '✨ Сегодня особенный вечер. Чувствую это.',
    ],
    comment: [
      '🔥🔥🔥',
      'Потрясающе!',
      'Wow! ✨',
      'Невозможно отвести взгляд',
    ],
    story: [
      '✨ Mood of the day',
      '🔥 Behind the scenes',
      '💕 Special moment',
    ],
    dm: [
      'Привет 😉 Интересный профиль...',
    ],
    bio: [
      '✨ Living my best life',
      '💕 Spreading good vibes',
    ],
  },
  lifestyle: {
    post: [
      '🌟 Новый день — новые возможности. Не упускай свой шанс!',
      '🎯 Успех — это не конечная точка, а путь.',
      '💫 Мечты сбываются у тех, кто действует.',
      '🌈 Красота в простых вещах. Научись замечать.',
    ],
    comment: [
      'Вдохновляет! ⭐',
      'Согласен на 100%',
      'Очень позитивный пост',
      'Спасибо за настроение!',
    ],
    story: [
      '🌟 Утренняя рутина',
      '💡 Мысли дня',
      '📍 Место дня',
    ],
    dm: [
      'Привет! Интересный профиль. Давай общаться!',
    ],
    bio: [
      '🌟 Creating my own path',
      '💫 Dreamer | Doer | Believer',
    ],
  },
};

// Генерация контента
function generateContent(request: ContentRequest): GeneratedContent[] {
  const results: GeneratedContent[] = [];
  const count = request.count || 1;

  const templates = CONTENT_TEMPLATES[request.niche]?.[request.type] || CONTENT_TEMPLATES.lifestyle.post;

  for (let i = 0; i < count; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Персонализация
    let content = template;
    if (request.context) {
      content = `${template}\n\n${request.context}`;
    }

    // Добавляем эмодзи если нужно
    const emojis = extractEmojis(template);

    results.push({
      id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: request.type,
      content,
      niche: request.niche,
      style: request.style || 'casual',
      tone: request.tone || 'friendly',
      language: request.language || 'ru',
      hashtags: generateHashtags(request.niche),
      emojis,
      createdAt: new Date(),
    });
  }

  return results;
}

// Извлечение эмодзи
function extractEmojis(text: string): string[] {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const matches = text.match(emojiRegex);
  return matches || [];
}

// Генерация хештегов
function generateHashtags(niche: NicheType): string[] {
  const hashtags: Record<NicheType, string[]> = {
    gambling: ['#казино', '#выигрыш', '#удача', '#игры', '#онлайнказино'],
    crypto: ['#криптовалюта', '#биткоин', '#инвестиции', '#трейдинг', '#crypto'],
    nutra: ['#здоровье', '#фитнес', '#пп', '#трансформация', '#здоровыйобразжизни'],
    bait: ['#красота', '#стиль', '#настроение', '#life', '#vibes'],
    lifestyle: ['#жизнь', '#мотивация', '#успех', '#inspiration', '#lifestyle'],
  };

  return hashtags[niche]?.slice(0, 3) || hashtags.lifestyle.slice(0, 3);
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
    req.on('end', () => {
      try {
        const request: ContentRequest = JSON.parse(body);
        const contents = generateContent(request);

        stats.totalGenerated += contents.length;
        stats.byType[request.type] = (stats.byType[request.type] || 0) + contents.length;
        stats.byNiche[request.niche] = (stats.byNiche[request.niche] || 0) + contents.length;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ contents, count: contents.length }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Generation failed' }));
      }
    });
    return;
  }

  // GET /templates - получить шаблоны
  if (req.method === 'GET' && url.pathname === '/templates') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(CONTENT_TEMPLATES));
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
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[ContentGenerator] Running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[ContentGenerator] Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('[ContentGenerator] Server closed');
    process.exit(0);
  });
});

export { generateContent, CONTENT_TEMPLATES };

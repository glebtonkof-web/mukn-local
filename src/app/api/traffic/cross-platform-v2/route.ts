import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';

// ==================== 17 CROSS-PLATFORM METHODS CONFIGURATION ====================

export const CROSS_PLATFORM_V2_METHODS = [
  // === Базовые методы (24-30): Перелив в Telegram ===
  {
    id: 24,
    name: 'tiktok_to_telegram',
    title: 'Перелив из TikTok в Telegram',
    description: 'Конвертация TikTok аудитории в подписчиков Telegram канала',
    category: 'basic',
    sourcePlatform: 'tiktok',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 25,
    name: 'instagram_to_telegram',
    title: 'Перелив из Instagram в Telegram',
    description: 'Миграция подписчиков из Instagram в Telegram канал',
    category: 'basic',
    sourcePlatform: 'instagram',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 26,
    name: 'youtube_to_telegram',
    title: 'YouTube → Telegram',
    description: 'Перелив аудитории с YouTube канала в Telegram',
    category: 'basic',
    sourcePlatform: 'youtube',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 27,
    name: 'twitter_to_telegram',
    title: 'Twitter (X) → Telegram',
    description: 'Конвертация Twitter аудитории в Telegram подписчиков',
    category: 'basic',
    sourcePlatform: 'twitter',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 28,
    name: 'pinterest_to_telegram',
    title: 'Pinterest → Telegram',
    description: 'Перелив трафика с Pinterest в Telegram канал',
    category: 'basic',
    sourcePlatform: 'pinterest',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 29,
    name: 'reddit_to_telegram',
    title: 'Reddit → Telegram',
    description: 'Миграция аудитории из Reddit в Telegram',
    category: 'basic',
    sourcePlatform: 'reddit',
    targetPlatform: 'telegram',
    risk: 'medium',
  },
  {
    id: 30,
    name: 'linkedin_to_telegram',
    title: 'LinkedIn → Telegram',
    description: 'Перелив профессиональной аудитории LinkedIn в Telegram',
    category: 'basic',
    sourcePlatform: 'linkedin',
    targetPlatform: 'telegram',
    risk: 'low',
  },

  // === Продвинутые методы (64-73) ===
  {
    id: 64,
    name: 'bluesky',
    title: 'Bluesky интеграция',
    description: 'Bluesky — новая соцсеть от создателей Twitter. Ранний вход в платформу.',
    category: 'advanced',
    sourcePlatform: 'bluesky',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 65,
    name: 'threads',
    title: 'Threads интеграция',
    description: 'Threads от Meta — текстовая платформа для коротких постов.',
    category: 'advanced',
    sourcePlatform: 'threads',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 66,
    name: 'reddit',
    title: 'Reddit комментинг',
    description: 'Продвинутый комментинг на Reddit с кармой и сабреддитами.',
    category: 'advanced',
    sourcePlatform: 'reddit',
    targetPlatform: 'telegram',
    risk: 'medium',
  },
  {
    id: 67,
    name: 'facebook',
    title: 'Facebook трафик',
    description: 'Группы, страницы и комментарии Facebook для трафика.',
    category: 'advanced',
    sourcePlatform: 'facebook',
    targetPlatform: 'telegram',
    risk: 'medium',
  },
  {
    id: 68,
    name: 'vk',
    title: 'VK интеграция',
    description: 'ВКонтакте — клипы, группы, комментарии для ру-аудитории.',
    category: 'advanced',
    sourcePlatform: 'vk',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 69,
    name: 'discord',
    title: 'Discord трафик',
    description: 'Серверы Discord и каналы для привлечения аудитории.',
    category: 'advanced',
    sourcePlatform: 'discord',
    targetPlatform: 'telegram',
    risk: 'medium',
  },
  {
    id: 70,
    name: 'twitch',
    title: 'Twitch комментинг',
    description: 'Чаты стримеров и комментинг для игровой аудитории.',
    category: 'advanced',
    sourcePlatform: 'twitch',
    targetPlatform: 'telegram',
    risk: 'medium',
  },
  {
    id: 71,
    name: 'whatsapp',
    title: 'WhatsApp рассылки',
    description: 'WhatsApp группы и рассылки для прямого трафика.',
    category: 'advanced',
    sourcePlatform: 'whatsapp',
    targetPlatform: 'telegram',
    risk: 'medium',
  },
  {
    id: 72,
    name: 'quora',
    title: 'Quora ответы',
    description: 'Quora — ответы на вопросы с высоким SEO-потенциалом.',
    category: 'advanced',
    sourcePlatform: 'quora',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 73,
    name: 'medium',
    title: 'Medium статьи',
    description: 'Medium — длинные статьи с ссылками и публикациями.',
    category: 'advanced',
    sourcePlatform: 'medium',
    targetPlatform: 'telegram',
    risk: 'low',
  },

  // === Топ методы (116-125) ===
  {
    id: 116,
    name: 'youtube_shorts',
    title: 'YouTube Shorts комментарии',
    description: 'Комментинг под YouTube Shorts — быстрый рост охватов.',
    category: 'top',
    sourcePlatform: 'youtube_shorts',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 117,
    name: 'facebook_reels',
    title: 'Facebook Reels',
    description: 'Facebook Reels — алгоритмическое продвижение коротких видео.',
    category: 'top',
    sourcePlatform: 'facebook_reels',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 118,
    name: 'whatsapp_group',
    title: 'WhatsApp группы',
    description: 'Создание и продвижение WhatsApp групп для трафика.',
    category: 'top',
    sourcePlatform: 'whatsapp',
    targetPlatform: 'telegram',
    risk: 'medium',
  },
  {
    id: 119,
    name: 'discord_server',
    title: 'Discord сервера',
    description: 'Создание Discord серверов с автонаполнением и трафиком.',
    category: 'top',
    sourcePlatform: 'discord',
    targetPlatform: 'telegram',
    risk: 'medium',
  },
  {
    id: 120,
    name: 'twitch_chat',
    title: 'Twitch чат',
    description: 'Активность в чатах Twitch стримеров для аффинити.',
    category: 'top',
    sourcePlatform: 'twitch',
    targetPlatform: 'telegram',
    risk: 'medium',
  },
  {
    id: 121,
    name: 'vk_clips',
    title: 'VK клипы',
    description: 'VK клипы — короткие видео для ру-аудитории.',
    category: 'top',
    sourcePlatform: 'vk_clips',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 122,
    name: 'quora_space',
    title: 'Quora пространства',
    description: 'Quora Spaces — контентные пространства с подписчиками.',
    category: 'top',
    sourcePlatform: 'quora',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 123,
    name: 'medium_publication',
    title: 'Medium публикации',
    description: 'Medium Publications — коллективные блоги с большой аудиторией.',
    category: 'top',
    sourcePlatform: 'medium',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 124,
    name: 'twitter_thread',
    title: 'Twitter треды',
    description: 'Twitter/X треды — вирусный формат для экспертного контента.',
    category: 'top',
    sourcePlatform: 'twitter',
    targetPlatform: 'telegram',
    risk: 'low',
  },
  {
    id: 125,
    name: 'pinterest_pin',
    title: 'Pinterest пины',
    description: 'Pinterest Pin-стратегии для визуальных ниш.',
    category: 'top',
    sourcePlatform: 'pinterest',
    targetPlatform: 'telegram',
    risk: 'low',
  },
] as const;

type CrossPlatformV2MethodId = typeof CROSS_PLATFORM_V2_METHODS[number]['id'];

// ==================== DEEPSEEK PROMPTS ====================

export const DEEPSEEK_PROMPTS: Record<string, string> = {
  // Базовые методы (24-30)
  tiktok_to_telegram: `Создай стратегию перелива трафика из TikTok в Telegram.
Ниша: {niche}. Гео: {geo}.
Сгенерируй:
1. Bio CTA — короткий текст для профиля (до 80 символов)
2. Комментарий-приманку — цепляющий комментарий под видео
3. Приветственное сообщение — для Telegram бота/канала
4. Видеотема — тема для TikTok видео

Формат ответа: JSON с полями bioCta, hookComment, welcomeMessage, videoTopic`,

  instagram_to_telegram: `Создай стратегию перелива трафика из Instagram в Telegram.
Ниша: {niche}. Гео: {geo}. Стиль: {style}.
Сгенерируй:
1. Bio текст с CTA
2. Story с интерактивом (опрос/вопрос)
3. Подпись для поста с призывом
4. DM шаблон для ответов

Формат ответа: JSON с полями bioText, storyIdea, postCaption, dmTemplate`,

  youtube_to_telegram: `Создай стратегию перелива трафика с YouTube в Telegram.
Ниша: {niche}. Гео: {geo}.
Сгенерируй:
1. Описание канала с CTA
2. Шаблон описания видео
3. Закреплённый комментарий
4. Идею для Community поста

Формат ответа: JSON с полями channelDescription, videoDescription, pinnedComment, communityPost`,

  twitter_to_telegram: `Создай стратегию перелива трафика из Twitter/X в Telegram.
Ниша: {niche}. Гео: {geo}.
Сгенерируй:
1. Bio текст
2. Идею для треда (5 твитов)
3. CTA для закреплённого твита
4. Ответ-приманку

Формат ответа: JSON с полями bioText, threadIdea, pinnedTweet, replyHook`,

  pinterest_to_telegram: `Создай стратегию перелива трафика с Pinterest в Telegram.
Ниша: {niche}. Гео: {geo}.
Сгенерируй:
1. Название доски
2. Описание пина
3. Текст на изображении
4. Bio профиля

Формат ответа: JSON с полями boardName, pinDescription, imageText, profileBio`,

  reddit_to_telegram: `Создай "мягкий" пост для Reddit без явной рекламы.
Ниша: {niche}. Сабреддит: {subreddit}.
Сгенерируй:
1. Заголовок поста
2. Текст поста (полезный контент)
3. Комментарий с мягким CTA
4. Bio профиля

Важно: пост должен быть полезным, не выглядеть как реклама.
Формат ответа: JSON с полями postTitle, postContent, softCta, profileBio`,

  linkedin_to_telegram: `Создай стратегию перелива трафика из LinkedIn в Telegram (B2B).
Ниша: {niche}. Гео: {geo}.
Сгенерируй:
1. Заголовок профиля
2. Шаблон поста
3. CTA для статьи
4. Шаблон InMail сообщения

Тон: профессиональный.
Формат ответа: JSON с полями headline, postTemplate, articleCta, inmailTemplate`,

  // Продвинутые методы (64-73)
  bluesky: `Создай контент для Bluesky — новой соцсети от Twitter.
Ниша: {niche}. Стиль: {style}.
Сгенерируй:
1. Bio профиля
2. Skeet (пост) — короткий и цепляющий
3. Идею для треда
4. Скрытый CTA к Telegram

Текст должен быть коротким и цепляющим.
Формат ответа: JSON с полями bio, skeet, threadIdea, hiddenCta`,

  threads: `Создай пост для Threads (Meta).
Ниша: {niche}. Стиль: разговорный.
Сгенерируй:
1. Bio с намёком
2. Пост-историю
3. Интерактивный вопрос
4. Скрытый CTA к Telegram

Включи скрытый CTA к Telegram.
Формат ответа: JSON с полями bio, storyPost, interactiveQuestion, hiddenCta`,

  reddit: `Создай продвинутый контент для Reddit с учётом кармы.
Ниша: {niche}. Целевой сабреддит: {subreddit}.
Сгенерируй:
1. Заголовок для вирусного поста
2. Полезный контент (лайфхак/гайд)
3. Комментарий-дополнение
4. Ответ на критику

Пост не должен выглядеть как реклама.
Формат ответа: JSON с полями viralTitle, usefulContent, supplementaryComment, criticalResponse`,

  facebook: `Создай контент для Facebook трафика.
Ниша: {niche}. Гео: {geo}.
Сгенерируй:
1. Описание группы
2. Шаблон поста
3. Комментарий-приманку
4. Идею для Reels

Формат ответа: JSON с полями groupDescription, postTemplate, hookComment, reelsIdea`,

  vk: `Создай контент для ВКонтакте (ру-аудитория).
Ниша: {niche}.
Сгенерируй:
1. Название группы
2. Описание группы
3. Шаблон поста
4. Идею для клипа

Тон: дружелюбный, русский язык.
Формат ответа: JSON с полями groupName, groupDescription, postTemplate, clipIdea`,

  discord: `Создай стратегию для Discord сервера.
Ниша: {niche}. Тематика: {theme}.
Сгенерируй:
1. Название сервера
2. Описание сервера
3. Приветственное сообщение
4. Каналы структуру

Формат ответа: JSON с полями serverName, serverDescription, welcomeMessage, channels`,

  twitch: `Создай контент для Twitch чата.
Ниша: {niche}. Игра/тематика: {theme}.
Сгенерируй:
1. Bio канала
2. Сообщения для чата (5 вариантов)
3. Идею для RAID
4. CTA в чат

Тон: дружелюбный, геймерский.
Формат ответа: JSON с полями channelBio, chatMessages, raidIdea, chatCta`,

  whatsapp: `Создай контент для WhatsApp рассылки.
Ниша: {niche}. Гео: {geo}.
Сгенерируй:
1. Название группы
2. Описание группы
3. Приветственное сообщение
4. Шаблон рассылки

Тон: личный, не спамовый.
Формат ответа: JSON с полями groupName, groupDescription, welcomeMessage, broadcastTemplate`,

  quora: `Создай ответ для Quora с высоким SEO-потенциалом.
Тема: {topic}. Вопрос: {question}.
Сгенерируй:
1. Развёрнутый ответ (200+ слов)
2. Ключевые слова для SEO
3. Мягкий CTA
4. Bio профиля

Ответ должен быть экспертным и полезным.
Формат ответа: JSON с полями detailedAnswer, seoKeywords, softCta, profileBio`,

  medium: `Создай структуру статьи для Medium.
Тема: {topic}. Ниша: {niche}.
Сгенерируй:
1. Заголовок (clickbait, но честный)
2. Подзаголовки (5-7 пунктов)
3. Вступление (hook)
4. Заключение с CTA

Формат ответа: JSON с полями title, subtitles, introduction, conclusion`,

  // Топ методы (116-125)
  youtube_shorts: `Создай стратегию для YouTube Shorts комментариев.
Ниша: {niche}. Тематика: {theme}.
Сгенерируй:
1. Идею для Shorts видео
2. Комментарий-приманку
3. Ответ на комментарий автора
4. CTA в описании

Формат ответа: JSON с полями videoIdea, hookComment, authorReply, descriptionCta`,

  facebook_reels: `Создай стратегию для Facebook Reels.
Ниша: {niche}. Стиль: {style}.
Сгенерируй:
1. Идею для Reels
2. Текст на видео
3. Описание с CTA
4. Комментарий-буст

Формат ответа: JSON с полями reelsIdea, videoText, description, boostComment`,

  whatsapp_group: `Создай стратегию для WhatsApp группы.
Ниша: {niche}. Гео: {geo}.
Сгенерируй:
1. Название группы
2. Правила группы
3. Закреплённое сообщение
4. Приглашение

Формат ответа: JSON с полями groupName, groupRules, pinnedMessage, invitation`,

  discord_server: `Создай полную структуру Discord сервера.
Ниша: {niche}. Тематика: {theme}.
Сгенерируй:
1. Название сервера
2. Категории и каналы
3. Роли и разрешения
4. Бот-команды

Формат ответа: JSON с полями serverName, categories, roles, botCommands`,

  twitch_chat: `Создай стратегию для Twitch чата.
Ниша: {niche}. Стример: {streamerType}.
Сгенерируй:
1. Сообщения для чата (10 вариантов)
2. Реакции на события
3. Вопросы стримеру
4. Скрытый CTA

Тон: живой, эмоциональный.
Формат ответа: JSON с полями chatMessages, eventReactions, streamerQuestions, hiddenCta`,

  vk_clips: `Создай стратегию для VK клипов.
Ниша: {niche}. Стиль: {style}.
Сгенерируй:
1. Идею для клипа
2. Текст на видео
3. Описание клипа
4. Комментарий-приманку

Тон: для ру-аудитории.
Формат ответа: JSON с полями clipIdea, videoText, description, hookComment`,

  quora_space: `Создай контент для Quora Space.
Тема: {topic}. Ниша: {niche}.
Сгенерируй:
1. Название Space
2. Описание Space
3. Шаблон поста
4. Вопрос для обсуждения

Формат ответа: JSON с полями spaceName, spaceDescription, postTemplate, discussionQuestion`,

  medium_publication: `Создай контент для Medium Publication.
Тема: {topic}. Ниша: {niche}.
Сгенерируй:
1. Название Publication
2. Описание Publication
3. Правила для авторов
4. Идею для статьи

Формат ответа: JSON с полями publicationName, publicationDescription, authorGuidelines, articleIdea`,

  twitter_thread: `Создай Twitter тред на 10 твитов.
Тема: {topic}. Ниша: {niche}.
Сгенерируй:
1. Первый твит (hook)
2. Твиты 2-9 (контент)
3. Финальный твит (CTA)
4. Хештеги

Формат ответа: JSON с полями hookTweet, contentTweets, finalTweet, hashtags`,

  pinterest_pin: `Создай Pinterest Pin стратегию.
Ниша: {niche}. Стиль: {style}.
Сгенерируй:
1. Заголовок пина
2. Описание пина
3. Текст на изображении
4. Ключевые слова

Формат ответа: JSON с полями pinTitle, pinDescription, imageText, keywords`,
};

// ==================== INTERFACES ====================

interface MethodConfig {
  methodId: CrossPlatformV2MethodId;
  sourcePlatform?: string;
  targetPlatform?: string;
  niche?: string;
  geo?: string;
  style?: string;
  offerLink?: string;
  subreddit?: string;
  theme?: string;
  topic?: string;
  question?: string;
  streamerType?: string;
  targetTelegramChannel?: string;
  accountIds?: string[];
  schedule?: {
    interval: number;
    startHour?: number;
    endHour?: number;
  };
  settings?: {
    contentType?: string;
    ctaStyle?: 'soft' | 'medium' | 'aggressive';
    bridgePage?: string;
    utmParams?: Record<string, string>;
    welcomeMessage?: string;
  };
}

// ==================== AI GENERATION ====================

async function generateContentWithDeepSeek(
  methodName: string,
  config: MethodConfig
): Promise<Record<string, unknown>> {
  const promptTemplate = DEEPSEEK_PROMPTS[methodName];
  if (!promptTemplate) {
    throw new Error(`No prompt template for method: ${methodName}`);
  }

  // Replace placeholders
  const prompt = promptTemplate
    .replace(/{niche}/g, config.niche || 'general')
    .replace(/{geo}/g, config.geo || 'RU')
    .replace(/{style}/g, config.style || 'friendly')
    .replace(/{subreddit}/g, config.subreddit || 'general')
    .replace(/{theme}/g, config.theme || 'general')
    .replace(/{topic}/g, config.topic || config.niche || 'general')
    .replace(/{question}/g, config.question || 'general question')
    .replace(/{streamerType}/g, config.streamerType || 'gaming');

  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты — эксперт по трафику и маркетингу. Генерируешь JSON-ответы для стратегий перелива трафика. Отвечай только валидным JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content || '';

  // Try to parse JSON from response
  try {
    // Extract JSON from response if wrapped in markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonStr);
  } catch {
    // Return raw content if not valid JSON
    return { rawContent: content };
  }
}

// ==================== HTTP HANDLERS ====================

// GET /api/traffic/cross-platform-v2 - Get all methods or specific method
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const methodId = searchParams.get('methodId');
    const all = searchParams.get('all');
    const stats = searchParams.get('stats');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get all methods list
    if (all === 'true') {
      const methods = CROSS_PLATFORM_V2_METHODS.filter(m => {
        if (category && m.category !== category) return false;
        return true;
      });

      return NextResponse.json({
        success: true,
        methods,
        total: methods.length,
        categories: ['basic', 'advanced', 'top'],
        counts: {
          basic: CROSS_PLATFORM_V2_METHODS.filter(m => m.category === 'basic').length,
          advanced: CROSS_PLATFORM_V2_METHODS.filter(m => m.category === 'advanced').length,
          top: CROSS_PLATFORM_V2_METHODS.filter(m => m.category === 'top').length,
        },
      });
    }

    // Get platform stats
    if (stats === 'true') {
      const platformStats = await db.trafficSource.aggregate({
        where: {
          platform: 'cross-platform-v2',
        },
        _sum: {
          totalActions: true,
          totalClicks: true,
          totalConversions: true,
          totalRevenue: true,
        },
      });

      // Get executions count
      const executionsCount = await db.trafficMethodExecution.count({
        where: {
          method: { methodNumber: { in: [...CROSS_PLATFORM_V2_METHODS.map(m => m.id)] } },
        },
      });

      return NextResponse.json({
        success: true,
        stats: {
          totalActions: platformStats._sum.totalActions || 0,
          totalClicks: platformStats._sum.totalClicks || 0,
          totalConversions: platformStats._sum.totalConversions || 0,
          totalRevenue: platformStats._sum.totalRevenue || 0,
          totalExecutions: executionsCount,
        },
        methods: CROSS_PLATFORM_V2_METHODS,
      });
    }

    // Get specific method
    if (methodId) {
      const id = parseInt(methodId);
      const method = CROSS_PLATFORM_V2_METHODS.find(m => m.id === id);

      if (!method) {
        return NextResponse.json(
          { error: 'Method not found' },
          { status: 404 }
        );
      }

      // Get method from database
      const dbMethod = await db.trafficMethod.findUnique({
        where: { methodNumber: id },
        include: {
          executions: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          templates: true,
        },
      });

      // Get prompt
      const prompt = DEEPSEEK_PROMPTS[method.name];

      logger.debug('Cross-platform v2 method fetched', { methodId: id });

      return NextResponse.json({
        success: true,
        method: {
          ...method,
          prompt,
          dbConfig: dbMethod,
        },
      });
    }

    // Get all sources with pagination
    const where: Record<string, string | number> = { platform: 'cross-platform-v2' };

    const [sources, total] = await Promise.all([
      db.trafficSource.findMany({
        where,
        include: {
          campaigns: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { campaigns: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.trafficSource.count({ where }),
    ]);

    logger.debug('Cross-platform v2 sources fetched', { count: sources.length });

    return NextResponse.json({
      success: true,
      methods: CROSS_PLATFORM_V2_METHODS,
      sources,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + sources.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch cross-platform v2 data', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-platform v2 data' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/cross-platform-v2 - Execute method (generate content)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MethodConfig & {
      sourceId?: string;
      campaignName?: string;
      generateVariants?: boolean;
    };

    // Validate method ID
    const validIds = CROSS_PLATFORM_V2_METHODS.map(m => m.id);
    if (!body.methodId || !validIds.includes(body.methodId)) {
      return NextResponse.json(
        { error: `Valid cross-platform v2 method ID required. Valid IDs: ${validIds.join(', ')}` },
        { status: 400 }
      );
    }

    const method = CROSS_PLATFORM_V2_METHODS.find(m => m.id === body.methodId);
    if (!method) {
      return NextResponse.json(
        { error: 'Method not found' },
        { status: 404 }
      );
    }

    logger.info('Executing cross-platform v2 method', {
      methodId: body.methodId,
      methodName: method.name,
      niche: body.niche,
      geo: body.geo,
    });

    // Generate content with DeepSeek
    const generatedContent = await generateContentWithDeepSeek(method.name, body);

    // Generate variants if requested
    const variants: Record<string, unknown>[] = [];
    if (body.generateVariants) {
      for (let i = 0; i < 2; i++) {
        const variant = await generateContentWithDeepSeek(method.name, body);
        variants.push(variant);
      }
    }

    // Create or update traffic source
    let source;
    if (body.sourceId) {
      source = await db.trafficSource.update({
        where: { id: body.sourceId },
        data: {
          totalActions: { increment: 1 },
          config: JSON.stringify({
            ...body.settings,
            lastResult: generatedContent,
            targetTelegramChannel: body.targetTelegramChannel,
          }),
          updatedAt: new Date(),
        },
      });
    } else {
      source = await db.trafficSource.create({
        data: {
          name: `${method.title} - ${new Date().toISOString().split('T')[0]}`,
          platform: 'cross-platform-v2',
          methodId: body.methodId,
          methodName: method.name,
          config: JSON.stringify({
            ...body.settings,
            lastResult: generatedContent,
            targetTelegramChannel: body.targetTelegramChannel,
            niche: body.niche,
            geo: body.geo,
          }),
          status: 'active',
        },
      });

      // Create initial campaign if name provided
      if (body.campaignName) {
        await db.trafficCampaign.create({
          data: {
            sourceId: source.id,
            name: body.campaignName,
            status: 'active',
            startDate: new Date(),
          },
        });
      }
    }

    // Create execution record
    const execution = await db.trafficMethodExecution.create({
      data: {
        methodId: source.id,
        targetPlatform: body.targetPlatform || method.targetPlatform,
        targetId: body.targetTelegramChannel,
        content: JSON.stringify(generatedContent),
        aiGenerated: true,
        aiModel: 'deepseek',
        status: 'success',
        accountId: body.accountIds?.[0],
      },
    });

    // Update method in database
    await db.trafficMethod.upsert({
      where: { methodNumber: body.methodId },
      update: {
        totalActions: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        methodNumber: body.methodId,
        name: method.name,
        description: method.description,
        platform: method.sourcePlatform,
        category: method.category,
        isActive: true,
        status: 'active',
        riskLevel: method.risk === 'low' ? 20 : method.risk === 'medium' ? 50 : 80,
        config: JSON.stringify({ sourcePlatform: method.sourcePlatform, targetPlatform: method.targetPlatform }),
      },
    });

    logger.info('Cross-platform v2 method executed successfully', {
      methodId: body.methodId,
      methodName: method.name,
      sourceId: source.id,
      executionId: execution.id,
    });

    return NextResponse.json({
      success: true,
      method,
      source,
      execution,
      generatedContent,
      variants: variants.length > 0 ? variants : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to execute cross-platform v2 method', error as Error);
    return NextResponse.json(
      { error: 'Failed to execute cross-platform v2 method', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/cross-platform-v2 - Update method configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, config, isActive, sourceId, campaignId, metrics } = body;

    // Update source metrics
    if (sourceId && metrics) {
      const source = await db.trafficSource.update({
        where: { id: sourceId },
        data: {
          totalActions: { increment: metrics.actions || 0 },
          totalClicks: { increment: metrics.clicks || 0 },
          totalConversions: { increment: metrics.conversions || 0 },
          totalRevenue: { increment: metrics.revenue || 0 },
          updatedAt: new Date(),
        },
      });

      // Update campaign if provided
      let campaign: Awaited<ReturnType<typeof db.trafficCampaign.update>> | null = null;
      if (campaignId) {
        campaign = await db.trafficCampaign.update({
          where: { id: campaignId },
          data: {
            impressions: { increment: metrics.impressions || 0 },
            clicks: { increment: metrics.clicks || 0 },
            leads: { increment: metrics.leads || 0 },
            conversions: { increment: metrics.conversions || 0 },
            revenue: { increment: metrics.revenue || 0 },
            spent: { increment: metrics.spent || 0 },
            updatedAt: new Date(),
          },
        });
      }

      logger.info('Cross-platform v2 metrics updated', { sourceId, campaignId });

      return NextResponse.json({
        success: true,
        source,
        campaign,
      });
    }

    // Update method configuration
    if (methodId) {
      const method = await db.trafficMethod.upsert({
        where: { methodNumber: methodId },
        update: {
          config: config ? JSON.stringify(config) : undefined,
          isActive: isActive ?? undefined,
          updatedAt: new Date(),
        },
        create: {
          methodNumber: methodId,
          name: config?.name || `Method ${methodId}`,
          description: config?.description || '',
          platform: config?.platform || 'cross-platform-v2',
          category: config?.category || 'general',
          isActive: isActive ?? true,
          status: 'active',
          config: config ? JSON.stringify(config) : undefined,
        },
      });

      logger.info('Cross-platform v2 method config updated', { methodId });

      return NextResponse.json({
        success: true,
        method,
      });
    }

    return NextResponse.json(
      { error: 'Either sourceId with metrics or methodId with config is required' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Failed to update cross-platform v2', error as Error);
    return NextResponse.json(
      { error: 'Failed to update cross-platform v2' },
      { status: 500 }
    );
  }
}

// PATCH /api/traffic/cross-platform-v2 - Record execution status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId, status, metrics, error } = body;

    if (!executionId) {
      return NextResponse.json(
        { error: 'Execution ID is required' },
        { status: 400 }
      );
    }

    // Update execution
    const execution = await db.trafficMethodExecution.update({
      where: { id: executionId },
      data: {
        status: status || 'success',
        error: error,
        views: metrics?.views || 0,
        clicks: metrics?.clicks || 0,
        conversions: metrics?.conversions || 0,
      },
    });

    logger.info('Cross-platform v2 execution updated', {
      executionId,
      status,
    });

    return NextResponse.json({
      success: true,
      execution,
    });
  } catch (error) {
    logger.error('Failed to update execution', error as Error);
    return NextResponse.json(
      { error: 'Failed to update execution' },
      { status: 500 }
    );
  }
}

// DELETE /api/traffic/cross-platform-v2 - Remove source or execution
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');
    const executionId = searchParams.get('executionId');

    if (executionId) {
      // Delete execution
      await db.trafficMethodExecution.delete({
        where: { id: executionId },
      });

      logger.info('Cross-platform v2 execution deleted', { executionId });

      return NextResponse.json({ success: true });
    }

    if (sourceId) {
      // Delete campaigns first
      await db.trafficCampaign.deleteMany({
        where: { sourceId },
      });

      // Delete source
      await db.trafficSource.delete({
        where: { id: sourceId },
      });

      logger.info('Cross-platform v2 source deleted', { sourceId });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Either sourceId or executionId is required' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Failed to delete cross-platform v2', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete cross-platform v2' },
      { status: 500 }
    );
  }
}

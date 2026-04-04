import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import ZAI from 'z-ai-web-dev-sdk';

// ============================================================================
// TIKTOK V2 TRAFFIC METHODS API - 14 методов (18-23, 56-63, 106-115)
// ============================================================================

console.log('[TikTok-V2] API module loaded');

// ==================== 14 TIKTOK METHODS CONFIGURATION ====================

export const TIKTOK_V2_METHODS = [
  // === БАЗОВЫЕ МЕТОДЫ (18-23) ===
  {
    id: 18,
    name: 'viral_comment',
    title: 'Нейрокомментинг под вирусными видео',
    description: 'AI-генерация комментариев под популярными видео в первые 30 минут для перехвата трафика',
    category: 'basic',
    riskLevel: 'low',
  },
  {
    id: 19,
    name: 'telegram_link',
    title: 'Дублирование ссылки на Telegram',
    description: 'Перелив трафика из TikTok в Telegram через ссылки в профиле и комментариях',
    category: 'basic',
    riskLevel: 'medium',
  },
  {
    id: 20,
    name: 'fake_duet',
    title: 'Создание фейковых дуэтов',
    description: 'Duet-реакции на популярные видео для перехвата аудитории оригинала',
    category: 'basic',
    riskLevel: 'medium',
  },
  {
    id: 21,
    name: 'auto_like',
    title: 'Авто-лайки и сохранения',
    description: 'Автоматические лайки и сохранения для поднятия вовлечённости и видимости',
    category: 'basic',
    riskLevel: 'low',
  },
  {
    id: 22,
    name: 'author_reply',
    title: 'Ответы от имени автора',
    description: 'Ответы на комментарии под своими видео для поднятия активности',
    category: 'basic',
    riskLevel: 'low',
  },
  {
    id: 23,
    name: 'sound_spam',
    title: 'Спам через звуки',
    description: 'Использование популярных звуков для продвижения контента',
    category: 'basic',
    riskLevel: 'medium',
  },

  // === ПРОДВИНУТЫЕ МЕТОДЫ (56-63) ===
  {
    id: 56,
    name: 'song_comment',
    title: 'Комментарии-песни',
    description: 'Комментарии в виде текста песни/рифмы со скрытым CTA',
    category: 'advanced',
    riskLevel: 'low',
  },
  {
    id: 57,
    name: 'author_error',
    title: 'Разбор ошибок автора',
    description: 'Комментарии разбирающие ошибку автора с решением и CTA к своему каналу',
    category: 'advanced',
    riskLevel: 'low',
  },
  {
    id: 58,
    name: 'fake_course_leak',
    title: 'Фейковые сливы курсов',
    description: 'Текст о "сливе" курса создающий ощущение эксклюзивности',
    category: 'advanced',
    riskLevel: 'high',
  },
  {
    id: 59,
    name: 'stitch_spam',
    title: 'Stitch спам',
    description: 'Массовое создание Stitch-реакций на трендовые видео',
    category: 'advanced',
    riskLevel: 'medium',
  },
  {
    id: 60,
    name: 'live_comment',
    title: 'Комменты во время Live',
    description: 'Активные комментарии во время прямых эфиров для привлечения внимания',
    category: 'advanced',
    riskLevel: 'low',
  },
  {
    id: 61,
    name: 'hashtag_hijack',
    title: 'Угон хэштегов',
    description: 'Использование трендовых хэштегов для продвижения своего контента',
    category: 'advanced',
    riskLevel: 'medium',
  },
  {
    id: 62,
    name: 'trend_intercept',
    title: 'Перехват трендов',
    description: 'Быстрое создание контента под тренды для перехвата трафика',
    category: 'advanced',
    riskLevel: 'low',
  },
  {
    id: 63,
    name: 'duet_chain',
    title: 'Цепочка дуэтов',
    description: 'Создание цепочки связанных дуэтов для максимизации охвата',
    category: 'advanced',
    riskLevel: 'medium',
  },

  // === ТОП МЕТОДЫ (106-115) ===
  {
    id: 106,
    name: 'video_reply',
    title: 'Видео-ответы',
    description: 'Создание видео-ответов на популярные комментарии и видео',
    category: 'top',
    riskLevel: 'low',
  },
  {
    id: 107,
    name: 'sound_create',
    title: 'Создание звуков',
    description: 'Создание собственных звуков для вирусного распространения',
    category: 'top',
    riskLevel: 'low',
  },
  {
    id: 108,
    name: 'effect_spam',
    title: 'Спам через эффекты',
    description: 'Использование популярных эффектов для продвижения контента',
    category: 'top',
    riskLevel: 'medium',
  },
  {
    id: 109,
    name: 'challenge_comment',
    title: 'Комменты в челленджах',
    description: 'Активное участие в челленджах с CTA на свой профиль',
    category: 'top',
    riskLevel: 'low',
  },
  {
    id: 110,
    name: 'fyp_comment',
    title: 'Комментарии для FYP',
    description: 'Комментарии оптимизированные для попадания в рекомендации',
    category: 'top',
    riskLevel: 'low',
  },
  {
    id: 111,
    name: 'duet_reaction',
    title: 'Duet реакции',
    description: 'Эмоциональные duet-реакции на вирусный контент',
    category: 'top',
    riskLevel: 'low',
  },
  {
    id: 112,
    name: 'stitch_reply',
    title: 'Stitch ответы',
    description: 'Stitch-ответы с добавлением ценности к оригинальному контенту',
    category: 'top',
    riskLevel: 'low',
  },
  {
    id: 113,
    name: 'live_gift',
    title: 'Подарки в Live',
    description: 'Отправка подарков в прямых эфирах для привлечения внимания',
    category: 'top',
    riskLevel: 'low',
  },
  {
    id: 114,
    name: 'creator_fund',
    title: 'Creator Fund трафик',
    description: 'Оптимизация контента для монетизации через Creator Fund',
    category: 'top',
    riskLevel: 'low',
  },
  {
    id: 115,
    name: 'tiktok_shop',
    title: 'TikTok Shop комменты',
    description: 'Комментарии и контент для продвижения через TikTok Shop',
    category: 'top',
    riskLevel: 'low',
  },
] as const;

type TikTokV2MethodId = typeof TIKTOK_V2_METHODS[number]['id'];
type TikTokV2MethodName = typeof TIKTOK_V2_METHODS[number]['name'];

// ==================== DEEPSEEK PROMPTS ====================

const DEEPSEEK_PROMPTS: Record<TikTokV2MethodName, string> = {
  // Базовые методы (18-23)
  viral_comment: `Ты — TikTok эксперт по вирусным комментариям. Создай комментарий под вирусным видео.
Ниша: {niche}. Гео: {geo}. Стиль: {style}.
Комментарий должен быть опубликован в первые 30 минут после публикации видео.
Генерируй 3 варианта: нейтральный, провокационный, вопрос.
Формат ответа (JSON):
{"variants": [{"type": "neutral", "text": "..."}, {"type": "provocative", "text": "..."}, {"type": "question", "text": "..."}]}`,

  telegram_link: `Ты — эксперт по переливу трафика из TikTok в Telegram.
Создай контент для моста TikTok → Telegram.
Ниша: {niche}. Telegram канал: {telegramChannel}. Гео: {geo}.
Генерируй:
1. Текст для био профиля (максимум 80 символов)
2. Намёк в комментарии (без прямой ссылки)
3. Текст для Stories с CTA
Формат ответа (JSON):
{"bioText": "...", "commentHint": "...", "storyText": "..."}`,

  fake_duet: `Ты — TikTok контент-стратег. Создай идею для Duet-реакции.
Тип: {duetType}. Ниша: {niche}. Гео: {geo}.
Цель: перехватить часть аудитории оригинального видео.
Генерируй:
1. Тип реакции (react/stitch/duet)
2. Подпись к видео
3. Описание реакции
4. Хештеги
Формат ответа (JSON):
{"type": "...", "caption": "...", "reaction": "...", "hashtags": ["..."]}`,

  auto_like: `Ты — TikTok автоматизация эксперт. Настрой авто-лайки.
Ниша: {niche}. Гео: {geo}.
Генерируй параметры для безопасной автоматизации:
1. Критерии таргетинга видео
2. Дневной лимит лайков
3. Дневной лимит сохранений
4. Лучшее время для активности
Формат ответа (JSON):
{"targetCriteria": ["..."], "likeQuota": 100, "saveQuota": 20, "bestTimes": ["..."]}`,

  author_reply: `Ты — TikTok эксперт по вовлечённости. Создай ответ от имени автора.
Стиль ответа: {replyStyle}. Ниша: {niche}. Гео: {geo}.
Цель: повысить активность под видео и спровоцировать диалог.
Генерируй 3 варианта ответов разной длины.
Формат ответа (JSON):
{"replies": [{"style": "question", "text": "..."}, {"style": "agreement", "text": "..."}, {"style": "addition", "text": "..."}]}`,

  sound_spam: `Ты — TikTok аудио-стратег. Подбери звук и идею контента.
Категория звука: {soundCategory}. Ниша: {niche}. Гео: {geo}.
Цель: использовать популярный звук для продвижения.
Генерируй:
1. Название популярного звука
2. Категорию
3. Идею контента под звук
4. Хештеги
Формат ответа (JSON):
{"soundName": "...", "soundCategory": "...", "contentIdea": "...", "hashtags": ["..."]}`,

  // Продвинутые методы (56-63)
  song_comment: `Ты — креативный TikTok копирайтер. Создай комментарий в виде текста песни/рифмы.
Тема: {niche}. Гео: {geo}.
Комментарий должен звучать как популярный трек, быть ритмичным.
Включи скрытый CTA (призыв к действию).
Генерируй 2 варианта: короткий (2-3 строки) и длинный (4-6 строк).
Формат ответа (JSON):
{"variants": [{"length": "short", "text": "..."}, {"length": "long", "text": "..."}], "hiddenCTA": "..."}`,

  author_error: `Ты — эксперт по контенту. Проанализируй типичные ошибки в нише.
Ниша: {niche}. Гео: {geo}.
Создай комментарий разбирающий ошибку автора.
Включи:
1. Конструктивную критику
2. Решение проблемы
3. CTA к своему каналу за подробностями
Формат ответа (JSON):
{"errorType": "...", "analysis": "...", "solution": "...", "ctaToChannel": "..."}`,

  fake_course_leak: `Ты — маркетолог по "эксклюзивному" контенту. Создай текст о "сливе" курса.
Курс: {course}. Ниша: {niche}. Гео: {geo}.
Текст должен создавать ощущение эксклюзивности и срочности.
Включи "ссылку на скачивание" (плейсхолдер).
Формат ответа (JSON):
{"headline": "...", "body": "...", "downloadLink": "...", "urgency": "..."}`,

  stitch_spam: `Ты — TikTok стратег по Stitch-контенту. Создай идеи для массового Stitch.
Ниша: {niche}. Гео: {geo}.
Цель: массовое создание Stitch-реакций на трендовые видео.
Генерируй 3 идеи Stitch с разными подходами.
Формат ответа (JSON):
{"ideas": [{"approach": "...", "caption": "...", "hashtags": ["..."]}], "targetCriteria": ["..."]}`,

  live_comment: `Ты — TikTok эксперт по Live-вовлечённости. Создай комментарии для прямых эфиров.
Ниша: {niche}. Гео: {geo}.
Цель: привлечь внимание автора эфира и зрителей.
Генерируй 5 типов комментариев: вопрос, комплимент, шутка, инсайт, CTA.
Формат ответа (JSON):
{"comments": [{"type": "question", "text": "..."}, {"type": "compliment", "text": "..."}, {"type": "joke", "text": "..."}, {"type": "insight", "text": "..."}, {"type": "cta", "text": "..."}]}`,

  hashtag_hijack: `Ты — TikTok хештег-стратег. Подбери стратегию угона хештегов.
Ниша: {niche}. Гео: {geo}.
Цель: использовать трендовые хештеги для продвижения.
Генерируй:
1. Топ-5 трендовых хештегов сейчас
2. Стратегию их использования
3. Контент-идеи под каждый
Формат ответа (JSON):
{"trendingHashtags": ["..."], "strategy": "...", "contentIdeas": [{"hashtag": "...", "idea": "..."}]}`,

  trend_intercept: `Ты — TikTok тренд-хантер. Создай стратегию перехвата трендов.
Ниша: {niche}. Гео: {geo}.
Цель: быстрое создание контента под тренды.
Генерируй план действий для перехвата тренда.
Формат ответа (JSON):
{"trendName": "...", "actionPlan": ["..."], "contentTemplate": "...", "timing": "..."}`,

  duet_chain: `Ты — TikTok стратег по дуэтам. Создай план цепочки дуэтов.
Ниша: {niche}. Гео: {geo}.
Цель: создание цепочки связанных дуэтов для максимизации охвата.
Генерируй план из 5 связанных дуэтов.
Формат ответа (JSON):
{"chainPlan": [{"step": 1, "type": "...", "caption": "...", "linkToNext": "..."}], "totalReach": "..."}`,

  // Топ методы (106-115)
  video_reply: `Ты — TikTok контент-создатель. Создай идею видео-ответа.
Ниша: {niche}. Гео: {geo}.
Цель: видео-ответ на популярный комментарий или видео.
Генерируй:
1. Тему видео-ответа
2. Сценарий (кратко)
3. Хук для начала
4. CTA в конце
Формат ответа (JSON):
{"topic": "...", "script": "...", "hook": "...", "cta": "...", "hashtags": ["..."]}`,

  sound_create: `Ты — TikTok аудио-креатор. Создай идею вирусного звука.
Ниша: {niche}. Гео: {geo}.
Цель: создать звук который станет вирусным.
Генерируй идею аудио-трека или фразы.
Формат ответа (JSON):
{"soundType": "...", "description": "...", "usageScenario": "...", "viralPotential": "..."}`,

  effect_spam: `Ты — TikTok эксперт по эффектам. Подбери стратегию использования эффектов.
Ниша: {niche}. Гео: {geo}.
Цель: использовать популярные эффекты для продвижения.
Генерируй топ-5 эффектов и идеи контента.
Формат ответа (JSON):
{"effects": [{"name": "...", "popularity": "...", "contentIdea": "..."}], "strategy": "..."}`,

  challenge_comment: `Ты — TikTok эксперт по челленджам. Создай стратегию участия.
Ниша: {niche}. Гео: {geo}.
Цель: активное участие в челленджах с CTA на свой профиль.
Генерируй:
1. Актуальные челленджи
2. Комментарии для участия
3. CTA на свой профиль
Формат ответа (JSON):
{"challenges": ["..."], "comments": ["..."], "profileCTA": "..."}`,

  fyp_comment: `Ты — TikTok алгоритм-эксперт. Создай комментарий для FYP (рекомендаций).
Ниша: {niche}. Гео: {geo}.
Цель: комментарий который попадёт в рекомендации.
Генерируй 3 варианта с разной эмоциональной окраской.
Формат ответа (JSON):
{"variants": [{"emotion": "curiosity", "text": "..."}, {"emotion": "surprise", "text": "..."}, {"emotion": "engagement", "text": "..."}], "fypFactors": ["..."]}`,

  duet_reaction: `Ты — TikTok эмоциональный контент-эксперт. Создай идею duet-реакции.
Ниша: {niche}. Гео: {geo}.
Цель: эмоциональная реакция на вирусный контент.
Генерируй идеи для 3 типов реакций: удивление, смех, шок.
Формат ответа (JSON):
{"reactions": [{"type": "surprise", "description": "...", "caption": "..."}, {"type": "laugh", "description": "...", "caption": "..."}, {"type": "shock", "description": "...", "caption": "..."}]}`,

  stitch_reply: `Ты — TikTok эксперт по Stitch. Создай идею Stitch-ответа.
Ниша: {niche}. Гео: {geo}.
Цель: Stitch-ответ добавляющий ценность к оригиналу.
Генерируй 3 подхода: дополнение, исправление, альтернатива.
Формат ответа (JSON):
{"approaches": [{"type": "addition", "content": "...", "caption": "..."}, {"type": "correction", "content": "...", "caption": "..."}, {"type": "alternative", "content": "...", "caption": "..."}]}`,

  live_gift: `Ты — TikTok эксперт по Live-взаимодействию. Создай стратегию подарков.
Ниша: {niche}. Гео: {geo}.
Цель: привлечь внимание через отправку подарков в Live.
Генерируй стратегию:
1. Какой подарок отправить
2. Когда отправить
3. Что сказать после
Формат ответа (JSON):
{"giftStrategy": {"gift": "...", "timing": "...", "followUp": "..."}, "expectedResult": "..."}`,

  creator_fund: `Ты — TikTok эксперт по монетизации. Создай стратегию для Creator Fund.
Ниша: {niche}. Гео: {geo}.
Цель: оптимизация контента для максимизации заработка через Creator Fund.
Генерируй рекомендации по контенту.
Формат ответа (JSON):
{"contentStrategy": {}, "postingSchedule": {}, "engagementTips": ["..."], "expectedEarnings": "..."}`,

  tiktok_shop: `Ты — TikTok Shop эксперт. Создай стратегию продвижения через Shop.
Ниша: {niche}. Гео: {geo}.
Цель: комментарии и контент для продвижения через TikTok Shop.
Генерируй идеи для интеграции магазина.
Формат ответа (JSON):
{"shopComments": ["..."], "contentIdeas": ["..."], "productCTA": "...", "hashtags": ["..."]}`,
};

// ==================== METHOD CONFIG INTERFACE ====================

interface MethodConfig {
  methodId: TikTokV2MethodId;
  targetVideos?: string[];
  niche?: string;
  geo?: string;
  style?: string;
  sounds?: string[];
  hashtags?: string[];
  telegramChannel?: string;
  course?: string;
  soundCategory?: string;
  duetType?: string;
  replyStyle?: string;
  offerLink?: string;
  accountIds?: string[];
  schedule?: {
    interval: number;
    startHour?: number;
    endHour?: number;
  };
  settings?: Record<string, unknown>;
}

interface ExecutionResult {
  success: boolean;
  method: string;
  content?: Record<string, unknown>;
  error?: string;
  aiModel?: string;
  timestamp: string;
}

// ==================== AI CONTENT GENERATION ====================

async function generateContentWithDeepSeek(
  methodName: TikTokV2MethodName,
  config: MethodConfig
): Promise<Record<string, unknown>> {
  const zai = await ZAI.create();
  
  const promptTemplate = DEEPSEEK_PROMPTS[methodName];
  if (!promptTemplate) {
    throw new Error(`No prompt template found for method: ${methodName}`);
  }

  // Replace placeholders with config values
  let prompt = promptTemplate
    .replace('{niche}', config.niche || 'entertainment')
    .replace('{geo}', config.geo || 'RU')
    .replace('{style}', config.style || 'casual')
    .replace('{telegramChannel}', config.telegramChannel || '@channel')
    .replace('{course}', config.course || 'Premium Course')
    .replace('{soundCategory}', config.soundCategory || 'trending')
    .replace('{duetType}', config.duetType || 'duet')
    .replace('{replyStyle}', config.replyStyle || 'question');

  console.log(`[TikTok-V2] Generating content for method: ${methodName}`);

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты — эксперт по TikTok маркетингу и трафику. Отвечай только валидным JSON без дополнительного текста.',
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
    // Remove any markdown code blocks if present
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, content];
    const jsonStr = jsonMatch[1] || content;
    return JSON.parse(jsonStr);
  } catch {
    // Return raw content if not valid JSON
    return { rawContent: content };
  }
}

// ==================== EXECUTE METHOD ====================

async function executeMethod(config: MethodConfig): Promise<ExecutionResult> {
  const method = TIKTOK_V2_METHODS.find(m => m.id === config.methodId);
  
  if (!method) {
    return {
      success: false,
      method: 'unknown',
      error: `Method with ID ${config.methodId} not found`,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const content = await generateContentWithDeepSeek(method.name as TikTokV2MethodName, config);
    
    console.log(`[TikTok-V2] Method ${method.name} executed successfully`);
    
    return {
      success: true,
      method: method.name,
      content,
      aiModel: 'deepseek',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[TikTok-V2] Error executing method ${method.name}:`, error);
    return {
      success: false,
      method: method.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

// ==================== API HANDLERS ====================

// GET - Получить все методы или конкретный метод
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const methodId = searchParams.get('methodId');
    const all = searchParams.get('all');
    const stats = searchParams.get('stats');

    // Получить статистику по всем методам
    if (stats === 'true') {
      const executions = await db.trafficMethodExecution.findMany({
        where: {
          methodId: { startsWith: 'tiktok_v2_' },
        },
        select: {
          status: true,
          views: true,
          clicks: true,
          conversions: true,
        },
      });

      const totalStats = executions.reduce(
        (acc, e) => ({
          total: acc.total + 1,
          success: acc.success + (e.status === 'success' ? 1 : 0),
          failed: acc.failed + (e.status === 'failed' ? 1 : 0),
          views: acc.views + e.views,
          clicks: acc.clicks + e.clicks,
          conversions: acc.conversions + e.conversions,
        }),
        { total: 0, success: 0, failed: 0, views: 0, clicks: 0, conversions: 0 }
      );

      return NextResponse.json({
        stats: totalStats,
        methodsCount: TIKTOK_V2_METHODS.length,
        categories: {
          basic: TIKTOK_V2_METHODS.filter(m => m.category === 'basic').length,
          advanced: TIKTOK_V2_METHODS.filter(m => m.category === 'advanced').length,
          top: TIKTOK_V2_METHODS.filter(m => m.category === 'top').length,
        },
      });
    }

    // Получить конкретный метод
    if (methodId) {
      const id = parseInt(methodId);
      const method = TIKTOK_V2_METHODS.find(m => m.id === id);
      
      if (!method) {
        return NextResponse.json({ error: 'Method not found' }, { status: 404 });
      }

      // Получить выполнения для этого метода
      const executions = await db.trafficMethodExecution.findMany({
        where: {
          methodId: `tiktok_v2_${method.name}`,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return NextResponse.json({
        method,
        executions,
        promptTemplate: DEEPSEEK_PROMPTS[method.name as TikTokV2MethodName],
      });
    }

    // Получить все методы
    if (all === 'true') {
      return NextResponse.json({
        methods: TIKTOK_V2_METHODS,
        count: TIKTOK_V2_METHODS.length,
        categories: {
          basic: TIKTOK_V2_METHODS.filter(m => m.category === 'basic'),
          advanced: TIKTOK_V2_METHODS.filter(m => m.category === 'advanced'),
          top: TIKTOK_V2_METHODS.filter(m => m.category === 'top'),
        },
      });
    }

    // По умолчанию вернуть список методов
    return NextResponse.json({
      methods: TIKTOK_V2_METHODS,
      count: TIKTOK_V2_METHODS.length,
    });
  } catch (error) {
    console.error('[TikTok-V2] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TikTok V2 methods' },
      { status: 500 }
    );
  }
}

// POST - Выполнить метод (сгенерировать контент)
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MethodConfig & {
      saveExecution?: boolean;
      campaignId?: string;
    };

    // Валидация methodId
    const validMethodIds = TIKTOK_V2_METHODS.map(m => m.id);
    if (!body.methodId || !validMethodIds.includes(body.methodId)) {
      return NextResponse.json(
        { error: `Valid methodId is required. Valid IDs: ${validMethodIds.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`[TikTok-V2] POST request for method ${body.methodId}`);

    // Выполнить метод
    const result = await executeMethod(body);

    // Сохранить выполнение если требуется
    if (body.saveExecution && result.success) {
      const method = TIKTOK_V2_METHODS.find(m => m.id === body.methodId);
      
      try {
        const execution = await db.trafficMethodExecution.create({
          data: {
            id: nanoid(),
            methodId: `tiktok_v2_${method?.name || body.methodId}`,
            targetPlatform: 'tiktok',
            content: JSON.stringify(result.content),
            aiGenerated: true,
            aiModel: result.aiModel,
            status: 'success',
          },
        });

        console.log(`[TikTok-V2] Execution saved: ${execution.id}`);

        return NextResponse.json({
          ...result,
          executionId: execution.id,
        });
      } catch (dbError) {
        console.error('[TikTok-V2] Failed to save execution:', dbError);
        // Return result even if save fails
        return NextResponse.json(result);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[TikTok-V2] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to execute TikTok V2 method' },
      { status: 500 }
    );
  }
}

// PUT - Обновить конфигурацию метода
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, config, isActive } = body;

    if (!methodId) {
      return NextResponse.json(
        { error: 'methodId is required' },
        { status: 400 }
      );
    }

    const method = TIKTOK_V2_METHODS.find(m => m.id === methodId);
    if (!method) {
      return NextResponse.json({ error: 'Method not found' }, { status: 404 });
    }

    // Обновить или создать конфигурацию метода
    const updatedConfig = await db.trafficMethod.upsert({
      where: { methodNumber: Number(methodId) },
      update: {
        config: config ? JSON.stringify(config) : undefined,
        deepseekPrompt: DEEPSEEK_PROMPTS[method.name as TikTokV2MethodName],
        updatedAt: new Date(),
      },
      create: {
        id: nanoid(),
        methodNumber: Number(methodId),
        name: String(method.name),
        description: String(method.description),
        platform: 'tiktok',
        category: String(method.category),
        config: config ? JSON.stringify(config) : null,
        deepseekPrompt: DEEPSEEK_PROMPTS[method.name as TikTokV2MethodName],
        isActive: Boolean(isActive ?? true),
        updatedAt: new Date(),
      },
    });

    console.log(`[TikTok-V2] Method ${methodId} configuration updated`);

    return NextResponse.json({
      success: true,
      method: updatedConfig,
    });
  } catch (error) {
    console.error('[TikTok-V2] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update TikTok V2 method configuration' },
      { status: 500 }
    );
  }
}

// PATCH - Записать выполнение метода (обновить метрики)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId, status, metrics } = body;

    if (!executionId) {
      return NextResponse.json(
        { error: 'executionId is required' },
        { status: 400 }
      );
    }

    // Обновить выполнение
    const execution = await db.trafficMethodExecution.update({
      where: { id: executionId },
      data: {
        status: status || undefined,
        views: metrics?.views ? { increment: metrics.views } : undefined,
        clicks: metrics?.clicks ? { increment: metrics.clicks } : undefined,
        conversions: metrics?.conversions ? { increment: metrics.conversions } : undefined,
        result: metrics?.result || undefined,
        error: metrics?.error || undefined,
      },
    });

    console.log(`[TikTok-V2] Execution ${executionId} updated`);

    return NextResponse.json({
      success: true,
      execution,
    });
  } catch (error) {
    console.error('[TikTok-V2] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update TikTok V2 execution' },
      { status: 500 }
    );
  }
}

// DELETE - Удалить выполнение
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const executionId = searchParams.get('executionId');
    const methodId = searchParams.get('methodId');

    if (executionId) {
      // Удалить конкретное выполнение
      await db.trafficMethodExecution.delete({
        where: { id: executionId },
      });

      console.log(`[TikTok-V2] Execution ${executionId} deleted`);

      return NextResponse.json({ success: true, deleted: 'execution' });
    }

    if (methodId) {
      // Удалить все выполнения метода
      const deleted = await db.trafficMethodExecution.deleteMany({
        where: {
          methodId: `tiktok_v2_${methodId}`,
        },
      });

      console.log(`[TikTok-V2] Deleted ${deleted.count} executions for method ${methodId}`);

      return NextResponse.json({ 
        success: true, 
        deleted: 'method_executions',
        count: deleted.count 
      });
    }

    return NextResponse.json(
      { error: 'executionId or methodId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[TikTok-V2] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete TikTok V2 execution' },
      { status: 500 }
    );
  }
}

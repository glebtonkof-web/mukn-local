import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// ==================== 25 TELEGRAM METHODS DEFINITION ====================

export const TELEGRAM_V2_METHODS = [
  // Базовые методы (1-10)
  { id: 1, name: 'comment_stories', title: 'Комментинг + Stories (AI OFM)', category: 'basic', riskLevel: 'medium' },
  { id: 2, name: 'reactions', title: 'Реакции как триггер', category: 'basic', riskLevel: 'low' },
  { id: 3, name: 'repost_spam', title: 'Спам через репосты с прокладкой', category: 'basic', riskLevel: 'high' },
  { id: 4, name: 'voice_comments', title: 'Голосовые комментарии (TTS)', category: 'basic', riskLevel: 'medium' },
  { id: 5, name: 'poll_trap', title: 'Опросы-ловушки', category: 'basic', riskLevel: 'low' },
  { id: 6, name: 'competitor_reply', title: 'Ответы на комментарии конкурентов', category: 'basic', riskLevel: 'medium' },
  { id: 7, name: 'top_comment_intercept', title: 'Перехват топовых комментариев', category: 'basic', riskLevel: 'medium' },
  { id: 8, name: 'sticker_spam', title: 'Стикер-спам', category: 'basic', riskLevel: 'medium' },
  { id: 9, name: 'auto_like', title: 'Авто-лайк своих комментариев', category: 'basic', riskLevel: 'low' },
  { id: 10, name: 'fake_news', title: 'Спам через «фейковые новости»', category: 'basic', riskLevel: 'high' },

  // Продвинутые методы (31-45)
  { id: 31, name: 'private_channel', title: 'Канал-невидимка', category: 'advanced', riskLevel: 'medium' },
  { id: 32, name: 'fake_job', title: 'Фейковые вакансии', category: 'advanced', riskLevel: 'high' },
  { id: 33, name: 'personal_story', title: 'Личный опыт (истории)', category: 'advanced', riskLevel: 'low' },
  { id: 34, name: 'income_screenshots', title: 'Фейковые скрины доходов', category: 'advanced', riskLevel: 'high' },
  { id: 35, name: 'competitor_channel', title: 'Перехват канала конкурента', category: 'advanced', riskLevel: 'high' },
  { id: 36, name: 'welcome_message', title: 'Авто-приветствие', category: 'advanced', riskLevel: 'low' },
  { id: 37, name: 'comment_deletion', title: 'Удаление комментов после X минут', category: 'advanced', riskLevel: 'medium' },
  { id: 38, name: 'forward_trap', title: 'Ловушка через пересылку', category: 'advanced', riskLevel: 'medium' },
  { id: 39, name: 'emoji_spam', title: 'Спам через эмодзи', category: 'advanced', riskLevel: 'medium' },
  { id: 40, name: 'reaction_chain', title: 'Цепочка реакций', category: 'advanced', riskLevel: 'low' },
  { id: 41, name: 'fake_giveaway', title: 'Фейковый розыгрыш', category: 'advanced', riskLevel: 'high' },
  { id: 42, name: 'urgent_news', title: 'Срочные новости', category: 'advanced', riskLevel: 'medium' },
  { id: 43, name: 'meme_comment', title: 'Комментарии-мемы', category: 'advanced', riskLevel: 'low' },
  { id: 44, name: 'question_trap', title: 'Вопрос-ловушка', category: 'advanced', riskLevel: 'low' },
  { id: 45, name: 'video_comment', title: 'Видео-комментарии', category: 'advanced', riskLevel: 'medium' },

  // Топ методы (81-95)
  { id: 81, name: 'geo_tag', title: 'Гео-теги (локационный спам)', category: 'top', riskLevel: 'medium' },
  { id: 82, name: 'story_reaction', title: 'Реакции на Stories', category: 'top', riskLevel: 'low' },
  { id: 83, name: 'comment_translation', title: 'Перевод комментов', category: 'top', riskLevel: 'low' },
  { id: 84, name: 'emoji_wave', title: 'Волна эмодзи', category: 'top', riskLevel: 'medium' },
  { id: 85, name: 'silent_comment', title: 'Тихий комментарий', category: 'top', riskLevel: 'low' },
  { id: 86, name: 'reaction_emoji', title: 'Эмодзи-реакции', category: 'top', riskLevel: 'low' },
  { id: 87, name: 'poll_meme', title: 'Опросы-мемы', category: 'top', riskLevel: 'low' },
  { id: 88, name: 'sticker_reaction', title: 'Стикер-реакции', category: 'top', riskLevel: 'low' },
  { id: 89, name: 'gift_trap', title: 'Ловушка подарков', category: 'top', riskLevel: 'high' },
  { id: 90, name: 'fake_event', title: 'Фейковые события', category: 'top', riskLevel: 'high' },
  { id: 91, name: 'breaking_news', title: 'Срочные новости', category: 'top', riskLevel: 'medium' },
  { id: 92, name: 'comment_like', title: 'Лайки комментариев', category: 'top', riskLevel: 'low' },
  { id: 93, name: 'story_reply', title: 'Ответы на Stories', category: 'top', riskLevel: 'low' },
  { id: 94, name: 'reaction_trigger', title: 'Триггер реакции', category: 'top', riskLevel: 'low' },
  { id: 95, name: 'audio_comment', title: 'Аудио-комментарии', category: 'top', riskLevel: 'medium' },
] as const;

type TelegramMethodId = typeof TELEGRAM_V2_METHODS[number]['id'];

// ==================== DEEPSEEK PROMPTS FOR EACH METHOD ====================

const DEEPSEEK_PROMPTS: Record<string, string> = {
  // Базовые методы (1-10)
  comment_stories: `Ты — эксперт по арбитражу трафика в Telegram. Создай цепочку: комментарий → профиль → Story → целевой канал.
Ниша: {niche}. Гео: {geo}. Стиль: {style}.
Генерируй 3 варианта комментариев и 1 Story текст.
Комментарии должны быть естественными, вызывать интерес и желание перейти в профиль.
Story должна содержать CTA с призывом перейти в канал {offerLink}.`,

  reactions: `Ты — эксперт по триггерному маркетингу. Подбери реакции и комментарий-триггер.
Ниша: {niche}. Гео: {geo}.
Создай 5 вариантов реакций (эмодзи) с короткими комментариями (2-3 слова).
Цель: спровоцировать ответную реакцию или переход в профиль.`,

  repost_spam: `Ты — эксперт по виральному контенту. Создай контент для репоста через прокладку.
Ниша: {niche}. Гео: {geo}. Ссылка: {offerLink}.
Генерируй: заголовок (привлекающий внимание), основной текст (до 300 символов), CTA.
Контент должен вызывать желание репостнуть.`,

  voice_comments: `Ты — эксперт по аудио-маркетингу. Создай короткий скрипт для голосового комментария.
Ниша: {niche}. Гео: {geo}.
Текст должен быть 5-10 слов, эмоциональным, вызывать любопытство.
Интонация: {style} (дружелюбная/загадочная/восторженная).`,

  poll_trap: `Ты — эксперт по интерактивному маркетингу. Создай опрос-ловушку.
Ниша: {niche}. Гео: {geo}.
Генерируй: вопрос (провокационный, но не банящий) + 4 варианта ответа.
Один из вариантов должен вести к целевому действию.`,

  competitor_reply: `Ты — эксперт по перехвату аудитории. Создай ответ на комментарий конкурента.
Ниша: {niche}. Гео: {geo}.
Ответ должен быть полезным, мягко предлагать альтернативу.
Не выглядеть как прямая реклама. Вызывать доверие.`,

  top_comment_intercept: `Ты — эксперт по хайджекингу комментариев. Создай ответ на топовый комментарий.
Ниша: {niche}. Гео: {geo}.
Ответ должен быть интереснее оригинала, перетягивать внимание.
Добавить интригу или вопрос, провоцирующий на ответ.`,

  sticker_spam: `Ты — эксперт по стикер-маркетингу. Опиши идею стикера для привлечения внимания.
Ниша: {niche}. Гео: {geo}.
Стикер должен: привлекать внимание, вызывать эмоции, ненавязчиво продвигать.
Опиши визу + контекст использования.`,

  auto_like: `Ты — эксперт по алгоритмам Telegram. Опиши стратегию авто-лайков.
Ниша: {niche}. Гео: {geo}.
Определи: оптимальное время задержки, какие реакции использовать, частоту.
Цель: поднять видимость комментариев без бана.`,

  fake_news: `Ты — эксперт по сенсационному контенту. Создай "новость" для вирального распространения.
Ниша: {niche}. Гео: {geo}. Ссылка: {offerLink}.
Контент должен: быть believable, вызывать FOMO, провоцировать репосты.
НЕ создаёшь фейки о реальных людях/событиях.`,

  // Продвинутые методы (31-45)
  private_channel: `Ты — эксперт по эксклюзивному маркетингу. Создай стратегию "канала-невидимки".
Ниша: {niche}. Гео: {geo}.
Опиши: как создать интригу, как приглашать, какой контент внутри.
Цель: создать ощущение эксклюзивности и срочности.`,

  fake_job: `Ты — эксперт по HR-маркетингу. Создай фейковую вакансию для привлечения трафика.
Ниша: {niche}. Гео: {geo}.
Вакансия должна: звучать реально, предлагать хорошие условия, вести к {offerLink}.
Опиши: должность, требования, зарплата, CTA.`,

  personal_story: `Ты — эксперт по сторителлингу. Напиши личную историю успеха.
Ниша: {niche}. Гео: {geo}.
История должна: быть эмоциональной, вызывать доверие, содержать CTA.
Структура: проблема → решение → результат → призыв.`,

  income_screenshots: `Ты — эксперт по финансовому маркетингу. Опиши скриншот доходов.
Ниша: {niche}. Гео: {geo}. Сумма: реалистичная для ниши.
Опиши: что на скриншоте, текст поста, как создать доверие.
НЕ создаёшь реальные фейки, только описание концепции.`,

  competitor_channel: `Ты — эксперт по конкурентному анализу. Опиши стратегию перехвата канала конкурента.
Ниша: {niche}. Гео: {geo}.
Опиши: методы анализа, как предложить альтернативу, миграцию аудитории.
Цель: мягко переманить аудиторию.`,

  welcome_message: `Ты — эксперт по онбордингу. Создай авто-приветствие для новых подписчиков.
Ниша: {niche}. Гео: {geo}.
Приветствие должно: быть персональным, содержать ценность, иметь CTA.
Включи: приветствие + бонус + призыв к действию.`,

  comment_deletion: `Ты — эксперт по стелс-маркетингу. Опиши стратегию авто-удаления комментариев.
Ниша: {niche}. Гео: {geo}.
Определи: оптимальное время до удаления, как сохранить охват, триггеры.
Цель: максимизировать охват до удаления.`,

  forward_trap: `Ты — эксперт по форвардингу. Создай ловушку через пересылку сообщений.
Ниша: {niche}. Гео: {geo}.
Опиши: какой контент пересылать, в какие каналы, CTA внутри.
Цель: перелив трафика через форварды.`,

  emoji_spam: `Ты — эксперт по эмодзи-маркетингу. Создай стратегию эмодзи-спама.
Ниша: {niche}. Гео: {geo}.
Опиши: какие эмодзи, в каком порядке, частота, каналы.
Цель: привлечь внимание без бана.`,

  reaction_chain: `Ты — эксперт по цепным реакциям. Создай стратегию цепочки реакций.
Ниша: {niche}. Гео: {geo}.
Опиши: последовательность реакций, тайминги, аккаунты.
Цель: создать видимость активности и привлечь внимание.`,

  fake_giveaway: `Ты — эксперт по розыгрышам. Создай концепцию фейкового розыгрыша.
Ниша: {niche}. Гео: {geo}. Приз: {offerLink}.
Опиши: приз, условия участия, механику выбора "победителя".
Цель: сбор аудитории и активность.`,

  urgent_news: `Ты — эксперт по срочным новостям. Создай формат "срочной новости".
Ниша: {niche}. Гео: {geo}.
Контент должен: создавать срочность, FOMO, содержать CTA.
Формат: заголовок + суть + призыв.`,

  meme_comment: `Ты — эксперт по мем-маркетингу. Создай комментарий-мем.
Ниша: {niche}. Гео: {geo}.
Мем должен: быть актуальным, смешным, ненавязчиво продвигать.
Опиши: идею мема + текст + контекст использования.`,

  question_trap: `Ты — эксперт по вопросам-ловушкам. Создай вопрос для вовлечения.
Ниша: {niche}. Гео: {geo}.
Вопрос должен: провоцировать ответ, быть релевантным, вести к {offerLink}.
Создай 3 варианта вопросов.`,

  video_comment: `Ты — эксперт по видео-комментариям. Создай концепцию видео-круга.
Ниша: {niche}. Гео: {geo}.
Опиши: что в видео, длительность, CTA внутри.
Цель: привлечение внимания через видео-формат.`,

  // Топ методы (81-95)
  geo_tag: `Ты — эксперт по гео-маркетингу. Создай стратегию локационного спама.
Ниша: {niche}. Гео: {geo}.
Опиши: какие локации тегать, в каких каналах, частоту.
Цель: привлечение локальной аудитории.`,

  story_reaction: `Ты — эксперт по реакциям на Stories. Создай стратегию реакций.
Ниша: {niche}. Гео: {geo}.
Опиши: на чьи Stories реагировать, какие реакции, частоту.
Цель: привлечение внимания через реакции на Stories.`,

  comment_translation: `Ты — эксперт по мультиязычному маркетингу. Создай стратегию перевода.
Ниша: {niche}. Гео: {geo}.
Опиши: какие языки, как переводить, где публиковать.
Цель: охват мультиязычной аудитории.`,

  emoji_wave: `Ты — эксперт по волнам эмодзи. Создай стратегию "волны".
Ниша: {niche}. Гео: {geo}.
Опиши: последовательность эмодзи, тайминги, количество аккаунтов.
Цель: массированное привлечение внимания.`,

  silent_comment: `Ты — эксперт по стелс-комментариям. Создай "тихий" комментарий.
Ниша: {niche}. Гео: {geo}.
Комментарий должен: не выглядеть как реклама, быть полезным, запоминаться.
Цель: мягкое привлечение внимания.`,

  reaction_emoji: `Ты — эксперт по эмодзи-реакциям. Создай набор реакций.
Ниша: {niche}. Гео: {geo}.
Опиши: какие эмодзи-реакции использовать, на какие посты, частоту.
Цель: невидимое присутствие и привлечение.`,

  poll_meme: `Ты — эксперт по мем-опросам. Создай опрос-мем.
Ниша: {niche}. Гео: {geo}.
Опрос должен: быть смешным, виральным, собирать данные.
Генерируй: вопрос + 4 варианта ответа (мемные).`,

  sticker_reaction: `Ты — эксперт по стикер-реакциям. Создай стратегию.
Ниша: {niche}. Гео: {geo}.
Опиши: какие стикеры использовать, на что реагировать, частоту.
Цель: привлечение через уникальные стикеры.`,

  gift_trap: `Ты — эксперт по подаркам-ловушкам. Создай концепцию подарка.
Ниша: {niche}. Гео: {geo}.
Опиши: что за подарок, условия получения, скрытый CTA.
Цель: привлечение через подарок.`,

  fake_event: `Ты — эксперт по ивент-маркетингу. Создай концепцию фейкового события.
Ниша: {niche}. Гео: {geo}.
Событие должно: звучать реально, создавать FOMO, вести к {offerLink}.
Опиши: что за событие, когда, CTA.`,

  breaking_news: `Ты — эксперт по breaking news. Создай формат срочной новости.
Ниша: {niche}. Гео: {geo}.
Новость должна: быть срочной, важной, с CTA.
Формат: СРОЧНО + заголовок + суть + ссылка.`,

  comment_like: `Ты — эксперт по лайкам комментариев. Создай стратегию.
Ниша: {niche}. Гео: {geo}.
Опиши: чьи комментарии лайкать, тайминги, частоту.
Цель: привлечение через likes на комментариях.`,

  story_reply: `Ты — эксперт по ответам на Stories. Создай стратегию.
Ниша: {niche}. Гео: {geo}.
Опиши: на чьи Stories отвечать, типы ответов, частоту.
Цель: привлечение через answers на Stories.`,

  reaction_trigger: `Ты — эксперт по триггерам реакций. Создай триггер-стратегию.
Ниша: {niche}. Гео: {geo}.
Опиши: какие реакции триггерят ответы, как использовать, частоту.
Цель: провокация на ответные реакции.`,

  audio_comment: `Ты — эксперт по аудио-комментариям. Создай скрипт.
Ниша: {niche}. Гео: {geo}.
Аудио должно: быть коротким (10-15 сек), интригующим, с CTA.
Опиши: текст + интонация + музыка/эффекты.`,
};

// ==================== INTERFACES ====================

interface MethodConfig {
  methodId: TelegramMethodId;
  targetChannels?: string[];
  niche?: string;
  geo?: string;
  style?: string;
  offerLink?: string;
  accountIds?: string[];
  settings?: Record<string, unknown>;
}

interface ExecutionBody extends MethodConfig {
  executionId?: string;
  status?: string;
  metrics?: {
    views?: number;
    clicks?: number;
    conversions?: number;
    revenue?: number;
  };
}

// ==================== AI CONTENT GENERATION ====================

async function generateContentWithDeepSeek(
  methodName: string,
  config: MethodConfig
): Promise<{ content: string; prompt: string; aiModel: string }> {
  const zai = await ZAI.create();

  // Get prompt template
  let promptTemplate = DEEPSEEK_PROMPTS[methodName];
  if (!promptTemplate) {
    promptTemplate = `Ты — эксперт по арбитражу трафика в Telegram.
Ниша: {niche}. Гео: {geo}. Стиль: {style}.
Создай контент для метода "${methodName}". Ссылка: {offerLink}.`;
  }

  // Replace placeholders
  const finalPrompt = promptTemplate
    .replace('{niche}', config.niche || 'general')
    .replace('{geo}', config.geo || 'RU')
    .replace('{style}', config.style || 'neutral')
    .replace('{offerLink}', config.offerLink || '');

  console.log(`[Telegram V2] Generating content for method: ${methodName}`);
  console.log(`[Telegram V2] Prompt: ${finalPrompt.substring(0, 200)}...`);

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты — эксперт по арбитражу трафика в Telegram. Создаёшь эффективный контент для привлечения трафика. Отвечаешь на русском языке. Контент должен быть естественным и не выглядеть как спам.',
      },
      {
        role: 'user',
        content: finalPrompt,
      },
    ],
    temperature: 0.8,
    max_tokens: 2000,
  });

  return {
    content: completion.choices[0]?.message?.content || '',
    prompt: finalPrompt,
    aiModel: 'deepseek',
  };
}

// ==================== METHOD EXECUTION ====================

async function executeMethod(config: MethodConfig): Promise<Record<string, unknown>> {
  const method = TELEGRAM_V2_METHODS.find(m => m.id === config.methodId);
  if (!method) {
    throw new Error(`Unknown method ID: ${config.methodId}`);
  }

  // Generate content with DeepSeek
  const generated = await generateContentWithDeepSeek(method.name, config);

  // Return result based on method category
  const baseResult = {
    methodId: config.methodId,
    methodName: method.name,
    methodTitle: method.title,
    category: method.category,
    riskLevel: method.riskLevel,
    ...generated,
    timestamp: new Date().toISOString(),
  };

  // Add specific fields based on method
  switch (method.id) {
    // Базовые методы
    case 1: // comment_stories
      return {
        ...baseResult,
        type: 'comment_chain',
        targetChannels: config.targetChannels || [],
      };
    case 2: // reactions
      return {
        ...baseResult,
        type: 'reaction_trigger',
        reactions: ['🔥', '👍', '💰', '🚀', '💎'],
      };
    case 3: // repost_spam
      return {
        ...baseResult,
        type: 'repost_content',
        proxyChannel: 'recommended',
      };
    case 4: // voice_comments
      return {
        ...baseResult,
        type: 'voice_script',
        duration: '10-15s',
      };
    case 5: // poll_trap
      return {
        ...baseResult,
        type: 'poll_config',
        optionsCount: 4,
      };
    case 6: // competitor_reply
    case 7: // top_comment_intercept
      return {
        ...baseResult,
        type: 'reply_content',
      };
    case 8: // sticker_spam
      return {
        ...baseResult,
        type: 'sticker_idea',
      };
    case 9: // auto_like
      return {
        ...baseResult,
        type: 'auto_config',
        delay: '30-60s',
        reactions: ['👍', '❤️', '🔥'],
      };
    case 10: // fake_news
      return {
        ...baseResult,
        type: 'viral_content',
        warning: 'Use carefully - high risk',
      };

    // Продвинутые методы (31-45)
    case 31: // private_channel
      return {
        ...baseResult,
        type: 'channel_strategy',
        visibility: 'private',
      };
    case 32: // fake_job
      return {
        ...baseResult,
        type: 'job_posting',
        format: 'vacancy',
      };
    case 33: // personal_story
      return {
        ...baseResult,
        type: 'storytelling',
        format: 'personal',
      };
    case 34: // income_screenshots
      return {
        ...baseResult,
        type: 'income_display',
        warning: 'Concept only - do not create actual fakes',
      };
    case 35: // competitor_channel
      return {
        ...baseResult,
        type: 'channel_analysis',
        strategy: 'migration',
      };
    case 36: // welcome_message
      return {
        ...baseResult,
        type: 'auto_message',
        trigger: 'new_subscriber',
      };
    case 37: // comment_deletion
      return {
        ...baseResult,
        type: 'auto_config',
        deleteAfter: '15-30 minutes',
      };
    case 38: // forward_trap
      return {
        ...baseResult,
        type: 'forward_strategy',
      };
    case 39: // emoji_spam
      return {
        ...baseResult,
        type: 'emoji_sequence',
        maxEmojis: 3,
      };
    case 40: // reaction_chain
      return {
        ...baseResult,
        type: 'chain_config',
        steps: 5,
      };
    case 41: // fake_giveaway
      return {
        ...baseResult,
        type: 'giveaway_config',
        warning: 'High risk method',
      };
    case 42: // urgent_news
    case 91: // breaking_news
      return {
        ...baseResult,
        type: 'urgent_content',
        format: 'breaking',
      };
    case 43: // meme_comment
      return {
        ...baseResult,
        type: 'meme_content',
      };
    case 44: // question_trap
      return {
        ...baseResult,
        type: 'question_variants',
        count: 3,
      };
    case 45: // video_comment
      return {
        ...baseResult,
        type: 'video_script',
        duration: '15-30s',
      };

    // Топ методы (81-95)
    case 81: // geo_tag
      return {
        ...baseResult,
        type: 'geo_strategy',
      };
    case 82: // story_reaction
      return {
        ...baseResult,
        type: 'story_engagement',
      };
    case 83: // comment_translation
      return {
        ...baseResult,
        type: 'translation_config',
        languages: ['en', 'de', 'es'],
      };
    case 84: // emoji_wave
      return {
        ...baseResult,
        type: 'wave_config',
        accounts: 5,
      };
    case 85: // silent_comment
      return {
        ...baseResult,
        type: 'stealth_content',
      };
    case 86: // reaction_emoji
      return {
        ...baseResult,
        type: 'emoji_reactions',
      };
    case 87: // poll_meme
      return {
        ...baseResult,
        type: 'meme_poll',
      };
    case 88: // sticker_reaction
      return {
        ...baseResult,
        type: 'sticker_config',
      };
    case 89: // gift_trap
      return {
        ...baseResult,
        type: 'gift_strategy',
        warning: 'High risk method',
      };
    case 90: // fake_event
      return {
        ...baseResult,
        type: 'event_config',
        warning: 'High risk method',
      };
    case 92: // comment_like
      return {
        ...baseResult,
        type: 'like_strategy',
      };
    case 93: // story_reply
      return {
        ...baseResult,
        type: 'reply_strategy',
      };
    case 94: // reaction_trigger
      return {
        ...baseResult,
        type: 'trigger_config',
      };
    case 95: // audio_comment
      return {
        ...baseResult,
        type: 'audio_script',
        tts: 'enabled',
      };

    default:
      return baseResult;
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
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[Telegram V2] GET request', { methodId, all, stats, category });

    // Get single method by ID
    if (methodId && methodId !== 'all') {
      const id = parseInt(methodId);
      const method = TELEGRAM_V2_METHODS.find(m => m.id === id);

      if (!method) {
        return NextResponse.json({ error: 'Method not found' }, { status: 404 });
      }

      // Get prompt
      const prompt = DEEPSEEK_PROMPTS[method.name];

      // Get execution stats from database
      const dbMethod = await db.trafficMethod.findFirst({
        where: { methodNumber: id },
        include: {
          executions: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { executions: true },
          },
        },
      });

      return NextResponse.json({
        method: {
          ...method,
          prompt: prompt || null,
        },
        dbMethod,
        stats: dbMethod ? {
          totalActions: dbMethod.totalActions,
          totalClicks: dbMethod.totalClicks,
          totalConversions: dbMethod.totalConversions,
          revenue: dbMethod.revenue,
          executionsCount: dbMethod._count.executions,
        } : null,
      });
    }

    // Get stats summary
    if (stats === 'true') {
      const allMethods = TELEGRAM_V2_METHODS;
      const methodNumbers = allMethods.map(m => m.id);

      const dbMethods = await db.trafficMethod.findMany({
        where: {
          methodNumber: { in: methodNumbers },
        },
      });

      const totalStats = dbMethods.reduce(
        (acc, m) => ({
          totalActions: acc.totalActions + m.totalActions,
          totalClicks: acc.totalClicks + m.totalClicks,
          totalConversions: acc.totalConversions + m.totalConversions,
          revenue: acc.revenue + m.revenue,
        }),
        { totalActions: 0, totalClicks: 0, totalConversions: 0, revenue: 0 }
      );

      const byCategory = {
        basic: allMethods.filter(m => m.category === 'basic'),
        advanced: allMethods.filter(m => m.category === 'advanced'),
        top: allMethods.filter(m => m.category === 'top'),
      };

      return NextResponse.json({
        totalMethods: allMethods.length,
        categories: {
          basic: byCategory.basic.length,
          advanced: byCategory.advanced.length,
          top: byCategory.top.length,
        },
        stats: totalStats,
        methods: allMethods,
      });
    }

    // Get all methods with filtering
    let methods = [...TELEGRAM_V2_METHODS];

    if (category) {
      methods = methods.filter(m => m.category === category);
    }

    // Paginate
    const paginatedMethods = methods.slice(offset, offset + limit);

    // Get database records for these methods
    const dbMethods = await db.trafficMethod.findMany({
      where: {
        methodNumber: { in: paginatedMethods.map(m => m.id) },
      },
      include: {
        _count: {
          select: { executions: true },
        },
      },
    });

    // Merge with static data
    const enrichedMethods = paginatedMethods.map(method => {
      const dbMethod = dbMethods.find(m => m.methodNumber === method.id);
      return {
        ...method,
        prompt: DEEPSEEK_PROMPTS[method.name] || null,
        dbData: dbMethod || null,
        executionsCount: dbMethod?._count.executions || 0,
      };
    });

    return NextResponse.json({
      methods: enrichedMethods,
      pagination: {
        total: methods.length,
        limit,
        offset,
        hasMore: offset + paginatedMethods.length < methods.length,
      },
    });
  } catch (error) {
    console.error('[Telegram V2] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch methods', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Выполнить метод (сгенерировать контент)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExecutionBody;

    console.log('[Telegram V2] POST request', { methodId: body.methodId });

    // Validate method ID
    const validIds = TELEGRAM_V2_METHODS.map(m => m.id);
    if (!body.methodId || !validIds.includes(body.methodId)) {
      return NextResponse.json(
        { error: `Valid method ID is required. Valid IDs: ${validIds.join(', ')}` },
        { status: 400 }
      );
    }

    const method = TELEGRAM_V2_METHODS.find(m => m.id === body.methodId);
    if (!method) {
      return NextResponse.json({ error: 'Method not found' }, { status: 404 });
    }

    // Execute method with DeepSeek
    const result = await executeMethod(body);

    // Create or get TrafficMethod record
    let dbMethod = await db.trafficMethod.findFirst({
      where: { methodNumber: body.methodId },
    });

    if (!dbMethod) {
      dbMethod = await db.trafficMethod.create({
        data: {
          methodNumber: body.methodId,
          name: method.name,
          description: method.title,
          platform: 'telegram',
          category: method.category,
          status: 'active',
          isActive: true,
          riskLevel: method.riskLevel === 'high' ? 80 : method.riskLevel === 'medium' ? 50 : 20,
          deepseekPrompt: DEEPSEEK_PROMPTS[method.name] || null,
        },
      });
    }

    // Create execution record
    const execution = await db.trafficMethodExecution.create({
      data: {
        methodId: dbMethod.id,
        targetPlatform: 'telegram',
        targetId: body.targetChannels?.[0] || null,
        content: result.content as string,
        aiGenerated: true,
        aiModel: result.aiModel as string,
        status: 'success',
        utmCampaign: `telegram_v2_${method.name}`,
        utmSource: 'telegram',
        utmMedium: method.category,
      },
    });

    // Update method stats
    await db.trafficMethod.update({
      where: { id: dbMethod.id },
      data: {
        totalActions: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    console.log('[Telegram V2] Method executed successfully', { executionId: execution.id });

    return NextResponse.json({
      success: true,
      method: {
        id: method.id,
        name: method.name,
        title: method.title,
        category: method.category,
        riskLevel: method.riskLevel,
      },
      execution: {
        id: execution.id,
        status: execution.status,
        createdAt: execution.createdAt,
      },
      result,
    });
  } catch (error) {
    console.error('[Telegram V2] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to execute method', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Обновить конфигурацию метода
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as {
      methodId: TelegramMethodId;
      config?: Record<string, unknown>;
      isActive?: boolean;
    };

    console.log('[Telegram V2] PUT request', { methodId: body.methodId });

    const validIds = TELEGRAM_V2_METHODS.map(m => m.id);
    if (!body.methodId || !validIds.includes(body.methodId)) {
      return NextResponse.json(
        { error: 'Valid method ID is required' },
        { status: 400 }
      );
    }

    // Find or create method
    let dbMethod = await db.trafficMethod.findFirst({
      where: { methodNumber: body.methodId },
    });

    const method = TELEGRAM_V2_METHODS.find(m => m.id === body.methodId);

    if (!dbMethod && method) {
      dbMethod = await db.trafficMethod.create({
        data: {
          methodNumber: body.methodId,
          name: method.name,
          description: method.title,
          platform: 'telegram',
          category: method.category,
          status: 'active',
          isActive: body.isActive ?? true,
          riskLevel: method.riskLevel === 'high' ? 80 : method.riskLevel === 'medium' ? 50 : 20,
          deepseekPrompt: DEEPSEEK_PROMPTS[method.name] || null,
          config: body.config ? JSON.stringify(body.config) : null,
        },
      });
    } else if (dbMethod) {
      dbMethod = await db.trafficMethod.update({
        where: { id: dbMethod.id },
        data: {
          isActive: body.isActive ?? dbMethod.isActive,
          config: body.config ? JSON.stringify(body.config) : dbMethod.config,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      method: dbMethod,
    });
  } catch (error) {
    console.error('[Telegram V2] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update method', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH - Записать выполнение метода (обновить метрики)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as {
      executionId: string;
      status?: string;
      metrics?: {
        views?: number;
        clicks?: number;
        conversions?: number;
        revenue?: number;
      };
    };

    console.log('[Telegram V2] PATCH request', { executionId: body.executionId });

    if (!body.executionId) {
      return NextResponse.json(
        { error: 'Execution ID is required' },
        { status: 400 }
      );
    }

    // Update execution
    const execution = await db.trafficMethodExecution.update({
      where: { id: body.executionId },
      data: {
        status: body.status || 'success',
        views: body.metrics?.views || 0,
        clicks: body.metrics?.clicks || 0,
        conversions: body.metrics?.conversions || 0,
        executedAt: new Date(),
      },
      include: { method: true },
    });

    // Update method stats
    if (body.metrics) {
      await db.trafficMethod.update({
        where: { id: execution.methodId },
        data: {
          totalClicks: { increment: body.metrics.clicks || 0 },
          totalConversions: { increment: body.metrics.conversions || 0 },
          revenue: { increment: body.metrics.revenue || 0 },
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      execution,
    });
  } catch (error) {
    console.error('[Telegram V2] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update execution', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Удалить выполнение
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');
    const methodId = searchParams.get('methodId');

    console.log('[Telegram V2] DELETE request', { executionId, methodId });

    if (executionId) {
      // Delete single execution
      await db.trafficMethodExecution.delete({
        where: { id: executionId },
      });

      return NextResponse.json({ success: true, deleted: 'execution' });
    }

    if (methodId) {
      // Delete all executions for method
      const dbMethod = await db.trafficMethod.findFirst({
        where: { methodNumber: parseInt(methodId) },
      });

      if (dbMethod) {
        await db.trafficMethodExecution.deleteMany({
          where: { methodId: dbMethod.id },
        });

        return NextResponse.json({ success: true, deleted: 'all_executions' });
      }
    }

    return NextResponse.json(
      { error: 'executionId or methodId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Telegram V2] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

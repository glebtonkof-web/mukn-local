import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';

// ==================== 130 TRAFFIC METHODS CONFIGURATION ====================

// Все 130 методов трафика
export const TRAFFIC_METHODS = {
  telegram: [
    // Оригинальные 1-10
    { id: 1, name: 'Комментинг + Stories', risk: 'low', category: 'funnel' },
    { id: 2, name: 'Реакции как триггер', risk: 'low', category: 'engagement' },
    { id: 3, name: 'Спам через репосты', risk: 'medium', category: 'repost' },
    { id: 4, name: 'Голосовые комментарии', risk: 'low', category: 'voice' },
    { id: 5, name: 'Опросы-ловушки', risk: 'low', category: 'interactive' },
    { id: 6, name: 'Ответы конкурентам', risk: 'medium', category: 'competitor' },
    { id: 7, name: 'Перехват топ-комментов', risk: 'medium', category: 'intercept' },
    { id: 8, name: 'Стикер-спам', risk: 'low', category: 'sticker' },
    { id: 9, name: 'Авто-лайк своих', risk: 'low', category: 'self_engagement' },
    { id: 10, name: 'Фейковые новости', risk: 'high', category: 'viral' },
    // Новые 31-45
    { id: 31, name: 'Фейковые подарки', risk: 'medium', category: 'gift' },
    { id: 32, name: 'Авто-ответы на команды', risk: 'low', category: 'bot' },
    { id: 33, name: 'Исправление ошибок', risk: 'medium', category: 'stealth' },
    { id: 34, name: 'Цитаты автора', risk: 'low', category: 'quote' },
    { id: 35, name: 'Предсказания', risk: 'low', category: 'prediction' },
    { id: 36, name: 'Конкурсы', risk: 'medium', category: 'contest' },
    { id: 37, name: 'Жалобы', risk: 'high', category: 'provocation' },
    { id: 38, name: 'Оффтоп', risk: 'medium', category: 'stealth' },
    { id: 39, name: 'Личная история', risk: 'low', category: 'storytelling' },
    { id: 40, name: 'Несогласие', risk: 'medium', category: 'controversy' },
    { id: 41, name: 'Теги друзей', risk: 'medium', category: 'mention' },
    { id: 42, name: 'Фейковые разоблачения', risk: 'high', category: 'expose' },
    { id: 43, name: 'Опросы с подвохом', risk: 'medium', category: 'poll' },
    { id: 44, name: 'Переписка с собой', risk: 'medium', category: 'fake_dialog' },
    { id: 45, name: 'Фейковые уведомления', risk: 'high', category: 'fake_system' },
    // Дополнительные 81-95
    { id: 81, name: 'Голосование в комментах', risk: 'low', category: 'poll' },
    { id: 82, name: 'Канал-невидимка', risk: 'low', category: 'private_channel' },
    { id: 83, name: 'Фейковые техподдержки', risk: 'extreme', category: 'impersonation' },
    { id: 84, name: 'Розыгрыши по подписке', risk: 'medium', category: 'contest' },
    { id: 85, name: 'Доступ к закрытому контенту', risk: 'low', category: 'exclusive' },
    { id: 86, name: 'Фейковые вакансии', risk: 'medium', category: 'job' },
    { id: 87, name: 'Партнёрские программы', risk: 'low', category: 'affiliate' },
    { id: 88, name: 'Чек-листы и гайды', risk: 'low', category: 'content' },
    { id: 89, name: 'Личные сообщения автору', risk: 'medium', category: 'dm_bait' },
    { id: 90, name: 'Исправление автора', risk: 'medium', category: 'correction' },
    { id: 91, name: 'Дополнение к посту', risk: 'low', category: 'addition' },
    { id: 92, name: 'Личный опыт', risk: 'low', category: 'storytelling' },
    { id: 93, name: 'Фейковые скрины доходов', risk: 'medium', category: 'fake_proof' },
    { id: 94, name: 'Предложение дружбы', risk: 'low', category: 'social' },
    { id: 95, name: 'Приглашение в клуб', risk: 'low', category: 'exclusive' },
  ],
  instagram: [
    // Оригинальные 11-17
    { id: 11, name: 'AI-комментарии в Reels', risk: 'low', category: 'comment' },
    { id: 12, name: 'Mass following', risk: 'medium', category: 'follow' },
    { id: 13, name: 'Stories с интерактивом', risk: 'low', category: 'story' },
    { id: 14, name: 'DM-рассылка', risk: 'high', category: 'dm' },
    { id: 15, name: 'Комментинг с эмодзи', risk: 'low', category: 'comment' },
    { id: 16, name: 'Репост Stories', risk: 'low', category: 'repost' },
    { id: 17, name: 'Коллаборации', risk: 'low', category: 'collab' },
    // Новые 46-55
    { id: 46, name: 'Мемы в комментах', risk: 'low', category: 'meme' },
    { id: 47, name: 'Благодарности', risk: 'low', category: 'gratitude' },
    { id: 48, name: 'Вопросы к автору', risk: 'low', category: 'question' },
    { id: 49, name: 'Stories с наклейкой "Новое"', risk: 'low', category: 'story' },
    { id: 50, name: 'Карусель в комментах', risk: 'medium', category: 'multi_comment' },
    { id: 51, name: 'Упоминания в Reels', risk: 'low', category: 'mention' },
    { id: 52, name: 'Коллаборация с микроблогером', risk: 'medium', category: 'collab' },
    { id: 53, name: 'Челленджи', risk: 'low', category: 'challenge' },
    { id: 54, name: 'Фейковые раздачи', risk: 'high', category: 'fake_giveaway' },
    { id: 55, name: 'Тайм-коды', risk: 'low', category: 'timestamp' },
    // Дополнительные 96-105
    { id: 96, name: 'Теги местоположений', risk: 'low', category: 'geo' },
    { id: 97, name: 'Подписки на рассылку', risk: 'low', category: 'newsletter' },
    { id: 98, name: 'Фейковые конкурсы в Stories', risk: 'medium', category: 'contest' },
    { id: 99, name: 'Упоминания в карусели', risk: 'medium', category: 'carousel' },
    { id: 100, name: 'Ответы на вопросы в Stories', risk: 'low', category: 'qa' },
    { id: 101, name: 'Фейковые отзывы под товарами', risk: 'high', category: 'fake_review' },
    { id: 102, name: 'Предупреждение о мошенниках', risk: 'medium', category: 'warning' },
    { id: 103, name: 'Сравнение с конкурентами', risk: 'medium', category: 'comparison' },
    { id: 104, name: 'Фейковые новости о блокировке', risk: 'high', category: 'fake_news' },
    { id: 105, name: 'Приглашение в закрытый чат', risk: 'low', category: 'exclusive' },
  ],
  tiktok: [
    // Оригинальные 18-23
    { id: 18, name: 'Нейрокомментинг', risk: 'low', category: 'comment' },
    { id: 19, name: 'Telegram перелив', risk: 'low', category: 'cross' },
    { id: 20, name: 'Duet-реакции', risk: 'low', category: 'duet' },
    { id: 21, name: 'Авто-лайки', risk: 'low', category: 'engagement' },
    { id: 22, name: 'Ответы автору', risk: 'low', category: 'reply' },
    { id: 23, name: 'Спам через звуки', risk: 'medium', category: 'sound' },
    // Новые 56-63
    { id: 56, name: 'Повторы фразы', risk: 'medium', category: 'spam' },
    { id: 57, name: 'Фейковые переводы', risk: 'medium', category: 'fake_translation' },
    { id: 58, name: 'Спойлеры', risk: 'medium', category: 'spoiler' },
    { id: 59, name: 'Сравнения', risk: 'medium', category: 'comparison' },
    { id: 60, name: 'Фейковые факты', risk: 'high', category: 'fake_fact' },
    { id: 61, name: 'Предупреждения', risk: 'medium', category: 'warning' },
    { id: 62, name: 'Продолжение следует', risk: 'low', category: 'teaser' },
    { id: 63, name: 'Фейковые разоблачения автора', risk: 'high', category: 'expose' },
    // Дополнительные 106-115
    { id: 106, name: 'Комментарии-песни', risk: 'low', category: 'rhyme' },
    { id: 107, name: 'Фейковые челленджи', risk: 'medium', category: 'challenge' },
    { id: 108, name: 'Разбор ошибок автора', risk: 'medium', category: 'correction' },
    { id: 109, name: 'Угадайка', risk: 'low', category: 'game' },
    { id: 110, name: 'Предсказание будущего видео', risk: 'low', category: 'prediction' },
    { id: 111, name: 'Фейковые инсайды', risk: 'high', category: 'fake_insider' },
    { id: 112, name: 'Продолжение истории', risk: 'low', category: 'storytelling' },
    { id: 113, name: 'Фейковые сливы курсов', risk: 'high', category: 'fake_leak' },
    { id: 114, name: 'Обучение бесплатно', risk: 'low', category: 'education' },
    { id: 115, name: 'Фейковые раздачи подарков', risk: 'high', category: 'fake_giveaway' },
  ],
  cross_platform: [
    // Оригинальные 24-30
    { id: 24, name: 'TikTok → Telegram', risk: 'low', category: 'funnel' },
    { id: 25, name: 'Instagram → Telegram', risk: 'low', category: 'funnel' },
    { id: 26, name: 'YouTube → Telegram', risk: 'low', category: 'funnel' },
    { id: 27, name: 'Twitter → Telegram', risk: 'low', category: 'funnel' },
    { id: 28, name: 'Pinterest → Telegram', risk: 'low', category: 'funnel' },
    { id: 29, name: 'Reddit → Telegram', risk: 'medium', category: 'funnel' },
    { id: 30, name: 'LinkedIn → Telegram', risk: 'low', category: 'funnel' },
    // Новые 64-73
    { id: 64, name: 'YouTube Shorts → Telegram', risk: 'low', category: 'funnel' },
    { id: 65, name: 'VK → Telegram', risk: 'low', category: 'funnel' },
    { id: 66, name: 'Discord → Telegram', risk: 'medium', category: 'funnel' },
    { id: 67, name: 'Twitch → Telegram', risk: 'medium', category: 'funnel' },
    { id: 68, name: 'Facebook → Telegram', risk: 'medium', category: 'funnel' },
    { id: 69, name: 'Threads → Telegram', risk: 'low', category: 'funnel' },
    { id: 70, name: 'Pinterest (extended) → Telegram', risk: 'low', category: 'funnel' },
    { id: 71, name: 'Quora → Telegram', risk: 'low', category: 'funnel' },
    { id: 72, name: 'Medium → Telegram', risk: 'low', category: 'funnel' },
    { id: 73, name: 'Telegram → WhatsApp', risk: 'low', category: 'cross' },
    // Дополнительные 116-125
    { id: 116, name: 'Bluesky → Telegram', risk: 'low', category: 'funnel' },
    { id: 117, name: 'Threads (extended) → Telegram', risk: 'low', category: 'funnel' },
    { id: 118, name: 'LinkedIn (B2B) → Telegram', risk: 'low', category: 'funnel' },
    { id: 119, name: 'Pinterest (pins) → Telegram', risk: 'low', category: 'funnel' },
    { id: 120, name: 'Snapchat Spotlight → Telegram', risk: 'medium', category: 'funnel' },
    { id: 121, name: 'Reddit (posts) → Telegram', risk: 'medium', category: 'funnel' },
    { id: 122, name: 'Quora (answers) → Telegram', risk: 'low', category: 'funnel' },
    { id: 123, name: 'Medium (articles) → Telegram', risk: 'low', category: 'funnel' },
    { id: 124, name: 'Discord (servers) → Telegram', risk: 'medium', category: 'funnel' },
    { id: 125, name: 'Twitch (chats) → Telegram', risk: 'medium', category: 'funnel' },
  ],
  ai_powered: [
    // Оригинальные 74-80
    { id: 74, name: 'Фейковые скриншоты переписок', risk: 'high', category: 'fake_content' },
    { id: 75, name: 'Фейковые отзывы на отзовиках', risk: 'high', category: 'fake_review' },
    { id: 76, name: 'Фейковые новостные заголовки', risk: 'high', category: 'fake_news' },
    { id: 77, name: 'Авто-создание вики-страниц', risk: 'extreme', category: 'seo' },
    { id: 78, name: 'Фейковые мемы с водяным знаком', risk: 'medium', category: 'meme' },
    { id: 79, name: 'Авто-создание тредов на Reddit', risk: 'medium', category: 'reddit' },
    { id: 80, name: 'Фейковые разоблачительные видео', risk: 'high', category: 'fake_video' },
    // Дополнительные 126-130
    { id: 126, name: 'Фейковые диалоги с автором', risk: 'high', category: 'fake_dialog' },
    { id: 127, name: 'Фейковые письма поддержки', risk: 'extreme', category: 'impersonation' },
    { id: 128, name: 'Фейковые новостные скриншоты', risk: 'high', category: 'fake_news' },
    { id: 129, name: 'Фейковые TikTok-тренды', risk: 'medium', category: 'fake_trend' },
    { id: 130, name: 'Авто-создание сайтов-однодневок', risk: 'medium', category: 'landing' },
  ],
};

// DeepSeek промпты для ТОП-15 методов
export const DEEPSEEK_PROMPTS: Record<number, { system: string; user: string }> = {
  // 1. Канал-невидимка
  82: {
    system: `Ты создаёшь интригующие комментарии, которые создают ощущение эксклюзивного доступа.
Цель: заставить пользователя написать "+" чтобы получить ссылку на приватный канал.
Тон: загадочный, эксклюзивный, без прямой рекламы.`,
    user: `Напиши комментарий для поста на тему "{topic}".
Формат: "У меня есть доступ к закрытому каналу по [теме]. Кто хочет — + в комменты, пришлю ссылку".
Не используй прямую ссылку в комментарии.`,
  },
  // 2. Фейковые вакансии
  86: {
    system: `Ты пишешь комментарии-вакансии от имени HR или рекрутёра.
Цель: предложить "высокую зарплату" и привлечь в Telegram-канал.
Тон: профессиональный, но не слишком официальный.`,
    user: `Напиши комментарий-вакансию под постом на тему "{topic}".
Формат: "Ищем удалённого специалиста, платим {salary}$ в месяц. Подробности в канале @{channel}".
Добавь деталь: "опыт не важен" или "обучение бесплатно".`,
  },
  // 3. Личный опыт
  92: {
    system: `Ты пишешь от первого лица историю о том, как тебе помог Telegram-канал.
Цель: создать доверие и желание подписаться.
Тон: искренний, личный, не рекламный.`,
    user: `Напиши комментарий от первого лица: "У меня была такая же проблема. Помог канал @{channel}, там [краткое описание решения]".
Тема поста: {topic}. Оффер: {offer}.
История должна быть короткой (2-3 предложения) и правдоподобной.`,
  },
  // 4. Фейковые скрины доходов
  93: {
    system: `Ты создаёшь текст для комментария, к которому будет прикреплён скриншот "дохода".
Цель: вызвать зависть и желание узнать, как заработать так же.
Тон: хвастливый, но не слишком.`,
    user: `Напиши короткий комментарий для поста на тему "{topic}".
Формат: "Наконец-то дошло до [сумма]$ в месяц. Спасибо каналу @{channel}".
К комментарию будет прикреплён скриншот.`,
  },
  // 5. Теги местоположений (Instagram)
  96: {
    system: `Ты пишешь комментарии с упоминанием геолокации.
Цель: создать связь "я тоже из этого города" и предложить оффер.
Тон: дружелюбный, локальный.`,
    user: `Напиши комментарий под постом из города {city}.
Формат: "Я тоже из {city}! Нашёл тут способ зарабатывать онлайн — канал @{channel}".
Упомяни город естественно.`,
  },
  // 6. Фейковые отзывы под товарами
  101: {
    system: `Ты пишешь фейковые отзывы под постами с товарами конкурентов.
Цель: предложить "более выгодный вариант".
Тон: как реальный покупатель, не реклама.`,
    user: `Пост рекламирует {product}. Напиши комментарий от лица покупателя:
"У них дорого. Я заказал там же на 30% дешевле в @{channel}".
Добавь деталь про доставку или качество.`,
  },
  // 7. Предупреждение о мошенниках
  102: {
    system: `Ты пишешь предупреждения о "мошенниках" с предложением проверенного варианта.
Цель: социальная инженерия — доверие через "помощь".
Тон: заботливый, предостерегающий.`,
    user: `Напиши комментарий: "Осторожно, на этом рынке много мошенников. Сам чуть не попался.
Реальный и проверенный канал — @{channel}".
Тема: {topic}. Добавь эмоцию: "чуть не потерял 500$".`,
  },
  // 8. Комментарии-песни
  106: {
    system: `Ты создаёшь рифмованные комментарии в виде четверостиший.
Цель: выделиться среди обычных комментариев.
Формат: 4 строки с рифмой, в конце намёк на канал.`,
    user: `Напиши короткое четверостишие (4 строки) на тему {topic}.
Рифма: перекрёстная или парная.
В последней строке — намёк на Telegram-канал @{channel}.`,
  },
  // 9. Разбор ошибок автора
  108: {
    system: `Ты пишешь комментарии с критикой автора и предложением "правильного разбора".
Цель: интрига и переход в Telegram.
Тон: экспертный, но не агрессивный.`,
    user: `Пост автора на тему {topic}. Напиши комментарий:
"Автор допустил 3 ошибки. Полный разбор ошибок выложил в Telegram — @{channel}".
Не указывай сами ошибки (интрига). Добавь эмодзи: 🔍, ❌, ✅.`,
  },
  // 10. Фейковые сливы курсов
  113: {
    system: `Ты предлагаешь "бесплатный слив" платного курса.
Цель: привлечь желающих получить знания бесплатно.
Тон: щедрый, ограниченный по времени.`,
    user: `Напиши комментарий: "Слив курса [имя блогера] бесплатно. Ссылка в Telegram @{channel}".
Тема: {topic}. Добавь: "только сегодня" или "успевай".`,
  },
  // 11. Bluesky
  116: {
    system: `Ты пишешь комментарии для новой платформы Bluesky.
Цель: привлечь аудиторию в Telegram.
Тон: дружелюбный, не спамовый.`,
    user: `Напиши короткий комментарий для Bluesky с призывом в Telegram.
Формат: "Более детально разобрал эту тему в Telegram — @{channel}".
Тема: {topic}. Без спама, дружелюбно.`,
  },
  // 12. Threads
  117: {
    system: `Ты пишешь ответы в Threads (платформа от Instagram/Meta).
Цель: добавить ценность и пригласить в Telegram.
Тон: полезный, не рекламный.`,
    user: `Тред на тему {topic}. Напиши ответ, который добавляет ценность,
а в конце — намёк на Telegram: "У меня в Telegram выложил пошаговый гайд — @{channel}".`,
  },
  // 13. Reddit
  121: {
    system: `Ты пишешь развёрнутые ответы на Reddit.
Цель: быть полезным и в конце упомянуть Telegram.
Тон: экспертный, полезный, не спамовый.`,
    user: `Вопрос на Reddit: {question}. Напиши полезный развёрнутый ответ (50-100 слов).
В конце добавь: "Если интересно, у меня есть Telegram-канал с ещё более детальным разбором — @{channel}".
Ответ должен быть реально полезным.`,
  },
  // 14. Фейковые новостные скриншоты
  128: {
    system: `Ты создаёшь заголовки для фейковых новостных скриншотов.
Цель: кликбейт, который привлекает внимание.
Тон: журналистский, сенсационный.`,
    user: `Придумай заголовок новости про {topic} от имени {source}.
Пример: "Forbes: инвестиции в крипту принесли 400% за 2025 год".
Заголовок должен выглядеть правдоподобно.`,
  },
  // 15. Сайты-однодневки
  130: {
    system: `Ты создаёшь продающий текст для лендинга.
Цель: убедить перейти в Telegram.
Тон: продающий, но не спамовый.`,
    user: `Создай текст для HTML-страницы:
- Заголовок: продающий заголовок про {topic}
- Описание: 2-3 предложения
- CTA: "Перейти в Telegram для получения доступа"
Текст должен быть коротким и убедительным.`,
  },
};

// GET /api/traffic/methods - Get all methods
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const methodId = searchParams.get('methodId');
    const risk = searchParams.get('risk');

    // Get specific method
    if (methodId) {
      const id = parseInt(methodId);
      let method: { id: number; name: string; risk: string; category: string; platform: string; prompt: { system: string; user: string } | undefined } | null = null;
      
      for (const [cat, methods] of Object.entries(TRAFFIC_METHODS)) {
        const found = methods.find(m => m.id === id);
        if (found) {
          method = { ...found, platform: cat, prompt: DEEPSEEK_PROMPTS[id] };
          break;
        }
      }

      if (!method) {
        return NextResponse.json({ error: 'Method not found' }, { status: 404 });
      }

      // Get from database
      const dbMethod = await db.trafficMethodExtended.findUnique({
        where: { methodId: id },
      });

      return NextResponse.json({ method, dbConfig: dbMethod });
    }

    // Filter by category
    let filteredMethods: typeof TRAFFIC_METHODS = TRAFFIC_METHODS;
    if (category && category in TRAFFIC_METHODS) {
      filteredMethods = { [category]: TRAFFIC_METHODS[category as keyof typeof TRAFFIC_METHODS] } as typeof TRAFFIC_METHODS;
    }

    // Count total
    const totalMethods = Object.values(TRAFFIC_METHODS).flat().length;
    
    return NextResponse.json({
      methods: filteredMethods,
      totalMethods,
      categories: Object.keys(TRAFFIC_METHODS),
      counts: {
        telegram: TRAFFIC_METHODS.telegram.length,
        instagram: TRAFFIC_METHODS.instagram.length,
        tiktok: TRAFFIC_METHODS.tiktok.length,
        cross_platform: TRAFFIC_METHODS.cross_platform.length,
        ai_powered: TRAFFIC_METHODS.ai_powered.length,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch traffic methods', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch traffic methods' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/methods - Generate content for method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, topic, channel, offer, city, product, question, source, salary } = body;

    if (!methodId) {
      return NextResponse.json(
        { error: 'Method ID is required' },
        { status: 400 }
      );
    }

    const prompt = DEEPSEEK_PROMPTS[methodId];
    if (!prompt) {
      return NextResponse.json(
        { error: 'No prompt template for this method' },
        { status: 404 }
      );
    }

    // Build user prompt with replacements
    let userPrompt = prompt.user
      .replace('{topic}', topic || 'общая тема')
      .replace('{channel}', channel || 'channel_name')
      .replace('{offer}', offer || 'оффер')
      .replace('{city}', city || 'Москва')
      .replace('{product}', product || 'товар')
      .replace('{question}', question || 'общий вопрос')
      .replace('{source}', source || 'Forbes')
      .replace('{salary}', salary || '5000');

    // Generate with DeepSeek
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
    });

    const generatedContent = completion.choices[0]?.message?.content || '';

    // Generate multiple variants
    const variants: string[] = [generatedContent];
    for (let i = 0; i < 2; i++) {
      const variant = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9,
      });
      if (variant.choices[0]?.message?.content) {
        variants.push(variant.choices[0].message.content);
      }
    }

    // Update method usage count
    await db.trafficMethodExtended.upsert({
      where: { methodId },
      update: {},
      create: {
        methodId,
        name: `Method ${methodId}`,
        category: 'general',
        description: '',
        riskLevel: 'medium',
      },
    });

    logger.info('Traffic method content generated', { methodId });

    return NextResponse.json({
      success: true,
      methodId,
      variants,
      primary: generatedContent,
      prompt: { system: prompt.system, user: userPrompt },
    });
  } catch (error) {
    logger.error('Failed to generate traffic method content', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/methods - Update method configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, config } = body;

    if (!methodId) {
      return NextResponse.json(
        { error: 'Method ID is required' },
        { status: 400 }
      );
    }

    const method = await db.trafficMethodExtended.upsert({
      where: { methodId },
      update: {
        systemPrompt: config.systemPrompt,
        userPrompt: config.userPrompt,
        defaultConfig: config.defaultConfig ? JSON.stringify(config.defaultConfig) : undefined,
        maxPerDay: config.maxPerDay,
        maxPerHour: config.maxPerHour,
        cooldownMinutes: config.cooldownMinutes,
        isActive: config.isActive ?? true,
      },
      create: {
        methodId,
        name: config.name || `Method ${methodId}`,
        category: config.category || 'general',
        description: config.description || '',
        riskLevel: config.riskLevel || 'medium',
        systemPrompt: config.systemPrompt,
        userPrompt: config.userPrompt,
        defaultConfig: config.defaultConfig ? JSON.stringify(config.defaultConfig) : undefined,
        maxPerDay: config.maxPerDay || 100,
        maxPerHour: config.maxPerHour || 20,
        cooldownMinutes: config.cooldownMinutes || 5,
        isActive: config.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, method });
  } catch (error) {
    logger.error('Failed to update traffic method', error as Error);
    return NextResponse.json(
      { error: 'Failed to update method' },
      { status: 500 }
    );
  }
}

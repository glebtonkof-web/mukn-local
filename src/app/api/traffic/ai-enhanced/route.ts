import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';

// ==================== AI-ENHANCED TRAFFIC METHODS ====================

// AI-enhanced методы (74-80, 126-130)
export const AI_ENHANCED_METHODS: Record<string, {
  id: number;
  name: string;
  description: string;
  prompt: string;
  generateImage: boolean;
  imagePrompt?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  category: string;
}> = {
  // Методы 74-80
  fake_screenshot: {
    id: 74,
    name: 'Генерация фейковых скриншотов',
    description: 'AI-генерация реалистичных скриншотов переписок, доходов, уведомлений',
    prompt: `Создай описание фейкового скриншота.
Тип: {type}. Ниша: {niche}. Данные: {data}.
Опиши что должно быть на изображении:
- Заголовок/шапка
- Основной контент
- Детали (дата, сумма, имя)
Формат: JSON с полями header, content, details.`,
    generateImage: true,
    imagePrompt: 'A realistic screenshot of {type} showing {data}. High quality, professional, no artifacts. Platform: {platform}.',
    riskLevel: 'high',
    category: 'fake_content',
  },
  fake_review: {
    id: 75,
    name: 'AI-генерация отзывов',
    description: 'Генерация реалистичных отзывов для разных платформ',
    prompt: `Напиши фейковый отзыв.
Товар/услуга: {product}. Рейтинг: {rating}/5. Ниша: {niche}.
Платформа: {platform}.
Отзыв должен выглядеть реалистично:
- Естественный язык
- Детали использования
- Эмоциональная окраска
- Длина: {length} слов.`,
    generateImage: false,
    riskLevel: 'high',
    category: 'fake_content',
  },
  fake_news_gen: {
    id: 76,
    name: 'Генерация фейковых новостей',
    description: 'Создание вирусных новостных заголовков и статей',
    prompt: `Создай фейковую новость.
Тема: {topic}. Ниша: {niche}. Источник: {source}.
Новость должна быть вирусной, но правдоподобной:
- Сенсационный заголовок
- Краткое содержание (2-3 предложения)
- Цитата "эксперта"
- Призыв к действию (подписаться на канал {channel}).`,
    generateImage: true,
    imagePrompt: 'News article screenshot about {topic}. Professional journalism style. Source: {source}. Headline visible.',
    riskLevel: 'high',
    category: 'fake_content',
  },
  wiki_page: {
    id: 77,
    name: 'Создание фейковых Wiki страниц',
    description: 'Генерация энциклопедического контента для SEO',
    prompt: `Создай контент для фейковой Wiki страницы.
Тема: {topic}. Стиль: энциклопедический.
Структура:
1. Краткое определение (2-3 предложения)
2. История вопроса
3. Основные аспекты (3-5 пунктов)
4. Интересные факты
5. Ссылки и цитаты
Формат: Markdown.`,
    generateImage: false,
    riskLevel: 'extreme',
    category: 'seo',
  },
  meme_gen: {
    id: 78,
    name: 'AI-генерация мемов',
    description: 'Создание вирусных мемов с водяным знаком',
    prompt: `Создай текст для мема.
Тема: {topic}. Формат: {format}. Ниша: {niche}.
Текст должен быть смешным и вирусным:
- Верхний текст: {topText}
- Нижний текст: {bottomText}
- Альтернативные варианты (3 шт.)
Мем должен побуждать перейти в канал {channel}.`,
    generateImage: true,
    imagePrompt: 'Meme image about {topic}. Format: {format}. Funny, shareable, viral quality. Style: {style}.',
    riskLevel: 'medium',
    category: 'viral',
  },
  reddit_thread: {
    id: 79,
    name: 'Создание фейковых Reddit тредов',
    description: 'Генерация правдоподобных обсуждений на Reddit',
    prompt: `Создай фейковый Reddit тред.
Сабреддит: r/{subreddit}. Тема: {topic}.
Включи:
1. Заголовок поста (кликбейтный)
2. Текст поста (200-300 слов)
3. 5 комментариев от разных "пользователей":
   - Поддерживающий
   - Скептический
   - Вопрос
   - Личный опыт
   - Ссылка на "источник" (канал {channel})`,
    generateImage: false,
    riskLevel: 'medium',
    category: 'social',
  },
  video_script: {
    id: 80,
    name: 'AI-сценарии для видео',
    description: 'Генерация сценариев для TikTok/Reels/YouTube',
    prompt: `Создай сценарий для видео.
Тема: {topic}. Длительность: {duration} секунд. Платформа: {platform}.
Формат:
1. Хук (первые 3 секунды)
2. Основной контент
3. CTA (призыв к действию)
4. Визуальные указания (что показывать)
5. Текст на экране
Цель: привести в Telegram-канал {channel}.`,
    generateImage: false,
    riskLevel: 'low',
    category: 'content',
  },
  // Методы 126-130
  ai_landing: {
    id: 126,
    name: 'Авто-создание лендингов',
    description: 'Генерация HTML-кода лендингов для офферов',
    prompt: `Создай HTML контент для лендинга.
Ниша: {niche}. Оффер: {offer}. Тип шаблона: {templateType}.
Включи:
1. Заголовок (кликбейтный)
2. Подзаголовок (выгода)
3. 3 преимущества (с иконками)
4. Социальные доказательства (отзывы)
5. CTA кнопка (текст: {ctaText})
6. Таймер обратного отсчёта
7. Ссылка на Telegram: {channel}
Формат: чистый HTML с inline CSS.`,
    generateImage: false,
    riskLevel: 'medium',
    category: 'landing',
  },
  ai_avatar: {
    id: 127,
    name: 'Генерация AI аватаров',
    description: 'Создание персонажей для инфлюенсеров',
    prompt: `Опиши аватар для AI-персонажа.
Ниша: {niche}. Стиль: {style}. Возраст: {age}.
Описание должно включать:
- Внешность (лицо, волосы, глаза)
- Одежда и стиль
- Фон изображения
- Эмоция/выражение лица
- Аксессуары
Целевая аудитория: {audience}.`,
    generateImage: true,
    imagePrompt: 'Portrait of {description}. Professional photo, high quality, {style} style. Age: {age}. Background: {background}.',
    riskLevel: 'low',
    category: 'persona',
  },
  ai_voice: {
    id: 128,
    name: 'AI-голоса для комментов',
    description: 'Генерация текста для озвучки голосовых комментариев',
    prompt: `Создай текст для озвучки голосового комментария.
Тема: {topic}. Длительность: {duration} сек. Тон: {tone}.
Текст должен:
- Звучать естественно в устной речи
- Не содержать сложных слов
- Иметь паузы и интонацию
- Включать призыв к действию
- Ссылка на канал: {channel}`,
    generateImage: false,
    riskLevel: 'low',
    category: 'voice',
  },
  ai_translation: {
    id: 129,
    name: 'Авто-перевод контента',
    description: 'Адаптация контента для разных языков и культур',
    prompt: `Переведи и адаптируй контент.
Исходный текст: {text}.
Целевой язык: {targetLang}.
Сохрани смысл и тон оригинала.
Адаптируй:
- Идиомы и метафоры
- Культурные ссылки
- Названия (при необходимости)
- CTA под локальную аудиторию
Формат: {format}.`,
    generateImage: false,
    riskLevel: 'low',
    category: 'localization',
  },
  ai_optimization: {
    id: 130,
    name: 'AI-оптимизация контента',
    description: 'Улучшение контента для максимального CTR',
    prompt: `Оптимизируй контент для максимального CTR.
Исходный текст: {text}.
Ниша: {niche}. Платформа: {platform}.
Улучши:
1. Заголовок (A/B варианты - 3 шт.)
2. Первый абзац (хук)
3. CTA (3 варианта)
4. Структура (пули, абзацы)
5. Эмодзи и форматирование
Верни оптимизированную версию и объяснения изменений.`,
    generateImage: false,
    riskLevel: 'low',
    category: 'optimization',
  },
};

// Дополнительные расширенные методы Telegram (31-50)
export const TELEGRAM_EXTENDED_METHODS: Record<string, {
  id: number;
  name: string;
  description: string;
  prompt: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}> = {
  bulk_dm: {
    id: 31,
    name: 'Массовые DM',
    description: 'Массовая рассылка личных сообщений',
    prompt: 'Создай текст для массовой DM-рассылки. Тема: {topic}. Канал: {channel}. Персонализация: {personalization}.',
    riskLevel: 'high',
  },
  channel_comment: {
    id: 32,
    name: 'Комменты в каналах',
    description: 'Автоматические комментарии в каналах',
    prompt: 'Напиши комментарий для канала. Тема поста: {topic}. Тон: {tone}. Ссылка на канал: {channel}.',
    riskLevel: 'low',
  },
  group_spam: {
    id: 33,
    name: 'Спам в группах',
    description: 'Автоматический спам в Telegram группах',
    prompt: 'Создай сообщение для группы. Тема: {topic}. Ниша: {niche}. Ссылка: {channel}.',
    riskLevel: 'high',
  },
  bot_trap: {
    id: 34,
    name: 'Ловушки через ботов',
    description: 'Создание ботов-ловушек для привлечения',
    prompt: 'Создай сценарий бота. Цель: {goal}. Ниша: {niche}. Оффер: {offer}.',
    riskLevel: 'medium',
  },
  forward_chain: {
    id: 35,
    name: 'Цепочки пересылок',
    description: 'Вирусные цепочки через пересылки',
    prompt: 'Создай текст для вирусной пересылки. Тема: {topic}. Призыв: {cta}.',
    riskLevel: 'medium',
  },
  reaction_bait: {
    id: 36,
    name: 'Реакции-наживки',
    description: 'Привлечение внимания через реакции',
    prompt: 'Опиши стратегию реакций. Пост: {postContent}. Цель: {goal}.',
    riskLevel: 'low',
  },
  story_reply: {
    id: 37,
    name: 'Ответы на Stories',
    description: 'Авто-ответы на Telegram Stories',
    prompt: 'Напиши ответ на Story. Контент Story: {storyContent}. Тон: {tone}.',
    riskLevel: 'low',
  },
  gift_scam: {
    id: 38,
    name: 'Фейковые подарки',
    description: 'Розыгрыши фейковых подарков',
    prompt: 'Создай текст розыгрыша. Приз: {prize}. Условие: подписка на {channel}.',
    riskLevel: 'high',
  },
  auto_reply_bot: {
    id: 39,
    name: 'Авто-ответы ботами',
    description: 'Боты с авто-ответами на команды',
    prompt: 'Создай команды бота. Функционал: {features}. Канал: {channel}.',
    riskLevel: 'medium',
  },
  typo_correction: {
    id: 40,
    name: 'Исправление ошибок',
    description: 'Комментарии с "исправлением ошибок"',
    prompt: 'Напиши комментарий с исправлением. Оригинал: {original}. Вставь ссылку на {channel}.',
    riskLevel: 'low',
  },
  author_quote: {
    id: 41,
    name: 'Цитаты автора',
    description: 'Цитирование автора с добавкой',
    prompt: 'Процитируй автора и добавь свой текст. Оригинал: {original}. Ссылка: {channel}.',
    riskLevel: 'low',
  },
  prediction: {
    id: 42,
    name: 'Предсказания',
    description: 'Комментарии-предсказания',
    prompt: 'Напиши предсказание. Тема: {topic}. Результат в канале: {channel}.',
    riskLevel: 'medium',
  },
  fake_contest: {
    id: 43,
    name: 'Фейковые конкурсы',
    description: 'Создание фейковых конкурсов',
    prompt: 'Создай текст конкурса. Приз: {prize}. Условие: подписка на {channel}.',
    riskLevel: 'high',
  },
  complaint_bait: {
    id: 44,
    name: 'Жалобы-наживки',
    description: 'Провокации через жалобы',
    prompt: 'Создай провокационный комментарий. Тема: {topic}. Цель: {goal}.',
    riskLevel: 'extreme',
  },
  offtop: {
    id: 45,
    name: 'Оффтоп',
    description: 'Оффтопные комментарии с рекламой',
    prompt: 'Напиши оффтопный комментарий. Переход к теме: {topic}. Ссылка: {channel}.',
    riskLevel: 'medium',
  },
  personal_story: {
    id: 46,
    name: 'Личная история',
    description: 'Комментарии с личными историями',
    prompt: 'Напиши личную историю. Тема: {topic}. Решение в канале: {channel}.',
    riskLevel: 'low',
  },
  disagreement: {
    id: 47,
    name: 'Несогласие',
    description: 'Комментарии с несогласием',
    prompt: 'Напиши аргументированное несогласие. Тема: {topic}. Альтернатива в {channel}.',
    riskLevel: 'medium',
  },
  friend_tag: {
    id: 48,
    name: 'Теги друзей',
    description: 'Комментарии с тегами друзей',
    prompt: 'Создай комментарий с призывом тегнуть друга. Тема: {topic}. Ссылка: {channel}.',
    riskLevel: 'medium',
  },
  fake_expose: {
    id: 49,
    name: 'Фейковые разоблачения',
    description: 'Разоблачительные комментарии',
    prompt: 'Создай разоблачение. Объект: {target}. Правда в канале: {channel}.',
    riskLevel: 'high',
  },
  trap_poll: {
    id: 50,
    name: 'Опросы с подвохом',
    description: 'Опросы-ловушки для привлечения',
    prompt: 'Создай опрос-ловушку. Тема: {topic}. Результат в канале: {channel}.',
    riskLevel: 'medium',
  },
};

// GET - Получить все методы
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const methodId = searchParams.get('methodId');
    const category = searchParams.get('category');
    const all = searchParams.get('all') === 'true';

    // Получить конкретный метод
    if (methodId) {
      const id = parseInt(methodId);
      
      // Поиск в AI-enhanced методах
      let method = Object.entries(AI_ENHANCED_METHODS).find(([, m]) => m.id === id);
      if (method) {
        const [, methodData] = method;
        
        // Получить конфигурацию из БД
        const dbMethod = await db.trafficMethod.findUnique({
          where: { methodNumber: id },
        });
        
        // Получить выполнения
        const executions = await db.trafficMethodExecution.findMany({
          where: { methodId: dbMethod?.id },
          take: 10,
          orderBy: { createdAt: 'desc' },
        });
        
        return NextResponse.json({
          method: {
            key: method[0],
            ...methodData,
            dbConfig: dbMethod,
            executions,
          },
        });
      }
      
      // Поиск в расширенных Telegram методах
      let telegramMethod = Object.entries(TELEGRAM_EXTENDED_METHODS).find(([, m]) => m.id === id);
      if (telegramMethod) {
        const [, methodData] = telegramMethod;
        
        const dbMethod = await db.trafficMethod.findUnique({
          where: { methodNumber: id },
        });
        
        return NextResponse.json({
          method: {
            key: telegramMethod[0],
            ...methodData,
            dbConfig: dbMethod,
          },
        });
      }
      
      return NextResponse.json({ error: 'Method not found' }, { status: 404 });
    }

    // Получить методы по категории
    if (category === 'ai') {
      return NextResponse.json({
        methods: AI_ENHANCED_METHODS,
        count: Object.keys(AI_ENHANCED_METHODS).length,
      });
    }
    
    if (category === 'telegram_extended') {
      return NextResponse.json({
        methods: TELEGRAM_EXTENDED_METHODS,
        count: Object.keys(TELEGRAM_EXTENDED_METHODS).length,
      });
    }

    // Получить все методы
    if (all) {
      // Получить статистику из БД
      const dbMethods = await db.trafficMethod.findMany({
        where: {
          methodNumber: {
            in: [
              ...Object.values(AI_ENHANCED_METHODS).map(m => m.id),
              ...Object.values(TELEGRAM_EXTENDED_METHODS).map(m => m.id),
            ],
          },
        },
      });
      
      return NextResponse.json({
        aiEnhanced: AI_ENHANCED_METHODS,
        telegramExtended: TELEGRAM_EXTENDED_METHODS,
        total: Object.keys(AI_ENHANCED_METHODS).length + Object.keys(TELEGRAM_EXTENDED_METHODS).length,
        dbConfigs: dbMethods,
      });
    }

    // По умолчанию - вернуть сводку
    return NextResponse.json({
      summary: {
        aiEnhanced: {
          count: Object.keys(AI_ENHANCED_METHODS).length,
          ids: Object.values(AI_ENHANCED_METHODS).map(m => m.id),
          categories: [...new Set(Object.values(AI_ENHANCED_METHODS).map(m => m.category))],
        },
        telegramExtended: {
          count: Object.keys(TELEGRAM_EXTENDED_METHODS).length,
          ids: Object.values(TELEGRAM_EXTENDED_METHODS).map(m => m.id),
        },
        total: Object.keys(AI_ENHANCED_METHODS).length + Object.keys(TELEGRAM_EXTENDED_METHODS).length,
      },
      usage: {
        getMethod: '?methodId=74',
        getAiMethods: '?category=ai',
        getTelegramExtended: '?category=telegram_extended',
        getAll: '?all=true',
      },
    });
  } catch (error) {
    logger.error('Failed to fetch AI-enhanced methods', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch methods' },
      { status: 500 }
    );
  }
}

// POST - Выполнить AI метод
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, params } = body;

    if (!methodId) {
      return NextResponse.json(
        { error: 'Method ID is required' },
        { status: 400 }
      );
    }

    // Найти метод
    const methodEntry = Object.entries(AI_ENHANCED_METHODS).find(
      ([, m]) => m.id === parseInt(methodId)
    );
    
    if (!methodEntry) {
      // Проверить расширенные Telegram методы
      const telegramMethod = Object.entries(TELEGRAM_EXTENDED_METHODS).find(
        ([, m]) => m.id === parseInt(methodId)
      );
      
      if (telegramMethod) {
        const [key, method] = telegramMethod;
        return await generateTelegramMethodContent(key, method, params);
      }
      
      return NextResponse.json(
        { error: 'Method not found' },
        { status: 404 }
      );
    }

    const [methodKey, method] = methodEntry;

    // Инициализация AI
    const zai = await ZAI.create();

    // Подготовка промпта
    let prompt = method.prompt;
    
    // Замена плейсхолдеров
    const replacements: Record<string, string> = {
      '{type}': params?.type || 'income',
      '{niche}': params?.niche || 'gambling',
      '{data}': params?.data || '',
      '{product}': params?.product || 'товар',
      '{rating}': params?.rating || '5',
      '{platform}': params?.platform || 'telegram',
      '{length}': params?.length || '50',
      '{topic}': params?.topic || 'заработок',
      '{source}': params?.source || 'Forbes',
      '{channel}': params?.channel || '@channel',
      '{format}': params?.format || 'drake',
      '{style}': params?.style || 'modern',
      '{subreddit}': params?.subreddit || 'cryptocurrency',
      '{duration}': params?.duration || '30',
      '{offer}': params?.offer || 'оффер',
      '{templateType}': params?.templateType || 'leadgen',
      '{ctaText}': params?.ctaText || 'Подписаться',
      '{age}': params?.age || '25',
      '{audience}': params?.audience || 'мужчины 25-45',
      '{background}': params?.background || 'office',
      '{tone}': params?.tone || 'дружелюбный',
      '{targetLang}': params?.targetLang || 'en',
      '{text}': params?.text || '',
      '{topText}': params?.topText || '',
      '{bottomText}': params?.bottomText || '',
    };

    for (const [key, value] of Object.entries(replacements)) {
      prompt = prompt.replace(new RegExp(key, 'g'), value);
    }

    // Генерация текста через DeepSeek
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Ты - эксперт по созданию вирусного контента для трафика. 
Твоя задача - генерировать убедительный контент, который привлекает целевую аудиторию.
Всегда отвечай в запрошенном формате. Будь креативным, но правдоподобным.`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const generatedText = completion.choices[0]?.message?.content || '';

    // Генерация изображения если требуется
    let imageBase64: string | null = null;
    if (method.generateImage && method.imagePrompt) {
      let imagePrompt = method.imagePrompt;
      for (const [key, value] of Object.entries(replacements)) {
        imagePrompt = imagePrompt.replace(new RegExp(key, 'g'), value);
      }

      try {
        const imageResponse = await zai.images.generations.create({
          prompt: imagePrompt,
          size: '1024x1024',
        });
        imageBase64 = imageResponse.data[0]?.base64 || null;
      } catch (imgError) {
        logger.error('Failed to generate image', imgError as Error);
      }
    }

    // Генерация вариантов
    const variants: string[] = [generatedText];
    for (let i = 0; i < 2; i++) {
      try {
        const variantCompletion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'Ты - эксперт по созданию вирусного контента. Генерируй альтернативные варианты.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.9 + i * 0.05,
          max_tokens: 1500,
        });
        if (variantCompletion.choices[0]?.message?.content) {
          variants.push(variantCompletion.choices[0].message.content);
        }
      } catch {
        // Игнорируем ошибки генерации вариантов
      }
    }

    // Сохранить в БД
    const dbMethod = await db.trafficMethod.upsert({
      where: { methodNumber: method.id },
      update: {
        totalActions: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        methodNumber: method.id,
        name: method.name,
        description: method.description,
        platform: 'ai_enhanced',
        category: method.category,
        deepseekPrompt: method.prompt,
        isActive: true,
        status: 'active',
        riskLevel: method.riskLevel === 'extreme' ? 100 : 
                   method.riskLevel === 'high' ? 75 : 
                   method.riskLevel === 'medium' ? 50 : 25,
      },
    });

    // Создать запись выполнения
    const execution = await db.trafficMethodExecution.create({
      data: {
        methodId: dbMethod.id,
        targetPlatform: params?.platform || 'telegram',
        content: generatedText,
        aiGenerated: true,
        aiModel: 'deepseek',
        status: 'success',
        result: JSON.stringify({
          variants,
          hasImage: !!imageBase64,
          methodKey,
          params,
        }),
      },
    });

    // Сохранить в FakeContent если применимо
    if (method.category === 'fake_content' || method.category === 'landing') {
      await db.fakeContentGenerator.create({
        data: {
          contentType: methodKey.replace('fake_', '').replace('_gen', ''),
          template: JSON.stringify(params),
          imagePrompt: method.imagePrompt,
          platform: params?.platform || 'telegram',
          style: params?.style || 'real',
          methodId: method.id,
        },
      });
    }

    // Сохранить лендинг если ai_landing
    if (methodKey === 'ai_landing' && generatedText) {
      await db.landingPageProxy.create({
        data: {
          title: params?.topic || 'Auto-generated Landing',
          htmlContent: generatedText,
          telegramLink: params?.channel ? `https://t.me/${params.channel.replace('@', '')}` : null,
        },
      });
    }

    logger.info('AI-enhanced method executed', { 
      methodId: method.id, 
      methodKey,
      hasImage: !!imageBase64,
      executionId: execution.id,
    });

    return NextResponse.json({
      success: true,
      methodId: method.id,
      methodKey,
      methodName: method.name,
      generated: {
        text: generatedText,
        variants,
        imageBase64,
      },
      prompt: {
        system: 'Ты - эксперт по созданию вирусного контента для трафика.',
        user: prompt,
      },
      executionId: execution.id,
      riskLevel: method.riskLevel,
    });
  } catch (error) {
    logger.error('Failed to execute AI-enhanced method', error as Error);
    return NextResponse.json(
      { error: 'Failed to execute method', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Вспомогательная функция для Telegram методов
async function generateTelegramMethodContent(
  methodKey: string,
  method: { id: number; name: string; description: string; prompt: string; riskLevel: string },
  params: Record<string, string | number | undefined>
) {
  const zai = await ZAI.create();

  let prompt = method.prompt;
  const replacements: Record<string, string> = {
    '{topic}': (params?.topic as string) || 'заработок',
    '{channel}': (params?.channel as string) || '@channel',
    '{niche}': (params?.niche as string) || 'gambling',
    '{personalization}': (params?.personalization as string) || 'имя',
    '{tone}': (params?.tone as string) || 'дружелюбный',
    '{goal}': (params?.goal as string) || 'подписка',
    '{offer}': (params?.offer as string) || 'оффер',
    '{features}': (params?.features as string) || 'автоответы',
    '{original}': (params?.original as string) || '',
    '{prize}': (params?.prize as string) || 'iPhone 15',
    '{target}': (params?.target as string) || 'конкурент',
    '{postContent}': (params?.postContent as string) || '',
    '{storyContent}': (params?.storyContent as string) || '',
    '{cta}': (params?.cta as string) || 'подписаться',
  };

  for (const [key, value] of Object.entries(replacements)) {
    prompt = prompt.replace(new RegExp(key, 'g'), value);
  }

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты - эксперт по Telegram маркетингу. Создаёшь убедительный контент для привлечения аудитории.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 1000,
  });

  const generatedText = completion.choices[0]?.message?.content || '';

  // Сохранить в БД
  const dbMethod = await db.trafficMethod.upsert({
    where: { methodNumber: method.id },
    update: {
      totalActions: { increment: 1 },
      updatedAt: new Date(),
    },
    create: {
      methodNumber: method.id,
      name: method.name,
      description: method.description,
      platform: 'telegram',
      category: 'extended',
      deepseekPrompt: method.prompt,
      isActive: true,
      status: 'active',
      riskLevel: method.riskLevel === 'extreme' ? 100 :
                 method.riskLevel === 'high' ? 75 :
                 method.riskLevel === 'medium' ? 50 : 25,
    },
  });

  logger.info('Telegram extended method executed', { 
    methodId: method.id, 
    methodKey,
  });

  return NextResponse.json({
    success: true,
    methodId: method.id,
    methodKey,
    methodName: method.name,
    generated: {
      text: generatedText,
    },
    prompt,
    riskLevel: method.riskLevel,
  });
}

// PUT - Обновить конфигурацию метода
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, config, isActive } = body;

    if (!methodId) {
      return NextResponse.json(
        { error: 'Method ID is required' },
        { status: 400 }
      );
    }

    // Найти метод в конфигурации
    const aiMethod = Object.values(AI_ENHANCED_METHODS).find(m => m.id === methodId);
    const telegramMethod = Object.values(TELEGRAM_EXTENDED_METHODS).find(m => m.id === methodId);

    if (!aiMethod && !telegramMethod) {
      return NextResponse.json(
        { error: 'Method not found in configuration' },
        { status: 404 }
      );
    }

    const method = aiMethod || telegramMethod!;

    // Обновить в БД
    const updatedMethod = await db.trafficMethod.upsert({
      where: { methodNumber: methodId },
      update: {
        name: config?.name || method.name,
        description: config?.description || method.description,
        deepseekPrompt: config?.prompt || undefined,
        config: config ? JSON.stringify(config) : undefined,
        isActive: isActive ?? undefined,
        riskLevel: config?.riskLevel ? 
          (config.riskLevel === 'extreme' ? 100 :
           config.riskLevel === 'high' ? 75 :
           config.riskLevel === 'medium' ? 50 : 25) : undefined,
        updatedAt: new Date(),
      },
      create: {
        methodNumber: methodId,
        name: config?.name || method.name,
        description: config?.description || method.description,
        platform: aiMethod ? 'ai_enhanced' : 'telegram',
        category: aiMethod?.category || 'extended',
        deepseekPrompt: config?.prompt || (aiMethod?.prompt || telegramMethod?.prompt),
        config: config ? JSON.stringify(config) : undefined,
        isActive: isActive ?? true,
        status: 'active',
        riskLevel: method.riskLevel === 'extreme' ? 100 :
                   method.riskLevel === 'high' ? 75 :
                   method.riskLevel === 'medium' ? 50 : 25,
      },
    });

    logger.info('Traffic method configuration updated', { methodId });

    return NextResponse.json({
      success: true,
      method: updatedMethod,
      originalConfig: method,
    });
  } catch (error) {
    logger.error('Failed to update method configuration', error as Error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
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

      logger.info('Traffic method execution deleted', { executionId });

      return NextResponse.json({ success: true, deleted: 'execution' });
    }

    if (methodId) {
      // Деактивировать метод (не удалять полностью)
      await db.trafficMethod.update({
        where: { methodNumber: parseInt(methodId) },
        data: {
          isActive: false,
          status: 'deprecated',
          updatedAt: new Date(),
        },
      });

      logger.info('Traffic method deactivated', { methodId });

      return NextResponse.json({ success: true, action: 'deactivated' });
    }

    return NextResponse.json(
      { error: 'executionId or methodId is required' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Failed to delete', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    );
  }
}

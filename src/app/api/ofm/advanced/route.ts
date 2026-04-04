import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';
import { nanoid } from 'nanoid';

// Предустановленные промпты для разных ниш
const DEFAULT_PROMPTS: Record<string, Record<string, { system: string; examples: string[] }>> = {
  relationships: {
    comment: {
      system: `Ты — девушка 23 года. Пишешь комментарии в Telegram-каналах про отношения.
Твой стиль: естественный, с юмором, иногда провокационный.
Твои комментарии выглядят как сообщения реальной девушки, не содержат прямой рекламы.
Цель: привлечь внимание к твоему профилю, где есть ссылка на канал.`,
      examples: [
        'О, это в точку 😂 У меня в блоге подписчики такие милые, ни одного козла пока не встретила 👀',
        'Заметила странную закономерность: парни, которые уверены в себе, чаще приходят ко мне в блог. Совпадение? Не думаю 😏',
        'После прочтения этого поста захотелось написать своё мнение... Но лучше покажу в своём канале 💫',
      ],
    },
    story: {
      system: `Ты создаёшь короткие тексты для Telegram Stories (3-5 слов).
Цель: вызвать любопытство и желание кликнуть.
Формат: вопрос или интрига.`,
      examples: ['Кто хочет узнать больше? 👇', 'Только для избранных', 'Продолжение в канале'],
    },
    voice: {
      system: `Ты создаёшь короткие фразы для голосовых комментариев (до 5 секунд).
Тон: удивление, интерес, интрига.
Без прямой рекламы.`,
      examples: ['Ты такого ещё не видел', 'Смотри что у меня есть', 'Это нужно увидеть'],
    },
  },
  psychology: {
    comment: {
      system: `Ты — девушка, интересующаяся психологией.
Пишешь осмысленные комментарии в каналах про психологию и саморазвитие.
Твой стиль: вдумчивый, эмпатичный, но с лёгким намёком на свой канал.`,
      examples: [
        'Интересный взгляд! Я у себя в канале тоже разбираю похожие темы, но с другим подходом',
        'Психология — это круто, но иногда проще просто жить и чувствовать 🌸',
        'Заметила, что мои подписчики любят такие разборы. Могу скинуть ссылку, если интересно',
      ],
    },
    story: {
      system: `Ты создаёшь контент для Stories с психологическим уклоном.
Цель: вовлечь аудиторию в размышления.`,
      examples: ['Какой твой тип личности?', 'Узнай о себе больше', 'Тест на интуицию'],
    },
    voice: {
      system: `Голосовые сообщения с психологическим контекстом.`,
      examples: ['Интересная мысль', 'Надо обдумать', 'Подписывайся на разборы'],
    },
  },
  humor: {
    comment: {
      system: `Ты — девушка с отличным чувством юмора.
Пишешь смешные, остроумные комментарии в развлекательных каналах.
Цель: быть заметной через юмор.`,
      examples: [
        'Хаха, это прям в точку! Респект автору 🙌',
        'Лучший комментарий будет в моём канале... ой, я не сказала этого 😅',
        'После такого поста хочется жить дальше! Или нет... 🤔',
      ],
    },
    story: {
      system: `Юмористические Stories для привлечения внимания.`,
      examples: ['Смешнее только у меня', 'Продолжение следует', 'Не переключайтесь'],
    },
    voice: {
      system: `Смешные голосовые комментарии.`,
      examples: ['Ахаха это золото', 'Лучшее за сегодня', 'Надо запомнить'],
    },
  },
  business: {
    comment: {
      system: `Ты — девушка-предприниматель, успешная в своём деле.
Пишешь в бизнес-каналах, делишься опытом и мнениями.
Стиль: уверенный, профессиональный, но женственный.`,
      examples: [
        'Отличный кейс! У меня в канале похожая история, но с другими цифрами',
        'Как бизнес-леди скажу: это работает, проверено на себе 💼',
        'Интересный подход. Надо будет протестировать в следующем месяце',
      ],
    },
    story: {
      system: `Бизнес-контент для Stories.`,
      examples: ['Топ-5 инструментов', 'Мой секрет успеха', 'Бесплатный гайд внутри'],
    },
    voice: {
      system: `Голосовые для бизнес-аудитории.`,
      examples: ['Полезный инсайт', 'Записал себе', 'Деловой совет'],
    },
  },
  crypto: {
    comment: {
      system: `Ты — девушка, разбирающаяся в криптовалютах.
Пишешь в крипто-каналах, делишься аналитикой и мнениями.
Стиль: экспертный, но доступный.`,
      examples: [
        'Интересный проект, но я бы смотрела на биткоин сейчас 📊',
        'У меня в канале был разбор этого токена на прошлой неделе',
        'Хороший вход? Покажу свою стратегию в блоге',
      ],
    },
    story: {
      system: `Крипто-контент для Stories.`,
      examples: ['Токен месяца', 'Мой портфель', 'Сигнал внутри'],
    },
    voice: {
      system: `Голосовые для крипто-аудитории.`,
      examples: ['Смотрю на график', 'Интересный момент', 'Время покупать'],
    },
  },
  fitness: {
    comment: {
      system: `Ты — фитнес-девушка, ведёшь активный образ жизни.
Пишешь в каналах про спорт и здоровье.
Стиль: мотивирующий, позитивный.`,
      examples: [
        'Отличная тренировка! У меня в канале похожая программа 💪',
        'Результаты на лицо... точнее на тело 😅',
        'После месяца таких упражнений будет прогресс, проверено!',
      ],
    },
    story: {
      system: `Фитнес-контент для Stories.`,
      examples: ['Моя тренировка', 'Результат за месяц', 'Мотивация внутри'],
    },
    voice: {
      system: `Голосовые для фитнес-аудитории.`,
      examples: ['Давай тренироваться', 'Силён духом', 'Результат будет'],
    },
  },
  lifestyle: {
    comment: {
      system: `Ты — лайфстайл-блогер, делишься повседневной жизнью.
Пишешь в каналах про стиль, путешествия, еду.
Стиль: лёгкий, эстетичный.`,
      examples: [
        'Какое красивое место! Надо добавить в список желаний ✨',
        'Обожаю такие моменты, у себя в канале тоже делюсь подобным',
        'Это прям в моём вкусе! Респект за контент',
      ],
    },
    story: {
      system: `Лайфстайл-контент для Stories.`,
      examples: ['Мой день', 'Любимые места', 'Инста-локация'],
    },
    voice: {
      system: `Голосовые для лайфстайл-аудитории.`,
      examples: ['Красота какая', 'Надо посетить', 'В список желаний'],
    },
  },
  finance: {
    comment: {
      system: `Ты — девушка, разбирающаяся в финансах.
Пишешь в каналах про инвестиции, экономию, деньги.
Стиль: практичный, полезный.`,
      examples: [
        'Хорошая стратегия! Я у себя в канале разбираю похожие подходы',
        'Финансовая грамотность — это важно, рад что поднимаете тему',
        'Несколько месяцев использую этот метод, результаты есть',
      ],
    },
    story: {
      system: `Финансовый контент для Stories.`,
      examples: ['Лайфхак месяца', 'Как сэкономить', 'Инвестиция дня'],
    },
    voice: {
      system: `Голосовые для финансовой аудитории.`,
      examples: ['Деньги любят счёт', 'Хороший совет', 'Записал'],
    },
  },
};

// GET /api/ofm/advanced - Get prompt templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const niche = searchParams.get('niche');
    const contentType = searchParams.get('contentType');
    const style = searchParams.get('style');

    // Build where clause
    const where: Record<string, string | boolean | undefined> = { isActive: true };
    if (niche) where.niche = niche;
    if (contentType) where.contentType = contentType;
    if (style) where.style = style;

    // Get templates from DB
    const templates = await db.oFMPromptTemplate.findMany({
      where,
      orderBy: [{ niche: 'asc' }, { contentType: 'asc' }],
    });

    // If no templates in DB, return defaults
    if (templates.length === 0 && niche && contentType) {
      const defaultPrompt = DEFAULT_PROMPTS[niche]?.[contentType];
      if (defaultPrompt) {
        return NextResponse.json({
          templates: [],
          default: {
            niche,
            contentType,
            systemPrompt: defaultPrompt.system,
            examples: defaultPrompt.examples,
          },
          availableNiches: Object.keys(DEFAULT_PROMPTS),
          availableContentTypes: ['comment', 'story', 'voice', 'dm'],
        });
      }
    }

    return NextResponse.json({
      templates,
      defaults: DEFAULT_PROMPTS,
      availableNiches: Object.keys(DEFAULT_PROMPTS),
      availableContentTypes: ['comment', 'story', 'voice', 'dm'],
      availableStyles: ['playful', 'mysterious', 'friendly', 'provocative'],
    });
  } catch (error) {
    logger.error('Failed to fetch OFM prompt templates', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch OFM prompt templates' },
      { status: 500 }
    );
  }
}

// POST /api/ofm/advanced - Generate content with DeepSeek
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.niche || !body.contentType) {
      return NextResponse.json(
        { error: 'Niche and contentType are required' },
        { status: 400 }
      );
    }

    const niche = body.niche as string;
    const contentType = body.contentType as string;
    const style = body.style || 'playful';
    const customPrompt = body.customPrompt;
    const postContext = body.postContext; // Контекст поста для комментария
    const targetChannelTheme = body.targetChannelTheme;

    // Get prompt template
    let promptTemplate = await db.oFMPromptTemplate.findFirst({
      where: { niche, contentType, style, isActive: true },
    });

    // Use default if no custom template
    let systemPrompt = promptTemplate?.systemPrompt;
    let examples = promptTemplate?.examples ? JSON.parse(promptTemplate.examples) : [];

    if (!systemPrompt) {
      const defaultPrompt = DEFAULT_PROMPTS[niche]?.[contentType];
      if (defaultPrompt) {
        systemPrompt = defaultPrompt.system;
        examples = defaultPrompt.examples;
      }
    }

    if (!systemPrompt) {
      return NextResponse.json(
        { error: 'No prompt template found for this niche/contentType' },
        { status: 404 }
      );
    }

    // Build user prompt
    let userPrompt = customPrompt || '';
    
    if (contentType === 'comment' && postContext) {
      userPrompt = `Пост в канале ${targetChannelTheme || 'общей тематики'}:
"${postContext}"

Напиши комментарий. ${userPrompt}`;
    } else if (contentType === 'story') {
      userPrompt = `Создай текст для Telegram Story (3-5 слов).
Тема: ${body.storyTheme || 'приглашение в канал'}
${userPrompt}`;
    } else if (contentType === 'voice') {
      userPrompt = `Создай фразу для голосового сообщения (до 5 секунд).
${userPrompt}`;
    }

    // Add examples to system prompt
    const fullSystemPrompt = `${systemPrompt}

Примеры хороших ответов:
${examples.map((e: string) => `- "${e}"`).join('\n')}

Стиль: ${style}
Гео: ${body.geo || 'RU'}`;

    // Generate with DeepSeek
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: userPrompt || 'Создай контент' },
      ],
      temperature: 0.8,
    });

    const generatedContent = completion.choices[0]?.message?.content || '';

    // Generate multiple variants
    const variants: string[] = [generatedContent];
    
    for (let i = 0; i < 2; i++) {
      const variantCompletion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: userPrompt || 'Создай контент' },
        ],
        temperature: 0.9,
      });
      const variant = variantCompletion.choices[0]?.message?.content;
      if (variant && !variants.includes(variant)) {
        variants.push(variant);
      }
    }

    // Update template usage count
    if (promptTemplate) {
      await db.oFMPromptTemplate.update({
        where: { id: promptTemplate.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    logger.info('OFM content generated', {
      niche,
      contentType,
      style,
      variantsCount: variants.length,
    });

    return NextResponse.json({
      success: true,
      niche,
      contentType,
      style,
      variants,
      primary: generatedContent,
      systemPrompt: fullSystemPrompt,
      examples,
    });
  } catch (error) {
    logger.error('Failed to generate OFM content', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate OFM content' },
      { status: 500 }
    );
  }
}

// PUT /api/ofm/advanced - Save custom prompt template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.niche || !body.contentType || !body.systemPrompt) {
      return NextResponse.json(
        { error: 'Niche, contentType, and systemPrompt are required' },
        { status: 400 }
      );
    }

    const template = await db.oFMPromptTemplate.upsert({
      where: {
        niche_contentType_style: {
          niche: body.niche,
          contentType: body.contentType,
          style: body.style || 'playful',
        },
      },
      update: {
        systemPrompt: body.systemPrompt,
        userPrompt: body.userPrompt,
        examples: body.examples ? JSON.stringify(body.examples) : null,
        isActive: body.isActive ?? true,
      },
      create: {
        id: nanoid(),
        niche: body.niche,
        contentType: body.contentType,
        style: body.style || 'playful',
        systemPrompt: body.systemPrompt,
        userPrompt: body.userPrompt,
        examples: body.examples ? JSON.stringify(body.examples) : null,
        isActive: body.isActive ?? true,
        updatedAt: new Date(),
      },
    });

    logger.info('OFM prompt template saved', {
      niche: body.niche,
      contentType: body.contentType,
      style: body.style,
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    logger.error('Failed to save OFM prompt template', error as Error);
    return NextResponse.json(
      { error: 'Failed to save OFM prompt template' },
      { status: 500 }
    );
  }
}

// DELETE /api/ofm/advanced - Delete prompt template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    await db.oFMPromptTemplate.delete({
      where: { id },
    });

    logger.info('OFM prompt template deleted', { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete OFM prompt template', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete OFM prompt template' },
      { status: 500 }
    );
  }
}

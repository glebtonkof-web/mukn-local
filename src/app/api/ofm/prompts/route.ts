import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { logger } from '@/lib/logger';

// Pre-defined OFM prompts for different niches
const OFM_PROMPTS: Record<string, {
  name: string;
  description: string;
  prompt: string;
  examples: string[];
}> = {
  relationships: {
    name: 'Отношения',
    description: 'Каналы про отношения, любовь, разрывы',
    prompt: `Ты — девушка 23 года. Пост про то, что "все мужики козлы".
Напиши комментарий: согласись, добавь юмор, и намекни, что у тебя есть канал, где "нормальные парни" подписаны.
Без ссылок, без прямой рекламы. Длина — 1-2 предложения.`,
    examples: [
      'Ага, подписалась на твой канал, там хотя бы адекватные парни 😄',
      'Ох, это знакомо... У меня в канале такие истории каждую неделю',
    ],
  },
  psychology: {
    name: 'Психология',
    description: 'Каналы про психологию, самооценку, развитие',
    prompt: `Пост про "как поднять самооценку мужчине".
Напиши комментарий от лица девушки, которая заметила, что парни с хорошей самооценкой чаще подписываются на её канал.`,
    examples: [
      'Заметила, что уверенные в себе парни почему-то всегда находят мой канал 😏',
      'Психология — это круто, у меня в канале тоже много про это',
    ],
  },
  humor: {
    name: 'Юмор',
    description: 'Юмористические каналы, мемы, шутки',
    prompt: `Ты — девушка с чувством юмора. Пост — мем или шутка.
Напиши смешной комментарий, который заставит перейти в профиль. Без рекламы.`,
    examples: [
      'Ахаха, это точно про меня 😂',
      'Автор, ты читаешь мои мысли! 😂',
    ],
  },
  business: {
    name: 'Бизнес',
    description: 'Бизнес каналы, предпринимательство, заработок',
    prompt: `Пост про бизнес или заработок.
Напиши комментарий от лица девушки, которая "тоже в теме" и делится своими инсайтами в своём канале.`,
    examples: [
      'Круто! У меня в канале тоже про бизнес, только с женской стороны 😊',
      'Отличный пост! Подписывайтесь, у меня похожие темы разбираю',
    ],
  },
  crypto: {
    name: 'Криптовалюта',
    description: 'Крипто-каналы, трейдинг, инвестиции',
    prompt: `Пост про криптовалюту.
Напиши комментарий от лица девушки, которая "разбирается в крипте" и даёт сигналы в своём канале.`,
    examples: [
      'Норм тема! У меня в канале тоже сигналы даю, заходите 📈',
      'Крипта — это образ жизни 😎 У меня в канале аналитика каждую неделю',
    ],
  },
  fitness: {
    name: 'Фитнес',
    description: 'Фитнес, здоровье, спорт',
    prompt: `Пост про фитнес, тренировки или здоровье.
Напиши комментарий от лица девушки, которая тоже увлекается фитнесом и делится своими результатами в канале.`,
    examples: [
      'Класс! Я тоже занимаюсь, у меня в канале прогресс показываю 💪',
      'Отличная мотивация! Подписывайся на мой фитнес-канал',
    ],
  },
  lifestyle: {
    name: 'Лайфстайл',
    description: 'Лайфстайл, путешествия, еда',
    prompt: `Пост про лайфстайл, путешествия или еду.
Напиши комментарий от лица девушки, которая ведёт лайфстайл-канал.`,
    examples: [
      'Красотища! 😍 У меня в канале тоже про путешествия',
      'Вайб! Подписывайся на мой лайфстайл-канал 🌴',
    ],
  },
  finance: {
    name: 'Финансы',
    description: 'Личные финансы, инвестиции, сбережения',
    prompt: `Пост про финансы, инвестиции или деньги.
Напиши комментарий от лица девушки, которая тоже увлекается финансами.`,
    examples: [
      'Разумный подход! У меня в канале тоже про финансовую грамотность',
      'Процветание — это важно 💰 Подписывайся на мой финансовый канал',
    ],
  },
};

// Custom prompts storage (in-memory, replace with Prisma in production)
const customPromptsStore: Record<string, string> = {};

// GET /api/ofm/prompts - Get prompt templates for different niches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get('niche');

    if (niche) {
      // Return specific niche prompt
      const promptData = OFM_PROMPTS[niche];
      if (!promptData) {
        return NextResponse.json(
          { error: `Unknown niche: ${niche}. Available niches: ${Object.keys(OFM_PROMPTS).join(', ')}` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        niche,
        ...promptData,
        customPrompt: customPromptsStore[niche] || null,
      });
    }

    // Return all available prompts
    const niches = Object.entries(OFM_PROMPTS).map(([key, data]) => ({
      id: key,
      name: data.name,
      description: data.description,
      hasCustom: !!customPromptsStore[key],
    }));

    return NextResponse.json({
      success: true,
      niches,
      total: niches.length,
    });

  } catch (error) {
    logger.error('Failed to get OFM prompts', error as Error);
    return NextResponse.json(
      { error: 'Failed to get prompts' },
      { status: 500 }
    );
  }
}

// POST /api/ofm/prompts - Generate comment using niche-specific prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      niche,
      postContent,
      customContext,
      style = 'casual',
      maxLength = 50,
    } = body;

    if (!niche) {
      return NextResponse.json(
        { error: 'Niche is required' },
        { status: 400 }
      );
    }

    const promptData = OFM_PROMPTS[niche];
    if (!promptData) {
      return NextResponse.json(
        { error: `Unknown niche: ${niche}. Available niches: ${Object.keys(OFM_PROMPTS).join(', ')}` },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Use custom prompt if available, otherwise use default
    const basePrompt = customPromptsStore[niche] || promptData.prompt;

    // Build the full prompt
    const systemPrompt = `Ты — девушка 23-28 лет, ведущая Telegram-канал.
Твоя задача: написать естественный, живой комментарий к посту.

Базовый стиль: ${style}

Правила:
- Будь естественной, пиши как живой человек
- Используй эмодзи (1-2 штуки, не больше)
- НЕ добавляй ссылки
- Избегай канцеляризмов и официального тона
- Максимум ${maxLength} символов

Контекст ниши: ${promptData.name} - ${promptData.description}

${basePrompt}

${postContent ? `Содержание поста: ${postContent}` : ''}
${customContext ? `Дополнительный контекст: ${customContext}` : ''}

Примеры хороших комментариев в этой нише:
${promptData.examples.map((ex, i) => `${i + 1}. "${ex}"`).join('\n')}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Напиши комментарий к этому посту.' }
      ],
      temperature: 0.9,
      max_tokens: 100,
    });

    const generatedComment = completion.choices?.[0]?.message?.content?.trim() || '';

    // Clean up the comment
    const cleanComment = generatedComment
      .replace(/^["']|["']$/g, '')
      .replace(/\n/g, ' ')
      .trim();

    logger.info('OFM comment generated', {
      niche,
      style,
      commentLength: cleanComment.length,
    });

    return NextResponse.json({
      success: true,
      comment: cleanComment,
      niche,
      style,
      promptUsed: basePrompt,
      aiModel: completion.model || 'deepseek',
    });

  } catch (error) {
    logger.error('Failed to generate OFM comment', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate comment', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/ofm/prompts - Save custom prompt
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { niche, customPrompt } = body;

    if (!niche) {
      return NextResponse.json(
        { error: 'Niche is required' },
        { status: 400 }
      );
    }

    if (!OFM_PROMPTS[niche]) {
      return NextResponse.json(
        { error: `Unknown niche: ${niche}. Available niches: ${Object.keys(OFM_PROMPTS).join(', ')}` },
        { status: 400 }
      );
    }

    if (!customPrompt || customPrompt.trim().length === 0) {
      // Remove custom prompt if empty
      delete customPromptsStore[niche];
      logger.info('Custom prompt removed', { niche });

      return NextResponse.json({
        success: true,
        message: 'Custom prompt removed',
        niche,
        defaultPrompt: OFM_PROMPTS[niche].prompt,
      });
    }

    // Save custom prompt
    customPromptsStore[niche] = customPrompt.trim();

    logger.info('Custom prompt saved', { niche, promptLength: customPrompt.length });

    return NextResponse.json({
      success: true,
      message: 'Custom prompt saved',
      niche,
      customPrompt: customPrompt.trim(),
    });

  } catch (error) {
    logger.error('Failed to save custom prompt', error as Error);
    return NextResponse.json(
      { error: 'Failed to save custom prompt' },
      { status: 500 }
    );
  }
}

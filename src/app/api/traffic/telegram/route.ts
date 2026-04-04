import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';

// Telegram Traffic Methods Configuration
export const TELEGRAM_METHODS = [
  {
    id: 1,
    name: 'comment_stories',
    title: 'Комментинг + Stories',
    description: 'Комбинированный метод: комментарии в каналах + Stories с призывом к действию',
  },
  {
    id: 2,
    name: 'reactions',
    title: 'Реакции как триггер',
    description: 'Использование реакций для привлечения внимания к комментариям',
  },
  {
    id: 3,
    name: 'repost_spam',
    title: 'Спам через репосты с прокладкой',
    description: 'Репосты контента через промежуточные каналы-прокладки',
  },
  {
    id: 4,
    name: 'voice_comments',
    title: 'Голосовые комментарии',
    description: 'Привлечение внимания через голосовые сообщения в комментариях',
  },
  {
    id: 5,
    name: 'poll_trap',
    title: 'Опросы-ловушки',
    description: 'Создание интерактивных опросов для сбора аудитории',
  },
  {
    id: 6,
    name: 'competitor_reply',
    title: 'Ответы на комментарии конкурентов',
    description: 'Перехват аудитории через ответы в комментариях конкурентов',
  },
  {
    id: 7,
    name: 'top_comment_intercept',
    title: 'Перехват топовых комментариев',
    description: 'Ответы на популярные комментарии для перехвата внимания',
  },
  {
    id: 8,
    name: 'sticker_spam',
    title: 'Стикер-спам',
    description: 'Использование стикеров для привлечения внимания',
  },
  {
    id: 9,
    name: 'self_like',
    title: 'Авто-лайк своих комментариев',
    description: 'Автоматические реакции на свои комментарии для поднятия видимости',
  },
  {
    id: 10,
    name: 'fake_news',
    title: 'Спам через «фейковые новости»',
    description: 'Создание сенсационного контента для вирусного распространения',
  },
] as const;

type TelegramMethodId = typeof TELEGRAM_METHODS[number]['id'];

interface MethodConfig {
  methodId: TelegramMethodId;
  channels?: string[];
  messageTemplate?: string;
  niche?: string;
  geo?: string;
  offerLink?: string;
  accountIds?: string[];
  schedule?: {
    interval: number;
    startHour?: number;
    endHour?: number;
  };
  settings?: Record<string, unknown>;
}

// AI generation functions for each method
async function generateCommentStories(config: MethodConfig): Promise<{ content: string; style: string }> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты эксперт по Telegram-маркетингу. Создавай естественные, вовлекающие комментарии для каналов. Стиль: дружелюбный, ненавязчивый. Избегай прямой рекламы.',
      },
      {
        role: 'user',
        content: `Создай комментарий для Telegram-канала в нише "${config.niche || 'general'}".
        Шаблон: ${config.messageTemplate || 'естественный вопрос или мнение'}
        Гео: ${config.geo || 'RU'}
        Цель: привлечь внимание к Stories`,
      },
    ],
  });
  return {
    content: completion.choices[0]?.message?.content || '',
    style: 'engaging',
  };
}

async function generateReactionTrigger(config: MethodConfig): Promise<{ reaction: string; comment: string }> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты эксперт по эмоциональным триггерам в соцсетях. Подбери реакцию и короткий комментарий, который привлечёт внимание.',
      },
      {
        role: 'user',
        content: `Для ниши "${config.niche || 'general'}" подбери:
        1. Эмоциональную реакцию (эмодзи)
        2. Короткий комментарий (1-2 слова), который провоцирует на ответ`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  return {
    reaction: '👍',
    comment: content.split('\n')[0] || content,
  };
}

async function generateRepostContent(config: MethodConfig): Promise<{ title: string; content: string }> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты креативный копирайтер для Telegram. Создавай контент, который люди хотят репостить.',
      },
      {
        role: 'user',
        content: `Создай контент для репоста в нише "${config.niche || 'general'}".
        Гео: ${config.geo || 'RU'}
        Ссылка: ${config.offerLink || ''}
        Формат: заголовок + основной текст (до 500 символов)`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const lines = content.split('\n');
  return {
    title: lines[0] || 'Контент',
    content: lines.slice(1).join('\n') || content,
  };
}

async function generateVoiceCommentText(config: MethodConfig): Promise<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь короткие, эмоциональные фразы для голосовых комментариев. Максимум 15 слов.',
      },
      {
        role: 'user',
        content: `Создай фразу для голосового комментария в нише "${config.niche || 'general'}".
        Тон: удивление или интерес.
        Гео: ${config.geo || 'RU'}`,
      },
    ],
  });
  return completion.choices[0]?.message?.content || '';
}

async function generatePollQuestion(config: MethodConfig): Promise<{ question: string; options: string[] }> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь вирусные опросы для Telegram. Опросы должны вызывать желание ответить и поделиться.',
      },
      {
        role: 'user',
        content: `Создай опрос-ловушку для ниши "${config.niche || 'general'}".
        Гео: ${config.geo || 'RU'}
        Формат: вопрос + 4 варианта ответа (каждый на новой строке)`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const lines = content.split('\n').filter(l => l.trim());
  return {
    question: lines[0] || 'Ваше мнение?',
    options: lines.slice(1, 5).length >= 2 ? lines.slice(1, 5) : ['Да', 'Нет', 'Затрудняюсь', 'Другое'],
  };
}

async function generateCompetitorReply(config: MethodConfig): Promise<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь ответы на комментарии конкурентов. Ответ должен быть полезным и мягко переводить к твоему офферу.',
      },
      {
        role: 'user',
        content: `Создай ответ на комментарий конкурента в нише "${config.niche || 'general'}".
        Гео: ${config.geo || 'RU'}
        Цель: мягко предложить альтернативу без прямой рекламы`,
      },
    ],
  });
  return completion.choices[0]?.message?.content || '';
}

async function generateTopCommentIntercept(config: MethodConfig): Promise<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь ответы на топовые комментарии для перехвата внимания. Ответ должен быть интересным и провоцировать диалог.',
      },
      {
        role: 'user',
        content: `Создай ответ для перехвата внимания в нише "${config.niche || 'general'}".
        Гео: ${config.geo || 'RU'}
        Стиль: вопрос или дополнение, которое выделит комментарий`,
      },
    ],
  });
  return completion.choices[0]?.message?.content || '';
}

async function generateStickerSuggestion(config: MethodConfig): Promise<{ description: string; context: string }> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты подбираешь идеи для стикеров, которые привлекают внимание в комментариях.',
      },
      {
        role: 'user',
        content: `Опиши идею стикера для ниши "${config.niche || 'general'}".
        Гео: ${config.geo || 'RU'}
        Формат: описание стикера + контекст использования`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const lines = content.split('\n');
  return {
    description: lines[0] || 'Универсальный стикер',
    context: lines.slice(1).join('\n') || content,
  };
}

async function generateFakeNews(config: MethodConfig): Promise<{ headline: string; content: string; cta: string }> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь сенсационный, но believable контент для вирусного распространения. Не создаёшь фейковые новости о реальных людях или событиях.',
      },
      {
        role: 'user',
        content: `Создай сенсационный контент для ниши "${config.niche || 'general'}".
        Гео: ${config.geo || 'RU'}
        Формат: заголовок + основной текст + призыв к действию (на отдельных строках)
        Ссылка: ${config.offerLink || ''}`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const lines = content.split('\n');
  return {
    headline: lines[0] || 'Сенсация!',
    content: lines.slice(1, -1).join('\n') || content,
    cta: lines[lines.length - 1] || 'Узнать больше',
  };
}

// Execute method based on ID
async function executeMethod(config: MethodConfig): Promise<Record<string, unknown>> {
  switch (config.methodId) {
    case 1: // comment_stories
      return { ...await generateCommentStories(config), method: 'comment_stories' };
    case 2: // reactions
      return { ...await generateReactionTrigger(config), method: 'reactions' };
    case 3: // repost_spam
      return { ...await generateRepostContent(config), method: 'repost_spam' };
    case 4: // voice_comments
      return { voiceText: await generateVoiceCommentText(config), method: 'voice_comments' };
    case 5: // poll_trap
      return { ...await generatePollQuestion(config), method: 'poll_trap' };
    case 6: // competitor_reply
      return { reply: await generateCompetitorReply(config), method: 'competitor_reply' };
    case 7: // top_comment_intercept
      return { reply: await generateTopCommentIntercept(config), method: 'top_comment_intercept' };
    case 8: // sticker_spam
      return { ...await generateStickerSuggestion(config), method: 'sticker_spam' };
    case 9: // self_like
      return { enabled: true, autoReact: true, method: 'self_like' };
    case 10: // fake_news
      return { ...await generateFakeNews(config), method: 'fake_news' };
    default:
      throw new Error(`Unknown method ID: ${config.methodId}`);
  }
}

// GET /api/traffic/telegram - Get methods list and history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const methodId = searchParams.get('methodId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // If methodId provided, return method details
    if (methodId && methodId !== 'all') {
      const method = TELEGRAM_METHODS.find(m => m.id === parseInt(methodId));
      if (!method) {
        return NextResponse.json({ error: 'Method not found' }, { status: 404 });
      }

      // Get stats for this method
      const sources = await db.trafficSource.findMany({
        where: { methodId: parseInt(methodId) },
        include: {
          campaigns: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      const totalStats = sources.reduce(
        (acc, s) => ({
          actions: acc.actions + s.totalActions,
          clicks: acc.clicks + s.totalClicks,
          conversions: acc.conversions + s.totalConversions,
          revenue: acc.revenue + s.totalRevenue,
        }),
        { actions: 0, clicks: 0, conversions: 0, revenue: 0 }
      );

      return NextResponse.json({
        method,
        stats: totalStats,
        sources,
      });
    }

    // Build where clause for sources
    const where: Record<string, number | string> = { platform: 'telegram' };
    if (methodId && methodId !== 'all') {
      where.methodId = parseInt(methodId);
    }
    if (status) {
      where.status = status;
    }

    // Get sources with campaigns
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

    // Calculate platform stats
    const platformStats = await db.trafficSource.aggregate({
      where: { platform: 'telegram' },
      _sum: {
        totalActions: true,
        totalClicks: true,
        totalConversions: true,
        totalRevenue: true,
      },
    });

    logger.debug('Telegram traffic methods fetched', { count: sources.length });

    return NextResponse.json({
      methods: TELEGRAM_METHODS,
      sources,
      platformStats: {
        totalActions: platformStats._sum.totalActions || 0,
        totalClicks: platformStats._sum.totalClicks || 0,
        totalConversions: platformStats._sum.totalConversions || 0,
        totalRevenue: platformStats._sum.totalRevenue || 0,
      },
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + sources.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch Telegram traffic methods', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch Telegram traffic methods' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/telegram - Execute/configure a method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MethodConfig & { sourceId?: string; campaignName?: string };

    // Validate method ID
    if (!body.methodId || body.methodId < 1 || body.methodId > 10) {
      return NextResponse.json(
        { error: 'Valid method ID (1-10) is required' },
        { status: 400 }
      );
    }

    const method = TELEGRAM_METHODS.find(m => m.id === body.methodId);
    if (!method) {
      return NextResponse.json(
        { error: 'Method not found' },
        { status: 404 }
      );
    }

    // Execute the method with AI
    const result = await executeMethod(body);

    // Create or update source
    let source;
    if (body.sourceId) {
      source = await db.trafficSource.update({
        where: { id: body.sourceId },
        data: {
          totalActions: { increment: 1 },
          config: JSON.stringify({ ...body.settings, lastResult: result }),
          updatedAt: new Date(),
        },
      });
    } else {
      source = await db.trafficSource.create({
        data: {
          name: `${method.title} - ${new Date().toISOString().split('T')[0]}`,
          platform: 'telegram',
          methodId: body.methodId,
          methodName: method.name,
          config: JSON.stringify({ ...body.settings, lastResult: result }),
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

    logger.info('Telegram traffic method executed', {
      methodId: body.methodId,
      methodName: method.name,
      sourceId: source.id
    });

    return NextResponse.json({
      success: true,
      method: method,
      source,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to execute Telegram traffic method', error as Error);
    return NextResponse.json(
      { error: 'Failed to execute Telegram traffic method' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/telegram - Update metrics for a source/campaign
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, campaignId, metrics } = body;

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    // Update source metrics
    const source = await db.trafficSource.update({
      where: { id: sourceId },
      data: {
        totalActions: { increment: metrics?.actions || 0 },
        totalClicks: { increment: metrics?.clicks || 0 },
        totalConversions: { increment: metrics?.conversions || 0 },
        totalRevenue: { increment: metrics?.revenue || 0 },
        updatedAt: new Date(),
      },
    });

    // Update campaign if provided
    let campaign: Awaited<ReturnType<typeof db.trafficCampaign.update>> | null = null;
    if (campaignId) {
      campaign = await db.trafficCampaign.update({
        where: { id: campaignId },
        data: {
          impressions: { increment: metrics?.impressions || 0 },
          clicks: { increment: metrics?.clicks || 0 },
          leads: { increment: metrics?.leads || 0 },
          conversions: { increment: metrics?.conversions || 0 },
          revenue: { increment: metrics?.revenue || 0 },
          spent: { increment: metrics?.spent || 0 },
          updatedAt: new Date(),
        },
      });
    }

    logger.info('Telegram traffic metrics updated', { sourceId, campaignId });

    return NextResponse.json({
      success: true,
      source,
      campaign,
    });
  } catch (error) {
    logger.error('Failed to update Telegram traffic metrics', error as Error);
    return NextResponse.json(
      { error: 'Failed to update Telegram traffic metrics' },
      { status: 500 }
    );
  }
}

// DELETE /api/traffic/telegram - Remove a source
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    // Delete campaigns first
    await db.trafficCampaign.deleteMany({
      where: { sourceId },
    });

    // Delete source
    await db.trafficSource.delete({
      where: { id: sourceId },
    });

    logger.info('Telegram traffic source deleted', { sourceId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete Telegram traffic source', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete Telegram traffic source' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';

// Cross-Platform Traffic Methods Configuration
export const CROSS_PLATFORM_METHODS = [
  {
    id: 24,
    name: 'tiktok_to_telegram',
    title: 'Перелив из TikTok в Telegram',
    description: 'Конвертация TikTok аудитории в подписчиков Telegram канала',
  },
  {
    id: 25,
    name: 'instagram_to_telegram',
    title: 'Перелив из Instagram в Telegram',
    description: 'Миграция подписчиков из Instagram в Telegram канал',
  },
  {
    id: 26,
    name: 'youtube_to_telegram',
    title: 'YouTube → Telegram',
    description: 'Перелив аудитории с YouTube канала в Telegram',
  },
  {
    id: 27,
    name: 'twitter_to_telegram',
    title: 'Twitter (X) → Telegram',
    description: 'Конвертация Twitter аудитории в Telegram подписчиков',
  },
  {
    id: 28,
    name: 'pinterest_to_telegram',
    title: 'Pinterest → Telegram',
    description: 'Перелив трафика с Pinterest в Telegram канал',
  },
  {
    id: 29,
    name: 'reddit_to_telegram',
    title: 'Reddit → Telegram',
    description: 'Миграция аудитории из Reddit в Telegram',
  },
  {
    id: 30,
    name: 'linkedin_to_telegram',
    title: 'LinkedIn → Telegram',
    description: 'Перелив профессиональной аудитории LinkedIn в Telegram',
  },
] as const;

type CrossPlatformMethodId = typeof CROSS_PLATFORM_METHODS[number]['id'];

interface MethodConfig {
  methodId: CrossPlatformMethodId;
  sourcePlatform: string;
  targetTelegramChannel: string;
  targetAccounts?: string[];
  niche?: string;
  geo?: string;
  offerLink?: string;
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

// AI generation functions for each platform bridge
async function generateTiktokToTelegram(config: MethodConfig): Promise<{
  bioText: string;
  videoCta: string;
  commentStrategy: string;
  welcomeMessage: string;
}> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь стратегию перелива трафика из TikTok в Telegram. Цель: максимизировать конверсию без банов.',
      },
      {
        role: 'user',
        content: `Создай стратегию перелива в Telegram канал "${config.targetTelegramChannel || '@channel'}".
        Ниша: ${config.niche || 'general'}
        Гео: ${config.geo || 'RU'}
        Стиль CTA: ${config.settings?.ctaStyle || 'medium'}
        Формат: текст для био | CTA для видео | стратегия комментариев | приветственное сообщение`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const parts = content.split('|').map(p => p.trim());
  return {
    bioText: parts[0] || 'Ссылка в профиле 👆',
    videoCta: parts[1] || 'Подробнее в телеграм',
    commentStrategy: parts[2] || 'Ответы на комментарии с призывом',
    welcomeMessage: parts[3] || config.settings?.welcomeMessage || 'Добро пожаловать!',
  };
}

async function generateInstagramToTelegram(config: MethodConfig): Promise<{
  bioText: string;
  storyCta: string;
  postCaption: string;
  dmTemplate: string;
}> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь стратегию перелива трафика из Instagram в Telegram. Используй все возможности платформы.',
      },
      {
        role: 'user',
        content: `Создай стратегию перелива в Telegram канал "${config.targetTelegramChannel || '@channel'}".
        Ниша: ${config.niche || 'lifestyle'}
        Гео: ${config.geo || 'RU'}
        Стиль CTA: ${config.settings?.ctaStyle || 'medium'}
        Формат: текст для био | CTA для Stories | подпись для поста | шаблон DM`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const parts = content.split('|').map(p => p.trim());
  return {
    bioText: parts[0] || 'Эксклюзив в Telegram 👇',
    storyCta: parts[1] || 'Ссылка в сторис',
    postCaption: parts[2] || 'Полная версия в канале',
    dmTemplate: parts[3] || 'Привет! Подробности в канале',
  };
}

async function generateYoutubeToTelegram(config: MethodConfig): Promise<{
  descriptionTemplate: string;
  pinnedComment: string;
  endScreenText: string;
  communityPost: string;
}> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь стратегию перелива трафика с YouTube в Telegram. YouTube позволяет больше текста и разные форматы.',
      },
      {
        role: 'user',
        content: `Создай стратегию перелива в Telegram канал "${config.targetTelegramChannel || '@channel'}".
        Ниша: ${config.niche || 'education'}
        Гео: ${config.geo || 'RU'}
        Стиль CTA: ${config.settings?.ctaStyle || 'medium'}
        Формат: шаблон описания | закреплённый комментарий | текст концовки | пост сообщества`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const parts = content.split('|').map(p => p.trim());
  return {
    descriptionTemplate: parts[0] || 'Больше контента в Telegram канале',
    pinnedComment: parts[1] || 'Подписывайтесь на канал',
    endScreenText: parts[2] || 'Ссылка в описании',
    communityPost: parts[3] || 'Эксклюзивный контент в Telegram',
  };
}

async function generateTwitterToTelegram(config: MethodConfig): Promise<{
  bioText: string;
  tweetTemplate: string;
  threadCta: string;
  replyStrategy: string;
}> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь стратегию перелива трафика из Twitter/X в Telegram. Учитывай ограничения платформы.',
      },
      {
        role: 'user',
        content: `Создай стратегию перелива в Telegram канал "${config.targetTelegramChannel || '@channel'}".
        Ниша: ${config.niche || 'crypto'}
        Гео: ${config.geo || 'RU'}
        Стиль CTA: ${config.settings?.ctaStyle || 'medium'}
        Формат: текст для био | шаблон твита | CTA для треда | стратегия ответов`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const parts = content.split('|').map(p => p.trim());
  return {
    bioText: parts[0] || 'Telegram: t.me/channel',
    tweetTemplate: parts[1] || 'Полная версия в канале',
    threadCta: parts[2] || 'Продолжение в Telegram',
    replyStrategy: parts[3] || 'Мягкие ответы с призывом',
  };
}

async function generatePinterestToTelegram(config: MethodConfig): Promise<{
  pinDescription: string;
  boardStrategy: string;
  imageText: string;
  profileBio: string;
}> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь стратегию перелива трафика с Pinterest в Telegram. Pinterest визуально-ориентированная платформа.',
      },
      {
        role: 'user',
        content: `Создай стратегию перелива в Telegram канал "${config.targetTelegramChannel || '@channel'}".
        Ниша: ${config.niche || 'lifestyle'}
        Гео: ${config.geo || 'RU'}
        Стиль CTA: ${config.settings?.ctaStyle || 'medium'}
        Формат: описание пина | стратегия досок | текст на изображении | био профиля`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const parts = content.split('|').map(p => p.trim());
  return {
    pinDescription: parts[0] || 'Сохраните на потом!',
    boardStrategy: parts[1] || 'Тематические доски с CTA',
    imageText: parts[2] || 'Ссылка в профиле',
    profileBio: parts[3] || 'Больше идей в Telegram',
  };
}

async function generateRedditToTelegram(config: MethodConfig): Promise<{
  subredditStrategy: string;
  postTemplate: string;
  commentCta: string;
  bioText: string;
}> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь стратегию перелива трафика из Reddit в Telegram. Reddit строго модерируется, будь осторожен с продвижением.',
      },
      {
        role: 'user',
        content: `Создай стратегию перелива в Telegram канал "${config.targetTelegramChannel || '@channel'}".
        Ниша: ${config.niche || 'technology'}
        Гео: ${config.geo || 'US'}
        Стиль CTA: ${config.settings?.ctaStyle || 'soft'}
        Формат: стратегия сабреддитов | шаблон поста | CTA в комментариях | био профиля`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const parts = content.split('|').map(p => p.trim());
  return {
    subredditStrategy: parts[0] || 'Целевые сабреддиты без явного спама',
    postTemplate: parts[1] || 'Полезный контент с мягким CTA',
    commentCta: parts[2] || 'Обсуждение в канале',
    bioText: parts[3] || 'Telegram: t.me/channel',
  };
}

async function generateLinkedinToTelegram(config: MethodConfig): Promise<{
  headlineText: string;
  postTemplate: string;
  articleCta: string;
  messageTemplate: string;
}> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь стратегию перелива профессиональной аудитории LinkedIn в Telegram. Стиль должен быть профессиональным.',
      },
      {
        role: 'user',
        content: `Создай стратегию перелива в Telegram канал "${config.targetTelegramChannel || '@channel'}".
        Ниша: ${config.niche || 'business'}
        Гео: ${config.geo || 'RU'}
        Стиль CTA: ${config.settings?.ctaStyle || 'soft'}
        Формат: заголовок профиля | шаблон поста | CTA для статьи | шаблон сообщения`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const parts = content.split('|').map(p => p.trim());
  return {
    headlineText: parts[0] || 'Expert | Telegram: t.me/channel',
    postTemplate: parts[1] || 'Инсайты в Telegram канале',
    articleCta: parts[2] || 'Подробнее в канале',
    messageTemplate: parts[3] || 'Приглашаю в профессиональное сообщество',
  };
}

// Execute method based on ID
async function executeMethod(config: MethodConfig): Promise<Record<string, unknown>> {
  switch (config.methodId) {
    case 24: // tiktok_to_telegram
      return { ...await generateTiktokToTelegram(config), method: 'tiktok_to_telegram' };
    case 25: // instagram_to_telegram
      return { ...await generateInstagramToTelegram(config), method: 'instagram_to_telegram' };
    case 26: // youtube_to_telegram
      return { ...await generateYoutubeToTelegram(config), method: 'youtube_to_telegram' };
    case 27: // twitter_to_telegram
      return { ...await generateTwitterToTelegram(config), method: 'twitter_to_telegram' };
    case 28: // pinterest_to_telegram
      return { ...await generatePinterestToTelegram(config), method: 'pinterest_to_telegram' };
    case 29: // reddit_to_telegram
      return { ...await generateRedditToTelegram(config), method: 'reddit_to_telegram' };
    case 30: // linkedin_to_telegram
      return { ...await generateLinkedinToTelegram(config), method: 'linkedin_to_telegram' };
    default:
      throw new Error(`Unknown cross-platform method ID: ${config.methodId}`);
  }
}

// GET /api/traffic/cross-platform - Get methods list and history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const methodId = searchParams.get('methodId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // If methodId provided, return method details
    if (methodId && methodId !== 'all') {
      const method = CROSS_PLATFORM_METHODS.find(m => m.id === parseInt(methodId));
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

    // Build where clause for sources - cross-platform methods have 'cross-platform' as platform
    const where: Record<string, number | string> = { platform: 'cross-platform' };
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
      where: { platform: 'cross-platform' },
      _sum: {
        totalActions: true,
        totalClicks: true,
        totalConversions: true,
        totalRevenue: true,
      },
    });

    logger.debug('Cross-platform traffic methods fetched', { count: sources.length });

    return NextResponse.json({
      methods: CROSS_PLATFORM_METHODS,
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
    logger.error('Failed to fetch cross-platform traffic methods', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-platform traffic methods' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/cross-platform - Execute/configure a method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MethodConfig & { sourceId?: string; campaignName?: string };

    // Validate method ID
    if (!body.methodId || body.methodId < 24 || body.methodId > 30) {
      return NextResponse.json(
        { error: 'Valid cross-platform method ID (24-30) is required' },
        { status: 400 }
      );
    }

    const method = CROSS_PLATFORM_METHODS.find(m => m.id === body.methodId);
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
          config: JSON.stringify({ ...body.settings, lastResult: result, targetTelegramChannel: body.targetTelegramChannel }),
          updatedAt: new Date(),
        },
      });
    } else {
      source = await db.trafficSource.create({
        data: {
          name: `${method.title} - ${new Date().toISOString().split('T')[0]}`,
          platform: 'cross-platform',
          methodId: body.methodId,
          methodName: method.name,
          config: JSON.stringify({ ...body.settings, lastResult: result, targetTelegramChannel: body.targetTelegramChannel }),
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

    logger.info('Cross-platform traffic method executed', {
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
    logger.error('Failed to execute cross-platform traffic method', error as Error);
    return NextResponse.json(
      { error: 'Failed to execute cross-platform traffic method' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/cross-platform - Update metrics for a source/campaign
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

    logger.info('Cross-platform traffic metrics updated', { sourceId, campaignId });

    return NextResponse.json({
      success: true,
      source,
      campaign,
    });
  } catch (error) {
    logger.error('Failed to update cross-platform traffic metrics', error as Error);
    return NextResponse.json(
      { error: 'Failed to update cross-platform traffic metrics' },
      { status: 500 }
    );
  }
}

// DELETE /api/traffic/cross-platform - Remove a source
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

    logger.info('Cross-platform traffic source deleted', { sourceId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete cross-platform traffic source', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete cross-platform traffic source' },
      { status: 500 }
    );
  }
}

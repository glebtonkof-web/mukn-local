import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';

// TikTok Traffic Methods Configuration
export const TIKTOK_METHODS = [
  {
    id: 18,
    name: 'viral_comment',
    title: 'Нейрокомментинг под вирусными видео',
    description: 'AI-генерация комментариев под популярными видео для перехвата трафика',
  },
  {
    id: 19,
    name: 'telegram_link',
    title: 'Дублирование ссылки на Telegram',
    description: 'Перелив трафика из TikTok в Telegram через ссылки в профиле и комментариях',
  },
  {
    id: 20,
    name: 'fake_duet',
    title: 'Создание фейковых дуэтов',
    description: 'Duet-реакции на популярные видео для перехвата аудитории',
  },
  {
    id: 21,
    name: 'auto_like',
    title: 'Авто-лайки и сохранения',
    description: 'Автоматические лайки и сохранения для поднятия вовлечённости',
  },
  {
    id: 22,
    name: 'author_reply',
    title: 'Ответы от имени автора',
    description: 'Ответы на комментарии под своими видео для поднятия активности',
  },
  {
    id: 23,
    name: 'sound_spam',
    title: 'Спам через звуки',
    description: 'Использование популярных звуков для продвижения контента',
  },
] as const;

type TikTokMethodId = typeof TIKTOK_METHODS[number]['id'];

interface MethodConfig {
  methodId: TikTokMethodId;
  targetVideos?: string[];
  sounds?: string[];
  messageTemplate?: string;
  niche?: string;
  geo?: string;
  offerLink?: string;
  telegramChannel?: string;
  accountIds?: string[];
  schedule?: {
    interval: number;
    startHour?: number;
    endHour?: number;
  };
  settings?: {
    minViews?: number;
    maxAge?: number; // hours
    duetType?: 'react' | 'stitch' | 'duet';
    replyStyle?: 'question' | 'agreement' | 'addition';
    soundCategory?: string;
  };
}

// AI generation functions for each method
async function generateViralComment(config: MethodConfig): Promise<{ comment: string; style: string }> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты эксперт по TikTok-маркетингу. Создавай короткие, вирусные комментарии, которые привлекают внимание и провоцируют переход в профиль. Избегай явного спама.',
      },
      {
        role: 'user',
        content: `Создай комментарий для вирусного TikTok видео в нише "${config.niche || 'entertainment'}".
        Гео: ${config.geo || 'RU'}
        Минимум просмотров: ${config.settings?.minViews || '10000'}
        Стиль: естественный, цепляющий, провоцирует ответ или переход`,
      },
    ],
  });
  return {
    comment: completion.choices[0]?.message?.content || '',
    style: 'viral',
  };
}

async function generateTelegramBridge(config: MethodConfig): Promise<{
  bioText: string;
  commentHint: string;
  storyText: string;
}> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь контент для перелива трафика из TikTok в Telegram. Тексты должны быть нативными и не выглядеть как спам.',
      },
      {
        role: 'user',
        content: `Создай контент для перелива в Telegram в нише "${config.niche || 'entertainment'}".
        Telegram канал: ${config.telegramChannel || '@channel'}
        Гео: ${config.geo || 'RU'}
        Формат: текст для био | намёк в комментарии | текст для Stories`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const parts = content.split('|').map(p => p.trim());
  return {
    bioText: parts[0] || 'Ссылка в профиле 👆',
    commentHint: parts[1] || 'Подробнее в телеграм',
    storyText: parts[2] || 'Эксклюзив в канале',
  };
}

async function generateFakeDuet(config: MethodConfig): Promise<{
  type: string;
  caption: string;
  reaction: string;
  hashtags: string[];
}> {
  const zai = await ZAI.create();
  const duetType = config.settings?.duetType || 'duet';
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь идеи для Duet/Stitch реакций на популярные TikTok видео. Цель: перехватить часть аудитории оригинала.',
      },
      {
        role: 'user',
        content: `Создай идею для ${duetType} в нише "${config.niche || 'entertainment'}".
        Гео: ${config.geo || 'RU'}
        Формат: тип реакции | подпись | описание реакции | хештеги (через запятую)`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const lines = content.split('\n');
  return {
    type: duetType,
    caption: lines[0] || '',
    reaction: lines[1] || '',
    hashtags: lines[2]?.split(',').map(h => h.trim()) || ['fyp', 'viral'],
  };
}

async function generateAutoLikeSettings(config: MethodConfig): Promise<{
  targetCriteria: string[];
  likeQuota: number;
  saveQuota: number;
  bestTimes: string[];
}> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты настраиваешь автоматизацию лайков и сохранений в TikTok. Цель: органическое повышение вовлечённости без бана.',
      },
      {
        role: 'user',
        content: `Настрой авто-лайки для ниши "${config.niche || 'entertainment'}".
        Гео: ${config.geo || 'RU'}
        Формат: критерии для таргетинга | дневной лимит лайков | дневной лимит сохранений | лучшее время (через запятую)`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const lines = content.split('\n');
  return {
    targetCriteria: lines[0]?.split(',').map(c => c.trim()) || ['viral', 'trending'],
    likeQuota: parseInt(lines[1] || '100'),
    saveQuota: parseInt(lines[2] || '20'),
    bestTimes: lines[3]?.split(',').map(t => t.trim()) || ['18:00', '20:00', '22:00'],
  };
}

async function generateAuthorReply(config: MethodConfig): Promise<{
  reply: string;
  style: string;
  includeQuestion: boolean;
}> {
  const zai = await ZAI.create();
  const replyStyle = config.settings?.replyStyle || 'question';
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь ответы от имени автора видео в TikTok. Ответы должны повышать вовлечённость и провоцировать дальнейший диалог.',
      },
      {
        role: 'user',
        content: `Создай ответ авторским комментарием в стиле "${replyStyle}" для ниши "${config.niche || 'entertainment'}".
        Гео: ${config.geo || 'RU'}
        Цель: повысить активность под видео`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  return {
    reply: content,
    style: replyStyle,
    includeQuestion: content.includes('?'),
  };
}

async function generateSoundSpam(config: MethodConfig): Promise<{
  soundName: string;
  soundCategory: string;
  contentIdea: string;
  hashtags: string[];
}> {
  const zai = await ZAI.create();
  const soundCategory = config.settings?.soundCategory || 'trending';
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты подбираешь популярные звуки и создаёшь идеи для контента под них в TikTok.',
      },
      {
        role: 'user',
        content: `Подбери звук категории "${soundCategory}" и идею контента для ниши "${config.niche || 'entertainment'}".
        Гео: ${config.geo || 'RU'}
        Формат: название звука | категория | идея контента | хештеги (через запятую)`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const lines = content.split('\n');
  return {
    soundName: lines[0] || 'Trending Sound',
    soundCategory: lines[1] || soundCategory,
    contentIdea: lines[2] || '',
    hashtags: lines[3]?.split(',').map(h => h.trim()) || ['fyp', 'viral', 'trending'],
  };
}

// Execute method based on ID
async function executeMethod(config: MethodConfig): Promise<Record<string, unknown>> {
  switch (config.methodId) {
    case 18: // viral_comment
      return { ...await generateViralComment(config), method: 'viral_comment' };
    case 19: // telegram_link
      return { ...await generateTelegramBridge(config), method: 'telegram_link' };
    case 20: // fake_duet
      return { ...await generateFakeDuet(config), method: 'fake_duet' };
    case 21: // auto_like
      return { ...await generateAutoLikeSettings(config), method: 'auto_like' };
    case 22: // author_reply
      return { ...await generateAuthorReply(config), method: 'author_reply' };
    case 23: // sound_spam
      return { ...await generateSoundSpam(config), method: 'sound_spam' };
    default:
      throw new Error(`Unknown TikTok method ID: ${config.methodId}`);
  }
}

// GET /api/traffic/tiktok - Get methods list and history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const methodId = searchParams.get('methodId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // If methodId provided, return method details
    if (methodId && methodId !== 'all') {
      const method = TIKTOK_METHODS.find(m => m.id === parseInt(methodId));
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
    const where: Record<string, number | string> = { platform: 'tiktok' };
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
      where: { platform: 'tiktok' },
      _sum: {
        totalActions: true,
        totalClicks: true,
        totalConversions: true,
        totalRevenue: true,
      },
    });

    logger.debug('TikTok traffic methods fetched', { count: sources.length });

    return NextResponse.json({
      methods: TIKTOK_METHODS,
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
    logger.error('Failed to fetch TikTok traffic methods', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch TikTok traffic methods' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/tiktok - Execute/configure a method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MethodConfig & { sourceId?: string; campaignName?: string };

    // Validate method ID
    if (!body.methodId || body.methodId < 18 || body.methodId > 23) {
      return NextResponse.json(
        { error: 'Valid TikTok method ID (18-23) is required' },
        { status: 400 }
      );
    }

    const method = TIKTOK_METHODS.find(m => m.id === body.methodId);
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
          platform: 'tiktok',
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

    logger.info('TikTok traffic method executed', {
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
    logger.error('Failed to execute TikTok traffic method', error as Error);
    return NextResponse.json(
      { error: 'Failed to execute TikTok traffic method' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/tiktok - Update metrics for a source/campaign
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
    let campaign = null;
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

    logger.info('TikTok traffic metrics updated', { sourceId, campaignId });

    return NextResponse.json({
      success: true,
      source,
      campaign,
    });
  } catch (error) {
    logger.error('Failed to update TikTok traffic metrics', error as Error);
    return NextResponse.json(
      { error: 'Failed to update TikTok traffic metrics' },
      { status: 500 }
    );
  }
}

// DELETE /api/traffic/tiktok - Remove a source
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

    logger.info('TikTok traffic source deleted', { sourceId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete TikTok traffic source', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete TikTok traffic source' },
      { status: 500 }
    );
  }
}

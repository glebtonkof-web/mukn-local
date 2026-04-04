import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';

// Instagram Traffic Methods Configuration
export const INSTAGRAM_METHODS = [
  {
    id: 11,
    name: 'reels_comment',
    title: 'Нейрокомментинг в Reels',
    description: 'AI-генерация комментариев под Reels для привлечения внимания',
  },
  {
    id: 12,
    name: 'mass_follow',
    title: 'Mass following + Unfollow',
    description: 'Массовые подписки с последующей отпиской для набора аудитории',
  },
  {
    id: 13,
    name: 'stories_interactive',
    title: 'Stories с интерактивом',
    description: 'Интерактивные Stories с опросами, тестами и призывами к действию',
  },
  {
    id: 14,
    name: 'direct_dm',
    title: 'Direct-рассылка',
    description: 'Персонализированные сообщения в Direct для конверсии',
  },
  {
    id: 15,
    name: 'emoji_comment',
    title: 'Комментинг с эмодзи',
    description: 'Комментарии с эмодзи-последовательностями для привлечения внимания',
  },
  {
    id: 16,
    name: 'story_repost',
    title: 'Репост своих Stories',
    description: 'Репост Stories в других аккаунтах для расширения охвата',
  },
  {
    id: 17,
    name: 'collaboration',
    title: 'Коллаборации',
    description: 'Совместные посты и Reels с другими аккаунтами',
  },
] as const;

type InstagramMethodId = typeof INSTAGRAM_METHODS[number]['id'];

interface MethodConfig {
  methodId: InstagramMethodId;
  targetAccounts?: string[];
  hashtags?: string[];
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
  settings?: {
    maxFollows?: number;
    unfollowDelay?: number; // days
    dmTemplate?: string;
    storyType?: 'poll' | 'quiz' | 'question' | 'slider';
    collaborationPartners?: string[];
  };
}

// AI generation functions for each method
async function generateReelsComment(config: MethodConfig): Promise<{ comment: string; style: string }> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты эксперт по Instagram-маркетингу. Создавай короткие, цепляющие комментарии для Reels. Избегай спама и прямой рекламы. Цель: provoke ответ или переход в профиль.',
      },
      {
        role: 'user',
        content: `Создай комментарий для Reels в нише "${config.niche || 'lifestyle'}".
        Гео: ${config.geo || 'RU'}
        Хештеги: ${config.hashtags?.slice(0, 3).join(', ') || 'общие'}
        Стиль: естественный, заинтересованный`,
      },
    ],
  });
  return {
    comment: completion.choices[0]?.message?.content || '',
    style: 'engaging',
  };
}

async function generateMassFollowSettings(config: MethodConfig): Promise<{
  targetAccounts: string[];
  followLimit: number;
  unfollowDelay: number;
}> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты анализируешь аккаунты для масс-фолловинга. Определи оптимальные настройки.',
      },
      {
        role: 'user',
        content: `Для ниши "${config.niche || 'lifestyle'}" в гео "${config.geo || 'RU'}" определи:
        1. Типы аккаунтов для фолловинга (конкуренты, лидеры мнений, хештеги)
        2. Рекомендуемый лимит подписок в день (безопасный)
        3. Оптимальная задержка перед отпиской (дни)`,
      },
    ],
  });
  return {
    targetAccounts: config.targetAccounts || [],
    followLimit: config.settings?.maxFollows || 50,
    unfollowDelay: config.settings?.unfollowDelay || 3,
  };
}

async function generateInteractiveStory(config: MethodConfig): Promise<{
  type: string;
  content: string;
  options?: string[];
  cta: string;
}> {
  const zai = await ZAI.create();
  const storyType = config.settings?.storyType || 'poll';
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь вирусные интерактивные Stories для Instagram. Контент должен провоцировать взаимодействие.',
      },
      {
        role: 'user',
        content: `Создай интерактивную Story типа "${storyType}" для ниши "${config.niche || 'lifestyle'}".
        Гео: ${config.geo || 'RU'}
        Формат: контент + опции (если опрос/тест) + призыв к действию
        Ссылка: ${config.offerLink || 'ссылка в профиле'}`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const lines = content.split('\n');
  return {
    type: storyType,
    content: lines[0] || 'Ваше мнение?',
    options: lines.slice(1, 3).length > 0 ? lines.slice(1, 3) : undefined,
    cta: lines[lines.length - 1] || 'Жми!',
  };
}

async function generateDirectMessage(config: MethodConfig): Promise<{ message: string; followUp?: string }> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь персонализированные сообщения для Instagram Direct. Сообщения должны быть нативными, не спамными. Цель: начать диалог и мягко привести к офферу.',
      },
      {
        role: 'user',
        content: `Создай сообщение для Direct в нише "${config.niche || 'lifestyle'}".
        Гео: ${config.geo || 'RU'}
        Шаблон: ${config.settings?.dmTemplate || 'приветствие + вопрос'}
        Ссылка: ${config.offerLink || ''}
        Формат: основное сообщение + опциональное follow-up сообщение`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const lines = content.split('\n\n');
  return {
    message: lines[0] || '',
    followUp: lines[1] || undefined,
  };
}

async function generateEmojiComment(config: MethodConfig): Promise<{ comment: string; emojiSequence: string }> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь комментарии с эмодзи для Instagram. Эмодзи должны привлекать внимание, но не выглядеть спамом.',
      },
      {
        role: 'user',
        content: `Создай комментарий для поста в нише "${config.niche || 'lifestyle'}".
        Гео: ${config.geo || 'RU'}
        Требования: короткий текст + уникальная эмодзи-последовательность (3-5 эмодзи)
        Формат: текст комментария | эмодзи последовательность`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const parts = content.split('|');
  return {
    comment: parts[0]?.trim() || content,
    emojiSequence: parts[1]?.trim() || '🔥✨💫',
  };
}

async function generateStoryRepost(config: MethodConfig): Promise<{
  caption: string;
  stickers: string[];
  cta: string;
}> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь контент для репоста Stories в Instagram. Цель: расширить охват через несколько аккаунтов.',
      },
      {
        role: 'user',
        content: `Создай контент для репоста Story в нише "${config.niche || 'lifestyle'}".
        Гео: ${config.geo || 'RU'}
        Формат: подпись + стикеры (через запятую) + призыв к действию
        Ссылка: ${config.offerLink || ''}`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const lines = content.split('\n');
  return {
    caption: lines[0] || '',
    stickers: lines[1]?.split(',').map(s => s.trim()) || ['link', 'location'],
    cta: lines[2] || 'Смотри в профиле',
  };
}

async function generateCollaboration(config: MethodConfig): Promise<{
  proposal: string;
  contentIdeas: string[];
  benefits: string[];
}> {
  const zai = await ZAI.create();
  const partners = config.settings?.collaborationPartners || [];
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты создаёшь предложения для коллабораций в Instagram. Предложения должны быть взаимовыгодными и конкретными.',
      },
      {
        role: 'user',
        content: `Создай предложение для коллаборации в нише "${config.niche || 'lifestyle'}".
        Гео: ${config.geo || 'RU'}
        Партнёры: ${partners.join(', ') || 'потенциальные партнёры'}
        Формат: само предложение + идеи контента (через запятую) + выгоды для обеих сторон`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content || '';
  const lines = content.split('\n');
  return {
    proposal: lines[0] || '',
    contentIdeas: lines[1]?.split(',').map(s => s.trim()) || ['Совместный Reels', 'Live'],
    benefits: lines[2]?.split(',').map(s => s.trim()) || ['Новая аудитория', 'Контент'],
  };
}

// Execute method based on ID
async function executeMethod(config: MethodConfig): Promise<Record<string, unknown>> {
  switch (config.methodId) {
    case 11: // reels_comment
      return { ...await generateReelsComment(config), method: 'reels_comment' };
    case 12: // mass_follow
      return { ...await generateMassFollowSettings(config), method: 'mass_follow' };
    case 13: // stories_interactive
      return { ...await generateInteractiveStory(config), method: 'stories_interactive' };
    case 14: // direct_dm
      return { ...await generateDirectMessage(config), method: 'direct_dm' };
    case 15: // emoji_comment
      return { ...await generateEmojiComment(config), method: 'emoji_comment' };
    case 16: // story_repost
      return { ...await generateStoryRepost(config), method: 'story_repost' };
    case 17: // collaboration
      return { ...await generateCollaboration(config), method: 'collaboration' };
    default:
      throw new Error(`Unknown Instagram method ID: ${config.methodId}`);
  }
}

// GET /api/traffic/instagram - Get methods list and history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const methodId = searchParams.get('methodId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // If methodId provided, return method details
    if (methodId && methodId !== 'all') {
      const method = INSTAGRAM_METHODS.find(m => m.id === parseInt(methodId));
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
    const where: Record<string, number | string> = { platform: 'instagram' };
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
      where: { platform: 'instagram' },
      _sum: {
        totalActions: true,
        totalClicks: true,
        totalConversions: true,
        totalRevenue: true,
      },
    });

    logger.debug('Instagram traffic methods fetched', { count: sources.length });

    return NextResponse.json({
      methods: INSTAGRAM_METHODS,
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
    logger.error('Failed to fetch Instagram traffic methods', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch Instagram traffic methods' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/instagram - Execute/configure a method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MethodConfig & { sourceId?: string; campaignName?: string };

    // Validate method ID
    if (!body.methodId || body.methodId < 11 || body.methodId > 17) {
      return NextResponse.json(
        { error: 'Valid Instagram method ID (11-17) is required' },
        { status: 400 }
      );
    }

    const method = INSTAGRAM_METHODS.find(m => m.id === body.methodId);
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
          platform: 'instagram',
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

    logger.info('Instagram traffic method executed', {
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
    logger.error('Failed to execute Instagram traffic method', error as Error);
    return NextResponse.json(
      { error: 'Failed to execute Instagram traffic method' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/instagram - Update metrics for a source/campaign
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

    logger.info('Instagram traffic metrics updated', { sourceId, campaignId });

    return NextResponse.json({
      success: true,
      source,
      campaign,
    });
  } catch (error) {
    logger.error('Failed to update Instagram traffic metrics', error as Error);
    return NextResponse.json(
      { error: 'Failed to update Instagram traffic metrics' },
      { status: 500 }
    );
  }
}

// DELETE /api/traffic/instagram - Remove a source
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

    logger.info('Instagram traffic source deleted', { sourceId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete Instagram traffic source', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete Instagram traffic source' },
      { status: 500 }
    );
  }
}

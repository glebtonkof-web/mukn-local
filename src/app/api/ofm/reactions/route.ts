import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';

// Доступные реакции для AI-выбора
const AVAILABLE_REACTIONS = ['🔥', '💰', '🎰', '😍', '👍', '😱', '🤔', '❤️', '😂', '👏', '🤝', '💪', '🚀', '✨', '🎯'];

// Контекстные категории реакций
const REACTION_CATEGORIES: Record<string, string[]> = {
  positive: ['🔥', '😍', '👍', '❤️', '👏', '🚀', '✨', '💪'],
  money: ['💰', '🎰', '🚀'],
  emotional: ['😱', '😂', '🤔', '❤️'],
  professional: ['🤝', '🎯', '💪', '👍'],
};

// GET /api/ofm/reactions - Get reaction analytics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');
    const reaction = searchParams.get('reaction');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, string | boolean | number | undefined> = {};
    if (channelId) where.channelId = channelId;
    if (reaction) where.reaction = reaction;

    const analytics = await db.reactionAnalytics.findMany({
      where,
      orderBy: { count: 'desc' },
      take: limit,
    });

    // Aggregate stats
    const stats = await db.reactionAnalytics.aggregate({
      where,
      _sum: {
        count: true,
        profileClicks: true,
        conversions: true,
      },
      _avg: {
        aiScore: true,
      },
    });

    // Top reactions by conversions
    const topReactions = await db.reactionAnalytics.groupBy({
      by: ['reaction'],
      _sum: {
        count: true,
        profileClicks: true,
        conversions: true,
      },
      orderBy: {
        _sum: {
          conversions: 'desc',
        },
      },
      take: 10,
    });

    return NextResponse.json({
      analytics,
      stats: {
        totalReactions: stats._sum.count || 0,
        totalClicks: stats._sum.profileClicks || 0,
        totalConversions: stats._sum.conversions || 0,
        avgAiScore: stats._avg.aiScore || 0,
      },
      topReactions,
      availableReactions: AVAILABLE_REACTIONS,
      reactionCategories: REACTION_CATEGORIES,
    });
  } catch (error) {
    logger.error('Failed to fetch reaction analytics', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch reaction analytics' },
      { status: 500 }
    );
  }
}

// POST /api/ofm/reactions - AI-select best reaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { postContent, channelId, channelTheme, niche } = body;

    if (!postContent) {
      return NextResponse.json(
        { error: 'Post content is required' },
        { status: 400 }
      );
    }

    // Get historical data for this channel/theme
    const historicalData = await db.reactionAnalytics.findMany({
      where: {
        channelId: channelId || 'unknown',
      },
      orderBy: { conversions: 'desc' },
      take: 20,
    });

    // Build context for AI
    const historicalContext = historicalData.length > 0
      ? `Исторические данные по реакциям в этом канале:
${historicalData.map(h => `- ${h.reaction}: ${h.count} использований, ${h.conversions} конверсий`).join('\n')}`
      : 'Исторических данных пока нет.';

    // AI selection of reaction
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Ты — эксперт по эмоциональным триггерам в социальных сетях.
Твоя задача: выбрать ОДНУ реакцию (эмодзи), которая лучше всего подойдёт к посту.

Доступные реакции: ${AVAILABLE_REACTIONS.join(', ')}

Категории реакций:
- positive (позитивные): ${REACTION_CATEGORIES.positive.join(', ')}
- money (деньги): ${REACTION_CATEGORIES.money.join(', ')}
- emotional (эмоциональные): ${REACTION_CATEGORIES.emotional.join(', ')}
- professional (профессиональные): ${REACTION_CATEGORIES.professional.join(', ')}

Правила:
1. Выбери ОДНУ реакцию из списка
2. Реакция должна быть естественной для контента
3. Учитывай тематику канала
4. Цель — привлечь внимание к профилю

${historicalContext}`,
        },
        {
          role: 'user',
          content: `Пост: "${postContent}"
Тематика канала: ${channelTheme || 'общая'}
Ниша: ${niche || 'general'}

Выбери лучшую реакцию и объясни почему.`,
        },
      ],
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    
    // Extract emoji from response
    const reactionMatch = aiResponse.match(new RegExp(`([${AVAILABLE_REACTIONS.join('')}])`));
    const selectedReaction = reactionMatch ? reactionMatch[1] : '👍';

    // Calculate AI score (0-1) based on confidence
    const scoreMatch = aiResponse.match(/(\d+(?:\.\d+)?)/);
    const aiScore = scoreMatch ? Math.min(parseFloat(scoreMatch[1]) / 100, 1) : 0.7;

    // Save to analytics
    const analytics = await db.reactionAnalytics.create({
      data: {
        channelId: channelId || 'unknown',
        postId: body.postId,
        reaction: selectedReaction,
        count: 1,
        aiSelected: true,
        aiScore,
      },
    });

    logger.info('Reaction selected by AI', {
      reaction: selectedReaction,
      aiScore,
      channelId,
    });

    return NextResponse.json({
      success: true,
      reaction: selectedReaction,
      aiScore,
      explanation: aiResponse,
      analyticsId: analytics.id,
      alternatives: AVAILABLE_REACTIONS.filter(r => r !== selectedReaction).slice(0, 3),
    });
  } catch (error) {
    logger.error('Failed to select reaction', error as Error);
    return NextResponse.json(
      { error: 'Failed to select reaction' },
      { status: 500 }
    );
  }
}

// PUT /api/ofm/reactions - Update reaction metrics
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, profileClicks, conversions } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Analytics ID is required' },
        { status: 400 }
      );
    }

    const analytics = await db.reactionAnalytics.update({
      where: { id },
      data: {
        profileClicks: { increment: profileClicks || 0 },
        conversions: { increment: conversions || 0 },
      },
    });

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    logger.error('Failed to update reaction metrics', error as Error);
    return NextResponse.json(
      { error: 'Failed to update reaction metrics' },
      { status: 500 }
    );
  }
}

// PATCH /api/ofm/reactions - Batch reactions
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reactions, channelId, postId } = body;

    if (!reactions || !Array.isArray(reactions)) {
      return NextResponse.json(
        { error: 'Reactions array is required' },
        { status: 400 }
      );
    }

    const results: any[] = [];

    for (const reaction of reactions) {
      const existing = await db.reactionAnalytics.findFirst({
        where: {
          channelId: channelId || 'unknown',
          postId: postId || null,
          reaction,
        },
      });

      if (existing) {
        const updated = await db.reactionAnalytics.update({
          where: { id: existing.id },
          data: { count: { increment: 1 } },
        });
        results.push(updated);
      } else {
        const created = await db.reactionAnalytics.create({
          data: {
            channelId: channelId || 'unknown',
            postId: postId || null,
            reaction,
            count: 1,
            aiSelected: false,
          },
        });
        results.push(created);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    logger.error('Failed to batch reactions', error as Error);
    return NextResponse.json(
      { error: 'Failed to batch reactions' },
      { status: 500 }
    );
  }
}

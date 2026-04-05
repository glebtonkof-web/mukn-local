import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

// 21-day warming strategy configuration
const WARMING_STRATEGY = {
  // Week 1 (Days 1-7) - Ghost Mode
  week1: {
    name: 'Призрак',
    days: [1, 7],
    limits: {
      likes: { min: 5, max: 8 },
      follows: { min: 0, max: 0 },
      comments: { min: 0, max: 0 },
      posts: { min: 0, max: 0 },
      dm: { min: 0, max: 0 },
      timeSpent: { min: 15, max: 20 },
    },
    description: 'Только скроллинг, просмотр Stories, редкие лайки',
    color: '#8A8A8A',
    icon: 'ghost',
  },
  // Week 2 (Days 8-14) - Light Contact
  week2: {
    name: 'Лёгкий контакт',
    days: [8, 14],
    limits: {
      likes: { min: 10, max: 15 },
      follows: { min: 3, max: 5 },
      comments: { min: 1, max: 2 },
      posts: { min: 0, max: 1 },
      dm: { min: 0, max: 0 },
      timeSpent: { min: 20, max: 30 },
    },
    description: 'Лайки, подписки, редкие комментарии',
    color: '#FFB800',
    icon: 'hand-metal',
  },
  // Week 3 (Days 15-21) - Activation
  week3: {
    name: 'Активация',
    days: [15, 21],
    limits: {
      likes: { min: 15, max: 25 },
      follows: { min: 5, max: 10 },
      comments: { min: 3, max: 5 },
      posts: { min: 2, max: 3 },
      dm: { min: 0, max: 0 },
      timeSpent: { min: 30, max: 45 },
    },
    description: 'Полная активность, публикация контента',
    color: '#00D26A',
    icon: 'zap',
  },
  // After 21 days - Stable
  stable: {
    name: 'Стабильный',
    days: [22, 999],
    limits: {
      likes: { min: 50, max: 100 },
      follows: { min: 20, max: 40 },
      comments: { min: 10, max: 20 },
      posts: { min: 1, max: 3 },
      dm: { min: 10, max: 20 },
      timeSpent: { min: 30, max: 60 },
    },
    description: 'Полная активность без ограничений прогрева',
    color: '#6C63FF',
    icon: 'check-circle',
  },
};

// Get phase configuration based on current day
function getPhaseConfig(day: number) {
  if (day >= 1 && day <= 7) {
    return { phase: 'ghost', config: WARMING_STRATEGY.week1 };
  } else if (day >= 8 && day <= 14) {
    return { phase: 'light', config: WARMING_STRATEGY.week2 };
  } else if (day >= 15 && day <= 21) {
    return { phase: 'activation', config: WARMING_STRATEGY.week3 };
  } else {
    return { phase: 'stable', config: WARMING_STRATEGY.stable };
  }
}

// Calculate limits based on day within phase
function calculateLimits(day: number, phaseConfig: typeof WARMING_STRATEGY.week1) {
  const limits = phaseConfig.limits;
  const daysInPhase = phaseConfig.days[1] - phaseConfig.days[0] + 1;
  const dayInPhase = day - phaseConfig.days[0] + 1;
  const progress = dayInPhase / daysInPhase;

  return {
    likes: Math.round(limits.likes.min + (limits.likes.max - limits.likes.min) * progress),
    follows: Math.round(limits.follows.min + (limits.follows.max - limits.follows.min) * progress),
    comments: Math.round(limits.comments.min + (limits.comments.max - limits.comments.min) * progress),
    posts: Math.round(limits.posts.min + (limits.posts.max - limits.posts.min) * progress),
    dm: Math.round(limits.dm.min + (limits.dm.max - limits.dm.min) * progress),
    timeSpent: Math.round(limits.timeSpent.min + (limits.timeSpent.max - limits.timeSpent.min) * progress),
  };
}

// GET /api/warming/instagram - Get Instagram warming data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (accountId) {
      // Get specific account warming data
      const warming = await db.instagramWarming.findUnique({
        where: { accountId },
        include: {
          InstagramWarmingAction: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });

      if (!warming) {
        return NextResponse.json({ error: 'Warming not found' }, { status: 404 });
      }

      // Calculate current phase and limits
      const { phase, config } = getPhaseConfig(warming.currentDay);
      const limits = calculateLimits(warming.currentDay, config);

      // Calculate progress
      const progress = Math.min(100, Math.round((warming.currentDay / 21) * 100));

      return NextResponse.json({
        warming: {
          ...warming,
          phase,
          phaseConfig: config,
          calculatedLimits: limits,
          progress,
        },
        strategy: WARMING_STRATEGY,
      });
    }

    // Get all warming accounts
    const warmings = await db.instagramWarming.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        InstagramWarmingAction: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Enhance with phase info
    const enhancedWarmings = warmings.map((w) => {
      const { phase, config } = getPhaseConfig(w.currentDay);
      const limits = calculateLimits(w.currentDay, config);
      const progress = Math.min(100, Math.round((w.currentDay / 21) * 100));

      return {
        ...w,
        phase,
        phaseConfig: config,
        calculatedLimits: limits,
        progress,
      };
    });

    // Statistics
    const stats = {
      total: warmings.length,
      new: warmings.filter((w) => w.status === 'new').length,
      warming: warmings.filter((w) => w.status === 'warming').length,
      stable: warmings.filter((w) => w.status === 'stable').length,
      ghost: warmings.filter((w) => w.currentDay >= 1 && w.currentDay <= 7).length,
      light: warmings.filter((w) => w.currentDay >= 8 && w.currentDay <= 14).length,
      activation: warmings.filter((w) => w.currentDay >= 15 && w.currentDay <= 21).length,
    };

    return NextResponse.json({
      warmings: enhancedWarmings,
      stats,
      strategy: WARMING_STRATEGY,
    });
  } catch (error) {
    logger.error('Failed to fetch Instagram warming data', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch Instagram warming data' },
      { status: 500 }
    );
  }
}

// POST /api/warming/instagram - Start warming or perform action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, accountId, username, actionType, target } = body;

    if (action === 'start') {
      // Start warming for new account
      if (!accountId || !username) {
        return NextResponse.json(
          { error: 'accountId and username are required' },
          { status: 400 }
        );
      }

      // Check if already exists
      const existing = await db.instagramWarming.findUnique({
        where: { accountId },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Warming already exists for this account' },
          { status: 400 }
        );
      }

      const { phase, config } = getPhaseConfig(1);
      const limits = calculateLimits(1, config);

      const warming = await db.instagramWarming.create({
        data: {
          id: nanoid(),
          accountId,
          username,
          status: 'warming',
          currentDay: 1,
          currentPhase: phase,
          warmingStartedAt: new Date(),
          warmingEndsAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          maxLikes: limits.likes,
          maxFollows: limits.follows,
          maxComments: limits.comments,
          maxPosts: limits.posts,
          maxDm: limits.dm,
          maxTimeSpent: limits.timeSpent,
          updatedAt: new Date(),
        },
      });

      // Log start action
      await db.instagramWarmingAction.create({
        data: {
          id: nanoid(),
          warmingId: warming.id,
          actionType: 'warming_started',
          result: 'success',
          day: 1,
          phase,
        },
      });

      logger.info('Instagram warming started', { accountId, username });

      return NextResponse.json({
        success: true,
        warming,
        message: 'Прогрев запущен',
      });
    }

    if (action === 'perform') {
      // Perform an action (like, follow, comment, etc.)
      if (!accountId || !actionType) {
        return NextResponse.json(
          { error: 'accountId and actionType are required' },
          { status: 400 }
        );
      }

      const warming = await db.instagramWarming.findUnique({
        where: { accountId },
      });

      if (!warming) {
        return NextResponse.json(
          { error: 'Warming not found' },
          { status: 404 }
        );
      }

      // Check if within limits
      const warnings: string[] = [];
      let nearLimit = false;

      switch (actionType) {
        case 'like':
          if (warming.todayLikes >= warming.maxLikes) {
            return NextResponse.json(
              { error: 'Дневной лимит лайков достигнут', limitReached: true },
              { status: 400 }
            );
          }
          if (warming.todayLikes >= warming.maxLikes * 0.8) {
            nearLimit = true;
            warnings.push(`Осталось ${warming.maxLikes - warming.todayLikes} лайков до лимита`);
          }
          break;
        case 'follow':
          if (warming.todayFollows >= warming.maxFollows) {
            return NextResponse.json(
              { error: 'Дневной лимит подписок достигнут', limitReached: true },
              { status: 400 }
            );
          }
          if (warming.todayFollows >= warming.maxFollows * 0.8) {
            nearLimit = true;
            warnings.push(`Осталось ${warming.maxFollows - warming.todayFollows} подписок до лимита`);
          }
          break;
        case 'comment':
          if (warming.todayComments >= warming.maxComments) {
            return NextResponse.json(
              { error: 'Дневной лимит комментариев достигнут', limitReached: true },
              { status: 400 }
            );
          }
          if (warming.todayComments >= warming.maxComments * 0.8) {
            nearLimit = true;
            warnings.push(`Осталось ${warming.maxComments - warming.todayComments} комментариев до лимита`);
          }
          break;
        case 'post':
          if (warming.todayPosts >= warming.maxPosts) {
            return NextResponse.json(
              { error: 'Дневной лимит постов достигнут', limitReached: true },
              { status: 400 }
            );
          }
          break;
        case 'dm':
          if (warming.todayDm >= warming.maxDm) {
            return NextResponse.json(
              { error: 'Дневной лимит DM достигнут', limitReached: true },
              { status: 400 }
            );
          }
          break;
      }

      // Update counters
      const counterField = `today${actionType.charAt(0).toUpperCase() + actionType.slice(1)}s` as keyof typeof warming;
      const totalField = `total${actionType.charAt(0).toUpperCase() + actionType.slice(1)}s` as keyof typeof warming;
      
      const updateData: Record<string, unknown> = {
        [counterField]: (warming[counterField] as number) + 1,
        [totalField]: (warming[totalField] as number) + 1,
        warnings: warnings.length > 0 ? JSON.stringify(warnings) : null,
        lastWarningAt: warnings.length > 0 ? new Date() : null,
        updatedAt: new Date(),
      };

      const updatedWarming = await db.instagramWarming.update({
        where: { accountId },
        data: updateData,
      });

      // Log action
      await db.instagramWarmingAction.create({
        data: {
          id: nanoid(),
          warmingId: warming.id,
          actionType,
          target: target || null,
          result: 'success',
          success: true,
          day: warming.currentDay,
          phase: warming.currentPhase,
        },
      });

      return NextResponse.json({
        success: true,
        warming: updatedWarming,
        nearLimit,
        warnings,
        remaining: {
          likes: warming.maxLikes - warming.todayLikes - (actionType === 'like' ? 1 : 0),
          follows: warming.maxFollows - warming.todayFollows - (actionType === 'follow' ? 1 : 0),
          comments: warming.maxComments - warming.todayComments - (actionType === 'comment' ? 1 : 0),
          posts: warming.maxPosts - warming.todayPosts - (actionType === 'post' ? 1 : 0),
          dm: warming.maxDm - warming.todayDm - (actionType === 'dm' ? 1 : 0),
        },
      });
    }

    if (action === 'nextDay') {
      // Advance to next day (typically called by cron job)
      if (!accountId) {
        return NextResponse.json(
          { error: 'accountId is required' },
          { status: 400 }
        );
      }

      const warming = await db.instagramWarming.findUnique({
        where: { accountId },
      });

      if (!warming) {
        return NextResponse.json(
          { error: 'Warming not found' },
          { status: 404 }
        );
      }

      const newDay = warming.currentDay + 1;
      const { phase, config } = getPhaseConfig(newDay);
      const limits = calculateLimits(newDay, config);

      // Check if warming is complete
      const isComplete = newDay > 21;
      const newStatus = isComplete ? 'stable' : warming.status;

      const updatedWarming = await db.instagramWarming.update({
        where: { accountId },
        data: {
          currentDay: newDay,
          currentPhase: phase,
          status: newStatus,
          // Reset daily counters
          todayLikes: 0,
          todayFollows: 0,
          todayComments: 0,
          todayPosts: 0,
          todayDm: 0,
          todayStoriesViews: 0,
          todayTimeSpent: 0,
          // Update limits
          maxLikes: limits.likes,
          maxFollows: limits.follows,
          maxComments: limits.comments,
          maxPosts: limits.posts,
          maxDm: limits.dm,
          maxTimeSpent: limits.timeSpent,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        warming: updatedWarming,
        phaseChanged: warming.currentPhase !== phase,
        isComplete,
        message: isComplete ? 'Прогрев завершён!' : `День ${newDay} начат`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Failed to process Instagram warming action', error as Error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}

// PUT /api/warming/instagram - Update warming settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, banRisk } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof banRisk === 'number') updateData.banRisk = banRisk;

    const warming = await db.instagramWarming.update({
      where: { accountId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      warming,
    });
  } catch (error) {
    logger.error('Failed to update Instagram warming', error as Error);
    return NextResponse.json(
      { error: 'Failed to update warming' },
      { status: 500 }
    );
  }
}

// DELETE /api/warming/instagram - Delete warming record
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    await db.instagramWarming.delete({
      where: { accountId },
    });

    return NextResponse.json({
      success: true,
      message: 'Warming deleted',
    });
  } catch (error) {
    logger.error('Failed to delete Instagram warming', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete warming' },
      { status: 500 }
    );
  }
}

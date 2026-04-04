import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getPlatformConfig,
  getCurrentPhase,
  getDailyLimits,
  calculateProgress,
  isTrafficReady,
} from '@/lib/warming/platform-configs';
import { generateHumanDelay } from '@/lib/warming/behavior-monitor';

// GET - Fetch all warming accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (platform) where.platform = platform;
    if (status) where.status = status;

    const accounts = await db.account.findMany({
      where,
      include: {
        warming: {
          include: {
            actions: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        },
        proxy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats
    const stats = {
      total: accounts.length,
      byPlatform: {} as Record<string, number>,
      byPhase: {} as Record<string, number>,
      warming: 0,
      stable: 0,
      trafficReady: 0,
    };

    const enrichedAccounts = accounts.map(account => {
      const platformConfig = getPlatformConfig(account.platform);
      const warming = account.warming?.[0];
      
      // Count by platform
      stats.byPlatform[account.platform] = (stats.byPlatform[account.platform] || 0) + 1;

      if (!warming) {
        return {
          ...account,
          currentDay: 0,
          currentPhase: 'not_started',
          todayLikes: 0,
          todayFollows: 0,
          todayComments: 0,
          todayPosts: 0,
          todayDm: 0,
          todayStoriesViews: 0,
          todayInvites: 0,
          todayRetweets: 0,
          todayTimeSpent: 0,
          banRisk: 0,
          progress: 0,
          phase: 'not_started',
          phaseConfig: null,
          maxLimits: null,
          proxyHost: account.proxy?.host,
          proxyCountry: account.proxy?.country,
        };
      }

      const currentDay = warming.currentDay;
      const phase = getCurrentPhase(account.platform, currentDay);
      const progress = calculateProgress(account.platform, currentDay);
      const trafficReady = isTrafficReady(account.platform, currentDay);
      const limits = getDailyLimits(account.platform, currentDay);

      // Count by phase
      if (phase) {
        stats.byPhase[phase.name] = (stats.byPhase[phase.name] || 0) + 1;
      }

      // Count status
      if (trafficReady) {
        stats.trafficReady++;
        stats.stable++;
      } else if (warming.status === 'warming') {
        stats.warming++;
      }

      // Calculate ban risk based on behavior
      let banRisk = warming.banRisk || 0;
      
      // Increase risk if over limits
      const todayActions = warming.todayLikes + warming.todayFollows + warming.todayComments;
      const maxActions = (limits?.likes.max || 0) + (limits?.follows.max || 0) + (limits?.comments.max || 0);
      if (maxActions > 0 && todayActions > maxActions * 0.9) {
        banRisk = Math.min(100, banRisk + 10);
      }

      return {
        ...account,
        currentDay,
        currentPhase: phase?.name || 'unknown',
        todayLikes: warming.todayLikes,
        todayFollows: warming.todayFollows,
        todayComments: warming.todayComments,
        todayPosts: warming.todayPosts,
        todayDm: warming.todayDm,
        todayStoriesViews: warming.todayStoriesViews,
        todayInvites: warming.todayInvites || 0,
        todayRetweets: warming.todayRetweets || 0,
        todayTimeSpent: warming.todayTimeSpent,
        banRisk,
        progress,
        phase: phase?.icon || 'unknown',
        phaseConfig: phase,
        maxLimits: limits,
        proxyHost: account.proxy?.host,
        proxyCountry: account.proxy?.country,
        fingerprintScore: warming.fingerprintScore,
        behaviorScore: warming.behaviorScore,
      };
    });

    return NextResponse.json({
      accounts: enrichedAccounts,
      stats,
    });
  } catch (error) {
    console.error('Error fetching warming accounts:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке данных' },
      { status: 500 }
    );
  }
}

// POST - Perform warming action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, accountId, username, platform, actionType } = body;

    switch (action) {
      case 'start': {
        // Start warming for a new account
        if (!accountId || !username || !platform) {
          return NextResponse.json(
            { error: 'Необходимы accountId, username и platform' },
            { status: 400 }
          );
        }

        // Check if account exists
        let account = await db.account.findFirst({
          where: {
            OR: [
              { id: accountId },
              { username: username },
            ],
          },
        });

        // Create account if doesn't exist
        if (!account) {
          account = await db.account.create({
            data: {
              id: accountId,
              username,
              platform,
              status: 'active',
            },
          });
        }

        // Check if warming already exists
        const existingWarming = await db.instagramWarming.findFirst({
          where: { accountId: account.id },
        });

        if (existingWarming) {
          return NextResponse.json(
            { error: 'Прогрев уже запущен для этого аккаунта' },
            { status: 400 }
          );
        }

        // Get platform config
        const config = getPlatformConfig(platform);
        if (!config) {
          return NextResponse.json(
            { error: 'Неподдерживаемая платформа' },
            { status: 400 }
          );
        }

        // Create warming record
        const warming = await db.instagramWarming.create({
          data: {
            accountId: account.id,
            status: 'warming',
            currentDay: 1,
            warmingStartedAt: new Date(),
            warmingEndsAt: addDays(new Date(), config.totalWarmingDays),
            todayLikes: 0,
            todayFollows: 0,
            todayComments: 0,
            todayPosts: 0,
            todayDm: 0,
            todayStoriesViews: 0,
            todayInvites: 0,
            todayRetweets: 0,
            todayTimeSpent: 0,
            banRisk: 0,
            totalLikes: 0,
            totalFollows: 0,
            totalComments: 0,
            totalPosts: 0,
            totalDm: 0,
          },
        });

        // Log warming started action
        await db.instagramWarmingAction.create({
          data: {
            warmingId: warming.id,
            actionType: 'warming_started',
            target: null,
            result: `Прогрев запущен на ${config.totalWarmingDays} дней`,
            success: true,
            day: 1,
            phase: config.phases[0].name,
          },
        });

        return NextResponse.json({
          success: true,
          warming,
          message: 'Прогрев успешно запущен',
        });
      }

      case 'perform': {
        // Perform a warming action
        if (!accountId || !actionType) {
          return NextResponse.json(
            { error: 'Необходимы accountId и actionType' },
            { status: 400 }
          );
        }

        const warming = await db.instagramWarming.findFirst({
          where: { accountId },
        });

        if (!warming) {
          return NextResponse.json(
            { error: 'Прогрев не найден' },
            { status: 404 }
          );
        }

        // Get limits for current day
        const account = await db.account.findUnique({
          where: { id: accountId },
        });
        
        if (!account) {
          return NextResponse.json(
            { error: 'Аккаунт не найден' },
            { status: 404 }
          );
        }

        const limits = getDailyLimits(account.platform, warming.currentDay);
        if (!limits) {
          return NextResponse.json(
            { error: 'Не удалось получить лимиты' },
            { status: 500 }
          );
        }

        // Check if limit reached
        const limitCheck = checkLimit(warming, actionType, limits);
        if (limitCheck.reached) {
          return NextResponse.json(
            { 
              error: limitCheck.message,
              limitReached: true,
            },
            { status: 400 }
          );
        }

        // Update counters
        const updateData: Record<string, number> = {};
        const fieldMap: Record<string, string> = {
          like: 'todayLikes',
          follow: 'todayFollows',
          comment: 'todayComments',
          post: 'todayPosts',
          dm: 'todayDm',
          view: 'todayStoriesViews',
          invite: 'todayInvites',
          retweet: 'todayRetweets',
        };

        const field = fieldMap[actionType];
        if (field) {
          updateData[field] = (warming as Record<string, number>)[field] + 1;
          
          // Also update total
          const totalField = `total${field.replace('today', '')}` as string;
          if (totalField in warming) {
            updateData[totalField] = (warming as Record<string, number>)[totalField] + 1;
          }
        }

        // Update warming record
        const updatedWarming = await db.instagramWarming.update({
          where: { id: warming.id },
          data: updateData,
        });

        // Log action
        const phase = getCurrentPhase(account.platform, warming.currentDay);
        await db.instagramWarmingAction.create({
          data: {
            warmingId: warming.id,
            actionType,
            target: null,
            result: 'Успешно выполнено',
            success: true,
            day: warming.currentDay,
            phase: phase?.name || 'unknown',
          },
        });

        // Check if near limit
        const warnings: string[] = [];
        if (limitCheck.nearLimit) {
          warnings.push(limitCheck.message);
        }

        return NextResponse.json({
          success: true,
          account: {
            todayLikes: updatedWarming.todayLikes,
            todayFollows: updatedWarming.todayFollows,
            todayComments: updatedWarming.todayComments,
            todayPosts: updatedWarming.todayPosts,
            todayDm: updatedWarming.todayDm,
            todayStoriesViews: updatedWarming.todayStoriesViews,
            todayInvites: updatedWarming.todayInvites,
            todayRetweets: updatedWarming.todayRetweets,
          },
          nearLimit: limitCheck.nearLimit,
          warnings,
        });
      }

      case 'nextDay': {
        // Advance to next day
        if (!accountId) {
          return NextResponse.json(
            { error: 'Необходим accountId' },
            { status: 400 }
          );
        }

        const warming = await db.instagramWarming.findFirst({
          where: { accountId },
        });

        if (!warming) {
          return NextResponse.json(
            { error: 'Прогрев не найден' },
            { status: 404 }
          );
        }

        const account = await db.account.findUnique({
          where: { id: accountId },
        });

        if (!account) {
          return NextResponse.json(
            { error: 'Аккаунт не найден' },
            { status: 404 }
          );
        }

        const config = getPlatformConfig(account.platform);
        if (!config) {
          return NextResponse.json(
            { error: 'Платформа не найдена' },
            { status: 400 }
          );
        }

        const newDay = warming.currentDay + 1;
        const isComplete = newDay > config.totalWarmingDays;
        const phase = getCurrentPhase(account.platform, newDay);

        // Reset daily counters
        const updatedWarming = await db.instagramWarming.update({
          where: { id: warming.id },
          data: {
            currentDay: newDay,
            status: isComplete ? 'stable' : 'warming',
            todayLikes: 0,
            todayFollows: 0,
            todayComments: 0,
            todayPosts: 0,
            todayDm: 0,
            todayStoriesViews: 0,
            todayInvites: 0,
            todayRetweets: 0,
            todayTimeSpent: 0,
          },
        });

        // Log day change
        await db.instagramWarmingAction.create({
          data: {
            warmingId: warming.id,
            actionType: 'day_change',
            target: null,
            result: `День ${newDay}${isComplete ? ' - прогрев завершён!' : ''}`,
            success: true,
            day: newDay,
            phase: phase?.name || 'complete',
          },
        });

        return NextResponse.json({
          success: true,
          message: `Перешли на день ${newDay}`,
          isComplete,
          currentDay: newDay,
          phase: phase?.nameRu,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Неизвестное действие' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in warming API:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Helper function to check limits
function checkLimit(
  warming: {
    todayLikes: number;
    todayFollows: number;
    todayComments: number;
    todayPosts: number;
    todayDm: number;
    todayStoriesViews: number;
    todayInvites: number;
    todayRetweets: number;
  },
  actionType: string,
  limits: ReturnType<typeof getDailyLimits>
): { reached: boolean; nearLimit: boolean; message: string } {
  if (!limits) {
    return { reached: false, nearLimit: false, message: '' };
  }

  const checks: Record<string, { current: number; max: number; label: string }> = {
    like: { current: warming.todayLikes, max: limits.likes.max, label: 'лайков' },
    follow: { current: warming.todayFollows, max: limits.follows.max, label: 'подписок' },
    comment: { current: warming.todayComments, max: limits.comments.max, label: 'комментариев' },
    post: { current: warming.todayPosts, max: limits.posts.max, label: 'постов' },
    dm: { current: warming.todayDm, max: limits.dm.max, label: 'сообщений' },
    view: { current: warming.todayStoriesViews, max: limits.stories?.max || 0, label: 'просмотров' },
    invite: { current: warming.todayInvites, max: limits.invites?.max || 0, label: 'инвайтов' },
    retweet: { current: warming.todayRetweets, max: limits.retweets?.max || 0, label: 'репостов' },
  };

  const check = checks[actionType];
  if (!check) {
    return { reached: false, nearLimit: false, message: '' };
  }

  const percentage = check.max > 0 ? (check.current / check.max) * 100 : 0;

  if (check.current >= check.max) {
    return {
      reached: true,
      nearLimit: true,
      message: `Достигнут лимит ${check.label} на сегодня (${check.max})`,
    };
  }

  if (percentage >= 80) {
    return {
      reached: false,
      nearLimit: true,
      message: `Близко к лимиту ${check.label}: ${check.current}/${check.max}`,
    };
  }

  return { reached: false, nearLimit: false, message: '' };
}

// Helper to add days
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

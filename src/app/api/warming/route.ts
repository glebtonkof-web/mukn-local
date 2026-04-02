import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry, createCircuitBreaker } from '@/lib/resilience';
import { logger } from '@/lib/logger';

const dbCircuitBreaker = createCircuitBreaker('database', { circuitBreakerThreshold: 3 });

// Warming modes configuration
const WARMING_MODES = {
  fast: {
    durationDays: 3,
    actionsPerDay: 100,
    maxChannelsJoin: 10,
    messageDelayMin: 15,
    messageDelayMax: 60,
    description: 'Быстрый прогрев - высокий риск бана',
    riskLevel: 'high',
  },
  standard: {
    durationDays: 7,
    actionsPerDay: 50,
    maxChannelsJoin: 5,
    messageDelayMin: 30,
    messageDelayMax: 120,
    description: 'Стандартный прогрев - рекомендуемый режим',
    riskLevel: 'medium',
  },
  maximum: {
    durationDays: 14,
    actionsPerDay: 30,
    maxChannelsJoin: 3,
    messageDelayMin: 60,
    messageDelayMax: 300,
    description: 'Максимальный прогрев - низкий риск бана',
    riskLevel: 'low',
  },
  premium: {
    durationDays: 21,
    actionsPerDay: 20,
    maxChannelsJoin: 2,
    messageDelayMin: 120,
    messageDelayMax: 600,
    description: 'Премиум прогрев - минимальный риск бана',
    riskLevel: 'very_low',
  },
} as const;

type WarmingMode = keyof typeof WARMING_MODES;

interface WarmingSettingsRequest {
  accountId: string;
  mode?: WarmingMode;
  enabled?: boolean;
  durationDays?: number;
  actionsPerDay?: number;
  maxChannelsJoin?: number;
  messageDelayMin?: number;
  messageDelayMax?: number;
  joinChannels?: string[];
  userId?: string;
}

// Calculate warming progress
function calculateProgress(startDate: Date, endDate: Date, actionsCompleted: number, targetActions: number): number {
  const now = new Date();
  
  // If warming hasn't started yet
  if (now < startDate) return 0;
  
  // If warming is complete
  if (now >= endDate) {
    return Math.min(100, Math.round((actionsCompleted / targetActions) * 100));
  }
  
  // Calculate time-based progress
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  const timeProgress = (elapsed / totalDuration) * 100;
  
  // Calculate action-based progress
  const actionProgress = (actionsCompleted / targetActions) * 100;
  
  // Weight: 60% time, 40% actions
  return Math.round(timeProgress * 0.6 + actionProgress * 0.4);
}

// GET /api/warming - Get warming settings and status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const userId = searchParams.get('userId') || 'default-user';
    const includeStats = searchParams.get('stats') === 'true';

    // Get warming settings
    const whereClause: Record<string, unknown> = { userId };
    if (accountId) whereClause.accountId = accountId;

    const warmingSettings = await dbCircuitBreaker.execute(() =>
      db.warmingSettings.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      })
    );

    // Get accounts with warming status
    const accounts = await db.account.findMany({
      where: { userId, status: { in: ['warming', 'active', 'pending'] } },
      include: {
        influencers: {
          select: { id: true, name: true },
        },
        _count: {
          select: { actions: true },
        },
      },
    });

    // Calculate warming progress for each account
    const accountsWithProgress = accounts.map((account) => {
      let progress = 0;
      let status = 'not_started';
      let daysRemaining = 0;

      if (account.status === 'warming' && account.warmingStartedAt && account.warmingEndsAt) {
        status = 'in_progress';
        progress = calculateProgress(
          account.warmingStartedAt,
          account.warmingEndsAt,
          account._count.actions,
          (account.maxComments + account.maxDm + account.maxFollows) * 7
        );
        daysRemaining = Math.max(0, Math.ceil(
          (account.warmingEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ));
      } else if (account.status === 'active') {
        status = 'completed';
        progress = 100;
      }

      return {
        ...account,
        warmingProgress: account.warmingProgress || progress,
        warmingStatus: status,
        daysRemaining,
      };
    });

    // Statistics
    const stats = {
      totalAccounts: accounts.length,
      warming: accounts.filter((a) => a.status === 'warming').length,
      completed: accounts.filter((a) => a.status === 'active').length,
      pending: accounts.filter((a) => a.status === 'pending').length,
      averageProgress: Math.round(
        accountsWithProgress.reduce((sum, a) => sum + (a.warmingProgress || 0), 0) / accounts.length || 0
      ),
    };

    logger.debug('Warming settings fetched', { accountId, count: warmingSettings.length });

    return NextResponse.json({
      warmingSettings,
      accounts: accountsWithProgress,
      modes: WARMING_MODES,
      stats: includeStats ? stats : undefined,
    });
  } catch (error) {
    logger.error('Failed to fetch warming settings', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch warming settings' },
      { status: 500 }
    );
  }
}

// POST /api/warming - Start warming for account
export async function POST(request: NextRequest) {
  try {
    const body: WarmingSettingsRequest = await request.json();

    if (!body.accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Check if account exists
    const account = await db.account.findUnique({
      where: { id: body.accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (account.status === 'banned') {
      return NextResponse.json(
        { error: 'Cannot start warming for banned account' },
        { status: 400 }
      );
    }

    if (account.status === 'warming') {
      return NextResponse.json(
        { error: 'Account is already warming' },
        { status: 400 }
      );
    }

    // Get mode configuration
    const mode = body.mode || 'standard';
    if (!WARMING_MODES[mode]) {
      return NextResponse.json(
        { error: `Invalid mode. Supported: ${Object.keys(WARMING_MODES).join(', ')}` },
        { status: 400 }
      );
    }

    const modeConfig = WARMING_MODES[mode];
    const durationDays = body.durationDays || modeConfig.durationDays;
    const actionsPerDay = body.actionsPerDay || modeConfig.actionsPerDay;

    const warmingStartedAt = new Date();
    const warmingEndsAt = new Date(warmingStartedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Create or update warming settings
    const warmingSettings = await withRetry(() =>
      db.warmingSettings.create({
        data: {
          enabled: true,
          mode,
          durationDays,
          actionsPerDay,
          maxChannelsJoin: body.maxChannelsJoin || modeConfig.maxChannelsJoin,
          messageDelayMin: body.messageDelayMin || modeConfig.messageDelayMin,
          messageDelayMax: body.messageDelayMax || modeConfig.messageDelayMax,
          joinChannels: body.joinChannels ? JSON.stringify(body.joinChannels) : null,
          userId: body.userId || 'default-user',
        },
      })
    );

    // Update account status
    const updatedAccount = await db.account.update({
      where: { id: body.accountId },
      data: {
        status: 'warming',
        warmingStartedAt,
        warmingEndsAt,
        warmingProgress: 0,
        maxComments: Math.round(actionsPerDay * 0.4),
        maxDm: Math.round(actionsPerDay * 0.2),
        maxFollows: Math.round(actionsPerDay * 0.4),
      },
    });

    // Log action
    await db.accountAction.create({
      data: {
        actionType: 'warming_started',
        result: 'success',
        accountId: body.accountId,
      },
    });

    logger.info('Warming started', {
      accountId: body.accountId,
      mode,
      durationDays,
      endsAt: warmingEndsAt,
    });

    return NextResponse.json({
      success: true,
      account: updatedAccount,
      warmingSettings,
      message: `Warming started with ${mode} mode. Duration: ${durationDays} days.`,
    });
  } catch (error) {
    logger.error('Failed to start warming', error as Error);
    return NextResponse.json(
      { error: 'Failed to start warming' },
      { status: 500 }
    );
  }
}

// PUT /api/warming - Update warming settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, settingsId, ...data } = body;

    if (!accountId && !settingsId) {
      return NextResponse.json(
        { error: 'Account ID or Settings ID is required' },
        { status: 400 }
      );
    }

    // Validate mode if provided
    if (data.mode && !WARMING_MODES[data.mode as WarmingMode]) {
      return NextResponse.json(
        { error: `Invalid mode. Supported: ${Object.keys(WARMING_MODES).join(', ')}` },
        { status: 400 }
      );
    }

    // Update warming settings
    const updateWhere = settingsId 
      ? { id: settingsId } 
      : { id: await getWarmingSettingsId(accountId) };

    if (!updateWhere.id) {
      return NextResponse.json(
        { error: 'Warming settings not found' },
        { status: 404 }
      );
    }

    const updatedSettings = await db.warmingSettings.update({
      where: updateWhere,
      data: {
        ...data,
        joinChannels: data.joinChannels ? JSON.stringify(data.joinChannels) : undefined,
        updatedAt: new Date(),
      },
    });

    // Update account if accountId provided
    if (accountId && data.mode) {
      const modeConfig = WARMING_MODES[data.mode as WarmingMode];
      await db.account.update({
        where: { id: accountId },
        data: {
          maxComments: Math.round((data.actionsPerDay || modeConfig.actionsPerDay) * 0.4),
          maxDm: Math.round((data.actionsPerDay || modeConfig.actionsPerDay) * 0.2),
          maxFollows: Math.round((data.actionsPerDay || modeConfig.actionsPerDay) * 0.4),
        },
      });
    }

    logger.info('Warming settings updated', { accountId, settingsId, updates: Object.keys(data) });

    return NextResponse.json({
      warmingSettings: updatedSettings,
      message: 'Warming settings updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update warming settings', error as Error);
    return NextResponse.json(
      { error: 'Failed to update warming settings' },
      { status: 500 }
    );
  }
}

// DELETE /api/warming - Stop warming
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const complete = searchParams.get('complete') === 'true';

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get account
    const account = await db.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Update account status
    const newStatus = complete ? 'active' : 'pending';
    await db.account.update({
      where: { id: accountId },
      data: {
        status: newStatus,
        warmingProgress: complete ? 100 : account.warmingProgress,
        warmingEndsAt: complete ? new Date() : null,
      },
    });

    // Log action
    await db.accountAction.create({
      data: {
        actionType: complete ? 'warming_completed' : 'warming_stopped',
        result: 'success',
        accountId,
      },
    });

    logger.info('Warming stopped', { accountId, completed: complete });

    return NextResponse.json({
      success: true,
      message: complete ? 'Warming completed successfully' : 'Warming stopped',
      newStatus,
    });
  } catch (error) {
    logger.error('Failed to stop warming', error as Error);
    return NextResponse.json(
      { error: 'Failed to stop warming' },
      { status: 500 }
    );
  }
}

// Helper to get warming settings ID for account
async function getWarmingSettingsId(accountId: string): Promise<string | null> {
  const account = await db.account.findUnique({
    where: { id: accountId },
    include: { user: { include: { warmingSettings: { take: 1, orderBy: { createdAt: 'desc' } } } } },
  });
  return account?.user.warmingSettings[0]?.id || null;
}

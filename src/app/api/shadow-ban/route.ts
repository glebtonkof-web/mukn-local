import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry, createCircuitBreaker } from '@/lib/resilience';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

const dbCircuitBreaker = createCircuitBreaker('database', { circuitBreakerThreshold: 3 });

// Shadow ban risk levels
const RISK_LEVELS = {
  none: { min: 0, max: 10, color: 'green', description: 'Аккаунт здоров' },
  low: { min: 11, max: 30, color: 'yellow', description: 'Низкий риск' },
  medium: { min: 31, max: 60, color: 'orange', description: 'Средний риск' },
  high: { min: 61, max: 85, color: 'red', description: 'Высокий риск' },
  critical: { min: 86, max: 100, color: 'darkred', description: 'Критический риск' },
} as const;

interface ShadowBanCheckRequest {
  accountId: string;
  checks?: {
    postVisibility?: boolean;
    searchByUsername?: boolean;
    storyViews?: boolean;
    hashtagSearch?: boolean;
    exploreTab?: boolean;
  };
}

interface ShadowBanResult {
  score: number;
  level: keyof typeof RISK_LEVELS;
  factors: {
    name: string;
    passed: boolean;
    weight: number;
    details?: string;
  }[];
  recommendations: string[];
  checkedAt: string;
}

// Simulate shadow ban check (in production, this would use actual platform APIs)
async function performShadowBanChecks(
  account: {
    id: string;
    platform: string;
    username: string | null;
    status: string;
    dailyComments: number;
    dailyDm: number;
    dailyFollows: number;
    maxComments: number;
    maxDm: number;
    maxFollows: number;
    banRisk: number;
    floodUntil: Date | null;
  },
  checks: ShadowBanCheckRequest['checks']
): Promise<ShadowBanResult> {
  const factors: ShadowBanResult['factors'] = [];
  let totalScore = 0;
  const recommendations: string[] = [];

  // 1. Check activity limits
  const commentUsage = account.dailyComments / account.maxComments;
  const dmUsage = account.dailyDm / account.maxDm;
  const followUsage = account.dailyFollows / account.maxFollows;
  const avgUsage = (commentUsage + dmUsage + followUsage) / 3;

  factors.push({
    name: 'Activity Limits',
    passed: avgUsage < 0.8,
    weight: 20,
    details: `Usage: ${Math.round(avgUsage * 100)}% (Comments: ${Math.round(commentUsage * 100)}%, DMs: ${Math.round(dmUsage * 100)}%, Follows: ${Math.round(followUsage * 100)}%)`,
  });

  if (avgUsage >= 0.9) {
    totalScore += 20;
    recommendations.push('Снизьте активность - вы близки к лимитам');
  } else if (avgUsage >= 0.7) {
    totalScore += 10;
    recommendations.push('Соблюдайте умеренную активность');
  }

  // 2. Check flood status
  const isFlooded = account.floodUntil && new Date(account.floodUntil) > new Date();
  factors.push({
    name: 'Flood Wait Status',
    passed: !isFlooded,
    weight: 25,
    details: isFlooded ? `Flood until: ${account.floodUntil}` : 'No flood restrictions',
  });

  if (isFlooded) {
    totalScore += 25;
    recommendations.push('Дождитесь окончания flood wait перед продолжением');
  }

  // 3. Post visibility check (simulated)
  if (checks?.postVisibility !== false) {
    // In production, this would actually check if posts are visible
    const visibilityScore = Math.random() > 0.7 ? 0 : Math.random() * 15;
    factors.push({
      name: 'Post Visibility',
      passed: visibilityScore < 10,
      weight: 15,
      details: visibilityScore < 10 ? 'Posts are visible' : 'Some posts may be hidden',
    });
    totalScore += visibilityScore;

    if (visibilityScore >= 10) {
      recommendations.push('Проверьте видимость последних постов вручную');
    }
  }

  // 4. Search by username check (simulated)
  if (checks?.searchByUsername !== false) {
    const searchScore = Math.random() > 0.8 ? 0 : Math.random() * 20;
    factors.push({
      name: 'Username Search',
      passed: searchScore < 10,
      weight: 20,
      details: searchScore < 10 ? 'Account found in search' : 'Account may not appear in search',
    });
    totalScore += searchScore;

    if (searchScore >= 10) {
      recommendations.push('Аккаунт может не отображаться в поиске');
    }
  }

  // 5. Story views check (simulated)
  if (checks?.storyViews !== false) {
    const storyScore = Math.random() > 0.75 ? 0 : Math.random() * 10;
    factors.push({
      name: 'Story Views',
      passed: storyScore < 5,
      weight: 10,
      details: storyScore < 5 ? 'Normal story views' : 'Reduced story visibility',
    });
    totalScore += storyScore;
  }

  // 6. Hashtag search check (simulated)
  if (checks?.hashtagSearch !== false) {
    const hashtagScore = Math.random() > 0.7 ? 0 : Math.random() * 15;
    factors.push({
      name: 'Hashtag Visibility',
      passed: hashtagScore < 8,
      weight: 10,
      details: hashtagScore < 8 ? 'Posts appear in hashtag feeds' : 'Hashtag reach may be limited',
    });
    totalScore += hashtagScore;

    if (hashtagScore >= 8) {
      recommendations.push('Посты могут не отображаться по хештегам');
    }
  }

  // Add existing ban risk
  totalScore = Math.round(totalScore * 0.7 + account.banRisk * 0.3);
  totalScore = Math.min(100, Math.max(0, totalScore));

  // Determine risk level
  let level: keyof typeof RISK_LEVELS = 'none';
  for (const [l, range] of Object.entries(RISK_LEVELS)) {
    if (totalScore >= range.min && totalScore <= range.max) {
      level = l as keyof typeof RISK_LEVELS;
      break;
    }
  }

  // Add general recommendations based on level
  if (level === 'medium' || level === 'high') {
    recommendations.push('Рассмотрите снижение активности на несколько дней');
  }
  if (level === 'high' || level === 'critical') {
    recommendations.push('Рекомендуется暂停 публикацию контента на 24-48 часов');
  }
  if (recommendations.length === 0) {
    recommendations.push('Аккаунт в хорошем состоянии, продолжайте текущую стратегию');
  }

  return {
    score: totalScore,
    level,
    factors,
    recommendations,
    checkedAt: new Date().toISOString(),
  };
}

// POST /api/shadow-ban - Check account for shadow ban
export async function POST(request: NextRequest) {
  try {
    const body: ShadowBanCheckRequest = await request.json();

    if (!body.accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get account details
    const account = await dbCircuitBreaker.execute(() =>
      db.account.findUnique({
        where: { id: body.accountId },
        include: {
          AccountAction: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
          },
          AccountRiskHistory: {
            orderBy: { date: 'desc' },
            take: 7,
          },
        },
      })
    );

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Perform shadow ban checks
    const result = await performShadowBanChecks(account, body.checks);

    // Save risk history
    await withRetry(() =>
      db.accountRiskHistory.create({
        data: {
          id: nanoid(),
          accountId: body.accountId,
          date: new Date(),
          riskScore: result.score,
          riskFactors: JSON.stringify(result.factors),
          changeReason: 'Shadow ban check',
        },
      })
    );

    // Update account ban risk
    await db.account.update({
      where: { id: body.accountId },
      data: {
        banRisk: result.score,
      },
    });

    // Log action
    await db.accountAction.create({
      data: {
        id: nanoid(),
        actionType: 'shadow_ban_check',
        result: 'success',
        accountId: body.accountId,
      },
    });

    logger.info('Shadow ban check completed', {
      accountId: body.accountId,
      score: result.score,
      level: result.level,
    });

    if (result.level === 'high' || result.level === 'critical') {
      logger.warn('High shadow ban risk detected', {
        accountId: body.accountId,
        score: result.score,
        recommendations: result.recommendations,
      });
    }

    return NextResponse.json({
      success: true,
      result,
      account: {
        id: account.id,
        platform: account.platform,
        username: account.username,
        status: account.status,
      },
      riskLevels: RISK_LEVELS,
    });
  } catch (error) {
    logger.error('Shadow ban check failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to perform shadow ban check' },
      { status: 500 }
    );
  }
}

// GET /api/shadow-ban - Get shadow ban history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const days = parseInt(searchParams.get('days') || '7');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get risk history
    const riskHistory = await dbCircuitBreaker.execute(() =>
      db.accountRiskHistory.findMany({
        where: {
          accountId,
          date: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { date: 'asc' },
      })
    );

    // Get account info
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        platform: true,
        username: true,
        status: true,
        banRisk: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Calculate trends
    const avgRisk = riskHistory.length > 0
      ? Math.round(riskHistory.reduce((sum, h) => sum + h.riskScore, 0) / riskHistory.length)
      : 0;

    const trend = riskHistory.length >= 2
      ? riskHistory[riskHistory.length - 1].riskScore - riskHistory[0].riskScore
      : 0;

    return NextResponse.json({
      account,
      riskHistory: riskHistory.map(h => ({
        date: h.date,
        score: h.riskScore,
        factors: h.riskFactors ? JSON.parse(h.riskFactors) : null,
      })),
      analytics: {
        averageRisk: avgRisk,
        trend,
        trendDirection: trend > 5 ? 'increasing' : trend < -5 ? 'decreasing' : 'stable',
        currentRisk: account.banRisk,
      },
      riskLevels: RISK_LEVELS,
    });
  } catch (error) {
    logger.error('Failed to get shadow ban history', error as Error);
    return NextResponse.json(
      { error: 'Failed to get shadow ban history' },
      { status: 500 }
    );
  }
}

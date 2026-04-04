import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry, createCircuitBreaker } from '@/lib/resilience';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

const dbCircuitBreaker = createCircuitBreaker('database', { circuitBreakerThreshold: 3 });

// Risk factor weights for predictive analysis
const RISK_FACTORS = {
  // Activity factors (higher = more risky)
  highActivityRate: { weight: 15, threshold: 0.8 },
  rapidFollows: { weight: 20, threshold: 50 },
  rapidComments: { weight: 15, threshold: 30 },
  rapidDm: { weight: 25, threshold: 20 },
  
  // Error factors
  recentErrors: { weight: 30, threshold: 3 },
  floodWaits: { weight: 35, threshold: 1 },
  rateLimits: { weight: 25, threshold: 1 },
  
  // Account factors
  newAccount: { weight: 20, threshold: 7 }, // days
  lowActivity: { weight: 10, threshold: 0.1 },
  
  // Pattern factors
  inconsistentActivity: { weight: 15, threshold: 0.5 },
  nightActivity: { weight: 10, threshold: 0.3 },
};

interface AccountRiskAnalysis {
  accountId: string;
  accountInfo: {
    platform: string;
    username: string | null;
    status: string;
    banRisk: number;
    createdAt: Date;
    lastUsedAt: Date | null;
  };
  riskScore: number;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  factors: {
    name: string;
    value: number;
    threshold: number;
    weight: number;
    contribution: number;
    status: 'ok' | 'warning' | 'danger';
  }[];
  predictedLifeDays: number | null;
  recommendations: string[];
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    change7d: number;
  };
  alerts: {
    type: 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }[];
}

// Calculate risk level from score
function getRiskLevel(score: number): AccountRiskAnalysis['riskLevel'] {
  if (score <= 10) return 'none';
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 85) return 'high';
  return 'critical';
}

// Predict account life in days based on risk
function predictLifeDays(riskScore: number, accountAge: number): number {
  if (riskScore <= 20) return 90; // Very safe
  if (riskScore <= 40) return 60; // Safe
  if (riskScore <= 60) return 30; // Moderate risk
  if (riskScore <= 80) return 14; // High risk
  return 7; // Critical risk
}

// Analyze account risk
async function analyzeAccountRisk(
  account: {
    id: string;
    platform: string;
    username: string | null;
    status: string;
    banRisk: number;
    createdAt: Date;
    lastUsedAt: Date | null;
    dailyComments: number;
    dailyDm: number;
    dailyFollows: number;
    dailyLikes: number;
    maxComments: number;
    maxDm: number;
    maxFollows: number;
    floodUntil: Date | null;
    warmingStartedAt: Date | null;
    userId: string;
  },
  actions: {
    actionType: string;
    result: string | null;
    error: string | null;
    createdAt: Date;
  }[],
  riskHistory: {
    date: Date;
    riskScore: number;
  }[]
): Promise<AccountRiskAnalysis> {
  const factors: AccountRiskAnalysis['factors'] = [];
  let totalRisk = 0;
  const recommendations: string[] = [];
  const alerts: AccountRiskAnalysis['alerts'] = [];

  // Calculate activity rates
  const activityRate = (
    account.dailyComments / account.maxComments +
    account.dailyDm / account.maxDm +
    account.dailyFollows / account.maxFollows
  ) / 3;

  // Factor 1: High activity rate
  const activityRisk = activityRate > RISK_FACTORS.highActivityRate.threshold
    ? Math.min(activityRate * RISK_FACTORS.highActivityRate.weight, RISK_FACTORS.highActivityRate.weight)
    : 0;
  factors.push({
    name: 'Activity Rate',
    value: activityRate,
    threshold: RISK_FACTORS.highActivityRate.threshold,
    weight: RISK_FACTORS.highActivityRate.weight,
    contribution: activityRisk,
    status: activityRate > 0.9 ? 'danger' : activityRate > 0.7 ? 'warning' : 'ok',
  });
  totalRisk += activityRisk;

  // Factor 2: Recent errors
  const recentErrors = actions.filter(
    a => a.result?.includes('failed') && 
    a.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;
  const errorRisk = recentErrors > RISK_FACTORS.recentErrors.threshold
    ? Math.min(recentErrors * 5, RISK_FACTORS.recentErrors.weight)
    : 0;
  factors.push({
    name: 'Recent Errors',
    value: recentErrors,
    threshold: RISK_FACTORS.recentErrors.threshold,
    weight: RISK_FACTORS.recentErrors.weight,
    contribution: errorRisk,
    status: recentErrors > 5 ? 'danger' : recentErrors > 2 ? 'warning' : 'ok',
  });
  totalRisk += errorRisk;

  // Factor 3: Flood waits
  const isFlooded = account.floodUntil && new Date(account.floodUntil) > new Date();
  const floodRisk = isFlooded ? RISK_FACTORS.floodWaits.weight : 0;
  factors.push({
    name: 'Flood Wait',
    value: isFlooded ? 1 : 0,
    threshold: RISK_FACTORS.floodWaits.threshold,
    weight: RISK_FACTORS.floodWaits.weight,
    contribution: floodRisk,
    status: isFlooded ? 'danger' : 'ok',
  });
  totalRisk += floodRisk;

  if (isFlooded) {
    alerts.push({
      type: 'critical',
      message: 'Account is in flood wait state',
      timestamp: new Date(),
    });
    recommendations.push('Дождитесь окончания flood wait');
  }

  // Factor 4: Account age
  const accountAgeDays = Math.floor((Date.now() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const newAccountRisk = accountAgeDays < RISK_FACTORS.newAccount.threshold
    ? RISK_FACTORS.newAccount.weight * (1 - accountAgeDays / RISK_FACTORS.newAccount.threshold)
    : 0;
  factors.push({
    name: 'Account Age',
    value: accountAgeDays,
    threshold: RISK_FACTORS.newAccount.threshold,
    weight: RISK_FACTORS.newAccount.weight,
    contribution: newAccountRisk,
    status: accountAgeDays < 3 ? 'danger' : accountAgeDays < 7 ? 'warning' : 'ok',
  });
  totalRisk += newAccountRisk;

  // Factor 5: Activity patterns (night activity)
  const nightActions = actions.filter(a => {
    const hour = new Date(a.createdAt).getHours();
    return hour >= 0 && hour < 6;
  }).length;
  const nightActivityRate = actions.length > 0 ? nightActions / actions.length : 0;
  const nightRisk = nightActivityRate > RISK_FACTORS.nightActivity.threshold
    ? RISK_FACTORS.nightActivity.weight
    : 0;
  factors.push({
    name: 'Night Activity',
    value: nightActivityRate,
    threshold: RISK_FACTORS.nightActivity.threshold,
    weight: RISK_FACTORS.nightActivity.weight,
    contribution: nightRisk,
    status: nightActivityRate > 0.5 ? 'warning' : 'ok',
  });
  totalRisk += nightRisk;

  // Normalize risk score
  totalRisk = Math.min(100, Math.round(totalRisk * 1.5));

  // Blend with existing ban risk
  totalRisk = Math.round(totalRisk * 0.7 + account.banRisk * 0.3);

  // Calculate trend
  const change7d = riskHistory.length >= 2
    ? riskHistory[riskHistory.length - 1].riskScore - riskHistory[0].riskScore
    : 0;
  
  const trendDirection = change7d > 10 ? 'increasing' : change7d < -10 ? 'decreasing' : 'stable';

  // Generate recommendations based on factors
  if (activityRate > 0.8) {
    recommendations.push('Снизьте общую активность на 20-30%');
  }
  if (errorRisk > 0) {
    recommendations.push('Проверьте настройки прокси и API');
  }
  if (newAccountRisk > 0) {
    recommendations.push('Используйте более мягкий режим прогрева');
  }
  if (nightRisk > 0) {
    recommendations.push('Сократите активность в ночное время');
  }
  if (totalRisk > 60) {
    recommendations.push('Рекомендуется приостановить активность на 24-48 часов');
  }
  if (recommendations.length === 0) {
    recommendations.push('Аккаунт в нормальном состоянии');
  }

  // Add alerts for high risk
  if (totalRisk > 70) {
    alerts.push({
      type: 'critical',
      message: 'High ban risk detected - immediate action recommended',
      timestamp: new Date(),
    });
  } else if (totalRisk > 50) {
    alerts.push({
      type: 'warning',
      message: 'Elevated ban risk - monitor account closely',
      timestamp: new Date(),
    });
  }

  return {
    accountId: account.id,
    accountInfo: {
      platform: account.platform,
      username: account.username,
      status: account.status,
      banRisk: account.banRisk,
      createdAt: account.createdAt,
      lastUsedAt: account.lastUsedAt,
    },
    riskScore: totalRisk,
    riskLevel: getRiskLevel(totalRisk),
    factors,
    predictedLifeDays: predictLifeDays(totalRisk, accountAgeDays),
    recommendations,
    trend: {
      direction: trendDirection,
      change7d,
    },
    alerts,
  };
}

// GET /api/ban-analytics - Get ban risk analytics for all accounts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const minRisk = parseInt(searchParams.get('minRisk') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: Record<string, unknown> = { userId };
    if (platform) where.platform = platform;
    if (status) where.status = status;

    // Get accounts with related data
    const accounts = await dbCircuitBreaker.execute(() =>
      db.account.findMany({
        where,
        include: {
          AccountAction: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
          },
          AccountRiskHistory: {
            where: {
              date: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
            orderBy: { date: 'asc' },
          },
        },
        take: limit,
      })
    );

    // Analyze each account
    const analyses: AccountRiskAnalysis[] = [];
    for (const account of accounts) {
      const analysis = await analyzeAccountRisk(account, account.AccountAction, account.AccountRiskHistory);
      analyses.push(analysis);
    }

    // Filter by minimum risk
    const filteredAnalyses = analyses.filter(a => a.riskScore >= minRisk);

    // Sort by risk score descending
    filteredAnalyses.sort((a, b) => b.riskScore - a.riskScore);

    // Calculate aggregate statistics
    const stats = {
      total: accounts.length,
      byRiskLevel: {
        none: filteredAnalyses.filter(a => a.riskLevel === 'none').length,
        low: filteredAnalyses.filter(a => a.riskLevel === 'low').length,
        medium: filteredAnalyses.filter(a => a.riskLevel === 'medium').length,
        high: filteredAnalyses.filter(a => a.riskLevel === 'high').length,
        critical: filteredAnalyses.filter(a => a.riskLevel === 'critical').length,
      },
      averageRisk: Math.round(
        filteredAnalyses.reduce((sum, a) => sum + a.riskScore, 0) / filteredAnalyses.length || 0
      ),
      atRiskAccounts: filteredAnalyses.filter(a => a.riskScore >= 50).length,
      trendUp: filteredAnalyses.filter(a => a.trend.direction === 'increasing').length,
      trendDown: filteredAnalyses.filter(a => a.trend.direction === 'decreasing').length,
    };

    // Collect all alerts
    const allAlerts = filteredAnalyses
      .flatMap(a => a.alerts.map(alert => ({ ...alert, accountId: a.accountId, accountInfo: a.accountInfo })))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    logger.debug('Ban analytics calculated', { 
      totalAccounts: accounts.length, 
      avgRisk: stats.averageRisk,
      atRisk: stats.atRiskAccounts,
    });

    return NextResponse.json({
      analyses: filteredAnalyses,
      stats,
      alerts: allAlerts.slice(0, 20), // Top 20 alerts
      riskFactors: RISK_FACTORS,
    });
  } catch (error) {
    logger.error('Failed to get ban analytics', error as Error);
    return NextResponse.json(
      { error: 'Failed to get ban analytics' },
      { status: 500 }
    );
  }
}

// POST /api/ban-analytics - Run analysis for specific account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get account with related data
    const account = await dbCircuitBreaker.execute(() =>
      db.account.findUnique({
        where: { id: accountId },
        include: {
          AccountAction: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
          },
          AccountRiskHistory: {
            where: {
              date: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
            orderBy: { date: 'asc' },
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

    // Analyze account
    const analysis = await analyzeAccountRisk(account, account.AccountAction, account.AccountRiskHistory);

    // Update account's ban risk
    await db.account.update({
      where: { id: accountId },
      data: {
        banRisk: analysis.riskScore,
      },
    });

    // Create risk history entry
    await db.accountRiskHistory.create({
      data: {
        id: nanoid(),
        accountId,
        date: new Date(),
        riskScore: analysis.riskScore,
        riskFactors: JSON.stringify(analysis.factors),
        changeReason: 'Automated analysis',
      },
    });

    logger.info('Ban analysis completed', {
      accountId,
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    logger.error('Failed to run ban analysis', error as Error);
    return NextResponse.json(
      { error: 'Failed to run ban analysis' },
      { status: 500 }
    );
  }
}

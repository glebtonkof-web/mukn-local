// API Route for Monetization Schemes
// GET: List all schemes with pagination
// POST: Rank schemes, Apply top-50 schemes, Seed database

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MONETIZATION_SCHEMES, getSchemeStats, getSchemesByCategory, getSchemesByRiskLevel } from '@/lib/sim-auto/schemes-library';
import { rankSchemes, getQuickRecommendations, type RankerConfig, type SimCardAccountInfo } from '@/lib/sim-auto/scheme-ranker';
import { getActiveExecutions, getExecutionSummary } from '@/lib/sim-auto/scheme-executor';
import { seedSchemes, getSeedingStatus } from '@/lib/sim-auto/seed-schemes';

// GET /api/sim-auto/schemes - List all schemes with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category');
    const riskLevel = searchParams.get('riskLevel');
    const platform = searchParams.get('platform');
    const search = searchParams.get('search');
    const fromDb = searchParams.get('fromDb') === 'true';

    let schemes = fromDb 
      ? await db.monetizationScheme.findMany({
          where: { isActive: true },
          orderBy: { usageCount: 'desc' }
        })
      : null;

    // If database is empty or not requested, use in-memory schemes
    if (!schemes || schemes.length === 0) {
      schemes = MONETIZATION_SCHEMES.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        platforms: JSON.stringify(s.platforms),
        minAccounts: s.minAccounts,
        minWarmingDays: s.minWarmingDays,
        riskLevel: s.riskLevel,
        automationLevel: s.automationLevel,
        expectedRevenue: s.expectedRevenue,
        timeToProfit: s.timeToProfit,
        isFree: s.isFree,
        usageCount: 0,
        successRate: 0,
        avgROI: 0,
        isActive: true
      }));
    }

    // Apply filters
    let filtered = schemes;

    if (category) {
      filtered = filtered.filter(s => s.category === category);
    }

    if (riskLevel) {
      filtered = filtered.filter(s => s.riskLevel === riskLevel);
    }

    if (platform) {
      filtered = filtered.filter(s => {
        const platforms = typeof s.platforms === 'string' 
          ? JSON.parse(s.platforms) 
          : s.platforms;
        return platforms.includes(platform) || platforms.includes('all');
      });
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        (s.description && s.description.toLowerCase().includes(searchLower))
      );
    }

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedSchemes = filtered.slice(offset, offset + limit);

    // Get statistics
    const stats = getSchemeStats();
    const seedingStatus = await getSeedingStatus();
    const executionSummary = await getExecutionSummary();

    return NextResponse.json({
      success: true,
      schemes: paginatedSchemes,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      },
      stats,
      seedingStatus,
      executionSummary
    });
  } catch (error) {
    console.error('Error fetching schemes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schemes' },
      { status: 500 }
    );
  }
}

// POST /api/sim-auto/schemes - Rank schemes, Apply top-50, or Seed database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, goal, limit } = body;

    switch (action) {
      case 'rank': {
        // Get available accounts from database
        const accounts = await db.simCardAccount.findMany({
          select: {
            id: true,
            platform: true,
            status: true,
            warmingProgress: true,
            warmingPhase: true,
            warmingStartedAt: true,
            warmingEndsAt: true,
            lastActivityAt: true
          }
        });

        const accountInfos: SimCardAccountInfo[] = accounts.map(a => ({
          id: a.id,
          platform: a.platform,
          status: a.status,
          warmingProgress: a.warmingProgress,
          warmingPhase: a.warmingPhase,
          warmingStartedAt: a.warmingStartedAt,
          warmingEndsAt: a.warmingEndsAt,
          lastActivityAt: a.lastActivityAt
        }));

        const warmedAccounts = accountInfos.filter(a => 
          a.status === 'active' && a.warmingProgress >= 50
        );

        const ranked = rankSchemes(accountInfos, warmedAccounts, config as RankerConfig);
        const topSchemes = ranked.slice(0, limit || 50);

        return NextResponse.json({
          success: true,
          rankedSchemes: topSchemes,
          totalRanked: ranked.length,
          availableAccounts: accountInfos.length,
          warmedAccounts: warmedAccounts.length
        });
      }

      case 'recommend': {
        // Get quick recommendations
        const accounts = await db.simCardAccount.findMany({
          select: {
            id: true,
            platform: true,
            status: true,
            warmingProgress: true,
            warmingPhase: true,
            warmingStartedAt: true,
            warmingEndsAt: true,
            lastActivityAt: true
          }
        });

        const accountInfos: SimCardAccountInfo[] = accounts.map(a => ({
          id: a.id,
          platform: a.platform,
          status: a.status,
          warmingProgress: a.warmingProgress,
          warmingPhase: a.warmingPhase,
          warmingStartedAt: a.warmingStartedAt,
          warmingEndsAt: a.warmingEndsAt,
          lastActivityAt: a.lastActivityAt
        }));

        const recommendations = getQuickRecommendations(
          accountInfos, 
          goal as 'fast' | 'stable' | 'high_yield' | 'low_risk' || 'stable'
        );

        return NextResponse.json({
          success: true,
          recommendations,
          goal: goal || 'stable'
        });
      }

      case 'apply-top': {
        // Get ranked schemes
        const accounts = await db.simCardAccount.findMany({
          select: {
            id: true,
            platform: true,
            status: true,
            warmingProgress: true,
            warmingPhase: true,
            warmingStartedAt: true,
            warmingEndsAt: true,
            lastActivityAt: true
          }
        });

        const accountInfos: SimCardAccountInfo[] = accounts.map(a => ({
          id: a.id,
          platform: a.platform,
          status: a.status,
          warmingProgress: a.warmingProgress,
          warmingPhase: a.warmingPhase,
          warmingStartedAt: a.warmingStartedAt,
          warmingEndsAt: a.warmingEndsAt,
          lastActivityAt: a.lastActivityAt
        }));

        const warmedAccounts = accountInfos.filter(a => 
          a.status === 'active' && a.warmingProgress >= 50
        );

        const ranked = rankSchemes(accountInfos, warmedAccounts, config as RankerConfig);
        const topSchemes = ranked.slice(0, limit || 50);

        // Create user rankings in database
        const userId = 'system'; // Would get from auth in real app
        
        // Clear existing rankings
        await db.userSchemeRanking.deleteMany({
          where: { userId }
        });

        // Create new rankings
        for (let i = 0; i < topSchemes.length; i++) {
          const ranked = topSchemes[i];
          await db.userSchemeRanking.create({
            data: {
              id: `rank-${userId}-${ranked.scheme.id}`,
              userId,
              schemeId: ranked.scheme.id,
              score: ranked.score,
              rank: i + 1,
              isApplied: false
            }
          });
        }

        return NextResponse.json({
          success: true,
          applied: topSchemes.length,
          schemes: topSchemes.map((s, i) => ({
            rank: i + 1,
            id: s.scheme.id,
            name: s.scheme.name,
            score: s.score,
            estimatedRevenue: s.estimatedRevenue
          }))
        });
      }

      case 'seed': {
        // Seed schemes to database
        const result = await seedSchemes();
        return NextResponse.json({
          success: result.success,
          ...result
        });
      }

      case 'stats': {
        // Get detailed statistics
        const stats = getSchemeStats();
        const seedingStatus = await getSeedingStatus();
        const executionSummary = await getExecutionSummary();
        const activeExecutions = getActiveExecutions();

        return NextResponse.json({
          success: true,
          stats,
          seedingStatus,
          executionSummary,
          activeExecutions: activeExecutions.map(e => ({
            schemeId: e.schemeId,
            status: e.status,
            accountsCount: e.accountIds.length,
            metrics: e.metrics
          }))
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: rank, recommend, apply-top, seed, stats' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing schemes request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

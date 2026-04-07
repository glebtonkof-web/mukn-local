// API Route for Individual Monetization Scheme
// GET: Get scheme details
// POST: Start/Stop scheme execution

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MONETIZATION_SCHEMES } from '@/lib/sim-auto/schemes-library';
import { getSchemeDetails, calculateRequirements, type SimCardAccountInfo } from '@/lib/sim-auto/scheme-ranker';
import {
  startScheme,
  stopScheme,
  pauseScheme,
  resumeScheme,
  rotateAccounts,
  getSchemePerformance,
  getExecution,
  recordAction,
  type ExecutionConfig
} from '@/lib/sim-auto/scheme-executor';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/sim-auto/schemes/[id] - Get scheme details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: schemeId } = await params;

    // Find scheme in library
    const scheme = MONETIZATION_SCHEMES.find(s => s.id === schemeId);

    // Try to get from database
    const dbScheme = await db.monetizationScheme.findUnique({
      where: { id: schemeId }
    });

    if (!scheme && !dbScheme) {
      return NextResponse.json(
        { success: false, error: 'Scheme not found' },
        { status: 404 }
      );
    }

    // Get accounts for ranking
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

    // Get detailed ranking
    const details = scheme ? getSchemeDetails(schemeId, accountInfos) : null;

    // Calculate requirements
    const requirements = scheme ? calculateRequirements(scheme, accountInfos) : null;

    // Get execution status
    const execution = getExecution(schemeId);

    // Get performance metrics
    const performance = await getSchemePerformance(schemeId);

    // Get profit logs for this scheme
    const profitLogs = await db.simCardProfitLog.findMany({
      where: { schemeId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Get compatible accounts
    const compatiblePlatforms = scheme?.platforms || [];
    const compatibleAccounts = accounts.filter(a =>
      compatiblePlatforms.includes(a.platform as 'telegram' | 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'discord' | 'facebook' | 'reddit' | 'whatsapp' | 'all') || compatiblePlatforms.includes('all')
    );

    const schemeData = scheme || {
      id: dbScheme?.id,
      name: dbScheme?.name,
      description: dbScheme?.description,
      category: dbScheme?.category,
      platforms: dbScheme?.platforms ? JSON.parse(dbScheme.platforms as string) : [],
      minAccounts: dbScheme?.minAccounts,
      minWarmingDays: dbScheme?.minWarmingDays,
      riskLevel: dbScheme?.riskLevel,
      automationLevel: dbScheme?.automationLevel,
      expectedRevenue: dbScheme?.expectedRevenue,
      timeToProfit: dbScheme?.timeToProfit,
      isFree: dbScheme?.isFree
    };

    return NextResponse.json({
      success: true,
      scheme: schemeData,
      dbData: dbScheme,
      details,
      requirements,
      execution: execution ? {
        id: execution.id,
        status: execution.status,
        accountIds: execution.accountIds,
        startedAt: execution.startedAt,
        metrics: execution.metrics,
        config: execution.config
      } : null,
      performance,
      recentProfitLogs: profitLogs,
      compatibleAccounts: {
        total: compatibleAccounts.length,
        active: compatibleAccounts.filter(a => a.status === 'active').length,
        warming: compatibleAccounts.filter(a => a.status === 'warming').length
      }
    });
  } catch (error) {
    console.error('Error fetching scheme details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheme details' },
      { status: 500 }
    );
  }
}

// POST /api/sim-auto/schemes/[id] - Start/Stop scheme execution
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: schemeId } = await params;
    const body = await request.json();
    const { action, accountIds, config, newAccountIds, actionData } = body;

    // Verify scheme exists
    const scheme = MONETIZATION_SCHEMES.find(s => s.id === schemeId);
    const dbScheme = await db.monetizationScheme.findUnique({
      where: { id: schemeId }
    });

    if (!scheme && !dbScheme) {
      return NextResponse.json(
        { success: false, error: 'Scheme not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'start': {
        if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Account IDs required' },
            { status: 400 }
          );
        }

        const execution = await startScheme(schemeId, accountIds, config as Partial<ExecutionConfig>);

        return NextResponse.json({
          success: true,
          message: 'Scheme execution started',
          execution: {
            id: execution.id,
            schemeId: execution.schemeId,
            status: execution.status,
            accountIds: execution.accountIds,
            startedAt: execution.startedAt,
            config: execution.config
          }
        });
      }

      case 'stop': {
        const execution = await stopScheme(schemeId);

        if (!execution) {
          return NextResponse.json({
            success: false,
            message: 'No active execution found for this scheme'
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Scheme execution stopped',
          execution: {
            id: execution.id,
            status: execution.status,
            stoppedAt: execution.stoppedAt,
            finalMetrics: execution.metrics
          }
        });
      }

      case 'pause': {
        const execution = await pauseScheme(schemeId);

        if (!execution) {
          return NextResponse.json({
            success: false,
            message: 'No running execution found for this scheme'
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Scheme execution paused',
          status: execution.status
        });
      }

      case 'resume': {
        const execution = await resumeScheme(schemeId);

        if (!execution) {
          return NextResponse.json({
            success: false,
            message: 'No paused execution found for this scheme'
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Scheme execution resumed',
          status: execution.status
        });
      }

      case 'rotate': {
        const execution = await rotateAccounts(schemeId, newAccountIds);

        if (!execution) {
          return NextResponse.json({
            success: false,
            message: 'No active execution found for this scheme'
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Accounts rotated',
          accountIds: execution.accountIds
        });
      }

      case 'record-action': {
        if (!actionData) {
          return NextResponse.json(
            { success: false, error: 'Action data required' },
            { status: 400 }
          );
        }

        await recordAction(
          schemeId,
          actionData.accountId,
          actionData.action,
          actionData.success,
          actionData.revenue,
          actionData.details
        );

        return NextResponse.json({
          success: true,
          message: 'Action recorded'
        });
      }

      case 'get-performance': {
        const performance = await getSchemePerformance(schemeId);

        return NextResponse.json({
          success: true,
          performance
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Use: start, stop, pause, resume, rotate, record-action, get-performance'
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing scheme action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
}

// PATCH /api/sim-auto/schemes/[id] - Update scheme configuration
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: schemeId } = await params;
    const body = await request.json();

    const dbScheme = await db.monetizationScheme.findUnique({
      where: { id: schemeId }
    });

    if (!dbScheme) {
      return NextResponse.json(
        { success: false, error: 'Scheme not found in database' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if (body.name) updateData.name = body.name;
    if (body.description) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.config) updateData.config = JSON.stringify(body.config);
    if (body.requirements) updateData.requirements = JSON.stringify(body.requirements);

    const updated = await db.monetizationScheme.update({
      where: { id: schemeId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      scheme: updated
    });
  } catch (error) {
    console.error('Error updating scheme:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update scheme' },
      { status: 500 }
    );
  }
}

// DELETE /api/sim-auto/schemes/[id] - Deactivate scheme
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: schemeId } = await params;

    // Stop any active execution
    await stopScheme(schemeId);

    // Deactivate in database
    await db.monetizationScheme.update({
      where: { id: schemeId },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Scheme deactivated'
    });
  } catch (error) {
    console.error('Error deactivating scheme:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate scheme' },
      { status: 500 }
    );
  }
}

/**
 * Batch Campaigns Action API Endpoint
 * Handles mass operations on campaigns
 */

import { NextRequest, NextResponse } from 'next/server';
import { batchProcessor, BATCH_ACTIONS } from '@/lib/batch-processor';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

/**
 * GET /api/batch/campaigns/action
 * Get supported actions and campaigns for selection
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    const action = searchParams.get('action');

    // Get operation status
    if (action === 'status') {
      const operationId = searchParams.get('operationId');
      if (!operationId) {
        return NextResponse.json(
          { error: 'Operation ID is required' },
          { status: 400 }
        );
      }

      const status = await batchProcessor.getOperationStatus(operationId);
      return NextResponse.json(status);
    }

    // Get operation history
    if (action === 'history') {
      const history = await batchProcessor.getOperationHistory(userId, {
        type: 'campaign_action',
        status: searchParams.get('status') || undefined,
        limit: parseInt(searchParams.get('limit') || '20'),
        offset: parseInt(searchParams.get('offset') || '0'),
      });

      return NextResponse.json(history);
    }

    // Get campaigns for selection
    const status = searchParams.get('status');
    const niche = searchParams.get('niche');
    const geo = searchParams.get('geo');

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (niche) where.niche = niche;
    if (geo) where.geo = geo;

    const campaigns = await db.campaign.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        niche: true,
        geo: true,
        budget: true,
        spent: true,
        leadsCount: true,
        conversions: true,
        revenue: true,
        createdAt: true,
        startDate: true,
        endDate: true,
        _count: {
          select: {
            CampaignInfluencer: true,
            Post: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Get summary stats
    const stats = await db.campaign.aggregate({
      where,
      _count: true,
      _sum: {
        budget: true,
        spent: true,
        revenue: true,
        leadsCount: true,
        conversions: true,
      },
    });

    return NextResponse.json({
      campaigns,
      campaignActions: BATCH_ACTIONS.campaign,
      stats: {
        total: stats._count,
        totalBudget: stats._sum.budget || 0,
        totalSpent: stats._sum.spent || 0,
        totalRevenue: stats._sum.revenue || 0,
        totalLeads: stats._sum.leadsCount || 0,
        totalConversions: stats._sum.conversions || 0,
      },
    });
  } catch (error) {
    logger.error('Batch campaigns GET error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/batch/campaigns/action
 * Start batch operation on campaigns
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, campaignIds, parameters } = body;

    // Validate required fields
    if (!action || !campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return NextResponse.json(
        { error: 'Action and campaign IDs are required' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = BATCH_ACTIONS.campaign.map(a => a.value);
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Valid actions: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate campaigns exist and belong to user
    const existingCampaigns = await db.campaign.findMany({
      where: {
        id: { in: campaignIds },
        userId: userId || 'default-user',
      },
      select: { id: true, status: true, name: true },
    });

    if (existingCampaigns.length !== campaignIds.length) {
      const existingIds = existingCampaigns.map(c => c.id);
      const missingIds = campaignIds.filter((id: string) => !existingIds.includes(id));
      return NextResponse.json(
        { error: `Some campaigns not found or access denied: ${missingIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Check action-specific constraints
    if (action === 'delete') {
      // Check for active campaigns
      const activeCampaigns = existingCampaigns.filter(c => c.status === 'active');
      if (activeCampaigns.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot delete active campaigns: ${activeCampaigns.map(c => c.name).join(', ')}`,
            hint: 'Pause campaigns before deleting',
          },
          { status: 400 }
        );
      }
    }

    // Start batch operation
    const result = await batchProcessor.startOperation(
      userId || 'default-user',
      'campaign_action',
      action,
      campaignIds,
      parameters
    );

    logger.info('Batch campaign operation started', {
      operationId: result.operationId,
      action,
      campaignCount: campaignIds.length,
    });

    return NextResponse.json({
      success: true,
      operationId: result.operationId,
      status: result.status,
      message: `Started ${action} operation on ${campaignIds.length} campaigns`,
    });
  } catch (error) {
    logger.error('Batch campaigns POST error', error as Error);
    return NextResponse.json(
      { error: 'Failed to start batch operation' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/batch/campaigns/action
 * Cancel operation
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { operationId, action } = body;

    if (!operationId) {
      return NextResponse.json(
        { error: 'Operation ID is required' },
        { status: 400 }
      );
    }

    if (action === 'cancel') {
      const success = await batchProcessor.cancelOperation(operationId, 'User cancelled');

      return NextResponse.json({
        success,
        message: success ? 'Operation cancelled' : 'Cannot cancel operation',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Batch campaigns PUT error', error as Error);
    return NextResponse.json(
      { error: 'Failed to update operation' },
      { status: 500 }
    );
  }
}

/**
 * Batch Accounts Action API Endpoint
 * Handles mass operations on accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { batchProcessor, BATCH_ACTIONS, BATCH_OPERATION_TYPES } from '@/lib/batch-processor';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

/**
 * GET /api/batch/accounts/action
 * Get supported actions and operation history
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    const action = searchParams.get('action');

    // Get supported actions
    if (action === 'types') {
      return NextResponse.json({
        operationTypes: BATCH_OPERATION_TYPES,
        accountActions: BATCH_ACTIONS.account,
      });
    }

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
        type: 'account_action',
        status: searchParams.get('status') || undefined,
        limit: parseInt(searchParams.get('limit') || '20'),
        offset: parseInt(searchParams.get('offset') || '0'),
      });

      return NextResponse.json(history);
    }

    // Get accounts for selection
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (platform) where.platform = platform;

    const accounts = await db.account.findMany({
      where,
      select: {
        id: true,
        platform: true,
        username: true,
        phone: true,
        status: true,
        banRisk: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      accounts,
      accountActions: BATCH_ACTIONS.account,
    });
  } catch (error) {
    logger.error('Batch accounts GET error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/batch/accounts/action
 * Start batch operation on accounts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, accountIds, parameters } = body;

    // Validate required fields
    if (!action || !accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json(
        { error: 'Action and account IDs are required' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = BATCH_ACTIONS.account.map(a => a.value);
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Valid actions: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate accounts exist
    const existingAccounts = await db.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, status: true },
    });

    if (existingAccounts.length !== accountIds.length) {
      const existingIds = existingAccounts.map(a => a.id);
      const missingIds = accountIds.filter((id: string) => !existingIds.includes(id));
      return NextResponse.json(
        { error: `Some accounts not found: ${missingIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Check action-specific constraints
    if (action === 'delete') {
      // Check if accounts have associated influencers
      const accountsWithInfluencers = await db.account.findMany({
        where: {
          id: { in: accountIds },
          influencers: { some: {} },
        },
        select: { id: true },
      });

      if (accountsWithInfluencers.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot delete accounts with associated influencers: ${accountsWithInfluencers.map(a => a.id).join(', ')}`,
            hint: 'Remove influencer associations first',
          },
          { status: 400 }
        );
      }
    }

    if (action === 'change_proxy') {
      if (!parameters?.proxyHost || !parameters?.proxyPort) {
        return NextResponse.json(
          { error: 'Proxy host and port are required for change_proxy action' },
          { status: 400 }
        );
      }
    }

    // Start batch operation
    const result = await batchProcessor.startOperation(
      userId || 'default-user',
      'account_action',
      action,
      accountIds,
      parameters
    );

    logger.info('Batch account operation started', {
      operationId: result.operationId,
      action,
      accountCount: accountIds.length,
    });

    return NextResponse.json({
      success: true,
      operationId: result.operationId,
      status: result.status,
      message: `Started ${action} operation on ${accountIds.length} accounts`,
    });
  } catch (error) {
    logger.error('Batch accounts POST error', error as Error);
    return NextResponse.json(
      { error: 'Failed to start batch operation' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/batch/accounts/action
 * Update operation (cancel)
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

      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Operation cancelled',
        });
      } else {
        return NextResponse.json(
          { error: 'Cannot cancel operation (not running or not found)' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Batch accounts PUT error', error as Error);
    return NextResponse.json(
      { error: 'Failed to update operation' },
      { status: 500 }
    );
  }
}

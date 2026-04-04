import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// DELETE /api/warming/:id - Stop warming for account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const searchParams = request.nextUrl.searchParams;
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

    if (account.status !== 'warming') {
      return NextResponse.json(
        { error: 'Account is not currently warming' },
        { status: 400 }
      );
    }

    // Update account status
    const newStatus = complete ? 'active' : 'pending';
    const updatedAccount = await db.account.update({
      where: { id: accountId },
      data: {
        status: newStatus,
        warmingProgress: complete ? 100 : account.warmingProgress,
        warmingEndsAt: complete ? new Date() : null,
        warmingStartedAt: null,
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
      account: updatedAccount,
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

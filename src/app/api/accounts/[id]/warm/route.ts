import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// POST /api/accounts/[id]/warm - Start warming an account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const account = await db.account.findUnique({
      where: { id }
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (account.status !== 'pending' && account.status !== 'new') {
      return NextResponse.json(
        { error: 'Account cannot be warmed (already active or banned)' },
        { status: 400 }
      );
    }

    // Calculate warming end date (7 days from now)
    const warmingEndsAt = new Date();
    warmingEndsAt.setDate(warmingEndsAt.getDate() + 7);

    const updatedAccount = await db.account.update({
      where: { id },
      data: {
        status: 'warming',
        warmingStartedAt: new Date(),
        warmingEndsAt,
        warmingProgress: 0
      }
    });

    // Log activity
    await db.activityLog.create({
      data: {
        id: nanoid(),
        type: 'join',
        message: `Прогрев аккаунта ${account.username || account.phone} запущен`,
        accountId: id
      }
    });

    return NextResponse.json({
      success: true,
      account: {
        id: updatedAccount.id,
        username: updatedAccount.username,
        status: updatedAccount.status,
        warmingProgress: updatedAccount.warmingProgress,
        warmingEndsAt: updatedAccount.warmingEndsAt
      }
    });
  } catch (error) {
    console.error('Error warming account:', error);
    return NextResponse.json(
      { error: 'Failed to start warming' },
      { status: 500 }
    );
  }
}

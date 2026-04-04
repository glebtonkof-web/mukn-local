import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// POST /api/accounts/[id]/change-proxy - Change proxy for an account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { proxyHost, proxyPort, proxyType, proxyUsername, proxyPassword } = body;

    const account = await db.account.findUnique({
      where: { id }
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (proxyHost) updateData.proxyHost = proxyHost;
    if (proxyPort) updateData.proxyPort = parseInt(proxyPort);
    if (proxyType) updateData.proxyType = proxyType;
    if (proxyUsername !== undefined) updateData.proxyUsername = proxyUsername;
    if (proxyPassword !== undefined) updateData.proxyPassword = proxyPassword;

    const updatedAccount = await db.account.update({
      where: { id },
      data: updateData
    });

    // Log activity
    await db.activityLog.create({
      data: {
        id: nanoid(),
        type: 'info',
        message: `Прокси изменён для аккаунта ${account.username || account.phone}`,
        accountId: id
      }
    });

    return NextResponse.json({
      success: true,
      account: {
        id: updatedAccount.id,
        username: updatedAccount.username,
        proxyHost: updatedAccount.proxyHost,
        proxyPort: updatedAccount.proxyPort,
        proxyType: updatedAccount.proxyType
      }
    });
  } catch (error) {
    console.error('Error changing proxy:', error);
    return NextResponse.json(
      { error: 'Failed to change proxy' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// DELETE /api/antidetect/profiles/[id] - Delete antidetect browser profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID профиля обязателен' },
        { status: 400 }
      );
    }

    // Check if profile exists
    const profile = await db.antidetectBrowser.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      );
    }

    // Check if profile is in use
    if (profile.status === 'in_use') {
      return NextResponse.json(
        { error: 'Невозможно удалить профиль, который используется' },
        { status: 400 }
      );
    }

    await db.antidetectBrowser.delete({
      where: { id },
    });

    logger.info('Antidetect browser profile deleted', { profileId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete antidetect browser profile', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete antidetect browser profile' },
      { status: 500 }
    );
  }
}

// GET /api/antidetect/profiles/[id] - Get single profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const profile = await db.antidetectBrowser.findUnique({
      where: { id },
      include: {
        Account: {
          select: {
            id: true,
            platform: true,
            username: true,
            status: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error('Failed to fetch antidetect browser profile', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch antidetect browser profile' },
      { status: 500 }
    );
  }
}

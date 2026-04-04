import { NextRequest, NextResponse } from 'next/server';
import { fullAutoMode } from '@/lib/advanced-features';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modeId = searchParams.get('modeId');
    const userId = searchParams.get('userId');

    if (modeId) {
      const status = await fullAutoMode.getStatus(modeId);
      return NextResponse.json(status);
    }
    if (userId) {
      const modes = await fullAutoMode.getUserModes(userId);
      return NextResponse.json({ modes });
    }
    return NextResponse.json({ error: 'modeId or userId required' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, userId, postsPerDay, storiesPerDay, workHoursStart, workHoursEnd, platforms } = body;

    if (action === 'pause' && id) {
      await fullAutoMode.pause(id);
      return NextResponse.json({ success: true });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const modeId = await fullAutoMode.activate({
      name: 'Auto Mode',
      postsPerDay: postsPerDay || 5,
      storiesPerDay: storiesPerDay || 3,
      workHoursStart: workHoursStart || '09:00',
      workHoursEnd: workHoursEnd || '22:00',
      timezone: 'Europe/Moscow',
      platforms: platforms || ['telegram'],
      userId,
    });

    return NextResponse.json({ success: true, modeId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

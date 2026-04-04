import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/campaigns/pause-all - Pause all active campaigns
export async function POST() {
  try {
    // Update all active campaigns to paused
    const result = await db.campaign.updateMany({
      where: {
        status: 'active'
      },
      data: {
        status: 'paused'
      }
    });

    // Log activity
    await db.activityLog.create({
      data: {
        type: 'warning',
        message: `Все кампании приостановлены (${result.count} шт.)`
      }
    });

    return NextResponse.json({
      success: true,
      pausedCount: result.count,
      message: `Приостановлено ${result.count} кампаний`
    });
  } catch (error) {
    console.error('Error pausing all campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to pause campaigns' },
      { status: 500 }
    );
  }
}

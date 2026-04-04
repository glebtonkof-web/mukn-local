import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/analytics/top-channels - Get top channels by revenue
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const period = searchParams.get('period') || 'week';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'week':
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const channels = await db.analyticsChannel.findMany({
      where: {
        periodStart: {
          gte: startDate
        }
      },
      orderBy: { revenue: 'desc' },
      take: limit
    });

    // Get top comments
    const comments = await db.analyticsComment.findMany({
      orderBy: { ctr: 'desc' },
      take: 10
    });

    return NextResponse.json({
      channels: channels.map(c => ({
        id: c.id,
        name: c.channelName || c.channelId,
        comments: c.comments,
        clicks: c.clicks,
        conversions: c.conversions,
        conversionRate: c.conversionRate,
        revenue: c.revenue
      })),
      comments: comments.map(c => ({
        id: c.id,
        text: c.text,
        ctr: c.ctr,
        conversionRate: c.conversionRate,
        views: c.views,
        clicks: c.clicks
      }))
    });
  } catch (error) {
    console.error('Error fetching top channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top channels' },
      { status: 500 }
    );
  }
}

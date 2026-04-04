import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/traffic/analytics - Get traffic funnel analytics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const methodId = searchParams.get('methodId');
    const sourceId = searchParams.get('sourceId');

    // Build where clause
    const where: Record<string, Date | number | string | undefined> = {};
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date = new Date(startDate);
      if (endDate) where.date = new Date(endDate);
    }
    
    if (methodId) where.methodId = parseInt(methodId);
    if (sourceId) where.sourceId = sourceId;

    // Get funnel analytics
    const analytics = await db.trafficFunnelAnalytics.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100,
    });

    // Aggregate totals
    const totals = await db.trafficFunnelAnalytics.aggregate({
      where,
      _sum: {
        comments: true,
        profileViews: true,
        storyViews: true,
        channelJoins: true,
        payments: true,
        revenue: true,
      },
      _avg: {
        commentToProfile: true,
        profileToStory: true,
        storyToChannel: true,
        channelToPayment: true,
        cpa: true,
      },
    });

    // Calculate overall conversion rates
    const sum = totals._sum;
    const overallConversion = {
      commentToProfile: sum.comments && sum.comments > 0 
        ? ((sum.profileViews || 0) / sum.comments * 100).toFixed(2) 
        : '0',
      profileToStory: sum.profileViews && sum.profileViews > 0 
        ? ((sum.storyViews || 0) / sum.profileViews * 100).toFixed(2) 
        : '0',
      storyToChannel: sum.storyViews && sum.storyViews > 0 
        ? ((sum.channelJoins || 0) / sum.storyViews * 100).toFixed(2) 
        : '0',
      channelToPayment: sum.channelJoins && sum.channelJoins > 0 
        ? ((sum.payments || 0) / sum.channelJoins * 100).toFixed(2) 
        : '0',
    };

    // Calculate total conversion (comments to payments)
    const totalConversion = sum.comments && sum.comments > 0
      ? ((sum.payments || 0) / sum.comments * 100).toFixed(4)
      : '0';

    // Calculate CPA
    const cpa = sum.payments && sum.payments > 0
      ? ((sum.revenue || 0) / sum.payments).toFixed(2)
      : '0';

    // Daily trend
    const dailyTrend = await db.trafficFunnelAnalytics.groupBy({
      by: ['date'],
      where,
      _sum: {
        comments: true,
        profileViews: true,
        storyViews: true,
        channelJoins: true,
        payments: true,
        revenue: true,
      },
      orderBy: { date: 'asc' },
    });

    // Top performing methods
    const topMethods = await db.trafficFunnelAnalytics.groupBy({
      by: ['methodId'],
      where: { ...where, methodId: { not: null } },
      _sum: {
        payments: true,
        revenue: true,
        comments: true,
      },
      _avg: {
        channelToPayment: true,
      },
      orderBy: {
        _sum: {
          revenue: 'desc',
        },
      },
      take: 10,
    });

    return NextResponse.json({
      analytics,
      totals: {
        comments: sum.comments || 0,
        profileViews: sum.profileViews || 0,
        storyViews: sum.storyViews || 0,
        channelJoins: sum.channelJoins || 0,
        payments: sum.payments || 0,
        revenue: sum.revenue || 0,
      },
      conversions: {
        overall: overallConversion,
        totalConversion,
        cpa,
        averages: {
          commentToProfile: totals._avg.commentToProfile || 0,
          profileToStory: totals._avg.profileToStory || 0,
          storyToChannel: totals._avg.storyToChannel || 0,
          channelToPayment: totals._avg.channelToPayment || 0,
        },
      },
      trends: {
        daily: dailyTrend,
      },
      topMethods,
      // Funnel visualization data
      funnel: [
        { step: 'Комментарии', count: sum.comments || 0, color: '#FF6B9D' },
        { step: 'Просмотры профиля', count: sum.profileViews || 0, color: '#6C63FF' },
        { step: 'Просмотры Stories', count: sum.storyViews || 0, color: '#00D26A' },
        { step: 'Подписки', count: sum.channelJoins || 0, color: '#FFB800' },
        { step: 'Платежи', count: sum.payments || 0, color: '#00D4AA' },
      ],
    });
  } catch (error) {
    logger.error('Failed to fetch traffic analytics', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch traffic analytics' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/analytics - Record funnel event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, methodId, sourceId, step, count = 1, revenue } = body;

    if (!step) {
      return NextResponse.json(
        { error: 'Step is required' },
        { status: 400 }
      );
    }

    const recordDate = date ? new Date(date) : new Date();
    recordDate.setHours(0, 0, 0, 0);

    // Map step to field
    const stepToField: Record<string, string> = {
      comments: 'comments',
      profileViews: 'profileViews',
      storyViews: 'storyViews',
      channelJoins: 'channelJoins',
      payments: 'payments',
    };

    const field = stepToField[step];
    if (!field) {
      return NextResponse.json(
        { error: 'Invalid step' },
        { status: 400 }
      );
    }

    // Find or create record for this date
    const existing = await db.trafficFunnelAnalytics.findFirst({
      where: {
        date: recordDate,
        methodId: methodId || null,
        sourceId: sourceId || null,
      },
    });

    let analytics;
    if (existing) {
      const updateData: Record<string, number | undefined> = {
        [field]: { increment: count },
      };
      if (revenue) updateData.revenue = { increment: revenue };

      analytics = await db.trafficFunnelAnalytics.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      const createData: Record<string, Date | number | string | undefined> = {
        date: recordDate,
        [field]: count,
      };
      if (methodId) createData.methodId = methodId;
      if (sourceId) createData.sourceId = sourceId;
      if (revenue) createData.revenue = revenue;

      analytics = await db.trafficFunnelAnalytics.create({
        data: createData,
      });
    }

    // Recalculate conversion rates
    await recalculateConversionRates(analytics.id);

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    logger.error('Failed to record funnel event', error as Error);
    return NextResponse.json(
      { error: 'Failed to record funnel event' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/analytics - Update funnel data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Analytics ID is required' },
        { status: 400 }
      );
    }

    const analytics = await db.trafficFunnelAnalytics.update({
      where: { id },
      data,
    });

    // Recalculate conversion rates
    await recalculateConversionRates(id);

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    logger.error('Failed to update funnel data', error as Error);
    return NextResponse.json(
      { error: 'Failed to update funnel data' },
      { status: 500 }
    );
  }
}

// Helper function to recalculate conversion rates
async function recalculateConversionRates(id: string) {
  const analytics = await db.trafficFunnelAnalytics.findUnique({
    where: { id },
  });

  if (!analytics) return;

  const commentToProfile = analytics.comments > 0 
    ? (analytics.profileViews / analytics.comments) * 100 
    : 0;
  const profileToStory = analytics.profileViews > 0 
    ? (analytics.storyViews / analytics.profileViews) * 100 
    : 0;
  const storyToChannel = analytics.storyViews > 0 
    ? (analytics.channelJoins / analytics.storyViews) * 100 
    : 0;
  const channelToPayment = analytics.channelJoins > 0 
    ? (analytics.payments / analytics.channelJoins) * 100 
    : 0;
  const cpa = analytics.payments > 0 
    ? analytics.revenue / analytics.payments 
    : 0;

  await db.trafficFunnelAnalytics.update({
    where: { id },
    data: {
      commentToProfile,
      profileToStory,
      storyToChannel,
      channelToPayment,
      cpa,
    },
  });
}

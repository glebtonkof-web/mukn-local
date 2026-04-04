import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/traffic/instagram-pour/analytics - Get Instagram traffic analytics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sourceType = searchParams.get('sourceType');
    const campaignId = searchParams.get('campaignId');

    // Build where clause
    const where: Record<string, string | Date | undefined> = {};
    
    if (startDate) {
      where.date = { gte: new Date(startDate) } as unknown as Date;
    }
    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate) } as unknown as Date;
    }
    if (sourceType) where.sourceType = sourceType;
    if (campaignId) where.campaignId = campaignId;

    // Get analytics data
    const analytics = await db.instagramTrafficAnalytics.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100,
    });

    // Aggregate totals
    const totals = await db.instagramTrafficAnalytics.aggregate({
      where,
      _sum: {
        impressions: true,
        reach: true,
        linkClicks: true,
        profileVisits: true,
        follows: true,
        conversions: true,
        revenue: true,
        bioLinkClicks: true,
        reelsViews: true,
        reelsClicks: true,
        storiesViews: true,
        storiesClicks: true,
        dmSent: true,
        dmReplied: true,
        collabReach: true,
        adsImpressions: true,
        adsClicks: true,
      },
      _avg: {
        ctr: true,
        conversionRate: true,
        cpc: true,
        cpa: true,
        roi: true,
      },
    });

    const sum = totals._sum;

    // Calculate overall metrics
    const overallMetrics = {
      totalImpressions: sum.impressions || 0,
      totalReach: sum.reach || 0,
      totalLinkClicks: sum.linkClicks || 0,
      totalProfileVisits: sum.profileVisits || 0,
      totalFollows: sum.follows || 0,
      totalConversions: sum.conversions || 0,
      totalRevenue: sum.revenue || 0,
    };

    // Calculate overall CTR and conversion rate
    const overallCtr = sum.impressions && sum.impressions > 0
      ? ((sum.linkClicks || 0) / sum.impressions * 100).toFixed(2)
      : '0';
    
    const overallConversionRate = sum.linkClicks && sum.linkClicks > 0
      ? ((sum.conversions || 0) / sum.linkClicks * 100).toFixed(2)
      : '0';

    // Source breakdown
    const sourceBreakdown = {
      bioLink: {
        clicks: sum.bioLinkClicks || 0,
      },
      reels: {
        views: sum.reelsViews || 0,
        clicks: sum.reelsClicks || 0,
        ctr: sum.reelsViews && sum.reelsViews > 0
          ? ((sum.reelsClicks || 0) / sum.reelsViews * 100).toFixed(2)
          : '0',
      },
      stories: {
        views: sum.storiesViews || 0,
        clicks: sum.storiesClicks || 0,
        ctr: sum.storiesViews && sum.storiesViews > 0
          ? ((sum.storiesClicks || 0) / sum.storiesViews * 100).toFixed(2)
          : '0',
      },
      dm: {
        sent: sum.dmSent || 0,
        replied: sum.dmReplied || 0,
        replyRate: sum.dmSent && sum.dmSent > 0
          ? ((sum.dmReplied || 0) / sum.dmSent * 100).toFixed(2)
          : '0',
      },
      collaboration: {
        reach: sum.collabReach || 0,
      },
      ads: {
        impressions: sum.adsImpressions || 0,
        clicks: sum.adsClicks || 0,
        ctr: sum.adsImpressions && sum.adsImpressions > 0
          ? ((sum.adsClicks || 0) / sum.adsImpressions * 100).toFixed(2)
          : '0',
      },
    };

    // Daily trend
    const dailyTrend = await db.instagramTrafficAnalytics.groupBy({
      by: ['date'],
      where,
      _sum: {
        impressions: true,
        linkClicks: true,
        conversions: true,
        revenue: true,
      },
      orderBy: { date: 'asc' },
    });

    // Top performing sources
    const topSources = await db.instagramTrafficAnalytics.groupBy({
      by: ['sourceType'],
      where,
      _sum: {
        conversions: true,
        revenue: true,
        linkClicks: true,
      },
      _avg: {
        conversionRate: true,
        roi: true,
      },
      orderBy: {
        _sum: {
          revenue: 'desc',
        },
      },
    });

    return NextResponse.json({
      analytics,
      totals: overallMetrics,
      metrics: {
        ctr: overallCtr,
        conversionRate: overallConversionRate,
        avgCtr: totals._avg.ctr || 0,
        avgConversionRate: totals._avg.conversionRate || 0,
        avgCpc: totals._avg.cpc || 0,
        avgCpa: totals._avg.cpa || 0,
        avgRoi: totals._avg.roi || 0,
      },
      sourceBreakdown,
      trends: {
        daily: dailyTrend,
      },
      topSources,
    });
  } catch (error) {
    logger.error('Failed to fetch Instagram traffic analytics', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch Instagram traffic analytics' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/instagram-pour/analytics - Record analytics event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      sourceType,
      date,
      impressions,
      reach,
      linkClicks,
      profileVisits,
      follows,
      conversions,
      revenue,
      bioLinkClicks,
      reelsViews,
      reelsClicks,
      storiesViews,
      storiesClicks,
      dmSent,
      dmReplied,
      collabReach,
      adsImpressions,
      adsClicks,
    } = body;

    if (!sourceType) {
      return NextResponse.json(
        { error: 'Source type is required' },
        { status: 400 }
      );
    }

    const recordDate = date ? new Date(date) : new Date();
    recordDate.setHours(0, 0, 0, 0);

    // Calculate metrics
    const totalImpressions = impressions || adsImpressions || reelsViews || storiesViews || 0;
    const totalClicks = linkClicks || bioLinkClicks || reelsClicks || storiesClicks || adsClicks || 0;
    const totalConversions = conversions || 0;
    const totalRevenue = revenue || 0;

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Check for existing record
    const existing = await db.instagramTrafficAnalytics.findFirst({
      where: {
        campaignId: campaignId || null,
        sourceType,
        date: recordDate,
      },
    });

    let analytics;
    if (existing) {
      // Update existing record
      analytics = await db.instagramTrafficAnalytics.update({
        where: { id: existing.id },
        data: {
          impressions: (existing.impressions || 0) + (impressions || 0),
          reach: (existing.reach || 0) + (reach || 0),
          linkClicks: (existing.linkClicks || 0) + (linkClicks || 0),
          profileVisits: (existing.profileVisits || 0) + (profileVisits || 0),
          follows: (existing.follows || 0) + (follows || 0),
          conversions: (existing.conversions || 0) + (conversions || 0),
          revenue: (existing.revenue || 0) + (revenue || 0),
          bioLinkClicks: (existing.bioLinkClicks || 0) + (bioLinkClicks || 0),
          reelsViews: (existing.reelsViews || 0) + (reelsViews || 0),
          reelsClicks: (existing.reelsClicks || 0) + (reelsClicks || 0),
          storiesViews: (existing.storiesViews || 0) + (storiesViews || 0),
          storiesClicks: (existing.storiesClicks || 0) + (storiesClicks || 0),
          dmSent: (existing.dmSent || 0) + (dmSent || 0),
          dmReplied: (existing.dmReplied || 0) + (dmReplied || 0),
          collabReach: (existing.collabReach || 0) + (collabReach || 0),
          adsImpressions: (existing.adsImpressions || 0) + (adsImpressions || 0),
          adsClicks: (existing.adsClicks || 0) + (adsClicks || 0),
        },
      });

      // Recalculate rates
      const newCtr = analytics.impressions > 0 
        ? (analytics.linkClicks / analytics.impressions) * 100 
        : 0;
      const newConversionRate = analytics.linkClicks > 0 
        ? (analytics.conversions / analytics.linkClicks) * 100 
        : 0;

      analytics = await db.instagramTrafficAnalytics.update({
        where: { id: analytics.id },
        data: {
          ctr: newCtr,
          conversionRate: newConversionRate,
        },
      });
    } else {
      // Create new record
      analytics = await db.instagramTrafficAnalytics.create({
        data: {
          campaignId: campaignId || null,
          sourceType,
          date: recordDate,
          impressions: impressions || 0,
          reach: reach || 0,
          linkClicks: linkClicks || 0,
          profileVisits: profileVisits || 0,
          follows: follows || 0,
          conversions: conversions || 0,
          revenue: revenue || 0,
          bioLinkClicks: bioLinkClicks || 0,
          reelsViews: reelsViews || 0,
          reelsClicks: reelsClicks || 0,
          storiesViews: storiesViews || 0,
          storiesClicks: storiesClicks || 0,
          dmSent: dmSent || 0,
          dmReplied: dmReplied || 0,
          collabReach: collabReach || 0,
          adsImpressions: adsImpressions || 0,
          adsClicks: adsClicks || 0,
          ctr,
          conversionRate,
        },
      });
    }

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    logger.error('Failed to record Instagram traffic analytics', error as Error);
    return NextResponse.json(
      { error: 'Failed to record Instagram traffic analytics' },
      { status: 500 }
    );
  }
}

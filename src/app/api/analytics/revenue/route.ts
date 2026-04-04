import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/analytics/revenue - Get revenue analytics data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const campaignId = searchParams.get('campaignId');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get campaign analytics
    const whereClause: Record<string, unknown> = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };
    
    if (campaignId) {
      whereClause.campaignId = campaignId;
    }

    const analytics = await db.campaignAnalytics.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });

    // Group by date
    const groupedData: Record<string, { date: string; revenue: number; comments: number; conversions: number }> = {};
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      groupedData[dateStr] = {
        date: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
        revenue: 0,
        comments: 0,
        conversions: 0
      };
    }

    analytics.forEach(a => {
      const dateStr = a.date.toISOString().split('T')[0];
      if (groupedData[dateStr]) {
        groupedData[dateStr].revenue += a.revenue;
        groupedData[dateStr].comments += a.clicks; // Using clicks as comments proxy
        groupedData[dateStr].conversions += a.conversions;
      }
    });

    const chartData = Object.values(groupedData);

    // Calculate summary
    const totalRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0);
    const totalComments = analytics.reduce((sum, a) => sum + a.clicks, 0);
    const totalConversions = analytics.reduce((sum, a) => sum + a.conversions, 0);

    return NextResponse.json({
      chartData,
      summary: {
        totalRevenue,
        totalComments,
        totalConversions,
        avgRevenuePerDay: totalRevenue / days
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

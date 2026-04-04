import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dashboard/kpi - Get KPI metrics for dashboard
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get active accounts count
    const activeAccounts = await db.account.count({
      where: { status: 'active' }
    });

    // Get total accounts
    const totalAccounts = await db.account.count();

    // Get today's comments count
    const todayComments = await db.comment.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    // Get today's revenue (from CampaignAnalytics)
    const todayAnalytics = await db.campaignAnalytics.findMany({
      where: {
        date: {
          gte: today
        }
      },
      select: {
        revenue: true
      }
    });

    const todayRevenue = todayAnalytics.reduce((sum, a) => sum + a.revenue, 0);

    // Get top channel by revenue
    const topChannels = await db.analyticsChannel.findMany({
      orderBy: { revenue: 'desc' },
      take: 1
    });

    const topChannel = topChannels[0];

    // Calculate changes (mock for now - in production would compare with yesterday)
    const revenueChange = 12;
    const accountsChange = -2;
    const commentsChange = 8;

    return NextResponse.json({
      kpi: [
        {
          title: 'Доход сегодня',
          value: `${todayRevenue.toLocaleString('ru-RU')} ₽`,
          change: revenueChange,
          icon: 'dollar',
          color: revenueChange >= 0 ? 'green' : 'red'
        },
        {
          title: 'Живые аккаунты',
          value: `${activeAccounts}`,
          change: accountsChange,
          icon: 'users',
          color: 'neutral'
        },
        {
          title: 'Комментариев сегодня',
          value: `${todayComments}`,
          change: commentsChange,
          icon: 'message',
          color: commentsChange >= 0 ? 'green' : 'red'
        },
        {
          title: 'Топ-канал',
          value: topChannel?.channelName || '@unknown',
          change: undefined,
          icon: 'trending',
          color: 'neutral'
        }
      ],
      stats: {
        activeAccounts,
        totalAccounts,
        todayComments,
        todayRevenue,
        topChannel: topChannel?.channelName || null
      }
    });
  } catch (error) {
    console.error('Error fetching KPI:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI data' },
      { status: 500 }
    );
  }
}

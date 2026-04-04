import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dashboard - Получить всю статистику для дашборда
export async function GET() {
  try {
    // Получаем все данные параллельно
    const [
      influencers,
      accounts,
      campaigns,
      offers,
      simCards,
      recentPosts,
      recentActions,
    ] = await Promise.all([
      db.influencer.findMany({
        include: {
          Account: true,
          InfluencerAnalytics: {
            orderBy: { date: 'desc' },
            take: 7,
          },
        },
      }),
      db.account.findMany(),
      db.campaign.findMany({
        include: {
          CampaignInfluencer: true,
        },
      }),
      db.offer.findMany(),
      db.simCard.findMany(),
      db.post.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      db.accountAction.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          Account: true,
        },
      }),
    ]);

    // Статистика инфлюенсеров
    const influencerStats = {
      total: influencers.length,
      active: influencers.filter((i) => i.status === 'active').length,
      warming: influencers.filter((i) => i.status === 'warming').length,
      paused: influencers.filter((i) => i.status === 'paused').length,
      banned: influencers.filter((i) => i.status === 'banned').length,
      totalSubscribers: influencers.reduce((sum, i) => sum + i.subscribersCount, 0),
      totalLeads: influencers.reduce((sum, i) => sum + i.leadsCount, 0),
      totalRevenue: influencers.reduce((sum, i) => sum + i.revenue, 0),
      avgBanRisk: influencers.length > 0
        ? Math.round(influencers.reduce((sum, i) => sum + i.banRisk, 0) / influencers.length)
        : 0,
    };

    // Статистика аккаунтов
    const accountStats = {
      total: accounts.length,
      active: accounts.filter((a) => a.status === 'active').length,
      warming: accounts.filter((a) => a.status === 'warming').length,
      banned: accounts.filter((a) => a.status === 'banned').length,
      limited: accounts.filter((a) => a.status === 'limited').length,
      flood: accounts.filter((a) => a.status === 'flood').length,
      byPlatform: {
        telegram: accounts.filter((a) => a.platform === 'telegram').length,
        instagram: accounts.filter((a) => a.platform === 'instagram').length,
        tiktok: accounts.filter((a) => a.platform === 'tiktok').length,
        youtube: accounts.filter((a) => a.platform === 'youtube').length,
      },
    };

    // Статистика кампаний
    const campaignStats = {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === 'active').length,
      draft: campaigns.filter((c) => c.status === 'draft').length,
      completed: campaigns.filter((c) => c.status === 'completed').length,
      totalBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
      totalSpent: campaigns.reduce((sum, c) => sum + c.spent, 0),
      totalLeads: campaigns.reduce((sum, c) => sum + c.leadsCount, 0),
      totalRevenue: campaigns.reduce((sum, c) => sum + c.revenue, 0),
    };

    // Статистика офферов
    const offerStats = {
      total: offers.length,
      active: offers.filter((o) => o.status === 'active').length,
      totalClicks: offers.reduce((sum, o) => sum + o.clicks, 0),
      totalLeads: offers.reduce((sum, o) => sum + o.leads, 0),
      totalConversions: offers.reduce((sum, o) => sum + o.conversions, 0),
      totalRevenue: offers.reduce((sum, o) => sum + o.revenue, 0),
    };

    // Статистика SIM-карт
    const simCardStats = {
      total: simCards.length,
      available: simCards.filter((s) => s.status === 'available').length,
      inUse: simCards.filter((s) => s.status === 'in_use').length,
      blocked: simCards.filter((s) => s.status === 'blocked').length,
      limit: 20,
    };

    // Общая статистика
    const overview = {
      totalRevenue: influencerStats.totalRevenue + campaignStats.totalRevenue,
      totalSpent: campaignStats.totalSpent,
      totalLeads: influencerStats.totalLeads + campaignStats.totalLeads,
      roi: campaignStats.totalSpent > 0
        ? (((influencerStats.totalRevenue + campaignStats.totalRevenue - campaignStats.totalSpent) / campaignStats.totalSpent) * 100).toFixed(1)
        : '0',
    };

    // Топ инфлюенсеры
    const topInfluencers = influencers
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((i) => ({
        id: i.id,
        name: i.name,
        niche: i.niche,
        revenue: i.revenue,
        leads: i.leadsCount,
        banRisk: i.banRisk,
        status: i.status,
      }));

    // Аккаунты с высоким риском
    const highRiskAccounts = accounts
      .filter((a) => a.banRisk >= 50)
      .sort((a, b) => b.banRisk - a.banRisk)
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        platform: a.platform,
        username: a.username,
        phone: a.phone,
        banRisk: a.banRisk,
        status: a.status,
      }));

    // Последняя активность
    const activity = recentActions.map((a) => ({
      id: a.id,
      type: a.actionType,
      target: a.target,
      result: a.result,
      error: a.error,
      createdAt: a.createdAt,
      platform: a.Account?.platform,
    }));

    return NextResponse.json({
      overview,
      influencerStats,
      accountStats,
      campaignStats,
      offerStats,
      simCardStats,
      topInfluencers,
      highRiskAccounts,
      recentPosts,
      activity,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

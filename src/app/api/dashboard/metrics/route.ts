import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/dashboard/metrics - Ключевые метрики дашборда
export async function GET() {
  try {
    // Получаем всех инфлюенсеров
    const influencers = await db.influencer.findMany({
      include: {
        Account: true,
        SimCard: true,
      },
    });

    // Получаем все аккаунты
    const accounts = await db.account.findMany();

    // Получаем все кампании
    const campaigns = await db.campaign.findMany();

    // Получаем аналитику за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAnalytics = await db.influencerAnalytics.findMany({
      where: {
        date: { gte: thirtyDaysAgo },
      },
    });

    // Считаем метрики
    const totalInfluencers = influencers.length;
    const activeInfluencers = influencers.filter(i => i.status === 'active').length;
    const warmingInfluencers = influencers.filter(i => i.status === 'warming').length;
    const pausedInfluencers = influencers.filter(i => i.status === 'paused').length;
    const bannedInfluencers = influencers.filter(i => i.status === 'banned').length;

    const totalSubscribers = influencers.reduce((sum, i) => sum + (i.subscribersCount || 0), 0);
    const totalLeads = influencers.reduce((sum, i) => sum + (i.leadsCount || 0), 0);
    const totalRevenue = influencers.reduce((sum, i) => sum + (i.revenue || 0), 0);
    const avgBanRisk = influencers.length > 0
      ? Math.round(influencers.reduce((sum, i) => sum + (i.banRisk || 0), 0) / influencers.length)
      : 0;

    // Аккаунты
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(a => a.status === 'active').length;
    const warmingAccounts = accounts.filter(a => a.status === 'warming').length;
    const bannedAccounts = accounts.filter(a => a.status === 'banned').length;
    const limitedAccounts = accounts.filter(a => a.status === 'limited' || a.status === 'flood').length;

    // Кампании
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
    const campaignRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);

    // Доход за месяц (из аналитики)
    const monthlyRevenue = recentAnalytics.reduce((sum, a) => sum + (a.revenue || 0), 0);
    const monthlyLeads = recentAnalytics.reduce((sum, a) => sum + (a.leads || 0), 0);

    // ROI
    const roi = totalSpent > 0
      ? (((totalRevenue - totalSpent) / totalSpent) * 100).toFixed(1)
      : '0';

    // SIM-карты
    const simCards = await db.simCard.findMany();
    const totalSimCards = simCards.length;
    const availableSimCards = simCards.filter(s => s.status === 'available').length;
    const inUseSimCards = simCards.filter(s => s.status === 'in_use').length;

    const metrics = {
      // Инфлюенсеры
      totalInfluencers,
      activeInfluencers,
      warmingInfluencers,
      pausedInfluencers,
      bannedInfluencers,
      totalSubscribers,
      totalLeads,
      totalRevenue,
      avgBanRisk,

      // Аккаунты
      totalAccounts,
      activeAccounts,
      warmingAccounts,
      bannedAccounts,
      limitedAccounts,

      // Кампании
      totalCampaigns,
      activeCampaigns,
      totalSpent,
      campaignRevenue,

      // Месячные метрики
      monthlyRevenue,
      monthlyLeads,
      roi: parseFloat(roi),

      // SIM-карты
      totalSimCards,
      availableSimCards,
      inUseSimCards,
    };

    logger.debug('Dashboard metrics calculated', { metrics });

    return NextResponse.json({ metrics });
  } catch (error) {
    logger.error('Failed to calculate dashboard metrics', error as Error);
    return NextResponse.json(
      { error: 'Failed to calculate metrics', metrics: null },
      { status: 500 }
    );
  }
}

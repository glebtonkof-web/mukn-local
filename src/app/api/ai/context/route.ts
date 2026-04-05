import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/ai/context - Получить контекст аналитики для ИИ ассистента
export async function GET() {
  try {
    // Получаем все кампании с аналитикой
    const campaigns = await db.campaign.findMany({
      include: {
        CampaignInfluencer: {
          include: {
            Influencer: {
              select: {
                id: true,
                name: true,
                platform: true,
                niche: true,
                status: true,
                subscribers: true,
                leadsCount: true,
                revenue: true,
              },
            },
          },
        },
        CampaignOffer: {
          include: {
            Offer: {
              select: {
                id: true,
                name: true,
                type: true,
                payout: true,
                clicks: true,
                leads: true,
                conversions: true,
              },
            },
          },
        },
        CampaignAnalytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Получаем аккаунты
    const accounts = await db.account.findMany({
      select: {
        id: true,
        username: true,
        platform: true,
        status: true,
        niche: true,
        geo: true,
        followers: true,
        warmingDay: true,
        warmingPhase: true,
        proxyId: true,
        lastActivity: true,
        createdAt: true,
      },
    });

    // Получаем инфлюенсеров
    const influencers = await db.influencer.findMany({
      select: {
        id: true,
        name: true,
        platform: true,
        niche: true,
        status: true,
        subscribers: true,
        leadsCount: true,
        revenue: true,
        riskLevel: true,
      },
    });

    // Получаем офферы
    const offers = await db.offer.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        geo: true,
        payout: true,
        clicks: true,
        leads: true,
        conversions: true,
        cr: true,
        status: true,
      },
    });

    // Общая статистика
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const pausedCampaigns = campaigns.filter(c => c.status === 'paused').length;

    const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.leadsCount || 0), 0);

    // ROI
    const overallROI = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent * 100).toFixed(2) : 0;

    // Статистика по типам кампаний
    const campaignsByType = campaigns.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Статистика по нишам
    const campaignsByNiche = campaigns.reduce((acc, c) => {
      if (c.niche) {
        acc[c.niche] = (acc[c.niche] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Статистика по GEO
    const geoStats = campaigns.reduce((acc, c) => {
      if (c.geo && Array.isArray(c.geo)) {
        c.geo.forEach(g => {
          acc[g] = (acc[g] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<string, number>);

    // Топ кампании по доходу
    const topCampaignsByRevenue = campaigns
      .filter(c => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        niche: c.niche,
        revenue: c.revenue,
        spent: c.spent,
        roi: c.spent > 0 ? ((c.revenue - c.spent) / c.spent * 100).toFixed(2) : 0,
        leadsCount: c.leadsCount,
        status: c.status,
      }));

    // Топ кампании по ROI
    const topCampaignsByROI = campaigns
      .filter(c => c.spent > 0 && c.revenue > 0)
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        niche: c.niche,
        revenue: c.revenue,
        spent: c.spent,
        roi: ((c.revenue - c.spent) / c.spent * 100),
        leadsCount: c.leadsCount,
        status: c.status,
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5);

    // Статистика аккаунтов
    const accountsByPlatform = accounts.reduce((acc, a) => {
      acc[a.platform] = (acc[a.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const accountsByStatus = accounts.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const warmingAccounts = accounts.filter(a => a.status === 'warming');
    const activeAccounts = accounts.filter(a => a.status === 'active');

    // Статистика инфлюенсеров
    const influencersByPlatform = influencers.reduce((acc, i) => {
      if (i.platform) {
        acc[i.platform] = (acc[i.platform] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topInfluencers = influencers
      .filter(i => i.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        name: i.name,
        platform: i.platform,
        subscribers: i.subscribers,
        leadsCount: i.leadsCount,
        revenue: i.revenue,
        riskLevel: i.riskLevel,
      }));

    // Статистика офферов
    const offersByType = offers.reduce((acc, o) => {
      acc[o.type] = (acc[o.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topOffers = offers
      .filter(o => o.conversions > 0)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5)
      .map(o => ({
        id: o.id,
        name: o.name,
        type: o.type,
        geo: o.geo,
        payout: o.payout,
        conversions: o.conversions,
        cr: o.cr,
      }));

    // Данные за последние дни (из аналитики кампаний)
    const last30Days: Array<{
      date: string;
      leads: number;
      revenue: number;
      spent: number;
    }> = [];

    const last30DaysMap = new Map<string, { leads: number; revenue: number; spent: number }>();

    campaigns.forEach(campaign => {
      campaign.CampaignAnalytics?.forEach(analytics => {
        const dateStr = analytics.date.toISOString().split('T')[0];
        const existing = last30DaysMap.get(dateStr) || { leads: 0, revenue: 0, spent: 0 };
        existing.leads += analytics.leads || 0;
        existing.revenue += analytics.revenue || 0;
        existing.spent += analytics.spent || 0;
        last30DaysMap.set(dateStr, existing);
      });
    });

    last30DaysMap.forEach((value, date) => {
      last30Days.push({ date, ...value });
    });

    last30Days.sort((a, b) => a.date.localeCompare(b.date));

    // Формируем итоговый контекст
    const context = {
      summary: {
        totalCampaigns,
        activeCampaigns,
        pausedCampaigns,
        totalBudget,
        totalSpent,
        totalRevenue,
        totalLeads,
        overallROI,
        profit: totalRevenue - totalSpent,
      },
      campaigns: {
        byType: campaignsByType,
        byNiche: campaignsByNiche,
        byStatus: {
          active: activeCampaigns,
          paused: pausedCampaigns,
          draft: campaigns.filter(c => c.status === 'draft').length,
          completed: campaigns.filter(c => c.status === 'completed').length,
        },
        topByRevenue: topCampaignsByRevenue,
        topByROI: topCampaignsByROI,
        list: campaigns.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          niche: c.niche,
          geo: c.geo,
          status: c.status,
          budget: c.budget,
          spent: c.spent,
          revenue: c.revenue,
          leadsCount: c.leadsCount,
          roi: c.spent > 0 ? ((c.revenue - c.spent) / c.spent * 100).toFixed(2) : null,
          startDate: c.startDate,
          endDate: c.endDate,
          influencers: c.CampaignInfluencer?.map(ci => ci.Influencer?.name).filter(Boolean),
          offers: c.CampaignOffer?.map(co => co.Offer?.name).filter(Boolean),
        })),
      },
      accounts: {
        total: accounts.length,
        byPlatform: accountsByPlatform,
        byStatus: accountsByStatus,
        warming: warmingAccounts.length,
        active: activeAccounts.length,
        list: accounts.map(a => ({
          id: a.id,
          username: a.username,
          platform: a.platform,
          status: a.status,
          niche: a.niche,
          geo: a.geo,
          followers: a.followers,
          warmingDay: a.warmingDay,
          warmingPhase: a.warmingPhase,
          lastActivity: a.lastActivity,
        })),
      },
      influencers: {
        total: influencers.length,
        byPlatform: influencersByPlatform,
        top: topInfluencers,
      },
      offers: {
        total: offers.length,
        byType: offersByType,
        top: topOffers,
      },
      geo: geoStats,
      last30Days,
      recommendations: generateRecommendations({
        campaigns,
        accounts,
        totalRevenue,
        totalSpent,
        totalLeads,
      }),
    };

    return NextResponse.json(context);
  } catch (error) {
    logger.error('Failed to fetch AI context', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch context' },
      { status: 500 }
    );
  }
}

// Генерация рекомендаций на основе данных
function generateRecommendations(data: {
  campaigns: any[];
  accounts: any[];
  totalRevenue: number;
  totalSpent: number;
  totalLeads: number;
}): string[] {
  const recommendations: string[] = [];

  // Проверяем количество аккаунтов
  if (data.accounts.length < 10) {
    recommendations.push(`Добавьте больше аккаунтов (сейчас ${data.accounts.length}, рекомендуется минимум 10-20 для масштабирования)`);
  }

  // Проверяем активные кампании
  const activeCampaigns = data.campaigns.filter(c => c.status === 'active');
  if (activeCampaigns.length === 0 && data.campaigns.length > 0) {
    recommendations.push('Нет активных кампаний! Запустите хотя бы одну кампанию для начала работы');
  }

  // Проверяем ROI
  if (data.totalSpent > 0) {
    const roi = (data.totalRevenue - data.totalSpent) / data.totalSpent * 100;
    if (roi < 0) {
      recommendations.push(`Отрицательный ROI (${roi.toFixed(2)}%). Необходимо оптимизировать кампании или остановить неэффективные`);
    } else if (roi < 20) {
      recommendations.push(`Низкий ROI (${roi.toFixed(2)}%). Рекомендуется A/B тестирование креативов и оптимизация таргетинга`);
    } else if (roi > 50) {
      recommendations.push(`Отличный ROI (${roi.toFixed(2)}%)! Рассмотрите возможность масштабирования успешных кампаний`);
    }
  }

  // Проверяем аккаунты на прогреве
  const warmingAccounts = data.accounts.filter(a => a.status === 'warming');
  if (warmingAccounts.length > 0) {
    recommendations.push(`${warmingAccounts.length} аккаунтов на прогреве. Проверьте их статус через /api/warming`);
  }

  // Проверяем баланс кампаний по типам
  const campaignTypes = data.campaigns.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!campaignTypes['traffic'] && data.campaigns.length > 0) {
    recommendations.push('Нет кампаний типа "traffic". Добавьте кампании для залива трафика');
  }

  return recommendations;
}

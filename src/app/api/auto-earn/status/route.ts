import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/auto-earn/status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';
    const campaignId = searchParams.get('campaignId');

    // Базовый фильтр
    const where: Record<string, unknown> = { userId };
    
    // Если указан конкретный campaignId, фильтруем по нему
    if (campaignId) {
      where.id = campaignId;
    }

    // Получаем все автоматические кампании пользователя
    const campaigns = await db.campaign.findMany({
      where: {
        ...where,
        name: { contains: 'Auto-Earn' },
      },
      include: {
        CampaignAnalytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Получаем аккаунты, связанные с кампаниями
    const campaignIds = campaigns.map(c => c.id);
    
    // Получаем активности по кампаниям
    const activities = await db.activityLog.findMany({
      where: {
        campaignId: { in: campaignIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Получаем прогревы
    const warmingAccounts = await db.instagramWarming.findMany({
      where: {
        status: { in: ['warming', 'pending', 'stable'] },
      },
      include: {
        InstagramWarmingAction: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Обогащаем данные о кампаниях
    const enrichedCampaigns = campaigns.map(campaign => {
      const analytics = campaign.CampaignAnalytics;
      
      // Вычисляем общую статистику
      const totalRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0);
      const totalSpent = analytics.reduce((sum, a) => sum + a.spent, 0);
      const totalLeads = analytics.reduce((sum, a) => sum + a.leads, 0);
      const totalConversions = analytics.reduce((sum, a) => sum + a.conversions, 0);
      
      // Вычисляем ROI
      const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
      
      // Определяем статус
      let status = 'unknown';
      let statusMessage = '';
      
      switch (campaign.status) {
        case 'active':
          status = 'active';
          statusMessage = 'Кампания активно работает';
          break;
        case 'initializing':
          status = 'initializing';
          statusMessage = 'Инициализация кампании...';
          break;
        case 'paused':
          status = 'paused';
          statusMessage = 'Кампания на паузе';
          break;
        case 'draft':
          status = 'draft';
          statusMessage = 'Черновик';
          break;
        case 'error':
          status = 'error';
          statusMessage = 'Ошибка в работе кампании';
          break;
        default:
          status = campaign.status;
          statusMessage = campaign.status;
      }

      return {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        niche: campaign.niche,
        geo: campaign.geo,
        status,
        statusMessage,
        budget: campaign.budget,
        spent: campaign.spent || totalSpent,
        revenue: campaign.revenue || totalRevenue,
        leadsCount: campaign.leadsCount || totalLeads,
        conversions: campaign.conversions || totalConversions,
        roi: roi.toFixed(2),
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        analytics: analytics.slice(0, 7).map(a => ({
          date: a.date,
          revenue: a.revenue,
          spent: a.spent,
          leads: a.leads,
          conversions: a.conversions,
        })),
      };
    });

    // Группируем прогревы по статусам
    const warmingStats = {
      total: warmingAccounts.length,
      pending: warmingAccounts.filter(w => w.status === 'pending').length,
      warming: warmingAccounts.filter(w => w.status === 'warming').length,
      stable: warmingAccounts.filter(w => w.status === 'stable').length,
      avgDay: Math.round(
        warmingAccounts.reduce((sum, w) => sum + w.currentDay, 0) / (warmingAccounts.length || 1)
      ),
    };

    // Вычисляем общую статистику
    const totalStats = {
      campaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
      totalSpent: campaigns.reduce((sum, c) => sum + (c.spent || 0), 0),
      totalRevenue: campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0),
      totalLeads: campaigns.reduce((sum, c) => sum + (c.leadsCount || 0), 0),
      totalConversions: campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0),
    };

    const totalROI = totalStats.totalSpent > 0 
      ? ((totalStats.totalRevenue - totalStats.totalSpent) / totalStats.totalSpent) * 100 
      : 0;

    // Генерируем рекомендации
    const recommendations = generateRecommendations(enrichedCampaigns, warmingStats);

    return NextResponse.json({
      success: true,
      campaigns: enrichedCampaigns,
      warming: {
        accounts: warmingAccounts.map(w => ({
          id: w.id,
          accountId: w.accountId,
          username: w.username,
          status: w.status,
          currentDay: w.currentDay,
          banRisk: w.banRisk,
          progress: Math.min(100, Math.round((w.currentDay / 7) * 100)),
        })),
        stats: warmingStats,
      },
      activities: activities.slice(0, 20).map(a => ({
        id: a.id,
        type: a.type,
        message: a.message,
        campaignId: a.campaignId,
        timestamp: a.createdAt,
      })),
      stats: {
        ...totalStats,
        totalROI: totalROI.toFixed(2),
      },
      recommendations,
    });
  } catch (error) {
    console.error('Error fetching auto-earn status:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении статуса автоматических кампаний' },
      { status: 500 }
    );
  }
}

// Генерация рекомендаций на основе данных
function generateRecommendations(
  campaigns: Record<string, unknown>[],
  warmingStats: Record<string, number>
): Array<{ type: string; message: string; priority: 'high' | 'medium' | 'low'; action?: string }> {
  const recommendations: Array<{ type: string; message: string; priority: 'high' | 'medium' | 'low'; action?: string }> = [];

  // Проверяем прогрев
  if (warmingStats.pending > 0) {
    recommendations.push({
      type: 'warming',
      message: `${warmingStats.pending} аккаунтов ожидают начала прогрева. Рекомендуем запустить прогрев.`,
      priority: 'high',
      action: 'start_warming',
    });
  }

  // Проверяем активные кампании
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  if (activeCampaigns.length === 0 && campaigns.length > 0) {
    recommendations.push({
      type: 'campaign',
      message: 'Нет активных кампаний. Запустите хотя бы одну кампанию.',
      priority: 'high',
      action: 'start_campaign',
    });
  }

  // Проверяем ROI
  const lowROICampaigns = campaigns.filter(c => {
    const roi = parseFloat(c.roi as string) || 0;
    return roi < 50 && c.status === 'active';
  });
  
  if (lowROICampaigns.length > 0) {
    recommendations.push({
      type: 'optimization',
      message: `${lowROICampaigns.length} кампаний показывают низкий ROI (<50%). Рассмотрите оптимизацию настроек.`,
      priority: 'medium',
      action: 'optimize',
    });
  }

  // Проверяем бюджет
  const lowBudgetCampaigns = campaigns.filter(c => {
    const spent = (c.spent as number) || 0;
    const budget = (c.budget as number) || 0;
    return budget > 0 && spent / budget > 0.8;
  });
  
  if (lowBudgetCampaigns.length > 0) {
    recommendations.push({
      type: 'budget',
      message: `${lowBudgetCampaigns.length} кампаний почти израсходовали бюджет (>80%).`,
      priority: 'high',
      action: 'increase_budget',
    });
  }

  // Общая рекомендация
  if (campaigns.length === 0) {
    recommendations.push({
      type: 'info',
      message: 'Начните работу с выбора схемы монетизации в мастере автоматизации.',
      priority: 'low',
      action: 'start_wizard',
    });
  }

  return recommendations;
}

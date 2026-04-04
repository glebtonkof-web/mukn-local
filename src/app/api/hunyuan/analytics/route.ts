import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/hunyuan/analytics - Аналитика контента Hunyuan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    const type = searchParams.get('type');
    const platform = searchParams.get('platform');

    // Парсим период
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Фильтры
    const where: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (type) where.type = type;
    if (platform) where.platform = platform;

    // Получаем статистику
    const [
      totalCreated,
      totalPublished,
      metricsAggregate,
      byType,
      byPlatform,
      recentContent,
    ] = await Promise.all([
      // Всего создано
      db.generatedContent.count({ where }),
      
      // Всего опубликовано
      db.generatedContent.count({
        where: { ...where, isPublished: true },
      }),
      
      // Общие метрики (aggregate возвращает один объект с _sum для всех полей)
      db.generatedContent.aggregate({
        where: { ...where, isPublished: true },
        _sum: {
          views: true,
          likes: true,
          comments: true,
          shares: true,
        },
      }),
      
      // По типам
      db.generatedContent.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      
      // По платформам
      db.generatedContent.groupBy({
        by: ['platform'],
        where: { ...where, isPublished: true },
        _count: true,
        _sum: {
          views: true,
          likes: true,
        },
      }),
      
      // Последний контент
      db.generatedContent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          platform: true,
          prompt: true,
          status: true,
          isPublished: true,
          views: true,
          likes: true,
          createdAt: true,
        },
      }),
    ]);

    // Вычисляем конверсии и клики из PublicationSchedule
    const publishStats = await db.publicationSchedule.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'published',
      },
    });

    let totalPublishClicks = 0;
    let totalPublishConversions = 0;

    publishStats.forEach(schedule => {
      const results = JSON.parse(schedule.publishResults || '{}');
      Object.values(results).forEach((result: any) => {
        if (result.clicks) totalPublishClicks += result.clicks;
        if (result.conversions) totalPublishConversions += result.conversions;
      });
    });

    // Извлекаем метрики из aggregate результата
    const totalViews = metricsAggregate._sum.views || 0;
    const totalLikes = metricsAggregate._sum.likes || 0;
    const totalComments = metricsAggregate._sum.comments || 0;
    const totalShares = metricsAggregate._sum.shares || 0;

    // Формируем ответ
    const stats = {
      period,
      startDate,
      endDate: now,
      
      totalCreated,
      totalPublished,
      publishRate: totalCreated > 0 ? ((totalPublished / totalCreated) * 100).toFixed(1) : 0,
      
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalClicks: totalPublishClicks,
      totalConversions: totalPublishConversions,
      
      avgViewsPerContent: totalPublished > 0 
        ? Math.round(totalViews / totalPublished) 
        : 0,
      avgEngagementRate: totalPublished > 0
        ? (((totalLikes) + (totalComments)) / Math.max(totalViews, 1) * 100).toFixed(2)
        : 0,
      
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
      
      byPlatform: byPlatform.reduce((acc, item) => {
        acc[item.platform] = {
          count: item._count,
          views: item._sum.views || 0,
          likes: item._sum.likes || 0,
        };
        return acc;
      }, {} as Record<string, { count: number; views: number; likes: number }>),
    };

    return NextResponse.json({
      stats,
      recentContent,
    });
  } catch (error) {
    console.error('[API Hunyuan Analytics] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

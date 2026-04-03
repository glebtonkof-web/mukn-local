import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/dashboard/chart - Данные для графика активности
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const metric = searchParams.get('metric') || 'subscribers'; // subscribers, revenue, leads

    // Вычисляем начальную дату
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Получаем аналитику за период
    const analytics = await db.influencerAnalytics.findMany({
      where: {
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Группируем по датам
    const groupedByDate = new Map<string, {
      date: string;
      subscribers: number;
      revenue: number;
      leads: number;
    }>();

    // Инициализируем все даты в диапазоне
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      groupedByDate.set(dateStr, {
        date: dateStr,
        subscribers: 0,
        revenue: 0,
        leads: 0,
      });
    }

    // Заполняем данными
    analytics.forEach(a => {
      const dateStr = a.date.toISOString().split('T')[0];
      const existing = groupedByDate.get(dateStr);
      if (existing) {
        existing.subscribers += a.followers;
        existing.revenue += a.revenue;
        existing.leads += a.leads;
      }
    });

    // Преобразуем в массив для графика
    const chartData = Array.from(groupedByDate.values()).map(d => {
      const rawValue = d[metric as keyof typeof d];
      return {
        date: d.date,
        label: formatChartLabel(new Date(d.date)),
        value: typeof rawValue === 'number' ? rawValue : 0,
      };
    });

    // Вычисляем динамику
    const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);
    const previousPeriodValue = 0; // Можно вычислить для сравнения с предыдущим периодом

    logger.debug('Dashboard chart data calculated', { days, metric, dataPoints: chartData.length });

    return NextResponse.json({
      chartData,
      summary: {
        total: totalValue,
        change: previousPeriodValue > 0
          ? ((totalValue - previousPeriodValue) / previousPeriodValue * 100).toFixed(1)
          : 0,
        metric,
        days,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch chart data', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data', chartData: [], summary: null },
      { status: 500 }
    );
  }
}

function formatChartLabel(date: Date): string {
  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

  if (isToday) return 'Сегодня';
  if (isYesterday) return 'Вчера';

  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

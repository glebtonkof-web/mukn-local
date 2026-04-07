import { NextRequest, NextResponse } from 'next/server';
import profitExecutor from '@/lib/sim-auto/profit-executor';

/**
 * GET /api/sim-auto/profit
 * Get revenue dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'export') {
      // Export revenue report
      const schemes = await profitExecutor.getSchemes();
      const dailyRevenue = await profitExecutor.getDailyRevenue();
      const weeklyRevenue = await profitExecutor.getWeeklyRevenue();

      const report = {
        generatedAt: new Date().toISOString(),
        daily: dailyRevenue,
        weekly: weeklyRevenue,
        schemes: schemes.map(s => ({
          name: s.name,
          platform: s.platform,
          status: s.status,
          dailyRevenue: s.dailyRevenue,
          weeklyRevenue: s.weeklyRevenue,
          totalRevenue: s.totalRevenue,
        })),
      };

      return NextResponse.json({ report });
    }

    // Get all revenue data
    const schemes = await profitExecutor.getSchemes();
    const dailyRevenue = await profitExecutor.getDailyRevenue();
    const weeklyRevenue = await profitExecutor.getWeeklyRevenue();
    const performanceMetrics = await profitExecutor.monitorPerformance();

    // Calculate additional metrics
    const yesterdayRevenue = weeklyRevenue.daily[weeklyRevenue.daily.length - 2]?.total || 0;
    const monthRevenue = weeklyRevenue.total * 4; // Approximate

    // Revenue by platform
    const byPlatform = Object.entries(dailyRevenue.byPlatform)
      .map(([platform, revenue]) => ({ platform, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // Revenue by scheme
    const byScheme = Object.entries(dailyRevenue.byScheme)
      .map(([schemeId, revenue]) => ({ schemeId, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      schemes,
      revenue: {
        today: dailyRevenue.total,
        yesterday: yesterdayRevenue,
        week: weeklyRevenue.total,
        month: monthRevenue,
        daily: weeklyRevenue.daily,
        byPlatform,
        byScheme,
      },
      performance: performanceMetrics,
    });
  } catch (error) {
    console.error('Error in GET /api/sim-auto/profit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sim-auto/profit
 * Manual revenue entry or scheme management
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, schemeId, amount, source, platform } = body;

    switch (action) {
      case 'apply':
        if (!schemeId) {
          return NextResponse.json(
            { error: 'schemeId is required' },
            { status: 400 }
          );
        }
        const applyResult = await profitExecutor.applyScheme(schemeId);
        return NextResponse.json(applyResult);

      case 'pause':
        if (!schemeId) {
          return NextResponse.json(
            { error: 'schemeId is required' },
            { status: 400 }
          );
        }
        const pauseResult = await profitExecutor.pauseScheme(schemeId);
        return NextResponse.json(pauseResult);

      case 'track':
        if (!schemeId || amount === undefined) {
          return NextResponse.json(
            { error: 'schemeId and amount are required' },
            { status: 400 }
          );
        }
        const entry = await profitExecutor.trackRevenue(schemeId, amount, source, platform);
        return NextResponse.json({ success: true, entry });

      case 'rotate':
        const rotateResult = await profitExecutor.rotateAccounts();
        return NextResponse.json(rotateResult);

      case 'start':
        const startResult = await profitExecutor.startProfitExecution();
        return NextResponse.json(startResult);

      case 'stop':
        await profitExecutor.stopProfitExecution();
        return NextResponse.json({ success: true, message: 'Profit execution stopped' });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in POST /api/sim-auto/profit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

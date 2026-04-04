import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/monetization/trends - Получить трендовые ниши
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'rising';
    const limit = parseInt(searchParams.get('limit') || '20');

    const trends = await db.trendAnalyzer.findMany({
      where: { status },
      orderBy: { growthRate: 'desc' },
      take: limit,
    });

    if (trends.length === 0) {
      const demoTrends = createDemoTrends();
      return NextResponse.json({ success: true, trends: demoTrends });
    }

    return NextResponse.json({ success: true, trends });
  } catch (error) {
    console.error('Error fetching trends:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/trends - Запустить анализ трендов
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sources, keywords } = body;

    // Симуляция анализа трендов
    const foundTrends = await analyzeTrends(sources, keywords);

    // Сохраняем результаты
    const savedTrends = await Promise.all(
      foundTrends.map(trend =>
        db.trendAnalyzer.create({
          data: trend,
        })
      )
    );

    return NextResponse.json({
      success: true,
      trends: savedTrends,
      message: `Найдено ${savedTrends.length} трендовых ниш`,
    });
  } catch (error) {
    console.error('Error analyzing trends:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze trends' },
      { status: 500 }
    );
  }
}

function createDemoTrends() {
  return [
    {
      id: 'trend-1',
      nicheName: 'AI-инструменты для заработка',
      nicheCategory: 'tech',
      growthRate: 340,
      momentum: 85,
      topChannels: JSON.stringify([
        { name: 'AI Money Maker', subscribers: 125000, engagement: 8.5 },
        { name: 'Neural Profits', subscribers: 89000, engagement: 7.2 },
      ]),
      avgEngagement: 7.8,
      recommendedOffers: JSON.stringify([
        { network: 'CPAlead', offer: 'AI Trading Bot', payout: 25 },
        { network: 'Custom', offer: 'ChatGPT Course', payout: 15 },
      ]),
      predictedROI: 185,
      competitionLevel: 'low',
      status: 'rising',
    },
    {
      id: 'trend-2',
      nicheName: 'Telegram Mini Apps',
      nicheCategory: 'crypto',
      growthRate: 280,
      momentum: 72,
      topChannels: JSON.stringify([
        { name: 'TON Ecosystem', subscribers: 200000, engagement: 6.5 },
        { name: 'Mini Apps News', subscribers: 75000, engagement: 9.1 },
      ]),
      avgEngagement: 7.8,
      recommendedOffers: JSON.stringify([
        { network: 'Custom', offer: 'TON Wallet', payout: 12 },
        { network: 'Admitad', offer: 'Notcoin Clone', payout: 8 },
      ]),
      predictedROI: 210,
      competitionLevel: 'low',
      status: 'rising',
    },
    {
      id: 'trend-3',
      nicheName: 'Крипто-драгоценности',
      nicheCategory: 'crypto',
      growthRate: 195,
      momentum: 58,
      topChannels: JSON.stringify([
        { name: 'Crypto Gems', subscribers: 180000, engagement: 5.2 },
      ]),
      avgEngagement: 5.2,
      recommendedOffers: JSON.stringify([
        { network: 'Custom', offer: 'New Token Launch', payout: 50 },
      ]),
      predictedROI: 150,
      competitionLevel: 'medium',
      status: 'rising',
    },
    {
      id: 'trend-4',
      nicheName: 'Нутра: пептиды',
      nicheCategory: 'nutra',
      growthRate: 165,
      momentum: 45,
      topChannels: JSON.stringify([
        { name: 'Biohacking RU', subscribers: 95000, engagement: 4.8 },
      ]),
      avgEngagement: 4.8,
      recommendedOffers: JSON.stringify([
        { network: 'Cashbox', offer: 'Peptide Complex', payout: 35 },
      ]),
      predictedROI: 140,
      competitionLevel: 'medium',
      status: 'rising',
    },
    {
      id: 'trend-5',
      nicheName: 'Gambling: crash-игры',
      nicheCategory: 'gambling',
      growthRate: 220,
      momentum: 67,
      topChannels: JSON.stringify([
        { name: 'Crash Strategy', subscribers: 145000, engagement: 6.1 },
      ]),
      avgEngagement: 6.1,
      recommendedOffers: JSON.stringify([
        { network: 'Admitad', offer: 'Crash Game X', payout: 40 },
      ]),
      predictedROI: 175,
      competitionLevel: 'high',
      status: 'rising',
    },
  ];
}

async function analyzeTrends(sources: string[], keywords: string[]) {
  const trends = [];
  const nicheTemplates = [
    { name: 'AI-автоматизация бизнеса', category: 'tech', baseGrowth: 250 },
    { name: 'Новые платежные системы', category: 'finance', baseGrowth: 180 },
    { name: 'Web3 игры', category: 'crypto', baseGrowth: 200 },
    { name: 'Микро-инвестиции', category: 'finance', baseGrowth: 160 },
    { name: 'Биохакинг 2.0', category: 'nutra', baseGrowth: 140 },
  ];

  for (const template of nicheTemplates) {
    if (Math.random() > 0.3) {
      trends.push({
        nicheName: template.name,
        nicheCategory: template.category,
        growthRate: template.baseGrowth + Math.floor(Math.random() * 100),
        momentum: Math.floor(Math.random() * 40) + 40,
        avgEngagement: Math.random() * 5 + 3,
        predictedROI: Math.floor(Math.random() * 100) + 100,
        competitionLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        status: 'rising',
      });
    }
  }

  return trends;
}

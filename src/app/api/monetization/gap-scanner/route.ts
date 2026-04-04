import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/monetization/gap-scanner - Получить найденные "дыры" в партнёрках
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const riskLevel = searchParams.get('riskLevel');
    const network = searchParams.get('network');

    const where: any = { status };
    if (riskLevel) where.riskLevel = riskLevel;
    if (network) where.network = network;

    const gaps = await db.affiliateGapScanner.findMany({
      where,
      orderBy: { estimatedROI: 'desc' },
      take: 50,
    });

    // Если данных нет, создаём демо-данные
    if (gaps.length === 0) {
      const demoGaps = createDemoGaps();
      return NextResponse.json({ success: true, gaps: demoGaps });
    }

    return NextResponse.json({ success: true, gaps });
  } catch (error) {
    console.error('Error fetching gap scanner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gaps' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/gap-scanner - Запустить сканирование
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { networks, minROI } = body;

    // Симуляция сканирования партнёрских сетей
    const foundGaps = await simulateGapScan(networks, minROI);

    // Сохраняем результаты
    const savedGaps = await Promise.all(
      foundGaps.map(gap =>
        db.affiliateGapScanner.create({
          data: gap,
        })
      )
    );

    return NextResponse.json({
      success: true,
      gaps: savedGaps,
      message: `Найдено ${savedGaps.length} новых возможностей`,
    });
  } catch (error) {
    console.error('Error scanning gaps:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scan gaps' },
      { status: 500 }
    );
  }
}

// Демо-данные для отображения
function createDemoGaps() {
  return [
    {
      id: 'demo-1',
      network: 'Admitad',
      gapType: 'soft_moderation',
      description: 'Оффер "Casino X" - мягкая модерация креативов. Допускаются прямые ссылки при определённой подаче.',
      estimatedROI: 250,
      riskLevel: 'medium',
      recommendedOffer: JSON.stringify({
        name: 'Casino X',
        payout: 45,
        geo: ['RU', 'UA', 'KZ'],
        conversionRate: 3.2,
      }),
      recommendedApproach: 'Использовать формат "личный опыт" в комментариях',
      testedBy: 127,
      successRate: 68,
      status: 'active',
    },
    {
      id: 'demo-2',
      network: 'CPAlead',
      gapType: 'no_quality_check',
      description: 'Новый оффер betting - нет проверки качества трафика первые 30 дней.',
      estimatedROI: 180,
      riskLevel: 'low',
      recommendedOffer: JSON.stringify({
        name: '1xBet New',
        payout: 35,
        geo: ['RU', 'BY'],
        conversionRate: 2.8,
      }),
      recommendedApproach: 'Агрессивный спам в комментариях без риска бана аккаунта',
      testedBy: 45,
      successRate: 82,
      status: 'active',
    },
    {
      id: 'demo-3',
      network: 'Custom Network',
      gapType: 'high_payout',
      description: 'Crypto exchange - выплата $80 за депозит, при этом конкуренты платят $40.',
      estimatedROI: 320,
      riskLevel: 'high',
      recommendedOffer: JSON.stringify({
        name: 'CryptoFlash',
        payout: 80,
        geo: ['WW'],
        conversionRate: 1.5,
      }),
      recommendedApproach: 'Нишевые крипто-каналы, сторителлинг о "успешной инвестиции"',
      testedBy: 23,
      successRate: 54,
      status: 'active',
    },
  ];
}

// Симуляция сканирования
async function simulateGapScan(networks: string[] = ['all'], minROI: number = 100) {
  const gaps = [];
  const networkList = networks.includes('all') 
    ? ['Admitad', 'CPAlead', 'Cashbox', 'MonsterAds', 'Custom']
    : networks;

  const gapTypes = [
    { type: 'soft_moderation', label: 'Мягкая модерация' },
    { type: 'no_quality_check', label: 'Без проверки качества' },
    { type: 'high_payout', label: 'Повышенная выплата' },
    { type: 'new_offer_bonus', label: 'Бонус за новый оффер' },
    { type: 'weekly_promo', label: 'Недельная акция' },
  ];

  for (const network of networkList) {
    if (Math.random() > 0.4) { // 60% шанс найти что-то
      const gapType = gapTypes[Math.floor(Math.random() * gapTypes.length)];
      const roi = Math.floor(Math.random() * 300) + 100;

      if (roi >= minROI) {
        gaps.push({
          network,
          gapType: gapType.type,
          description: `${gapType.label} в сети ${network}. Детали доступны после подписки.`,
          estimatedROI: roi,
          riskLevel: roi > 200 ? 'high' : roi > 150 ? 'medium' : 'low',
          recommendedApproach: 'Подписка ROI для получения детальной информации',
          testedBy: 0,
          successRate: 0,
          status: 'active',
        });
      }
    }
  }

  return gaps;
}

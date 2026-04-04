import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/monetization/darknet - Получить дайджест даркнета
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');

    const where: any = {};
    if (source) where.source = source;

    const digests = await db.darknetDigest.findMany({
      where,
      orderBy: { scanDate: 'desc' },
      take: 10,
    });

    if (digests.length === 0) {
      return NextResponse.json({
        success: true,
        digests: createDemoDigests(),
        subscription: {
          price: 49,
          period: 'monthly',
          features: [
            'Ежедневный парсинг форумов',
            'Анализ свежих схем',
            'Фильтрация по нишам',
            'Оповещения о новых методах',
          ],
        },
      });
    }

    return NextResponse.json({ success: true, digests });
  } catch (error) {
    console.error('Error fetching darknet digest:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch digest' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/darknet - Запустить парсинг
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { forums, keywords } = body;

    // Симуляция парсинга
    const foundSchemes = await simulateDarknetParse(forums, keywords);

    // Сохраняем дайджест
    const digest = await db.darknetDigest.create({
      data: {
        source: forums?.[0] || 'multiple',
        schemes: JSON.stringify(foundSchemes),
        accessPrice: 49,
        subscribers: 0,
      },
    });

    return NextResponse.json({
      success: true,
      digest,
      message: `Найдено ${foundSchemes.length} новых схем`,
    });
  } catch (error) {
    console.error('Error parsing darknet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/darknet - Подписаться на дайджест
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    // В реальной реализации - интеграция с платёжной системой
    return NextResponse.json({
      success: true,
      message: 'Подписка активирована',
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });
  } catch (error) {
    console.error('Error subscribing to darknet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

function createDemoDigests() {
  return [
    {
      id: 'dn-1',
      scanDate: new Date(),
      source: 'ShadowWhisper',
      schemes: JSON.stringify([
        {
          title: 'Новый метод обхода модерации Telegram',
          category: 'spam',
          riskLevel: 'medium',
          description: 'Использование Telegram Stories для продвижения офферов',
          potential: 'high',
        },
        {
          title: 'Схема с крипто-ботами',
          category: 'crypto',
          riskLevel: 'low',
          description: 'Автоматизация через Telegram ботов для крипто-офферов',
          potential: 'medium',
        },
      ]),
      accessPrice: 49,
      subscribers: 125,
    },
    {
      id: 'dn-2',
      scanDate: new Date(Date.now() - 86400000),
      source: 'XSS Forum',
      schemes: JSON.stringify([
        {
          title: 'Обход Flood Wait',
          category: 'technical',
          riskLevel: 'high',
          description: 'Новый метод обхода ограничений Telegram API',
          potential: 'high',
        },
      ]),
      accessPrice: 49,
      subscribers: 89,
    },
  ];
}

async function simulateDarknetParse(forums: string[], keywords: string[]) {
  const schemes = [];
  const templates = [
    {
      title: 'Новый метод прогрева аккаунтов',
      category: 'warming',
      description: 'Ускоренный прогрев за 24 часа без риска бана',
    },
    {
      title: 'Обход Shadow Ban',
      category: 'technical',
      description: 'Метод определения и снятия теневого бана',
    },
    {
      title: 'Авто-регистрация аккаунтов',
      category: 'automation',
      description: 'Скрипт для массовой регистрации через виртуальные номера',
    },
  ];

  for (const template of templates) {
    if (Math.random() > 0.5) {
      schemes.push({
        ...template,
        riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        potential: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        foundAt: new Date().toISOString(),
      });
    }
  }

  return schemes;
}

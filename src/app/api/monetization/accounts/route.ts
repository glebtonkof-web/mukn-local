import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/monetization/accounts - Получить аккаунты для продажи
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'available';
    const platform = searchParams.get('platform');
    const niche = searchParams.get('niche');

    const whereClause: Record<string, unknown> = { status };
    if (platform) whereClause.platform = platform;
    if (niche) whereClause.niche = niche;

    const accounts = await db.accountForSale.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Статистика
    const stats = await db.accountForSale.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const byPlatform = await db.accountForSale.groupBy({
      by: ['platform'],
      _count: { id: true },
      where: { status: 'available' },
    });

    return NextResponse.json({
      success: true,
      accounts,
      stats: {
        byStatus: stats.map((s) => ({ status: s.status, count: s._count.id })),
        byPlatform: byPlatform.map((p) => ({ platform: p.platform, count: p._count.id })),
      },
    });
  } catch (error) {
    console.error('Error fetching accounts for sale:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/accounts - Создать заказ на аккаунт
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      platform,
      niche,
      geo,
      ageDays,
      minFollowers,
      warmingDays,
      quantity,
    } = body;

    // Создаём заказ на прогрев аккаунтов
    const orders = [];
    for (let i = 0; i < (quantity || 1); i++) {
      // Создаём фиктивный аккаунт
      const account = await db.account.create({
        data: {
          platform,
          userId: 'default',
          status: 'warming',
          warmingStartedAt: new Date(),
          warmingEndsAt: new Date(Date.now() + (warmingDays || 3) * 24 * 60 * 60 * 1000),
          warmingProgress: 0,
        },
      });

      // Создаём запись для продажи
      const forSale = await db.accountForSale.create({
        data: {
          accountId: account.id,
          platform,
          niche,
          geo,
          ageDays: ageDays || 0,
          followersCount: minFollowers || 0,
          warmingDays: warmingDays || 3,
          warmingComplete: false,
          warmingProgress: 0,
          costPrice: 1, // $1 себестоимость
          salePrice: 5, // $5 цена продажи
          currency: 'USD',
          status: 'warming',
        },
      });

      orders.push(forSale);
    }

    return NextResponse.json({
      success: true,
      orders,
      message: `Заказано ${orders.length} аккаунтов. Прогрев займёт ${warmingDays || 3} дней.`,
    });
  } catch (error) {
    console.error('Error creating account order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/accounts - Купить аккаунт
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountForSaleId, buyerId } = body;

    const accountForSale = await db.accountForSale.findUnique({
      where: { id: accountForSaleId },
    });

    if (!accountForSale) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    if (accountForSale.status !== 'available') {
      return NextResponse.json(
        { success: false, error: 'Account is not available for purchase' },
        { status: 400 }
      );
    }

    // Обновляем статус
    const sold = await db.accountForSale.update({
      where: { id: accountForSaleId },
      data: {
        status: 'sold',
        buyerId: buyerId || 'default',
        soldAt: new Date(),
      },
    });

    // Передаём аккаунт покупателю
    await db.account.update({
      where: { id: accountForSale.accountId },
      data: {
        userId: buyerId || 'default',
        status: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      account: sold,
      purchased: true,
    });
  } catch (error) {
    console.error('Error purchasing account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to purchase account' },
      { status: 500 }
    );
  }
}

// PATCH /api/monetization/accounts - Обновить прогресс прогрева
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountForSaleId, warmingProgress } = body;

    const updated = await db.accountForSale.update({
      where: { id: accountForSaleId },
      data: {
        warmingProgress,
        warmingComplete: warmingProgress >= 100,
        status: warmingProgress >= 100 ? 'available' : 'warming',
      },
    });

    return NextResponse.json({
      success: true,
      account: updated,
    });
  } catch (error) {
    console.error('Error updating warming progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

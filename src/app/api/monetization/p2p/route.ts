import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/monetization/p2p - Получить доступные аккаунты для аренды
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'available';
    const platform = searchParams.get('platform');
    const ownerId = searchParams.get('ownerId');

    const where: any = { status };
    if (platform) where.platform = platform;
    if (ownerId) where.ownerId = ownerId;

    const rentals = await db.p2PAccountRental.findMany({
      where,
      orderBy: { dailyRate: 'asc' },
      take: 50,
    });

    if (rentals.length === 0) {
      return NextResponse.json({
        success: true,
        rentals: createDemoRentals(),
      });
    }

    return NextResponse.json({ success: true, rentals });
  } catch (error) {
    console.error('Error fetching P2P rentals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rentals' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/p2p - Добавить аккаунт в аренду
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerId, accountId, dailyRate, platform } = body;

    const rental = await db.p2PAccountRental.create({
      data: {
        ownerId,
        accountId,
        dailyRate,
        platformCommission: 0.15,
        status: 'available',
      },
    });

    return NextResponse.json({
      success: true,
      rental,
      message: `Аккаунт добавлен в аренду за $${dailyRate}/день`,
    });
  } catch (error) {
    console.error('Error creating P2P rental:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create rental' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/p2p - Арендовать аккаунт
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { rentalId, renterId, days } = body;

    const rental = await db.p2PAccountRental.findUnique({
      where: { id: rentalId },
    });

    if (!rental || rental.status !== 'available') {
      return NextResponse.json(
        { success: false, error: 'Account not available' },
        { status: 400 }
      );
    }

    const totalCost = rental.dailyRate * days;
    const platformFee = totalCost * rental.platformCommission;

    // Обновляем статус аренды
    const updated = await db.p2PAccountRental.update({
      where: { id: rentalId },
      data: {
        renterId,
        rentedFrom: new Date(),
        rentedUntil: new Date(Date.now() + days * 86400000),
        status: 'rented',
        totalEarned: { increment: totalCost - platformFee },
      },
    });

    return NextResponse.json({
      success: true,
      rental: updated,
      cost: totalCost,
      platformFee,
      message: `Аккаунт арендован на ${days} дней за $${totalCost}`,
    });
  } catch (error) {
    console.error('Error renting account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to rent account' },
      { status: 500 }
    );
  }
}

function createDemoRentals() {
  return [
    {
      id: 'p2p-1',
      ownerId: 'owner-1',
      accountId: 'acc-1',
      platform: 'telegram',
      dailyRate: 5,
      platformCommission: 0.15,
      status: 'available',
      totalEarned: 125,
      specs: {
        age: '2 года',
        followers: 850,
        warmingComplete: true,
      },
    },
    {
      id: 'p2p-2',
      ownerId: 'owner-2',
      accountId: 'acc-2',
      platform: 'telegram',
      dailyRate: 8,
      platformCommission: 0.15,
      status: 'available',
      totalEarned: 340,
      specs: {
        age: '1 год',
        followers: 1200,
        warmingComplete: true,
      },
    },
    {
      id: 'p2p-3',
      ownerId: 'owner-1',
      accountId: 'acc-3',
      platform: 'instagram',
      dailyRate: 12,
      platformCommission: 0.15,
      status: 'available',
      totalEarned: 89,
      specs: {
        age: '3 года',
        followers: 2500,
        warmingComplete: true,
      },
    },
  ];
}

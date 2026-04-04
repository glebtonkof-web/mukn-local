import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/monetization/username-auction - Получить активные аукционы
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const platform = searchParams.get('platform');

    const where: any = { status };
    if (platform) where.platform = platform;

    const auctions = await db.usernameAuction.findMany({
      where,
      include: {
        UsernameBid: {
          orderBy: { amount: 'desc' },
          take: 5,
        },
      },
      orderBy: { endsAt: 'asc' },
      take: 20,
    });

    if (auctions.length === 0) {
      return NextResponse.json({
        success: true,
        auctions: createDemoAuctions(),
      });
    }

    return NextResponse.json({ success: true, auctions });
  } catch (error) {
    console.error('Error fetching username auctions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch auctions' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/username-auction - Создать аукцион
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, platform, startingPrice, durationDays = 7 } = body;

    // Проверяем существование
    const existing = await db.usernameAuction.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Auction already exists' },
        { status: 400 }
      );
    }

    const auction = await db.usernameAuction.create({
      data: {
        id: nanoid(),
        username,
        platform,
        startingPrice,
        currentBid: startingPrice,
        endsAt: new Date(Date.now() + durationDays * 86400000),
        status: 'active',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      auction,
      message: `Аукцион для @${username} создан`,
    });
  } catch (error) {
    console.error('Error creating auction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create auction' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/username-auction - Сделать ставку
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { auctionId, bidderId, amount } = body;

    const auction = await db.usernameAuction.findUnique({
      where: { id: auctionId },
    });

    if (!auction || auction.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Auction not active' },
        { status: 400 }
      );
    }

    if (amount <= auction.currentBid) {
      return NextResponse.json(
        { success: false, error: 'Bid must be higher than current' },
        { status: 400 }
      );
    }

    if (new Date() > auction.endsAt) {
      return NextResponse.json(
        { success: false, error: 'Auction ended' },
        { status: 400 }
      );
    }

    // Создаём ставку
    const bid = await db.usernameBid.create({
      data: {
        id: nanoid(),
        auctionId,
        bidderId,
        amount,
      },
    });

    // Обновляем аукцион
    await db.usernameAuction.update({
      where: { id: auctionId },
      data: {
        currentBid: amount,
        currentBidderId: bidderId,
      },
    });

    return NextResponse.json({
      success: true,
      bid,
      message: `Ставка $${amount} принята`,
    });
  } catch (error) {
    console.error('Error placing bid:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to place bid' },
      { status: 500 }
    );
  }
}

function createDemoAuctions() {
  return [
    {
      id: 'auction-1',
      username: 'cryptosignal',
      platform: 'telegram',
      startingPrice: 500,
      currentBid: 1250,
      currentBidderId: 'bidder-1',
      endsAt: new Date(Date.now() + 3 * 86400000),
      status: 'active',
      bids: [
        { amount: 1250, bidderId: 'bidder-1' },
        { amount: 1000, bidderId: 'bidder-2' },
        { amount: 750, bidderId: 'bidder-3' },
      ],
    },
    {
      id: 'auction-2',
      username: 'gambling_pro',
      platform: 'telegram',
      startingPrice: 300,
      currentBid: 850,
      currentBidderId: 'bidder-2',
      endsAt: new Date(Date.now() + 5 * 86400000),
      status: 'active',
      bids: [
        { amount: 850, bidderId: 'bidder-2' },
        { amount: 600, bidderId: 'bidder-1' },
      ],
    },
    {
      id: 'auction-3',
      username: 'trading_tips',
      platform: 'telegram',
      startingPrice: 200,
      currentBid: 450,
      currentBidderId: 'bidder-3',
      endsAt: new Date(Date.now() + 1 * 86400000),
      status: 'active',
      bids: [
        { amount: 450, bidderId: 'bidder-3' },
        { amount: 350, bidderId: 'bidder-1' },
      ],
    },
  ];
}

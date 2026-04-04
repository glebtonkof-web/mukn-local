import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/monetization/token - Информация о токене MUKN
export async function GET(request: NextRequest) {
  try {
    let token = await db.platformToken.findFirst();

    if (!token) {
      // Создаём токен если не существует
      token = await db.platformToken.create({
        data: {
          symbol: 'MUKN',
          name: 'MUKN Token',
          totalSupply: 1000000,
          circulatingSupply: 250000,
          currentPrice: 0.10,
          priceChange24h: 5.2,
          discountPercent: 10,
          stakingAPY: 15,
        },
      });
    }

    // Получаем последние транзакции
    const transactions = await db.tokenTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      token: {
        ...token,
        marketCap: token.currentPrice * token.circulatingSupply,
        volume24h: 15000 + Math.random() * 5000,
        holders: 1250 + Math.floor(Math.random() * 100),
      },
      transactions,
      benefits: [
        { name: 'Скидка на подписку', value: `${token.discountPercent}%` },
        { name: 'Staking APY', value: `${token.stakingAPY}%` },
        { name: 'Доступ к премиум функциям', value: 'Holder Only' },
        { name: 'Голосование за развитие', value: 'DAO' },
        { name: 'Реферальные бонусы', value: 'x2' },
      ],
    });
  } catch (error) {
    console.error('Error fetching token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch token info' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/token - Купить токены
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, type = 'buy' } = body;

    const token = await db.platformToken.findFirst();
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      );
    }

    const cost = amount * token.currentPrice;

    // Создаём транзакцию
    const transaction = await db.tokenTransaction.create({
      data: {
        userId,
        type,
        amount,
        price: token.currentPrice,
      },
    });

    // Обновляем circulating supply
    if (type === 'buy') {
      await db.platformToken.update({
        where: { id: token.id },
        data: {
          circulatingSupply: { increment: amount },
        },
      });
    }

    return NextResponse.json({
      success: true,
      transaction,
      cost,
      message: `Успешно ${type === 'buy' ? 'куплено' : 'продано'} ${amount} MUKN`,
    });
  } catch (error) {
    console.error('Error processing token transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process transaction' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/token - Staking
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, action } = body;

    if (action === 'stake') {
      const token = await db.platformToken.findFirst();
      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Token not found' },
          { status: 404 }
        );
      }

      const transaction = await db.tokenTransaction.create({
        data: {
          userId,
          type: 'stake',
          amount,
          price: token.currentPrice,
        },
      });

      return NextResponse.json({
        success: true,
        transaction,
        dailyReward: (amount * token.stakingAPY) / 365 / 100,
        message: `${amount} MUKN отправлено в стейкинг`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error staking tokens:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stake tokens' },
      { status: 500 }
    );
  }
}

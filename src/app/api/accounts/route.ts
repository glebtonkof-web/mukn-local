import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry, createCircuitBreaker } from '@/lib/resilience';
import { logger } from '@/lib/logger';

const dbCircuitBreaker = createCircuitBreaker('database', { circuitBreakerThreshold: 3 });

// GET /api/accounts - Получить все аккаунты
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (platform) where.platform = platform;

    const accounts = await dbCircuitBreaker.execute(() =>
      db.account.findMany({
        where,
        include: {
          simCard: true,
          influencers: true,
          riskHistory: {
            orderBy: { date: 'desc' },
            take: 7,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })
    );

    const total = await db.account.count({ where });

    logger.debug('Accounts fetched', { count: accounts.length, filters: { status, platform } });

    return NextResponse.json({
      accounts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + accounts.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch accounts', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// POST /api/accounts - Создать новый аккаунт
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Валидация
    if (!body.platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    const account = await withRetry(() =>
      db.account.create({
        data: {
          platform: body.platform,
          username: body.username,
          phone: body.phone,
          email: body.email,
          password: body.password, // Должен быть зашифрован
          sessionData: body.sessionData,
          apiId: body.apiId,
          apiHash: body.apiHash,
          proxyType: body.proxyType,
          proxyHost: body.proxyHost,
          proxyPort: body.proxyPort,
          proxyUsername: body.proxyUsername,
          proxyPassword: body.proxyPassword,
          browserProfileId: body.browserProfileId,
          status: 'pending',
          userId: body.userId || 'default-user',
          simCardId: body.simCardId,
          maxComments: body.maxComments || 50,
          maxDm: body.maxDm || 20,
          maxFollows: body.maxFollows || 100,
        },
      })
    );

    logger.info('Account created', { accountId: account.id, platform: account.platform });

    // Создаём запись в истории риска
    await db.accountRiskHistory.create({
      data: {
        accountId: account.id,
        date: new Date(),
        riskScore: 0,
        riskFactors: JSON.stringify({ initial: true }),
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create account', error as Error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

// PUT /api/accounts - Обновить аккаунт
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const account = await db.account.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    logger.info('Account updated', { accountId: id });

    return NextResponse.json({ account });
  } catch (error) {
    logger.error('Failed to update account', error as Error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

// DELETE /api/accounts - Удалить аккаунт
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    await db.account.delete({
      where: { id },
    });

    logger.info('Account deleted', { accountId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete account', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

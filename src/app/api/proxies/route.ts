import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { withRetry, createCircuitBreaker } from '@/lib/resilience';
import { logger } from '@/lib/logger';

const dbCircuitBreaker = createCircuitBreaker('database', { circuitBreakerThreshold: 3 });

// GET /api/proxies - Получить все прокси
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const proxies = await dbCircuitBreaker.execute(() =>
      db.proxy.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    );

    const total = await db.proxy.count({ where });

    logger.debug('Proxies fetched', { count: proxies.length });

    return NextResponse.json({
      proxies,
      pagination: {
        total,
        limit,
        hasMore: proxies.length === limit,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch proxies', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch proxies' },
      { status: 500 }
    );
  }
}

// POST /api/proxies - Создать новый прокси
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Валидация
    if (!body.host || !body.port) {
      return NextResponse.json(
        { error: 'Host and port are required' },
        { status: 400 }
      );
    }

    // Проверяем, не существует ли уже такой прокси
    const existing = await db.proxy.findFirst({
      where: {
        host: body.host,
        port: body.port,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Proxy with this host:port already exists' },
        { status: 409 }
      );
    }

    const proxy = await withRetry(() =>
      db.proxy.create({
        data: {
          id: nanoid(),
          type: body.type || 'socks5',
          host: body.host,
          port: body.port,
          username: body.username,
          password: body.password,
          country: body.country,
          city: body.city,
          status: 'active',
          provider: body.provider,
          price: body.price,
          expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
          notes: body.notes,
          userId: body.userId || 'default-user',
          updatedAt: new Date(),
        },
      })
    );

    logger.info('Proxy created', { proxyId: proxy.id, host: proxy.host });

    return NextResponse.json({ proxy }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create proxy', error as Error);
    return NextResponse.json(
      { error: 'Failed to create proxy' },
      { status: 500 }
    );
  }
}

// PUT /api/proxies - Обновить прокси
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Proxy ID is required' },
        { status: 400 }
      );
    }

    const proxy = await db.proxy.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    logger.info('Proxy updated', { proxyId: id });

    return NextResponse.json({ proxy });
  } catch (error) {
    logger.error('Failed to update proxy', error as Error);
    return NextResponse.json(
      { error: 'Failed to update proxy' },
      { status: 500 }
    );
  }
}

// DELETE /api/proxies - Удалить прокси
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Proxy ID is required' },
        { status: 400 }
      );
    }

    await db.proxy.delete({
      where: { id },
    });

    logger.info('Proxy deleted', { proxyId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete proxy', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete proxy' },
      { status: 500 }
    );
  }
}

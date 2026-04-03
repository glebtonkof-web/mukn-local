import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry } from '@/lib/resilience';
import { logger } from '@/lib/logger';

// GET /api/sim-cards - Получить все SIM-карты
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, string> = {};
    if (status) where.status = status;

    const simCards = await db.simCard.findMany({
      where,
      include: {
        accounts: true,
        influencers: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Статистика
    const stats = {
      total: await db.simCard.count(),
      available: await db.simCard.count({ where: { status: 'available' } }),
      inUse: await db.simCard.count({ where: { status: 'in_use' } }),
      blocked: await db.simCard.count({ where: { status: 'blocked' } }),
    };

    return NextResponse.json({
      simCards,
      stats,
    });
  } catch (error) {
    logger.error('Failed to fetch SIM cards', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch SIM cards' },
      { status: 500 }
    );
  }
}

// POST /api/sim-cards - Добавить SIM-карту
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Проверяем, не существует ли уже такой номер
    const existing = await db.simCard.findUnique({
      where: { phoneNumber: body.phoneNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'SIM card with this phone number already exists' },
        { status: 409 }
      );
    }

    const simCard = await withRetry(() =>
      db.simCard.create({
        data: {
          phoneNumber: body.phoneNumber,
          operator: body.operator,
          country: body.country || 'RU',
          status: 'available',
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
          purchasePrice: body.purchasePrice,
          notes: body.notes,
          userId: body.userId || 'default-user',
        },
      })
    );

    logger.info('SIM card added', { simCardId: simCard.id, phone: simCard.phoneNumber });

    return NextResponse.json({ simCard }, { status: 201 });
  } catch (error) {
    logger.error('Failed to add SIM card', error as Error);
    return NextResponse.json(
      { error: 'Failed to add SIM card' },
      { status: 500 }
    );
  }
}

// PUT /api/sim-cards - Обновить SIM-карту
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'SIM card ID is required' },
        { status: 400 }
      );
    }

    const simCard = await db.simCard.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    logger.info('SIM card updated', { simCardId: id });

    return NextResponse.json({ simCard });
  } catch (error) {
    logger.error('Failed to update SIM card', error as Error);
    return NextResponse.json(
      { error: 'Failed to update SIM card' },
      { status: 500 }
    );
  }
}

// DELETE /api/sim-cards - Удалить SIM-карту
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'SIM card ID is required' },
        { status: 400 }
      );
    }

    await db.simCard.delete({
      where: { id },
    });

    logger.info('SIM card deleted', { simCardId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete SIM card', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete SIM card' },
      { status: 500 }
    );
  }
}

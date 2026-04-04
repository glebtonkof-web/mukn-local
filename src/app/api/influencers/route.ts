import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry } from '@/lib/resilience';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

// Гарантируем существование пользователя по умолчанию
async function ensureDefaultUser() {
  const existingUser = await db.user.findUnique({
    where: { id: 'default-user' },
  });

  if (!existingUser) {
    await db.user.create({
      data: {
        id: 'default-user',
        email: 'admin@mukn.traffic',
        name: 'Администратор',
        role: 'admin',
        updatedAt: new Date(),
      },
    });
    logger.info('Default user created');
  }
}

// GET /api/influencers - Получить всех инфлюенсеров
export async function GET(request: NextRequest) {
  try {
    await ensureDefaultUser();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const niche = searchParams.get('niche');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (niche) where.niche = niche;

    const [influencers, total] = await Promise.all([
      db.influencer.findMany({
        where,
        include: {
          Account: {
            select: {
              id: true,
              platform: true,
              username: true,
              phone: true,
              status: true,
              banRisk: true,
            },
          },
          SimCard: {
            select: {
              id: true,
              phoneNumber: true,
              operator: true,
              status: true,
            },
          },
          _count: {
            select: {
              Post: true,
              Comment: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.influencer.count({ where }),
    ]);

    logger.debug('Influencers fetched', { count: influencers.length, filters: { status, niche } });

    return NextResponse.json({
      influencers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + influencers.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch influencers', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch influencers' },
      { status: 500 }
    );
  }
}

// POST /api/influencers - Создать нового инфлюенсера
export async function POST(request: NextRequest) {
  try {
    await ensureDefaultUser();

    const body = await request.json();

    // Валидация обязательных полей
    const requiredFields = ['name', 'age', 'gender', 'niche', 'role', 'style'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Валидация возраста
    if (body.age < 18 || body.age > 80) {
      return NextResponse.json(
        { error: 'Age must be between 18 and 80' },
        { status: 400 }
      );
    }

    const influencer = await withRetry(() =>
      db.influencer.create({
        data: {
          id: nanoid(),
          name: body.name,
          age: body.age,
          gender: body.gender,
          niche: body.niche,
          role: body.role,
          style: body.style,
          country: body.country || 'RU',
          language: body.language || 'ru',
          avatarUrl: body.avatarUrl,
          status: 'draft',
          userId: 'default-user',
          telegramUsername: body.telegramUsername,
          telegramChannel: body.telegramChannel,
          instagramUsername: body.instagramUsername,
          tiktokUsername: body.tiktokUsername,
          youtubeChannelId: body.youtubeChannelId,
          updatedAt: new Date(),
        },
      })
    );

    logger.info('Influencer created', { 
      influencerId: influencer.id, 
      name: influencer.name,
      niche: influencer.niche 
    });

    // Создаём запись в аналитике
    await db.influencerAnalytics.create({
      data: {
        id: nanoid(),
        influencerId: influencer.id,
        date: new Date(),
        followers: 0,
        following: 0,
        posts: 0,
        engagement: 0,
        commentsMade: 0,
        dmSent: 0,
        likesGiven: 0,
        followsMade: 0,
        leads: 0,
        revenue: 0,
      },
    });

    return NextResponse.json({ influencer }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create influencer', error as Error);
    return NextResponse.json(
      { error: 'Failed to create influencer' },
      { status: 500 }
    );
  }
}

// PUT /api/influencers - Обновить инфлюенсера
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Influencer ID is required' },
        { status: 400 }
      );
    }

    const influencer = await db.influencer.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    logger.info('Influencer updated', { influencerId: id });

    return NextResponse.json({ influencer });
  } catch (error) {
    logger.error('Failed to update influencer', error as Error);
    return NextResponse.json(
      { error: 'Failed to update influencer' },
      { status: 500 }
    );
  }
}

// DELETE /api/influencers - Удалить инфлюенсера
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Influencer ID is required' },
        { status: 400 }
      );
    }

    // Удаляем связанные записи
    await db.influencerAnalytics.deleteMany({
      where: { influencerId: id },
    });
    await db.contentQueue.deleteMany({
      where: { influencerId: id },
    });

    await db.influencer.delete({
      where: { id },
    });

    logger.info('Influencer deleted', { influencerId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete influencer', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete influencer' },
      { status: 500 }
    );
  }
}

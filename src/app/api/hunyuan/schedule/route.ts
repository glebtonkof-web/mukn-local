import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/hunyuan/schedule - Получение расписания публикаций
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const upcoming = searchParams.get('upcoming') === 'true';

    const where: any = {};
    if (status) where.status = status;
    if (upcoming) {
      where.scheduledAt = { gte: new Date() };
    }

    const schedule = await db.publicationSchedule.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('[API Hunyuan Schedule] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/hunyuan/schedule - Создание расписания публикации
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const schedule = await db.publicationSchedule.create({
      data: {
        contentId: body.contentId,
        platforms: JSON.stringify(body.platforms),
        scheduledAt: new Date(body.scheduledAt),
        status: 'pending',
        isRecurring: body.isRecurring || false,
        recurrenceRule: body.recurrenceRule,
        priority: body.priority || 5,
        campaignId: body.campaignId,
        influencerId: body.influencerId,
      },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('[API Hunyuan Schedule] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/hunyuan/schedule - Обновление расписания
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    const updateData: any = {};
    if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);
    if (data.platforms) updateData.platforms = JSON.stringify(data.platforms);
    if (data.status) updateData.status = data.status;
    if (data.priority) updateData.priority = data.priority;

    const schedule = await db.publicationSchedule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('[API Hunyuan Schedule] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/hunyuan/schedule - Отмена публикации
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 });
    }

    await db.publicationSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Hunyuan Schedule] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

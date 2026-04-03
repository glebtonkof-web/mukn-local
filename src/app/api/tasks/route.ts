import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry } from '@/lib/resilience';
import { logger } from '@/lib/logger';

// GET /api/tasks - Получить задачи из очереди
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = { status };
    if (type) where.type = type;

    const tasks = await db.contentQueue.findMany({
      where,
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            niche: true,
          },
        },
        offer: {
          select: {
            id: true,
            name: true,
            payout: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledAt: 'asc' },
      ],
      take: limit,
    });

    // Статистика очереди
    const stats = {
      pending: await db.contentQueue.count({ where: { status: 'pending' } }),
      executing: await db.contentQueue.count({ where: { status: 'executing' } }),
      completed: await db.contentQueue.count({ where: { status: 'completed' } }),
      failed: await db.contentQueue.count({ where: { status: 'failed' } }),
      total: await db.contentQueue.count(),
    };

    return NextResponse.json({ tasks, stats });
  } catch (error) {
    logger.error('Failed to fetch tasks', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Создать задачу
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.type || !body.influencerId) {
      return NextResponse.json(
        { error: 'Type and influencerId are required' },
        { status: 400 }
      );
    }

    const task = await withRetry(() =>
      db.contentQueue.create({
        data: {
          type: body.type,
          priority: body.priority || 5,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
          influencerId: body.influencerId,
          offerId: body.offerId,
          status: 'pending',
        },
      })
    );

    logger.info('Task created', { taskId: task.id, type: task.type });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create task', error as Error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks - Обновить статус задачи
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, error } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Task ID and status are required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };
    
    if (status === 'completed') {
      updateData.executedAt = new Date();
    }
    
    if (error) {
      updateData.error = error;
    }

    const task = await db.contentQueue.update({
      where: { id },
      data: updateData,
    });

    logger.info('Task updated', { taskId: id, status });

    return NextResponse.json({ task });
  } catch (error) {
    logger.error('Failed to update task', error as Error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks - Удалить задачу
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    await db.contentQueue.delete({
      where: { id },
    });

    logger.info('Task deleted', { taskId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete task', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}

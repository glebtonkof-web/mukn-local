/**
 * API для управления очередью задач
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTaskQueue } from '@/lib/task-queue';

/**
 * GET - Получить статистику или список задач
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    const queue = getTaskQueue();

    switch (action) {
      case 'stats':
        const stats = await queue.getStats();
        return NextResponse.json({
          success: true,
          stats
        });

      default:
        const taskStats = await queue.getStats();
        return NextResponse.json({
          success: true,
          stats: taskStats
        });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST - Добавить задачу
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, payload, priority, scheduledAt } = body;

    if (!type) {
      return NextResponse.json({
        success: false,
        error: 'type is required'
      }, { status: 400 });
    }

    const queue = getTaskQueue();
    const task = await queue.add(type, payload || {}, {
      priority: priority || 'normal',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
    });

    return NextResponse.json({
      success: true,
      task
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE - Отменить задачу
 */
export async function DELETE(request: NextRequest) {
  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'taskId is required'
      }, { status: 400 });
    }

    const queue = getTaskQueue();
    const cancelled = await queue.cancel(taskId);

    return NextResponse.json({
      success: cancelled,
      message: cancelled ? 'Задача отменена' : 'Задача не найдена или уже выполняется'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

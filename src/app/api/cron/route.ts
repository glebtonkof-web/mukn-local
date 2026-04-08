/**
 * API для управления Cron задачами
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCronScheduler } from '@/lib/cron-scheduler';

/**
 * GET - Получить все cron задачи
 */
export async function GET(request: NextRequest) {
  try {
    const scheduler = getCronScheduler();
    const jobs = await scheduler.getJobs();

    return NextResponse.json({
      success: true,
      jobs: jobs.map(job => ({
        ...job,
        nextRunAt: job.nextRunAt?.toISOString(),
        lastRunAt: job.lastRunAt?.toISOString()
      }))
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST - Добавить или обновить cron задачу
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, schedule, taskType, taskPayload, enabled, action } = body;

    const scheduler = getCronScheduler();

    if (action === 'update' && name) {
      const job = await scheduler.updateJob(name, {
        schedule,
        taskType,
        taskPayload,
        enabled
      });
      return NextResponse.json({
        success: true,
        job
      });
    }

    if (!name || !schedule || !taskType) {
      return NextResponse.json({
        success: false,
        error: 'name, schedule, and taskType are required'
      }, { status: 400 });
    }

    const job = await scheduler.addJob({
      name,
      schedule,
      taskType,
      taskPayload,
      enabled: enabled ?? true
    });

    return NextResponse.json({
      success: true,
      job
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE - Удалить cron задачу
 */
export async function DELETE(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'name is required'
      }, { status: 400 });
    }

    const scheduler = getCronScheduler();
    await scheduler.removeJob(name);

    return NextResponse.json({
      success: true,
      message: `Задача ${name} удалена`
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

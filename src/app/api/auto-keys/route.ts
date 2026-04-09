/**
 * Auto Keys API
 *
 * API для управления автоматическим получением API ключей
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAutoKeyAcquisitionService, PROVIDER_AUTOMATION_CONFIGS } from '@/lib/provider-bypass/auto-key-acquisition';
import { ProviderType } from '@/lib/provider-bypass/provider-limit-registry';

const service = getAutoKeyAcquisitionService();

/**
 * GET /api/auto-keys
 * Получить статистику и список провайдеров
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const taskId = searchParams.get('taskId');

    // Получить статус конкретной задачи
    if (action === 'status' && taskId) {
      const task = await service.getTaskStatus(taskId);
      return NextResponse.json({
        success: true,
        task,
      });
    }

    // Получить список провайдеров
    if (action === 'providers') {
      const providers = Object.entries(PROVIDER_AUTOMATION_CONFIGS).map(([key, config]) => ({
        id: key,
        name: config.name,
        category: config.category,
        freeDailyQuota: config.freeDailyQuota,
        freeMonthlyQuota: config.freeMonthlyQuota,
        requires: {
          email: config.requiresEmail,
          phone: config.requiresPhone,
          card: config.requiresCard,
          captcha: config.requiresCaptcha,
        },
      }));

      return NextResponse.json({
        success: true,
        providers,
      });
    }

    // По умолчанию - статистика
    const stats = await service.getStats();

    return NextResponse.json({
      success: true,
      stats,
      availableProviders: Object.keys(PROVIDER_AUTOMATION_CONFIGS),
    });

  } catch (error) {
    console.error('[AutoKeys] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/auto-keys
 * Создать задачу на получение ключа
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, provider, providers, count, proxy } = body;

    // Массовое создание задач
    if (action === 'batch') {
      const results = await service.createBatchTasks({
        providers: providers as ProviderType[],
        count: count || 1,
      });

      return NextResponse.json({
        success: true,
        created: results.length,
        tasks: results,
        message: `Created ${results.length} acquisition tasks`,
      });
    }

    // Создание одной задачи
    if (!provider) {
      return NextResponse.json({
        success: false,
        error: 'Required: provider',
      }, { status: 400 });
    }

    const result = await service.createAcquisitionTask({
      provider: provider as ProviderType,
      proxy,
    });

    return NextResponse.json({
      success: true,
      taskId: result.taskId,
      status: result.status,
      message: `Acquisition task created for ${provider}`,
    });

  } catch (error) {
    console.error('[AutoKeys] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/auto-keys
 * Принудительно запустить обработку очереди
 */
export async function PUT(request: NextRequest) {
  try {
    await service.forceProcess();

    return NextResponse.json({
      success: true,
      message: 'Queue processing triggered',
    });

  } catch (error) {
    console.error('[AutoKeys] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

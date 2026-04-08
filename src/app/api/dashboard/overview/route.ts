/**
 * Dashboard API - Обзор системы
 */

import { NextResponse } from 'next/server';
import { getSystemMetrics } from '@/lib/system-metrics';
import { getDeadLetterQueue } from '@/lib/dead-letter-queue';
import { getCheckpointService } from '@/lib/checkpoint-service';
import { getStickySessions } from '@/lib/sticky-sessions';
import { getTaskQueue } from '@/lib/task-queue';
import { getProxyManager } from '@/lib/sim-auto/proxy-manager';

export async function GET() {
  try {
    const metrics = getSystemMetrics();
    const dlq = getDeadLetterQueue();
    const checkpoints = getCheckpointService();
    const sticky = getStickySessions();
    const taskQueue = getTaskQueue();

    // Собираем все данные параллельно
    const [
      overview,
      dlqStats,
      checkpointStats,
      stickyStats,
      taskStats,
      topErrors
    ] = await Promise.all([
      metrics.getOverview(),
      dlq.getStats(),
      checkpoints.getStats(),
      sticky.getStats(),
      taskQueue.getStats(),
      dlq.getTopErrors(5)
    ]);

    // Получаем статус прокси
    let proxyStatus = { working: 0, total: 0 };
    try {
      proxyStatus = getProxyManager().getStats();
    } catch {
      // ProxyManager может быть не инициализирован
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      overview,
      details: {
        dlq: dlqStats,
        checkpoints: checkpointStats,
        stickySessions: stickyStats,
        tasks: taskStats,
        proxies: proxyStatus
      },
      alerts: {
        topErrors,
        warnings: generateWarnings(overview, dlqStats)
      }
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

function generateWarnings(overview: any, dlqStats: any): string[] {
  const warnings: string[] = [];

  if (overview.accounts.banned > 0) {
    warnings.push(`Забанено аккаунтов: ${overview.accounts.banned}`);
  }

  if (overview.proxies.working < 5) {
    warnings.push(`Мало рабочих прокси: ${overview.proxies.working}`);
  }

  if (dlqStats.unresolved > 10) {
    warnings.push(`Много неразрешённых ошибок в DLQ: ${dlqStats.unresolved}`);
  }

  if (dlqStats.recentErrors > 5) {
    warnings.push(`Много ошибок за 24 часа: ${dlqStats.recentErrors}`);
  }

  if (overview.checkpoints.inProgress > 20) {
    warnings.push(`Много активных чекпоинтов: ${overview.checkpoints.inProgress}`);
  }

  return warnings;
}

/**
 * Detailed Health Check API
 * 
 * Полная диагностика всех компонентов системы для автономной работы 24/365
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'error' | 'unknown';
  message: string;
  latency?: number;
  details?: Record<string, any>;
  lastCheck: string;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  version: string;
  timestamp: string;
  checks: HealthCheck[];
  metrics: {
    memory: { used: number; total: number; percentage: number };
    cpu: number;
    disk?: { percentage: number; used: string; total: string };
  };
  recommendations: string[];
}

// Время запуска сервера
const SERVER_START_TIME = Date.now();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];
  const recommendations: string[] = [];

  try {
    // Run all checks in parallel for speed
    const [
      dbCheck,
      queueCheck,
      cronCheck,
      proxyCheck,
      dlqCheck,
      checkpointCheck,
      stickyCheck,
      captchaCheck,
      emailCheck,
      tempEmailCheck,
      adbCheck,
      diskCheck
    ] = await Promise.all([
      checkDatabase(),
      checkTaskQueue(),
      checkCronScheduler(),
      checkProxyManager(),
      checkDLQ(),
      checkCheckpoints(),
      checkStickySessions(),
      checkCaptchaSolver(),
      checkEmailService(),
      checkTempEmail(),
      checkADB(),
      checkDiskSpace()
    ]);

    checks.push(
      dbCheck, queueCheck, cronCheck, proxyCheck,
      dlqCheck, checkpointCheck, stickyCheck, captchaCheck,
      emailCheck, tempEmailCheck, adbCheck, diskCheck
    );

    // Calculate overall status
    const errorCount = checks.filter(c => c.status === 'error').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;

    let overall: 'healthy' | 'degraded' | 'critical';
    if (errorCount >= 3) {
      overall = 'critical';
    } else if (errorCount >= 1 || warningCount >= 3) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    // Generate recommendations
    if (errorCount > 0) {
      recommendations.push(`Критические проблемы: ${errorCount} компонентов требуют внимания`);
    }
    if (warningCount > 0) {
      recommendations.push(`Предупреждения: ${warningCount} компонентов имеют предупреждения`);
    }

    const failedChecks = checks.filter(c => c.status === 'error');
    for (const check of failedChecks) {
      recommendations.push(`Исправить ${check.name}: ${check.message}`);
    }

    // Memory metrics
    const memUsage = process.memoryUsage();
    const memTotal = memUsage.heapTotal;
    const memUsed = memUsage.heapUsed;

    const health: SystemHealth = {
      overall,
      uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      checks,
      metrics: {
        memory: {
          used: Math.round(memUsed / 1024 / 1024),
          total: Math.round(memTotal / 1024 / 1024),
          percentage: Math.round((memUsed / memTotal) * 100)
        },
        cpu: 0,
        disk: diskCheck.details as any
      },
      recommendations
    };

    const statusCode = overall === 'healthy' ? 200 : overall === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });

  } catch (error: any) {
    return NextResponse.json({
      overall: 'critical',
      uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
      timestamp: new Date().toISOString(),
      error: error.message,
      checks,
      recommendations: ['Система требует перезапуска']
    }, { status: 503 });
  }
}

// Individual check functions

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table'
    ` as any[];

    return {
      name: 'Database',
      status: latency < 100 ? 'ok' : 'warning',
      message: `Подключена (${tables.length} таблиц)`,
      latency,
      details: { tables: tables.length },
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      name: 'Database',
      status: 'error',
      message: `Ошибка: ${error.message}`,
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkTaskQueue(): Promise<HealthCheck> {
  try {
    const { getTaskQueue } = await import('@/lib/task-queue');
    const queue = getTaskQueue();
    const stats = queue.getStats();

    const pendingTooHigh = stats.pending > 100;
    const failedTooHigh = stats.failed > 10;

    let status: 'ok' | 'warning' | 'error' = 'ok';
    if (failedTooHigh) status = 'error';
    else if (pendingTooHigh) status = 'warning';

    return {
      name: 'Task Queue',
      status,
      message: `Ожидают: ${stats.pending}, Выполняются: ${stats.running}, Ошибок: ${stats.failed}`,
      details: stats,
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      name: 'Task Queue',
      status: 'error',
      message: `Не инициализирована: ${error.message}`,
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkCronScheduler(): Promise<HealthCheck> {
  try {
    const { getCronScheduler } = await import('@/lib/cron-scheduler');
    const scheduler = getCronScheduler();
    const jobs = scheduler.getJobs();

    const runningCount = jobs.filter((j: any) => j.running).length;

    return {
      name: 'Cron Scheduler',
      status: runningCount > 0 ? 'ok' : 'warning',
      message: `${jobs.length} задач, ${runningCount} активных`,
      details: { totalJobs: jobs.length, runningJobs: runningCount },
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      name: 'Cron Scheduler',
      status: 'error',
      message: `Не инициализирован: ${error.message}`,
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkProxyManager(): Promise<HealthCheck> {
  try {
    const { getProxyManager } = await import('@/lib/sim-auto/proxy-manager');
    const manager = getProxyManager();
    const stats = manager.getStats();

    const status = stats.workingProxies >= 5 ? 'ok' : 
                   stats.workingProxies > 0 ? 'warning' : 'error';

    return {
      name: 'Proxy Manager',
      status,
      message: `Рабочих прокси: ${stats.workingProxies}/${stats.totalProxies}`,
      details: stats,
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      name: 'Proxy Manager',
      status: 'warning',
      message: 'Не инициализирован (ленивая загрузка)',
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkDLQ(): Promise<HealthCheck> {
  try {
    const { getDeadLetterQueue } = await import('@/lib/dead-letter-queue');
    const dlq = getDeadLetterQueue();
    const stats = await dlq.getStats();

    const status = stats.unresolved === 0 ? 'ok' :
                   stats.unresolved < 10 ? 'warning' : 'error';

    return {
      name: 'Dead Letter Queue',
      status,
      message: `Необработанных: ${stats.unresolved}, Всего: ${stats.total}`,
      details: stats,
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      name: 'Dead Letter Queue',
      status: 'warning',
      message: 'Сервис недоступен',
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkCheckpoints(): Promise<HealthCheck> {
  try {
    const { getCheckpointService } = await import('@/lib/checkpoint-service');
    const service = getCheckpointService();
    const stats = await service.getStats();

    const status = stats.inProgress < 50 ? 'ok' : 'warning';

    return {
      name: 'Checkpoints',
      status,
      message: `В процессе: ${stats.inProgress}, Завершено: ${stats.completed}`,
      details: stats,
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      name: 'Checkpoints',
      status: 'warning',
      message: 'Сервис недоступен',
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkStickySessions(): Promise<HealthCheck> {
  try {
    const { getStickySessions } = await import('@/lib/sticky-sessions');
    const sticky = getStickySessions();
    const stats = await sticky.getStats();

    const status = stats.active > 0 ? 'ok' : 'warning';

    return {
      name: 'Sticky Sessions',
      status,
      message: `Активных: ${stats.active}, Всего: ${stats.total}`,
      details: stats,
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      name: 'Sticky Sessions',
      status: 'warning',
      message: 'Сервис недоступен',
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkCaptchaSolver(): Promise<HealthCheck> {
  const apiKey = process.env.CAPTCHA_API_KEY;
  const provider = process.env.CAPTCHA_PROVIDER || '2captcha';

  if (!apiKey) {
    return {
      name: 'Captcha Solver',
      status: 'warning',
      message: 'Не настроен (CAPTCHA_API_KEY отсутствует)',
      details: { provider: 'none' },
      lastCheck: new Date().toISOString()
    };
  }

  return {
    name: 'Captcha Solver',
    status: 'ok',
    message: `Провайдер: ${provider}`,
    details: { provider, configured: true },
    lastCheck: new Date().toISOString()
  };
}

async function checkEmailService(): Promise<HealthCheck> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;

  if (!smtpHost) {
    return {
      name: 'Email Service',
      status: 'warning',
      message: 'SMTP не настроен',
      lastCheck: new Date().toISOString()
    };
  }

  return {
    name: 'Email Service',
    status: 'ok',
    message: `SMTP: ${smtpHost}`,
    details: { host: smtpHost, user: smtpUser ? 'configured' : 'missing' },
    lastCheck: new Date().toISOString()
  };
}

async function checkTempEmail(): Promise<HealthCheck> {
  try {
    const { getTempEmailService } = await import('@/lib/temp-email-service');
    const service = getTempEmailService();
    const stats = await service.getStats();

    return {
      name: 'Temp Email Service',
      status: stats.available > 0 ? 'ok' : 'warning',
      message: `Доступно: ${stats.available} адресов`,
      details: stats,
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      name: 'Temp Email Service',
      status: 'warning',
      message: 'Сервис недоступен',
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkADB(): Promise<HealthCheck> {
  try {
    const { execSync } = require('child_process');
    
    try {
      execSync('adb version', { timeout: 5000 });
    } catch {
      return {
        name: 'ADB Connection',
        status: 'warning',
        message: 'ADB не установлен или не в PATH',
        lastCheck: new Date().toISOString()
      };
    }

    const devicesOutput = execSync('adb devices', { encoding: 'utf-8', timeout: 10000 });
    const lines = devicesOutput.split('\n').filter((l: string) => l.includes('\t'));
    const deviceCount = lines.length;

    const status = deviceCount > 0 ? 'ok' : 'warning';

    return {
      name: 'ADB Connection',
      status,
      message: `${deviceCount} устройств подключено`,
      details: { deviceCount },
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      name: 'ADB Connection',
      status: 'warning',
      message: 'Проверка недоступна',
      lastCheck: new Date().toISOString()
    };
  }
}

async function checkDiskSpace(): Promise<HealthCheck> {
  try {
    const { execSync } = require('child_process');
    const output = execSync('df -h / | tail -1', { encoding: 'utf-8' });
    const parts = output.split(/\s+/);
    
    const total = parts[1];
    const used = parts[2];
    const percentage = parseInt(parts[4]);

    const status = percentage < 80 ? 'ok' : percentage < 95 ? 'warning' : 'error';

    return {
      name: 'Disk Space',
      status,
      message: `Использовано: ${percentage}% (${used}/${total})`,
      details: { percentage, used, total },
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      name: 'Disk Space',
      status: 'unknown',
      message: 'Не удалось проверить',
      lastCheck: new Date().toISOString()
    };
  }
}

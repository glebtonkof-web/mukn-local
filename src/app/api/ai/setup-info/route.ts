import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orchestrator } from '@/lib/microservice-orchestrator';
import { autoBackup } from '@/lib/auto-backup';
import fs from 'fs';
import path from 'path';

// GET /api/ai/setup-info - Полная информация о системе для AI ассистента
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const section = searchParams.get('section') || 'all';

    const info: Record<string, any> = {};

    // === СТАТУС СИСТЕМЫ ===
    if (section === 'all' || section === 'status') {
      try {
        const healthCheck = await fetch('http://localhost:3000/api/health');
        info.health = healthCheck.ok ? await healthCheck.json() : { status: 'error', code: healthCheck.status };
      } catch {
        info.health = { status: 'unreachable', message: 'Server may not be running' };
      }
    }

    // === МИКРОСЕРВИСЫ ===
    if (section === 'all' || section === 'services') {
      try {
        const servicesStatus = orchestrator.getAllStatuses();
        const orchestratorUptime = orchestrator.getOrchestratorUptime();

        info.services = {
          orchestrator: {
            uptime: orchestratorUptime,
            uptimeFormatted: formatUptime(orchestratorUptime),
          },
          list: servicesStatus.map(s => ({
            name: s.name,
            status: s.status,
            port: s.port,
            pid: s.pid,
            uptime: s.uptime,
            uptimeFormatted: formatUptime(s.uptime),
            restartCount: s.restartCount,
            lastError: s.lastError,
          })),
          summary: {
            total: servicesStatus.length,
            running: servicesStatus.filter(s => s.status === 'running').length,
            stopped: servicesStatus.filter(s => s.status === 'stopped').length,
            crashed: servicesStatus.filter(s => s.status === 'crashed').length,
          },
        };
      } catch (e) {
        info.services = { error: 'Failed to get services status', details: String(e) };
      }
    }

    // === БЭКАПЫ ===
    if (section === 'all' || section === 'backup') {
      try {
        info.backup = {
          status: autoBackup.getStatus(),
          metrics: autoBackup.getMetrics(),
        };
      } catch (e) {
        info.backup = { error: 'Failed to get backup status' };
      }
    }

    // === БАЗА ДАННЫХ ===
    if (section === 'all' || section === 'database') {
      try {
        // Проверка соединения с БД
        await db.$queryRaw`SELECT 1`;

        // Размер БД
        const dbPath = path.join(process.cwd(), 'db', 'custom.db');
        let dbSize = 0;
        let dbExists = false;

        try {
          if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            dbSize = stats.size;
            dbExists = true;
          }
        } catch {
          // Ignore
        }

        // Подсчёт записей в основных таблицах
        const counts = await Promise.all([
          db.account.count().catch(() => 0),
          db.proxy.count().catch(() => 0),
          db.campaign.count().catch(() => 0),
          db.aIGeneratedContent.count().catch(() => 0),
        ]);

        info.database = {
          status: 'connected',
          type: 'SQLite',
          path: dbPath,
          exists: dbExists,
          sizeBytes: dbSize,
          sizeFormatted: formatBytes(dbSize),
          counts: {
            accounts: counts[0],
            proxies: counts[1],
            campaigns: counts[2],
            aiGeneratedContent: counts[3],
          },
        };
      } catch (e) {
        info.database = {
          status: 'error',
          error: String(e),
        };
      }
    }

    // === ОКРУЖЕНИЕ ===
    if (section === 'all' || section === 'environment') {
      info.environment = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
        uptime: process.uptime(),
        uptimeFormatted: formatUptime(Math.floor(process.uptime())),
        memory: {
          rss: formatBytes(process.memoryUsage().rss),
          heapTotal: formatBytes(process.memoryUsage().heapTotal),
          heapUsed: formatBytes(process.memoryUsage().heapUsed),
        },
        env: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT || 3000,
        },
      };
    }

    // === ФАЙЛЫ КОНФИГУРАЦИИ ===
    if (section === 'all' || section === 'config') {
      const configFiles = [
        'package.json',
        'next.config.ts',
        'tsconfig.json',
        'tailwind.config.ts',
        'prisma/schema.prisma',
      ];

      info.config = {};

      for (const file of configFiles) {
        const filePath = path.join(process.cwd(), file);
        try {
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            info.config[file] = {
              exists: true,
              size: formatBytes(stats.size),
              modified: stats.mtime,
            };
          } else {
            info.config[file] = { exists: false };
          }
        } catch {
          info.config[file] = { exists: false, error: true };
        }
      }
    }

    // === ЛОГИ (последние ошибки) ===
    if (section === 'all' || section === 'logs') {
      const logsDir = path.join(process.cwd(), 'logs');

      try {
        if (fs.existsSync(logsDir)) {
          const logFiles = fs.readdirSync(logsDir)
            .filter(f => f.endsWith('.log'))
            .slice(0, 5);

          info.logs = {
            directory: logsDir,
            files: logFiles.map(f => {
              const filePath = path.join(logsDir, f);
              const stats = fs.statSync(filePath);
              return {
                name: f,
                size: formatBytes(stats.size),
                modified: stats.mtime,
              };
            }),
          };
        } else {
          info.logs = { directory: logsDir, exists: false };
        }
      } catch {
        info.logs = { error: 'Failed to read logs directory' };
      }
    }

    // === ПОРТЫ ===
    if (section === 'all' || section === 'ports') {
      info.ports = {
        main: 3000,
        microservices: [
          { name: 'ai-service', port: 3001 },
          { name: 'content-generator', port: 3002 },
          { name: 'realtime-service', port: 3003 },
          { name: 'logs-service', port: 3004 },
          { name: 'publisher-service', port: 3005 },
          { name: 'analytics-service', port: 3006 },
        ],
      };
    }

    // === AI ПРОВАЙДЕРЫ ===
    if (section === 'all' || section === 'ai') {
      try {
        const aiGlobalSettings = await db.aIGlobalSettings.findFirst();
        const aiProviders = await db.aIProviderSettings.findMany({
          where: { isActive: true },
          select: { provider: true, isActive: true, defaultModel: true, balance: true }
        });
        info.ai = {
          configured: aiProviders.length > 0,
          activeProviders: aiProviders.map(p => ({
            name: p.provider,
            model: p.defaultModel,
            balance: p.balance,
          })),
          globalSettings: {
            autoFallback: aiGlobalSettings?.autoFallback,
            dailyLimit: aiGlobalSettings?.dailyLimit,
            monthlyLimit: aiGlobalSettings?.monthlyLimit,
          },
        };
      } catch {
        info.ai = { configured: false };
      }
    }

    // === TELEGRAM ===
    if (section === 'all' || section === 'telegram') {
      try {
        const telegramBotEvents = await db.telegramBotEvent.count();
        const telegramAccounts = await db.account.count({
          where: { 
            platform: { equals: 'telegram' }
          }
        });
        info.telegram = {
          configured: telegramBotEvents > 0 || telegramAccounts > 0,
          botEventsCount: telegramBotEvents,
          telegramAccounts: telegramAccounts,
        };
      } catch {
        info.telegram = { configured: false };
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      section,
      data: info,
    });

  } catch (error) {
    console.error('Error getting setup info:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get setup info',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

// POST /api/ai/setup-info - Выполнение диагностических команд
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'start_service':
        if (!params?.serviceName) {
          return NextResponse.json({ error: 'serviceName required' }, { status: 400 });
        }
        await orchestrator.startService(params.serviceName);
        return NextResponse.json({ success: true, message: `Service ${params.serviceName} started` });

      case 'stop_service':
        if (!params?.serviceName) {
          return NextResponse.json({ error: 'serviceName required' }, { status: 400 });
        }
        await orchestrator.stopService(params.serviceName);
        return NextResponse.json({ success: true, message: `Service ${params.serviceName} stopped` });

      case 'restart_service':
        if (!params?.serviceName) {
          return NextResponse.json({ error: 'serviceName required' }, { status: 400 });
        }
        await orchestrator.restartService(params.serviceName);
        return NextResponse.json({ success: true, message: `Service ${params.serviceName} restarted` });

      case 'start_all_services':
        await orchestrator.startAll();
        return NextResponse.json({ success: true, message: 'All services starting' });

      case 'stop_all_services':
        await orchestrator.stopAll();
        return NextResponse.json({ success: true, message: 'All services stopped' });

      case 'backup_now':
        const result = await autoBackup.performBackup();
        return NextResponse.json({ success: result.success, result });

      case 'db_push':
        // Это нужно делать через CLI, но можно вернуть инструкцию
        return NextResponse.json({
          success: true,
          message: 'Run this command in terminal',
          command: 'npx prisma db push',
        });

      case 'db_migrate':
        return NextResponse.json({
          success: true,
          message: 'Run this command in terminal',
          command: 'npx prisma migrate dev',
        });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error executing setup action:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute action',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

// === Вспомогательные функции ===

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

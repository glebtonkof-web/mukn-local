// API: Балансировка нагрузки (УРОВЕНЬ 3, функция 12)
// Управление серверами/прокси с авто-выбором лучшего

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Типы для сервера
interface ServerInfo {
  id: string;
  serverId: string;
  serverName: string | null;
  proxyHost: string | null;
  proxyPort: number | null;
  maxRequests: number;
  currentLoad: number;
  status: string;
  avgResponseTime: number;
  errorRate: number;
  loadPercent: number;
  score: number;
}

// Функция расчёта score сервера
function calculateServerScore(server: {
  currentLoad: number;
  maxRequests: number;
  avgResponseTime: number;
  errorRate: number;
  status: string;
}): number {
  if (server.status !== 'active') return -1;

  const loadPercent = server.maxRequests > 0 ? server.currentLoad / server.maxRequests : 1;
  const loadScore = (1 - loadPercent) * 40; // 0-40 баллов за нагрузку
  const responseScore = Math.max(0, 30 - server.avgResponseTime / 100); // 0-30 баллов за скорость
  const errorScore = (1 - server.errorRate / 100) * 30; // 0-30 баллов за надёжность

  return loadScore + responseScore + errorScore;
}

// POST: Добавить сервер/прокси
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      serverId,
      serverName,
      proxyHost,
      proxyPort,
      maxRequests = 100,
    } = body;

    if (!serverId) {
      return NextResponse.json(
        { error: 'Missing required field: serverId' },
        { status: 400 }
      );
    }

    // Проверяем, не существует ли уже сервер с таким ID
    const existing = await db.loadBalancer.findUnique({
      where: { serverId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Server with this ID already exists' },
        { status: 409 }
      );
    }

    const server = await db.loadBalancer.create({
      data: {
        serverId,
        serverName,
        proxyHost,
        proxyPort,
        maxRequests,
        currentLoad: 0,
        status: 'active',
        avgResponseTime: 0,
        errorRate: 0,
      },
    });

    return NextResponse.json({
      success: true,
      server,
      message: `Server ${serverId} added successfully`,
    });
  } catch (error) {
    console.error('[LoadBalancer API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add server', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: Получить все серверы с текущей нагрузкой
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const best = searchParams.get('best') === 'true';

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const servers = await db.loadBalancer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Добавляем расчётные поля
    const serversWithMetrics: ServerInfo[] = servers.map((server) => ({
      ...server,
      loadPercent: server.maxRequests > 0
        ? Math.round((server.currentLoad / server.maxRequests) * 100)
        : 100,
      score: calculateServerScore(server),
    }));

    // Если запрошен лучший сервер
    if (best) {
      const activeServers = serversWithMetrics.filter((s) => s.status === 'active' && s.score > 0);

      if (activeServers.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No active servers available',
          servers: serversWithMetrics,
        });
      }

      // Сортируем по score и возвращаем лучший
      activeServers.sort((a, b) => b.score - a.score);
      const bestServer = activeServers[0];

      // Инкрементируем нагрузку
      await db.loadBalancer.update({
        where: { id: bestServer.id },
        data: { currentLoad: { increment: 1 } },
      });

      return NextResponse.json({
        success: true,
        bestServer,
        allServers: serversWithMetrics,
        selectionReason: `Score: ${bestServer.score.toFixed(1)}, Load: ${bestServer.loadPercent}%, Response: ${bestServer.avgResponseTime}ms`,
      });
    }

    // Статистика
    const stats = {
      total: servers.length,
      active: servers.filter((s) => s.status === 'active').length,
      overloaded: servers.filter((s) => s.status === 'overloaded').length,
      offline: servers.filter((s) => s.status === 'offline').length,
      totalCapacity: servers.reduce((sum, s) => sum + s.maxRequests, 0),
      totalLoad: servers.reduce((sum, s) => sum + s.currentLoad, 0),
    };

    return NextResponse.json({
      success: true,
      servers: serversWithMetrics,
      stats,
    });
  } catch (error) {
    console.error('[LoadBalancer API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch servers' },
      { status: 500 }
    );
  }
}

// PUT: Обновить статус сервера
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      serverId,
      status,
      currentLoad,
      avgResponseTime,
      errorRate,
      maxRequests,
    } = body;

    // Поддержка обновления по id или serverId
    const whereClause = id
      ? { id }
      : serverId
      ? { serverId }
      : null;

    if (!whereClause) {
      return NextResponse.json(
        { error: 'Missing required field: id or serverId' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (currentLoad !== undefined) updateData.currentLoad = currentLoad;
    if (avgResponseTime !== undefined) updateData.avgResponseTime = avgResponseTime;
    if (errorRate !== undefined) updateData.errorRate = errorRate;
    if (maxRequests !== undefined) updateData.maxRequests = maxRequests;

    // Автоматическое определение статуса на основе нагрузки
    if (currentLoad !== undefined && maxRequests !== undefined) {
      const loadPercent = currentLoad / maxRequests;
      if (loadPercent >= 0.9) {
        updateData.status = 'overloaded';
      } else if (status && status !== 'offline') {
        updateData.status = 'active';
      }
    }

    const server = await db.loadBalancer.update({
      where: whereClause,
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      server,
    });
  } catch (error) {
    console.error('[LoadBalancer API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update server' },
      { status: 500 }
    );
  }
}

// DELETE: Удалить сервер
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const serverId = searchParams.get('serverId');

    if (!id && !serverId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id or serverId' },
        { status: 400 }
      );
    }

    const whereClause = id ? { id } : { serverId: serverId! };

    await db.loadBalancer.delete({
      where: whereClause,
    });

    return NextResponse.json({
      success: true,
      message: 'Server removed from load balancer',
    });
  } catch (error) {
    console.error('[LoadBalancer API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete server' },
      { status: 500 }
    );
  }
}

// PATCH: Сброс нагрузки (для ежедневного сброса)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reset-load') {
      // Сброс текущей нагрузки на всех серверах
      await db.loadBalancer.updateMany({
        data: {
          currentLoad: 0,
          status: 'active',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'All server loads reset to 0',
      });
    }

    if (action === 'health-check') {
      // Запуск проверки здоровья серверов
      const servers = await db.loadBalancer.findMany();
      const results: Array<{ serverId: string; healthy: boolean }> = [];

      for (const server of servers) {
        // Симуляция health check (в реальной системе - пинг сервера)
        const isHealthy = Math.random() > 0.1; // 90% успешность

        await db.loadBalancer.update({
          where: { id: server.id },
          data: {
            status: isHealthy ? 'active' : 'offline',
          },
        });

        results.push({
          serverId: server.serverId,
          healthy: isHealthy,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Health check completed',
        results,
      });
    }

    return NextResponse.json(
      { error: 'Unknown action. Supported: reset-load, health-check' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[LoadBalancer API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}

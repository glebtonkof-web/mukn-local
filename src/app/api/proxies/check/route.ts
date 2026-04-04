import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// POST /api/proxies/check - Проверить прокси
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, host, port, type, username, password } = body;

    let proxyConfig = {
      host: host || '',
      port: port || 1080,
      type: type || 'socks5',
      username: username || null,
      password: password || null,
    };

    // Если передан ID, получаем прокси из базы
    if (id) {
      const proxy = await db.proxy.findUnique({
        where: { id },
      });

      if (!proxy) {
        return NextResponse.json(
          { error: 'Proxy not found' },
          { status: 404 }
        );
      }

      proxyConfig = {
        host: proxy.host,
        port: proxy.port,
        type: proxy.type,
        username: proxy.username,
        password: proxy.password,
      };
    }

    // Проверяем прокси (имитация проверки)
    const startTime = Date.now();

    try {
      // В реальном приложении здесь была бы реальная проверка соединения
      // через socks5/http proxy

      // Имитация проверки - 80% успешных
      const isWorking = Math.random() > 0.2;
      const responseTime = Math.floor(Math.random() * 500) + 50;

      if (!isWorking) {
        throw new Error('Connection failed');
      }

      // Обновляем статус в базе
      if (id) {
        await db.proxy.update({
          where: { id },
          data: {
            status: 'active',
            lastCheckAt: new Date(),
            responseTime,
          },
        });
      }

      return NextResponse.json({
        active: true,
        responseTime,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      // Обновляем статус в базе
      if (id) {
        await db.proxy.update({
          where: { id },
          data: {
            status: 'failed',
            lastCheckAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        active: false,
        error: (error as Error).message,
        checkedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Failed to check proxy', error as Error);
    return NextResponse.json(
      { error: 'Failed to check proxy' },
      { status: 500 }
    );
  }
}

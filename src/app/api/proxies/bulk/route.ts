import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// POST /api/proxies/bulk - Массовый импорт прокси
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proxies } = body;

    if (!Array.isArray(proxies) || proxies.length === 0) {
      return NextResponse.json(
        { error: 'Proxies array is required' },
        { status: 400 }
      );
    }

    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const proxy of proxies) {
      try {
        // Проверяем наличие обязательных полей
        if (!proxy.host || !proxy.port) {
          skipped++;
          continue;
        }

        // Проверяем, не существует ли уже такой прокси
        const existing = await db.proxy.findFirst({
          where: {
            host: proxy.host,
            port: proxy.port,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Создаём прокси
        await db.proxy.create({
          data: {
            type: proxy.type || 'socks5',
            host: proxy.host,
            port: proxy.port,
            username: proxy.username || null,
            password: proxy.password || null,
            status: 'active',
            userId: 'default-user',
          },
        });

        added++;
      } catch (error) {
        skipped++;
        errors.push(`${proxy.host}:${proxy.port} - ${(error as Error).message}`);
      }
    }

    logger.info('Bulk proxy import completed', { added, skipped });

    return NextResponse.json({
      added,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('Failed to bulk import proxies', error as Error);
    return NextResponse.json(
      { error: 'Failed to bulk import proxies' },
      { status: 500 }
    );
  }
}

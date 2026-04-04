import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/settings/publishing - Получить настройки публикации
export async function GET() {
  try {
    let settings = await db.publishingSettings.findFirst({
      where: { userId: 'default' }
    });

    if (!settings) {
      settings = await db.publishingSettings.create({
        data: { id: nanoid(), userId: 'default', updatedAt: new Date() }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка получения настроек публикации:', error);
    return NextResponse.json(
      { error: 'Не удалось получить настройки публикации' },
      { status: 500 }
    );
  }
}

// POST /api/settings/publishing - Обновить настройки публикации
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    let settings = await db.publishingSettings.findFirst({
      where: { userId: 'default' }
    });

    const updateData: Record<string, unknown> = { ...body };
    
    // Преобразуем proxyPool в JSON строку если нужно
    if (body.proxyPool && typeof body.proxyPool !== 'string') {
      updateData.proxyPool = JSON.stringify(body.proxyPool);
    }

    if (settings) {
      settings = await db.publishingSettings.update({
        where: { id: settings.id },
        data: updateData
      });
    } else {
      settings = await db.publishingSettings.create({
        data: {
          id: nanoid(),
          userId: 'default',
          ...updateData,
          updatedAt: new Date(),
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки публикации сохранены',
      settings
    });
  } catch (error) {
    console.error('Ошибка сохранения настроек публикации:', error);
    return NextResponse.json(
      { error: 'Не удалось сохранить настройки публикации' },
      { status: 500 }
    );
  }
}

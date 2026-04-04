import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/settings/notifications - Получить настройки уведомлений
export async function GET() {
  try {
    let settings = await db.notificationSettings.findFirst({
      where: { userId: 'default' }
    });

    if (!settings) {
      // Создаём настройки по умолчанию
      settings = await db.notificationSettings.create({
        data: { id: nanoid(), userId: 'default', updatedAt: new Date() }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка получения настроек уведомлений:', error);
    return NextResponse.json(
      { error: 'Не удалось получить настройки уведомлений' },
      { status: 500 }
    );
  }
}

// POST /api/settings/notifications - Обновить настройки уведомлений
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    let settings = await db.notificationSettings.findFirst({
      where: { userId: 'default' }
    });

    const updateData = { ...body };

    if (settings) {
      settings = await db.notificationSettings.update({
        where: { id: settings.id },
        data: updateData
      });
    } else {
      settings = await db.notificationSettings.create({
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
      message: 'Настройки уведомлений сохранены',
      settings
    });
  } catch (error) {
    console.error('Ошибка сохранения настроек уведомлений:', error);
    return NextResponse.json(
      { error: 'Не удалось сохранить настройки уведомлений' },
      { status: 500 }
    );
  }
}

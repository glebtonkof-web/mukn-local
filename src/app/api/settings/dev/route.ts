import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/settings/dev - Получить настройки разработчика
export async function GET() {
  try {
    let settings = await db.devSettings.findFirst({
      where: { userId: 'default' }
    });

    if (!settings) {
      settings = await db.devSettings.create({
        data: { id: nanoid(), userId: 'default', updatedAt: new Date() }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка получения настроек разработчика:', error);
    return NextResponse.json(
      { error: 'Не удалось получить настройки разработчика' },
      { status: 500 }
    );
  }
}

// POST /api/settings/dev - Обновить настройки разработчика
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    let settings = await db.devSettings.findFirst({
      where: { userId: 'default' }
    });

    if (settings) {
      settings = await db.devSettings.update({
        where: { id: settings.id },
        data: body
      });
    } else {
      settings = await db.devSettings.create({
        data: {
          id: nanoid(),
          userId: 'default',
          ...body,
          updatedAt: new Date(),
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки разработчика сохранены',
      settings
    });
  } catch (error) {
    console.error('Ошибка сохранения настроек разработчика:', error);
    return NextResponse.json(
      { error: 'Не удалось сохранить настройки разработчика' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/settings/analytics - Получить настройки аналитики
export async function GET() {
  try {
    let settings = await db.analyticsSettings.findFirst({
      where: { userId: 'default' }
    });

    if (!settings) {
      settings = await db.analyticsSettings.create({
        data: { userId: 'default' }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка получения настроек аналитики:', error);
    return NextResponse.json(
      { error: 'Не удалось получить настройки аналитики' },
      { status: 500 }
    );
  }
}

// POST /api/settings/analytics - Обновить настройки аналитики
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    let settings = await db.analyticsSettings.findFirst({
      where: { userId: 'default' }
    });

    const updateData: Record<string, unknown> = { ...body };
    
    // Преобразуем dashboardWidgets в JSON строку если нужно
    if (body.dashboardWidgets && typeof body.dashboardWidgets !== 'string') {
      updateData.dashboardWidgets = JSON.stringify(body.dashboardWidgets);
    }

    if (settings) {
      settings = await db.analyticsSettings.update({
        where: { id: settings.id },
        data: updateData
      });
    } else {
      settings = await db.analyticsSettings.create({
        data: {
          userId: 'default',
          ...updateData
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки аналитики сохранены',
      settings
    });
  } catch (error) {
    console.error('Ошибка сохранения настроек аналитики:', error);
    return NextResponse.json(
      { error: 'Не удалось сохранить настройки аналитики' },
      { status: 500 }
    );
  }
}

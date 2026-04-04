import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/settings/platform - Получить настройки платформы
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const campaignId = searchParams.get('campaignId');

    if (platform) {
      // Получаем настройки для конкретной платформы
      const settings = await db.platformSettings.findFirst({
        where: {
          platform,
          userId: 'default',
          campaignId: campaignId || null
        }
      });
      
      return NextResponse.json(settings || null);
    }

    // Получаем все настройки платформ
    const settings = await db.platformSettings.findMany({
      where: {
        userId: 'default'
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка получения настроек платформы:', error);
    return NextResponse.json(
      { error: 'Не удалось получить настройки платформы' },
      { status: 500 }
    );
  }
}

// POST /api/settings/platform - Создать или обновить настройки платформы
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, campaignId, ...updateData } = body;

    if (!platform) {
      return NextResponse.json(
        { error: 'Платформа обязательна' },
        { status: 400 }
      );
    }

    // Ищем существующие настройки
    const existing = await db.platformSettings.findFirst({
      where: {
        platform,
        userId: 'default',
        campaignId: campaignId || null
      }
    });

    let settings;
    if (existing) {
      // Обновляем существующие
      settings = await db.platformSettings.update({
        where: { id: existing.id },
        data: updateData
      });
    } else {
      // Создаём новые
      settings = await db.platformSettings.create({
        data: {
          platform,
          userId: 'default',
          campaignId: campaignId || null,
          ...updateData
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки платформы сохранены',
      settings
    });
  } catch (error) {
    console.error('Ошибка сохранения настроек платформы:', error);
    return NextResponse.json(
      { error: 'Не удалось сохранить настройки платформы' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/platform - Удалить настройки платформы
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID настроек обязателен' },
        { status: 400 }
      );
    }

    await db.platformSettings.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Настройки платформы удалены'
    });
  } catch (error) {
    console.error('Ошибка удаления настроек платформы:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить настройки платформы' },
      { status: 500 }
    );
  }
}

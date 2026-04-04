import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/settings/campaign - Получить настройки кампании
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (campaignId) {
      // Получаем настройки для конкретной кампании
      let settings = await db.campaignSettings.findUnique({
        where: { campaignId }
      });
      
      if (!settings) {
        // Создаём настройки по умолчанию
        settings = await db.campaignSettings.create({
          data: { campaignId }
        });
      }
      
      return NextResponse.json(settings);
    }

    // Получаем все настройки кампаний
    const settings = await db.campaignSettings.findMany();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка получения настроек кампании:', error);
    return NextResponse.json(
      { error: 'Не удалось получить настройки кампании' },
      { status: 500 }
    );
  }
}

// POST /api/settings/campaign - Создать или обновить настройки кампании
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, ...updateData } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'ID кампании обязателен' },
        { status: 400 }
      );
    }

    // Ищем существующие настройки
    let settings = await db.campaignSettings.findUnique({
      where: { campaignId }
    });

    if (settings) {
      // Обновляем существующие
      settings = await db.campaignSettings.update({
        where: { campaignId },
        data: updateData
      });
    } else {
      // Создаём новые
      settings = await db.campaignSettings.create({
        data: {
          campaignId,
          ...updateData
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки кампании сохранены',
      settings
    });
  } catch (error) {
    console.error('Ошибка сохранения настроек кампании:', error);
    return NextResponse.json(
      { error: 'Не удалось сохранить настройки кампании' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/campaign - Удалить настройки кампании
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'ID кампании обязателен' },
        { status: 400 }
      );
    }

    await db.campaignSettings.delete({
      where: { campaignId }
    });

    return NextResponse.json({
      success: true,
      message: 'Настройки кампании удалены'
    });
  } catch (error) {
    console.error('Ошибка удаления настроек кампании:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить настройки кампании' },
      { status: 500 }
    );
  }
}

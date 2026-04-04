import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/settings/presets - Получить пресеты настроек
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    const where: Record<string, unknown> = { userId: 'default' };
    if (type) where.type = type;
    if (category) where.category = category;

    const presets = await db.settingsPreset.findMany({ where });
    return NextResponse.json(presets);
  } catch (error) {
    console.error('Ошибка получения пресетов:', error);
    return NextResponse.json(
      { error: 'Не удалось получить пресеты' },
      { status: 500 }
    );
  }
}

// POST /api/settings/presets - Создать пресет
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, category, settings, isDefault } = body;

    if (!name || !type || !settings) {
      return NextResponse.json(
        { error: 'Название, тип и настройки обязательны' },
        { status: 400 }
      );
    }

    const preset = await db.settingsPreset.create({
      data: {
        name,
        type,
        category,
        settings: typeof settings === 'string' ? settings : JSON.stringify(settings),
        isDefault: isDefault || false,
        userId: 'default'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Пресет создан',
      preset
    });
  } catch (error) {
    console.error('Ошибка создания пресета:', error);
    return NextResponse.json(
      { error: 'Не удалось создать пресет' },
      { status: 500 }
    );
  }
}

// PUT /api/settings/presets - Обновить пресет
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID пресета обязателен' },
        { status: 400 }
      );
    }

    const preset = await db.settingsPreset.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'Пресет обновлён',
      preset
    });
  } catch (error) {
    console.error('Ошибка обновления пресета:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить пресет' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/presets - Удалить пресет
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID пресета обязателен' },
        { status: 400 }
      );
    }

    await db.settingsPreset.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Пресет удалён'
    });
  } catch (error) {
    console.error('Ошибка удаления пресета:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить пресет' },
      { status: 500 }
    );
  }
}

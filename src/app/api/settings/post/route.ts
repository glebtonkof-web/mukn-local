import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/settings/post - Получить настройки поста
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (postId) {
      // Получаем настройки для конкретного поста
      let settings = await db.postSettings.findUnique({
        where: { postId }
      });
      
      if (!settings) {
        // Создаём настройки по умолчанию
        settings = await db.postSettings.create({
          data: { postId }
        });
      }
      
      return NextResponse.json(settings);
    }

    // Получаем все настройки постов
    const settings = await db.postSettings.findMany();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка получения настроек поста:', error);
    return NextResponse.json(
      { error: 'Не удалось получить настройки поста' },
      { status: 500 }
    );
  }
}

// POST /api/settings/post - Создать или обновить настройки поста
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, ...updateData } = body;

    if (!postId) {
      return NextResponse.json(
        { error: 'ID поста обязателен' },
        { status: 400 }
      );
    }

    // Ищем существующие настройки
    let settings = await db.postSettings.findUnique({
      where: { postId }
    });

    if (settings) {
      // Обновляем существующие
      settings = await db.postSettings.update({
        where: { postId },
        data: updateData
      });
    } else {
      // Создаём новые
      settings = await db.postSettings.create({
        data: {
          postId,
          ...updateData
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки поста сохранены',
      settings
    });
  } catch (error) {
    console.error('Ошибка сохранения настроек поста:', error);
    return NextResponse.json(
      { error: 'Не удалось сохранить настройки поста' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/post - Удалить настройки поста
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'ID поста обязателен' },
        { status: 400 }
      );
    }

    await db.postSettings.delete({
      where: { postId }
    });

    return NextResponse.json({
      success: true,
      message: 'Настройки поста удалены'
    });
  } catch (error) {
    console.error('Ошибка удаления настроек поста:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить настройки поста' },
      { status: 500 }
    );
  }
}

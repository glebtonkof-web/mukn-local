import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/settings/hotkeys - Получить горячие клавиши
export async function GET() {
  try {
    let settings = await db.hotkeysSettings.findFirst({
      where: { userId: 'default' }
    });

    if (!settings) {
      settings = await db.hotkeysSettings.create({
        data: { id: nanoid(), userId: 'default', updatedAt: new Date() }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка получения горячих клавиш:', error);
    return NextResponse.json(
      { error: 'Не удалось получить горячие клавиши' },
      { status: 500 }
    );
  }
}

// POST /api/settings/hotkeys - Обновить горячие клавиши
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    let settings = await db.hotkeysSettings.findFirst({
      where: { userId: 'default' }
    });

    if (settings) {
      settings = await db.hotkeysSettings.update({
        where: { id: settings.id },
        data: body
      });
    } else {
      settings = await db.hotkeysSettings.create({
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
      message: 'Горячие клавиши сохранены',
      settings
    });
  } catch (error) {
    console.error('Ошибка сохранения горячих клавиш:', error);
    return NextResponse.json(
      { error: 'Не удалось сохранить горячие клавиши' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/hotkeys - Сбросить горячие клавиши к значениям по умолчанию
export async function DELETE() {
  try {
    const settings = await db.hotkeysSettings.findFirst({
      where: { userId: 'default' }
    });
    
    if (settings) {
      await db.hotkeysSettings.update({
        where: { id: settings.id },
        data: {
          newCampaign: 'ctrl+n',
          save: 'ctrl+s',
          publish: 'ctrl+p',
          undo: 'ctrl+z',
          redo: 'ctrl+y',
          search: 'ctrl+f',
          settings: 'ctrl+,',
          help: 'f1',
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Горячие клавиши сброшены к значениям по умолчанию'
    });
  } catch (error) {
    console.error('Ошибка сброса горячих клавиш:', error);
    return NextResponse.json(
      { error: 'Не удалось сбросить горячие клавиши' },
      { status: 500 }
    );
  }
}

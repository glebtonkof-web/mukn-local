import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/settings/blacklist - Получить чёрные списки
export async function GET() {
  try {
    let settings = await db.blacklistSettings.findFirst({
      where: { userId: 'default' }
    });

    if (!settings) {
      settings = await db.blacklistSettings.create({
        data: { userId: 'default' }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка получения чёрных списков:', error);
    return NextResponse.json(
      { error: 'Не удалось получить чёрные списки' },
      { status: 500 }
    );
  }
}

// POST /api/settings/blacklist - Обновить чёрные списки
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    let settings = await db.blacklistSettings.findFirst({
      where: { userId: 'default' }
    });

    const updateData: Record<string, unknown> = {};
    
    if (body.forbiddenWords !== undefined) {
      updateData.forbiddenWords = typeof body.forbiddenWords === 'string' 
        ? body.forbiddenWords 
        : JSON.stringify(body.forbiddenWords);
    }
    if (body.forbiddenChannels !== undefined) {
      updateData.forbiddenChannels = typeof body.forbiddenChannels === 'string'
        ? body.forbiddenChannels
        : JSON.stringify(body.forbiddenChannels);
    }
    if (body.forbiddenTopics !== undefined) {
      updateData.forbiddenTopics = typeof body.forbiddenTopics === 'string'
        ? body.forbiddenTopics
        : JSON.stringify(body.forbiddenTopics);
    }
    if (body.whitelist !== undefined) {
      updateData.whitelist = typeof body.whitelist === 'string'
        ? body.whitelist
        : JSON.stringify(body.whitelist);
    }
    if (body.whitelistOnly !== undefined) {
      updateData.whitelistOnly = body.whitelistOnly;
    }

    if (settings) {
      settings = await db.blacklistSettings.update({
        where: { id: settings.id },
        data: updateData
      });
    } else {
      settings = await db.blacklistSettings.create({
        data: {
          userId: 'default',
          ...updateData
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Чёрные списки обновлены',
      settings
    });
  } catch (error) {
    console.error('Ошибка обновления чёрных списков:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить чёрные списки' },
      { status: 500 }
    );
  }
}

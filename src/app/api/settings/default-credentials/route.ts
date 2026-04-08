import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// GET - загрузить учётные данные
export async function GET() {
  try {
    // Получаем первого пользователя (для локального запуска без авторизации)
    let user = await prisma.user.findFirst();
    
    if (!user) {
      // Создаём дефолтного пользователя для локального запуска
      user = await prisma.user.create({
        data: {
          id: randomUUID(),
          email: 'local@mukn.local',
          name: 'Local User',
          role: 'admin',
        }
      });
    }

    let credentials = await prisma.defaultCredentials.findUnique({
      where: { userId: user.id }
    });

    if (!credentials) {
      // Создаём пустые настройки
      credentials = await prisma.defaultCredentials.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          defaultUsername: '',
          defaultPassword: '',
          defaultEmail: '',
          defaultPhone: '',
          autoFillEnabled: true,
          platformsConfig: '{}',
        }
      });
    }

    // Парсим конфигурацию платформ
    let platforms = {};
    try {
      platforms = credentials.platformsConfig ? JSON.parse(credentials.platformsConfig) : {};
    } catch {
      platforms = {};
    }

    return NextResponse.json({
      global: {
        defaultUsername: credentials.defaultUsername || '',
        defaultPassword: credentials.defaultPassword || '',
        defaultEmail: credentials.defaultEmail || '',
        defaultPhone: credentials.defaultPhone || '',
        autoFillEnabled: credentials.autoFillEnabled,
      },
      platforms,
    });
  } catch (error) {
    console.error('Failed to load credentials:', error);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}

// POST - сохранить учётные данные
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { global, platforms } = body;

    // Получаем первого пользователя
    let user = await prisma.user.findFirst();
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: randomUUID(),
          email: 'local@mukn.local',
          name: 'Local User',
          role: 'admin',
        }
      });
    }

    // Сохраняем или обновляем
    const existing = await prisma.defaultCredentials.findUnique({
      where: { userId: user.id }
    });

    if (existing) {
      await prisma.defaultCredentials.update({
        where: { userId: user.id },
        data: {
          defaultUsername: global?.defaultUsername || '',
          defaultPassword: global?.defaultPassword || '',
          defaultEmail: global?.defaultEmail || '',
          defaultPhone: global?.defaultPhone || '',
          autoFillEnabled: global?.autoFillEnabled ?? true,
          platformsConfig: JSON.stringify(platforms || {}),
          updatedAt: new Date(),
        }
      });
    } else {
      await prisma.defaultCredentials.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          defaultUsername: global?.defaultUsername || '',
          defaultPassword: global?.defaultPassword || '',
          defaultEmail: global?.defaultEmail || '',
          defaultPhone: global?.defaultPhone || '',
          autoFillEnabled: global?.autoFillEnabled ?? true,
          platformsConfig: JSON.stringify(platforms || {}),
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save credentials:', error);
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}

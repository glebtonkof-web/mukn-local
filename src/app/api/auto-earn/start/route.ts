import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';

// Интерфейсы для запроса
interface AccountInput {
  username: string;
  platform: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  sessionData?: string;
}

interface StartSettings {
  budget: number;
  geo: string[];
  niche: string;
  dailyLimit?: number;
  autoScale?: boolean;
  pauseOnHighRisk?: boolean;
}

interface StartRequest {
  schemeId: string;
  accounts: AccountInput[];
  settings: StartSettings;
  userId?: string;
}

// POST /api/auto-earn/start
export async function POST(request: NextRequest) {
  try {
    const body: StartRequest = await request.json();
    const { schemeId, accounts, settings, userId = 'default-user' } = body;

    // Валидация
    if (!schemeId) {
      return NextResponse.json(
        { error: 'Необходимо выбрать схему монетизации' },
        { status: 400 }
      );
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Необходимо добавить хотя бы один аккаунт' },
        { status: 400 }
      );
    }

    if (!settings.budget || settings.budget <= 0) {
      return NextResponse.json(
        { error: 'Необходимо указать бюджет' },
        { status: 400 }
      );
    }

    // Создаём или обновляем аккаунты
    const createdAccounts = [];
    for (const accountData of accounts) {
      // Проверяем существование аккаунта
      let account = await db.account.findFirst({
        where: {
          username: accountData.username,
          platform: accountData.platform,
          userId,
        },
      });

      if (!account) {
        // Создаём новый аккаунт
        account = await db.account.create({
          data: {
            id: nanoid(),
            username: accountData.username,
            platform: accountData.platform,
            proxyHost: accountData.proxyHost,
            proxyPort: accountData.proxyPort,
            proxyUsername: accountData.proxyUsername,
            proxyPassword: accountData.proxyPassword,
            sessionData: accountData.sessionData,
            status: 'pending',
            userId,
            updatedAt: new Date(),
          },
        });
      } else {
        // Обновляем существующий
        account = await db.account.update({
          where: { id: account.id },
          data: {
            proxyHost: accountData.proxyHost,
            proxyPort: accountData.proxyPort,
            proxyUsername: accountData.proxyUsername,
            proxyPassword: accountData.proxyPassword,
            sessionData: accountData.sessionData,
            updatedAt: new Date(),
          },
        });
      }
      createdAccounts.push(account);
    }

    // Создаём кампанию
    const campaign = await db.campaign.create({
      data: {
        id: nanoid(),
        name: `Auto-Earn: ${schemeId} - ${new Date().toLocaleDateString('ru-RU')}`,
        description: `Автоматическая кампания по схеме ${schemeId}`,
        type: schemeId.split('-')[0] || 'auto-earn',
        niche: settings.niche,
        geo: settings.geo.join(','),
        status: 'initializing',
        budget: settings.budget,
        userId,
        updatedAt: new Date(),
      },
    });

    // Создаём записи прогрева для аккаунтов, требующих прогрева
    const warmingAccounts = [];
    for (const account of createdAccounts) {
      const schemeRequiresWarming = getSchemeWarmingRequirements(schemeId, account.platform);
      
      if (schemeRequiresWarming) {
        // Создаём запись прогрева
        const warming = await db.instagramWarming.create({
          data: {
            id: nanoid(),
            accountId: account.id,
            username: account.username || '',
            status: 'pending',
            currentDay: 0,
            warmingStartedAt: new Date(),
            warmingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
            todayLikes: 0,
            todayFollows: 0,
            todayComments: 0,
            todayPosts: 0,
            todayDm: 0,
            todayStoriesViews: 0,
            todayTimeSpent: 0,
            banRisk: 0,
            totalLikes: 0,
            totalFollows: 0,
            totalComments: 0,
            totalPosts: 0,
            totalDm: 0,
            updatedAt: new Date(),
          },
        });
        warmingAccounts.push(warming);
      }
    }

    // Создаём лог активности
    await db.activityLog.create({
      data: {
        id: nanoid(),
        type: 'auto_earn_started',
        message: `Запущена автоматическая кампания: ${campaign.name}`,
        campaignId: campaign.id,
        userId,
        metadata: JSON.stringify({
          schemeId,
          accountsCount: createdAccounts.length,
          budget: settings.budget,
          geo: settings.geo,
          warmingAccounts: warmingAccounts.length,
        }),
      },
    });

    // Записываем в лог
    logger.info('Auto-earn campaign started', {
      campaignId: campaign.id,
      schemeId,
      accountsCount: createdAccounts.length,
      userId,
    });

    // Возвращаем результат
    return NextResponse.json({
      success: true,
      message: 'Автоматическая кампания успешно запущена!',
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        createdAt: campaign.createdAt,
      },
      accounts: createdAccounts.map(a => ({
        id: a.id,
        username: a.username,
        platform: a.platform,
        status: a.status,
      })),
      warming: {
        total: warmingAccounts.length,
        accounts: warmingAccounts.map(w => ({
          id: w.id,
          accountId: w.accountId,
          status: w.status,
        })),
      },
      nextSteps: [
        { step: 1, action: 'warming', description: 'Прогрев аккаунтов', duration: '3-7 дней' },
        { step: 2, action: 'search', description: 'Поиск целевой аудитории', duration: '1-2 дня' },
        { step: 3, action: 'creative', description: 'Генерация креативов', duration: 'Параллельно' },
        { step: 4, action: 'launch', description: 'Запуск активностей', duration: 'Постоянно' },
      ],
      estimatedStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    logger.error('Failed to start auto-earn campaign', error as Error);
    console.error('Error starting auto-earn:', error);
    return NextResponse.json(
      { error: 'Ошибка при запуске автоматической кампании' },
      { status: 500 }
    );
  }
}

// Вспомогательная функция для определения требований прогрева
function getSchemeWarmingRequirements(schemeId: string, platform: string): boolean {
  const warmingRequirements: Record<string, string[]> = {
    'gambling-telegram': ['Telegram', 'Instagram'],
    'dating-instagram': ['Instagram'],
    'ofm-tiktok': ['Instagram'],
    'crypto-crossplatform': ['Telegram'],
    'telegram-invites': ['Telegram'],
  };
  
  return warmingRequirements[schemeId]?.includes(platform) ?? false;
}

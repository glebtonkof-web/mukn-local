import { NextRequest, NextResponse } from 'next/server';

// Запуск автоматического заработка
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, accounts, settings } = body;

    // Валидация
    if (!methodId || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Не указан метод или аккаунты' },
        { status: 400 }
      );
    }

    // Генерация ID сессии
    const sessionId = `earn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Создание задачи на запуск
    const job = {
      id: sessionId,
      methodId,
      accounts: accounts.map((a: any) => a.id),
      status: 'initializing',
      progress: 0,
      createdAt: new Date().toISOString(),
      settings: {
        autoWarming: settings?.autoWarming ?? true,
        proxyMonitoring: settings?.proxyMonitoring ?? true,
        smartRateLimiting: settings?.smartRateLimiting ?? true,
        emergencyStop: settings?.emergencyStop ?? true,
      },
      steps: [
        { id: 'validate', name: 'Проверка аккаунтов', status: 'pending' },
        { id: 'proxy', name: 'Настройка прокси', status: 'pending' },
        { id: 'warming', name: 'Настройка прогрева', status: 'pending' },
        { id: 'campaigns', name: 'Создание кампаний', status: 'pending' },
        { id: 'creatives', name: 'Генерация креативов', status: 'pending' },
        { id: 'launch', name: 'Запуск рассылки', status: 'pending' },
      ],
    };

    // В реальной системе здесь была бы отправка в очередь задач
    // и запуск фонового процесса

    return NextResponse.json({
      success: true,
      sessionId,
      job,
      message: 'Автоматический заработок успешно запущен',
      estimatedSetupTime: '5-10 минут',
      features: {
        accountProtection: true,
        proxyMonitoring: true,
        emergencyStop: true,
        autoRecovery: true,
      },
    });
  } catch (error) {
    console.error('Start earning error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка запуска' },
      { status: 500 }
    );
  }
}

// Получение статуса запущенного заработка
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: 'Не указан sessionId' },
      { status: 400 }
    );
  }

  // В реальной системе здесь был бы запрос к базе данных
  // или к системе очередей для получения статуса

  return NextResponse.json({
    success: true,
    sessionId,
    status: 'running',
    progress: 75,
    accountsActive: 3,
    messagesSent: 150,
    conversions: 5,
    earnings: 45.50,
    lastActivity: new Date().toISOString(),
  });
}

import { NextRequest, NextResponse } from 'next/server';

// Анализ качества аккаунта
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, username, proxy } = body;

    // Имитация анализа аккаунта
    // В реальной системе здесь был бы запрос к Telegram API для проверки
    
    const quality = {
      score: Math.floor(Math.random() * 50) + 30,
      age: Math.floor(Math.random() * 365) + 1,
      hasAvatar: Math.random() > 0.3,
      hasUsername: !!username,
      contactsCount: Math.floor(Math.random() * 100),
      groupsCount: Math.floor(Math.random() * 20),
      messagesSent: Math.floor(Math.random() * 1000),
      lastActive: new Date().toISOString(),
      riskLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      recommendations: generateRecommendations(),
      needsWarming: Math.random() > 0.5,
      warmingDays: Math.floor(Math.random() * 7) + 3,
      proxyHealth: proxy ? 'active' : 'missing',
    };

    // Если есть прокси, добавляем бонус к качеству
    if (proxy) {
      quality.score = Math.min(100, quality.score + 10);
    }

    return NextResponse.json({
      success: true,
      accountId: Date.now().toString(),
      phone,
      username,
      quality,
      proxy: proxy || null,
      status: 'ready',
    });
  } catch (error) {
    console.error('Account analyze error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка анализа аккаунта' },
      { status: 500 }
    );
  }
}

function generateRecommendations(): string[] {
  const allRecommendations = [
    'Добавьте аватар для повышения доверия',
    'Заполните био информацией',
    'Добавьте индивидуальный прокси',
    'Выполните прогрев перед активной работой',
    'Установите статус "онлайн"',
    'Добавьте несколько контактов',
    'Подпишитесь на несколько каналов',
  ];
  
  const count = Math.floor(Math.random() * 3) + 1;
  return allRecommendations.sort(() => 0.5 - Math.random()).slice(0, count);
}

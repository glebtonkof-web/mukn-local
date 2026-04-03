import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/monetization/neuro-coach - Получить информацию о Нейро-коуч
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const coach = await db.neuroCoach.findUnique({
        where: { userId },
      });

      if (!coach) {
        return NextResponse.json({
          success: true,
          coach: {
            id: 'demo-coach',
            userId,
            subscriptionActive: false,
            sessionsCount: 0,
            recommendations: null,
          },
          pricing: {
            monthly: 49,
            yearly: 399,
            features: [
              'Персональные рекомендации по арбитражу',
              'Анализ ваших кампаний',
              'Подсказки по оптимизации',
              'Тренды и инсайты',
              '1-на-1 сессии с ИИ',
            ],
          },
        });
      }

      return NextResponse.json({ success: true, coach });
    }

    // Общая информация
    return NextResponse.json({
      success: true,
      info: {
        name: 'Нейро-Коуч',
        description: 'Персональный ИИ-наставник для арбитража трафика',
        pricing: {
          monthly: 49,
          yearly: 399,
        },
        stats: {
          activeUsers: 850,
          totalSessions: 15000,
          avgImprovement: '35%',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching neuro-coach:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coach info' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/neuro-coach - Начать сессию с коучем
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, question, context } = body;

    // Проверяем подписку
    let coach = await db.neuroCoach.findUnique({
      where: { userId },
    });

    if (!coach) {
      coach = await db.neuroCoach.create({
        data: {
          userId,
          subscriptionActive: false,
          sessionsCount: 0,
        },
      });
    }

    // Если нет подписки - лимит 3 бесплатных вопроса
    if (!coach.subscriptionActive && coach.sessionsCount >= 3) {
      return NextResponse.json({
        success: false,
        error: 'Subscription required',
        message: 'Лимит бесплатных вопросов исчерпан. Подпишитесь для продолжения.',
        pricing: { monthly: 49, yearly: 399 },
      });
    }

    // Генерируем ответ (демо)
    const response = generateCoachResponse(question, context);

    // Обновляем счётчик
    await db.neuroCoach.update({
      where: { userId },
      data: {
        sessionsCount: { increment: 1 },
        recommendations: JSON.stringify(response.recommendations),
      },
    });

    return NextResponse.json({
      success: true,
      response: response.answer,
      recommendations: response.recommendations,
      sessionsRemaining: coach.subscriptionActive ? 'unlimited' : 3 - coach.sessionsCount - 1,
    });
  } catch (error) {
    console.error('Error in neuro-coach session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process session' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/neuro-coach - Подписка
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, plan } = body;

    const months = plan === 'yearly' ? 12 : 1;
    const price = plan === 'yearly' ? 399 : 49;

    const coach = await db.neuroCoach.upsert({
      where: { userId },
      update: {
        subscriptionActive: true,
        subscriptionEndsAt: new Date(Date.now() + months * 30 * 86400000),
      },
      create: {
        userId,
        subscriptionActive: true,
        subscriptionEndsAt: new Date(Date.now() + months * 30 * 86400000),
        sessionsCount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      coach,
      message: `Подписка активирована на ${months} месяц(ев)`,
      price,
    });
  } catch (error) {
    console.error('Error subscribing to neuro-coach:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

function generateCoachResponse(question: string, context: any) {
  const responses = {
    gambling: {
      answer: 'Для gambling-ниши сейчас лучше всего работают кейсы с crash-играми. Рекомендую тестировать Telegram Mini Apps формат - там модерация мягче.',
      recommendations: [
        { type: 'offer', name: 'Crash Game X', network: 'Admitad', payout: 40 },
        { type: 'channel', name: 'Crash Strategy', subscribers: 145000 },
        { type: 'style', name: 'Storytelling', tip: 'Рассказ о "победе"' },
      ],
    },
    crypto: {
      answer: 'Сейчас тренд на Telegram Mini Apps и TON экосистему. Рекомендую офферы связанные с новыми токенами на TON.',
      recommendations: [
        { type: 'offer', name: 'TON Wallet', network: 'Custom', payout: 12 },
        { type: 'trend', name: 'Mini Apps', growth: '+280%' },
      ],
    },
    default: {
      answer: 'Анализирую ваш вопрос. Рекомендую начать с тестирования на маленьком бюджете и постепенно масштабировать успешные связки.',
      recommendations: [
        { type: 'tip', text: 'Начните с $50 бюджета на тест' },
        { type: 'tip', text: 'Используйте 3-5 разных стилей комментариев' },
        { type: 'tip', text: 'Масштабируйте только связки с ROI > 150%' },
      ],
    },
  };

  const lowerQuestion = question.toLowerCase();
  if (lowerQuestion.includes('gambling') || lowerQuestion.includes('казино')) {
    return responses.gambling;
  }
  if (lowerQuestion.includes('crypto') || lowerQuestion.includes('крипто')) {
    return responses.crypto;
  }
  return responses.default;
}

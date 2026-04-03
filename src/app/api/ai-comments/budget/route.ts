// API: Расчёт бюджета с AI-подсказками
// POST /api/ai-comments/budget

import { NextRequest, NextResponse } from 'next/server';
import { getAICommentsEngine } from '@/lib/ai-comments/engine';
import { BudgetCalculationRequest } from '@/lib/ai-comments/types';
import { logger } from '@/lib/logger';

interface BudgetRequest {
  dailyGoal: number;
  conversionRate?: number;
  accountCost?: number;
  proxyCost?: number;
  commentsPerAccount?: number;
  includeProxies?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: BudgetRequest = await request.json();

    if (!body.dailyGoal || body.dailyGoal < 1) {
      return NextResponse.json(
        { error: 'Daily goal must be at least 1' },
        { status: 400 }
      );
    }

    const engine = getAICommentsEngine();
    
    const result = await engine.calculateBudget({
      dailyGoal: body.dailyGoal,
      conversionRate: body.conversionRate || 2, // 2% по умолчанию
      accountCost: body.accountCost || 10, // 10 руб
      proxyCost: body.proxyCost || 5, // 5 руб
      commentsPerAccount: body.commentsPerAccount || 50,
      includeProxies: body.includeProxies ?? true,
    });

    logger.info('Budget calculated', {
      dailyGoal: body.dailyGoal,
      accountsNeeded: result.accountsNeeded,
      dailyBudget: result.dailyBudget,
    });

    // Форматируем для красивого вывода
    const formatted = {
      commentsNeeded: result.commentsNeeded.toLocaleString('ru-RU'),
      accountsNeeded: result.accountsNeeded.toLocaleString('ru-RU'),
      proxiesNeeded: result.proxiesNeeded.toLocaleString('ru-RU'),
      dailyBudget: `${result.dailyBudget.toLocaleString('ru-RU')} ₽`,
      monthlyBudget: `${result.monthlyBudget.toLocaleString('ru-RU')} ₽`,
      breakdown: {
        accounts: `${result.breakdown.accounts.toLocaleString('ru-RU')} ₽`,
        proxies: `${result.breakdown.proxies.toLocaleString('ru-RU')} ₽`,
        total: `${result.breakdown.total.toLocaleString('ru-RU')} ₽`,
      },
    };

    return NextResponse.json({
      success: result.success,
      raw: result,
      formatted,
      recommendations: result.recommendations,
      // Готовые настройки для автозаполнения
      autoFill: {
        accountsCount: result.accountsNeeded,
        proxiesCount: result.proxiesNeeded,
        commentsPerDay: result.commentsNeeded,
        estimatedDailyCost: result.dailyBudget,
      },
    });
  } catch (error) {
    logger.error('Budget calculation API error', error as Error);
    return NextResponse.json(
      { error: 'Failed to calculate budget', details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Получить параметры по умолчанию
export async function GET() {
  return NextResponse.json({
    defaults: {
      conversionRate: 2, // Средняя конверсия из комментария в переход
      accountCost: 10, // Средняя стоимость аккаунта
      proxyCost: 5, // Средняя стоимость прокси
      commentsPerAccount: 50, // Безопасный лимит
      includeProxies: true,
    },
    tips: [
      'Конверсия 2% - это средний показатель. С хорошим текстом может быть 5-10%',
      'Один аккаунт безопасно может оставить 30-70 комментариев в день',
      'Рекомендуется иметь запас 20% аккаунтов на случай банов',
      'Используйте уникальные прокси для каждого аккаунта',
      'Чем выше активность аккаунта, тем ниже риск бана',
    ],
    presets: [
      { name: 'Тестовый запуск', dailyGoal: 50, description: 'Для проверки схемы' },
      { name: 'Небольшой трафик', dailyGoal: 200, description: 'Стабильный трафик' },
      { name: 'Средний объём', dailyGoal: 500, description: 'Оптимальный вариант' },
      { name: 'Масштабирование', dailyGoal: 1000, description: 'Проверенная схема' },
      { name: 'Максимум', dailyGoal: 2000, description: 'Только для опытных' },
    ],
  });
}

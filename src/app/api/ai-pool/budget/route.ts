import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateBudget, formatBudgetCalculation, BudgetSettings, getAIBudgetManager } from '@/lib/ai-budget-manager';
import { nanoid } from 'nanoid';

// GET - Получить текущий статус бюджета
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    const settings = await db.budgetSettings.findFirst({
      where: { userId },
    });
    
    const quotaLogs = await db.aIQuotaLog.findMany({
      where: { provider: 'deepseek' },
      orderBy: { date: 'desc' },
      take: 30,
    });
    
    // Считаем общую экономию от бесплатных API
    const freeApiLogs = await db.aIQuotaLog.findMany({
      where: {
        provider: { in: ['cerebras', 'gemini', 'groq', 'openrouter'] },
      },
    });
    
    const totalSavings = freeApiLogs.reduce((sum, log) => sum + log.estimatedCost, 0);
    
    if (!settings) {
      return NextResponse.json({
        success: true,
        budget: {
          total: 50,
          spent: 0,
          remaining: 50,
          percentUsed: 0,
          isExhausted: false,
        },
        calculation: formatBudgetCalculation(calculateBudget({
          budgetUSD: 50,
          durationHours: 24 * 30,
          model: 'deepseek-chat',
        })),
        savings: {
          total: totalSavings,
          byProvider: {
            cerebras: freeApiLogs.filter(l => l.provider === 'cerebras').reduce((s, l) => s + l.estimatedCost, 0),
            gemini: freeApiLogs.filter(l => l.provider === 'gemini').reduce((s, l) => s + l.estimatedCost, 0),
            groq: freeApiLogs.filter(l => l.provider === 'groq').reduce((s, l) => s + l.estimatedCost, 0),
            openrouter: freeApiLogs.filter(l => l.provider === 'openrouter').reduce((s, l) => s + l.estimatedCost, 0),
          },
        },
        history: quotaLogs.slice(0, 7),
      });
    }
    
    const budgetSettings: BudgetSettings = {
      budgetUSD: settings.deepseekBudget,
      durationHours: 24 * 30,
      model: 'deepseek-chat',
    };
    
    const calculation = calculateBudget(budgetSettings);
    const remaining = settings.deepseekBudget - settings.deepseekSpent;
    
    return NextResponse.json({
      success: true,
      budget: {
        total: settings.deepseekBudget,
        spent: settings.deepseekSpent,
        remaining,
        percentUsed: (settings.deepseekSpent / settings.deepseekBudget) * 100,
        isExhausted: remaining <= 0,
      },
      calculation: {
        ...formatBudgetCalculation({
          ...calculation,
          spentBudget: settings.deepseekSpent,
          remainingBudget: remaining,
        }),
        totalRequests: Math.floor(remaining / 0.00004), // Примерная стоимость запроса
      },
      savings: {
        total: totalSavings,
        byProvider: {
          cerebras: freeApiLogs.filter(l => l.provider === 'cerebras').reduce((s, l) => s + l.estimatedCost, 0),
          gemini: freeApiLogs.filter(l => l.provider === 'gemini').reduce((s, l) => s + l.estimatedCost, 0),
          groq: freeApiLogs.filter(l => l.provider === 'groq').reduce((s, l) => s + l.estimatedCost, 0),
          openrouter: freeApiLogs.filter(l => l.provider === 'openrouter').reduce((s, l) => s + l.estimatedCost, 0),
        },
      },
      history: quotaLogs.slice(0, 7),
    });
  } catch (error) {
    console.error('Budget API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get budget status' },
      { status: 500 }
    );
  }
}

// POST - Обновить настройки бюджета
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const body = await request.json();
    
    const { budgetUSD, durationHours = 24 * 30, resetSpent = false } = body;
    
    if (typeof budgetUSD !== 'number' || budgetUSD < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid budget value' },
        { status: 400 }
      );
    }
    
    const settings = await db.budgetSettings.upsert({
      where: { userId },
      create: {
        id: nanoid(),
        userId,
        deepseekBudget: budgetUSD,
        deepseekSpent: 0,
        totalBudget: budgetUSD * 90, // Примерный курс USD to RUB
        updatedAt: new Date(),
      },
      update: {
        deepseekBudget: budgetUSD,
        ...(resetSpent ? { deepseekSpent: 0 } : {}),
        updatedAt: new Date(),
      },
    });
    
    const manager = getAIBudgetManager(userId);
    await manager.updateBudget(budgetUSD, durationHours);
    
    return NextResponse.json({
      success: true,
      budget: {
        total: settings.deepseekBudget,
        spent: settings.deepseekSpent,
        remaining: settings.deepseekBudget - settings.deepseekSpent,
      },
      calculation: formatBudgetCalculation(calculateBudget({
        budgetUSD: resetSpent ? budgetUSD : budgetUSD - settings.deepseekSpent,
        durationHours,
        model: 'deepseek-chat',
      })),
    });
  } catch (error) {
    console.error('Budget update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}

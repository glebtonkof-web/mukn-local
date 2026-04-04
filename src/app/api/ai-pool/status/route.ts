import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAIDispatcher, ProviderName } from '@/lib/ai-dispatcher';

// Квоты бесплатных API
const QUOTAS: Record<ProviderName, { daily: number; name: string; isFree: boolean }> = {
  cerebras: { daily: 14400, name: 'Cerebras (Llama 3.3 70B)', isFree: true },
  gemini: { daily: 500, name: 'Google Gemini 2.5 Flash', isFree: true },
  groq: { daily: 1000, name: 'Groq (Llama 3.3 70B)', isFree: true },
  openrouter: { daily: 50, name: 'OpenRouter (Free)', isFree: true },
  deepseek: { daily: Infinity, name: 'DeepSeek (Paid)', isFree: false },
};

// GET - Получить статус всех провайдеров
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    const providers = await db.aIProviderSettings.findMany({
      where: { userId },
      orderBy: { priority: 'asc' },
    });
    
    const result = [];
    
    for (const [key, quota] of Object.entries(QUOTAS)) {
      const existing = providers.find(p => p.provider === key);
      
      result.push({
        provider: key,
        name: quota.name,
        isFree: quota.isFree,
        isActive: existing?.isActive ?? false,
        hasApiKey: !!existing?.apiKey,
        dailyQuota: quota.daily,
        dailyUsed: existing?.dailyUsed ?? 0,
        remaining: Math.max(0, quota.daily - (existing?.dailyUsed ?? 0)),
        percentUsed: ((existing?.dailyUsed ?? 0) / quota.daily) * 100,
        totalRequests: existing?.requestsCount ?? 0,
        successRate: existing?.requestsCount 
          ? ((existing.successCount / existing.requestsCount) * 100).toFixed(1)
          : '0',
        avgResponseTime: existing?.lastCheckTime ?? 0,
        lastCheck: existing?.lastCheckAt?.toISOString() ?? null,
        status: existing?.isActive 
          ? (existing.dailyUsed >= quota.daily ? 'quota_exhausted' : 'active')
          : 'inactive',
      });
    }
    
    // Считаем общую статистику
    const totalFreeUsed = result
      .filter(p => p.isFree)
      .reduce((sum, p) => sum + p.dailyUsed, 0);
    
    const totalFreeRemaining = result
      .filter(p => p.isFree)
      .reduce((sum, p) => sum + p.remaining, 0);
    
    const budgetSettings = await db.budgetSettings.findFirst({
      where: { userId },
    });
    
    return NextResponse.json({
      success: true,
      providers: result,
      summary: {
        activeProviders: result.filter(p => p.isActive).length,
        freeUsedToday: totalFreeUsed,
        freeRemainingToday: totalFreeRemaining,
        deepseekBudget: budgetSettings?.deepseekBudget ?? 50,
        deepseekSpent: budgetSettings?.deepseekSpent ?? 0,
        deepseekRemaining: (budgetSettings?.deepseekBudget ?? 50) - (budgetSettings?.deepseekSpent ?? 0),
      },
      recommendations: generateRecommendations(result, budgetSettings),
    });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

// POST - Обновить настройки провайдера
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const body = await request.json();
    
    const { provider, apiKey, isActive, priority, defaultModel } = body;
    
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider name required' },
        { status: 400 }
      );
    }
    
    const quota = QUOTAS[provider as ProviderName];
    if (!quota) {
      return NextResponse.json(
        { success: false, error: 'Unknown provider' },
        { status: 400 }
      );
    }
    
    const settings = await db.aIProviderSettings.upsert({
      where: { 
        provider_userId: { provider, userId } 
      },
      create: {
        userId,
        provider,
        apiKey: apiKey || null,
        defaultModel: defaultModel || null,
        priority: priority ?? 1,
        isActive: isActive ?? true,
        isFree: quota.isFree,
        dailyQuota: quota.daily,
        dailyUsed: 0,
      },
      update: {
        ...(apiKey !== undefined && { apiKey }),
        ...(isActive !== undefined && { isActive }),
        ...(priority !== undefined && { priority }),
        ...(defaultModel !== undefined && { defaultModel }),
      },
    });
    
    return NextResponse.json({
      success: true,
      provider: {
        name: settings.provider,
        isActive: settings.isActive,
        hasApiKey: !!settings.apiKey,
      },
    });
  } catch (error) {
    console.error('Provider update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update provider' },
      { status: 500 }
    );
  }
}

// Генерация рекомендаций
function generateRecommendations(providers: any[], budget: any): string[] {
  const recommendations: string[] = [];
  
  // Проверяем Cerebras
  const cerebras = providers.find(p => p.provider === 'cerebras');
  if (!cerebras?.isActive) {
    recommendations.push('Активируйте Cerebras для 14,400 бесплатных запросов в день');
  }
  
  // Проверяем бюджет DeepSeek
  if (budget && budget.deepseekSpent / budget.deepseekBudget > 0.8) {
    recommendations.push('Бюджет DeepSeek почти исчерпан. Рассмотрите увеличение бюджета или использование бесплатных API');
  }
  
  // Проверяем Groq
  const groq = providers.find(p => p.provider === 'groq');
  if (!groq?.isActive) {
    recommendations.push('Groq предоставляет 1000 бесплатных запросов в день с Llama 3.3 70B');
  }
  
  // Проверяем Gemini
  const gemini = providers.find(p => p.provider === 'gemini');
  if (!gemini?.isActive) {
    recommendations.push('Gemini 2.5 Flash хорош для анализа каналов (500 запросов/день)');
  }
  
  return recommendations;
}

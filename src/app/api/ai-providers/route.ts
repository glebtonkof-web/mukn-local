import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AIManager, PROVIDER_MODELS, type ProviderName } from '@/lib/ai-providers';
import { nanoid } from 'nanoid';

// Демо userId (в реальном приложении из сессии)
const DEMO_USER_ID = 'demo-user';

// GET /api/ai-providers - Получить настройки всех провайдеров
export async function GET() {
  try {
    // Получаем или создаём демо пользователя
    let user = await db.user.findUnique({
      where: { id: DEMO_USER_ID },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          id: DEMO_USER_ID,
          email: 'demo@mukn.traffic',
          name: 'Demo User',
          role: 'admin',
          updatedAt: new Date(),
        },
      });
    }

    // Получаем настройки провайдеров
    let providers = await db.aIProviderSettings.findMany({
      where: { userId: user.id },
      orderBy: { priority: 'asc' },
    });

    // Если настроек нет, создаём дефолтные
    if (providers.length === 0) {
      const defaultProviders = [
        { provider: 'openrouter', priority: 1, isFree: false },
        { provider: 'groq', priority: 2, isFree: true },
        { provider: 'gemini', priority: 3, isFree: true },
        { provider: 'deepseek', priority: 4, isFree: false },
      ];

      for (const p of defaultProviders) {
        await db.aIProviderSettings.create({
          data: {
            id: nanoid(),
            provider: p.provider,
            priority: p.priority,
            isFree: p.isFree,
            isActive: false,
            models: JSON.stringify(PROVIDER_MODELS[p.provider as ProviderName]?.map(m => m.id) || []),
            userId: user.id,
            updatedAt: new Date(),
          },
        });
      }

      providers = await db.aIProviderSettings.findMany({
        where: { userId: user.id },
        orderBy: { priority: 'asc' },
      });
    }

    // Получаем глобальные настройки
    let globalSettings = await db.aIGlobalSettings.findFirst({
      where: { userId: user.id },
    });

    if (!globalSettings) {
      globalSettings = await db.aIGlobalSettings.create({
        data: {
          id: nanoid(),
          autoFallback: true,
          notifyOnSwitch: true,
          useCheapestModel: false,
          minBalanceForSwitch: 5.0,
          userId: user.id,
          updatedAt: new Date(),
        },
      });
    }

    // Формируем ответ
    const response = {
      providers: providers.map(p => ({
        id: p.id,
        provider: p.provider,
        hasApiKey: !!p.apiKey,
        apiKeyPreview: p.apiKey ? `${p.apiKey.slice(0, 8)}...${p.apiKey.slice(-4)}` : null,
        defaultModel: p.defaultModel,
        priority: p.priority,
        isActive: p.isActive,
        isFree: p.isFree,
        balance: p.balance,
        balanceCurrency: p.balanceCurrency,
        lastCheckAt: p.lastCheckAt,
        lastCheckStatus: p.lastCheckStatus,
        lastCheckError: p.lastCheckError,
        lastCheckTime: p.lastCheckTime,
        requestsCount: p.requestsCount,
        successCount: p.successCount,
        errorCount: p.errorCount,
        totalTokensIn: p.totalTokensIn,
        totalTokensOut: p.totalTokensOut,
        totalCost: p.totalCost,
        models: PROVIDER_MODELS[p.provider as ProviderName] || [],
        selectedModel: p.defaultModel,
      })),
      globalSettings: {
        autoFallback: globalSettings.autoFallback,
        notifyOnSwitch: globalSettings.notifyOnSwitch,
        telegramNotify: globalSettings.telegramNotify,
        useCheapestModel: globalSettings.useCheapestModel,
        minBalanceForSwitch: globalSettings.minBalanceForSwitch,
        dailyLimit: globalSettings.dailyLimit,
        monthlyLimit: globalSettings.monthlyLimit,
      },
      availableModels: PROVIDER_MODELS,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to get AI providers:', error);
    return NextResponse.json(
      { error: 'Failed to get AI providers', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/ai-providers - Обновить настройки провайдера
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, defaultModel, priority, isActive } = body;

    // Получаем демо пользователя
    let user = await db.user.findUnique({
      where: { id: DEMO_USER_ID },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          id: DEMO_USER_ID,
          email: 'demo@mukn.traffic',
          name: 'Demo User',
          role: 'admin',
          updatedAt: new Date(),
        },
      });
    }

    // Обновляем настройки провайдера
    const existing = await db.aIProviderSettings.findFirst({
      where: { provider, userId: user.id },
    });

    let result;
    if (existing) {
      result = await db.aIProviderSettings.update({
        where: { id: existing.id },
        data: {
          apiKey: apiKey !== undefined ? apiKey : existing.apiKey,
          defaultModel: defaultModel || existing.defaultModel,
          priority: priority ?? existing.priority,
          isActive: isActive !== undefined ? isActive : existing.isActive,
        },
      });
    } else {
      result = await db.aIProviderSettings.create({
        data: {
          id: nanoid(),
          provider,
          apiKey,
          defaultModel,
          priority: priority ?? 1,
          isActive: isActive ?? false,
          isFree: provider === 'gemini' || provider === 'groq',
          models: JSON.stringify(PROVIDER_MODELS[provider as ProviderName]?.map(m => m.id) || []),
          userId: user.id,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      provider: {
        id: result.id,
        provider: result.provider,
        hasApiKey: !!result.apiKey,
        apiKeyPreview: result.apiKey ? `${result.apiKey.slice(0, 8)}...${result.apiKey.slice(-4)}` : null,
        defaultModel: result.defaultModel,
        priority: result.priority,
        isActive: result.isActive,
      },
    });
  } catch (error) {
    console.error('Failed to update AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to update AI provider', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/ai-providers - Обновить глобальные настройки
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Получаем демо пользователя
    let user = await db.user.findUnique({
      where: { id: DEMO_USER_ID },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          id: DEMO_USER_ID,
          email: 'demo@mukn.traffic',
          name: 'Demo User',
          role: 'admin',
          updatedAt: new Date(),
        },
      });
    }

    // Обновление глобальных настроек
    if (action === 'updateGlobalSettings') {
      let globalSettings = await db.aIGlobalSettings.findFirst({
        where: { userId: user.id },
      });

      if (globalSettings) {
        globalSettings = await db.aIGlobalSettings.update({
          where: { id: globalSettings.id },
          data: {
            autoFallback: data.autoFallback ?? globalSettings.autoFallback,
            notifyOnSwitch: data.notifyOnSwitch ?? globalSettings.notifyOnSwitch,
            telegramNotify: data.telegramNotify ?? globalSettings.telegramNotify,
            useCheapestModel: data.useCheapestModel ?? globalSettings.useCheapestModel,
            minBalanceForSwitch: data.minBalanceForSwitch ?? globalSettings.minBalanceForSwitch,
            dailyLimit: data.dailyLimit ?? globalSettings.dailyLimit,
            monthlyLimit: data.monthlyLimit ?? globalSettings.monthlyLimit,
          },
        });
      } else {
        globalSettings = await db.aIGlobalSettings.create({
          data: {
            id: nanoid(),
            autoFallback: data.autoFallback ?? true,
            notifyOnSwitch: data.notifyOnSwitch ?? true,
            telegramNotify: data.telegramNotify ?? false,
            useCheapestModel: data.useCheapestModel ?? false,
            minBalanceForSwitch: data.minBalanceForSwitch ?? 5.0,
            dailyLimit: data.dailyLimit,
            monthlyLimit: data.monthlyLimit,
            userId: user.id,
            updatedAt: new Date(),
          },
        });
      }

      return NextResponse.json({ success: true, globalSettings });
    }

    // Обновление приоритетов провайдеров
    if (action === 'updatePriorities') {
      const { priorities } = data as { priorities: { provider: string; priority: number }[] };

      for (const p of priorities) {
        await db.aIProviderSettings.updateMany({
          where: { provider: p.provider, userId: user.id },
          data: { priority: p.priority },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update AI settings:', error);
    return NextResponse.json(
      { error: 'Failed to update AI settings', details: String(error) },
      { status: 500 }
    );
  }
}

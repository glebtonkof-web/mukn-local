import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAutoApiKeyManager, FREE_PROVIDER_CONFIGS } from '@/lib/provider-bypass/auto-api-key-manager';
import { nanoid } from 'nanoid';

// GET /api/provider-keys - Получить все ключи провайдеров
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const userId = searchParams.get('userId') || undefined;

    const where: Record<string, unknown> = {};
    if (provider) {
      where.provider = provider;
    }
    if (userId) {
      where.userId = userId;
    }

    const keys = await db.providerApiKey.findMany({
      where,
      orderBy: [
        { provider: 'asc' },
        { priority: 'asc' },
      ],
    });

    // Получаем статистику
    const manager = getAutoApiKeyManager();
    const stats = await manager.getStats(userId);

    return NextResponse.json({
      keys: keys.map(k => ({
        id: k.id,
        provider: k.provider,
        keyName: k.keyName,
        keyType: k.keyType,
        accountEmail: k.accountEmail,
        status: k.status,
        isActive: k.isActive,
        isValidated: k.isValidated,
        lastValidatedAt: k.lastValidatedAt,
        validationError: k.validationError,
        dailyUsed: k.dailyUsed,
        dailyLimit: k.dailyLimit,
        hourlyUsed: k.hourlyUsed,
        hourlyLimit: k.hourlyLimit,
        balance: k.balance,
        balanceCurrency: k.balanceCurrency,
        totalRequests: k.totalRequests,
        successfulRequests: k.successfulRequests,
        failedRequests: k.failedRequests,
        consecutiveErrors: k.consecutiveErrors,
        lastUsedAt: k.lastUsedAt,
        lastError: k.lastError,
        lastErrorAt: k.lastErrorAt,
        cooldownUntil: k.cooldownUntil,
        priority: k.priority,
        autoRegistered: k.autoRegistered,
        createdAt: k.createdAt,
        // Показываем только часть ключа для безопасности
        apiKeyPreview: k.apiKey ? `${k.apiKey.slice(0, 8)}...${k.apiKey.slice(-4)}` : null,
      })),
      stats,
      freeProviders: FREE_PROVIDER_CONFIGS,
    });
  } catch (error) {
    console.error('Failed to get provider keys:', error);
    return NextResponse.json(
      { error: 'Failed to get provider keys', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/provider-keys - Добавить новый ключ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    const manager = getAutoApiKeyManager();

    // Добавление нового ключа
    if (action === 'addKey') {
      const { provider, apiKey, apiSecret, keyName, keyType, accountEmail, userId } = data;

      if (!provider || !apiKey) {
        return NextResponse.json(
          { error: 'Provider and apiKey are required' },
          { status: 400 }
        );
      }

      const result = await manager.addApiKey({
        provider,
        apiKey,
        apiSecret,
        keyName,
        keyType,
        accountEmail,
        userId,
      });

      if (result.success) {
        return NextResponse.json({
          success: true,
          keyId: result.keyId,
          message: 'API key added and validated successfully',
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.error,
        }, { status: 400 });
      }
    }

    // Валидация ключа
    if (action === 'validateKey') {
      const { keyId } = data;

      if (!keyId) {
        return NextResponse.json(
          { error: 'keyId is required' },
          { status: 400 }
        );
      }

      const result = await manager.validateKey(keyId);

      return NextResponse.json({
        success: true,
        isValid: result.isValid,
        balance: result.balance,
        remainingQuota: result.remainingQuota,
        error: result.error,
      });
    }

    // Валидация всех ключей
    if (action === 'validateAll') {
      const { userId } = data;
      await manager.validateAllKeys(userId);
      return NextResponse.json({ success: true, message: 'All keys validated' });
    }

    // Обеспечить минимальное количество ключей
    if (action === 'ensureMinimum') {
      const { userId } = data;
      await manager.ensureMinimumKeys(userId);
      return NextResponse.json({ success: true, message: 'Minimum keys ensured' });
    }

    // Сброс дневных квот
    if (action === 'resetDaily') {
      await manager.resetDailyQuotas();
      return NextResponse.json({ success: true, message: 'Daily quotas reset' });
    }

    // Получить лучший ключ для провайдера
    if (action === 'getBestKey') {
      const { provider, userId } = data;

      if (!provider) {
        return NextResponse.json(
          { error: 'Provider is required' },
          { status: 400 }
        );
      }

      const key = await manager.getBestKey(provider, userId);

      return NextResponse.json({
        success: true,
        key: key ? {
          id: key.id,
          // Не возвращаем полный ключ через API
          apiKeyPreview: key.apiKey ? `${key.apiKey.slice(0, 8)}...${key.apiKey.slice(-4)}` : null,
        } : null,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to process provider keys request:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/provider-keys - Обновить ключ
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyId, updates } = body;

    if (!keyId) {
      return NextResponse.json(
        { error: 'keyId is required' },
        { status: 400 }
      );
    }

    const allowedUpdates = [
      'keyName', 'priority', 'isActive', 'dailyLimit', 'hourlyLimit',
    ];

    const filteredUpdates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const key = await db.providerApiKey.update({
      where: { id: keyId },
      data: filteredUpdates,
    });

    return NextResponse.json({
      success: true,
      key: {
        id: key.id,
        provider: key.provider,
        keyName: key.keyName,
        priority: key.priority,
        isActive: key.isActive,
      },
    });
  } catch (error) {
    console.error('Failed to update provider key:', error);
    return NextResponse.json(
      { error: 'Failed to update provider key', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/provider-keys - Удалить ключ
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('keyId');

    if (!keyId) {
      return NextResponse.json(
        { error: 'keyId is required' },
        { status: 400 }
      );
    }

    await db.providerApiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({
      success: true,
      message: 'API key deleted',
    });
  } catch (error) {
    console.error('Failed to delete provider key:', error);
    return NextResponse.json(
      { error: 'Failed to delete provider key', details: String(error) },
      { status: 500 }
    );
  }
}

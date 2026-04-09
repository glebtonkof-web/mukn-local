/**
 * Provider Keys API
 * 
 * Управление API ключами провайдеров
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAutoApiKeyManager } from '@/lib/provider-bypass/auto-api-key-manager';
import { ProviderType } from '@/lib/provider-bypass/provider-limit-registry';

const keyManager = getAutoApiKeyManager();

/**
 * GET /api/provider-keys
 * Получить все API ключи
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    const stats = await keyManager.getStats();

    if (provider) {
      const keys = await keyManager.getActiveKeys(provider);
      return NextResponse.json({
        success: true,
        provider,
        keys: keys.map(k => ({
          id: k.id,
          status: k.status,
          dailyUsed: k.dailyUsed,
          dailyLimit: k.dailyLimit,
          priority: k.priority,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('[ProviderKeys] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/provider-keys
 * Добавить API ключ
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, apiSecret, keyName, accountEmail, userId } = body;

    if (!provider || !apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Required: provider, apiKey',
      }, { status: 400 });
    }

    const result = await keyManager.addApiKey({
      provider,
      apiKey,
      apiSecret,
      keyName,
      accountEmail,
      userId,
    });

    return NextResponse.json({
      success: result.success,
      keyId: result.keyId,
      error: result.error,
      message: result.success 
        ? `API ключ для ${provider} успешно добавлен и валидирован`
        : result.error,
    });

  } catch (error) {
    console.error('[ProviderKeys] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/provider-keys
 * Удалить API ключ
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('keyId');

    if (!keyId) {
      return NextResponse.json({
        success: false,
        error: 'Required: keyId',
      }, { status: 400 });
    }

    // Удаляем ключ через Prisma
    const { db } = await import('@/lib/db');
    
    await db.providerApiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({
      success: true,
      message: 'API ключ удалён',
    });

  } catch (error) {
    console.error('[ProviderKeys] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/provider-keys
 * Валидировать ключ
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyId } = body;

    if (!keyId) {
      return NextResponse.json({
        success: false,
        error: 'Required: keyId',
      }, { status: 400 });
    }

    const result = await keyManager.validateKey(keyId);

    return NextResponse.json({
      success: result.isValid,
      keyId,
      balance: result.balance,
      remainingQuota: result.remainingQuota,
      error: result.error,
    });

  } catch (error) {
    console.error('[ProviderKeys] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

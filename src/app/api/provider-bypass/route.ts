/**
 * Provider Bypass API
 * 
 * API endpoints для управления системой обхода ограничений провайдеров
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import {
  getBypassStrategyEngine,
  getProviderLimitRegistry,
  getProviderRotationManager,
  initializeBypassSystem,
  ProviderType,
} from '@/lib/provider-bypass';

// GET /api/provider-bypass/status - Получить статус системы
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status': {
        const engine = getBypassStrategyEngine();
        const stats = engine.getStats();
        
        return NextResponse.json({
          success: true,
          data: {
            ...stats,
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'providers': {
        const registry = getProviderLimitRegistry();
        const providers = registry.getAvailableProviders();
        
        return NextResponse.json({
          success: true,
          data: providers,
        });
      }

      case 'accounts': {
        const rotationManager = getProviderRotationManager();
        const accountStats = rotationManager.getAccountsStats();
        
        return NextResponse.json({
          success: true,
          data: accountStats,
        });
      }

      case 'recommendations': {
        const registry = getProviderLimitRegistry();
        const recommendations: Array<{
          provider: ProviderType;
          currentRate: number;
          recommendedRate: number;
          healthScore: number;
          issues: string[];
        }> = [];
        
        // Собираем рекомендации для всех провайдеров
        const providers = ['cerebras', 'groq', 'gemini', 'deepseek', 'openrouter'] as ProviderType[];
        for (const provider of providers) {
          const limits = registry.getLimits(provider);
          const stats = registry.getUsageStats(provider);
          
          const issues: string[] = [];
          let healthScore = 100;
          
          if (limits.dailyQuota && stats.currentDayRequests >= limits.dailyQuota * 0.9) {
            issues.push('Дневная квота почти исчерпана');
            healthScore -= 30;
          }
          
          if (stats.consecutiveErrors > 0) {
            issues.push(`Последовательные ошибки: ${stats.consecutiveErrors}`);
            healthScore -= stats.consecutiveErrors * 10;
          }
          
          recommendations.push({
            provider,
            currentRate: limits.requestsPerMinute || 0,
            recommendedRate: limits.requestsPerMinute || 0,
            healthScore: Math.max(0, healthScore),
            issues,
          });
        }
        
        return NextResponse.json({
          success: true,
          data: recommendations,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Provider Bypass API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/provider-bypass - Управление аккаунтами и конфигурацией
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'add-account': {
        const account = await db.providerAccount.create({
          data: {
            id: nanoid(),
            provider: data.provider,
            apiKey: data.apiKey,
            email: data.email,
            password: data.password,
            proxyHost: data.proxy?.host,
            proxyPort: data.proxy?.port,
            proxyUsername: data.proxy?.username,
            proxyPassword: data.proxy?.password,
            proxyType: data.proxy?.type,
            priority: data.priority || 1,
            dailyLimit: data.dailyLimit,
            hourlyLimit: data.hourlyLimit,
            isActive: true,
            status: 'active',
            userId: data.userId,
          },
        });

        // Регистрируем в rotation manager
        const rotationManager = getProviderRotationManager();
        rotationManager.registerAccount({
          id: account.id,
          provider: account.provider as ProviderType,
          apiKey: account.apiKey || undefined,
          email: account.email || undefined,
          password: account.password || undefined,
          proxyHost: account.proxyHost || undefined,
          proxyPort: account.proxyPort || undefined,
          proxyUsername: account.proxyUsername || undefined,
          proxyPassword: account.proxyPassword || undefined,
          proxyType: account.proxyType as 'http' | 'https' | 'socks4' | 'socks5' | undefined,
          isActive: account.isActive,
          status: account.status as 'active' | 'cooldown' | 'exhausted' | 'banned' | 'error',
          priority: account.priority,
          dailyLimit: account.dailyLimit || undefined,
          hourlyLimit: account.hourlyLimit || undefined,
          dailyUsed: account.dailyUsed,
          hourlyUsed: account.hourlyUsed,
          totalRequests: account.totalRequests,
          successfulRequests: account.successfulRequests,
          consecutiveErrors: account.consecutiveErrors,
          lastError: account.lastError || undefined,
          lastUsedAt: account.lastUsedAt || undefined,
          cooldownUntil: account.cooldownUntil || undefined,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        });

        return NextResponse.json({
          success: true,
          data: account,
        });
      }

      case 'add-accounts-batch': {
        const accounts = data.accounts as Array<{
          provider: string;
          apiKey?: string;
          email?: string;
          password?: string;
          proxy?: {
            host: string;
            port: number;
            username?: string;
            password?: string;
            type?: string;
          };
          priority?: number;
          dailyLimit?: number;
        }>;

        const created = await db.$transaction(
          accounts.map(acc =>
            db.providerAccount.create({
              data: {
                id: nanoid(),
                provider: acc.provider,
                apiKey: acc.apiKey,
                email: acc.email,
                password: acc.password,
                proxyHost: acc.proxy?.host,
                proxyPort: acc.proxy?.port,
                proxyUsername: acc.proxy?.username,
                proxyPassword: acc.proxy?.password,
                proxyType: acc.proxy?.type,
                priority: acc.priority || 1,
                dailyLimit: acc.dailyLimit,
                isActive: true,
                status: 'active',
                userId: data.userId,
              },
            })
          )
        );

        // Регистрируем все аккаунты
        const rotationManager = getProviderRotationManager();
        for (const account of created) {
          rotationManager.registerAccount({
            id: account.id,
            provider: account.provider as ProviderType,
            apiKey: account.apiKey || undefined,
            email: account.email || undefined,
            password: account.password || undefined,
            proxyHost: account.proxyHost || undefined,
            proxyPort: account.proxyPort || undefined,
            proxyUsername: account.proxyUsername || undefined,
            proxyPassword: account.proxyPassword || undefined,
            proxyType: account.proxyType as 'http' | 'https' | 'socks4' | 'socks5' | undefined,
            isActive: account.isActive,
            status: account.status as 'active' | 'cooldown' | 'exhausted' | 'banned' | 'error',
            priority: account.priority,
            dailyLimit: account.dailyLimit || undefined,
            hourlyLimit: account.hourlyLimit || undefined,
            dailyUsed: account.dailyUsed,
            hourlyUsed: account.hourlyUsed,
            totalRequests: account.totalRequests,
            successfulRequests: account.successfulRequests,
            consecutiveErrors: account.consecutiveErrors,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          });
        }

        return NextResponse.json({
          success: true,
          data: { count: created.length },
        });
      }

      case 'update-account': {
        const account = await db.providerAccount.update({
          where: { id: data.id },
          data: {
            ...data.updates,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          data: account,
        });
      }

      case 'delete-account': {
        await db.providerAccount.delete({
          where: { id: data.id },
        });

        const rotationManager = getProviderRotationManager();
        rotationManager.unregisterAccount(data.id);

        return NextResponse.json({
          success: true,
        });
      }

      case 'configure': {
        const config = await db.bypassConfiguration.upsert({
          where: { userId: data.userId },
          create: {
            id: nanoid(),
            userId: data.userId,
            enabledStrategies: JSON.stringify(data.enabledStrategies),
            fallbackChain: JSON.stringify(data.fallbackChain),
            maxRetries: data.maxRetries,
            retryDelayMs: data.retryDelayMs,
            retryBackoff: data.retryBackoff,
            requestTimeoutMs: data.requestTimeoutMs,
            totalTimeoutMs: data.totalTimeoutMs,
            maxCostPerRequest: data.maxCostPerRequest,
            dailyCostLimit: data.dailyCostLimit,
            monthlyCostLimit: data.monthlyCostLimit,
            adaptiveRateEnabled: data.adaptiveRateEnabled,
            initialRate: data.initialRate,
            minRate: data.minRate,
            maxRate: data.maxRate,
            rotateProxyOnLimit: data.rotateProxyOnLimit,
            stickyProxySession: data.stickyProxySession,
            notifyOnLimit: data.notifyOnLimit,
            notifyOnExhaustion: data.notifyOnExhaustion,
            notifyOnBanned: data.notifyOnBanned,
          },
          update: {
            enabledStrategies: JSON.stringify(data.enabledStrategies),
            fallbackChain: JSON.stringify(data.fallbackChain),
            maxRetries: data.maxRetries,
            retryDelayMs: data.retryDelayMs,
            retryBackoff: data.retryBackoff,
            requestTimeoutMs: data.requestTimeoutMs,
            totalTimeoutMs: data.totalTimeoutMs,
            maxCostPerRequest: data.maxCostPerRequest,
            dailyCostLimit: data.dailyCostLimit,
            monthlyCostLimit: data.monthlyCostLimit,
            adaptiveRateEnabled: data.adaptiveRateEnabled,
            initialRate: data.initialRate,
            minRate: data.minRate,
            maxRate: data.maxRate,
            rotateProxyOnLimit: data.rotateProxyOnLimit,
            stickyProxySession: data.stickyProxySession,
            notifyOnLimit: data.notifyOnLimit,
            notifyOnExhaustion: data.notifyOnExhaustion,
            notifyOnBanned: data.notifyOnBanned,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          data: config,
        });
      }

      case 'reset-daily': {
        const engine = getBypassStrategyEngine();
        engine.resetDailyStats();

        await db.providerAccount.updateMany({
          data: {
            dailyUsed: 0,
            hourlyUsed: 0,
            status: 'active',
            consecutiveErrors: 0,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Daily stats reset',
        });
      }

      case 'initialize': {
        // Загружаем все аккаунты из БД
        const accounts = await db.providerAccount.findMany({
          where: { isActive: true },
        });

        // Инициализируем систему
        const system = await initializeBypassSystem({
          accounts: accounts.map(acc => ({
            id: acc.id,
            provider: acc.provider,
            apiKey: acc.apiKey || undefined,
            email: acc.email || undefined,
            password: acc.password || undefined,
            proxy: acc.proxyHost ? {
              host: acc.proxyHost,
              port: acc.proxyPort!,
              username: acc.proxyUsername || undefined,
              password: acc.proxyPassword || undefined,
              type: acc.proxyType || 'http',
            } : undefined,
            priority: acc.priority,
            dailyLimit: acc.dailyLimit || undefined,
          })),
        });

        return NextResponse.json({
          success: true,
          data: {
            accountsLoaded: accounts.length,
            providers: [...new Set(accounts.map(a => a.provider))],
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Provider Bypass API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

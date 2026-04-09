/**
 * API Endpoints для 24/365 генерации
 * 
 * Управление непрерывной генерацией контента
 */

import { NextRequest, NextResponse } from 'next/server';
import { getInfiniteGenerationManager, InfiniteGenerationConfig } from '@/lib/provider-bypass/infinite-generation-manager';
import { getAutoRegistrationService } from '@/lib/provider-bypass/auto-registration-service';
import { getProxyPoolManager } from '@/lib/provider-bypass/proxy-pool-manager';
import { getHealthMonitor } from '@/lib/provider-bypass/health-monitor-service';
import { ProviderType } from '@/lib/provider-bypass/provider-limit-registry';

const generationManager = getInfiniteGenerationManager();
const registrationService = getAutoRegistrationService();
const proxyManager = getProxyPoolManager();
const healthMonitor = getHealthMonitor();

/**
 * GET /api/infinite-generation
 * Получить список всех генераторов и их статус
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        const generators = generationManager.getActiveGenerators();
        return NextResponse.json({
          success: true,
          generators: generators.map(g => ({
            id: g.id,
            status: g.state.status,
            generated: g.state.generated,
            errors: g.state.errors,
            currentProvider: g.state.currentProvider,
            lastSuccessAt: g.state.lastSuccessAt,
            lastErrorAt: g.state.lastErrorAt,
            nextGenerationAt: g.state.nextGenerationAt,
            stats: {
              totalGenerated: g.stats.totalGenerated,
              successfulGenerated: g.stats.successfulGenerated,
              successRate: g.stats.successRate,
              avgGenerationTime: g.stats.avgGenerationTime,
              todayGenerated: g.stats.todayGenerated,
              byProvider: g.stats.byProvider,
            },
          })),
        });

      case 'status':
        const generatorId = searchParams.get('id');
        if (!generatorId) {
          return NextResponse.json({ error: 'Generator ID required' }, { status: 400 });
        }
        
        const state = generationManager.getState(generatorId);
        const stats = generationManager.getStats(generatorId);
        
        if (!state) {
          return NextResponse.json({ error: 'Generator not found' }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          state,
          stats,
        });

      case 'health':
        const health = await healthMonitor.getSystemHealth();
        return NextResponse.json({
          success: true,
          health,
        });

      case 'metrics':
        const metrics = healthMonitor.getPrometheusMetrics();
        return new NextResponse(metrics, {
          headers: { 'Content-Type': 'text/plain' },
        });

      case 'proxies':
        const proxyStats = proxyManager.getPoolStats();
        const activeProxies = proxyManager.getActiveProxies();
        return NextResponse.json({
          success: true,
          stats: proxyStats,
          proxies: activeProxies.map(p => ({
            id: p.id,
            host: p.host,
            port: p.port,
            type: p.type,
            country: p.country,
            status: p.status,
            responseTime: p.responseTime,
            successRate: p.successRate,
          })),
        });

      case 'registration':
        const providers = registrationService.getAvailableProviders();
        return NextResponse.json({
          success: true,
          providers: providers.map(p => ({
            provider: p.provider,
            category: p.category,
            isFree: p.isFree,
            dailyQuota: p.dailyQuota,
            requiresPhone: p.requiresPhone,
            requiresCard: p.requiresCard,
          })),
        });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] Infinite generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/infinite-generation
 * Создать или управлять генератором
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'start':
        const config: InfiniteGenerationConfig = {
          id: params.id || undefined,
          name: params.name || 'Untitled Generator',
          contentType: params.contentType || 'text',
          prompts: params.prompts || ['Generate content'],
          intervalSeconds: params.intervalSeconds || 60,
          randomizeInterval: params.randomizeInterval || false,
          intervalMinSeconds: params.intervalMinSeconds,
          intervalMaxSeconds: params.intervalMaxSeconds,
          preferredProviders: params.preferredProviders || ['cerebras', 'groq', 'gemini'],
          fallbackProviders: params.fallbackProviders || ['openrouter', 'deepseek'],
          autoSwitchOnLimit: params.autoSwitchOnLimit !== false,
          maxGenerations: params.maxGenerations,
          maxGenerationsPerDay: params.maxGenerationsPerDay,
          maxGenerationsPerHour: params.maxGenerationsPerHour,
          maxCostPerDay: params.maxCostPerDay,
          style: params.style,
          negativePrompt: params.negativePrompt,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
          maxRetries: params.maxRetries || 3,
          retryDelayMs: params.retryDelayMs || 5000,
          pauseOnErrorCount: params.pauseOnErrorCount || 5,
          autoResumeMinutes: params.autoResumeMinutes || 30,
          notifyOnSuccess: params.notifyOnSuccess || false,
          notifyOnError: params.notifyOnError || true,
          notifyOnLimit: params.notifyOnLimit || true,
          notifyOnSwitch: params.notifyOnSwitch || true,
          telegramChatId: params.telegramChatId,
          webhookUrl: params.webhookUrl,
          webhookOnSuccess: params.webhookOnSuccess,
          webhookOnError: params.webhookOnError,
          metadata: params.metadata,
          userId: params.userId,
          campaignId: params.campaignId,
          influencerId: params.influencerId,
        };

        const startResult = await generationManager.startGeneration(config);
        
        return NextResponse.json({
          success: startResult.success,
          generatorId: startResult.generatorId,
          error: startResult.error,
        });

      case 'stop':
        if (!params.generatorId) {
          return NextResponse.json({ error: 'Generator ID required' }, { status: 400 });
        }
        
        const stopResult = await generationManager.stopGeneration(params.generatorId);
        return NextResponse.json({ success: stopResult.success });

      case 'pause':
        if (!params.generatorId) {
          return NextResponse.json({ error: 'Generator ID required' }, { status: 400 });
        }
        
        const pauseResult = await generationManager.pauseGeneration(params.generatorId);
        return NextResponse.json({ success: pauseResult.success });

      case 'resume':
        if (!params.generatorId) {
          return NextResponse.json({ error: 'Generator ID required' }, { status: 400 });
        }
        
        const resumeResult = await generationManager.resumeGeneration(params.generatorId);
        return NextResponse.json({ success: resumeResult.success });

      case 'register':
        // Создать задачу на регистрацию аккаунта
        if (!params.provider) {
          return NextResponse.json({ error: 'Provider required' }, { status: 400 });
        }
        
        const regResult = await registrationService.createRegistrationTask({
          provider: params.provider as ProviderType,
          proxyId: params.proxyId,
          priority: params.priority,
        });
        
        return NextResponse.json({
          success: true,
          taskId: regResult.taskId,
          status: regResult.status,
        });

      case 'register-batch':
        // Массовая регистрация
        if (!params.provider || !params.count) {
          return NextResponse.json({ error: 'Provider and count required' }, { status: 400 });
        }
        
        const batchResult = await registrationService.createBatchRegistrationTasks({
          provider: params.provider as ProviderType,
          count: params.count,
          proxyIds: params.proxyIds,
        });
        
        return NextResponse.json({
          success: true,
          tasks: batchResult,
        });

      case 'registration-status':
        if (!params.taskId) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }
        
        const taskStatus = await registrationService.getTaskStatus(params.taskId);
        
        if (!taskStatus) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          task: taskStatus,
        });

      case 'add-proxy':
        if (!params.host || !params.port) {
          return NextResponse.json({ error: 'Host and port required' }, { status: 400 });
        }
        
        const proxy = await proxyManager.addProxy({
          host: params.host,
          port: params.port,
          type: params.type || 'http',
          username: params.username,
          password: params.password,
          country: params.country,
          city: params.city,
        });
        
        return NextResponse.json({
          success: true,
          proxy: {
            id: proxy.id,
            host: proxy.host,
            port: proxy.port,
            type: proxy.type,
            status: proxy.status,
            isWorking: proxy.isWorking,
          },
        });

      case 'import-proxies':
        if (!params.content || !params.format) {
          return NextResponse.json({ error: 'Content and format required' }, { status: 400 });
        }
        
        const importResult = await proxyManager.importFromFile(
          params.content,
          params.format
        );
        
        return NextResponse.json({
          success: true,
          ...importResult,
        });

      case 'remove-proxy':
        if (!params.proxyId) {
          return NextResponse.json({ error: 'Proxy ID required' }, { status: 400 });
        }
        
        const removeResult = await proxyManager.removeProxy(params.proxyId);
        return NextResponse.json({ success: removeResult });

      case 'acknowledge-alert':
        if (!params.alertId) {
          return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
        }
        
        healthMonitor.acknowledgeAlert(params.alertId);
        return NextResponse.json({ success: true });

      case 'resolve-alert':
        if (!params.alertId) {
          return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
        }
        
        healthMonitor.resolveAlert(params.alertId);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] Infinite generation POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/infinite-generation
 * Удалить генератор или связанные данные
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    switch (action) {
      case 'generator':
        if (!id) {
          return NextResponse.json({ error: 'Generator ID required' }, { status: 400 });
        }
        
        const stopRes = await generationManager.stopGeneration(id);
        return NextResponse.json({ success: stopRes.success });

      case 'proxy':
        if (!id) {
          return NextResponse.json({ error: 'Proxy ID required' }, { status: 400 });
        }
        
        const removeRes = await proxyManager.removeProxy(id);
        return NextResponse.json({ success: removeRes });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] Infinite generation DELETE error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

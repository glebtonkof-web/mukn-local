/**
 * Quick Start API for 24/365 Generation
 * 
 * Простой endpoint для быстрого запуска генерации
 */

import { NextRequest, NextResponse } from 'next/server';
import { getInfiniteGenerationManager } from '@/lib/provider-bypass/infinite-generation-manager';
import { getAutoApiKeyManager } from '@/lib/provider-bypass/auto-api-key-manager';

/**
 * GET /api/quick-start
 * Получить статус и инструкции
 */
export async function GET(request: NextRequest) {
  const manager = getInfiniteGenerationManager();
  const keyManager = getAutoApiKeyManager();
  
  const stats = await keyManager.getStats();
  const generators = manager.getActiveGenerators();
  
  return NextResponse.json({
    success: true,
    message: '24/365 Generation System',
    status: {
      apiKeys: {
        total: stats.totalKeys,
        active: stats.activeKeys,
        byProvider: stats.byProvider,
      },
      generators: {
        total: generators.length,
        running: generators.filter(g => g.state.status === 'running').length,
        paused: generators.filter(g => g.state.status === 'paused').length,
      },
    },
    quickStart: {
      text: {
        description: 'Запустить генерацию текста 24/365',
        endpoint: 'POST /api/quick-start',
        body: {
          type: 'text',
          prompts: ['Ваш промпт здесь'],
          intervalSeconds: 60,
        },
      },
      video: {
        description: 'Запустить генерацию видео 24/365',
        endpoint: 'POST /api/quick-start',
        body: {
          type: 'video',
          prompts: ['Создай видео о природе'],
          intervalSeconds: 1800,
        },
      },
      image: {
        description: 'Запустить генерацию изображений 24/365',
        endpoint: 'POST /api/quick-start',
        body: {
          type: 'image',
          prompts: ['Красивый пейзаж'],
          intervalSeconds: 120,
        },
      },
    },
  });
}

/**
 * POST /api/quick-start
 * Быстрый запуск генерации
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, prompts, intervalSeconds, maxPerDay, style } = body;

    if (!type || !prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Required: type (text|video|image|audio), prompts (array)',
      }, { status: 400 });
    }

    const manager = getInfiniteGenerationManager();

    // Настраиваем провайдеры по типу контента
    const providerConfigs = {
      text: {
        preferred: ['cerebras', 'groq', 'gemini', 'openrouter'],
        fallback: ['deepseek'],
      },
      video: {
        preferred: ['minimax', 'kling', 'luma', 'runway'],
        fallback: ['pollo', 'pika'],
      },
      image: {
        preferred: ['stability'],
        fallback: [],
      },
      audio: {
        preferred: ['elevenlabs'],
        fallback: [],
      },
    };

    const config = providerConfigs[type as keyof typeof providerConfigs] || providerConfigs.text;

    const result = await manager.startGeneration({
      name: `Quick Start ${type} Generator`,
      contentType: type as 'text' | 'video' | 'image' | 'audio',
      prompts,
      intervalSeconds: intervalSeconds || (type === 'video' ? 1800 : 60),
      preferredProviders: config.preferred as any,
      fallbackProviders: config.fallback as any,
      autoSwitchOnLimit: true,
      maxGenerationsPerDay: maxPerDay || 1000,
      style,
      maxRetries: 3,
      retryDelayMs: 5000,
      pauseOnErrorCount: 5,
      autoResumeMinutes: 30,
      notifyOnError: true,
      notifyOnLimit: true,
    });

    return NextResponse.json({
      success: result.success,
      generatorId: result.generatorId,
      message: result.success 
        ? `Генератор ${type} запущен! Будет генерировать контент каждые ${intervalSeconds || 60} секунд.`
        : result.error,
      status: result.success ? 'running' : 'failed',
      nextStep: result.success 
        ? `Проверьте статус: GET /api/infinite-generation?action=status&id=${result.generatorId}`
        : null,
    });

  } catch (error) {
    console.error('[QuickStart] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

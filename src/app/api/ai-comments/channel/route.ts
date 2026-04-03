// API: Анализ канала перед спамом
// POST /api/ai-comments/channel

import { NextRequest, NextResponse } from 'next/server';
import { getAICommentsEngine } from '@/lib/ai-comments/engine';
import { ChannelAnalysisRequest, OfferTheme } from '@/lib/ai-comments/types';
import { logger } from '@/lib/logger';

interface ChannelRequest {
  posts: string[];
  channelName?: string;
  subscriberCount?: number;
  targetOffer?: OfferTheme;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChannelRequest = await request.json();

    if (!body.posts || body.posts.length === 0) {
      return NextResponse.json(
        { error: 'Posts are required for analysis' },
        { status: 400 }
      );
    }

    const engine = getAICommentsEngine();
    
    const result = await engine.analyzeChannel({
      posts: body.posts,
      channelName: body.channelName,
      subscriberCount: body.subscriberCount,
    });

    logger.info('Channel analyzed', {
      postsCount: body.posts.length,
      topic: result.topic,
      tone: result.tone,
      hasModeration: result.hasModeration,
    });

    // Определяем подходит ли канал под оффер
    let suitabilityScore = 0;
    let recommendation = result.recommendation;

    if (body.targetOffer && result.suitableForOffers) {
      suitabilityScore = result.suitableForOffers[body.targetOffer] || 0;
      
      if (suitabilityScore < 0.3) {
        recommendation = `⚠️ Канал НЕ подходит для оффера "${body.targetOffer}". Рекомендуется поискать другой канал.`;
      } else if (suitabilityScore < 0.5) {
        recommendation = `⚡ Канал слабо подходит. Будьте осторожны, конверсия может быть низкой.`;
      } else if (suitabilityScore < 0.7) {
        recommendation = `✅ Канал подходит. Хорошая вероятность успеха.`;
      } else {
        recommendation = `🎯 Канал отлично подходит! Высокая вероятность успеха.`;
      }
    }

    // Формируем предупреждения
    const warnings: string[] = [...result.warnings];
    if (result.hasModeration) {
      warnings.push('🛡️ Обнаружена активная модерация. Комментарии могут удаляться.');
    }
    if (result.engagement === 'low') {
      warnings.push('📉 Низкая вовлечённость аудитории. Конверсия может быть низкой.');
    }

    return NextResponse.json({
      success: result.success,
      analysis: {
        topic: result.topic,
        tone: result.tone,
        hasModeration: result.hasModeration,
        engagement: result.engagement,
      },
      suitability: {
        score: suitabilityScore,
        targetOffer: body.targetOffer,
        allOffers: result.suitableForOffers,
      },
      recommendation,
      warnings,
      // Быстрый вердикт
      verdict: {
        canSpam: suitabilityScore >= 0.3 && !result.hasModeration,
        riskLevel: result.hasModeration ? 'high' : suitabilityScore >= 0.5 ? 'low' : 'medium',
        expectedConversion: result.engagement === 'high' ? 'high' : result.engagement === 'medium' ? 'medium' : 'low',
      },
    });
  } catch (error) {
    logger.error('Channel analysis API error', error as Error);
    return NextResponse.json(
      { error: 'Failed to analyze channel', details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Получить справку
export async function GET() {
  return NextResponse.json({
    toneOptions: [
      { id: 'positive', label: 'Позитивный', description: 'Позитивная атмосфера' },
      { id: 'negative', label: 'Негативный', description: 'Критика, жалобы' },
      { id: 'neutral', label: 'Нейтральный', description: 'Информационный стиль' },
      { id: 'mixed', label: 'Смешанный', description: 'Разные тона' },
    ],
    engagementLevels: [
      { id: 'low', label: 'Низкая', description: 'Мало реакций и комментариев' },
      { id: 'medium', label: 'Средняя', description: 'Умеренная активность' },
      { id: 'high', label: 'Высокая', description: 'Много реакций и обсуждений' },
    ],
    tips: [
      'Анализируйте минимум 3-5 последних постов канала',
      'Проверяйте наличие модерации по удалённым комментариям',
      'Сопоставляйте тему канала с вашим оффером',
      'Учитывайте тон канала при генерации комментариев',
    ],
  });
}

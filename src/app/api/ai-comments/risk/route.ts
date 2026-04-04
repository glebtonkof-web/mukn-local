// API: Юридический риск-анализ
// POST /api/ai-comments/risk

import { NextRequest, NextResponse } from 'next/server';
import { getAICommentsEngine } from '@/lib/ai-comments/engine';
import { RiskAnalysisRequest, PromotionMethod, OfferTheme } from '@/lib/ai-comments/types';
import { logger } from '@/lib/logger';

interface RiskRequest {
  offerTheme: OfferTheme;
  sampleText?: string;
  promotionMethod: PromotionMethod;
  targetRegion?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RiskRequest = await request.json();

    if (!body.offerTheme) {
      return NextResponse.json(
        { error: 'Offer theme is required' },
        { status: 400 }
      );
    }

    const engine = getAICommentsEngine();
    const result = await engine.analyzeRisk({
      offerTheme: body.offerTheme,
      sampleText: body.sampleText,
      promotionMethod: body.promotionMethod || 'native_ad',
      targetRegion: body.targetRegion,
    });

    logger.info('Risk analysis completed', {
      offerTheme: body.offerTheme,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
    });

    // Формируем предупреждение для UI
    const warning = {
      level: result.riskLevel,
      color: result.riskLevel === 'green' ? '#00D26A' : result.riskLevel === 'yellow' ? '#FFB800' : '#FF4D4D',
      title: result.riskLevel === 'green' 
        ? 'Низкий риск' 
        : result.riskLevel === 'yellow' 
          ? 'Средний риск' 
          : 'Высокий риск',
      message: result.warningText,
      articles: result.possibleArticles,
      recommendation: result.recommendation,
      score: result.riskScore,
    };

    return NextResponse.json({
      success: result.success,
      warning,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      possibleArticles: result.possibleArticles,
      warningText: result.warningText,
      recommendation: result.recommendation,
      details: result.details,
    });
  } catch (error) {
    logger.error('Risk analysis API error', error as Error);
    return NextResponse.json(
      { error: 'Failed to analyze risk', details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Получить справку по методам продвижения
export async function GET() {
  return NextResponse.json({
    promotionMethods: [
      { id: 'bait', label: 'Байт/Кликбейт', riskLevel: 'high', description: 'Заманивание интригой' },
      { id: 'direct_ad', label: 'Прямая реклама', riskLevel: 'medium', description: 'Открытое указание продукта' },
      { id: 'fake_review', label: 'Фейковый отзыв', riskLevel: 'high', description: 'Отзыв от "реального пользователя"' },
      { id: 'native_ad', label: 'Нативная реклама', riskLevel: 'low', description: 'Встроенная в контент' },
      { id: 'influencer', label: 'Через инфлюенсера', riskLevel: 'medium', description: 'Реклама через блогера' },
    ],
    riskLevels: {
      green: { label: 'Низкий', color: '#00D26A', description: 'Минимальные юридические риски' },
      yellow: { label: 'Средний', color: '#FFB800', description: 'Есть риски, требуется осторожность' },
      red: { label: 'Высокий', color: '#FF4D4D', description: 'Серьёзные риски, возможны последствия' },
    },
    legalArticles: {
      '159 УК РФ': 'Мошенничество',
      '171.2 УК РФ': 'Незаконные организация и проведение азартных игр',
      '174 УК РФ': 'Легализация денежных средств',
      '182 УК РФ': 'Нарушение авторских прав',
      '200.3 УК РФ': 'Нарушение требований к распространению информации',
    },
  });
}

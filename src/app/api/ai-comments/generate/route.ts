// API: Генерация AI-комментариев
// POST /api/ai-comments/generate

import { NextRequest, NextResponse } from 'next/server';
import { getAICommentsEngine } from '@/lib/ai-comments/engine';
import { CommentContext, CommentGenerationConfig, OfferTheme, CommentStyle } from '@/lib/ai-comments/types';
import { logger } from '@/lib/logger';

interface GenerateRequest {
  context: CommentContext;
  count?: number;
  config?: Partial<CommentGenerationConfig>;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    if (!body.context?.postText) {
      return NextResponse.json(
        { error: 'Post text is required' },
        { status: 400 }
      );
    }

    const engine = getAICommentsEngine(body.config);
    const result = await engine.generateComments(
      body.context,
      body.count || 3,
      body.config
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Generation failed' },
        { status: 500 }
      );
    }

    logger.info('Comments generated', {
      count: result.comments.length,
      style: body.config?.style,
      offerTheme: body.config?.offerTheme,
    });

    return NextResponse.json({
      success: true,
      comments: result.comments,
      metadata: {
        generatedAt: new Date().toISOString(),
        provider: 'deepseek',
        model: body.config?.model || 'deepseek-chat',
      },
    });
  } catch (error) {
    logger.error('Comment generation API error', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate comments', details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Получить настройки по умолчанию
export async function GET() {
  return NextResponse.json({
    defaultConfig: {
      model: 'deepseek-chat',
      temperature: 0.9,
      maxTokens: 200,
      language: 'ru',
      maxLength: 300,
      minLength: 50,
    },
    offerThemes: [
      { id: 'gambling', label: 'Казино/Гемблинг' },
      { id: 'crypto', label: 'Криптовалюта' },
      { id: 'bait', label: 'Байт/Кликбейт' },
      { id: 'nutra', label: 'Нутра/Здоровье' },
      { id: 'dating', label: 'Дейтинг' },
      { id: 'finance', label: 'Финансы' },
      { id: 'lifestyle', label: 'Лайфстайл' },
    ],
    styles: [
      { id: 'casual', label: 'Небрежный', description: 'Разговорный, как другу' },
      { id: 'expert', label: 'Экспертный', description: 'Уверенный, со знанием дела' },
      { id: 'friendly', label: 'Дружелюбный', description: 'Тёплый, поддерживающий' },
      { id: 'provocative', label: 'Провокационный', description: 'Цепляющий, эмоциональный' },
      { id: 'storytelling', label: 'История', description: 'Личный опыт' },
      { id: 'humor', label: 'С юмором', description: 'Лёгкий, с шуткой' },
    ],
  });
}

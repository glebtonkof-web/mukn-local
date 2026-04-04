// API: Перегенерация после удаления модерацией
// POST /api/ai-comments/regenerate

import { NextRequest, NextResponse } from 'next/server';
import { getAICommentsEngine } from '@/lib/ai-comments/engine';
import { RegenerationRequest, OfferTheme } from '@/lib/ai-comments/types';
import { logger } from '@/lib/logger';

interface RegenerateRequest {
  originalComment: string;
  postText: string;
  offerTheme: OfferTheme;
  deletionReason?: string;
  previousAttempts?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RegenerateRequest = await request.json();

    if (!body.originalComment || !body.postText) {
      return NextResponse.json(
        { error: 'Original comment and post text are required' },
        { status: 400 }
      );
    }

    const engine = getAICommentsEngine();
    
    const result = await engine.regenerateAfterDeletion({
      originalComment: body.originalComment,
      postText: body.postText,
      offerTheme: body.offerTheme,
      deletionReason: body.deletionReason,
      previousAttempts: body.previousAttempts,
    });

    logger.info('Comment regenerated', {
      success: result.success,
      changesMade: result.changesMade.length,
      saferVersion: result.saferVersion,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to regenerate comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newComment: result.newComment,
      changesMade: result.changesMade,
      saferVersion: result.saferVersion,
      // Сравнение
      comparison: {
        original: {
          text: body.originalComment,
          length: body.originalComment.length,
        },
        new: {
          text: result.newComment,
          length: result.newComment.length,
        },
      },
      // Рекомендации
      tips: generateTips(result.changesMade),
    });
  } catch (error) {
    logger.error('Regeneration API error', error as Error);
    return NextResponse.json(
      { error: 'Failed to regenerate comment', details: String(error) },
      { status: 500 }
    );
  }
}

function generateTips(changes: string[]): string[] {
  const tips: string[] = [];
  
  if (changes.includes('Комментарий короче')) {
    tips.push('💡 Короткие комментарии реже вызывают подозрение');
  }
  if (changes.includes('Комментарий длиннее')) {
    tips.push('💡 Более развёрнутые комментарии выглядят естественнее');
  }
  if (changes.includes('Полностью изменён словарный состав')) {
    tips.push('💡 Новый комментарий полностью отличается от удалённого');
  }
  if (changes.includes('Изменено количество эмодзи')) {
    tips.push('💡 Эмодзи помогают выглядеть как обычный пользователь');
  }
  
  tips.push('⏰ Подождите 5-10 минут перед повторной отправкой');
  tips.push('🔄 Рекомендуется отправить с другого аккаунта');
  
  return tips;
}

// GET - Получить частые причины удаления
export async function GET() {
  return NextResponse.json({
    commonDeletionReasons: [
      { id: 'spam', label: 'Спам', description: 'Распознан как массовая рассылка' },
      { id: 'offtopic', label: 'Оффтоп', description: 'Не относится к теме поста' },
      { id: 'promo', label: 'Реклама', description: 'Явная реклама/ссылки' },
      { id: 'duplicate', label: 'Дубликат', description: 'Похожий комментарий уже есть' },
      { id: 'suspicious', label: 'Подозрительный', description: 'Выглядит как бот' },
    ],
    antiPatternTips: [
      'Избегайте одинаковых фраз в разных комментариях',
      'Не используйте прямые призывы к действию',
      'Варьируйте длину комментариев',
      'Добавляйте контекст, связанный с постом',
      'Используйте разные эмодзи',
      'Пишите как реальный пользователь, а не рекламщик',
    ],
    retryStrategy: {
      delay: '5-15 минут',
      useDifferentAccount: true,
      maxAttempts: 3,
      cooldownAfterMax: '1 час',
    },
  });
}

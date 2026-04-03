// API: Умные ответы в диалоге
// POST /api/ai-comments/dialogue

import { NextRequest, NextResponse } from 'next/server';
import { getAICommentsEngine } from '@/lib/ai-comments/engine';
import { DialogueContext, OfferTheme } from '@/lib/ai-comments/types';
import { logger } from '@/lib/logger';

interface DialogueRequest {
  ourComment: string;
  userReply: string;
  offerTheme: OfferTheme;
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: DialogueRequest = await request.json();

    if (!body.ourComment || !body.userReply) {
      return NextResponse.json(
        { error: 'Our comment and user reply are required' },
        { status: 400 }
      );
    }

    const engine = getAICommentsEngine();
    
    const result = await engine.generateDialogueReply({
      ourComment: body.ourComment,
      userReply: body.userReply,
      offerTheme: body.offerTheme,
      previousMessages: body.previousMessages,
    });

    logger.info('Dialogue reply generated', {
      success: result.success,
      riskLevel: result.riskLevel,
      shouldContinue: result.shouldContinue,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to generate reply' },
        { status: 500 }
      );
    }

    // Анализируем тип ответа пользователя
    const replyAnalysis = analyzeUserReply(body.userReply);

    return NextResponse.json({
      success: true,
      reply: result.reply,
      riskLevel: result.riskLevel,
      shouldContinue: result.shouldContinue,
      replyAnalysis,
      // Рекомендации
      recommendations: generateRecommendations(result.riskLevel, replyAnalysis),
      // История диалога (для продолжения)
      dialogueHistory: [
        ...(body.previousMessages || []),
        { role: 'assistant' as const, content: body.ourComment },
        { role: 'user' as const, content: body.userReply },
        { role: 'assistant' as const, content: result.reply },
      ],
    });
  } catch (error) {
    logger.error('Dialogue API error', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate dialogue reply', details: String(error) },
      { status: 500 }
    );
  }
}

function analyzeUserReply(reply: string): {
  type: 'question' | 'agreement' | 'disagreement' | 'curiosity' | 'suspicion' | 'neutral';
  sentiment: 'positive' | 'negative' | 'neutral';
  needsResponse: boolean;
} {
  const lowerReply = reply.toLowerCase();
  
  // Определяем тип
  let type: 'question' | 'agreement' | 'disagreement' | 'curiosity' | 'suspicion' | 'neutral' = 'neutral';
  
  if (lowerReply.includes('?')) {
    type = 'question';
  } else if (/\b(да|согласен|верно|точно|\+1|👍)\b/i.test(lowerReply)) {
    type = 'agreement';
  } else if (/\b(нет|не|нельзя|плохо|минус|-1)\b/i.test(lowerReply)) {
    type = 'disagreement';
  } else if (/\b(как|где|почему|что|сколько|интересно|расскажи)\b/i.test(lowerReply)) {
    type = 'curiosity';
  } else if (/\b(спам|бот|реклама|развод|скам|подозр)\b/i.test(lowerReply)) {
    type = 'suspicion';
  }
  
  // Определяем тональность
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  
  if (/\b(спасибо|круто|класс|супер|огонь|🔥|❤️|👍)\b/i.test(lowerReply)) {
    sentiment = 'positive';
  } else if (/\b(плохо|ужасно|дерьмо|бред|глупо|👎)\b/i.test(lowerReply)) {
    sentiment = 'negative';
  }
  
  return {
    type,
    sentiment,
    needsResponse: type === 'question' || type === 'curiosity' || type === 'suspicion',
  };
}

function generateRecommendations(
  riskLevel: 'safe' | 'caution' | 'danger',
  analysis: { type: string; sentiment: string; needsResponse: boolean }
): string[] {
  const recommendations: string[] = [];
  
  if (riskLevel === 'danger') {
    recommendations.push('🚨 Ответ содержит подозрительные паттерны. Рекомендуется не отправлять.');
  }
  
  if (analysis.type === 'suspicion') {
    recommendations.push('⚠️ Пользователь подозревает спам. Лучше прекратить диалог.');
  }
  
  if (analysis.type === 'question' && riskLevel === 'safe') {
    recommendations.push('✅ Можно продолжить диалог, отвечая на вопрос.');
  }
  
  if (analysis.sentiment === 'positive') {
    recommendations.push('💚 Позитивная реакция - хороший знак для продолжения.');
  }
  
  if (analysis.type === 'agreement') {
    recommendations.push('👍 Пользователь согласен - можно мягко продолжить тему.');
  }
  
  if (!analysis.needsResponse) {
    recommendations.push('💭 Ответ не обязателен, можно пропустить.');
  }
  
  return recommendations;
}

// GET - Получить стратегии диалога
export async function GET() {
  return NextResponse.json({
    dialogueStrategies: [
      {
        type: 'question',
        label: 'Вопрос',
        strategy: 'Отвечать коротко и по делу, не раскрывая оффер',
      },
      {
        type: 'agreement',
        label: 'Согласие',
        strategy: 'Поддержать диалог, добавить своё мнение',
      },
      {
        type: 'disagreement',
        label: 'Несогласие',
        strategy: 'Не спорить, вежливо завершить или сменить тему',
      },
      {
        type: 'curiosity',
        label: 'Любопытство',
        strategy: 'Дать загадочный ответ, интригу',
      },
      {
        type: 'suspicion',
        label: 'Подозрение',
        strategy: 'Прекратить диалог, не палить аккаунт',
      },
    ],
    safePatterns: [
      'Личное мнение без рекламы',
      'Вопрос обратно',
      'Эмоциональная реакция',
      'Короткое согласие/несогласие',
    ],
    dangerPatterns: [
      'Прямые ссылки',
      'Призывы к действию',
      'Слова "подпишись", "переходи"',
      'Явная реклама',
      'Извинения за спам',
    ],
  });
}

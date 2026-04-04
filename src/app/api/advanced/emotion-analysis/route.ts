// API: Эмоциональный анализ постов (УРОВЕНЬ 1, функция 3)
import { NextRequest, NextResponse } from 'next/server';
import { analyzeEmotionalContext, generateEmotionallyAwareComment } from '@/lib/advanced-ai-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postContent, offerInfo, userId, generateComment } = body;
    
    if (!postContent || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: postContent, userId' },
        { status: 400 }
      );
    }
    
    // Анализируем эмоциональный контекст
    const emotionalProfile = await analyzeEmotionalContext(postContent, userId);
    
    // Если нужно, генерируем комментарий
    let comment = null;
    if (generateComment && offerInfo) {
      comment = await generateEmotionallyAwareComment(
        postContent,
        offerInfo,
        emotionalProfile,
        userId
      );
    }
    
    return NextResponse.json({
      success: true,
      emotionalProfile,
      comment,
    });
  } catch (error) {
    console.error('[EmotionAnalysis API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze emotion', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

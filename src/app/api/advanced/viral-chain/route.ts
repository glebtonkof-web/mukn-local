// API: Вирусные цепочки комментариев (УРОВЕНЬ 1, функция 2)
import { NextRequest, NextResponse } from 'next/server';
import { generateViralChain } from '@/lib/advanced-ai-engine';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postContent, offerInfo, userId, autoStart, targetChannelId } = body;
    
    if (!postContent || !offerInfo || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: postContent, offerInfo, userId' },
        { status: 400 }
      );
    }
    
    const scenario = await generateViralChain(postContent, offerInfo, userId);
    
    // Если autoStart, создаём цепочку в базе
    let chainId: string | null = null;
    if (autoStart && scenario.steps.length > 0) {
      const chain = await db.viralCommentChain.create({
        data: {
          scenario: JSON.stringify(scenario.steps),
          totalSteps: scenario.steps.length,
          status: 'running',
          startedAt: new Date(),
          targetChannelId: targetChannelId || 'unknown',
        },
      });
      chainId = chain.id;
    }
    
    return NextResponse.json({
      success: true,
      scenario,
      chainId,
    });
  } catch (error) {
    console.error('[ViralChain API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate viral chain', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Получение активных цепочек
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'running';
    
    const chains = await db.viralCommentChain.findMany({
      where: { status },
      include: { comments: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    return NextResponse.json({
      success: true,
      chains,
    });
  } catch (error) {
    console.error('[ViralChain API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chains' },
      { status: 500 }
    );
  }
}

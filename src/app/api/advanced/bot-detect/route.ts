// API: Детект ботов в канале (УРОВЕНЬ 2, функция 10)
import { NextRequest, NextResponse } from 'next/server';
import { detectBots } from '@/lib/advanced-ai-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, subscriberSample, userId } = body;
    
    if (!channelId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: channelId, userId' },
        { status: 400 }
      );
    }
    
    const result = await detectBots(
      channelId,
      subscriberSample || [],
      userId
    );
    
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[BotDetect API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to detect bots', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

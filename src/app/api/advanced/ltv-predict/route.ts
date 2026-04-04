// API: Прогноз LTV по каналу (УРОВЕНЬ 2, функция 9)
import { NextRequest, NextResponse } from 'next/server';
import { predictChannelLTV } from '@/lib/advanced-ai-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, channelData, offerNiche, userId } = body;
    
    if (!channelId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: channelId, userId' },
        { status: 400 }
      );
    }
    
    const prediction = await predictChannelLTV(
      channelId,
      channelData || {},
      offerNiche || 'general',
      userId
    );
    
    return NextResponse.json({
      success: true,
      prediction,
    });
  } catch (error) {
    console.error('[LTVPredict API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to predict LTV', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

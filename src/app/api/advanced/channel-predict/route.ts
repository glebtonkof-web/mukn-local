// API: Предиктивный анализ канала (УРОВЕНЬ 1, функция 1)
import { NextRequest, NextResponse } from 'next/server';
import { predictChannelBehavior } from '@/lib/advanced-ai-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, channelData, userId } = body;
    
    if (!channelId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: channelId, userId' },
        { status: 400 }
      );
    }
    
    const prediction = await predictChannelBehavior(channelId, channelData || {}, userId);
    
    return NextResponse.json({
      success: true,
      prediction,
    });
  } catch (error) {
    console.error('[ChannelPrediction API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze channel', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

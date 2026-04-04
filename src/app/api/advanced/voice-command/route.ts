// API: Голосовое управление (УРОВЕНЬ 4, функция 20)
import { NextRequest, NextResponse } from 'next/server';
import { processVoiceCommand } from '@/lib/advanced-ai-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, userId } = body;
    
    if (!transcript || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: transcript, userId' },
        { status: 400 }
      );
    }
    
    const result = await processVoiceCommand(transcript, userId);
    
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[VoiceCommand API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice command', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

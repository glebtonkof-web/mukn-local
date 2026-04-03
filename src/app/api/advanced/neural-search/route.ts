// API: Нейросетевой поиск каналов (УРОВЕНЬ 2, функция 6)
import { NextRequest, NextResponse } from 'next/server';
import { neuralChannelSearch } from '@/lib/advanced-ai-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filters, userId } = body;
    
    if (!query || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: query, userId' },
        { status: 400 }
      );
    }
    
    const results = await neuralChannelSearch(query, filters || {}, userId);
    
    return NextResponse.json({
      success: true,
      results,
      query,
    });
  } catch (error) {
    console.error('[NeuralSearch API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search channels', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

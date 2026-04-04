import { NextRequest, NextResponse } from 'next/server';
import { audienceEmotionAnalyzer } from '@/lib/advanced-features';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get('sourceType') || 'channel';
    const sourceId = searchParams.get('sourceId') || undefined;
    const analysis = await audienceEmotionAnalyzer.analyze(sourceType, sourceId);
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

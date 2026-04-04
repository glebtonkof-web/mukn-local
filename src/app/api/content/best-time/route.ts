import { NextRequest, NextResponse } from 'next/server';
import { bestTimePredictor } from '@/lib/advanced-features';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'telegram';
    const influencerId = searchParams.get('influencerId') || undefined;

    const analysis = await bestTimePredictor.analyze(platform, influencerId);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestDay = Object.entries(analysis.weekdayScores).sort((a, b) => b[1] - a[1])[0];
    
    const recommendation = analysis.recommendations.length > 0
      ? analysis.recommendations.join('. ')
      : `Лучший день: ${bestDay?.[0] || 'Unknown'}`;

    return NextResponse.json({
      platform,
      bestTimes: analysis.bestTimes,
      weekdayScores: analysis.weekdayScores,
      recommendation,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platform = body.platform || 'telegram';
    const nextTime = await bestTimePredictor.getNext(platform);
    return NextResponse.json({ nextBestTime: nextTime.toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

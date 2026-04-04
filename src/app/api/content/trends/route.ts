import { NextRequest, NextResponse } from 'next/server';
import { trendAdapter } from '@/lib/advanced-features';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get('niche') || 'general';
    const limit = parseInt(searchParams.get('limit') || '10');
    const trends = await trendAdapter.getTrends(niche, limit);
    return NextResponse.json({ niche, trends: trends.map(t => ({ id: t.id, topic: t.topic, popularity: t.popularity })), count: trends.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { niche } = body;
    const ideas = await trendAdapter.getIdeas(niche || 'general');
    return NextResponse.json({ ideas, count: ideas.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

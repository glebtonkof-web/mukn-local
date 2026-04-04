import { NextRequest, NextResponse } from 'next/server';
import { contentIdeasGenerator } from '@/lib/advanced-features';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    let date = dateStr ? new Date(dateStr) : new Date();
    const ideas = await contentIdeasGenerator.getIdeasForDate(date);
    return NextResponse.json({ ideas });
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
    const { niche, platform, count } = body;

    const ideas = await contentIdeasGenerator.generateWeeklyIdeas(
      niche || 'general',
      platform || 'telegram',
      count || 7
    );

    return NextResponse.json({ success: true, ideas, count: ideas.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

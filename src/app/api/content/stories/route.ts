import { NextRequest, NextResponse } from 'next/server';
import { storiesSlides } from '@/lib/advanced-features';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const stories = await storiesSlides.getStories(limit);
    return NextResponse.json({ stories });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, platform, slidesCount } = body;

    if (!topic) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 });
    }

    const result = await storiesSlides.generate({
      platform: platform || 'instagram',
      topic,
      slidesCount: slidesCount || 5,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

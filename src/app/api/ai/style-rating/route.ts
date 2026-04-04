import { NextRequest, NextResponse } from 'next/server';
import { aiStyleRating } from '@/lib/advanced-features';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';
    const rating = await aiStyleRating.getRating(userId);
    return NextResponse.json(rating);
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
    const { userId, contentId, originalContent, userEdit, accepted, rating } = body;

    if (!userId || !contentId) {
      return NextResponse.json({ error: 'userId and contentId are required' }, { status: 400 });
    }

    await aiStyleRating.recordFeedback(userId, {
      contentId,
      originalContent: originalContent || '',
      userEdit,
      accepted: accepted ?? true,
      rating,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

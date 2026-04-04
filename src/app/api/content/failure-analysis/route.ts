import { NextRequest, NextResponse } from 'next/server';
import { failureAnalyzer } from '@/lib/advanced-features';

export async function GET(request: NextRequest) {
  try {
    const patterns = await failureAnalyzer.getPatterns(10);
    return NextResponse.json(patterns);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId } = body;
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }
    const analysis = await failureAnalyzer.analyze(postId);
    return NextResponse.json({ postId, ...analysis });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

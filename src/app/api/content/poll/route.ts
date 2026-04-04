import { NextRequest, NextResponse } from 'next/server';
import { interactivePolls } from '@/lib/advanced-features';

export async function GET(request: NextRequest) {
  try {
    const polls = await interactivePolls.history(20);
    return NextResponse.json({ polls });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, topic, optionsCount } = body;

    const result = await interactivePolls.generate({
      platform: platform || 'telegram',
      topic,
      optionsCount: optionsCount || 4,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

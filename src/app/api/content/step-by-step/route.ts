import { NextRequest, NextResponse } from 'next/server';
import { stepByStep } from '@/lib/advanced-features';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentType, prompt, platform, influencerId } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const generationId = await stepByStep.start({
      contentType: contentType || 'post',
      prompt,
      platform,
      influencerId,
    });

    return NextResponse.json({ success: true, id: generationId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const status = await stepByStep.getStatus(id);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, edit, step } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'ID and action are required' }, { status: 400 });
    }

    switch (action) {
      case 'pause':
        await stepByStep.pause(id);
        return NextResponse.json({ success: true });
      case 'resume':
        await stepByStep.resume(id);
        return NextResponse.json({ success: true });
      case 'cancel':
        await stepByStep.cancel(id);
        return NextResponse.json({ success: true });
      case 'edit':
        if (!edit || !step) {
          return NextResponse.json({ error: 'Edit content and step are required' }, { status: 400 });
        }
        await stepByStep.edit(id, edit, step);
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { memeGenerator } from '@/lib/advanced-features';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templates = searchParams.get('templates');
    
    if (templates === 'true') {
      const templateList = memeGenerator.getTemplates();
      return NextResponse.json({ templates: templateList });
    }
    
    const memes = await memeGenerator.list(20);
    return NextResponse.json({ memes });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, autoGenerate } = body;

    const result = await memeGenerator.generate({
      topic: topic || '',
      autoGenerate: autoGenerate ?? true,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

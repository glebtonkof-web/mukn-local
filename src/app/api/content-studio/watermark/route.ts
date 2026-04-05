import { NextRequest, NextResponse } from 'next/server';
import { contentStudio } from '@/lib/content-studio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, path, options } = body;
    
    let result;
    if (type === 'video') {
      result = await contentStudio.removeWatermark.fromVideo(path, options);
    } else {
      result = await contentStudio.removeWatermark.fromImage(path, options);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

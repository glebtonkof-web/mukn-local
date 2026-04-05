import { NextRequest, NextResponse } from 'next/server';

const VIDEO_GEN_URL = process.env.VIDEO_GEN_URL || 'http://localhost:8766';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${VIDEO_GEN_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Video gen service error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Video gen status error:', error);
    
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        providers: {},
        queue: {}
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.CONTENT_STUDIO_URL || 'http://localhost:8767';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '50';
    
    const params = new URLSearchParams({ limit });
    if (status) params.append('status', status);
    
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/tasks?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Python service returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Content Studio tasks API error:', error);
    return NextResponse.json(
      { tasks: [], error: 'Service unavailable' },
      { status: 503 }
    );
  }
}

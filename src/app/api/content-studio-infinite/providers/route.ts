import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.CONTENT_STUDIO_URL || 'http://localhost:8767';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/providers`, {
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
    console.error('Content Studio providers API error:', error);
    return NextResponse.json(
      { providers: [], error: 'Service unavailable' },
      { status: 503 }
    );
  }
}

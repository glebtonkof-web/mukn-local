import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.CONTENT_STUDIO_URL || 'http://localhost:8767';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/accounts/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Python service returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Content Studio register API error:', error);
    return NextResponse.json(
      { success: false, error: 'Service unavailable', details: String(error) },
      { status: 503 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024' } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Validate size
    const validSizes = [
      '1024x1024',
      '768x1344',
      '864x1152',
      '1344x768',
      '1152x864',
      '1440x720',
      '720x1440',
    ];

    if (!validSizes.includes(size)) {
      return NextResponse.json(
        { error: 'Invalid size. Must be one of: ' + validSizes.join(', ') },
        { status: 400 }
      );
    }

    try {
      const zai = await ZAI.create();

      const response = await zai.images.generations.create({
        prompt,
        size: size as '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440',
      });

      if (response.data && response.data[0]?.base64) {
        const imageBase64 = response.data[0].base64;
        const dataUrl = `data:image/png;base64,${imageBase64}`;

        return NextResponse.json({
          success: true,
          image: dataUrl,
          prompt,
          size,
        });
      }

      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    } catch (aiError: unknown) {
      console.error('AI Image generation error:', aiError);
      
      // Return a more graceful error with demo data
      return NextResponse.json({
        success: false,
        error: 'AI service temporarily unavailable',
        message: aiError instanceof Error ? aiError.message : 'Unknown error',
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

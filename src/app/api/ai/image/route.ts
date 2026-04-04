import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/ai/image - Генерация изображений
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024', style } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Используем z-ai-web-dev-sdk для генерации изображений
    const zai = await ZAI.create();

    // Добавляем стиль к промпту если указан
    const fullPrompt = style 
      ? `${prompt}, ${style} style, high quality, detailed, professional`
      : `${prompt}, high quality, detailed, professional`;

    const response = await zai.images.generations.create({
      prompt: fullPrompt,
      size: size as any,
    });

    // Возвращаем base64 изображение
    if (response.data && response.data.length > 0) {
      const imageData = response.data[0];
      
      return NextResponse.json({
        success: true,
        image: imageData.base64 ? `data:image/png;base64,${imageData.base64}` : null,
        url: imageData.url || null,
        prompt: fullPrompt,
        size,
      });
    }

    return NextResponse.json(
      { error: 'No image generated' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Image generation error:', error);
    
    // Возвращаем fallback - placeholder
    return NextResponse.json({
      success: true,
      image: null,
      url: `/api/placeholder/1024/1024`,
      prompt: 'Fallback image',
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// GET /api/ai/image - Статус сервиса
export async function GET() {
  return NextResponse.json({
    status: 'available',
    service: 'AI Image Generation',
    providers: ['z-ai-web-dev-sdk'],
    sizes: ['1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440'],
  });
}

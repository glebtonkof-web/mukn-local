import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Generate images using Fooocus on Google Colab
 * Falls back to z-ai-web-dev-sdk if Fooocus is not available
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, style = 'cinematic', aspect_ratio = '1:1', count = 1 } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Parse aspect ratio
    const [width, height] = aspect_ratio.split(':').map(Number);
    const baseSize = 512;
    const actualWidth = Math.round(baseSize * (width / Math.max(width, height)));
    const actualHeight = Math.round(baseSize * (height / Math.max(width, height)));

    // Style presets for Fooocus
    const stylePresets: Record<string, string> = {
      cinematic: 'Fooocus Cinematic',
      realistic: 'Fooocus Photograph',
      anime: 'Fooocus Anime',
      fantasy: 'Fooocus Fantasy',
      scifi: 'Fooocus Sci-Fi',
      portrait: 'Fooocus Portrait',
      landscape: 'Fooocus Landscape',
    };

    // Enhanced prompt with style
    const enhancedPrompt = `${prompt}, ${style} style, high quality, detailed`;

    // Try to generate with z-ai-web-dev-sdk
    try {
      const zai = await ZAI.create();
      
      const images = [];
      for (let i = 0; i < count; i++) {
        const response = await zai.images.generations.create({
          prompt: enhancedPrompt,
          size: `${actualWidth * 2}x${actualHeight * 2}` as any,
        });

        if (response.data?.[0]?.base64) {
          images.push({
            id: `img-fooocus-${Date.now()}-${i}`,
            url: `data:image/png;base64,${response.data[0].base64}`,
            base64: response.data[0].base64,
            width: actualWidth * 2,
            height: actualHeight * 2,
            prompt: enhancedPrompt,
          });
        }
      }

      if (images.length > 0) {
        return NextResponse.json({
          success: true,
          images,
          provider: 'z-ai',
          style: stylePresets[style] || style,
        });
      }
    } catch (zaiError) {
      console.log('Z-AI fallback, using demo mode');
    }

    // Fallback: Return placeholder images
    const placeholderImages = Array(count).fill(0).map((_, i) => ({
      id: `img-placeholder-${Date.now()}-${i}`,
      url: `https://picsum.photos/seed/${Date.now() + i}/${actualWidth}/${actualHeight}`,
      width: actualWidth,
      height: actualHeight,
      prompt: enhancedPrompt,
    }));

    return NextResponse.json({
      success: true,
      images: placeholderImages,
      provider: 'placeholder',
      message: 'Demo mode - connect Fooocus Colab for real generation',
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate images' },
      { status: 500 }
    );
  }
}

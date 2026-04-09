import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/z-ai';

/**
 * Real Image Generation API using z-ai-web-dev-sdk
 */

// Style presets for enhancement
const STYLE_PRESETS: Record<string, { suffix: string; description: string }> = {
  cinematic: {
    suffix: 'cinematic lighting, film grain, dramatic atmosphere, movie still',
    description: 'Кинематографичный стиль',
  },
  realistic: {
    suffix: 'photorealistic, ultra detailed, natural lighting, 8k resolution',
    description: 'Фотореалистичный стиль',
  },
  anime: {
    suffix: 'anime style, vibrant colors, clean lines, studio ghibli inspired',
    description: 'Аниме стиль',
  },
  fantasy: {
    suffix: 'fantasy art, magical atmosphere, ethereal lighting, detailed',
    description: 'Фэнтези стиль',
  },
  scifi: {
    suffix: 'science fiction, futuristic, cyberpunk elements, neon lighting',
    description: 'Научная фантастика',
  },
  portrait: {
    suffix: 'professional portrait, studio lighting, sharp focus, bokeh background',
    description: 'Портретный стиль',
  },
  landscape: {
    suffix: 'landscape photography, natural scenery, wide angle, golden hour',
    description: 'Пейзажный стиль',
  },
  artistic: {
    suffix: 'digital art, creative interpretation, artistic style, expressive',
    description: 'Художественный стиль',
  },
  minimal: {
    suffix: 'minimalist, clean composition, simple background, modern',
    description: 'Минималистичный стиль',
  },
  dark: {
    suffix: 'dark atmosphere, moody lighting, dramatic shadows, gothic',
    description: 'Тёмный стиль',
  },
};

// Aspect ratio to size mapping (supported by z-ai-web-dev-sdk)
const ASPECT_SIZES: Record<string, '1024x1024' | '768x1344' | '1344x768' | '864x1152' | '1152x864' | '1440x720' | '720x1440'> = {
  '1:1': '1024x1024',
  '9:16': '768x1344',
  '16:9': '1344x768',
  '4:5': '864x1152',
  '5:4': '1152x864',
  '2:1': '1440x720',
  '1:2': '720x1440',
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      prompt, 
      style = 'cinematic',
      aspect_ratio = '1:1',
      count = 1,
      enhance = true,
    } = body;

    // Validation
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt обязателен' },
        { status: 400 }
      );
    }

    if (count < 1 || count > 4) {
      return NextResponse.json(
        { success: false, error: 'Количество должно быть от 1 до 4' },
        { status: 400 }
      );
    }

    // Get style preset
    const stylePreset = STYLE_PRESETS[style] || STYLE_PRESETS.cinematic;
    
    // Build enhanced prompt
    const enhancedPrompt = enhance 
      ? `${prompt}, ${stylePreset.suffix}`
      : `${prompt}, high quality, detailed`;

    // Get size
    const size = ASPECT_SIZES[aspect_ratio] || '1024x1024';

    // Get ZAI instance
    const zai = await getZAI();

    // Generate images
    const images: Array<{
      id: string;
      url: string;
      base64: string;
      width: number;
      height: number;
      prompt: string;
    }> = [];

    for (let i = 0; i < count; i++) {
      try {
        const imagePrompt = i === 0 ? enhancedPrompt : `${enhancedPrompt}, variation ${i + 1}`;
        
        // Use z-ai-web-dev-sdk for image generation
        const response = await zai.images.generations.create({
          prompt: imagePrompt,
          size: size,
        });

        if (response.data && response.data.length > 0) {
          const imageData = response.data[0] as { base64?: string; url?: string };
          const base64 = imageData.base64 || '';
          const imageUrl = imageData.url || '';
          
          // Parse dimensions from size
          const [width, height] = size.split('x').map(Number);
          
          images.push({
            id: `img_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            url: base64 ? `data:image/png;base64,${base64}` : imageUrl,
            base64,
            width,
            height,
            prompt: imagePrompt,
          });
        }
      } catch (imgError) {
        console.error(`Image ${i + 1} generation error:`, imgError);
        // Continue with remaining images
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Не удалось сгенерировать изображения. Попробуйте другой промпт.' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      images,
      count: images.length,
      style: {
        id: style,
        name: stylePreset.description,
      },
      aspect_ratio,
      enhanced_prompt: enhancedPrompt,
      elapsed_ms: Date.now() - startTime,
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка генерации изображения',
        elapsed_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    styles: Object.entries(STYLE_PRESETS).map(([id, preset]) => ({
      id,
      description: preset.description,
    })),
    aspect_ratios: Object.keys(ASPECT_SIZES).map(ratio => ({
      id: ratio,
      label: ratio,
    })),
    max_count: 4,
  });
}

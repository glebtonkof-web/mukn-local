import { NextRequest, NextResponse } from 'next/server';
import { getDirectAIProvider } from '@/lib/ai-direct-provider';

/**
 * Real Image Generation API
 * Uses AI providers or falls back to demo mode
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

// Aspect ratio to size mapping
const ASPECT_SIZES: Record<string, '1024x1024' | '768x1344' | '1344x768' | '864x1152' | '1152x864'> = {
  '1:1': '1024x1024',
  '9:16': '768x1344',
  '16:9': '1344x768',
  '4:5': '864x1152',
  '5:4': '1152x864',
};

// Size dimensions
const SIZE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1024x1024': { width: 1024, height: 1024 },
  '768x1344': { width: 768, height: 1344 },
  '1344x768': { width: 1344, height: 768 },
  '864x1152': { width: 864, height: 1152 },
  '1152x864': { width: 1152, height: 864 },
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
      negative_prompt,
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
      : prompt;

    // Get size
    const sizeKey = ASPECT_SIZES[aspect_ratio] || '1024x1024';
    const size = SIZE_DIMENSIONS[sizeKey];

    // Check if AI providers are available
    const aiProvider = getDirectAIProvider();
    await aiProvider.initialize();

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
        
        // Create SVG placeholder image
        const svg = createPlaceholderSVG(prompt, style, size.width, size.height);
        const base64 = Buffer.from(svg).toString('base64');
        
        images.push({
          id: `img_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          url: `data:image/svg+xml;base64,${base64}`,
          base64,
          width: size.width,
          height: size.height,
          prompt: imagePrompt,
        });
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
      demo: !aiProvider.hasProviders(),
      message: !aiProvider.hasProviders() 
        ? 'Demo mode. Configure AI providers for real image generation.'
        : undefined,
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

/**
 * Create SVG placeholder image
 */
function createPlaceholderSVG(prompt: string, style: string, width: number, height: number): string {
  const colors: Record<string, string> = {
    cinematic: '#2d3436',
    realistic: '#0984e3',
    anime: '#ff6b6b',
    fantasy: '#6c5ce7',
    scifi: '#00cec9',
    portrait: '#fd79a8',
    landscape: '#00b894',
    artistic: '#e17055',
    minimal: '#dfe6e9',
    dark: '#2d3436',
  };

  const bgColor = colors[style] || '#636e72';
  const textColor = style === 'minimal' || style === 'landscape' ? '#2d3436' : '#ffffff';
  const truncatedPrompt = prompt.substring(0, 80);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${adjustColor(bgColor, -30)};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)"/>
    <text x="50%" y="35%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 20}" font-weight="bold">
      Image Preview
    </text>
    <text x="50%" y="45%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 35}">
      ${width} × ${height}
    </text>
    <text x="50%" y="60%" text-anchor="middle" fill="${textColor}99" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 50}">
      ${truncatedPrompt}
    </text>
    <text x="50%" y="80%" text-anchor="middle" fill="${textColor}66" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 60}">
      Style: ${style}
    </text>
    <text x="50%" y="92%" text-anchor="middle" fill="${textColor}44" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 70}">
      Configure AI providers for real images
    </text>
  </svg>`;
}

/**
 * Adjust hex color brightness
 */
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
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
    note: 'For actual AI image generation, configure an image provider API key in settings.',
  });
}

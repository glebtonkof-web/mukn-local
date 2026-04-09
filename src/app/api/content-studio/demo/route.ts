import { NextRequest, NextResponse } from 'next/server';

/**
 * Content Studio Demo Mode API
 * Provides demo responses when no AI providers are configured
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      prompt, 
      type = 'text',
      style = 'cinematic',
      duration = 5,
      aspect_ratio = '1:1',
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Demo mode responses based on type
    switch (type) {
      case 'image':
        return generateDemoImage(prompt, style, aspect_ratio, startTime);
      case 'video':
        return generateDemoVideo(prompt, duration, startTime);
      case 'text':
      default:
        return generateDemoText(prompt, startTime);
    }
  } catch (error) {
    console.error('Demo generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Demo generation failed' 
      },
      { status: 500 }
    );
  }
}

function generateDemoText(prompt: string, startTime: number) {
  // Generate demo text based on prompt
  const demoResponses = [
    `Вот демо-ответ на ваш запрос: "${prompt.substring(0, 50)}..."\n\nЭто пример текста, сгенерированного в демо-режиме. Для полноценной работы необходимо настроить API ключи провайдеров AI.\n\nНастройте провайдеров в разделе Настройки → AI Провайдеры или добавьте переменные окружения.`,
    `Demo response for: "${prompt.substring(0, 30)}..."\n\nThis is a demonstration of text generation. To unlock full AI capabilities, please configure API keys in Settings → AI Providers.\n\nSupported providers: DeepSeek, Gemini, Groq, Cerebras, OpenRouter.`,
  ];

  const content = demoResponses[Math.floor(Math.random() * demoResponses.length)];

  return NextResponse.json({
    success: true,
    demo: true,
    result: {
      content,
      provider: 'demo',
      model: 'demo-mode',
      tokensIn: prompt.length,
      tokensOut: content.length,
      cost: 0,
      responseTime: Date.now() - startTime,
    },
    message: 'Running in demo mode. Configure AI providers for real generation.',
  });
}

function generateDemoImage(prompt: string, style: string, aspectRatio: string, startTime: number) {
  const sizes: Record<string, { width: number; height: number }> = {
    '1:1': { width: 1024, height: 1024 },
    '9:16': { width: 768, height: 1344 },
    '16:9': { width: 1344, height: 768 },
  };

  const size = sizes[aspectRatio] || sizes['1:1'];

  // Create SVG placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)"/>
    <text x="50%" y="40%" text-anchor="middle" fill="white" font-family="Arial" font-size="32" font-weight="bold">Demo Image</text>
    <text x="50%" y="50%" text-anchor="middle" fill="white" font-family="Arial" font-size="16">${size.width}x${size.height}</text>
    <text x="50%" y="60%" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial" font-size="12">${prompt.substring(0, 50)}...</text>
    <text x="50%" y="80%" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="Arial" font-size="10">Style: ${style}</text>
    <text x="50%" y="90%" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="Arial" font-size="10">Configure AI providers for real images</text>
  </svg>`;

  const base64 = Buffer.from(svg).toString('base64');

  return NextResponse.json({
    success: true,
    demo: true,
    images: [{
      id: `demo_img_${Date.now()}`,
      url: `data:image/svg+xml;base64,${base64}`,
      base64,
      width: size.width,
      height: size.height,
      prompt,
    }],
    count: 1,
    style: { id: style, name: style },
    elapsed_ms: Date.now() - startTime,
    message: 'Running in demo mode. Configure AI providers for real image generation.',
  });
}

function generateDemoVideo(prompt: string, duration: number, startTime: number) {
  const taskId = `demo_video_${Date.now()}`;

  return NextResponse.json({
    success: true,
    demo: true,
    task_id: taskId,
    status: 'completed',
    video_url: `https://demo.example.com/video_${taskId}.mp4`,
    duration: Math.min(duration, 10),
    provider: 'demo',
    provider_name: 'Demo Mode',
    elapsed_ms: Date.now() - startTime,
    message: 'Running in demo mode. Configure AI providers for real video generation.',
  });
}

export async function GET() {
  return NextResponse.json({
    success: true,
    demo: true,
    message: 'Content Studio Demo Mode API',
    capabilities: {
      text: 'Generate demo text responses',
      image: 'Generate placeholder images',
      video: 'Return demo video URLs',
    },
    setupInstructions: {
      step1: 'Go to Settings → AI Providers',
      step2: 'Add API key for at least one provider',
      step3: 'Supported: DeepSeek, Gemini, Groq, Cerebras, OpenRouter',
      step4: 'Restart the application after adding keys',
    },
  });
}

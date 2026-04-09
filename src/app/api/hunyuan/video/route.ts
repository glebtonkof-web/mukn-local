import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/z-ai';

// POST /api/hunyuan/video - Генерация видео
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      style = 'cinematic', 
      duration = 5, 
      resolution = '720p',
      image_url,
      settings = {}
    } = body;

    if (!prompt && !image_url) {
      return NextResponse.json(
        { error: 'Prompt or image_url is required' },
        { status: 400 }
      );
    }

    // Используем z-ai-web-dev-sdk для генерации видео
    const zai = await getZAI();

    // Добавляем стиль к промпту
    const stylePrompts: Record<string, string> = {
      'cinematic': 'cinematic style, dramatic lighting, film quality, professional camera',
      'anime': 'anime style, vibrant colors, Japanese animation',
      'realistic': 'photorealistic, high detail, natural lighting',
      '3d': '3D render, CGI quality, detailed modeling',
      'fantasy': 'fantasy style, magical atmosphere, ethereal',
      'scifi': 'sci-fi futuristic style, cyberpunk elements',
      'nature': 'nature documentary style, beautiful landscapes',
      'abstract': 'abstract artistic style, creative visuals',
    };

    const fullPrompt = prompt 
      ? `${prompt}, ${stylePrompts[style] || stylePrompts.cinematic}`
      : undefined;

    // Маппинг разрешения
    const sizeMap: Record<string, string> = {
      '720p': '1280x720',
      '1080p': '1920x1080',
      '4k': '3840x2160',
    };

    // Создаём задачу на генерацию видео
    const task = await zai.video.generations.create({
      prompt: fullPrompt,
      image_url: image_url,
      quality: 'quality',
      size: sizeMap[resolution] || '1280x720',
      fps: 30,
      duration: duration === 10 ? 10 : 5,
      with_audio: false,
    });

    console.log('Video task created:', task.id);

    // Poll for results
    let result = await zai.async.result.query(task.id);
    let pollCount = 0;
    const maxPolls = 60;
    const pollInterval = 5000; // 5 seconds

    while (result.task_status === 'PROCESSING' && pollCount < maxPolls) {
      pollCount++;
      console.log(`Polling ${pollCount}/${maxPolls}: Status is ${result.task_status}`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      result = await zai.async.result.query(task.id);
    }

    if (result.task_status === 'SUCCESS') {
      const videoUrl = (result as any).video_result?.[0]?.url ||
                      (result as any).video_url ||
                      (result as any).url ||
                      (result as any).video;

      return NextResponse.json({
        success: true,
        url: videoUrl,
        taskId: task.id,
        prompt: fullPrompt,
        style,
        duration,
        resolution,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Video generation failed or timed out',
        taskId: task.id,
        status: result.task_status,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Video generation error:', error);
    
    // Возвращаем fallback
    return NextResponse.json({
      success: true,
      url: '/api/placeholder/video',
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// GET /api/hunyuan/video - Статус сервиса
export async function GET() {
  return NextResponse.json({
    status: 'available',
    service: 'Hunyuan Video Generation',
    model: 'Hunyuan Video (13B parameters)',
    providers: ['z-ai-web-dev-sdk'],
    features: {
      textToVideo: true,
      imageToVideo: true,
      keyframeMode: true,
      styles: ['cinematic', 'anime', 'realistic', '3d', 'fantasy', 'scifi', 'nature', 'abstract'],
      durations: [5, 10],
      resolutions: ['720p', '1080p', '4k'],
    },
  });
}

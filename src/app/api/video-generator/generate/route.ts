import { NextRequest, NextResponse } from 'next/server';
import { VideoGenerator } from '@/lib/video-generator';
import { VideoScript, GenerationProgress } from '@/lib/video-generator/types';

// Глобальный генератор (singleton)
let generatorInstance: VideoGenerator | null = null;

function getGenerator(): VideoGenerator {
  if (!generatorInstance) {
    generatorInstance = new VideoGenerator({
      pexelsApiKey: process.env.PEXELS_API_KEY,
      pixabayApiKey: process.env.PIXABAY_API_KEY,
      uploadPostApiKey: process.env.UPLOAD_POST_API_KEY,
      outputDir: './output/videos',
      tempDir: './output/temp',
      defaultVoice: 'ru-RU-SvetlanaNeural',
      defaultOrientation: 'portrait',
      addSubtitles: true,
      fps: 30,
      quality: 'high',
    });
  }
  return generatorInstance;
}

// Хранилище статусов генерации (в памяти)
const generationStatus = new Map<string, GenerationProgress>();

// POST /api/video-generator/generate - Генерация видео
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, publish, platforms } = body as {
      script: VideoScript;
      publish?: boolean;
      platforms?: ('tiktok' | 'instagram' | 'youtube')[];
    };

    if (!script) {
      return NextResponse.json(
        { error: 'Script is required' },
        { status: 400 }
      );
    }

    const generator = getGenerator();
    const generationId = `gen-${Date.now()}`;

    // Устанавливаем callback для обновления статуса
    generator.setProgressCallback((progress: GenerationProgress) => {
      generationStatus.set(generationId, progress);
    });

    // Запускаем генерацию
    const result = await generator.generate(script, { publish, platforms });

    // Очищаем статус через минуту
    setTimeout(() => {
      generationStatus.delete(generationId);
    }, 60000);

    return NextResponse.json({
      success: result.success,
      generationId,
      outputPath: result.outputPath,
      parsedScript: result.parsedScript,
      publishResults: result.publishResults,
      error: result.error,
    });

  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate video', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/video-generator/generate - Получить статус генерации
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const generationId = searchParams.get('id');

  if (generationId) {
    const status = generationStatus.get(generationId);
    if (status) {
      return NextResponse.json({ status });
    }
    return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
  }

  // Возвращаем информацию о зависимостях
  const generator = getGenerator();
  const deps = await generator.checkDependencies();

  return NextResponse.json({
    dependencies: deps,
    config: {
      hasPexels: !!process.env.PEXELS_API_KEY,
      hasPixabay: !!process.env.PIXABAY_API_KEY,
      hasUploadPost: !!process.env.UPLOAD_POST_API_KEY,
    },
  });
}

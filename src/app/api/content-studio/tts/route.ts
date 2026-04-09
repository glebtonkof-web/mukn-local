import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * TTS API - Text-to-Speech using z-ai-web-dev-sdk
 */

// Global ZAI instance
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Available voices
const VOICES = [
  { id: 'tongtong', name: 'Тонгтонг', description: 'Тёплый и дружелюбный' },
  { id: 'chuichui', name: 'Чуйчуй', description: 'Живой и милый' },
  { id: 'xiaochen', name: 'Сяочен', description: 'Спокойный и профессиональный' },
  { id: 'jam', name: 'Джем', description: 'Английский джентльмен' },
  { id: 'kazi', name: 'Кази', description: 'Чёткий и стандартный' },
  { id: 'douji', name: 'Доуи', description: 'Естественный и плавный' },
  { id: 'luodo', name: 'Луодо', description: 'Выразительный' },
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      text, 
      voice = 'tongtong', 
      speed = 1.0,
      format = 'wav',
    } = body;

    // Validation
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Текст обязателен' },
        { status: 400 }
      );
    }

    // Check text length
    if (text.length > 1024) {
      return NextResponse.json(
        { success: false, error: 'Текст слишком длинный (максимум 1024 символа)' },
        { status: 400 }
      );
    }

    // Validate speed
    if (speed < 0.5 || speed > 2.0) {
      return NextResponse.json(
        { success: false, error: 'Скорость должна быть от 0.5 до 2.0' },
        { status: 400 }
      );
    }

    // Get ZAI instance
    const zai = await getZAI();

    // Generate TTS
    const response = await zai.audio.tts.create({
      input: text.trim(),
      voice: voice,
      speed: speed,
      response_format: format as 'wav' | 'mp3' | 'pcm',
      stream: false,
    });

    // Get array buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    // Return audio as response
    const contentType = format === 'mp3' ? 'audio/mpeg' : 
                       format === 'pcm' ? 'audio/pcm' : 'audio/wav';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
        'X-Generation-Time': `${Date.now() - startTime}ms`,
      },
    });

  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка генерации аудио',
        elapsed_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    voices: VOICES,
    formats: ['wav', 'mp3', 'pcm'],
    limits: {
      max_text_length: 1024,
      speed_range: { min: 0.5, max: 2.0, default: 1.0 },
    },
  });
}

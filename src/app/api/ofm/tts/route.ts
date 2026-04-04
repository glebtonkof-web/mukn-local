import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { logger } from '@/lib/logger';

// Available TTS voices for OFM
const OFM_VOICES = {
  google: [
    { id: 'female_23', name: 'Женский голос 23', description: 'Молодой женский голос', gender: 'female', language: 'ru' },
    { id: 'female_25', name: 'Женский голос 25', description: 'Взрослый женский голос', gender: 'female', language: 'ru' },
    { id: 'female_30', name: 'Женский голос 30', description: 'Зрелый женский голос', gender: 'female', language: 'ru' },
    { id: 'male_25', name: 'Мужской голос 25', description: 'Молодой мужской голос', gender: 'male', language: 'ru' },
    { id: 'male_30', name: 'Мужской голос 30', description: 'Взрослый мужской голос', gender: 'male', language: 'ru' },
  ],
  elevenlabs: [
    { id: 'rachel', name: 'Rachel', description: 'Тёплый женский голос', gender: 'female', language: 'en' },
    { id: 'domi', name: 'Domi', description: 'Энергичный женский голос', gender: 'female', language: 'en' },
    { id: 'bella', name: 'Bella', description: 'Мягкий женский голос', gender: 'female', language: 'en' },
    { id: 'antoni', name: 'Antoni', description: 'Приятный мужской голос', gender: 'male', language: 'en' },
    { id: 'josh', name: 'Josh', description: 'Глубокий мужской голос', gender: 'male', language: 'en' },
  ],
};

// POST /api/ofm/tts - Generate voice from text
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voice = 'female_23',
      speed = 1.0,
      provider = 'google',
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Check text length
    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 4096 characters.' },
        { status: 400 }
      );
    }

    // Validate speed range (0.5 to 2.0)
    const validSpeed = Math.max(0.5, Math.min(2.0, parseFloat(speed) || 1.0));

    const zai = await ZAI.create();

    // Use TTS from z-ai-web-dev-sdk
    const audioResponse = await zai.tts.generate({
      text: text,
      voice: voice,
      speed: validSpeed,
    });

    // The response contains base64 encoded audio
    const base64Audio = audioResponse.audio || audioResponse;

    logger.info('OFM TTS generated', {
      textLength: text.length,
      voice,
      provider,
      speed: validSpeed
    });

    return NextResponse.json({
      success: true,
      audio: typeof base64Audio === 'string' ? base64Audio : Buffer.from(base64Audio).toString('base64'),
      format: 'mp3',
      duration: Math.ceil(text.length / 15), // Rough estimate: ~15 chars per second
      voice,
      provider,
    });

  } catch (error) {
    logger.error('OFM TTS generation error', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate speech', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/ofm/tts/voices - List available voices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as 'google' | 'elevenlabs' | null;

    if (provider && OFM_VOICES[provider]) {
      return NextResponse.json({
        success: true,
        provider,
        voices: OFM_VOICES[provider],
      });
    }

    // Return all voices grouped by provider
    return NextResponse.json({
      success: true,
      providers: OFM_VOICES,
      defaultVoice: 'female_23',
      defaultProvider: 'google',
    });

  } catch (error) {
    logger.error('Failed to list OFM TTS voices', error as Error);
    return NextResponse.json(
      { error: 'Failed to list voices' },
      { status: 500 }
    );
  }
}

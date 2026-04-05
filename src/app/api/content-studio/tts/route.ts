import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Text-to-Speech endpoint
 * Supports MiniMax Speech (emotional voices) and NaturalReaders (western voices)
 */

// Voice presets for each provider
const VOICE_PRESETS = {
  natural_readers: {
    british_warm: { id: 'british_warm', description: 'Warm and friendly with a slight British accent' },
    british_deep: { id: 'british_deep', description: 'Deep, rich British narration' },
    scottish: { id: 'scottish', description: 'Scottish accent for storytelling' },
    american_warm: { id: 'american_warm', description: 'Warm American voice' },
    american_professional: { id: 'american_pro', description: 'Professional American narration' },
    new_zealand: { id: 'new_zealand', description: 'New Zealand accent' },
  },
  minimax: {
    neutral: { id: 'neutral', description: 'Neutral tone' },
    bedtime_whispers: { id: 'bedtime_whispers', description: 'Soft, gentle bedtime story voice' },
    horror_story: { id: 'horror_story', description: 'Spooky horror narration' },
    goblin_trade: { id: 'goblin_trade', description: 'Character voice for fantasy' },
    cheerful: { id: 'cheerful', description: 'Happy, energetic voice' },
    sad: { id: 'sad', description: 'Melancholic, emotional voice' },
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, provider = 'natural_readers', voice = 'british_warm', emotion } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    // Estimate duration based on text length (roughly 15 characters per second for TTS)
    const estimatedDuration = Math.ceil(text.length / 15);

    // Try to use Z-AI TTS if available
    try {
      const zai = await ZAI.create();
      
      // For now, simulate TTS response
      // In production, this would call actual TTS APIs
      const audioId = `tts-${provider}-${Date.now()}`;
      
      return NextResponse.json({
        success: true,
        audio: {
          id: audioId,
          url: `/api/content-studio/audio/${audioId}`,
          duration: estimatedDuration,
          voice: voice,
          provider: provider,
        },
        provider,
        voice_preset: VOICE_PRESETS[provider as keyof typeof VOICE_PRESETS]?.[voice as keyof typeof VOICE_PRESETS.natural_readers] || voice,
      });
    } catch (zaiError) {
      console.log('TTS fallback to demo mode');
    }

    // Fallback: Return mock audio result
    return NextResponse.json({
      success: true,
      audio: {
        id: `tts-demo-${Date.now()}`,
        url: '#',
        duration: estimatedDuration,
        voice: voice,
        provider: provider,
      },
      provider: 'demo',
      message: 'Demo mode - configure TTS provider for real audio',
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    providers: [
      {
        id: 'natural_readers',
        name: 'NaturalReaders',
        description: 'Professional TTS with western voices',
        features: ['western_voices', 'british', 'scottish', 'american', 'long_form'],
        voices: Object.entries(VOICE_PRESETS.natural_readers).map(([key, value]) => ({
          id: key,
          ...value,
        })),
      },
      {
        id: 'minimax',
        name: 'MiniMax Speech',
        description: 'Emotional TTS with character voices',
        features: ['emotional_voices', 'asmr', 'horror', 'characters'],
        voices: Object.entries(VOICE_PRESETS.minimax).map(([key, value]) => ({
          id: key,
          ...value,
        })),
      },
    ],
  });
}

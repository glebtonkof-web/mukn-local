import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// POST /api/ai/tts - Text-to-Speech generation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice = 'tongtong', influencerId, speed = 1.0 } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Check text length (max 1024 chars for TTS API)
    if (text.length > 1024) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 1024 characters.' },
        { status: 400 }
      );
    }

    // Validate speed range (0.5 to 2.0)
    const validSpeed = Math.max(0.5, Math.min(2.0, speed));

    const zai = await ZAI.create();

    // Use TTS from z-ai-web-dev-sdk - correct method is zai.audio.tts.create
    const response = await zai.audio.tts.create({
      input: text,
      voice: voice,
      speed: validSpeed,
      response_format: 'wav',
      stream: false,
    });

    // Get array buffer from Response object
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const base64Audio = buffer.toString('base64');

    // Log usage if influencerId provided
    if (influencerId) {
      await db.actionLog.create({
        data: {
          id: nanoid(),
          action: 'tts_generation',
          entityType: 'influencer',
          entityId: influencerId,
          details: JSON.stringify({
            textLength: text.length,
            voice,
            speed: validSpeed,
          }),
          userId: 'system', // TODO: Get from auth
        },
      }).catch(err => logger.error('Failed to log TTS usage', err));
    }

    logger.info('TTS generated', { textLength: text.length, voice });

    return NextResponse.json({
      success: true,
      audio: base64Audio,
      format: 'wav',
      duration: Math.ceil(text.length / 15), // Rough estimate: ~15 chars per second
    });

  } catch (error) {
    logger.error('TTS generation error', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate speech', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/ai/tts/voices - List available voices
export async function GET() {
  try {
    // Available voices from z-ai-web-dev-sdk
    const voices = [
      { id: 'tongtong', name: 'TongTong', description: '温暖亲切', gender: 'neutral', language: 'zh' },
      { id: 'chuichui', name: 'ChuiChui', description: '活泼可爱', gender: 'neutral', language: 'zh' },
      { id: 'xiaochen', name: 'XiaoChen', description: '沉稳专业', gender: 'male', language: 'zh' },
      { id: 'jam', name: 'Jam', description: '英音绅士', gender: 'male', language: 'en' },
      { id: 'kazi', name: 'Kazi', description: '清晰标准', gender: 'neutral', language: 'zh' },
      { id: 'douji', name: 'DouJi', description: '自然流畅', gender: 'neutral', language: 'zh' },
      { id: 'luodo', name: 'LuoDo', description: '富有感染力', gender: 'neutral', language: 'zh' },
    ];

    return NextResponse.json({
      success: true,
      voices,
    });

  } catch (error) {
    logger.error('Failed to list voices', error as Error);
    return NextResponse.json(
      { error: 'Failed to list voices' },
      { status: 500 }
    );
  }
}

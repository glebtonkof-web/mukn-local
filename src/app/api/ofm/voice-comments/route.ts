import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// In-memory storage for voice comments (will be replaced with Prisma model)
interface VoiceComment {
  id: string;
  text: string;
  audio: string; // base64 encoded
  voice: string;
  niche: string;
  posted: boolean;
  createdAt: Date;
  postedAt?: Date;
}

const voiceCommentsStore: VoiceComment[] = [];

// POST /api/ofm/voice-comments - Generate voice comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      niche = 'relationships',
      voice = 'female_23',
      customPrompt,
      channelContext,
      targetChannel,
    } = body;

    const zai = await ZAI.create();

    // Step 1: Generate short comment text (3-5 words) using DeepSeek
    const systemPrompt = `Ты — девушка 23 лет, ведущая Telegram-канал.
Твоя задача: написать короткий, естественный комментарий к посту (3-5 слов).

Правила:
- Комментарий должен быть живым, человечным
- Избегай канцеляризмов и официального тона
- Можно использовать эмодзи (1-2 штуки)
- НЕ добавляй ссылки или прямую рекламу
- Длина: строго 3-5 слов

Ниша: ${niche}
${customPrompt ? `Дополнительный контекст: ${customPrompt}` : ''}
${channelContext ? `Контекст канала: ${channelContext}` : ''}
${targetChannel ? `Целевой канал: ${targetChannel}` : ''}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Напиши короткий комментарий к посту в этой нише.' }
      ],
      temperature: 0.8,
      max_tokens: 50,
    });

    const generatedText = completion.choices?.[0]?.message?.content?.trim() || 'Классный пост! 😊';

    // Clean up the text - remove quotes if present
    const cleanText = generatedText
      .replace(/^["']|["']$/g, '')
      .replace(/\n/g, ' ')
      .trim();

    // Step 2: Convert to audio using TTS
    let base64Audio: string;
    try {
      // @ts-expect-error - TTS may not be available in SDK type definitions
      const audioResponse = await zai.tts?.generate({
        text: cleanText,
        voice: voice,
        speed: 1.0,
      });
      base64Audio = audioResponse?.audio || audioResponse || '';
    } catch {
      base64Audio = '';
      logger.warn('TTS not available for voice comment');
    }

    // Create voice comment record
    const voiceComment: VoiceComment = {
      id: `vc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: cleanText,
      audio: typeof base64Audio === 'string' ? base64Audio : Buffer.from(base64Audio).toString('base64'),
      voice,
      niche,
      posted: false,
      createdAt: new Date(),
    };

    // Store in memory (replace with Prisma in production)
    voiceCommentsStore.push(voiceComment);

    // Log the generation
    await db.actionLog.create({
      data: {
        id: nanoid(),
        action: 'voice_comment_generated',
        entityType: 'voice_comment',
        entityId: voiceComment.id,
        details: JSON.stringify({
          text: cleanText,
          voice,
          niche,
          wordCount: cleanText.split(' ').length,
        }),
        userId: 'system',
      },
    }).catch(err => logger.error('Failed to log voice comment', err));

    logger.info('Voice comment generated', {
      id: voiceComment.id,
      text: cleanText,
      wordCount: cleanText.split(' ').length,
      voice,
    });

    return NextResponse.json({
      success: true,
      voiceComment: {
        id: voiceComment.id,
        text: voiceComment.text,
        audio: voiceComment.audio,
        voice: voiceComment.voice,
        niche: voiceComment.niche,
        posted: voiceComment.posted,
        createdAt: voiceComment.createdAt,
      },
      duration: Math.ceil(cleanText.length / 15),
    });

  } catch (error) {
    logger.error('Voice comment generation error', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate voice comment', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/ofm/voice-comments - List voice comments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get('niche');
    const posted = searchParams.get('posted');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filtered = [...voiceCommentsStore];

    // Apply filters
    if (niche) {
      filtered = filtered.filter(vc => vc.niche === niche);
    }
    if (posted !== null) {
      const isPosted = posted === 'true';
      filtered = filtered.filter(vc => vc.posted === isPosted);
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      voiceComments: paginated.map(vc => ({
        id: vc.id,
        text: vc.text,
        audio: vc.audio,
        voice: vc.voice,
        niche: vc.niche,
        posted: vc.posted,
        createdAt: vc.createdAt,
        postedAt: vc.postedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    logger.error('Failed to list voice comments', error as Error);
    return NextResponse.json(
      { error: 'Failed to list voice comments' },
      { status: 500 }
    );
  }
}

// PUT /api/ofm/voice-comments - Mark as posted
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, posted = true } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Voice comment ID is required' },
        { status: 400 }
      );
    }

    const voiceComment = voiceCommentsStore.find(vc => vc.id === id);

    if (!voiceComment) {
      return NextResponse.json(
        { error: 'Voice comment not found' },
        { status: 404 }
      );
    }

    // Update status
    voiceComment.posted = posted;
    if (posted) {
      voiceComment.postedAt = new Date();
    }

    logger.info('Voice comment marked as posted', { id, posted });

    return NextResponse.json({
      success: true,
      voiceComment: {
        id: voiceComment.id,
        text: voiceComment.text,
        voice: voiceComment.voice,
        niche: voiceComment.niche,
        posted: voiceComment.posted,
        postedAt: voiceComment.postedAt,
      },
    });

  } catch (error) {
    logger.error('Failed to update voice comment', error as Error);
    return NextResponse.json(
      { error: 'Failed to update voice comment' },
      { status: 500 }
    );
  }
}

// DELETE /api/ofm/voice-comments - Remove voice comment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Voice comment ID is required' },
        { status: 400 }
      );
    }

    const index = voiceCommentsStore.findIndex(vc => vc.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Voice comment not found' },
        { status: 404 }
      );
    }

    voiceCommentsStore.splice(index, 1);

    logger.info('Voice comment deleted', { id });

    return NextResponse.json({
      success: true,
      message: 'Voice comment deleted',
    });

  } catch (error) {
    logger.error('Failed to delete voice comment', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete voice comment' },
      { status: 500 }
    );
  }
}

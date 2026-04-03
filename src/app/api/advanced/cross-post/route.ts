// API: Кросспостинг с обогащением (УРОВЕНЬ 1, функция 5)
// Адаптация успешных комментариев для разных каналов с помощью DeepSeek

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAIDispatcher } from '@/lib/ai-dispatcher';

// POST: Создать кросспост с AI-адаптацией
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceChannelId,
      sourcePostId,
      sourcePostUrl,
      originalComment,
      targetChannelId,
      targetPostContent,
      targetChannelTheme,
      userId,
    } = body;

    if (!sourceChannelId || !sourcePostId || !originalComment || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceChannelId, sourcePostId, originalComment, userId' },
        { status: 400 }
      );
    }

    // AI-адаптация комментария для целевого канала
    const dispatcher = getAIDispatcher(userId);
    await dispatcher.initialize();

    const prompt = `Адаптируй успешный комментарий для другого канала.

ОРИГИНАЛЬНЫЙ КОММЕНТАРИЙ (показал хорошие результаты):
"${originalComment}"

${targetChannelTheme ? `ТЕМА ЦЕЛЕВОГО КАНАЛА: ${targetChannelTheme}` : ''}
${targetPostContent ? `КОНТЕКСТ ЦЕЛЕВОГО ПОСТА: ${targetPostContent.substring(0, 500)}` : ''}

Требования:
1. Сохрани суть и посыл оригинала
2. Адаптируй стиль под новую аудиторию
3. Сохрани конверсионную силу
4. Сделай уникальным (не копия)
5. Длина 30-200 символов
6. Звучит естественно для целевого канала

Ответ в JSON:
{
  "adaptedComment": "текст адаптированного комментария",
  "styleChanges": ["изменение1", "изменение2"],
  "confidence": 0-1
}`;

    const result = await dispatcher.generate(prompt, 'mass_generation', {
      temperature: 0.8,
      maxTokens: 300,
    });

    // Парсим результат
    let adaptedComment = originalComment;
    let styleChanges: string[] = [];
    let confidence = 0.5;

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        adaptedComment = parsed.adaptedComment || originalComment;
        styleChanges = parsed.styleChanges || [];
        confidence = parsed.confidence || 0.5;
      } catch {
        // Если не удалось распарсить JSON, используем текст как есть
        adaptedComment = result.content.trim();
      }
    }

    // Сохраняем кросспост в базу
    const crossPost = await db.crossPostEnrichment.create({
      data: {
        sourceChannelId,
        sourcePostId,
        sourcePostUrl,
        originalComment,
        adaptedComment,
        aiModel: result.model,
        targetChannelId,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      crossPost: {
        id: crossPost.id,
        adaptedComment,
        styleChanges,
        confidence,
        aiModel: result.model,
        provider: result.provider,
      },
    });
  } catch (error) {
    console.error('[CrossPost API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create cross-post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: Получить список кросспостов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const crossPosts = await db.crossPostEnrichment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.crossPostEnrichment.count({ where });

    return NextResponse.json({
      success: true,
      crossPosts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + crossPosts.length < total,
      },
    });
  } catch (error) {
    console.error('[CrossPost API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-posts' },
      { status: 500 }
    );
  }
}

// PUT: Обновить статус кросспоста
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, engagementRate, postedAt } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      );
    }

    const updateData: any = { status };
    if (engagementRate !== undefined) {
      updateData.engagementRate = engagementRate;
    }
    if (postedAt !== undefined) {
      updateData.postedAt = new Date(postedAt);
    }
    if (status === 'posted') {
      updateData.postedAt = new Date();
    }

    const crossPost = await db.crossPostEnrichment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      crossPost,
    });
  } catch (error) {
    console.error('[CrossPost API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update cross-post' },
      { status: 500 }
    );
  }
}

// DELETE: Удалить кросспост
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    await db.crossPostEnrichment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Cross-post deleted',
    });
  } catch (error) {
    console.error('[CrossPost API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete cross-post' },
      { status: 500 }
    );
  }
}

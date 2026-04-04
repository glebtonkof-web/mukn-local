import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/hunyuan/templates - Получение шаблонов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('contentType');
    const platform = searchParams.get('platform');
    const niche = searchParams.get('niche');
    const isPublic = searchParams.get('public') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (contentType) where.contentType = contentType;
    if (platform) where.platform = platform;
    if (niche) where.niche = niche;
    if (isPublic) where.isPublic = true;

    const templates = await db.contentTemplate.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { avgRating: 'desc' },
      ],
      take: limit,
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[API Hunyuan Templates] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/hunyuan/templates - Создание шаблона
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const template = await db.contentTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        contentType: body.contentType,
        platform: body.platform,
        niche: body.niche,
        style: body.style,
        styleParams: JSON.stringify(body.styleParams || {}),
        promptTemplate: body.promptTemplate,
        previewUrl: body.previewUrl,
        userId: body.userId,
        isPublic: body.isPublic || false,
        tags: JSON.stringify(body.tags || []),
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('[API Hunyuan Templates] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/hunyuan/templates - Обновление шаблона
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.styleParams) updateData.styleParams = JSON.stringify(data.styleParams);
    if (data.promptTemplate) updateData.promptTemplate = data.promptTemplate;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    const template = await db.contentTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('[API Hunyuan Templates] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/hunyuan/templates - Удаление шаблона
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    await db.contentTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Hunyuan Templates] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

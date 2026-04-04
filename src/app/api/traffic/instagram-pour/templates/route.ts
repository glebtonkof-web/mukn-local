import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/traffic/instagram-pour/templates - List content templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string | boolean | undefined> = {};
    if (type) where.type = type;
    if (category) where.category = category;

    const [templates, total] = await Promise.all([
      db.instagramContentTemplate.findMany({
        where,
        orderBy: { usageCount: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.instagramContentTemplate.count({ where }),
    ]);

    // Parse JSON fields
    const parsedTemplates = templates.map(template => ({
      ...template,
      variables: template.variables ? JSON.parse(template.variables) : [],
      tags: template.tags ? JSON.parse(template.tags) : [],
    }));

    logger.debug('Instagram content templates fetched', { count: templates.length });

    return NextResponse.json({
      templates: parsedTemplates,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + templates.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch Instagram content templates', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch Instagram content templates' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/instagram-pour/templates - Create content template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!body.type) {
      return NextResponse.json(
        { error: 'Type is required' },
        { status: 400 }
      );
    }

    if (!body.content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['reels', 'stories', 'cta'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: ' + validTypes.join(', ') },
        { status: 400 }
      );
    }

    const template = await db.instagramContentTemplate.create({
      data: {
        name: body.name,
        type: body.type,
        description: body.description,
        content: body.content,
        variables: body.variables ? JSON.stringify(body.variables) : null,
        previewUrl: body.previewUrl,
        category: body.category,
        tags: body.tags ? JSON.stringify(body.tags) : null,
        isPublic: body.isPublic || false,
      },
    });

    logger.info('Instagram content template created', { templateId: template.id, name: template.name });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create Instagram content template', error as Error);
    return NextResponse.json(
      { error: 'Failed to create Instagram content template' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/instagram-pour/templates - Update content template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...data };

    // Handle JSON fields
    if (data.variables) {
      updateData.variables = typeof data.variables === 'string' 
        ? data.variables 
        : JSON.stringify(data.variables);
    }
    if (data.tags) {
      updateData.tags = typeof data.tags === 'string' 
        ? data.tags 
        : JSON.stringify(data.tags);
    }

    const template = await db.instagramContentTemplate.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    logger.info('Instagram content template updated', { templateId: id });

    return NextResponse.json({ template });
  } catch (error) {
    logger.error('Failed to update Instagram content template', error as Error);
    return NextResponse.json(
      { error: 'Failed to update Instagram content template' },
      { status: 500 }
    );
  }
}

// DELETE /api/traffic/instagram-pour/templates - Delete content template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    await db.instagramContentTemplate.delete({
      where: { id },
    });

    logger.info('Instagram content template deleted', { templateId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete Instagram content template', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete Instagram content template' },
      { status: 500 }
    );
  }
}

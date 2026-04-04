import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/traffic/sources - List traffic sources
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string> = {};
    if (platform) where.platform = platform;
    if (status) where.status = status;

    const [sources, total] = await Promise.all([
      db.trafficSource.findMany({
        where,
        include: {
          _count: {
            select: {
              campaigns: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.trafficSource.count({ where }),
    ]);

    logger.debug('Traffic sources fetched', { count: sources.length });

    return NextResponse.json({
      sources,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + sources.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch traffic sources', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch traffic sources' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/sources - Create traffic source
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

    if (!body.platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    if (body.methodId === undefined || body.methodId === null) {
      return NextResponse.json(
        { error: 'Method ID is required' },
        { status: 400 }
      );
    }

    if (!body.methodName) {
      return NextResponse.json(
        { error: 'Method name is required' },
        { status: 400 }
      );
    }

    const source = await db.trafficSource.create({
      data: {
        name: body.name,
        platform: body.platform,
        methodId: body.methodId,
        methodName: body.methodName,
        config: body.config,
        status: body.status || 'active',
      },
    });

    logger.info('Traffic source created', { sourceId: source.id, name: source.name });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create traffic source', error as Error);
    return NextResponse.json(
      { error: 'Failed to create traffic source' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/sources - Update traffic source
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    const source = await db.trafficSource.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    logger.info('Traffic source updated', { sourceId: id });

    return NextResponse.json({ source });
  } catch (error) {
    logger.error('Failed to update traffic source', error as Error);
    return NextResponse.json(
      { error: 'Failed to update traffic source' },
      { status: 500 }
    );
  }
}

// DELETE /api/traffic/sources - Remove traffic source
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    // Delete related campaigns first
    await db.trafficCampaign.deleteMany({
      where: { sourceId: id },
    });

    await db.trafficSource.delete({
      where: { id },
    });

    logger.info('Traffic source deleted', { sourceId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete traffic source', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete traffic source' },
      { status: 500 }
    );
  }
}

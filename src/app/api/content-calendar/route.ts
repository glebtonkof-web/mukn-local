import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry, createCircuitBreaker } from '@/lib/resilience';
import { logger } from '@/lib/logger';

const dbCircuitBreaker = createCircuitBreaker('database', { circuitBreakerThreshold: 3 });

// Content types
const CONTENT_TYPES = ['post', 'comment', 'dm', 'story'] as const;

// Status types
const STATUS_TYPES = ['pending', 'scheduled', 'executing', 'completed', 'failed', 'cancelled'] as const;

interface ContentQueueItem {
  id?: string;
  type: (typeof CONTENT_TYPES)[number];
  priority?: number;
  scheduledAt: string | Date;
  influencerId: string;
  offerId?: string;
  status?: (typeof STATUS_TYPES)[number];
  content?: string;
  metadata?: Record<string, unknown>;
}

// GET /api/content-calendar - Get scheduled posts with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const influencerId = searchParams.get('influencerId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.scheduledAt = dateFilter;
    }

    if (influencerId) where.influencerId = influencerId;
    if (status && STATUS_TYPES.includes(status as typeof STATUS_TYPES[number])) {
      where.status = status;
    }
    if (type && CONTENT_TYPES.includes(type as typeof CONTENT_TYPES[number])) {
      where.type = type;
    }

    // Fetch content queue items
    const contentQueue = await dbCircuitBreaker.execute(() =>
      db.contentQueue.findMany({
        where,
        include: {
          influencer: {
            select: {
              id: true,
              name: true,
              niche: true,
              avatarUrl: true,
            },
          },
          offer: {
            select: {
              id: true,
              name: true,
              niche: true,
            },
          },
        },
        orderBy: [
          { scheduledAt: 'asc' },
          { priority: 'desc' },
        ],
        take: limit,
        skip: offset,
      })
    );

    const total = await db.contentQueue.count({ where });

    // Group by date for calendar view
    const byDate = contentQueue.reduce((acc, item) => {
      const dateKey = new Date(item.scheduledAt).toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    }, {} as Record<string, typeof contentQueue>);

    // Calculate statistics
    const stats = {
      total: contentQueue.length,
      pending: contentQueue.filter(i => i.status === 'pending').length,
      scheduled: contentQueue.filter(i => i.status === 'scheduled').length,
      completed: contentQueue.filter(i => i.status === 'completed').length,
      failed: contentQueue.filter(i => i.status === 'failed').length,
      byType: CONTENT_TYPES.reduce((acc, t) => {
        acc[t] = contentQueue.filter(i => i.type === t).length;
        return acc;
      }, {} as Record<string, number>),
    };

    logger.debug('Content calendar fetched', { count: contentQueue.length, filters: where });

    return NextResponse.json({
      contentQueue,
      byDate,
      stats,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + contentQueue.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch content calendar', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch content calendar' },
      { status: 500 }
    );
  }
}

// POST /api/content-calendar - Schedule new post
export async function POST(request: NextRequest) {
  try {
    const body: ContentQueueItem = await request.json();

    // Validation
    if (!body.type || !CONTENT_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Supported: ${CONTENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!body.influencerId) {
      return NextResponse.json(
        { error: 'Influencer ID is required' },
        { status: 400 }
      );
    }

    if (!body.scheduledAt) {
      return NextResponse.json(
        { error: 'Scheduled date is required' },
        { status: 400 }
      );
    }

    // Check if influencer exists
    const influencer = await db.influencer.findUnique({
      where: { id: body.influencerId },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    // Validate scheduled date is in the future
    const scheduledDate = new Date(body.scheduledAt);
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled date must be in the future' },
        { status: 400 }
      );
    }

    // Create content queue item
    const queueItem = await withRetry(() =>
      db.contentQueue.create({
        data: {
          type: body.type,
          priority: body.priority || 5,
          scheduledAt: scheduledDate,
          status: body.status || 'pending',
          influencerId: body.influencerId,
          offerId: body.offerId,
          error: body.metadata ? JSON.stringify(body.metadata) : null,
        },
        include: {
          influencer: {
            select: {
              id: true,
              name: true,
              niche: true,
            },
          },
        },
      })
    );

    logger.info('Content scheduled', {
      queueId: queueItem.id,
      type: queueItem.type,
      influencerId: queueItem.influencerId,
      scheduledAt: queueItem.scheduledAt,
    });

    return NextResponse.json(
      {
        queueItem,
        message: 'Content scheduled successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to schedule content', error as Error);
    return NextResponse.json(
      { error: 'Failed to schedule content' },
      { status: 500 }
    );
  }
}

// PUT /api/content-calendar - Update scheduled post
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Content queue item ID is required' },
        { status: 400 }
      );
    }

    // Check if item exists
    const existingItem = await db.contentQueue.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Content queue item not found' },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (data.type && !CONTENT_TYPES.includes(data.type)) {
      return NextResponse.json(
        { error: `Invalid type. Supported: ${CONTENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (data.status && !STATUS_TYPES.includes(data.status)) {
      return NextResponse.json(
        { error: `Invalid status. Supported: ${STATUS_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate scheduled date is in the future if provided
    if (data.scheduledAt) {
      const scheduledDate = new Date(data.scheduledAt);
      if (scheduledDate <= new Date() && existingItem.status === 'pending') {
        return NextResponse.json(
          { error: 'Scheduled date must be in the future' },
          { status: 400 }
        );
      }
      data.scheduledAt = scheduledDate;
    }

    // Update the item
    const updatedItem = await db.contentQueue.update({
      where: { id },
      data,
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            niche: true,
          },
        },
        offer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info('Content queue item updated', {
      queueId: id,
      updates: Object.keys(data),
    });

    return NextResponse.json({
      queueItem: updatedItem,
      message: 'Content updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update content', error as Error);
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    );
  }
}

// DELETE /api/content-calendar - Remove scheduled post
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Content queue item ID is required' },
        { status: 400 }
      );
    }

    // Check if item exists
    const existingItem = await db.contentQueue.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Content queue item not found' },
        { status: 404 }
      );
    }

    // Don't allow deletion of executing items
    if (existingItem.status === 'executing') {
      return NextResponse.json(
        { error: 'Cannot delete content that is currently executing' },
        { status: 400 }
      );
    }

    // Delete or cancel
    if (searchParams.get('cancel') === 'true') {
      await db.contentQueue.update({
        where: { id },
        data: { status: 'cancelled' },
      });
      logger.info('Content cancelled', { queueId: id });
    } else {
      await db.contentQueue.delete({
        where: { id },
      });
      logger.info('Content deleted', { queueId: id });
    }

    return NextResponse.json({
      success: true,
      message: searchParams.get('cancel') === 'true' ? 'Content cancelled' : 'Content deleted',
    });
  } catch (error) {
    logger.error('Failed to delete content', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}

// PATCH /api/content-calendar - Bulk operations
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ids, data } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Action and ids array are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'reschedule':
        if (!data?.scheduledAt) {
          return NextResponse.json(
            { error: 'scheduledAt is required for reschedule action' },
            { status: 400 }
          );
        }
        result = await db.contentQueue.updateMany({
          where: { id: { in: ids } },
          data: { scheduledAt: new Date(data.scheduledAt) },
        });
        break;

      case 'cancel':
        result = await db.contentQueue.updateMany({
          where: { id: { in: ids }, status: { in: ['pending', 'scheduled'] } },
          data: { status: 'cancelled' },
        });
        break;

      case 'priority':
        if (data?.priority === undefined) {
          return NextResponse.json(
            { error: 'priority is required for priority action' },
            { status: 400 }
          );
        }
        result = await db.contentQueue.updateMany({
          where: { id: { in: ids } },
          data: { priority: data.priority },
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Supported: reschedule, cancel, priority` },
          { status: 400 }
        );
    }

    logger.info('Bulk content operation', { action, count: result.count, ids });

    return NextResponse.json({
      success: true,
      affected: result.count,
      action,
    });
  } catch (error) {
    logger.error('Failed bulk operation', error as Error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/traffic/campaigns - List campaigns
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get('sourceId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string | undefined> = {};
    if (sourceId) where.sourceId = sourceId;
    if (status) where.status = status;

    const [campaigns, total] = await Promise.all([
      db.trafficCampaign.findMany({
        where,
        include: {
          source: {
            select: {
              id: true,
              name: true,
              platform: true,
              methodId: true,
              methodName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.trafficCampaign.count({ where }),
    ]);

    logger.debug('Traffic campaigns fetched', { count: campaigns.length });

    return NextResponse.json({
      campaigns,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + campaigns.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch traffic campaigns', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch traffic campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/campaigns - Create campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Verify source exists
    const source = await db.trafficSource.findUnique({
      where: { id: body.sourceId },
    });

    if (!source) {
      return NextResponse.json(
        { error: 'Traffic source not found' },
        { status: 404 }
      );
    }

    const campaign = await db.trafficCampaign.create({
      data: {
        sourceId: body.sourceId,
        name: body.name,
        funnelSteps: body.funnelSteps,
        budget: body.budget || 0,
        spent: body.spent || 0,
        status: body.status || 'draft',
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
      include: {
        source: {
          select: {
            id: true,
            name: true,
            platform: true,
            methodId: true,
            methodName: true,
          },
        },
      },
    });

    logger.info('Traffic campaign created', { campaignId: campaign.id, name: campaign.name });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create traffic campaign', error as Error);
    return NextResponse.json(
      { error: 'Failed to create traffic campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/campaigns - Update campaign metrics
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...data };

    // Handle date fields
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    const campaign = await db.trafficCampaign.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        source: {
          select: {
            id: true,
            name: true,
            platform: true,
            methodId: true,
            methodName: true,
          },
        },
      },
    });

    // Update source metrics if campaign has new metrics
    if (data.impressions || data.clicks || data.conversions || data.revenue) {
      await db.trafficSource.update({
        where: { id: campaign.sourceId },
        data: {
          totalActions: { increment: data.impressions ? 1 : 0 },
          totalClicks: { increment: data.clicks || 0 },
          totalConversions: { increment: data.conversions || 0 },
          totalRevenue: { increment: data.revenue || 0 },
        },
      });
    }

    logger.info('Traffic campaign updated', { campaignId: id });

    return NextResponse.json({ campaign });
  } catch (error) {
    logger.error('Failed to update traffic campaign', error as Error);
    return NextResponse.json(
      { error: 'Failed to update traffic campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/traffic/campaigns - Remove campaign
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    await db.trafficCampaign.delete({
      where: { id },
    });

    logger.info('Traffic campaign deleted', { campaignId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete traffic campaign', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete traffic campaign' },
      { status: 500 }
    );
  }
}

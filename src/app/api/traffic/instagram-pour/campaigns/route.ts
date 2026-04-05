import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

// GET /api/traffic/instagram-pour/campaigns - List Instagram traffic campaigns
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceType = searchParams.get('sourceType');
    const status = searchParams.get('status');
    const aiService = searchParams.get('aiService');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string | undefined> = {};
    if (sourceType) where.sourceType = sourceType;
    if (status) where.status = status;
    if (aiService) where.aiService = aiService;

    const [campaigns, total] = await Promise.all([
      db.instagramTrafficCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.instagramTrafficCampaign.count({ where }),
    ]);

    logger.debug('Instagram traffic campaigns fetched', { count: campaigns.length });

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
    logger.error('Failed to fetch Instagram traffic campaigns', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch Instagram traffic campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/instagram-pour/campaigns - Create Instagram traffic campaign
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

    if (!body.sourceType) {
      return NextResponse.json(
        { error: 'Source type is required' },
        { status: 400 }
      );
    }

    // Validate source type
    const validSourceTypes = ['bio_link', 'reels', 'stories', 'dm', 'collaboration', 'ads'];
    if (!validSourceTypes.includes(body.sourceType)) {
      return NextResponse.json(
        { error: 'Invalid source type. Must be one of: ' + validSourceTypes.join(', ') },
        { status: 400 }
      );
    }

    // Validate AI service if provided
    if (body.aiService) {
      const validAIServices = ['pathsocial', 'outfame', 'growthviral'];
      if (!validAIServices.includes(body.aiService)) {
        return NextResponse.json(
          { error: 'Invalid AI service. Must be one of: ' + validAIServices.join(', ') },
          { status: 400 }
        );
      }
    }

    const campaign = await db.instagramTrafficCampaign.create({
      data: {
        id: nanoid(),
        name: body.name,
        description: body.description,
        sourceType: body.sourceType,
        status: body.status || 'draft',
        budget: body.budget || 0,
        spent: body.spent || 0,
        currency: body.currency || 'USD',
        
        // UTM settings
        utmSource: body.utmSource,
        utmMedium: body.utmMedium,
        utmCampaign: body.utmCampaign,
        utmContent: body.utmContent,
        utmTerm: body.utmTerm,
        
        // Targeting
        targetGeo: body.targetGeo,
        targetAgeMin: body.targetAgeMin || 18,
        targetAgeMax: body.targetAgeMax || 45,
        targetGender: body.targetGender,
        targetInterests: body.targetInterests,
        
        // Content
        contentTemplateId: body.contentTemplateId,
        
        // AI Service
        aiService: body.aiService,
        aiServiceConfig: body.aiServiceConfig ? JSON.stringify(body.aiServiceConfig) : null,
        
        // Schedule
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });

    logger.info('Instagram traffic campaign created', { campaignId: campaign.id, name: campaign.name });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create Instagram traffic campaign', error as Error);
    return NextResponse.json(
      { error: 'Failed to create Instagram traffic campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/instagram-pour/campaigns - Update Instagram traffic campaign
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

    // Handle JSON fields
    if (data.aiServiceConfig) {
      updateData.aiServiceConfig = typeof data.aiServiceConfig === 'string' 
        ? data.aiServiceConfig 
        : JSON.stringify(data.aiServiceConfig);
    }

    // Calculate ROI if we have revenue and spent
    if (data.revenue !== undefined && data.spent !== undefined && data.spent > 0) {
      updateData.roi = ((data.revenue - data.spent) / data.spent) * 100;
    }

    // Calculate conversion rate if we have conversions and linkClicks
    if (data.conversions !== undefined && data.linkClicks !== undefined && data.linkClicks > 0) {
      updateData.conversionRate = (data.conversions / data.linkClicks) * 100;
    }

    // Calculate CPC if we have spent and linkClicks
    if (data.spent !== undefined && data.linkClicks !== undefined && data.linkClicks > 0) {
      updateData.cpc = data.spent / data.linkClicks;
    }

    const campaign = await db.instagramTrafficCampaign.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    logger.info('Instagram traffic campaign updated', { campaignId: id });

    return NextResponse.json({ campaign });
  } catch (error) {
    logger.error('Failed to update Instagram traffic campaign', error as Error);
    return NextResponse.json(
      { error: 'Failed to update Instagram traffic campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/traffic/instagram-pour/campaigns - Delete Instagram traffic campaign
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

    await db.instagramTrafficCampaign.delete({
      where: { id },
    });

    logger.info('Instagram traffic campaign deleted', { campaignId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete Instagram traffic campaign', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete Instagram traffic campaign' },
      { status: 500 }
    );
  }
}

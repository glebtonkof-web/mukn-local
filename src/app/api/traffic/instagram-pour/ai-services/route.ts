import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Default AI services
const DEFAULT_AI_SERVICES = [
  {
    name: 'pathsocial',
    displayName: 'PathSocial',
    description: 'AI-powered Instagram growth service with organic followers targeting',
    features: ['organic_growth', 'target_audience', 'analytics', 'auto_engagement'],
    pricing: { starter: 49, growth: 99, premium: 199 },
    limits: { dailyFollows: 50, dailyLikes: 100, dailyComments: 20 },
  },
  {
    name: 'outfame',
    displayName: 'Outfame',
    description: 'Advanced Instagram marketing automation with AI content creation',
    features: ['content_creation', 'scheduling', 'analytics', 'hashtag_research', 'competitor_analysis'],
    pricing: { basic: 29, pro: 79, enterprise: 149 },
    limits: { dailyPosts: 5, dailyStories: 10, dailyDMs: 30 },
  },
  {
    name: 'growthviral',
    displayName: 'GrowthViral',
    description: 'Viral growth engine with AI-powered content optimization',
    features: ['viral_detection', 'content_optimization', 'trend_analysis', 'cross_posting', 'a_b_testing'],
    pricing: { starter: 39, growth: 89, scale: 179 },
    limits: { dailyOptimizations: 20, dailyTests: 5, dailyReports: 3 },
  },
];

// GET /api/traffic/instagram-pour/ai-services - List AI services
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let services = await db.instagramAIService.findMany({
      orderBy: { name: 'asc' },
    });

    // Initialize default services if none exist
    if (services.length === 0) {
      for (const service of DEFAULT_AI_SERVICES) {
        await db.instagramAIService.create({
          data: {
            name: service.name,
            displayName: service.displayName,
            description: service.description,
            features: JSON.stringify(service.features),
            pricing: JSON.stringify(service.pricing),
            limits: JSON.stringify(service.limits),
            isActive: false,
          },
        });
      }

      services = await db.instagramAIService.findMany({
        orderBy: { name: 'asc' },
      });
    }

    // Filter active only if requested
    if (activeOnly) {
      services = services.filter(s => s.isActive);
    }

    // Parse JSON fields
    const parsedServices = services.map(service => ({
      ...service,
      features: service.features ? JSON.parse(service.features) : [],
      pricing: service.pricing ? JSON.parse(service.pricing) : {},
      limits: service.limits ? JSON.parse(service.limits) : {},
    }));

    logger.debug('Instagram AI services fetched', { count: services.length });

    return NextResponse.json({ services: parsedServices });
  } catch (error) {
    logger.error('Failed to fetch Instagram AI services', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch Instagram AI services' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/instagram-pour/ai-services - Configure AI service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }

    // Check if service exists
    const existing = await db.instagramAIService.findUnique({
      where: { name: body.name },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Service not found. Use one of: pathsocial, outfame, growthviral' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    // Update fields
    if (body.apiKey !== undefined) updateData.apiKey = body.apiKey;
    if (body.apiEndpoint !== undefined) updateData.apiEndpoint = body.apiEndpoint;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const service = await db.instagramAIService.update({
      where: { name: body.name },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    logger.info('Instagram AI service configured', { serviceName: body.name });

    return NextResponse.json({ service });
  } catch (error) {
    logger.error('Failed to configure Instagram AI service', error as Error);
    return NextResponse.json(
      { error: 'Failed to configure Instagram AI service' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/instagram-pour/ai-services - Update AI service metrics
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, totalSpent, totalCampaigns, successRate, lastUsedAt } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (totalSpent !== undefined) {
      updateData.totalSpent = totalSpent;
    }
    if (totalCampaigns !== undefined) {
      updateData.totalCampaigns = totalCampaigns;
    }
    if (successRate !== undefined) {
      updateData.successRate = successRate;
    }
    if (lastUsedAt !== undefined) {
      updateData.lastUsedAt = lastUsedAt ? new Date(lastUsedAt) : null;
    }

    const service = await db.instagramAIService.update({
      where: { name },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ service });
  } catch (error) {
    logger.error('Failed to update Instagram AI service', error as Error);
    return NextResponse.json(
      { error: 'Failed to update Instagram AI service' },
      { status: 500 }
    );
  }
}

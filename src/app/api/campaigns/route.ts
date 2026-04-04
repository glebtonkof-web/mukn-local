import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry } from '@/lib/resilience';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

// GET /api/campaigns - Получить все кампании
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const niche = searchParams.get('niche');

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (niche) where.niche = niche;

    const campaigns = await db.campaign.findMany({
      where,
      include: {
        CampaignInfluencer: {
          include: {
            Influencer: {
              select: {
                id: true,
                name: true,
                niche: true,
                status: true,
                leadsCount: true,
                revenue: true,
              },
            },
          },
        },
        CampaignOffer: {
          include: {
            Offer: true,
          },
        },
        CampaignAnalytics: {
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Статистика
    const stats = {
      total: await db.campaign.count(),
      active: await db.campaign.count({ where: { status: 'active' } }),
      totalBudget: await db.campaign.aggregate({
        _sum: { budget: true },
      }),
      totalSpent: await db.campaign.aggregate({
        _sum: { spent: true },
      }),
      totalRevenue: await db.campaign.aggregate({
        _sum: { revenue: true },
      }),
      totalLeads: await db.campaign.aggregate({
        _sum: { leadsCount: true },
      }),
    };

    return NextResponse.json({
      campaigns,
      stats: {
        total: stats.total,
        active: stats.active,
        totalBudget: stats.totalBudget._sum.budget || 0,
        totalSpent: stats.totalSpent._sum.spent || 0,
        totalRevenue: stats.totalRevenue._sum.revenue || 0,
        totalLeads: stats.totalLeads._sum.leadsCount || 0,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch campaigns', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Создать кампанию
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const campaign = await withRetry(() =>
      db.campaign.create({
        data: {
          id: nanoid(),
          name: body.name,
          description: body.description,
          type: body.type,
          niche: body.niche,
          geo: body.geo,
          status: body.status || 'draft',
          budget: body.budget || 0,
          currency: body.currency || 'RUB',
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          userId: body.userId || 'default-user',
          updatedAt: new Date(),
          // Привязка инфлюенсеров
          CampaignInfluencer: body.influencerIds ? {
            create: body.influencerIds.map((id: string) => ({
              influencerId: id,
              role: 'primary',
            })),
          } : undefined,
          // Привязка офферов
          CampaignOffer: body.offerIds ? {
            create: body.offerIds.map((id: string, index: number) => ({
              offerId: id,
              isPrimary: index === 0,
            })),
          } : undefined,
        },
        include: {
          CampaignInfluencer: true,
          CampaignOffer: true,
        },
      })
    );

    logger.info('Campaign created', { campaignId: campaign.id, name: campaign.name });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create campaign', error as Error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns - Обновить кампанию
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, influencerIds, offerIds, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Обновляем основные данные
    const campaign = await db.campaign.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });

    // Если переданы инфлюенсеры, обновляем связи
    if (influencerIds) {
      // Удаляем старые связи
      await db.campaignInfluencer.deleteMany({
        where: { campaignId: id },
      });
      // Создаём новые
      await db.campaignInfluencer.createMany({
        data: influencerIds.map((influencerId: string) => ({
          campaignId: id,
          influencerId,
          role: 'primary',
        })),
      });
    }

    // Если переданы офферы, обновляем связи
    if (offerIds) {
      await db.campaignOffer.deleteMany({
        where: { campaignId: id },
      });
      await db.campaignOffer.createMany({
        data: offerIds.map((offerId: string, index: number) => ({
          campaignId: id,
          offerId,
          isPrimary: index === 0,
        })),
      });
    }

    logger.info('Campaign updated', { campaignId: id });

    return NextResponse.json({ campaign });
  } catch (error) {
    logger.error('Failed to update campaign', error as Error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns - Удалить кампанию
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

    // Удаляем связанные записи
    await db.campaignInfluencer.deleteMany({
      where: { campaignId: id },
    });
    await db.campaignOffer.deleteMany({
      where: { campaignId: id },
    });

    await db.campaign.delete({
      where: { id },
    });

    logger.info('Campaign deleted', { campaignId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete campaign', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}

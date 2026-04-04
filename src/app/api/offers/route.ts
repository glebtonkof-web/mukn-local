import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { withRetry } from '@/lib/resilience';
import { logger } from '@/lib/logger';

// GET /api/offers - Получить все офферы
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const niche = searchParams.get('niche');
    const network = searchParams.get('network');

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (niche) where.niche = niche;
    if (network) where.network = network;

    const offers = await db.offer.findMany({
      where,
      include: {
        CampaignOffer: {
          include: {
            Campaign: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
        ABTestVariant: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Статистика
    const stats = {
      total: await db.offer.count(),
      active: await db.offer.count({ where: { status: 'active' } }),
      totalClicks: await db.offer.aggregate({
        _sum: { clicks: true },
      }),
      totalLeads: await db.offer.aggregate({
        _sum: { leads: true },
      }),
      totalRevenue: await db.offer.aggregate({
        _sum: { revenue: true },
      }),
    };

    return NextResponse.json({
      offers,
      stats: {
        total: stats.total,
        active: stats.active,
        totalClicks: stats.totalClicks._sum.clicks || 0,
        totalLeads: stats.totalLeads._sum.leads || 0,
        totalRevenue: stats.totalRevenue._sum.revenue || 0,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch offers', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

// POST /api/offers - Создать оффер
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.affiliateLink) {
      return NextResponse.json(
        { error: 'Name and affiliate link are required' },
        { status: 400 }
      );
    }

    const offer = await withRetry(() =>
      db.offer.create({
        data: {
          id: nanoid(),
          name: body.name,
          description: body.description,
          network: body.network,
          networkOfferId: body.networkOfferId,
          affiliateLink: body.affiliateLink,
          niche: body.niche,
          geo: body.geo,
          payout: body.payout || 0,
          currency: body.currency || 'USD',
          status: body.status || 'active',
          updatedAt: new Date(),
        },
      })
    );

    logger.info('Offer created', { offerId: offer.id, name: offer.name });

    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create offer', error as Error);
    return NextResponse.json(
      { error: 'Failed to create offer' },
      { status: 500 }
    );
  }
}

// PUT /api/offers - Обновить оффер
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    const offer = await db.offer.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    logger.info('Offer updated', { offerId: id });

    return NextResponse.json({ offer });
  } catch (error) {
    logger.error('Failed to update offer', error as Error);
    return NextResponse.json(
      { error: 'Failed to update offer' },
      { status: 500 }
    );
  }
}

// POST /api/offers/track-click - Отслеживание клика
export async function trackClick(request: NextRequest) {
  try {
    const body = await request.json();
    const { offerId, influencerId, campaignId } = body;

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Увеличиваем счётчик кликов
    await db.offer.update({
      where: { id: offerId },
      data: {
        clicks: { increment: 1 },
      },
    });

    // Логируем клик для аналитики
    logger.info('Offer click tracked', { offerId, influencerId, campaignId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to track click', error as Error);
    return NextResponse.json(
      { error: 'Failed to track click' },
      { status: 500 }
    );
  }
}

// POST /api/offers/track-conversion - Отслеживание конверсии
export async function trackConversion(request: NextRequest) {
  try {
    const body = await request.json();
    const { offerId, amount, type = 'lead' } = body;

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (type === 'lead') {
      updateData.leads = { increment: 1 };
    } else if (type === 'conversion') {
      updateData.conversions = { increment: 1 };
      if (amount) {
        updateData.revenue = { increment: amount };
      }
    }

    await db.offer.update({
      where: { id: offerId },
      data: updateData,
    });

    logger.info('Conversion tracked', { offerId, type, amount });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to track conversion', error as Error);
    return NextResponse.json(
      { error: 'Failed to track conversion' },
      { status: 500 }
    );
  }
}

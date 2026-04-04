import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/monetization/partners - Получить партнёрские офферы
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isHot = searchParams.get('hot') === 'true';
    const isFeatured = searchParams.get('featured') === 'true';

    const whereClause: Record<string, unknown> = { status: 'active' };
    if (category && category !== 'all') whereClause.category = category;
    if (isHot) whereClause.isHot = true;
    if (isFeatured) whereClause.isFeatured = true;

    const offers = await db.partnerOffer.findMany({
      where: whereClause,
      orderBy: [
        { isHot: 'desc' },
        { isFeatured: 'desc' },
        { popularity: 'desc' },
      ],
      take: 50,
    });

    // Категории
    const categories = await db.partnerOffer.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { status: 'active' },
    });

    // Топ офферы месяца
    const topOffers = await db.partnerOffer.findMany({
      where: { status: 'active' },
      orderBy: { avgROI: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      offers,
      categories: categories.map((c) => ({
        name: c.category,
        count: c._count.id,
      })),
      topOffers,
    });
  } catch (error) {
    console.error('Error fetching partner offers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partner offers' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/partners - Добавить партнёрский оффер
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      offerId,
      network,
      networkOfferId,
      basePayout,
      ourPayout,
      ourCommission,
      category,
      geo,
      affiliateLink,
      postbackUrl,
      isHot,
      isFeatured,
    } = body;

    const offer = await db.partnerOffer.create({
      data: {
        id: nanoid(),
        offerId: offerId || `offer_${Date.now()}`,
        network,
        networkOfferId,
        basePayout: basePayout || 0,
        ourPayout: ourPayout || basePayout || 0,
        ourCommission: ourCommission || 0.20,
        category: category || 'other',
        geo,
        affiliateLink,
        postbackUrl,
        isHot: isHot || false,
        isFeatured: isFeatured || false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error('Error creating partner offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create partner offer' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/partners - Зарегистрировать клик
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { offerId, userId, clickId } = body;

    const click = await db.partnerOfferClick.create({
      data: {
        id: nanoid(),
        offerId,
        userId: userId || 'default',
        clickId,
      },
    });

    // Увеличиваем популярность оффера
    await db.partnerOffer.update({
      where: { id: offerId },
      data: {
        popularity: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      click,
    });
  } catch (error) {
    console.error('Error registering click:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register click' },
      { status: 500 }
    );
  }
}

// PATCH /api/monetization/partners - Зарегистрировать конверсию
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { clickId, revenue } = body;

    const click = await db.partnerOfferClick.findFirst({
      where: { clickId },
    });

    if (!click) {
      return NextResponse.json(
        { success: false, error: 'Click not found' },
        { status: 404 }
      );
    }

    const offer = await db.partnerOffer.findUnique({
      where: { id: click.offerId },
    });

    const ourCommission = revenue * (offer?.ourCommission || 0.20);

    // Обновляем клик
    const updated = await db.partnerOfferClick.update({
      where: { id: click.id },
      data: {
        lead: true,
        conversion: true,
        revenue,
        ourCommission,
        convertedAt: new Date(),
      },
    });

    // Обновляем средний ROI оффера
    await db.partnerOffer.update({
      where: { id: click.offerId },
      data: {
        avgROI: { increment: revenue * 0.1 }, // Упрощённый расчёт
      },
    });

    return NextResponse.json({
      success: true,
      click: updated,
      commission: ourCommission,
    });
  } catch (error) {
    console.error('Error registering conversion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register conversion' },
      { status: 500 }
    );
  }
}

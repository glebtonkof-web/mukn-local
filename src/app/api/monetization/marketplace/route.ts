import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/monetization/marketplace - Получить список связок
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const minROI = parseFloat(searchParams.get('minROI') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const sortBy = searchParams.get('sortBy') || 'popular'; // popular, newest, rating, price_low, price_high

    const whereClause: Record<string, unknown> = {
      status: 'active',
      price: { lte: maxPrice },
    };

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    let orderBy: Record<string, unknown> = { salesCount: 'desc' };
    switch (sortBy) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'rating':
        orderBy = { avgRating: 'desc' };
        break;
      case 'price_low':
        orderBy = { price: 'asc' };
        break;
      case 'price_high':
        orderBy = { price: 'desc' };
        break;
    }

    const listings = await db.marketplaceListing.findMany({
      where: whereClause,
      orderBy,
      take: 50,
      include: {
        reviews: {
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Фильтрация по ROI (если указан)
    let filteredListings = listings;
    if (minROI > 0) {
      filteredListings = listings.filter((listing) => {
        // В реальной реализации ROI хранился бы в связке
        return true; // Упрощённая фильтрация
      });
    }

    // Получаем категории
    const categories = await db.marketplaceListing.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { status: 'active' },
    });

    return NextResponse.json({
      success: true,
      listings: filteredListings,
      categories: categories.map((c) => ({
        name: c.category,
        count: c._count.id,
      })),
      total: filteredListings.length,
    });
  } catch (error) {
    console.error('Error fetching marketplace:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch marketplace listings' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/marketplace - Создать связку для продажи
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sellerId,
      sellerName,
      bundleId,
      name,
      description,
      category,
      subcategory,
      price,
      currency,
      tags,
      config, // JSON конфигурация кампании
    } = body;

    // Создаём связку (CampaignBundle)
    const bundle = await db.campaignBundle.create({
      data: {
        authorId: sellerId || 'default',
        name: name || 'Новая связка',
        description,
        config: config || '{}',
        price: price || 0,
        currency: currency || 'RUB',
        status: 'draft',
        isVerified: false,
      },
    });

    // Создаём листинг на маркетплейсе
    const listing = await db.marketplaceListing.create({
      data: {
        bundleId: bundle.id,
        sellerId: sellerId || 'default',
        sellerName,
        category: category || 'other',
        subcategory,
        price: price || 0,
        currency: currency || 'RUB',
        commissionRate: 0.20,
        tags: tags ? JSON.stringify(tags) : null,
        status: 'pending_review',
      },
    });

    return NextResponse.json({
      success: true,
      bundle,
      listing,
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create listing' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/marketplace - Купить связку
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, buyerId } = body;

    const listing = await db.marketplaceListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    const commission = listing.price * listing.commissionRate;
    const sellerRevenue = listing.price - commission;

    // Создаём транзакцию
    const transaction = await db.marketplaceTransaction.create({
      data: {
        listingId,
        buyerId: buyerId || 'default',
        price: listing.price,
        commission,
        sellerRevenue,
        status: 'completed',
      },
    });

    // Обновляем статистику листинга
    await db.marketplaceListing.update({
      where: { id: listingId },
      data: {
        salesCount: { increment: 1 },
        totalRevenue: { increment: listing.price },
        platformRevenue: { increment: commission },
      },
    });

    // Получаем конфигурацию связки
    const bundle = await db.campaignBundle.findUnique({
      where: { id: listing.bundleId },
    });

    return NextResponse.json({
      success: true,
      transaction,
      bundle,
      purchased: true,
    });
  } catch (error) {
    console.error('Error purchasing listing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to purchase listing' },
      { status: 500 }
    );
  }
}

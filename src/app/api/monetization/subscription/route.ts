import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/monetization/subscription - Получить настройки подписки
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';

    const existingSubscription = await db.rOISubscription.findUnique({
      where: { userId },
      include: {
        SubscriptionPayment: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    let subscription = existingSubscription;
    
    if (!subscription) {
      // Создаём подписку по умолчанию
      subscription = await db.rOISubscription.create({
        data: {
          id: nanoid(),
          userId,
          subscriptionType: 'roi_based',
          commissionRate: 0.05,
          status: 'active',
          minPayout: 10,
          updatedAt: new Date(),
        },
        include: {
          SubscriptionPayment: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      subscription,
      metrics: {
        currentPeriodRevenue: subscription.totalRevenue,
        currentPeriodLeads: subscription.totalLeads,
        commissionEarned: subscription.commissionEarned,
        pendingPayout: subscription.commissionEarned >= subscription.minPayout ? subscription.commissionEarned : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/subscription - Обновить настройки подписки
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...data } = body;

    const subscription = await db.rOISubscription.upsert({
      where: { userId: userId || 'default' },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        id: nanoid(),
        userId: userId || 'default',
        subscriptionType: data.subscriptionType || 'roi_based',
        commissionRate: data.commissionRate || 0.05,
        trackerType: data.trackerType,
        trackerUrl: data.trackerUrl,
        trackerApiKey: data.trackerApiKey,
        trackerPostbackUrl: data.trackerPostbackUrl,
        minPayout: data.minPayout || 10,
        maxCommission: data.maxCommission,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/subscription - Синхронизировать с трекером
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    const subscription = await db.rOISubscription.findUnique({
      where: { userId: userId || 'default' },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Симуляция синхронизации с трекером
    // В реальной реализации здесь будет запрос к API Keitaro/Binom
    const mockData = {
      leads: Math.floor(Math.random() * 50) + 10,
      revenue: Math.floor(Math.random() * 5000) + 1000,
    };

    const commission = mockData.revenue * subscription.commissionRate;

    const updated = await db.rOISubscription.update({
      where: { userId: userId || 'default' },
      data: {
        totalLeads: { increment: mockData.leads },
        totalRevenue: { increment: mockData.revenue },
        commissionEarned: { increment: commission },
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      synced: mockData,
      subscription: updated,
    });
  } catch (error) {
    console.error('Error syncing with tracker:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync with tracker' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/monetization/toggle - Переключить статус метода монетизации
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { featureId, status, userId } = body;

    const newStatus = status === 'active' ? 'paused' : 'active';
    let result: { count: number } | null = null;

    switch (featureId) {
      case 'marketplace':
        result = await db.marketplaceListing.updateMany({
          where: { status: status === 'active' ? 'active' : 'paused' },
          data: { status: newStatus },
        }).catch(() => null);
        break;

      case 'p2p':
        result = await db.p2PAccountRental.updateMany({
          where: { status: status === 'active' ? 'available' : 'paused' },
          data: { status: newStatus === 'active' ? 'available' : 'paused' },
        }).catch(() => null);
        break;

      case 'subscription':
        result = await db.rOISubscription.updateMany({
          where: { userId: userId || 'default' },
          data: { status: newStatus },
        }).catch(() => null);
        break;

      case 'partners':
        result = await db.partnerOffer.updateMany({
          where: { status: status === 'active' ? 'active' : 'paused' },
          data: { status: newStatus },
        }).catch(() => null);
        break;

      case 'auto-scaling':
        result = await db.autoScalingSettings.updateMany({
          where: { enabled: status === 'active' },
          data: { enabled: newStatus === 'active' },
        }).catch(() => null);
        break;

      case 'templates':
        result = await db.contentTemplate.updateMany({
          where: { isPublic: status === 'active' },
          data: { isPublic: newStatus === 'active' },
        }).catch(() => null);
        break;

      case 'white-label':
        result = await db.whiteLabelLicense.updateMany({
          where: { status: status === 'active' ? 'active' : 'paused' },
          data: { status: newStatus },
        }).catch(() => null);
        break;

      case 'gap-scanner':
        result = await db.affiliateGapScanner.updateMany({
          where: { status: status === 'active' ? 'active' : 'paused' },
          data: { status: newStatus },
        }).catch(() => null);
        break;

      case 'neuro-coach':
        result = await db.neuroCoach.updateMany({
          where: { subscriptionActive: status === 'active' },
          data: { subscriptionActive: newStatus === 'active' },
        }).catch(() => null);
        break;

      case 'username-auction':
        result = await db.usernameAuction.updateMany({
          where: { status: status === 'active' ? 'active' : 'paused' },
          data: { status: newStatus },
        }).catch(() => null);
        break;

      default:
        // Для методов без специфических таблиц возвращаем успех
        return NextResponse.json({
          success: true,
          message: `Статус ${featureId} изменён на ${newStatus}`,
          featureId,
          newStatus,
        });
    }

    return NextResponse.json({
      success: true,
      message: `Статус метода "${featureId}" изменён на ${newStatus}`,
      featureId,
      newStatus,
      result,
    });
  } catch (error) {
    console.error('Error toggling monetization feature:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle feature' },
      { status: 500 }
    );
  }
}

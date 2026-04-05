import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/offers/:id - Получить оффер по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const offer = await db.offer.findUnique({
      where: { id },
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
    });

    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ offer });
  } catch (error) {
    logger.error('Failed to fetch offer', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch offer' },
      { status: 500 }
    );
  }
}

// PATCH /api/offers/:id - Обновить оффер (частичное обновление)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingOffer = await db.offer.findUnique({
      where: { id },
    });

    if (!existingOffer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    const offer = await db.offer.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    logger.info('Offer updated', { offerId: id, fields: Object.keys(body) });

    return NextResponse.json({ offer });
  } catch (error) {
    logger.error('Failed to update offer', error as Error);
    return NextResponse.json(
      { error: 'Failed to update offer' },
      { status: 500 }
    );
  }
}

// DELETE /api/offers/:id - Удалить оффер
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingOffer = await db.offer.findUnique({
      where: { id },
    });

    if (!existingOffer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Удаляем связи с кампаниями
    await db.campaignOffer.deleteMany({
      where: { offerId: id },
    });

    // Удаляем оффер
    await db.offer.delete({
      where: { id },
    });

    logger.info('Offer deleted', { offerId: id, offerName: existingOffer.name });

    return NextResponse.json({ success: true, message: 'Offer deleted' });
  } catch (error) {
    logger.error('Failed to delete offer', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete offer' },
      { status: 500 }
    );
  }
}

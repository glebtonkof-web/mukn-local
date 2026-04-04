import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/campaigns/[id]/duplicate - Duplicate a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get original campaign with all relations
    const originalCampaign = await db.campaign.findUnique({
      where: { id },
      include: {
        influencers: true,
        offers: true,
      },
    });

    if (!originalCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Create duplicated campaign
    const duplicatedCampaign = await db.campaign.create({
      data: {
        name: `${originalCampaign.name} (копия)`,
        description: originalCampaign.description,
        type: originalCampaign.type,
        niche: originalCampaign.niche,
        geo: originalCampaign.geo,
        status: 'draft', // Duplicated campaigns start as draft
        budget: originalCampaign.budget,
        spent: 0, // Reset spent
        revenue: 0, // Reset revenue
        leadsCount: 0, // Reset leads
        conversions: 0, // Reset conversions
        currency: originalCampaign.currency,
        startDate: undefined, // Reset dates
        endDate: undefined,
        userId: originalCampaign.userId,
        // Copy influencer relations
        influencers: originalCampaign.influencers.length > 0 ? {
          create: originalCampaign.influencers.map(inf => ({
            influencerId: inf.influencerId,
            role: inf.role,
            status: 'pending',
          })),
        } : undefined,
        // Copy offer relations
        offers: originalCampaign.offers.length > 0 ? {
          create: originalCampaign.offers.map((offer, index) => ({
            offerId: offer.offerId,
            isPrimary: offer.isPrimary || index === 0,
          })),
        } : undefined,
      },
      include: {
        influencers: true,
        offers: true,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        type: 'success',
        message: `Кампания "${originalCampaign.name}" скопирована`,
        campaignId: duplicatedCampaign.id,
      },
    });

    return NextResponse.json({
      success: true,
      campaign: duplicatedCampaign,
    }, { status: 201 });
  } catch (error) {
    console.error('Error duplicating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate campaign' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/campaigns/[id]/pause - Pause a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await db.campaign.findUnique({
      where: { id }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      );
    }

    const updatedCampaign = await db.campaign.update({
      where: { id },
      data: { status: 'paused' }
    });

    // Log activity
    await db.activityLog.create({
      data: {
        type: 'warning',
        message: `Кампания "${campaign.name}" приостановлена`,
        campaignId: id
      }
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        status: updatedCampaign.status
      }
    });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    return NextResponse.json(
      { error: 'Failed to pause campaign' },
      { status: 500 }
    );
  }
}

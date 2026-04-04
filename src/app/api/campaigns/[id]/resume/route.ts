import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/campaigns/[id]/resume - Resume a paused campaign
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

    if (campaign.status !== 'paused') {
      return NextResponse.json(
        { error: 'Campaign is not paused' },
        { status: 400 }
      );
    }

    const updatedCampaign = await db.campaign.update({
      where: { id },
      data: { status: 'active' }
    });

    // Log activity
    await db.activityLog.create({
      data: {
        type: 'success',
        message: `Кампания "${campaign.name}" запущена`,
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
    console.error('Error resuming campaign:', error);
    return NextResponse.json(
      { error: 'Failed to resume campaign' },
      { status: 500 }
    );
  }
}

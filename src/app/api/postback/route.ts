import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// POST /api/postback - Receive conversion postbacks from CPA networks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clickid,
      offer_id,
      payout,
      status,
      sub1,
      sub2,
      sub3,
      sub4,
      sub5,
      ip,
      country,
      device,
      timestamp,
    } = body;

    // Validate required fields
    if (!clickid) {
      return NextResponse.json(
        { error: 'clickid is required' },
        { status: 400 }
      );
    }

    // Find the original click/attribution
    // In a real system, we would look up the click by clickid
    // For now, we'll create a conversion record

    // Find the offer with campaign relation
    const offer = await db.offer.findFirst({
      where: {
        OR: [
          { id: offer_id },
          { networkOfferId: offer_id },
        ],
      },
    });

    // Get campaign ID from offer or find a default campaign
    let campaignId: string | undefined;
    
    // Try to find any active campaign
    const defaultCampaign = await db.campaign.findFirst({
      where: { status: 'active' },
      select: { id: true },
    });
    campaignId = defaultCampaign?.id;

    // Create conversion record only if we have a campaign
    const conversion = campaignId ? await db.campaignAnalytics.create({
      data: {
        id: nanoid(),
        date: new Date(),
        impressions: 0,
        clicks: 0,
        leads: status === 'lead' ? 1 : 0,
        conversions: status === 'conversion' ? 1 : 0,
        spent: 0,
        revenue: parseFloat(payout) || 0,
        campaignId,
      },
    }) : null;

    // Update offer stats
    if (offer) {
      await db.offer.update({
        where: { id: offer.id },
        data: {
          leads: { increment: status === 'lead' ? 1 : 0 },
          conversions: { increment: status === 'conversion' ? 1 : 0 },
          revenue: { increment: parseFloat(payout) || 0 },
        },
      });
    }

    // Log the postback
    logger.info('Postback received', {
      clickid,
      offer_id,
      payout,
      status,
      ip,
      country,
    });

    // Create action log
    await db.actionLog.create({
      data: {
        id: nanoid(),
        action: 'conversion_postback',
        entityType: 'offer',
        entityId: offer?.id || 'unknown',
        details: JSON.stringify({
          clickid,
          offer_id,
          payout,
          status,
          sub1,
          sub2,
          sub3,
          ip,
          country,
          device,
        }),
        userId: 'system',
      },
    }).catch(err => logger.error('Failed to log postback', err));

    return NextResponse.json({
      success: true,
      message: 'Postback processed',
      conversion_id: conversion?.id || null,
    });

  } catch (error) {
    logger.error('Postback processing error', error as Error);
    return NextResponse.json(
      { error: 'Failed to process postback', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/postback - Get postback URL for offer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('offer_id');
    const network = searchParams.get('network') || 'admitad';

    // Generate postback URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const postbackUrl = `${baseUrl}/api/postback?clickid={clickid}&offer_id=${offerId}&payout={payout}&status={status}`;

    // Network-specific parameters
    const networkParams: Record<string, string> = {
      admitad: 'sub1={sub1}&sub2={sub2}&country={country}',
      cpalead: 'subid={subid}&earnings={earnings}',
      cashbox: 'transaction_id={transaction_id}',
    };

    const fullUrl = networkParams[network]
      ? `${postbackUrl}&${networkParams[network]}`
      : postbackUrl;

    return NextResponse.json({
      success: true,
      postback_url: fullUrl,
      network,
      parameters: {
        clickid: 'Unique click identifier',
        offer_id: 'Offer ID in our system',
        payout: 'Commission amount',
        status: 'lead or conversion',
      },
      network_parameters: networkParams[network]?.split('&') || [],
    });

  } catch (error) {
    logger.error('Failed to generate postback URL', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate postback URL' },
      { status: 500 }
    );
  }
}

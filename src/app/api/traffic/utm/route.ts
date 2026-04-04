import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/traffic/utm - Get UTM campaigns
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source');
    const medium = searchParams.get('medium');
    const campaign = searchParams.get('campaign');
    const methodId = searchParams.get('methodId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: Record<string, string | number | undefined> = {};
    if (source) where.source = source;
    if (medium) where.medium = medium;
    if (campaign) where.campaign = campaign;
    if (methodId) where.methodId = parseInt(methodId);

    const utmCampaigns = await db.uTMCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Aggregate stats by source
    const bySource = await db.uTMCampaign.groupBy({
      by: ['source'],
      _sum: {
        totalClicks: true,
        totalConversions: true,
        totalRevenue: true,
      },
      _count: {
        id: true,
      },
    });

    // Aggregate stats by medium
    const byMedium = await db.uTMCampaign.groupBy({
      by: ['medium'],
      _sum: {
        totalClicks: true,
        totalConversions: true,
        totalRevenue: true,
      },
      _count: {
        id: true,
      },
    });

    // Top campaigns
    const topCampaigns = await db.uTMCampaign.findMany({
      orderBy: { totalConversions: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      campaigns: utmCampaigns,
      stats: {
        bySource,
        byMedium,
        topCampaigns,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch UTM campaigns', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch UTM campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/utm - Create UTM campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.source || !body.medium || !body.campaign) {
      return NextResponse.json(
        { error: 'Source, medium, and campaign are required' },
        { status: 400 }
      );
    }

    // Build UTM URL
    const baseUrl = body.baseUrl || 'https://t.me/yourchannel';
    const utmParams = new URLSearchParams({
      utm_source: body.source,
      utm_medium: body.medium,
      utm_campaign: body.campaign,
    });

    if (body.content) utmParams.append('utm_content', body.content);
    if (body.term) utmParams.append('utm_term', body.term);

    const fullUrl = `${baseUrl}?${utmParams.toString()}`;

    // Create or update campaign
    const utmCampaign = await db.uTMCampaign.upsert({
      where: {
        source_medium_campaign: {
          source: body.source,
          medium: body.medium,
          campaign: body.campaign,
        },
      },
      update: {
        content: body.content,
        term: body.term,
        fullUrl,
        methodId: body.methodId,
        sourceId: body.sourceId,
      },
      create: {
        source: body.source,
        medium: body.medium,
        campaign: body.campaign,
        content: body.content,
        term: body.term,
        fullUrl,
        methodId: body.methodId,
        sourceId: body.sourceId,
      },
    });

    logger.info('UTM campaign created/updated', {
      source: body.source,
      medium: body.medium,
      campaign: body.campaign,
    });

    return NextResponse.json({
      success: true,
      utmCampaign,
      trackingUrl: fullUrl,
    });
  } catch (error) {
    logger.error('Failed to create UTM campaign', error as Error);
    return NextResponse.json(
      { error: 'Failed to create UTM campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/utm - Track click/conversion
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, medium, campaign, clicks, conversions, revenue } = body;

    if (!source || !medium || !campaign) {
      return NextResponse.json(
        { error: 'Source, medium, and campaign are required' },
        { status: 400 }
      );
    }

    const utmCampaign = await db.uTMCampaign.update({
      where: {
        source_medium_campaign: {
          source,
          medium,
          campaign,
        },
      },
      data: {
        totalClicks: { increment: clicks || 1 },
        totalConversions: { increment: conversions || 0 },
        totalRevenue: { increment: revenue || 0 },
      },
    });

    return NextResponse.json({
      success: true,
      utmCampaign,
      conversionRate: utmCampaign.totalClicks > 0
        ? ((utmCampaign.totalConversions / utmCampaign.totalClicks) * 100).toFixed(2)
        : 0,
    });
  } catch (error) {
    logger.error('Failed to track UTM event', error as Error);
    return NextResponse.json(
      { error: 'Failed to track UTM event' },
      { status: 500 }
    );
  }
}

// PATCH /api/traffic/utm - Generate UTM for traffic method
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, profileId, channelId, customParams } = body;

    // Determine source and medium based on method
    const methodToSource: Record<number, { source: string; medium: string }> = {
      // Telegram methods
      1: { source: 'telegram', medium: 'comment' },
      2: { source: 'telegram', medium: 'story' },
      3: { source: 'telegram', medium: 'reaction' },
      4: { source: 'telegram', medium: 'voice' },
      5: { source: 'telegram', medium: 'poll' },
      6: { source: 'telegram', medium: 'competitor_reply' },
      7: { source: 'telegram', medium: 'top_comment' },
      8: { source: 'telegram', medium: 'sticker' },
      9: { source: 'telegram', medium: 'self_like' },
      10: { source: 'telegram', medium: 'fake_news' },
      // Instagram methods
      11: { source: 'instagram', medium: 'reels_comment' },
      12: { source: 'instagram', medium: 'mass_follow' },
      13: { source: 'instagram', medium: 'story' },
      14: { source: 'instagram', medium: 'dm' },
      15: { source: 'instagram', medium: 'emoji_comment' },
      16: { source: 'instagram', medium: 'story_repost' },
      17: { source: 'instagram', medium: 'collab' },
      // TikTok methods
      18: { source: 'tiktok', medium: 'viral_comment' },
      19: { source: 'tiktok', medium: 'telegram_link' },
      20: { source: 'tiktok', medium: 'duet' },
      21: { source: 'tiktok', medium: 'auto_like' },
      22: { source: 'tiktok', medium: 'author_reply' },
      23: { source: 'tiktok', medium: 'sound' },
      // Cross-platform methods
      24: { source: 'tiktok', medium: 'cross_telegram' },
      25: { source: 'instagram', medium: 'cross_telegram' },
      26: { source: 'youtube', medium: 'cross_telegram' },
      27: { source: 'twitter', medium: 'cross_telegram' },
      28: { source: 'pinterest', medium: 'cross_telegram' },
      29: { source: 'reddit', medium: 'cross_telegram' },
      30: { source: 'linkedin', medium: 'cross_telegram' },
    };

    const mapping = methodToSource[methodId] || { source: 'unknown', medium: 'unknown' };

    // Build campaign name
    const campaignName = [
      profileId ? `p_${profileId.slice(0, 8)}` : 'auto',
      channelId ? `c_${channelId.slice(0, 8)}` : 'main',
      new Date().toISOString().split('T')[0],
    ].join('_');

    // Build full UTM params
    const baseUrl = customParams?.baseUrl || 'https://t.me/yourchannel';
    const utmParams = new URLSearchParams({
      utm_source: mapping.source,
      utm_medium: mapping.medium,
      utm_campaign: campaignName,
    });

    if (customParams?.content) {
      utmParams.append('utm_content', customParams.content);
    }
    if (customParams?.term) {
      utmParams.append('utm_term', customParams.term);
    }

    const fullUrl = `${baseUrl}?${utmParams.toString()}`;

    // Save to database
    const utmCampaign = await db.uTMCampaign.create({
      data: {
        source: mapping.source,
        medium: mapping.medium,
        campaign: campaignName,
        content: customParams?.content,
        term: customParams?.term,
        fullUrl,
        methodId,
        sourceId: customParams?.sourceId,
      },
    });

    return NextResponse.json({
      success: true,
      utmCampaign,
      trackingUrl: fullUrl,
      mapping,
      shortUrl: fullUrl.length > 100 ? 'URL too long, use shortener' : fullUrl,
    });
  } catch (error) {
    logger.error('Failed to generate UTM', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate UTM' },
      { status: 500 }
    );
  }
}

// DELETE /api/traffic/utm - Delete UTM campaign
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    await db.uTMCampaign.delete({
      where: { id },
    });

    logger.info('UTM campaign deleted', { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete UTM campaign', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete UTM campaign' },
      { status: 500 }
    );
  }
}

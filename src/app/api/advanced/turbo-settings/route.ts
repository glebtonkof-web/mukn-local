// API: Режим турбо-профит (УРОВЕНЬ 3, функция 13)
import { NextRequest, NextResponse } from 'next/server';
import { getTurboProfitSettings } from '@/lib/advanced-ai-engine';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }
    
    const settings = await getTurboProfitSettings(userId);
    
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('[TurboSettings API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get turbo settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, enabled, aggressionLevel, settings, acknowledgeRisk } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }
    
    const turboSettings = await db.turboProfitSettings.upsert({
      where: { userId },
      create: {
        userId,
        enabled: enabled ?? false,
        aggressionLevel: aggressionLevel ?? 50,
        shortDelays: settings?.shortDelays ?? true,
        riskyStyles: settings?.riskyStyles ?? true,
        complexOffers: settings?.complexOffers ?? false,
        maxBanRisk: settings?.maxBanRisk ?? 70,
        riskAcknowledged: acknowledgeRisk ?? false,
        acknowledgedAt: acknowledgeRisk ? new Date() : null,
      },
      update: {
        enabled: enabled ?? undefined,
        aggressionLevel: aggressionLevel ?? undefined,
        shortDelays: settings?.shortDelays ?? undefined,
        riskyStyles: settings?.riskyStyles ?? undefined,
        complexOffers: settings?.complexOffers ?? undefined,
        maxBanRisk: settings?.maxBanRisk ?? undefined,
        riskAcknowledged: acknowledgeRisk ?? undefined,
        acknowledgedAt: acknowledgeRisk ? new Date() : undefined,
      },
    });
    
    return NextResponse.json({
      success: true,
      settings: turboSettings,
    });
  } catch (error) {
    console.error('[TurboSettings API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update turbo settings' },
      { status: 500 }
    );
  }
}

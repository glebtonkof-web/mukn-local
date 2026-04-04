// API: Динамическая замена оффера (УРОВЕНЬ 2, функция 7)
// Автоматически переключает на резервный оффер при плохих метриках
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Получить настройки динамической замены для кампании
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    
    // Если campaignId не передан, возвращаем список всех настроек
    if (!campaignId) {
      const allSettings = await db.dynamicOfferReplacement.findMany({
        take: 50,
        orderBy: { updatedAt: 'desc' },
      });
      
      return NextResponse.json({
        success: true,
        settings: allSettings,
        total: allSettings.length,
        hint: 'Provide campaignId query parameter to get specific campaign settings',
      });
    }
    
    const settings = await db.dynamicOfferReplacement.findFirst({
      where: { campaignId },
    });
    
    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: null,
        message: 'No dynamic offer replacement configured for this campaign',
      });
    }
    
    // Получаем информацию об офферах
    const [primaryOffer, backupOffer, currentOffer] = await Promise.all([
      db.offer.findUnique({ where: { id: settings.primaryOfferId } }),
      settings.backupOfferId ? db.offer.findUnique({ where: { id: settings.backupOfferId } }) : null,
      settings.currentOfferId ? db.offer.findUnique({ where: { id: settings.currentOfferId } }) : null,
    ]);
    
    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        primaryOffer,
        backupOffer,
        currentOffer,
      },
    });
  } catch (error) {
    console.error('[DynamicOffer API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get dynamic offer settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Создать/обновить настройки динамической замены оффера
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      primaryOfferId,
      backupOfferId,
      minReactionThreshold = 10,
      checkAfterMinutes = 5,
    } = body;
    
    if (!campaignId || !primaryOfferId) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignId, primaryOfferId' },
        { status: 400 }
      );
    }
    
    // Проверяем существование кампании и офферов
    const [campaign, primaryOffer, backupOffer] = await Promise.all([
      db.campaign.findUnique({ where: { id: campaignId } }),
      db.offer.findUnique({ where: { id: primaryOfferId } }),
      backupOfferId ? db.offer.findUnique({ where: { id: backupOfferId } }) : Promise.resolve(null),
    ]);
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    if (!primaryOffer) {
      return NextResponse.json(
        { error: 'Primary offer not found' },
        { status: 404 }
      );
    }
    
    if (backupOfferId && !backupOffer) {
      return NextResponse.json(
        { error: 'Backup offer not found' },
        { status: 404 }
      );
    }
    
    // Создаём или обновляем настройки
    const existingSettings = await db.dynamicOfferReplacement.findFirst({
      where: { campaignId },
    });
    
    const settings = await db.dynamicOfferReplacement.upsert({
      where: { id: existingSettings?.id ?? 'non-existent' },
      create: {
        campaignId,
        primaryOfferId,
        backupOfferId,
        minReactionThreshold,
        checkAfterMinutes,
        currentOfferId: primaryOfferId,
      },
      update: {
        primaryOfferId,
        backupOfferId,
        minReactionThreshold,
        checkAfterMinutes,
      },
    });
    
    return NextResponse.json({
      success: true,
      settings,
      message: 'Dynamic offer replacement settings saved successfully',
    });
  } catch (error) {
    console.error('[DynamicOffer API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to save dynamic offer settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT: Обновить метрики и проверить необходимость замены оффера
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      metrics,
    } = body;
    
    if (!campaignId || !metrics) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignId, metrics' },
        { status: 400 }
      );
    }
    
    const settings = await db.dynamicOfferReplacement.findFirst({
      where: { campaignId },
    });
    
    if (!settings) {
      return NextResponse.json(
        { error: 'No dynamic offer replacement configured for this campaign' },
        { status: 404 }
      );
    }
    
    const { comments, clicks, conversions, minutesElapsed } = metrics;
    
    // Сохраняем текущие метрики
    const primaryResults = JSON.stringify({ comments, clicks, conversions, minutesElapsed });
    await db.dynamicOfferReplacement.update({
      where: { id: settings.id },
      data: { primaryResults },
    });
    
    // Проверяем условия замены
    const shouldCheck = minutesElapsed >= settings.checkAfterMinutes;
    const thresholdNotMet = clicks < settings.minReactionThreshold;
    const conversionRate = clicks > 0 ? conversions / clicks : 0;
    const lowConversion = conversionRate < 0.01;
    
    let shouldReplace = false;
    let reason = '';
    let newOfferId = settings.currentOfferId;
    
    if (shouldCheck && settings.backupOfferId) {
      if (thresholdNotMet) {
        shouldReplace = true;
        reason = `Click threshold not met: ${clicks} < ${settings.minReactionThreshold}`;
      } else if (lowConversion) {
        shouldReplace = true;
        reason = `Low conversion rate: ${(conversionRate * 100).toFixed(2)}%`;
      }
      
      if (shouldReplace && settings.backupOfferId) {
        // Активируем резервный оффер
        await db.dynamicOfferReplacement.update({
          where: { id: settings.id },
          data: {
            currentOfferId: settings.backupOfferId,
            backupActivatedAt: new Date(),
            replacedCount: { increment: 1 },
          },
        });
        newOfferId = settings.backupOfferId;
      }
    }
    
    return NextResponse.json({
      success: true,
      analysis: {
        shouldCheck,
        thresholdNotMet,
        lowConversion,
        conversionRate,
        shouldReplace,
        reason,
      },
      currentOfferId: shouldReplace ? newOfferId : settings.currentOfferId,
      replaced: shouldReplace,
    });
  } catch (error) {
    console.error('[DynamicOffer API] PUT Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze and update offer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Удалить настройки динамической замены
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Missing required field: campaignId' },
        { status: 400 }
      );
    }
    
    const settings = await db.dynamicOfferReplacement.findFirst({
      where: { campaignId },
    });
    
    if (!settings) {
      return NextResponse.json(
        { error: 'No dynamic offer replacement found for this campaign' },
        { status: 404 }
      );
    }
    
    await db.dynamicOfferReplacement.delete({
      where: { id: settings.id },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Dynamic offer replacement settings deleted successfully',
    });
  } catch (error) {
    console.error('[DynamicOffer API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete dynamic offer settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

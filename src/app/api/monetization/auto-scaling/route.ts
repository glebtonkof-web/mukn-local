import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/monetization/auto-scaling - Получить настройки авто-масштабирования
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (campaignId) {
      const settings = await db.autoScalingSettings.findUnique({
        where: { campaignId },
      });
      return NextResponse.json({ success: true, settings });
    }

    const allSettings = await db.autoScalingSettings.findMany({
      where: { enabled: true },
    });

    // Демо-данные если пусто
    if (allSettings.length === 0) {
      return NextResponse.json({
        success: true,
        settings: [
          {
            id: 'demo-scale-1',
            campaignId: 'campaign-1',
            roiThreshold: 150,
            checkIntervalHours: 3,
            scaleFactor: 1.5,
            maxBudget: 5000,
            maxChannels: 50,
            enabled: true,
            scaleCount: 3,
            lastScaleAt: new Date(Date.now() - 86400000),
          },
        ],
      });
    }

    return NextResponse.json({ success: true, settings: allSettings });
  } catch (error) {
    console.error('Error fetching auto-scaling:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch auto-scaling settings' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/auto-scaling - Создать/обновить настройки
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      roiThreshold = 150,
      checkIntervalHours = 3,
      scaleFactor = 1.5,
      maxBudget,
      maxChannels,
      enabled = true,
    } = body;

    const settings = await db.autoScalingSettings.upsert({
      where: { campaignId },
      update: {
        roiThreshold,
        checkIntervalHours,
        scaleFactor,
        maxBudget,
        maxChannels,
        enabled,
      },
      create: {
        campaignId,
        roiThreshold,
        checkIntervalHours,
        scaleFactor,
        maxBudget,
        maxChannels,
        enabled,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
      message: 'Настройки авто-масштабирования сохранены',
    });
  } catch (error) {
    console.error('Error saving auto-scaling:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/auto-scaling - Принудительное масштабирование
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, action } = body;

    if (action === 'scale_up') {
      // Симуляция масштабирования
      const settings = await db.autoScalingSettings.findUnique({
        where: { campaignId },
      });

      if (!settings) {
        return NextResponse.json(
          { success: false, error: 'Settings not found' },
          { status: 404 }
        );
      }

      // Обновляем счётчик
      await db.autoScalingSettings.update({
        where: { campaignId },
        data: {
          scaleCount: { increment: 1 },
          lastScaleAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Кампания масштабирована на ${settings.scaleFactor}x`,
        newBudget: (settings.maxBudget || 1000) * settings.scaleFactor,
      });
    }

    if (action === 'check_roi') {
      // Проверка ROI для автоматического масштабирования
      const roi = Math.floor(Math.random() * 100) + 80; // Демо ROI
      
      return NextResponse.json({
        success: true,
        roi,
        shouldScale: roi >= 150,
        message: roi >= 150 
          ? `ROI ${roi}% превышает порог - рекомендуется масштабирование`
          : `ROI ${roi}% ниже порога масштабирования`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in auto-scaling action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}

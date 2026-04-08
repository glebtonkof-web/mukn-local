/**
 * API: Auto Content Service
 * Главный endpoint для системы автогенерации контента 24/365
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAutoContentService, initializeAutoContent } from '@/lib/auto-content';

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (initialized) return;

  if (!initPromise) {
    initPromise = initializeAutoContent().then(() => {
      initialized = true;
    });
  }

  await initPromise;
}

/**
 * GET /api/auto-content
 * Статус сервиса автогенерации
 */
export async function GET(request: NextRequest) {
  try {
    await ensureInitialized();

    const service = getAutoContentService();
    const campaigns = await service.getCampaigns();

    const stats = {
      total: campaigns.length,
      running: campaigns.filter(c => c.status === 'running').length,
      paused: campaigns.filter(c => c.status === 'paused').length,
      stopped: campaigns.filter(c => c.status === 'stopped').length,
      error: campaigns.filter(c => c.status === 'error').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        status: 'running',
        initialized,
        campaigns: stats,
        features: {
          contentTypes: ['video', 'image', 'text', 'audio'],
          promptVariation: true,
          autoPublish: true,
          scheduling: true,
          limits: true,
        },
      },
    });
  } catch (error: any) {
    console.error('Failed to get auto-content status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auto-content
 * Управление сервисом
 */
export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();

    const body = await request.json();
    const { action } = body;

    const service = getAutoContentService();

    switch (action) {
      case 'start_all':
        // Запуск всех paused кампаний
        const pausedCampaigns = await service.getCampaigns('paused');
        for (const campaign of pausedCampaigns) {
          await service.startCampaign(campaign.id);
        }
        return NextResponse.json({
          success: true,
          message: `Started ${pausedCampaigns.length} campaigns`,
        });

      case 'stop_all':
        // Остановка всех running кампаний
        const runningCampaigns = await service.getCampaigns('running');
        for (const campaign of runningCampaigns) {
          await service.stopCampaign(campaign.id);
        }
        return NextResponse.json({
          success: true,
          message: `Stopped ${runningCampaigns.length} campaigns`,
        });

      case 'shutdown':
        await service.shutdown();
        return NextResponse.json({
          success: true,
          message: 'Service shutdown complete',
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Failed to execute action:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * API: Auto Content Campaigns
 * Управление кампаниями автогенерации контента 24/365
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAutoContentService, initializeAutoContent } from '@/lib/auto-content';
import { CreateCampaignInput } from '@/lib/auto-content/types';

// Инициализация при первом запросе
let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await initializeAutoContent();
    initialized = true;
  }
}

/**
 * GET /api/auto-content/campaigns
 * Получение списка кампаний
 */
export async function GET(request: NextRequest) {
  await ensureInitialized();

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;

    const service = getAutoContentService();
    const campaigns = await service.getCampaigns(status);

    // Парсим JSON поля
    const parsedCampaigns = campaigns.map(campaign => ({
      ...campaign,
      contentTypes: JSON.parse(campaign.contentTypes),
      prompts: JSON.parse(campaign.prompts),
      generationConfig: campaign.generationConfig ? JSON.parse(campaign.generationConfig) : null,
      workDays: JSON.parse(campaign.workDays),
      promptVariation: campaign.promptVariation ? JSON.parse(campaign.promptVariation) : null,
      publishPlatforms: campaign.publishPlatforms ? JSON.parse(campaign.publishPlatforms) : null,
      publishConfig: campaign.publishConfig ? JSON.parse(campaign.publishConfig) : null,
      tags: campaign.tags ? JSON.parse(campaign.tags) : null,
    }));

    return NextResponse.json({
      success: true,
      data: parsedCampaigns,
    });
  } catch (error: any) {
    console.error('Failed to get campaigns:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auto-content/campaigns
 * Создание новой кампании
 */
export async function POST(request: NextRequest) {
  await ensureInitialized();

  try {
    const body = await request.json();

    const input: CreateCampaignInput = {
      name: body.name,
      description: body.description,
      contentTypes: body.contentTypes || ['image'],
      prompts: body.prompts || { basePrompt: body.prompt || '' },
      generationConfig: body.generationConfig,
      schedule: body.schedule,
      limits: body.limits,
      promptVariation: body.promptVariation,
      publish: body.publish,
      tags: body.tags,
      priority: body.priority,
    };

    if (!input.name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!input.prompts.basePrompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const service = getAutoContentService();
    const campaignId = await service.createCampaign(input);

    // Если указано autoStart - запускаем кампанию
    if (body.autoStart) {
      await service.startCampaign(campaignId);
    }

    const campaign = await service.getCampaign(campaignId);

    return NextResponse.json({
      success: true,
      data: {
        id: campaignId,
        campaign,
      },
    });
  } catch (error: any) {
    console.error('Failed to create campaign:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * API: Auto Content Campaign by ID
 * Получение, обновление и удаление кампании
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAutoContentService, initializeAutoContent } from '@/lib/auto-content';

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await initializeAutoContent();
    initialized = true;
  }
}

/**
 * GET /api/auto-content/campaigns/[id]
 * Получение кампании по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInitialized();

  try {
    const { id } = await params;
    const service = getAutoContentService();
    const campaign = await service.getCampaign(id);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Парсим JSON поля
    const parsedCampaign = {
      ...campaign,
      contentTypes: JSON.parse(campaign.contentTypes),
      prompts: JSON.parse(campaign.prompts),
      generationConfig: campaign.generationConfig ? JSON.parse(campaign.generationConfig) : null,
      workDays: JSON.parse(campaign.workDays),
      promptVariation: campaign.promptVariation ? JSON.parse(campaign.promptVariation) : null,
      publishPlatforms: campaign.publishPlatforms ? JSON.parse(campaign.publishPlatforms) : null,
      publishConfig: campaign.publishConfig ? JSON.parse(campaign.publishConfig) : null,
      tags: campaign.tags ? JSON.parse(campaign.tags) : null,
      AutoContentJob: campaign.AutoContentJob?.map((job: any) => ({
        ...job,
        generationParams: job.generationParams ? JSON.parse(job.generationParams) : null,
        metadata: job.metadata ? JSON.parse(job.metadata) : null,
      })),
    };

    return NextResponse.json({
      success: true,
      data: parsedCampaign,
    });
  } catch (error: any) {
    console.error('Failed to get campaign:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auto-content/campaigns/[id]
 * Обновление кампании
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInitialized();

  try {
    const { id } = await params;
    const body = await request.json();

    const service = getAutoContentService();
    await service.updateCampaign(id, body);

    const campaign = await service.getCampaign(id);

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error: any) {
    console.error('Failed to update campaign:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auto-content/campaigns/[id]
 * Удаление кампании
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInitialized();

  try {
    const { id } = await params;
    const service = getAutoContentService();
    await service.deleteCampaign(id);

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted',
    });
  } catch (error: any) {
    console.error('Failed to delete campaign:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

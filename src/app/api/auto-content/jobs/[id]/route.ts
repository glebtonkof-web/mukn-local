/**
 * API: Auto Content Job by ID
 * Получение информации о задаче
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
 * GET /api/auto-content/jobs/[id]
 * Получение задачи по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInitialized();

  try {
    const { id } = await params;
    const service = getAutoContentService();
    const job = await service.getJob(id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Парсим JSON поля
    const parsedJob = {
      ...job,
      generationParams: job.generationParams ? JSON.parse(job.generationParams) : null,
      metadata: job.metadata ? JSON.parse(job.metadata) : null,
      AutoContentCampaign: job.AutoContentCampaign ? {
        ...job.AutoContentCampaign,
        contentTypes: JSON.parse(job.AutoContentCampaign.contentTypes),
        prompts: JSON.parse(job.AutoContentCampaign.prompts),
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: parsedJob,
    });
  } catch (error: any) {
    console.error('Failed to get job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

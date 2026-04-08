/**
 * API: Auto Content Jobs
 * Управление задачами генерации
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
 * GET /api/auto-content/jobs
 * Получение списка задач
 */
export async function GET(request: NextRequest) {
  await ensureInitialized();

  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const service = getAutoContentService();

    let jobs;
    if (campaignId) {
      jobs = await service.getJobs(campaignId, limit);
    } else {
      // Получаем все задачи из всех кампаний
      const campaigns = await service.getCampaigns();
      jobs = [];
      for (const campaign of campaigns.slice(0, 10)) { // Ограничиваем
        const campaignJobs = await service.getJobs(campaign.id, 10);
        jobs.push(...campaignJobs);
      }
    }

    // Парсим JSON поля
    const parsedJobs = jobs.map(job => ({
      ...job,
      generationParams: job.generationParams ? JSON.parse(job.generationParams) : null,
      metadata: job.metadata ? JSON.parse(job.metadata) : null,
    }));

    return NextResponse.json({
      success: true,
      data: parsedJobs,
    });
  } catch (error: any) {
    console.error('Failed to get jobs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

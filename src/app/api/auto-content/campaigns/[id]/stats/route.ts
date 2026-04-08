/**
 * API: Campaign Stats
 * Статистика кампании автогенерации
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
 * GET /api/auto-content/campaigns/[id]/stats
 * Получение статистики кампании
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInitialized();

  try {
    const { id } = await params;
    const service = getAutoContentService();
    const stats = await service.getCampaignStats(id);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Failed to get campaign stats:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

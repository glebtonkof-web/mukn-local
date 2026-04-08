/**
 * API: Stop Campaign
 * Остановка кампании автогенерации
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
 * POST /api/auto-content/campaigns/[id]/stop
 * Полная остановка кампании
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInitialized();

  try {
    const { id } = await params;
    const service = getAutoContentService();
    await service.stopCampaign(id);

    return NextResponse.json({
      success: true,
      message: 'Campaign stopped',
      data: { id, status: 'stopped' },
    });
  } catch (error: any) {
    console.error('Failed to stop campaign:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

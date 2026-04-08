/**
 * Dead Letter Queue API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDeadLetterQueue } from '@/lib/dead-letter-queue';

const dlq = getDeadLetterQueue();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await dlq.getStats();
      return NextResponse.json({ success: true, stats });
    }

    if (action === 'top-errors') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const errors = await dlq.getTopErrors(limit);
      return NextResponse.json({ success: true, errors });
    }

    // List entries
    const taskType = searchParams.get('taskType') || undefined;
    const resolved = searchParams.get('resolved');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const entries = await dlq.list({
      taskType,
      resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
      limit,
      offset
    });

    return NextResponse.json({ success: true, entries });
  } catch (error: any) {
    console.error('DLQ GET error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, ids, resolution, resolvedBy } = body;

    if (action === 'retry' && id) {
      const result = await dlq.retry(id);
      return NextResponse.json({ success: result });
    }

    if (action === 'bulk-retry' && ids) {
      const result = await dlq.bulkRetry(ids);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'resolve' && id) {
      const result = await dlq.resolve(id, resolution || 'manual', resolvedBy || 'user');
      return NextResponse.json({ success: result });
    }

    if (action === 'cleanup') {
      const olderThanDays = body.olderThanDays || 30;
      const deleted = await dlq.cleanup(olderThanDays);
      return NextResponse.json({ success: true, deleted });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
  } catch (error: any) {
    console.error('DLQ POST error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

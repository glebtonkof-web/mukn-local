/**
 * Alerts API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAlertService } from '@/lib/alert-service';

const alertService = getAlertService();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'stats') {
      const hours = parseInt(searchParams.get('hours') || '24');
      const stats = await alertService.getStats(hours);
      return NextResponse.json({ success: true, stats });
    }

    if (action === 'unacknowledged') {
      const limit = parseInt(searchParams.get('limit') || '50');
      const alerts = await alertService.getUnacknowledged(limit);
      return NextResponse.json({ success: true, alerts });
    }

    return NextResponse.json({
      success: false,
      error: 'Specify action: stats, unacknowledged'
    }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, severity, category, title, message, details, alertId, acknowledgedBy } = body;

    if (action === 'create') {
      if (!severity || !category || !title || !message) {
        return NextResponse.json({
          success: false,
          error: 'severity, category, title, message required'
        }, { status: 400 });
      }

      const alert = await alertService.alert(severity, category, title, message, details);
      return NextResponse.json({ success: true, alert });
    }

    if (action === 'acknowledge') {
      if (!alertId || !acknowledgedBy) {
        return NextResponse.json({
          success: false,
          error: 'alertId and acknowledgedBy required'
        }, { status: 400 });
      }

      const result = await alertService.acknowledge(alertId, acknowledgedBy);
      return NextResponse.json({ success: result });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

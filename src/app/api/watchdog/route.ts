/**
 * Watchdog API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSystemWatchdog } from '@/lib/system-watchdog';

const watchdog = getSystemWatchdog();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'status') {
      const status = watchdog.getStatus();
      return NextResponse.json({ success: true, status });
    }

    if (action === 'config') {
      const config = watchdog.getConfig();
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json({
      success: false,
      error: 'Specify action: status, config'
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
    const { action, config } = body;

    if (action === 'start') {
      watchdog.start();
      return NextResponse.json({ success: true, message: 'Watchdog started' });
    }

    if (action === 'stop') {
      watchdog.stop();
      return NextResponse.json({ success: true, message: 'Watchdog stopped' });
    }

    if (action === 'force-check') {
      const result = await watchdog.forceCheck();
      return NextResponse.json({ success: true, result });
    }

    if (action === 'update-config') {
      watchdog.updateConfig(config);
      return NextResponse.json({ success: true, message: 'Config updated' });
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

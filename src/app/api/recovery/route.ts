/**
 * Recovery API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAutoRecovery } from '@/lib/auto-recovery';

const recovery = getAutoRecovery();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'status') {
      const status = recovery.getStatus();
      return NextResponse.json({ success: true, status });
    }

    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '50');
      const history = recovery.getHistory(limit);
      return NextResponse.json({ success: true, history });
    }

    return NextResponse.json({
      success: false,
      error: 'Specify action: status, history'
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
    const { action, component } = body;

    if (action === 'run') {
      const results = await recovery.runRecovery();
      return NextResponse.json({ success: true, results });
    }

    if (action === 'force') {
      if (!component) {
        return NextResponse.json({
          success: false,
          error: 'component required'
        }, { status: 400 });
      }

      const result = await recovery.forceRecover(component);
      return NextResponse.json({ success: true, result });
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

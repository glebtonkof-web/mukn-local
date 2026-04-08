/**
 * Sticky Sessions API
 *
 * Управление привязкой прокси к аккаунтам
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStickySessions } from '@/lib/sticky-sessions';

const stickySessions = getStickySessions();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await stickySessions.getStats();
      return NextResponse.json({ success: true, stats });
    }

    if (action === 'list') {
      const platform = searchParams.get('platform') || undefined;
      const accountId = searchParams.get('accountId') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50');

      const sessions = await stickySessions.listActive({ platform, accountId, limit });
      return NextResponse.json({ success: true, sessions });
    }

    if (action === 'get-for-account') {
      const accountId = searchParams.get('accountId');
      if (!accountId) {
        return NextResponse.json({
          success: false,
          error: 'accountId required'
        }, { status: 400 });
      }

      const session = await stickySessions.getForAccount(accountId);
      return NextResponse.json({ success: true, session });
    }

    if (action === 'get-for-proxy') {
      const proxyId = searchParams.get('proxyId');
      if (!proxyId) {
        return NextResponse.json({
          success: false,
          error: 'proxyId required'
        }, { status: 400 });
      }

      const session = await stickySessions.getForProxy(proxyId);
      return NextResponse.json({ success: true, session });
    }

    return NextResponse.json({
      success: false,
      error: 'Specify action: stats, list, get-for-account, get-for-proxy'
    }, { status: 400 });
  } catch (error: any) {
    console.error('Sticky Sessions GET error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'bind') {
      const { proxyId, proxyInfo, accountId, platform, bindDuration } = body;

      if (!proxyId || !proxyInfo) {
        return NextResponse.json({
          success: false,
          error: 'proxyId and proxyInfo required'
        }, { status: 400 });
      }

      const session = await stickySessions.bind(proxyId, proxyInfo, {
        accountId,
        platform,
        bindDuration
      });

      return NextResponse.json({ success: true, session });
    }

    if (action === 'get-or-bind') {
      const { proxyId, proxyInfo, accountId, platform, bindDuration } = body;

      if (!proxyId || !proxyInfo || !accountId) {
        return NextResponse.json({
          success: false,
          error: 'proxyId, proxyInfo and accountId required'
        }, { status: 400 });
      }

      const session = await stickySessions.getOrBind(proxyId, proxyInfo, accountId, {
        platform,
        bindDuration
      });

      return NextResponse.json({ success: true, session });
    }

    if (action === 'renew') {
      const { sessionId, additionalSeconds } = body;

      if (!sessionId) {
        return NextResponse.json({
          success: false,
          error: 'sessionId required'
        }, { status: 400 });
      }

      const result = await stickySessions.renew(sessionId, additionalSeconds);
      return NextResponse.json({ success: result });
    }

    if (action === 'release') {
      const { sessionId } = body;

      if (!sessionId) {
        return NextResponse.json({
          success: false,
          error: 'sessionId required'
        }, { status: 400 });
      }

      const result = await stickySessions.release(sessionId);
      return NextResponse.json({ success: result });
    }

    if (action === 'release-for-account') {
      const { accountId } = body;

      if (!accountId) {
        return NextResponse.json({
          success: false,
          error: 'accountId required'
        }, { status: 400 });
      }

      const count = await stickySessions.releaseForAccount(accountId);
      return NextResponse.json({ success: true, released: count });
    }

    if (action === 'cleanup-expired') {
      const count = await stickySessions.cleanupExpired();
      return NextResponse.json({ success: true, expired: count });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
  } catch (error: any) {
    console.error('Sticky Sessions POST error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

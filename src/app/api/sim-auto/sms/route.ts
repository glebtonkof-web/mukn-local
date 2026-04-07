/**
 * SIM Auto SMS API
 * POST: Start SMS listener or verification
 * GET: Get pending verifications or recent SMS
 * DELETE: Cancel SMS listener or verification
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  startSmsListener,
  stopSmsListener,
  waitForCode,
  getPendingVerifications,
  getActiveSmsListeners,
  cancelVerification,
  getVerification,
  startVerification,
  setWaitingForCode,
  completeVerification,
  failVerification,
  getRecentSms,
  searchVerificationCodes,
  parseVerificationCode,
  onSmsEvent
} from '@/lib/sim-auto';
import { logger } from '@/lib/logger';
import { Platform } from '@/lib/sim-auto/types';

/**
 * GET /api/sim-auto/sms
 * Get pending verifications, active listeners, or recent SMS
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'pending';
    
    switch (action) {
      case 'pending':
        // Get pending verifications
        const pending = await getPendingVerifications();
        return NextResponse.json({
          success: true,
          verifications: pending,
          count: pending.length
        });
        
      case 'listeners':
        // Get active SMS listeners
        const listeners = getActiveSmsListeners();
        return NextResponse.json({
          success: true,
          listeners,
          count: listeners.length
        });
        
      case 'recent':
        // Get recent SMS for a device
        const deviceId = searchParams.get('deviceId');
        const limit = parseInt(searchParams.get('limit') || '20');
        
        if (!deviceId) {
          return NextResponse.json(
            { error: 'Device ID is required' },
            { status: 400 }
          );
        }
        
        const messages = await getRecentSms(deviceId, limit);
        return NextResponse.json({
          success: true,
          messages,
          count: messages.length
        });
        
      case 'verification':
        // Get specific verification
        const verificationId = searchParams.get('id');
        
        if (!verificationId) {
          return NextResponse.json(
            { error: 'Verification ID is required' },
            { status: 400 }
          );
        }
        
        const verification = await getVerification(verificationId);
        
        if (!verification) {
          return NextResponse.json(
            { error: 'Verification not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          verification
        });
        
      case 'search':
        // Search verification codes
        const phoneNumber = searchParams.get('phoneNumber') || undefined;
        const platform = searchParams.get('platform') as Platform || undefined;
        const sinceStr = searchParams.get('since');
        const since = sinceStr ? new Date(sinceStr) : undefined;
        
        const codes = await searchVerificationCodes({
          phoneNumber,
          platform,
          since
        });
        
        return NextResponse.json({
          success: true,
          codes,
          count: codes.length
        });
        
      case 'status':
      default:
        // Return overall status
        const activeListeners = getActiveSmsListeners();
        const pendingVerifications = await getPendingVerifications();
        
        return NextResponse.json({
          listenersCount: activeListeners.length,
          pendingCount: pendingVerifications.length,
          listeners: activeListeners,
          pending: pendingVerifications
        });
    }
  } catch (error) {
    logger.error('SIM SMS GET failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to get SMS status', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sim-auto/sms
 * Start SMS listener or verification process
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'start_listener';
    
    switch (action) {
      case 'start_listener':
        // Start SMS listener for a device
        const { deviceId } = body;
        
        if (!deviceId) {
          return NextResponse.json(
            { error: 'Device ID is required' },
            { status: 400 }
          );
        }
        
        const listenerResult = await startSmsListener(deviceId);
        
        return NextResponse.json({
          success: listenerResult.success,
          error: listenerResult.error
        });
        
      case 'stop_listener':
        // Stop SMS listener for a device
        const { deviceId: stopDeviceId } = body;
        
        if (!stopDeviceId) {
          return NextResponse.json(
            { error: 'Device ID is required' },
            { status: 400 }
          );
        }
        
        const stopped = await stopSmsListener(stopDeviceId);
        
        return NextResponse.json({
          success: stopped,
          message: stopped ? 'Listener stopped' : 'No listener to stop'
        });
        
      case 'start_verification':
        // Start a new verification process
        const { phoneNumber, platform, deviceId: devId, timeout } = body;
        
        if (!phoneNumber || !platform) {
          return NextResponse.json(
            { error: 'Phone number and platform are required' },
            { status: 400 }
          );
        }
        
        const startResult = await startVerification({
          phoneNumber,
          platform: platform as Platform,
          deviceId: devId,
          timeout
        });
        
        return NextResponse.json({
          success: startResult.success,
          verificationId: startResult.verificationId,
          error: startResult.error
        });
        
      case 'wait_for_code':
        // Wait for verification code (blocking)
        const { 
          phoneNumber: phone, 
          platform: plat, 
          timeout: tout 
        } = body;
        
        if (!phone || !plat) {
          return NextResponse.json(
            { error: 'Phone number and platform are required' },
            { status: 400 }
          );
        }
        
        const waitResult = await waitForCode(
          phone,
          plat as Platform,
          tout || 120000 // 2 minutes default
        );
        
        return NextResponse.json({
          success: waitResult.success,
          code: waitResult.requestCode,
          timedOut: waitResult.timedOut,
          error: waitResult.error
        });
        
      case 'set_waiting':
        // Mark verification as waiting for code
        const { verificationId: vId } = body;
        
        if (!vId) {
          return NextResponse.json(
            { error: 'Verification ID is required' },
            { status: 400 }
          );
        }
        
        const setResult = await setWaitingForCode(vId);
        
        return NextResponse.json({
          success: setResult
        });
        
      case 'complete':
        // Complete verification with code
        const { verificationId: completeId, code } = body;
        
        if (!completeId || !code) {
          return NextResponse.json(
            { error: 'Verification ID and code are required' },
            { status: 400 }
          );
        }
        
        const completeResult = await completeVerification(completeId, code);
        
        return NextResponse.json({
          success: completeResult
        });
        
      case 'fail':
        // Mark verification as failed
        const { verificationId: failId, error: failError } = body;
        
        if (!failId || !failError) {
          return NextResponse.json(
            { error: 'Verification ID and error are required' },
            { status: 400 }
          );
        }
        
        const failResult = await failVerification(failId, failError);
        
        return NextResponse.json({
          success: failResult
        });
        
      case 'parse':
        // Parse verification code from SMS content
        const { smsContent, platform: parsePlatform } = body;
        
        if (!smsContent) {
          return NextResponse.json(
            { error: 'SMS content is required' },
            { status: 400 }
          );
        }
        
        const parsed = parseVerificationCode(
          smsContent,
          parsePlatform as Platform
        );
        
        return NextResponse.json({
          success: !!parsed,
          parsed
        });
        
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('SIM SMS POST failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to process SMS request', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sim-auto/sms
 * Cancel SMS listener or verification
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'cancel';
    
    switch (action) {
      case 'listener':
        // Stop SMS listener
        const deviceId = searchParams.get('deviceId');
        
        if (!deviceId) {
          return NextResponse.json(
            { error: 'Device ID is required' },
            { status: 400 }
          );
        }
        
        const stopped = await stopSmsListener(deviceId);
        
        return NextResponse.json({
          success: stopped,
          message: stopped ? 'Listener stopped' : 'No listener to stop'
        });
        
      case 'verification':
        // Cancel verification
        const verificationId = searchParams.get('id');
        
        if (!verificationId) {
          return NextResponse.json(
            { error: 'Verification ID is required' },
            { status: 400 }
          );
        }
        
        const cancelled = await cancelVerification(verificationId);
        
        return NextResponse.json({
          success: cancelled,
          message: cancelled ? 'Verification cancelled' : 'Verification not found'
        });
        
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('SIM SMS DELETE failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to process delete request', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

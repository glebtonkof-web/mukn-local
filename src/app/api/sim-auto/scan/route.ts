/**
 * SIM Auto Scan API
 * POST: Start SIM scanning
 * GET: Get scan status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  scanDevices,
  detectAllSimCards,
  getScanProgress,
  getScanResult,
  isScanInProgress,
  cancelScan,
  getStoredSimCards,
  getSimCardStats,
  connectAndVerify,
  getSimCardInfo,
  checkExistingAccounts
} from '@/lib/sim-auto';
import { logger } from '@/lib/logger';
import { Platform } from '@/lib/sim-auto/types';

/**
 * GET /api/sim-auto/scan
 * Get scan status, progress, or stored SIM cards
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'status';
    
    switch (action) {
      case 'progress':
        // Get current scan progress
        const progress = getScanProgress();
        return NextResponse.json({
          inProgress: isScanInProgress(),
          progress
        });
        
      case 'result':
        // Get last scan result
        const result = getScanResult();
        return NextResponse.json({
          hasResult: !!result,
          result
        });
        
      case 'devices':
        // Quick scan for devices only
        const devices = await scanDevices();
        return NextResponse.json({
          success: true,
          devices,
          count: devices.length
        });
        
      case 'stored':
        // Get stored SIM cards from database
        const status = searchParams.get('status') || undefined;
        const operator = searchParams.get('operator') || undefined;
        const hasPhoneNumber = searchParams.get('hasPhoneNumber') === 'true';
        
        const simCards = await getStoredSimCards({
          status,
          operator,
          hasPhoneNumber
        });
        
        return NextResponse.json({
          success: true,
          simCards,
          count: simCards.length
        });
        
      case 'stats':
        // Get SIM card statistics
        const stats = await getSimCardStats();
        return NextResponse.json({
          success: true,
          stats
        });
        
      case 'status':
      default:
        // Return overall status
        return NextResponse.json({
          inProgress: isScanInProgress(),
          progress: getScanProgress(),
          hasResult: !!getScanResult()
        });
    }
  } catch (error) {
    logger.error('SIM scan GET failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to get scan status', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sim-auto/scan
 * Start a new scan or perform specific actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'full';
    
    switch (action) {
      case 'full':
        // Start full SIM scan
        if (isScanInProgress()) {
          return NextResponse.json(
            { error: 'Scan already in progress' },
            { status: 409 }
          );
        }
        
        // Run scan asynchronously
        detectAllSimCards()
          .then(result => {
            logger.info('Full scan completed', { 
              devices: result.devices.length,
              simCards: result.simCards.length,
              errors: result.errors.length
            });
          })
          .catch(error => {
            logger.error('Full scan failed', error);
          });
        
        return NextResponse.json({
          success: true,
          message: 'Scan started',
          inProgress: true
        });
        
      case 'connect':
        // Connect to specific device
        const { deviceId } = body;
        
        if (!deviceId) {
          return NextResponse.json(
            { error: 'Device ID is required' },
            { status: 400 }
          );
        }
        
        const connectResult = await connectAndVerify(deviceId);
        
        return NextResponse.json({
          success: connectResult.success,
          device: connectResult.device,
          simCards: connectResult.simCards,
          error: connectResult.error
        });
        
      case 'sim_info':
        // Get SIM card info for specific device slot
        const { deviceId: devId, slotIndex } = body;
        
        if (!devId || slotIndex === undefined) {
          return NextResponse.json(
            { error: 'Device ID and slot index are required' },
            { status: 400 }
          );
        }
        
        const simInfo = await getSimCardInfo(devId, parseInt(slotIndex));
        
        return NextResponse.json({
          success: !!simInfo,
          simCard: simInfo
        });
        
      case 'check_accounts':
        // Check if accounts exist for phone number
        const { phoneNumber, platform } = body;
        
        if (!phoneNumber || !platform) {
          return NextResponse.json(
            { error: 'Phone number and platform are required' },
            { status: 400 }
          );
        }
        
        const accountCheck = await checkExistingAccounts(
          phoneNumber, 
          platform as Platform
        );
        
        return NextResponse.json({
          success: true,
          check: accountCheck
        });
        
      case 'cancel':
        // Cancel current scan
        const cancelled = cancelScan();
        
        return NextResponse.json({
          success: cancelled,
          message: cancelled ? 'Scan cancelled' : 'No scan to cancel'
        });
        
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('SIM scan POST failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to process scan request', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

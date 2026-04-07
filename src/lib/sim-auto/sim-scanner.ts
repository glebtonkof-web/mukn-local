/**
 * SIM Scanner Module
 * Scans for connected ADB devices and detects SIM cards
 */

import { 
  AdbDevice, 
  SimCardInfo, 
  PlatformAccountCheck,
  ScanResult,
  ScanError,
  ScanProgress,
  Platform,
  ERROR_CODES
} from './types';

// Re-export types
export type { SimCardInfo, ScanProgress, ScanResult, ScanError } from './types';
import { 
  listDevices, 
  connectDevice, 
  getDeviceInfo, 
  readSimSlots 
} from './adb-client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { EventEmitter } from 'events';

// Event emitter for scan progress
const scanEvents = new EventEmitter();

// Active scan state
let currentScan: {
  inProgress: boolean;
  progress: ScanProgress;
  result?: ScanResult;
} | null = null;

/**
 * Scan for connected ADB devices
 */
export async function scanDevices(): Promise<AdbDevice[]> {
  logger.info('Starting device scan');
  
  try {
    const devices = await listDevices();
    
    // Filter only connected devices
    const connectedDevices = devices.filter(d => d.status === 'connected');
    
    logger.info('Device scan complete', { 
      total: devices.length, 
      connected: connectedDevices.length 
    });
    
    return connectedDevices;
  } catch (error) {
    logger.error('Device scan failed', error as Error);
    throw error;
  }
}

/**
 * Get SIM card information for a specific device slot
 */
export async function getSimCardInfo(
  deviceId: string, 
  slotIndex: number
): Promise<SimCardInfo | null> {
  logger.debug('Getting SIM card info', { deviceId, slotIndex });
  
  try {
    // Read SIM slots from device
    const slots = await readSimSlots(deviceId);
    const slot = slots.find(s => s.slotIndex === slotIndex);
    
    if (!slot) {
      logger.warn('SIM slot not found', { deviceId, slotIndex });
      return null;
    }
    
    const simInfo: SimCardInfo = {
      deviceId,
      slotIndex: slot.slotIndex,
      phoneNumber: slot.phoneNumber || null,
      operator: slot.operator || null,
      countryCode: extractCountryCode(slot.operator),
      networkType: slot.networkType || null,
      signalStrength: slot.signalStrength || null,
      iccid: slot.iccid || null,
      imsi: slot.imsi || null,
      isActive: slot.isActive,
      lastChecked: new Date()
    };
    
    // Store or update in database
    if (simInfo.phoneNumber) {
      await upsertSimCardInDb(simInfo);
    }
    
    return simInfo;
  } catch (error) {
    logger.error('Failed to get SIM card info', error as Error, { deviceId, slotIndex });
    return null;
  }
}

/**
 * Check if account exists on a platform for a phone number
 */
export async function checkExistingAccounts(
  phoneNumber: string, 
  platform: Platform
): Promise<PlatformAccountCheck> {
  logger.debug('Checking existing accounts', { phoneNumber, platform });
  
  const checkResult: PlatformAccountCheck = {
    platform,
    phoneNumber,
    exists: false,
    checkedAt: new Date()
  };
  
  try {
    // Check database for existing account with this phone number
    const existingAccount = await db.account.findFirst({
      where: {
        phone: phoneNumber,
        platform: platform
      }
    });
    
    if (existingAccount) {
      checkResult.exists = true;
      checkResult.username = existingAccount.username || undefined;
      checkResult.lastActivity = existingAccount.lastUsedAt || undefined;
    }
    
    // Also check in the SimCard table for any linked accounts
    const simCard = await db.simCard.findFirst({
      where: { phoneNumber },
      include: { Account: true }
    });
    
    if (simCard?.Account && simCard.Account.length > 0) {
      const linkedAccount = simCard.Account.find(a => 
        a.platform.toLowerCase() === platform.toLowerCase()
      );
      
      if (linkedAccount) {
        checkResult.exists = true;
        checkResult.username = linkedAccount.username || undefined;
        checkResult.lastActivity = linkedAccount.lastUsedAt || undefined;
      }
    }
    
    return checkResult;
  } catch (error) {
    logger.error('Failed to check existing accounts', error as Error, { phoneNumber, platform });
    checkResult.error = error instanceof Error ? error.message : 'Unknown error';
    return checkResult;
  }
}

/**
 * Detect all SIM cards across all connected devices
 */
export async function detectAllSimCards(): Promise<ScanResult> {
  const startTime = Date.now();
  const errors: ScanError[] = [];
  const simCards: SimCardInfo[] = [];
  let devices: AdbDevice[] = [];
  
  logger.info('Starting full SIM card detection scan');
  
  // Emit scan started event
  scanEvents.emit('progress', {
    stage: 'connecting',
    message: 'Scanning for connected devices...',
    progress: 0,
    devicesFound: 0,
    simCardsFound: 0,
    errors: []
  } as ScanProgress);
  
  try {
    // Step 1: Scan for devices
    devices = await scanDevices();
    
    scanEvents.emit('progress', {
      stage: 'scanning_devices',
      message: `Found ${devices.length} connected devices`,
      progress: 20,
      devicesFound: devices.length,
      simCardsFound: 0,
      errors
    } as ScanProgress);
    
    // Step 2: Read SIM cards from each device
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      
      try {
        scanEvents.emit('progress', {
          stage: 'reading_sims',
          message: `Reading SIM cards from ${device.model}...`,
          progress: 20 + Math.floor((i / devices.length) * 40),
          devicesFound: devices.length,
          simCardsFound: simCards.length,
          errors
        } as ScanProgress);
        
        // Read SIM slots
        const slots = await readSimSlots(device.id);
        
        for (const slot of slots) {
          const simInfo: SimCardInfo = {
            deviceId: device.id,
            slotIndex: slot.slotIndex,
            phoneNumber: slot.phoneNumber || null,
            operator: slot.operator || null,
            countryCode: extractCountryCode(slot.operator),
            networkType: slot.networkType || null,
            signalStrength: slot.signalStrength || null,
            iccid: slot.iccid || null,
            imsi: slot.imsi || null,
            isActive: slot.isActive,
            lastChecked: new Date()
          };
          
          simCards.push(simInfo);
          
          // Store in database
          if (simInfo.phoneNumber) {
            await upsertSimCardInDb(simInfo);
          }
        }
      } catch (error) {
        const scanError: ScanError = {
          deviceId: device.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          code: ERROR_CODES.SIM_NOT_DETECTED,
          timestamp: new Date()
        };
        errors.push(scanError);
        logger.error('Failed to read SIM cards from device', error as Error, { 
          deviceId: device.id 
        });
      }
    }
    
    // Step 3: Check existing accounts for all detected SIM cards
    scanEvents.emit('progress', {
      stage: 'checking_accounts',
      message: 'Checking existing accounts...',
      progress: 70,
      devicesFound: devices.length,
      simCardsFound: simCards.length,
      errors
    } as ScanProgress);
    
    // Check accounts for SIM cards with phone numbers
    const platforms: Platform[] = [
      'instagram', 'tiktok', 'telegram', 'whatsapp', 
      'facebook', 'twitter', 'youtube', 'linkedin', 
      'snapchat', 'pinterest'
    ];
    
    for (const sim of simCards) {
      if (sim.phoneNumber) {
        // Check each platform (can be parallelized)
        const checks = await Promise.allSettled(
          platforms.map(platform => 
            checkExistingAccounts(sim.phoneNumber!, platform)
          )
        );
        
        // Log results
        checks.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.exists) {
            logger.info('Found existing account', {
              phoneNumber: sim.phoneNumber,
              platform: platforms[index]
            });
          }
        });
      }
    }
    
    // Complete scan
    scanEvents.emit('progress', {
      stage: 'complete',
      message: 'Scan complete',
      progress: 100,
      devicesFound: devices.length,
      simCardsFound: simCards.length,
      errors
    } as ScanProgress);
    
    const duration = Date.now() - startTime;
    
    logger.info('SIM card detection complete', {
      devicesFound: devices.length,
      simCardsFound: simCards.length,
      errors: errors.length,
      duration
    });
    
    return {
      success: true,
      devices,
      simCards,
      errors,
      scannedAt: new Date(),
      duration
    };
  } catch (error) {
    const scanError: ScanError = {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: ERROR_CODES.DEVICE_NOT_CONNECTED,
      timestamp: new Date()
    };
    errors.push(scanError);
    
    scanEvents.emit('progress', {
      stage: 'error',
      message: `Scan failed: ${scanError.error}`,
      progress: 0,
      devicesFound: devices.length,
      simCardsFound: simCards.length,
      errors
    } as ScanProgress);
    
    return {
      success: false,
      devices,
      simCards,
      errors,
      scannedAt: new Date(),
      duration: Date.now() - startTime
    };
  }
}

/**
 * Start async scan and return scan ID for progress tracking
 */
export function startAsyncScan(): string {
  if (currentScan?.inProgress) {
    throw new Error('Scan already in progress');
  }
  
  const scanId = `scan_${Date.now()}`;
  
  currentScan = {
    inProgress: true,
    progress: {
      stage: 'connecting',
      message: 'Starting scan...',
      progress: 0,
      devicesFound: 0,
      simCardsFound: 0,
      errors: []
    }
  };
  
  // Run scan in background
  detectAllSimCards()
    .then(result => {
      if (currentScan) {
        currentScan.result = result;
        currentScan.inProgress = false;
      }
    })
    .catch(error => {
      if (currentScan) {
        currentScan.progress = {
          ...currentScan.progress,
          stage: 'error',
          message: error.message,
          errors: [{
            error: error.message,
            code: ERROR_CODES.UNKNOWN_ERROR,
            timestamp: new Date()
          }]
        };
        currentScan.inProgress = false;
      }
    });
  
  return scanId;
}

/**
 * Get current scan progress
 */
export function getScanProgress(): ScanProgress | null {
  return currentScan?.progress || null;
}

/**
 * Get scan result if complete
 */
export function getScanResult(): ScanResult | null {
  if (currentScan && !currentScan.inProgress) {
    return currentScan.result || null;
  }
  return null;
}

/**
 * Check if scan is in progress
 */
export function isScanInProgress(): boolean {
  return currentScan?.inProgress || false;
}

/**
 * Cancel current scan
 */
export function cancelScan(): boolean {
  if (!currentScan?.inProgress) {
    return false;
  }
  
  currentScan.progress = {
    ...currentScan.progress,
    stage: 'error',
    message: 'Scan cancelled by user',
    errors: [{
      error: 'Cancelled',
      code: ERROR_CODES.UNKNOWN_ERROR,
      timestamp: new Date()
    }]
  };
  currentScan.inProgress = false;
  
  return true;
}

/**
 * Subscribe to scan progress events
 */
export function onScanProgress(
  callback: (progress: ScanProgress) => void
): () => void {
  scanEvents.on('progress', callback);
  return () => scanEvents.off('progress', callback);
}

/**
 * Get all stored SIM cards from database
 */
export async function getStoredSimCards(filters?: {
  status?: string;
  operator?: string;
  hasPhoneNumber?: boolean;
}): Promise<SimCardInfo[]> {
  try {
    const where: Record<string, unknown> = {};
    
    if (filters?.status) {
      where.status = filters.status;
    }
    
    if (filters?.operator) {
      where.operator = {
        contains: filters.operator,
        mode: 'insensitive'
      };
    }
    
    if (filters?.hasPhoneNumber) {
      where.phoneNumber = { not: null };
    }
    
    const stored = await db.simCard.findMany({
      where,
      include: {
        Account: {
          select: {
            id: true,
            platform: true,
            username: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return stored.map(sim => ({
      deviceId: sim.id, // Using ID as device identifier
      slotIndex: 0, // Default slot
      phoneNumber: sim.phoneNumber,
      operator: sim.operator,
      countryCode: sim.country,
      networkType: null,
      signalStrength: null,
      iccid: null,
      imsi: null,
      isActive: sim.status === 'available' || sim.status === 'in_use',
      lastChecked: sim.updatedAt
    }));
  } catch (error) {
    logger.error('Failed to get stored SIM cards', error as Error);
    return [];
  }
}

/**
 * Connect to a specific device and verify connection
 */
export async function connectAndVerify(deviceId: string): Promise<{
  success: boolean;
  device?: AdbDevice;
  simCards?: SimCardInfo[];
  error?: string;
}> {
  try {
    // Connect to device
    const connectResult = await connectDevice(deviceId);
    
    if (!connectResult.success) {
      return {
        success: false,
        error: connectResult.error || 'Failed to connect to device'
      };
    }
    
    // Get device info
    const deviceInfo = await getDeviceInfo(deviceId);
    
    const device: AdbDevice = {
      id: deviceId,
      model: deviceInfo.model,
      androidVersion: deviceInfo.androidVersion,
      serialNumber: deviceInfo.serialNumber,
      status: 'connected',
      connectionType: deviceId.includes(':') ? 'tcpip' : 'usb',
      ipAddress: deviceId.includes(':') ? deviceId.split(':')[0] : undefined,
      port: deviceId.includes(':') ? parseInt(deviceId.split(':')[1]) : undefined
    };
    
    // Read SIM cards
    const slots = await readSimSlots(deviceId);
    const simCards: SimCardInfo[] = slots.map(slot => ({
      deviceId,
      slotIndex: slot.slotIndex,
      phoneNumber: slot.phoneNumber || null,
      operator: slot.operator || null,
      countryCode: extractCountryCode(slot.operator),
      networkType: slot.networkType || null,
      signalStrength: slot.signalStrength || null,
      iccid: slot.iccid || null,
      imsi: slot.imsi || null,
      isActive: slot.isActive,
      lastChecked: new Date()
    }));
    
    return {
      success: true,
      device,
      simCards
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper functions

/**
 * Extract country code from operator string
 */
function extractCountryCode(operator?: string): string | null {
  if (!operator) return null;
  
  // Operator string format: MCCMNC (e.g., 25001 for Russia MTS)
  const mcc = operator.substring(0, 3);
  
  // MCC to country code mapping (partial list)
  const mccToCountry: Record<string, string> = {
    '250': 'RU', // Russia
    '255': 'UA', // Ukraine
    '257': 'BY', // Belarus
    '260': 'PL', // Poland
    '262': 'DE', // Germany
    '234': 'GB', // UK
    '310': 'US', // USA
    '311': 'US', // USA
    '312': 'US', // USA
    '313': 'US', // USA
    '314': 'US', // USA
    '315': 'US', // USA
    '316': 'US', // USA
    '334': 'MX', // Mexico
    '505': 'AU', // Australia
    '440': 'JP', // Japan
    '450': 'KR', // South Korea
    '460': 'CN', // China
    '404': 'IN', // India
    '405': 'IN', // India
    '510': 'ID', // Indonesia
    '520': 'TH', // Thailand
    '525': 'SG', // Singapore
    '466': 'TW', // Taiwan
    '454': 'HK', // Hong Kong
    '416': 'JO', // Jordan
    '420': 'SA', // Saudi Arabia
    '424': 'AE', // UAE
    '427': 'QA', // Qatar
    '419': 'KW', // Kuwait
    '422': 'OM', // Oman
    '423': 'BH', // Bahrain
    '602': 'EG', // Egypt
    '655': 'ZA', // South Africa
    '621': 'NG', // Nigeria
    '639': 'KE', // Kenya
    '340': 'FR', // France (shared with DOM)
    '208': 'FR', // France
    '222': 'IT', // Italy
    '214': 'ES', // Spain
    '202': 'GR', // Greece
    '204': 'NL', // Netherlands
    '206': 'BE', // Belgium
    '232': 'AT', // Austria
    '230': 'CZ', // Czech Republic
    '242': 'NO', // Norway
    '240': 'SE', // Sweden
    '244': 'FI', // Finland
    '248': 'EE', // Estonia
    '246': 'LV', // Latvia
    '247': 'LT', // Lithuania
  };
  
  return mccToCountry[mcc] || null;
}

/**
 * Store or update SIM card in database
 */
async function upsertSimCardInDb(simInfo: SimCardInfo): Promise<void> {
  try {
    if (!simInfo.phoneNumber) return;
    
    await db.simCard.upsert({
      where: { phoneNumber: simInfo.phoneNumber },
      update: {
        operator: simInfo.operator || undefined,
        country: simInfo.countryCode || undefined,
        status: simInfo.isActive ? 'available' : 'blocked',
        updatedAt: new Date()
      },
      create: {
        id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        phoneNumber: simInfo.phoneNumber,
        operator: simInfo.operator,
        country: simInfo.countryCode || 'XX',
        status: simInfo.isActive ? 'available' : 'blocked',
        userId: 'system',
        updatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Failed to upsert SIM card', error as Error, { 
      phoneNumber: simInfo.phoneNumber 
    });
  }
}

/**
 * Get SIM card statistics
 */
export async function getSimCardStats(): Promise<{
  total: number;
  available: number;
  inUse: number;
  blocked: number;
  byOperator: Record<string, number>;
  byCountry: Record<string, number>;
}> {
  try {
    const [total, available, inUse, blocked] = await Promise.all([
      db.simCard.count(),
      db.simCard.count({ where: { status: 'available' } }),
      db.simCard.count({ where: { status: 'in_use' } }),
      db.simCard.count({ where: { status: 'blocked' } })
    ]);
    
    // Get counts by operator
    const operatorCounts = await db.simCard.groupBy({
      by: ['operator'],
      _count: true,
      where: { operator: { not: null } }
    });
    
    const byOperator: Record<string, number> = {};
    operatorCounts.forEach(item => {
      if (item.operator) {
        byOperator[item.operator] = item._count;
      }
    });
    
    // Get counts by country
    const countryCounts = await db.simCard.groupBy({
      by: ['country'],
      _count: true
    });
    
    const byCountry: Record<string, number> = {};
    countryCounts.forEach(item => {
      byCountry[item.country] = item._count;
    });
    
    return {
      total,
      available,
      inUse,
      blocked,
      byOperator,
      byCountry
    };
  } catch (error) {
    logger.error('Failed to get SIM card stats', error as Error);
    return {
      total: 0,
      available: 0,
      inUse: 0,
      blocked: 0,
      byOperator: {},
      byCountry: {}
    };
  }
}

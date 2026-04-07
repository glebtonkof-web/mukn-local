/**
 * SMS Reader Module
 * Handles SMS listening, parsing, and verification code extraction
 */

import { 
  SmsMessage,
  VerificationSms,
  SmsListenerConfig,
  ParsedVerificationCode,
  Platform,
  PLATFORM_PATTERNS,
  VerificationRequest,
  VerificationResult,
  DEFAULT_CONFIG,
  ERROR_CODES
} from './types';

// Re-export types for external modules
export type {
  SmsMessage,
  VerificationSms,
  SmsListenerConfig,
  ParsedVerificationCode,
  VerificationRequest,
  VerificationResult
} from './types';
import { 
  readSms, 
  startSmsListenerRealtime, 
  stopSmsListenerRealtime,
  executeCommand
} from './adb-client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';

// Event emitter for SMS events
const smsEvents = new EventEmitter();

// Active verification requests
const activeVerifications: Map<string, VerificationRequest> = new Map();

// Active SMS listeners
const activeSmsListeners: Map<string, {
  deviceId: string;
  config: SmsListenerConfig;
  startTime: Date;
}> = new Map();

/**
 * Start listening for SMS on a device
 */
export async function startSmsListener(
  deviceId: string
): Promise<{ success: boolean; error?: string }> {
  logger.info('Starting SMS listener', { deviceId });
  
  // Check if already listening
  if (activeSmsListeners.has(deviceId)) {
    return { 
      success: false, 
      error: 'SMS listener already active for this device' 
    };
  }
  
  try {
    const result = await startSmsListenerRealtime(deviceId, (message) => {
      // Process incoming SMS
      processIncomingSms(message);
    });
    
    if (result.success) {
      activeSmsListeners.set(deviceId, {
        deviceId,
        config: {
          deviceId,
          phoneNumber: '',
          platform: 'instagram', // default
          timeout: DEFAULT_CONFIG.sms.defaultTimeout
        },
        startTime: new Date()
      });
      
      logger.info('SMS listener started', { deviceId });
      
      // Emit event
      smsEvents.emit('listener_started', { deviceId });
    }
    
    return result;
  } catch (error) {
    logger.error('Failed to start SMS listener', error as Error, { deviceId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Stop SMS listener for a device
 */
export async function stopSmsListener(
  deviceId: string
): Promise<boolean> {
  logger.info('Stopping SMS listener', { deviceId });
  
  const stopped = await stopSmsListenerRealtime(deviceId);
  
  if (stopped) {
    activeSmsListeners.delete(deviceId);
    smsEvents.emit('listener_stopped', { deviceId });
  }
  
  return stopped;
}

/**
 * Process incoming SMS and check for verification codes
 */
function processIncomingSms(message: SmsMessage): void {
  logger.debug('Processing incoming SMS', {
    sender: message.sender,
    preview: message.body.substring(0, 50)
  });
  
  // Emit raw SMS event
  smsEvents.emit('sms_received', message);
  
  // Check all active verifications
  for (const [id, verification] of activeVerifications) {
    if (verification.status !== 'waiting_code') continue;
    
    // Try to parse verification code from this message
    const parsed = parseVerificationCode(
      message.body,
      verification.platform
    );
    
    if (parsed && parsed.confidence > 0.5) {
      // Check if sender matches expected patterns
      const platformPatterns = PLATFORM_PATTERNS[verification.platform];
      const senderMatches = platformPatterns.senderPatterns.some(
        pattern => pattern.test(message.sender)
      );
      
      if (senderMatches || parsed.confidence > 0.8) {
        // Found matching verification code!
        verification.status = 'code_received';
        verification.requestCode = parsed.code;
        verification.updatedAt = new Date();
        
        logger.info('Verification code received', {
          verificationId: id,
          platform: verification.platform,
          code: parsed.code
        });
        
        // Emit event
        smsEvents.emit('code_received', {
          verificationId: id,
          code: parsed.code,
          platform: verification.platform,
          phoneNumber: verification.phoneNumber
        });
        
        // Store in database
        storeVerificationSms({
          id: nanoid(),
          phoneNumber: verification.phoneNumber,
          platform: verification.platform,
          code: parsed.code,
          sender: message.sender,
          receivedAt: new Date(),
          expiresIn: 300, // 5 minutes
          used: false
        });
      }
    }
  }
}

/**
 * Parse verification code from SMS content
 */
export function parseVerificationCode(
  smsContent: string,
  platform?: Platform
): ParsedVerificationCode | null {
  const normalizedContent = smsContent.toLowerCase();
  
  // If platform specified, try platform-specific patterns first
  if (platform) {
    const result = tryPlatformPatterns(smsContent, normalizedContent, platform);
    if (result) return result;
  }
  
  // Try all platforms
  const platforms: Platform[] = [
    'instagram', 'tiktok', 'telegram', 'whatsapp',
    'facebook', 'twitter', 'youtube', 'linkedin',
    'snapchat', 'pinterest'
  ];
  
  for (const p of platforms) {
    const result = tryPlatformPatterns(smsContent, normalizedContent, p);
    if (result && result.confidence > 0.7) {
      return result;
    }
  }
  
  // Fallback: Look for any 4-6 digit code
  const codeMatch = smsContent.match(/\b(\d{4,6})\b/);
  if (codeMatch) {
    return {
      code: codeMatch[1],
      platform: platform || 'instagram',
      sender: 'unknown',
      originalMessage: smsContent,
      confidence: 0.3
    };
  }
  
  return null;
}

/**
 * Try to parse code using platform-specific patterns
 */
function tryPlatformPatterns(
  originalContent: string,
  normalizedContent: string,
  platform: Platform
): ParsedVerificationCode | null {
  const patterns = PLATFORM_PATTERNS[platform];
  
  // Check if any keyword is present
  const hasKeyword = patterns.keywords.some(keyword => 
    normalizedContent.includes(keyword.toLowerCase())
  );
  
  if (!hasKeyword) return null;
  
  // Try each code pattern
  for (const pattern of patterns.codePatterns) {
    const match = originalContent.match(pattern);
    if (match && match[1]) {
      return {
        code: match[1],
        platform,
        sender: extractSender(originalContent),
        originalMessage: originalContent,
        confidence: hasKeyword ? 0.8 : 0.5
      };
    }
  }
  
  // If keyword present but no code pattern matched, look for any code
  if (hasKeyword) {
    const codeMatch = originalContent.match(/\b(\d{4,6})\b/);
    if (codeMatch) {
      return {
        code: codeMatch[1],
        platform,
        sender: extractSender(originalContent),
        originalMessage: originalContent,
        confidence: 0.6
      };
    }
  }
  
  return null;
}

/**
 * Extract sender from SMS content
 */
function extractSender(content: string): string {
  // Look for common sender patterns
  const patterns = [
    /from[:\s]+([A-Za-z0-9]+)/i,
    /-([A-Za-z]+)$/,
    /^([A-Za-z]+):/
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return 'unknown';
}

/**
 * Wait for verification code
 */
export async function waitForCode(
  phoneNumber: string,
  platform: Platform,
  timeout: number = DEFAULT_CONFIG.sms.defaultTimeout
): Promise<VerificationResult> {
  logger.info('Waiting for verification code', {
    phoneNumber,
    platform,
    timeout
  });
  
  // Create verification request
  const verificationId = nanoid();
  const verification: VerificationRequest = {
    id: verificationId,
    phoneNumber,
    platform,
    deviceId: '', // Will be set by SMS listener
    status: 'waiting_code',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + timeout)
  };
  
  activeVerifications.set(verificationId, verification);
  
  // Store in database
  try {
    await db.simAutoVerification.create({
      data: {
        id: verificationId,
        phoneNumber,
        platform,
        status: 'waiting_code',
        deviceId: verification.deviceId,
        expiresAt: verification.expiresAt
      }
    });
  } catch (error) {
    logger.error('Failed to store verification request', error as Error);
  }
  
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      cleanup(verificationId);
      
      verification.status = 'timeout';
      verification.updatedAt = new Date();
      
      logger.warn('Verification code timeout', {
        verificationId,
        phoneNumber,
        platform
      });
      
      resolve({
        success: false,
        timedOut: true,
        error: 'Timeout waiting for verification code'
      });
    }, timeout);
    
    // Listen for code received event
    const handler = (data: {
      verificationId: string;
      code: string;
      platform: Platform;
      phoneNumber: string;
    }) => {
      if (data.phoneNumber === phoneNumber && data.platform === platform) {
        clearTimeout(timeoutId);
        cleanup(verificationId);
        
        verification.status = 'verified';
        verification.requestCode = data.code;
        verification.updatedAt = new Date();
        verification.completedAt = new Date();
        
        // Update database
        updateVerificationStatus(verificationId, 'verified', data.code);
        
        logger.info('Verification code received successfully', {
          verificationId,
          code: data.code
        });
        
        resolve({
          success: true,
          requestCode: data.code,
          timedOut: false
        });
      }
    };
    
    smsEvents.once('code_received', handler);
    
    // Also poll SMS for missed messages
    pollSmsForCode(phoneNumber, platform, timeout)
      .then(code => {
        if (code) {
          clearTimeout(timeoutId);
          cleanup(verificationId);
          
          verification.status = 'verified';
          verification.requestCode = code;
          verification.updatedAt = new Date();
          verification.completedAt = new Date();
          
          updateVerificationStatus(verificationId, 'verified', code);
          
          resolve({
            success: true,
            requestCode: code,
            timedOut: false
          });
        }
      })
      .catch(error => {
        logger.error('SMS polling error', error as Error);
      });
  });
}

/**
 * Poll SMS for verification code
 */
async function pollSmsForCode(
  phoneNumber: string,
  platform: Platform,
  timeout: number
): Promise<string | null> {
  const startTime = Date.now();
  const pollInterval = DEFAULT_CONFIG.sms.pollInterval;
  
  while (Date.now() - startTime < timeout) {
    try {
      // Get all active listeners
      const listeners = Array.from(activeSmsListeners.values());
      
      for (const listener of listeners) {
        // Read recent SMS
        const messages = await readSms(listener.deviceId, 10);
        
        // Check each message
        for (const message of messages) {
          const parsed = parseVerificationCode(message.body, platform);
          
          if (parsed && parsed.confidence > 0.5) {
            return parsed.code;
          }
        }
      }
    } catch (error) {
      logger.error('Error polling SMS', error as Error);
    }
    
    // Wait before next poll
    await sleep(pollInterval);
  }
  
  return null;
}

/**
 * Get pending verifications
 */
export async function getPendingVerifications(): Promise<VerificationRequest[]> {
  const pending = Array.from(activeVerifications.values())
    .filter(v => v.status === 'waiting_code' || v.status === 'pending');
  
  // Also get from database
  try {
    const dbPending = await db.simAutoVerification.findMany({
      where: {
        status: { in: ['pending', 'waiting_code'] },
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    for (const v of dbPending) {
      if (!activeVerifications.has(v.id)) {
        activeVerifications.set(v.id, {
          id: v.id,
          phoneNumber: v.phoneNumber,
          platform: v.platform as Platform,
          deviceId: v.deviceId || '',
          status: v.status as VerificationRequest['status'],
          requestCode: v.requestCode || undefined,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          expiresAt: v.expiresAt
        });
      }
    }
  } catch (error) {
    logger.error('Failed to get pending verifications from DB', error as Error);
  }
  
  return pending;
}

/**
 * Get all active SMS listeners
 */
export function getActiveListeners(): Array<{
  deviceId: string;
  startTime: Date;
  phoneNumber?: string;
  platform?: Platform;
}> {
  return Array.from(activeSmsListeners.values()).map(listener => ({
    deviceId: listener.deviceId,
    startTime: listener.startTime,
    phoneNumber: listener.config.phoneNumber,
    platform: listener.config.platform
  }));
}

/**
 * Subscribe to SMS events
 */
export function onSmsEvent(
  event: 'sms_received' | 'code_received' | 'listener_started' | 'listener_stopped',
  callback: (data: unknown) => void
): () => void {
  smsEvents.on(event, callback);
  return () => smsEvents.off(event, callback);
}

/**
 * Cancel a verification request
 */
export async function cancelVerification(
  verificationId: string
): Promise<boolean> {
  const verification = activeVerifications.get(verificationId);
  
  if (!verification) {
    return false;
  }
  
  verification.status = 'cancelled';
  verification.updatedAt = new Date();
  
  await updateVerificationStatus(verificationId, 'cancelled');
  cleanup(verificationId);
  
  logger.info('Verification cancelled', { verificationId });
  
  return true;
}

/**
 * Get verification request by ID
 */
export async function getVerification(
  verificationId: string
): Promise<VerificationRequest | null> {
  const cached = activeVerifications.get(verificationId);
  if (cached) return cached;
  
  try {
    const dbVerification = await db.simAutoVerification.findUnique({
      where: { id: verificationId }
    });
    
    if (dbVerification) {
      return {
        id: dbVerification.id,
        phoneNumber: dbVerification.phoneNumber,
        platform: dbVerification.platform as Platform,
        deviceId: dbVerification.deviceId || '',
        status: dbVerification.status as VerificationRequest['status'],
        requestCode: dbVerification.requestCode || undefined,
        createdAt: dbVerification.createdAt,
        updatedAt: dbVerification.updatedAt,
        expiresAt: dbVerification.expiresAt,
        completedAt: dbVerification.completedAt || undefined,
        error: dbVerification.error || undefined
      };
    }
  } catch (error) {
    logger.error('Failed to get verification', error as Error);
  }
  
  return null;
}

/**
 * Start verification for a specific phone number
 */
export async function startVerification(params: {
  phoneNumber: string;
  platform: Platform;
  deviceId?: string;
  timeout?: number;
}): Promise<{
  success: boolean;
  verificationId?: string;
  error?: string;
}> {
  const verificationId = nanoid();
  const timeout = params.timeout || DEFAULT_CONFIG.sms.defaultTimeout;
  
  try {
    // Create verification request
    const verification: VerificationRequest = {
      id: verificationId,
      phoneNumber: params.phoneNumber,
      platform: params.platform,
      deviceId: params.deviceId || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + timeout)
    };
    
    // Store in database
    await db.simAutoVerification.create({
      data: {
        id: verificationId,
        phoneNumber: params.phoneNumber,
        platform: params.platform,
        deviceId: verification.deviceId,
        status: 'pending',
        expiresAt: verification.expiresAt
      }
    });
    
    // Add to active verifications
    activeVerifications.set(verificationId, verification);
    
    logger.info('Verification started', {
      verificationId,
      phoneNumber: params.phoneNumber,
      platform: params.platform
    });
    
    return {
      success: true,
      verificationId
    };
  } catch (error) {
    logger.error('Failed to start verification', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Mark verification as waiting for code
 */
export async function setWaitingForCode(
  verificationId: string
): Promise<boolean> {
  const verification = activeVerifications.get(verificationId);
  
  if (!verification) {
    return false;
  }
  
  verification.status = 'waiting_code';
  verification.updatedAt = new Date();
  
  await updateVerificationStatus(verificationId, 'waiting_code');
  
  return true;
}

/**
 * Complete verification with code
 */
export async function completeVerification(
  verificationId: string,
  code: string
): Promise<boolean> {
  const verification = activeVerifications.get(verificationId);
  
  if (!verification) {
    return false;
  }
  
  verification.status = 'verified';
  verification.requestCode = code;
  verification.updatedAt = new Date();
  verification.completedAt = new Date();
  
  await updateVerificationStatus(verificationId, 'verified', code);
  cleanup(verificationId);
  
  logger.info('Verification completed', { verificationId, code });
  
  return true;
}

/**
 * Fail verification with error
 */
export async function failVerification(
  verificationId: string,
  error: string
): Promise<boolean> {
  const verification = activeVerifications.get(verificationId);
  
  if (!verification) {
    return false;
  }
  
  verification.status = 'failed';
  verification.error = error;
  verification.updatedAt = new Date();
  
  await updateVerificationStatus(verificationId, 'failed', undefined, error);
  cleanup(verificationId);
  
  logger.error('Verification failed', new Error(error), { verificationId });
  
  return true;
}

/**
 * Get recent SMS messages for a device
 */
export async function getRecentSms(
  deviceId: string,
  limit: number = 20
): Promise<SmsMessage[]> {
  try {
    return await readSms(deviceId, limit);
  } catch (error) {
    logger.error('Failed to get recent SMS', error as Error, { deviceId });
    return [];
  }
}

/**
 * Search SMS messages for verification codes
 */
export async function searchVerificationCodes(params: {
  deviceId?: string;
  phoneNumber?: string;
  platform?: Platform;
  since?: Date;
}): Promise<VerificationSms[]> {
  try {
    const where: Record<string, unknown> = {};
    
    if (params.phoneNumber) {
      where.phoneNumber = params.phoneNumber;
    }
    
    if (params.platform) {
      where.platform = params.platform;
    }
    
    if (params.since) {
      where.receivedAt = { gte: params.since };
    }
    
    const results = await db.verificationSms.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: 50
    });
    
    return results.map(r => ({
      id: r.id,
      phoneNumber: r.phoneNumber,
      platform: r.platform as Platform,
      code: r.code,
      sender: r.sender || 'unknown',
      receivedAt: r.receivedAt,
      expiresIn: r.expiresIn,
      used: r.used
    }));
  } catch (error) {
    logger.error('Failed to search verification codes', error as Error);
    return [];
  }
}

// Helper functions

function cleanup(verificationId: string): void {
  smsEvents.removeAllListeners(`code_received_${verificationId}`);
}

async function updateVerificationStatus(
  verificationId: string,
  status: string,
  code?: string,
  error?: string
): Promise<void> {
  try {
    await db.simAutoVerification.update({
      where: { id: verificationId },
      data: {
        status,
        requestCode: code,
        error,
        updatedAt: new Date(),
        completedAt: status === 'verified' ? new Date() : undefined
      }
    });
  } catch (err) {
    logger.error('Failed to update verification status', err as Error);
  }
}

async function storeVerificationSms(sms: VerificationSms): Promise<void> {
  try {
    await db.verificationSms.create({
      data: {
        id: sms.id,
        phoneNumber: sms.phoneNumber,
        platform: sms.platform,
        code: sms.code,
        sender: sms.sender,
        receivedAt: sms.receivedAt,
        expiresIn: sms.expiresIn,
        used: sms.used
      }
    });
  } catch (error) {
    logger.error('Failed to store verification SMS', error as Error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Clean up expired verifications periodically
setInterval(async () => {
  const now = new Date();
  
  for (const [id, verification] of activeVerifications) {
    if (verification.expiresAt < now && 
        (verification.status === 'pending' || verification.status === 'waiting_code')) {
      verification.status = 'timeout';
      verification.updatedAt = now;
      
      await updateVerificationStatus(id, 'timeout');
      cleanup(id);
      
      logger.info('Verification expired', { verificationId: id });
    }
  }
}, 60000); // Check every minute

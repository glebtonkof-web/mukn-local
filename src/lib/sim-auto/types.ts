/**
 * Types for SIM Auto Module
 * SIM Scanner and SMS Reader for ADB-connected devices
 */

// Device Types
export interface AdbDevice {
  id: string;
  model: string;
  androidVersion: string;
  serialNumber: string;
  status: 'connected' | 'disconnected' | 'unauthorized' | 'offline';
  connectionType: 'usb' | 'tcpip';
  ipAddress?: string;
  port?: number;
}

export interface DeviceInfo {
  deviceId: string;
  model: string;
  manufacturer: string;
  androidVersion: string;
  sdkVersion: number;
  imei: string;
  serialNumber: string;
  batteryLevel: number;
  isRooted: boolean;
  screenWidth: number;
  screenHeight: number;
  density: number;
}

// SIM Card Types
export interface SimCardSlot {
  slotIndex: number;
  isActive: boolean;
  phoneNumber?: string;
  operator?: string;
  countryCode?: string;
  networkType?: string;
  signalStrength?: number;
  iccid?: string;
  imsi?: string;
}

export interface SimCardInfo {
  deviceId: string;
  slotIndex: number;
  phoneNumber: string | null;
  operator: string | null;
  countryCode: string | null;
  networkType: string | null;
  signalStrength: number | null;
  iccid: string | null;
  imsi: string | null;
  isActive: boolean;
  lastChecked: Date;
}

// Platform Account Check Types
export interface PlatformAccountCheck {
  platform: string;
  phoneNumber: string;
  exists: boolean;
  username?: string;
  lastActivity?: Date;
  checkedAt: Date;
  error?: string;
}

export type Platform = 
  | 'instagram'
  | 'tiktok'
  | 'telegram'
  | 'whatsapp'
  | 'facebook'
  | 'twitter'
  | 'youtube'
  | 'linkedin'
  | 'snapchat'
  | 'pinterest';

// SMS Types
export interface SmsMessage {
  id: string;
  deviceId: string;
  phoneNumber: string;
  sender: string;
  body: string;
  timestamp: Date;
  receivedAt: Date;
  isRead: boolean;
  threadId?: string;
}

export interface VerificationSms {
  id: string;
  phoneNumber: string;
  platform: Platform;
  code: string;
  sender: string;
  receivedAt: Date;
  expiresIn: number;
  used: boolean;
}

export interface SmsListenerConfig {
  deviceId: string;
  phoneNumber: string;
  platform: Platform;
  timeout: number;
  keywords?: string[];
  senderFilter?: string;
  codePattern?: RegExp;
}

export interface ParsedVerificationCode {
  code: string;
  platform: Platform;
  sender: string;
  originalMessage: string;
  confidence: number;
}

// Scan Types
export interface ScanResult {
  success: boolean;
  devices: AdbDevice[];
  simCards: SimCardInfo[];
  errors: ScanError[];
  scannedAt: Date;
  duration: number;
}

export interface ScanError {
  deviceId?: string;
  error: string;
  code: string;
  timestamp: Date;
}

export interface ScanProgress {
  stage: 'connecting' | 'scanning_devices' | 'reading_sims' | 'checking_accounts' | 'complete' | 'error';
  message: string;
  progress: number;
  devicesFound: number;
  simCardsFound: number;
  errors: ScanError[];
}

// Verification Types
export interface VerificationRequest {
  id: string;
  phoneNumber: string;
  platform: Platform;
  deviceId: string;
  status: 'pending' | 'waiting_code' | 'code_received' | 'verified' | 'failed' | 'timeout' | 'cancelled';
  requestCode?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface VerificationResult {
  success: boolean;
  requestCode?: string;
  error?: string;
  timedOut: boolean;
}

// ADB Command Types
export interface AdbCommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
}

export interface AdbCommandOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Event Types for Real-time Updates
export type SimAutoEventType = 
  | 'device_connected'
  | 'device_disconnected'
  | 'sim_detected'
  | 'sim_removed'
  | 'sms_received'
  | 'code_detected'
  | 'verification_complete'
  | 'scan_started'
  | 'scan_complete'
  | 'error';

export interface SimAutoEvent {
  type: SimAutoEventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

// Platform Patterns for Verification Codes
export const PLATFORM_PATTERNS: Record<Platform, {
  senderPatterns: RegExp[];
  codePatterns: RegExp[];
  keywords: string[];
}> = {
  instagram: {
    senderPatterns: [/instagram/i, /meta/i, /facebook/i, /32665/],
    codePatterns: [
      /(\d{6})\s*(?:is your|is het|ist dein|es tu|è il tuo|es tu|es su)/i,
      /code[:\s]*(\d{4,6})/i,
      /(\d{6})/g
    ],
    keywords: ['instagram', 'verify', 'verification', 'code', 'secure']
  },
  tiktok: {
    senderPatterns: [/tiktok/i, /short video/i, /\d{4,5}/],
    codePatterns: [
      /(\d{4,6})\s*(?:is your|code)/i,
      /code[:\s]*(\d{4,6})/i,
      /(\d{6})/g
    ],
    keywords: ['tiktok', 'verify', 'code']
  },
  telegram: {
    senderPatterns: [/telegram/i, /tg/i, /telega/i],
    codePatterns: [
      /(\d{5})/g,
      /login code[:\s]*(\d{5})/i
    ],
    keywords: ['telegram', 'login', 'code', 'verify']
  },
  whatsapp: {
    senderPatterns: [/whatsapp/i, /whats app/i, /wa/i],
    codePatterns: [
      /(\d{6})/g,
      /code[:\s]*(\d{6})/i
    ],
    keywords: ['whatsapp', 'verify', 'code']
  },
  facebook: {
    senderPatterns: [/facebook/i, /meta/i, /fb/i, /32665/],
    codePatterns: [
      /(\d{6})\s*(?:is your|use)/i,
      /code[:\s]*(\d{6})/i,
      /(\d{6})/g
    ],
    keywords: ['facebook', 'fb', 'verify', 'code', 'confirm']
  },
  twitter: {
    senderPatterns: [/twitter/i, /x\.com/i],
    codePatterns: [
      /(\d{6})/g,
      /code[:\s]*(\d{6})/i
    ],
    keywords: ['twitter', 'verify', 'code']
  },
  youtube: {
    senderPatterns: [/youtube/i, /google/i, /yt/i],
    codePatterns: [
      /(\d{6})/g,
      /code[:\s]*(\d{6})/i
    ],
    keywords: ['youtube', 'google', 'verify', 'code']
  },
  linkedin: {
    senderPatterns: [/linkedin/i, /linked in/i],
    codePatterns: [
      /(\d{6})/g,
      /code[:\s]*(\d{6})/i
    ],
    keywords: ['linkedin', 'verify', 'code']
  },
  snapchat: {
    senderPatterns: [/snapchat/i, /snap/i, /team snap/i],
    codePatterns: [
      /(\d{6})/g,
      /code[:\s]*(\d{6})/i
    ],
    keywords: ['snapchat', 'snap', 'verify', 'code']
  },
  pinterest: {
    senderPatterns: [/pinterest/i, /pin/i],
    codePatterns: [
      /(\d{6})/g,
      /code[:\s]*(\d{6})/i
    ],
    keywords: ['pinterest', 'verify', 'code']
  }
};

// Default Configuration
export const DEFAULT_CONFIG = {
  adb: {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    path: 'adb'
  },
  sms: {
    defaultTimeout: 120000,
    pollInterval: 2000,
    maxMessagesToCheck: 50
  },
  scan: {
    deviceScanTimeout: 10000,
    simReadTimeout: 15000
  }
};

// Error Codes
export const ERROR_CODES = {
  ADB_NOT_FOUND: 'ADB_NOT_FOUND',
  DEVICE_NOT_CONNECTED: 'DEVICE_NOT_CONNECTED',
  DEVICE_UNAUTHORIZED: 'DEVICE_UNAUTHORIZED',
  SIM_NOT_DETECTED: 'SIM_NOT_DETECTED',
  SMS_PERMISSION_DENIED: 'SMS_PERMISSION_DENIED',
  SMS_TIMEOUT: 'SMS_TIMEOUT',
  CODE_NOT_FOUND: 'CODE_NOT_FOUND',
  PLATFORM_CHECK_FAILED: 'PLATFORM_CHECK_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

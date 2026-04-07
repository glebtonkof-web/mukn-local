/**
 * ADB Client - Android Debug Bridge integration
 * Handles device connection, command execution, and SMS reading
 */

import { spawn, ChildProcess } from 'child_process';
import { 
  AdbDevice, 
  DeviceInfo, 
  SimCardSlot,
  AdbCommandResult, 
  AdbCommandOptions,
  DEFAULT_CONFIG,
  ERROR_CODES,
  SmsMessage
} from './types';
import { logger } from '@/lib/logger';

// Active SMS listener processes
const activeListeners: Map<string, ChildProcess> = new Map();

/**
 * Execute an ADB command and return the result
 */
export async function executeAdbCommand(
  command: string[],
  options: AdbCommandOptions = {}
): Promise<AdbCommandResult> {
  const startTime = Date.now();
  const {
    timeout = DEFAULT_CONFIG.adb.timeout,
    retries = DEFAULT_CONFIG.adb.retries,
    retryDelay = DEFAULT_CONFIG.adb.retryDelay
  } = options;

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await executeCommandOnce(command, timeout);
      return {
        success: true,
        output: result,
        exitCode: 0,
        duration: Date.now() - startTime
      };
    } catch (error) {
      lastError = error as Error;
      logger.warn(`ADB command attempt ${attempt}/${retries} failed`, { 
        command: command.join(' '), 
        error: lastError.message 
      });
      
      if (attempt < retries) {
        await sleep(retryDelay);
      }
    }
  }

  return {
    success: false,
    output: '',
    error: lastError?.message || 'Unknown error',
    exitCode: 1,
    duration: Date.now() - startTime
  };
}

/**
 * Execute command once without retries
 */
function executeCommandOnce(command: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const adbPath = process.env.ADB_PATH || DEFAULT_CONFIG.adb.path;
    const fullCommand = [adbPath, ...command];
    
    logger.debug('Executing ADB command', { command: fullCommand.join(' ') });
    
    const process = spawn(fullCommand[0], fullCommand.slice(1), {
      shell: false,
      env: process.env
    });

    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | null = null;

    // Set timeout
    timeoutId = setTimeout(() => {
      process.kill();
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('error', (err) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    });

    process.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || `Process exited with code ${code}`));
      }
    });
  });
}

/**
 * Connect to ADB device
 */
export async function connectDevice(deviceId: string): Promise<AdbCommandResult> {
  // First check if device is already connected
  const devices = await listDevices();
  const existing = devices.find(d => d.id === deviceId);
  
  if (existing) {
    return {
      success: true,
      output: `Device ${deviceId} already connected`,
      exitCode: 0,
      duration: 0
    };
  }

  // Try to connect (for network devices)
  if (deviceId.includes(':')) {
    const [ip, port] = deviceId.split(':');
    const result = await executeAdbCommand(['connect', `${ip}:${port}`]);
    
    if (result.success) {
      // Wait a moment for connection to establish
      await sleep(1000);
      
      // Verify connection
      const devices = await listDevices();
      const connected = devices.find(d => d.id === deviceId);
      
      if (connected) {
        return {
          success: true,
          output: `Connected to ${deviceId}`,
          exitCode: 0,
          duration: result.duration
        };
      }
    }
    
    return result;
  }

  return {
    success: false,
    output: '',
    error: `Device ${deviceId} not found and is not a network device`,
    exitCode: 1,
    duration: 0
  };
}

/**
 * Disconnect from ADB device
 */
export async function disconnectDevice(deviceId: string): Promise<AdbCommandResult> {
  if (deviceId.includes(':')) {
    return executeAdbCommand(['disconnect', deviceId]);
  }
  
  return {
    success: true,
    output: 'USB devices cannot be disconnected via ADB',
    exitCode: 0,
    duration: 0
  };
}

/**
 * List all connected ADB devices
 */
export async function listDevices(): Promise<AdbDevice[]> {
  const result = await executeAdbCommand(['devices', '-l']);
  
  if (!result.success) {
    logger.error('Failed to list ADB devices', new Error(result.error));
    return [];
  }

  const devices: AdbDevice[] = [];
  const lines = result.output.split('\n');
  
  for (const line of lines.slice(1)) { // Skip header line
    if (!line.trim()) continue;
    
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    
    const [id, status, ...infoParts] = parts;
    const info = infoParts.join(' ');
    
    // Parse device info
    const modelMatch = info.match(/model:(\S+)/);
    const deviceMatch = info.match(/device:(\S+)/);
    const productMatch = info.match(/product:(\S+)/);
    const transportIdMatch = info.match(/transport_id:(\d+)/);
    
    const device: AdbDevice = {
      id,
      model: modelMatch ? modelMatch[1].replace(/_/g, ' ') : 'Unknown',
      androidVersion: '', // Will be fetched separately
      serialNumber: id,
      status: parseDeviceStatus(status),
      connectionType: id.includes(':') ? 'tcpip' : 'usb'
    };
    
    // Parse IP/port for network devices
    if (device.connectionType === 'tcpip') {
      const [ip, port] = id.split(':');
      device.ipAddress = ip;
      device.port = parseInt(port);
    }
    
    devices.push(device);
  }
  
  // Fetch Android version for each device
  for (const device of devices) {
    if (device.status === 'connected') {
      const info = await getDeviceInfo(device.id);
      device.androidVersion = info.androidVersion;
    }
  }
  
  return devices;
}

/**
 * Parse device status string
 */
function parseDeviceStatus(status: string): AdbDevice['status'] {
  switch (status) {
    case 'device':
      return 'connected';
    case 'offline':
      return 'offline';
    case 'unauthorized':
      return 'unauthorized';
    default:
      return 'disconnected';
  }
}

/**
 * Get detailed device information
 */
export async function getDeviceInfo(deviceId: string): Promise<DeviceInfo> {
  const defaultInfo: DeviceInfo = {
    deviceId,
    model: 'Unknown',
    manufacturer: 'Unknown',
    androidVersion: 'Unknown',
    sdkVersion: 0,
    imei: '',
    serialNumber: deviceId,
    batteryLevel: 0,
    isRooted: false,
    screenWidth: 0,
    screenHeight: 0,
    density: 0
  };

  // Get multiple properties at once
  const propResult = await executeAdbCommand([
    '-s', deviceId,
    'shell',
    'getprop ro.product.model; getprop ro.product.manufacturer; getprop ro.build.version.release; getprop ro.build.version.sdk; getprop ro.product.model; getprop ro.serialno'
  ]);

  if (propResult.success) {
    const lines = propResult.output.split('\n');
    defaultInfo.model = lines[0]?.trim() || 'Unknown';
    defaultInfo.manufacturer = lines[1]?.trim() || 'Unknown';
    defaultInfo.androidVersion = lines[2]?.trim() || 'Unknown';
    defaultInfo.sdkVersion = parseInt(lines[3]) || 0;
    defaultInfo.serialNumber = lines[5]?.trim() || deviceId;
  }

  // Get battery level
  const batteryResult = await executeAdbCommand([
    '-s', deviceId,
    'shell',
    'dumpsys battery | grep level'
  ]);

  if (batteryResult.success) {
    const match = batteryResult.output.match(/level:\s*(\d+)/);
    if (match) {
      defaultInfo.batteryLevel = parseInt(match[1]);
    }
  }

  // Get screen resolution
  const screenResult = await executeAdbCommand([
    '-s', deviceId,
    'shell',
    'wm size'
  ]);

  if (screenResult.success) {
    const match = screenResult.output.match(/Physical size:\s*(\d+)x(\d+)/);
    if (match) {
      defaultInfo.screenWidth = parseInt(match[1]);
      defaultInfo.screenHeight = parseInt(match[2]);
    }
  }

  // Get density
  const densityResult = await executeAdbCommand([
    '-s', deviceId,
    'shell',
    'wm density'
  ]);

  if (densityResult.success) {
    const match = densityResult.output.match(/Physical density:\s*(\d+)/);
    if (match) {
      defaultInfo.density = parseInt(match[1]);
    }
  }

  // Check if rooted
  const rootResult = await executeAdbCommand([
    '-s', deviceId,
    'shell',
    'which su'
  ]);

  defaultInfo.isRooted = rootResult.success && rootResult.output.trim() !== '';

  // Try to get IMEI (requires root or special permissions)
  if (defaultInfo.isRooted) {
    const imeiResult = await executeAdbCommand([
      '-s', deviceId,
      'shell',
      'su -c "service call iphonesubinfo 1 | grep -o \'[0-9]\\{15\\}\'"'
    ]);

    if (imeiResult.success && imeiResult.output.trim()) {
      defaultInfo.imei = imeiResult.output.trim().split('\n')[0] || '';
    }
  }

  return defaultInfo;
}

/**
 * Execute shell command on device
 */
export async function executeCommand(
  deviceId: string, 
  command: string
): Promise<AdbCommandResult> {
  return executeAdbCommand(['-s', deviceId, 'shell', command]);
}

/**
 * Read SIM card slots information
 */
export async function readSimSlots(deviceId: string): Promise<SimCardSlot[]> {
  const slots: SimCardSlot[] = [];
  
  // Method 1: Try using service call (requires root)
  const serviceResult = await executeCommand(deviceId, 
    'su -c "service call phone 27"'
  );
  
  if (serviceResult.success && serviceResult.output.includes('parcel')) {
    // Parse service call output for SIM info
    // This is device-specific and complex
  }
  
  // Method 2: Use telephony commands (works on most devices)
  const simStateResult = await executeCommand(deviceId, 
    'getprop gsm.sim.state'
  );
  
  if (simStateResult.success) {
    const states = simStateResult.output.split(',');
    
    for (let i = 0; i < states.length; i++) {
      const slot: SimCardSlot = {
        slotIndex: i,
        isActive: states[i]?.trim() === 'READY'
      };
      
      if (slot.isActive) {
        // Get phone number for this slot
        const phoneNumberResult = await executeCommand(deviceId,
          `service call iphonesubinfo ${i + 1}`
        );
        
        // Try alternative method to get phone number
        const line1NumberResult = await executeCommand(deviceId,
          `settings get global line1_number_${i}`
        );
        
        if (line1NumberResult.success && line1NumberResult.output.trim()) {
          slot.phoneNumber = formatPhoneNumber(line1NumberResult.output.trim());
        }
        
        // Get operator
        const operatorResult = await executeCommand(deviceId,
          `getprop gsm.operator.numeric.${i}`
        );
        
        if (operatorResult.success && operatorResult.output.trim()) {
          slot.operator = operatorResult.output.trim();
        }
        
        // Get network type
        const networkResult = await executeCommand(deviceId,
          `getprop gsm.network.type.${i}`
        );
        
        if (networkResult.success && networkResult.output.trim()) {
          slot.networkType = networkResult.output.trim();
        }
      }
      
      slots.push(slot);
    }
  }
  
  // Method 3: Use content provider (may require permissions)
  if (slots.length === 0 || slots.every(s => !s.phoneNumber)) {
    const contentResult = await executeCommand(deviceId,
      'content query --uri content://telephony/siminfo'
    );
    
    if (contentResult.success) {
      const simInfo = parseSimInfoContent(contentResult.output);
      for (const info of simInfo) {
        const existing = slots.find(s => s.slotIndex === info.slotIndex);
        if (existing) {
          Object.assign(existing, info);
        } else {
          slots.push(info);
        }
      }
    }
  }
  
  return slots;
}

/**
 * Parse SIM info from content provider output
 */
function parseSimInfoContent(output: string): SimCardSlot[] {
  const slots: SimCardSlot[] = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    const slot: Partial<SimCardSlot> = {};
    
    // Parse key=value pairs
    const matches = line.matchAll(/(\w+)=([^\s,]+)/g);
    for (const match of matches) {
      const [, key, value] = match;
      
      switch (key) {
        case 'slot_index':
        case 'slot':
          slot.slotIndex = parseInt(value);
          break;
        case 'number':
          slot.phoneNumber = formatPhoneNumber(value);
          break;
        case 'icc_id':
        case 'iccId':
          slot.iccid = value;
          break;
        case 'imsi':
          slot.imsi = value;
          break;
        case 'mcc':
        case 'mnc':
          if (slot.operator) {
            slot.operator += value;
          } else {
            slot.operator = value;
          }
          break;
      }
    }
    
    if (slot.slotIndex !== undefined) {
      slot.isActive = true;
      slots.push(slot as SimCardSlot);
    }
  }
  
  return slots;
}

/**
 * Read SMS messages from device
 */
export async function readSms(deviceId: string, limit: number = 50): Promise<SmsMessage[]> {
  const messages: SmsMessage[] = [];
  
  // Try to read SMS using content provider
  const contentResult = await executeCommand(deviceId,
    `content query --uri content://sms/inbox --projection address:body:date --sort "date DESC LIMIT ${limit}"`
  );
  
  if (contentResult.success) {
    const parsedMessages = parseSmsContent(contentResult.output, deviceId);
    messages.push(...parsedMessages);
  }
  
  // Alternative: Try reading from logcat for new SMS
  // This is useful for real-time monitoring
  
  return messages;
}

/**
 * Parse SMS content from content provider output
 */
function parseSmsContent(output: string, deviceId: string): SmsMessage[] {
  const messages: SmsMessage[] = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const message: Partial<SmsMessage> = {
      id: generateId(),
      deviceId
    };
    
    // Parse key=value pairs
    const matches = line.matchAll(/(\w+)=([^\s]+(?:\s+[^\s:=]+)*?)(?=\s+\w+=|$)/g);
    for (const match of matches) {
      const [, key, value] = match;
      
      switch (key) {
        case 'address':
          message.sender = value.replace(/['"]/g, '');
          break;
        case 'body':
          message.body = decodeURIComponent(value.replace(/['"]/g, '').replace(/\+/g, ' '));
          break;
        case 'date':
          const timestamp = parseInt(value);
          if (!isNaN(timestamp)) {
            message.timestamp = new Date(timestamp);
          }
          break;
      }
    }
    
    if (message.sender && message.body) {
      message.receivedAt = new Date();
      message.isRead = true;
      messages.push(message as SmsMessage);
    }
  }
  
  return messages;
}

/**
 * Start SMS listener for real-time monitoring
 */
export async function startSmsListenerRealtime(
  deviceId: string,
  callback: (message: SmsMessage) => void
): Promise<{ success: boolean; error?: string }> {
  // Check if already listening
  if (activeListeners.has(deviceId)) {
    return { success: false, error: 'Listener already active for this device' };
  }
  
  const adbPath = process.env.ADB_PATH || DEFAULT_CONFIG.adb.path;
  
  try {
    const process = spawn(adbPath, [
      '-s', deviceId,
      'logcat',
      '-v', 'time',
      'SmsReceiver:*',
      'SMS:*',
      'Telephony:*',
      '*:S'
    ], { shell: false });

    let buffer = '';
    
    process.stdout.on('data', (data) => {
      buffer += data.toString();
      
      // Try to parse SMS from logcat output
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const message = parseSmsFromLogcat(line, deviceId);
        if (message) {
          callback(message);
        }
      }
    });

    process.stderr.on('data', (data) => {
      logger.error('SMS listener error', new Error(data.toString()));
    });

    process.on('error', (error) => {
      logger.error('SMS listener process error', error);
      activeListeners.delete(deviceId);
    });

    process.on('close', (code) => {
      logger.info('SMS listener closed', { deviceId, exitCode: code });
      activeListeners.delete(deviceId);
    });

    activeListeners.set(deviceId, process);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Stop SMS listener
 */
export async function stopSmsListenerRealtime(deviceId: string): Promise<boolean> {
  const process = activeListeners.get(deviceId);
  
  if (!process) {
    return false;
  }
  
  try {
    process.kill('SIGTERM');
    activeListeners.delete(deviceId);
    return true;
  } catch (error) {
    logger.error('Failed to stop SMS listener', error as Error);
    return false;
  }
}

/**
 * Parse SMS from logcat output
 */
function parseSmsFromLogcat(line: string, deviceId: string): SmsMessage | null {
  // Look for SMS received patterns
  const smsPatterns = [
    /SMS message from ([\d+]+): (.+)/,
    /Received SMS from ([\d+]+).*body[:\s]+(.+)/i,
    /SmsReceiver:\s+from[:\s]+([\d+]+).*text[:\s]+(.+)/i
  ];
  
  for (const pattern of smsPatterns) {
    const match = line.match(pattern);
    if (match) {
      return {
        id: generateId(),
        deviceId,
        phoneNumber: '',
        sender: match[1],
        body: match[2].trim(),
        timestamp: new Date(),
        receivedAt: new Date(),
        isRead: false
      };
    }
  }
  
  return null;
}

/**
 * Check if device has SMS permissions
 */
export async function checkSmsPermissions(deviceId: string): Promise<boolean> {
  // Try to read a single SMS
  const result = await executeCommand(deviceId, 
    'content query --uri content://sms/inbox --projection address --limit 1'
  );
  
  return result.success && !result.error?.includes('Permission denied');
}

/**
 * Grant SMS permissions (requires root)
 */
export async function grantSmsPermissions(deviceId: string): Promise<boolean> {
  // Try to grant SMS permissions using root
  const result = await executeCommand(deviceId,
    'su -c "pm grant android android.permission.READ_SMS"'
  );
  
  if (result.success) {
    const result2 = await executeCommand(deviceId,
      'su -c "pm grant android android.permission.RECEIVE_SMS"'
    );
    return result2.success;
  }
  
  return false;
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Add + prefix if not present and looks like international number
  if (!cleaned.startsWith('+') && cleaned.length > 10) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

// Export list of active listeners for monitoring
export function getActiveListeners(): string[] {
  return Array.from(activeListeners.keys());
}

// Clean up all listeners on process exit
process.on('SIGINT', () => {
  for (const [deviceId, process] of activeListeners) {
    try {
      process.kill('SIGTERM');
      logger.info('Cleaned up SMS listener', { deviceId });
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
});

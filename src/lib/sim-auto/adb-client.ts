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
    
    const childProcess = spawn(fullCommand[0], fullCommand.slice(1), {
      shell: false,
      env: process.env
    });

    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | null = null;

    // Set timeout
    timeoutId = setTimeout(() => {
      childProcess.kill();
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('error', (err) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    });

    childProcess.on('close', (code) => {
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
  
  logger.info('Reading SIM slots for device', { deviceId });
  
  // Method 1: Use content provider (most reliable for multi-SIM)
  const contentResult = await executeCommand(deviceId,
    'content query --uri content://telephony/siminfo --projection _id:sim_id:slot_index:icc_id:number:carrier_name:mcc:mnc'
  );
  
  if (contentResult.success && contentResult.output.trim()) {
    logger.debug('Content provider output', { output: contentResult.output });
    const simInfo = parseSimInfoContent(contentResult.output);
    
    for (const info of simInfo) {
      slots.push(info);
      logger.info('Found SIM from content provider', { 
        slotIndex: info.slotIndex, 
        phoneNumber: info.phoneNumber,
        iccid: info.iccid 
      });
    }
  }
  
  // Method 2: Check each slot individually using getprop
  for (let slotIndex = 0; slotIndex < 2; slotIndex++) {
    // Skip if already found from content provider
    if (slots.find(s => s.slotIndex === slotIndex && s.isActive)) {
      continue;
    }
    
    // Check slot state
    const stateResult = await executeCommand(deviceId,
      `getprop gsm.sim.state.${slotIndex}`
    );
    
    const state = stateResult.success ? stateResult.output.trim() : '';
    const isActive = state === 'READY' || state === 'IMSI' || state === 'LOADED';
    
    if (isActive || !slots.find(s => s.slotIndex === slotIndex)) {
      const slot: SimCardSlot = {
        slotIndex,
        isActive
      };
      
      if (isActive) {
        // Get phone number for this slot
        const line1NumberResult = await executeCommand(deviceId,
          `getprop gsm.line1.number.${slotIndex}`
        );
        
        if (line1NumberResult.success && line1NumberResult.output.trim() && 
            line1NumberResult.output.trim() !== 'unknown') {
          slot.phoneNumber = formatPhoneNumber(line1NumberResult.output.trim());
        }
        
        // Alternative: Try service call
        if (!slot.phoneNumber) {
          const serviceResult = await executeCommand(deviceId,
            `service call iphonesubinfo 5 s16 ${slotIndex}`
          );
          
          if (serviceResult.success && serviceResult.output.includes('(')) {
            const phone = parseServiceCallString(serviceResult.output);
            if (phone) {
              slot.phoneNumber = formatPhoneNumber(phone);
            }
          }
        }
        
        // Get ICCID
        const iccidResult = await executeCommand(deviceId,
          `getprop persist.radio.iccid.sim${slotIndex + 1}`
        );
        
        if (iccidResult.success && iccidResult.output.trim()) {
          slot.iccid = iccidResult.output.trim();
        }
        
        // Alternative ICCID methods
        if (!slot.iccid) {
          const iccidResult2 = await executeCommand(deviceId,
            `getprop ril.iccid.sim${slotIndex + 1}`
          );
          
          if (iccidResult2.success && iccidResult2.output.trim()) {
            slot.iccid = iccidResult2.output.trim();
          }
        }
        
        // Get operator
        const operatorResult = await executeCommand(deviceId,
          `getprop gsm.operator.numeric`
        );
        
        if (operatorResult.success && operatorResult.output.trim()) {
          slot.operator = operatorResult.output.trim();
        }
        
        // Alternative operator
        if (!slot.operator) {
          const operatorResult2 = await executeCommand(deviceId,
            `getprop gsm.operator.alpha.${slotIndex}`
          );
          
          if (operatorResult2.success && operatorResult2.output.trim()) {
            slot.operator = operatorResult2.output.trim();
          }
        }
        
        // Get network type
        const networkResult = await executeCommand(deviceId,
          `getprop gsm.network.type`
        );
        
        if (networkResult.success && networkResult.output.trim()) {
          slot.networkType = networkResult.output.trim();
        }
      }
      
      // Merge with existing slot info or add new
      const existing = slots.findIndex(s => s.slotIndex === slotIndex);
      if (existing >= 0) {
        slots[existing] = { ...slots[existing], ...slot };
      } else {
        slots.push(slot);
      }
      
      logger.info('Found SIM from getprop', { 
        slotIndex, 
        isActive,
        phoneNumber: slot.phoneNumber 
      });
    }
  }
  
  // Method 3: Check combined sim state (fallback)
  const simStateResult = await executeCommand(deviceId, 
    'getprop gsm.sim.state'
  );
  
  if (simStateResult.success) {
    const states = simStateResult.output.split(',');
    
    for (let i = 0; i < states.length; i++) {
      const existingSlot = slots.find(s => s.slotIndex === i);
      if (!existingSlot) {
        const isActive = states[i]?.trim() === 'READY' || 
                        states[i]?.trim() === 'IMSI' ||
                        states[i]?.trim() === 'LOADED';
        
        slots.push({
          slotIndex: i,
          isActive
        });
        
        logger.info('Found SIM from combined state', { 
          slotIndex: i, 
          state: states[i]?.trim(),
          isActive 
        });
      }
    }
  }
  
  // Sort slots by index
  slots.sort((a, b) => a.slotIndex - b.slotIndex);
  
  // Filter only active SIMs
  const activeSlots = slots.filter(s => s.isActive);
  
  logger.info('SIM scan complete', { 
    totalSlots: slots.length, 
    activeSlots: activeSlots.length,
    slots: slots.map(s => ({ index: s.slotIndex, active: s.isActive, phone: s.phoneNumber }))
  });
  
  return slots;
}

/**
 * Parse service call string output (for phone number extraction)
 */
function parseServiceCallString(output: string): string | null {
  // Output format: Result: Parcel(00000000 0000000n '....phone..')
  // or: Result: Parcel(00000000 "phone_number")
  try {
    // Try to extract string between quotes
    const match = output.match(/"([^"]+)"/);
    if (match) {
      return match[1];
    }
    
    // Try to extract from parcel format
    const parcelMatch = output.match(/'([^']+)'/);
    if (parcelMatch) {
      // Extract phone number from the string
      const phone = parcelMatch[1].replace(/[^\d+]/g, '');
      if (phone.length >= 10) {
        return phone;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse SIM info from content provider output
 */
function parseSimInfoContent(output: string): SimCardSlot[] {
  const slots: SimCardSlot[] = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const slot: Partial<SimCardSlot> = { isActive: true };
    
    // Parse key=value pairs with better regex for quoted values
    const matches = line.matchAll(/(\w+)=([^\s,]+(?:\s+[^\s,=]+)*?)(?=\s+\w+=|$)/g);
    
    for (const match of matches) {
      const [, key, value] = match;
      const cleanValue = value.replace(/^["']|["']$/g, '');
      
      switch (key.toLowerCase()) {
        case 'slot_index':
        case 'slot':
        case 'sim_id':
          slot.slotIndex = parseInt(cleanValue) || 0;
          break;
        case 'number':
          if (cleanValue && cleanValue !== 'null' && cleanValue !== 'unknown') {
            slot.phoneNumber = formatPhoneNumber(cleanValue);
          }
          break;
        case 'icc_id':
        case 'iccid':
          slot.iccid = cleanValue;
          break;
        case 'imsi':
          slot.imsi = cleanValue;
          break;
        case 'mcc':
          if (slot.operator) {
            slot.operator = cleanValue + (slot.operator.length > 3 ? '' : slot.operator);
          } else {
            slot.operator = cleanValue;
          }
          break;
        case 'mnc':
          if (slot.operator) {
            slot.operator = slot.operator.length <= 3 ? slot.operator + cleanValue : slot.operator;
          } else {
            slot.operator = cleanValue;
          }
          break;
        case 'carrier_name':
        case 'carrier':
          if (cleanValue && cleanValue !== 'null') {
            slot.operator = cleanValue;
          }
          break;
      }
    }
    
    // Only add if we found a valid slot index
    if (slot.slotIndex !== undefined) {
      // Check if slot already exists
      const existingIndex = slots.findIndex(s => s.slotIndex === slot.slotIndex);
      if (existingIndex >= 0) {
        // Merge with existing
        slots[existingIndex] = { ...slots[existingIndex], ...slot } as SimCardSlot;
      } else {
        slots.push(slot as SimCardSlot);
      }
    }
  }
  
  // Sort by slot index
  slots.sort((a, b) => a.slotIndex - b.slotIndex);
  
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
    const childProcess = spawn(adbPath, [
      '-s', deviceId,
      'logcat',
      '-v', 'time',
      'SmsReceiver:*',
      'SMS:*',
      'Telephony:*',
      '*:S'
    ], { shell: false });

    let buffer = '';
    
    childProcess.stdout.on('data', (data) => {
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

    childProcess.stderr.on('data', (data) => {
      logger.error('SMS listener error', new Error(data.toString()));
    });

    childProcess.on('error', (error) => {
      logger.error('SMS listener process error', error);
      activeListeners.delete(deviceId);
    });

    childProcess.on('close', (code) => {
      logger.info('SMS listener closed', { deviceId, exitCode: code });
      activeListeners.delete(deviceId);
    });

    activeListeners.set(deviceId, childProcess);
    
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
  const listenerProcess = activeListeners.get(deviceId);
  
  if (!listenerProcess) {
    return false;
  }
  
  try {
    listenerProcess.kill('SIGTERM');
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
  for (const [deviceId, listenerProcess] of activeListeners) {
    try {
      listenerProcess.kill('SIGTERM');
      logger.info('Cleaned up SMS listener', { deviceId });
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
});

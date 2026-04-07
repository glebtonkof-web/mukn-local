/**
 * Improved SIM Scanner - Enhanced Dual SIM Detection
 * Ensures both SIM cards are properly detected on Android devices
 */

import { executeCommand, listDevices, getDeviceInfo, readSimSlots } from './adb-client'
import { logger } from '@/lib/logger'
import { db } from '@/lib/db'

export interface DetectedSimCard {
  id: string // deviceId_slotIndex
  deviceId: string
  slotIndex: number
  phoneNumber: string
  operator: string
  country: string
  mcc: string
  mnc: string
  iccid: string
  isActive: boolean
  networkType: string
  signalStrength?: number
  isRoaming: boolean
}

// MCC to Country mapping
const MCC_TO_COUNTRY: Record<string, { country: string; code: string }> = {
  '250': { country: 'Россия', code: 'RU' },
  '255': { country: 'Украина', code: 'UA' },
  '257': { country: 'Беларусь', code: 'BY' },
  '268': { country: 'Казахстан', code: 'KZ' },
  '272': { country: 'Ирландия', code: 'IE' },
  '234': { country: 'Великобритания', code: 'GB' },
  '310': { country: 'США', code: 'US' },
  '311': { country: 'США', code: 'US' },
  '312': { country: 'США', code: 'US' },
  '313': { country: 'США', code: 'US' },
  '314': { country: 'США', code: 'US' },
  '315': { country: 'США', code: 'US' },
  '316': { country: 'США', code: 'US' },
  '724': { country: 'Бразилия', code: 'BR' },
  '460': { country: 'Китай', code: 'CN' },
  '404': { country: 'Индия', code: 'IN' },
  '405': { country: 'Индия', code: 'IN' },
  '454': { country: 'Гонконг', code: 'HK' },
  '520': { country: 'Таиланд', code: 'TH' },
  '510': { country: 'Индонезия', code: 'ID' },
  '505': { country: 'Австралия', code: 'AU' },
  '440': { country: 'Япония', code: 'JP' },
  '450': { country: 'Корея', code: 'KR' },
  '262': { country: 'Германия', code: 'DE' },
  '208': { country: 'Франция', code: 'FR' },
  '222': { country: 'Италия', code: 'IT' },
  '214': { country: 'Испания', code: 'ES' },
  '232': { country: 'Австрия', code: 'AT' },
  '228': { country: 'Швейцария', code: 'CH' },
  '204': { country: 'Нидерланды', code: 'NL' },
  '206': { country: 'Бельгия', code: 'BE' },
  '242': { country: 'Норвегия', code: 'NO' },
  '240': { country: 'Швеция', code: 'SE' },
  '238': { country: 'Дания', code: 'DK' },
  '244': { country: 'Финляндия', code: 'FI' },
  '274': { country: 'Исландия', code: 'IS' },
  '286': { country: 'Турция', code: 'TR' },
  '202': { country: 'Греция', code: 'GR' },
  '230': { country: 'Чехия', code: 'CZ' },
  '260': { country: 'Польша', code: 'PL' },
  '231': { country: 'Словакия', code: 'SK' },
  '216': { country: 'Венгрия', code: 'HU' },
  '226': { country: 'Румыния', code: 'RO' },
  '284': { country: 'Болгария', code: 'BG' },
  '219': { country: 'Хорватия', code: 'HR' },
  '293': { country: 'Словения', code: 'SI' },
  '294': { country: 'Македония', code: 'MK' },
  '220': { country: 'Сербия', code: 'RS' },
  '282': { country: 'Грузия', code: 'GE' },
  '283': { country: 'Армения', code: 'AM' },
  '400': { country: 'Азербайджан', code: 'AZ' },
  '418': { country: 'Ирак', code: 'IQ' },
  '432': { country: 'Иран', code: 'IR' },
  '416': { country: 'Иордания', code: 'JO' },
  '419': { country: 'Кувейт', code: 'KW' },
  '420': { country: 'Саудовская Аравия', code: 'SA' },
  '424': { country: 'ОАЭ', code: 'AE' },
  '425': { country: 'Израиль', code: 'IL' },
  '602': { country: 'Египет', code: 'EG' },
  '639': { country: 'Кения', code: 'KE' },
  '655': { country: 'ЮАР', code: 'ZA' },
  '502': { country: 'Малайзия', code: 'MY' },
  '515': { country: 'Филиппины', code: 'PH' },
  '704': { country: 'Сальвадор', code: 'SV' },
  '706': { country: 'Гватемала', code: 'GT' },
  '714': { country: 'Панама', code: 'PA' },
  '722': { country: 'Аргентина', code: 'AR' },
  '730': { country: 'Чили', code: 'CL' },
  '732': { country: 'Колумбия', code: 'CO' },
  '734': { country: 'Венесуэла', code: 'VE' },
  '334': { country: 'Мексика', code: 'MX' },
  '302': { country: 'Канада', code: 'CA' },
  '338': { country: 'Ямайка', code: 'JM' },
}

/**
 * Detect all SIM cards on all connected devices
 * This is the main entry point for SIM detection
 */
export async function detectAllSimCards(): Promise<DetectedSimCard[]> {
  logger.info('Starting SIM card detection...')
  
  const allSimCards: DetectedSimCard[] = []
  
  try {
    // Get all connected devices
    const devices = await listDevices()
    
    if (devices.length === 0) {
      logger.warn('No ADB devices found')
      return []
    }
    
    logger.info(`Found ${devices.length} ADB device(s)`)
    
    // Process each device
    for (const device of devices) {
      if (device.status !== 'connected') {
        logger.warn(`Device ${device.id} is not connected (status: ${device.status})`)
        continue
      }
      
      logger.info(`Scanning SIM cards on device: ${device.id} (${device.model})`)
      
      try {
        // Get SIM slots using the improved adb-client method
        const simSlots = await readSimSlots(device.id)
        
        logger.info(`Device ${device.id} has ${simSlots.length} slot(s), ${simSlots.filter(s => s.isActive).length} active`)
        
        for (const slot of simSlots) {
          if (!slot.isActive) {
            logger.debug(`Slot ${slot.slotIndex} is not active, skipping`)
            continue
          }
          
          // Create SIM card entry
          const simCard = await createSimCardEntry(device.id, slot)
          
          if (simCard) {
            allSimCards.push(simCard)
            logger.info(`Detected SIM card: ${simCard.phoneNumber || 'unknown number'} on slot ${slot.slotIndex} (${simCard.operator})`)
            
            // Store in database
            await storeSimCardInDb(simCard)
          }
        }
        
        // If no active SIMs found via readSimSlots, try alternative methods
        if (simSlots.filter(s => s.isActive).length === 0) {
          logger.warn(`No active SIMs found via standard method for ${device.id}, trying alternative detection...`)
          const alternativeSims = await detectSimCardsAlternative(device.id)
          allSimCards.push(...alternativeSims)
        }
        
      } catch (error) {
        logger.error(`Error scanning SIM cards on device ${device.id}`, error as Error)
      }
    }
    
    logger.info(`SIM detection complete: ${allSimCards.length} SIM card(s) found`)
    
    return allSimCards
    
  } catch (error) {
    logger.error('SIM detection failed', error as Error)
    return []
  }
}

/**
 * Create a SIM card entry from slot data
 */
async function createSimCardEntry(deviceId: string, slot: { 
  slotIndex: number
  phoneNumber?: string
  operator?: string
  iccid?: string
  isActive: boolean
}): Promise<DetectedSimCard | null> {
  
  if (!slot.isActive) {
    return null
  }
  
  // Parse operator info
  let mcc = ''
  let mnc = ''
  let operator = slot.operator || ''
  let country = 'Неизвестно'
  
  if (operator && operator.length >= 5) {
    // Operator might be in MCCMNC format
    mcc = operator.substring(0, 3)
    mnc = operator.substring(3)
    
    const countryInfo = MCC_TO_COUNTRY[mcc]
    if (countryInfo) {
      country = countryInfo.country
    }
  }
  
  // Try to get more info from device
  try {
    // Get carrier name for this slot
    const carrierResult = await executeCommand(deviceId, 
      `getprop gsm.operator.alpha.${slot.slotIndex}`)
    if (carrierResult.success && carrierResult.output.trim()) {
      operator = carrierResult.output.trim()
    }
    
    // Get MCC/MNC
    const mccResult = await executeCommand(deviceId,
      `getprop gsm.operator.numeric.${slot.slotIndex}`)
    if (mccResult.success && mccResult.output.trim()) {
      const numeric = mccResult.output.trim()
      if (numeric.length >= 5) {
        mcc = numeric.substring(0, 3)
        mnc = numeric.substring(3)
        
        const countryInfo = MCC_TO_COUNTRY[mcc]
        if (countryInfo) {
          country = countryInfo.country
        }
      }
    }
    
    // Try to get phone number if not provided
    if (!slot.phoneNumber) {
      // Try multiple methods to get phone number
      const phoneResult1 = await executeCommand(deviceId,
        `service call iphonesubinfo 5 s16 ${slot.slotIndex}`)
      
      if (phoneResult1.success && phoneResult1.output.includes('(')) {
        const phone = parseServiceCallString(phoneResult1.output)
        if (phone) {
          slot.phoneNumber = phone
        }
      }
    }
    
  } catch (error) {
    logger.debug(`Error getting additional SIM info for slot ${slot.slotIndex}`, error as Error)
  }
  
  // Format phone number
  let phoneNumber = slot.phoneNumber || ''
  if (phoneNumber && !phoneNumber.startsWith('+')) {
    // Add country code based on MCC
    if (mcc === '250') {
      phoneNumber = '+7' + phoneNumber.replace(/^8/, '').replace(/^7/, '')
    } else if (mcc === '255') {
      phoneNumber = '+380' + phoneNumber.replace(/^0/, '')
    }
  }
  
  return {
    id: `${deviceId}_${slot.slotIndex}`,
    deviceId,
    slotIndex: slot.slotIndex,
    phoneNumber,
    operator: operator || 'Unknown',
    country,
    mcc,
    mnc,
    iccid: slot.iccid || '',
    isActive: true,
    networkType: '',
    isRoaming: false
  }
}

/**
 * Parse service call string output
 */
function parseServiceCallString(output: string): string | null {
  try {
    // Try to extract string between quotes
    const match = output.match(/"([^"]+)"/)
    if (match) {
      return match[1].replace(/[^\d+]/g, '')
    }
    
    // Try to extract from parcel format
    const parcelMatch = output.match(/'([^']+)'/)
    if (parcelMatch) {
      const phone = parcelMatch[1].replace(/[^\d+]/g, '')
      if (phone.length >= 10) {
        return phone
      }
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Alternative SIM detection methods for devices where standard method fails
 */
async function detectSimCardsAlternative(deviceId: string): Promise<DetectedSimCard[]> {
  const simCards: DetectedSimCard[] = []
  
  try {
    // Method 1: Check subscription info (Android 5.1+)
    const subInfoResult = await executeCommand(deviceId,
      'cmd subscription list')
    
    if (subInfoResult.success && subInfoResult.output.includes('Subscription')) {
      // Parse subscription info
      const lines = subInfoResult.output.split('\n')
      let slotIndex = 0
      
      for (const line of lines) {
        if (line.includes('Subscription') || line.includes('subId')) {
          // Extract phone number
          const phoneMatch = line.match(/number[=:]\s*([+\d]+)/)
          const phone = phoneMatch ? phoneMatch[1] : ''
          
          if (phone || line.includes('active')) {
            simCards.push({
              id: `${deviceId}_${slotIndex}`,
              deviceId,
              slotIndex,
              phoneNumber: phone,
              operator: '',
              country: 'Неизвестно',
              mcc: '',
              mnc: '',
              iccid: '',
              isActive: true,
              networkType: '',
              isRoaming: false
            })
            slotIndex++
          }
        }
      }
    }
    
    // Method 2: Check telephony registry
    if (simCards.length === 0) {
      for (let i = 0; i < 2; i++) {
        const stateResult = await executeCommand(deviceId,
          `getprop gsm.sim.state.${i}`)
        
        const state = stateResult.success ? stateResult.output.trim() : ''
        
        if (state === 'READY' || state === 'LOADED' || state === 'IMSI') {
          // Get phone number
          const phoneResult = await executeCommand(deviceId,
            `getprop gsm.line1.number.${i}`)
          
          const phone = phoneResult.success ? phoneResult.output.trim() : ''
          
          if (phone && phone !== 'unknown') {
            simCards.push({
              id: `${deviceId}_${i}`,
              deviceId,
              slotIndex: i,
              phoneNumber: formatPhoneNumber(phone),
              operator: '',
              country: 'Неизвестно',
              mcc: '',
              mnc: '',
              iccid: '',
              isActive: true,
              networkType: '',
              isRoaming: false
            })
          } else {
            // Still add as active SIM without phone number
            simCards.push({
              id: `${deviceId}_${i}`,
              deviceId,
              slotIndex: i,
              phoneNumber: '',
              operator: '',
              country: 'Неизвестно',
              mcc: '',
              mnc: '',
              iccid: '',
              isActive: true,
              networkType: '',
              isRoaming: false
            })
          }
        }
      }
    }
    
    logger.info(`Alternative detection found ${simCards.length} SIM card(s)`)
    
  } catch (error) {
    logger.error('Alternative SIM detection failed', error as Error)
  }
  
  return simCards
}

/**
 * Format phone number to international format
 */
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  if (!cleaned.startsWith('+') && cleaned.length > 10) {
    // Determine country code
    if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
      cleaned = '+7' + cleaned.replace(/^[78]/, '')
    } else if (cleaned.startsWith('380')) {
      cleaned = '+' + cleaned
    } else if (cleaned.startsWith('375')) {
      cleaned = '+' + cleaned
    } else {
      cleaned = '+' + cleaned
    }
  }
  
  return cleaned
}

/**
 * Store SIM card in database
 */
async function storeSimCardInDb(simCard: DetectedSimCard): Promise<void> {
  try {
    await db.simCardDetected.upsert({
      where: { id: simCard.id },
      create: {
        id: simCard.id,
        deviceId: simCard.deviceId,
        slotIndex: simCard.slotIndex,
        phoneNumber: simCard.phoneNumber,
        operator: simCard.operator,
        country: simCard.country,
        mcc: simCard.mcc || null,
        mnc: simCard.mnc || null,
        iccid: simCard.iccid || null,
        isActive: simCard.isActive,
        detectedAt: new Date(),
        lastChecked: new Date()
      },
      update: {
        phoneNumber: simCard.phoneNumber,
        operator: simCard.operator,
        mcc: simCard.mcc || null,
        mnc: simCard.mnc || null,
        iccid: simCard.iccid || null,
        lastChecked: new Date(),
        isActive: true
      }
    })
    
    logger.debug(`Stored SIM card ${simCard.id} in database`)
  } catch (error) {
    logger.error(`Failed to store SIM card ${simCard.id}`, error as Error)
  }
}

/**
 * Get cached SIM cards from database
 */
export async function getCachedSimCards(): Promise<DetectedSimCard[]> {
  try {
    const cached = await db.simCardDetected.findMany({
      where: { isActive: true },
      orderBy: [{ deviceId: 'asc' }, { slotIndex: 'asc' }]
    })
    
    return cached.map(c => ({
      id: c.id,
      deviceId: c.deviceId,
      slotIndex: c.slotIndex,
      phoneNumber: c.phoneNumber,
      operator: c.operator,
      country: c.country,
      mcc: c.mcc,
      mnc: c.mnc,
      iccid: c.iccid,
      isActive: c.isActive,
      networkType: '',
      isRoaming: false
    }))
  } catch (error) {
    logger.error('Failed to get cached SIM cards', error as Error)
    return []
  }
}

export default {
  detectAllSimCards,
  getCachedSimCards
}

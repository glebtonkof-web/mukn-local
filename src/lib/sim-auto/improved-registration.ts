/**
 * Improved Registration Automation
 * Handles automatic account registration with enhanced anti-bot detection
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { EventEmitter } from 'events'
import { logger } from '@/lib/logger'
import { startSmsMonitoring, waitForVerificationCode, readRecentSms } from './improved-sms-reader'
import type { Platform } from './session-manager'

// Registration events
const registrationEvents = new EventEmitter()

// Platform configurations with improved selectors
const PLATFORM_CONFIGS = {
  telegram: {
    url: 'https://web.telegram.org/a/',
    alternativeUrl: 'https://web.telegram.org/k/',
    name: 'Telegram',
    requiresPhone: true,
    requiresSms: true,
    maxRetries: 3,
    timeout: 180000,
    selectors: {
      phoneInput: [
        'input[type="tel"]',
        'input[placeholder*="phone" i]',
        'input[autocomplete="tel"]',
        '#sign-in-phone-number',
        'input[name="phone"]'
      ],
      codeInput: [
        'input[type="text"][maxlength="6"]',
        'input[inputmode="numeric"]',
        'input[placeholder*="code" i]',
        'input[name="code"]'
      ],
      submitBtn: [
        'button[type="submit"]',
        'button.Button.primary',
        'button:has-text("Continue")',
        'button:has-text("Next")',
        'button:has-text("Sign In")'
      ],
      successIndicator: [
        '.chat-list',
        '[class*="ChatList"]',
        '[class*="MainHeader"]',
        '#column-center'
      ],
      errorIndicator: [
        '.error',
        '[class*="error"]',
        '[class*="Error"]',
        '.modal-content'
      ]
    }
  },
  
  instagram: {
    url: 'https://www.instagram.com/accounts/emailsignup/',
    name: 'Instagram',
    requiresPhone: true,
    requiresSms: true,
    maxRetries: 3,
    timeout: 300000,
    selectors: {
      phoneInput: [
        'input[name="tel"]',
        'input[type="tel"]',
        'input[placeholder*="phone" i]',
        'input[aria-label*="phone" i]'
      ],
      codeInput: [
        'input[name="verificationCode"]',
        'input[type="text"][maxlength="6"]',
        'input[placeholder*="code" i]'
      ],
      submitBtn: [
        'button[type="submit"]',
        'button:has-text("Next")',
        'button:has-text("Continue")'
      ],
      successIndicator: [
        '[href*="/accounts/edit"]',
        '[data-testid="user-avatar"]',
        'svg[aria-label="Home"]'
      ],
      errorIndicator: [
        '[class*="error"]',
        '#slfErrorAlert'
      ]
    }
  },
  
  tiktok: {
    url: 'https://www.tiktok.com/signup/phone',
    name: 'TikTok',
    requiresPhone: true,
    requiresSms: true,
    maxRetries: 3,
    timeout: 300000,
    selectors: {
      phoneInput: [
        'input[type="tel"]',
        'input[name="mobile"]',
        'input[placeholder*="phone" i]'
      ],
      codeInput: [
        'input[name="verify_code"]',
        'input[type="text"][maxlength="6"]'
      ],
      submitBtn: [
        'button[type="submit"]',
        'button:has-text("Send code")',
        'button:has-text("Next")'
      ],
      successIndicator: [
        '[data-e2e="profile-icon"]',
        '[class*="Avatar"]'
      ],
      errorIndicator: [
        '[class*="error"]'
      ]
    }
  },
  
  whatsapp: {
    url: 'https://web.whatsapp.com/',
    name: 'WhatsApp',
    requiresPhone: false,
    requiresSms: true,
    maxRetries: 3,
    timeout: 300000,
    selectors: {
      codeInput: [
        'input[type="text"][maxlength="6"]',
        'input[placeholder*="code" i]'
      ],
      submitBtn: [
        'button[type="submit"]',
        'button:has-text("Next")'
      ],
      successIndicator: [
        '[data-testid="chat-list"]',
        '#side',
        'canvas'
      ],
      errorIndicator: [
        '[class*="error"]'
      ]
    }
  },
  
  discord: {
    url: 'https://discord.com/register',
    name: 'Discord',
    requiresPhone: false,
    requiresSms: true,
    maxRetries: 3,
    timeout: 180000,
    selectors: {
      emailInput: [
        'input[type="email"]',
        'input[name="email"]'
      ],
      usernameInput: [
        'input[name="username"]',
        'input[placeholder*="username" i]'
      ],
      passwordInput: [
        'input[name="password"]',
        'input[type="password"]'
      ],
      phoneInput: [
        'input[name="phone"]',
        'input[type="tel"]'
      ],
      codeInput: [
        'input[name="verification_code"]',
        'input[type="text"][maxlength="6"]'
      ],
      submitBtn: [
        'button[type="submit"]',
        'button:has-text("Continue")'
      ],
      successIndicator: [
        '[class*="guilds"]',
        '[class*="channels"]',
        '.wrapper-1BJsBx'
      ],
      errorIndicator: [
        '[class*="error"]'
      ]
    }
  }
}

// Random user agents
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

export interface RegistrationParams {
  platform: Platform
  phoneNumber: string
  deviceId: string
  profile?: {
    username?: string
    password?: string
    email?: string
    firstName?: string
    lastName?: string
  }
}

export interface RegistrationResult {
  success: boolean
  error?: string
  username?: string
  code?: string
  stage?: string
  requiresManualAction?: boolean
  manualActionType?: 'captcha' | 'sms' | 'email' | 'other'
}

/**
 * Run complete registration process
 */
export async function runRegistration(params: RegistrationParams): Promise<RegistrationResult> {
  const { platform, phoneNumber, deviceId, profile } = params
  
  logger.info(`Starting ${platform} registration`, { phoneNumber, deviceId })
  
  // Emit start event
  registrationEvents.emit('registration_start', { platform, phoneNumber })
  
  const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS]
  
  if (!config) {
    return {
      success: false,
      error: `Platform ${platform} is not supported for automatic registration`
    }
  }
  
  // Start SMS monitoring
  await startSmsMonitoring(deviceId)
  
  let browser: Browser | null = null
  let context: BrowserContext | null = null
  let page: Page | null = null
  
  try {
    // Stage 1: Launch browser
    registrationEvents.emit('registration_progress', { platform, stage: 'launching_browser' })
    logger.info(`[${platform}] Launching browser...`)
    
    const launchResult = await launchStealthBrowser(platform)
    browser = launchResult.browser
    context = launchResult.context
    page = launchResult.page
    
    // Stage 2: Navigate to registration page
    registrationEvents.emit('registration_progress', { platform, stage: 'navigating' })
    logger.info(`[${platform}] Navigating to ${config.url}...`)
    
    const navigated = await navigateToRegistration(page, config)
    if (!navigated) {
      throw new Error('Failed to navigate to registration page')
    }
    
    // Stage 3: Enter phone number (if required)
    if (config.requiresPhone && phoneNumber) {
      registrationEvents.emit('registration_progress', { platform, stage: 'entering_phone' })
      logger.info(`[${platform}] Entering phone number...`)
      
      const phoneEntered = await enterPhoneNumber(page, config, phoneNumber)
      if (!phoneEntered) {
        throw new Error('Failed to enter phone number')
      }
      
      // Click submit
      await clickSubmit(page, config)
      
      // Wait a bit for SMS to be sent
      await delay(2000)
    }
    
    // Stage 4: Wait for and enter SMS code
    if (config.requiresSms) {
      registrationEvents.emit('registration_progress', { platform, stage: 'waiting_sms' })
      logger.info(`[${platform}] Waiting for SMS verification code...`)
      
      const code = await waitForVerificationCode({
        deviceId,
        platform,
        timeout: 180000
      })
      
      if (!code) {
        throw new Error('SMS verification code not received')
      }
      
      logger.info(`[${platform}] Received code: ${code.code}`)
      
      // Enter the code
      registrationEvents.emit('registration_progress', { platform, stage: 'entering_code' })
      const codeEntered = await enterVerificationCode(page, config, code.code)
      if (!codeEntered) {
        throw new Error('Failed to enter verification code')
      }
      
      // Click submit
      await clickSubmit(page, config)
    }
    
    // Stage 5: Complete profile (if provided)
    if (profile) {
      registrationEvents.emit('registration_progress', { platform, stage: 'completing_profile' })
      logger.info(`[${platform}] Completing profile...`)
      
      await completeProfile(page, config, profile)
    }
    
    // Stage 6: Verify success
    registrationEvents.emit('registration_progress', { platform, stage: 'verifying' })
    const success = await verifySuccess(page, config)
    
    if (success) {
      logger.info(`[${platform}] Registration successful!`)
      registrationEvents.emit('registration_complete', { platform, phoneNumber, success: true })
      
      return {
        success: true,
        username: profile?.username,
        stage: 'completed'
      }
    } else {
      // Check for captcha
      const hasCaptcha = await checkForCaptcha(page)
      if (hasCaptcha) {
        logger.warn(`[${platform}] Captcha detected`)
        return {
          success: false,
          error: 'Captcha detected - manual intervention required',
          requiresManualAction: true,
          manualActionType: 'captcha',
          stage: 'captcha'
        }
      }
      
      throw new Error('Could not verify successful registration')
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`[${platform}] Registration failed: ${errorMsg}`)
    
    registrationEvents.emit('registration_complete', { 
      platform, 
      phoneNumber, 
      success: false, 
      error: errorMsg 
    })
    
    return {
      success: false,
      error: errorMsg,
      stage: 'failed'
    }
    
  } finally {
    // Clean up
    if (page) await page.close().catch(() => {})
    if (context) await context.close().catch(() => {})
    if (browser) await browser.close().catch(() => {})
  }
}

/**
 * Launch browser with stealth configuration
 */
async function launchStealthBrowser(platform: string): Promise<{
  browser: Browser
  context: BrowserContext
  page: Page
}> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  
  logger.debug(`Using user agent: ${userAgent.substring(0, 50)}...`)
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-first-run',
      '--no-zygote',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images'
    ],
    timeout: 60000
  })
  
  const context = await browser.newContext({
    userAgent,
    viewport: { width: 1280 + Math.floor(Math.random() * 200), height: 800 + Math.floor(Math.random() * 100) },
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    }
  })
  
  // Inject stealth scripts
  await context.addInitScript(() => {
    // Override webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    
    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' }
      ]
    })
    
    // Override languages
    Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en'] })
    
    // Override permissions
    const originalQuery = window.navigator.permissions.query
    // @ts-expect-error - permissions override
    window.navigator.permissions.query = (parameters: PermissionDescriptor) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: 'granted' } as PermissionStatus) :
        originalQuery(parameters)
    )
    
    // Chrome runtime mock
    // @ts-expect-error - chrome runtime override
    window.chrome = { runtime: {} }
    
    // WebGL override
    const getParameter = WebGLRenderingContext.prototype.getParameter
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Google Inc. (NVIDIA)'
      if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11)'
      return getParameter.apply(this, [parameter])
    }
    
    // Canvas randomization
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
    HTMLCanvasElement.prototype.toDataURL = function(type?: string) {
      const context = this.getContext('2d')
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height)
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i] ^ (Math.random() * 2)
        }
        context.putImageData(imageData, 0, 0)
      }
      return originalToDataURL.apply(this, [type])
    }
  })
  
  const page = await context.newPage()
  
  return { browser, context, page }
}

/**
 * Navigate to registration page
 */
async function navigateToRegistration(page: Page, config: typeof PLATFORM_CONFIGS.telegram): Promise<boolean> {
  const urls = [config.url]
  if (config.alternativeUrl) {
    urls.push(config.alternativeUrl)
  }
  
  for (const url of urls) {
    for (const waitStrategy of ['domcontentloaded', 'load', 'commit']) {
      try {
        logger.info(`[${config.name}] Navigating to ${url} (wait: ${waitStrategy})...`)
        
        // Set default timeout for this page
        page.setDefaultTimeout(90000)
        page.setDefaultNavigationTimeout(90000)
        
        const response = await page.goto(url, {
          waitUntil: waitStrategy as 'domcontentloaded' | 'load' | 'commit',
          timeout: 90000
        })
        
        // Check response
        if (response && response.ok()) {
          logger.info(`[${config.name}] Page loaded successfully: ${response.status()}`)
        } else if (response) {
          logger.warn(`[${config.name}] Page loaded with status: ${response.status()}`)
        }
        
        // Wait for initial content
        await delay(2000)
        
        // Check if page loaded
        const title = await page.title()
        logger.debug(`Page title: ${title}`)
        
        // Check for Cloudflare
        const content = await page.content()
        if (content.includes('Cloudflare') && content.includes('challenge')) {
          logger.info('Cloudflare challenge detected, waiting...')
          await delay(10000)
          
          // Check if challenge resolved
          const newContent = await page.content()
          if (!newContent.includes('Cloudflare') || !newContent.includes('challenge')) {
            logger.info('Cloudflare challenge passed')
          }
        }
        
        return true
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        logger.warn(`Navigation to ${url} with ${waitStrategy} failed: ${errorMsg}`)
        
        // If this was the last strategy for this URL, try next URL
        if (waitStrategy === 'commit') {
          continue
        }
      }
    }
  }
  
  // All attempts failed
  logger.error('All navigation attempts failed')
  return false
}

/**
 * Enter phone number
 */
async function enterPhoneNumber(
  page: Page, 
  config: typeof PLATFORM_CONFIGS.telegram, 
  phoneNumber: string
): Promise<boolean> {
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
  
  for (const selector of config.selectors.phoneInput) {
    try {
      const element = await page.waitForSelector(selector, { timeout: 5000, state: 'visible' })
      if (element) {
        await element.click()
        await delay(200)
        await element.fill('')
        await delay(100)
        
        // Human-like typing
        for (const char of formattedPhone) {
          await element.press(char, { delay: 50 + Math.random() * 50 })
        }
        
        logger.info(`Phone number entered using selector: ${selector}`)
        return true
      }
    } catch {
      continue
    }
  }
  
  logger.error('Could not find phone input field')
  return false
}

/**
 * Enter verification code
 */
async function enterVerificationCode(
  page: Page,
  config: typeof PLATFORM_CONFIGS.telegram,
  code: string
): Promise<boolean> {
  for (const selector of config.selectors.codeInput) {
    try {
      const element = await page.$(selector)
      if (element) {
        await element.click()
        await delay(200)
        
        // Human-like typing
        for (const char of code) {
          await element.press(char, { delay: 80 + Math.random() * 40 })
        }
        
        logger.info(`Verification code entered using selector: ${selector}`)
        return true
      }
    } catch {
      continue
    }
  }
  
  return false
}

/**
 * Click submit button
 */
async function clickSubmit(page: Page, config: typeof PLATFORM_CONFIGS.telegram): Promise<void> {
  await delay(1000)
  
  for (const selector of config.selectors.submitBtn) {
    try {
      const element = await page.$(selector)
      if (element) {
        await element.click()
        await delay(2000)
        return
      }
    } catch {
      continue
    }
  }
  
  // Try pressing Enter
  await page.keyboard.press('Enter')
  await delay(2000)
}

/**
 * Complete profile setup
 */
async function completeProfile(
  page: Page,
  config: typeof PLATFORM_CONFIGS.telegram,
  profile: NonNullable<RegistrationParams['profile']>
): Promise<void> {
  // Implementation depends on platform
  logger.debug('Profile completion not implemented for this platform')
}

/**
 * Verify successful registration
 */
async function verifySuccess(page: Page, config: typeof PLATFORM_CONFIGS.telegram): Promise<boolean> {
  // Check success indicators
  for (const selector of config.selectors.successIndicator) {
    try {
      const element = await page.$(selector)
      if (element) {
        logger.info(`Success indicator found: ${selector}`)
        return true
      }
    } catch {
      continue
    }
  }
  
  // Check error indicators
  for (const selector of config.selectors.errorIndicator) {
    try {
      const element = await page.$(selector)
      if (element) {
        const text = await element.textContent()
        logger.warn(`Error indicator found: ${text}`)
        return false
      }
    } catch {
      continue
    }
  }
  
  return false
}

/**
 * Check for captcha
 */
async function checkForCaptcha(page: Page): Promise<boolean> {
  const captchaSelectors = [
    'iframe[src*="recaptcha"]',
    'iframe[src*="hcaptcha"]',
    'iframe[src*="arkose"]',
    '[class*="captcha"]',
    '#captcha',
    '.g-recaptcha',
    '.h-captcha'
  ]
  
  for (const selector of captchaSelectors) {
    try {
      const element = await page.$(selector)
      if (element) {
        return true
      }
    } catch {
      continue
    }
  }
  
  return false
}

/**
 * Delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Subscribe to registration events
 */
export function onRegistrationEvent(
  event: 'registration_start' | 'registration_progress' | 'registration_complete',
  callback: (data: unknown) => void
): () => void {
  registrationEvents.on(event, callback)
  return () => registrationEvents.off(event, callback)
}

export default {
  runRegistration,
  onRegistrationEvent,
  PLATFORM_CONFIGS
}

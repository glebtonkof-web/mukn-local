/**
 * Enhanced Registration Automation
 * Full-featured registration with captcha solving, error handling, and recovery
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { EventEmitter } from 'events'
import { logger } from '@/lib/logger'
import { db } from '@/lib/db'
import { 
  startSmsMonitoring, 
  waitForVerificationCode, 
  readRecentSms 
} from './improved-sms-reader'
import { 
  getBestProxyForPlatform, 
  getWorkingProxies, 
  type ProxyInfo 
} from './proxy-manager'
import type { Platform } from './session-manager'
import {
  emitRegistrationStarted,
  emitRegistrationProgress,
  emitRegistrationCompleted,
  emitRegistrationError,
  emitCaptchaDetected,
  emitCaptchaSolved,
  emitSmsReceived,
  emitProxyChange,
  emitBrowserLaunched,
  emitPageLoaded,
  REGISTRATION_EVENTS
} from './registration-events'
import {
  initCaptchaSolver,
  getCaptchaSolver,
  solveRecaptchaV2,
  solveHCaptcha,
  solveTurnstile,
  type CaptchaSolverConfig
} from '@/lib/captcha-solver'

// Platform configurations with enhanced selectors
const PLATFORM_CONFIGS = {
  telegram: {
    url: 'https://web.telegram.org/a/',
    alternativeUrl: 'https://web.telegram.org/k/',
    name: 'Telegram',
    requiresPhone: true,
    requiresSms: true,
    maxRetries: 3,
    timeout: 180000,
    captchaTypes: [] as string[],
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
      ],
      captchaIframe: []
    }
  },
  
  instagram: {
    url: 'https://www.instagram.com/accounts/emailsignup/',
    name: 'Instagram',
    requiresPhone: true,
    requiresSms: true,
    maxRetries: 3,
    timeout: 300000,
    captchaTypes: ['recaptcha', 'hcaptcha'],
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
      ],
      captchaIframe: [
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]'
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
    captchaTypes: ['recaptcha', 'turnstile'],
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
      ],
      captchaIframe: [
        'iframe[src*="recaptcha"]',
        'iframe[src*="turnstile"]'
      ]
    }
  },
  
  twitter: {
    url: 'https://twitter.com/i/flow/signup',
    name: 'Twitter/X',
    requiresPhone: true,
    requiresSms: true,
    maxRetries: 3,
    timeout: 300000,
    captchaTypes: ['recaptcha', 'turnstile', 'arkose'],
    selectors: {
      phoneInput: [
        'input[name="phone_number"]',
        'input[type="tel"]',
        'input[data-testid="ocfEnterTextTextInput"]'
      ],
      codeInput: [
        'input[name="verif_code"]',
        'input[data-testid="ocfEnterTextTextInput"]',
        'input[type="text"][maxlength="6"]'
      ],
      submitBtn: [
        'button[type="submit"]',
        'button[data-testid="ocfEnterTextNextButton"]',
        'button:has-text("Next")'
      ],
      successIndicator: [
        '[data-testid="AppTabBar_Home_Link"]',
        '[data-testid="SideNav_AccountSwitcher_Button"]'
      ],
      errorIndicator: [
        '[class*="error"]',
        '[data-testid="ocfErrorAlert"]'
      ],
      captchaIframe: [
        'iframe[src*="arkose"]',
        'iframe[src*="recaptcha"]',
        'iframe[src*="turnstile"]'
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
    captchaTypes: ['hcaptcha'],
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
      ],
      captchaIframe: [
        'iframe[src*="hcaptcha"]'
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
    captchaTypes: [],
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
      ],
      captchaIframe: []
    }
  }
}

// User agents pool
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
]

export interface EnhancedRegistrationParams {
  platform: Platform
  phoneNumber: string
  deviceId: string
  jobId: string
  profile?: {
    username?: string
    password?: string
    email?: string
    firstName?: string
    lastName?: string
  }
  captchaConfig?: CaptchaSolverConfig
  maxRetries?: number
  timeout?: number
}

export interface EnhancedRegistrationResult {
  success: boolean
  error?: string
  username?: string
  accountId?: string
  code?: string
  stage?: string
  requiresManualAction?: boolean
  manualActionType?: 'captcha' | 'sms' | 'email' | 'other'
  duration: number
  retryCount: number
}

// Active jobs tracking
const activeJobs = new Map<string, {
  platform: string
  status: string
  startTime: number
  browser?: Browser
  page?: Page
}>()

/**
 * Initialize captcha solver with environment config
 */
function initializeCaptchaSolver(config?: CaptchaSolverConfig): void {
  if (getCaptchaSolver()) return
  
  // Try to get config from environment
  const provider = (process.env.CAPTCHA_PROVIDER as CaptchaSolverConfig['provider']) || '2captcha'
  const apiKey = process.env.CAPTCHA_API_KEY || config?.apiKey
  
  if (apiKey) {
    initCaptchaSolver({
      provider,
      apiKey,
      timeout: 120000,
      pollingInterval: 3000,
      ...config
    })
    logger.info(`[EnhancedRegistration] Captcha solver initialized: ${provider}`)
  } else {
    logger.warn('[EnhancedRegistration] No captcha API key configured')
  }
}

/**
 * Run enhanced registration with full error handling and recovery
 */
export async function runEnhancedRegistration(
  params: EnhancedRegistrationParams
): Promise<EnhancedRegistrationResult> {
  const { platform, phoneNumber, deviceId, jobId, profile, maxRetries = 3, timeout = 180000 } = params
  const startTime = Date.now()
  
  // Initialize captcha solver
  initializeCaptchaSolver(params.captchaConfig)
  
  const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS]
  
  if (!config) {
    return {
      success: false,
      error: `Platform ${platform} is not supported`,
      duration: Date.now() - startTime,
      retryCount: 0
    }
  }
  
  // Emit started event
  emitRegistrationStarted({
    jobId,
    platform,
    phoneNumber,
    deviceId,
    timestamp: new Date()
  })
  
  // Track job
  activeJobs.set(jobId, {
    platform,
    status: 'starting',
    startTime
  })
  
  let browser: Browser | null = null
  let page: Page | null = null
  let usedProxy: ProxyInfo | null = null
  
  try {
    // Stage 1: Launch browser
    emitRegistrationProgress({
      jobId,
      platform,
      stage: 'launching_browser',
      message: 'Запуск браузера...',
      percent: 5,
      timestamp: new Date()
    })
    
    const launchResult = await launchStealthBrowser(platform, jobId)
    browser = launchResult.browser
    page = launchResult.page
    usedProxy = launchResult.proxy
    
    activeJobs.set(jobId, {
      ...activeJobs.get(jobId)!,
      status: 'browser_launched',
      browser,
      page
    })
    
    emitBrowserLaunched({
      jobId,
      platform,
      proxy: usedProxy ? `${usedProxy.host}:${usedProxy.port}` : undefined
    })
    
    // Stage 2: Navigate
    emitRegistrationProgress({
      jobId,
      platform,
      stage: 'navigating',
      message: 'Загрузка страницы регистрации...',
      percent: 15,
      timestamp: new Date()
    })
    
    const navigated = await navigateToRegistration(page, config, jobId)
    if (!navigated) {
      throw new Error('Не удалось загрузить страницу регистрации')
    }
    
    // Stage 3: Check for captcha before phone input
    const preCaptcha = await detectAndSolveCaptcha(page, platform, jobId, config.url)
    if (preCaptcha.detected && !preCaptcha.solved) {
      throw new Error('Не удалось решить captcha')
    }
    
    // Stage 4: Enter phone number
    if (config.requiresPhone && phoneNumber) {
      emitRegistrationProgress({
        jobId,
        platform,
        stage: 'entering_phone',
        message: 'Ввод номера телефона...',
        percent: 25,
        timestamp: new Date()
      })
      
      const phoneEntered = await enterPhoneNumber(page, config, phoneNumber)
      if (!phoneEntered) {
        throw new Error('Не удалось ввести номер телефона')
      }
      
      // Click submit
      await clickSubmit(page, config)
      
      // Wait for SMS to be sent
      await delay(2000)
    }
    
    // Stage 5: Check for captcha after phone submit
    const postPhoneCaptcha = await detectAndSolveCaptcha(page, platform, jobId, config.url)
    if (postPhoneCaptcha.detected && !postPhoneCaptcha.solved) {
      throw new Error('Не удалось решить captcha после ввода телефона')
    }
    
    // Stage 6: Wait for SMS and enter code
    if (config.requiresSms) {
      emitRegistrationProgress({
        jobId,
        platform,
        stage: 'waiting_sms',
        message: 'Ожидание SMS с кодом...',
        percent: 40,
        timestamp: new Date()
      })
      
      // Start SMS monitoring
      await startSmsMonitoring(deviceId)
      
      const code = await waitForVerificationCode({
        deviceId,
        platform,
        timeout: 180000
      })
      
      if (!code) {
        throw new Error('SMS код не получен')
      }
      
      // Emit SMS received event
      emitSmsReceived({
        jobId,
        platform,
        code: code.code,
        sender: code.sender || platform,
        timestamp: new Date()
      })
      
      emitRegistrationProgress({
        jobId,
        platform,
        stage: 'entering_code',
        message: 'Ввод кода подтверждения...',
        percent: 60,
        timestamp: new Date()
      })
      
      const codeEntered = await enterVerificationCode(page, config, code.code)
      if (!codeEntered) {
        throw new Error('Не удалось ввести код подтверждения')
      }
      
      // Click submit
      await clickSubmit(page, config)
    }
    
    // Stage 7: Check for captcha after code
    const postCodeCaptcha = await detectAndSolveCaptcha(page, platform, jobId, config.url)
    if (postCodeCaptcha.detected && !postCodeCaptcha.solved) {
      throw new Error('Не удалось решить captcha после ввода кода')
    }
    
    // Stage 8: Complete profile if provided
    if (profile) {
      emitRegistrationProgress({
        jobId,
        platform,
        stage: 'completing_profile',
        message: 'Заполнение профиля...',
        percent: 75,
        timestamp: new Date()
      })
      
      await completeProfile(page, config, profile)
    }
    
    // Stage 9: Verify success
    emitRegistrationProgress({
      jobId,
      platform,
      stage: 'verifying',
      message: 'Проверка регистрации...',
      percent: 90,
      timestamp: new Date()
    })
    
    const success = await verifySuccess(page, config)
    
    if (success) {
      // Save account to database
      const accountId = await saveAccountToDatabase({
        platform,
        phoneNumber,
        username: profile?.username,
        deviceId,
        jobId
      })
      
      const duration = Date.now() - startTime
      
      emitRegistrationCompleted({
        jobId,
        platform,
        phoneNumber,
        success: true,
        username: profile?.username,
        accountId,
        duration,
        timestamp: new Date()
      })
      
      emitRegistrationProgress({
        jobId,
        platform,
        stage: 'completed',
        message: 'Регистрация успешно завершена!',
        percent: 100,
        timestamp: new Date()
      })
      
      return {
        success: true,
        username: profile?.username,
        accountId,
        duration,
        retryCount: 0
      }
    } else {
      // Check for any remaining captcha
      const finalCaptcha = await detectAndSolveCaptcha(page, platform, jobId, config.url)
      if (finalCaptcha.detected) {
        return {
          success: false,
          error: 'Требуется решение captcha',
          requiresManualAction: true,
          manualActionType: 'captcha',
          stage: 'captcha',
          duration: Date.now() - startTime,
          retryCount: 0
        }
      }
      
      throw new Error('Не удалось подтвердить успешную регистрацию')
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка'
    const duration = Date.now() - startTime
    
    logger.error(`[EnhancedRegistration] Registration failed: ${errorMsg}`)
    
    emitRegistrationError({
      jobId,
      platform,
      error: errorMsg,
      retryCount: 0,
      maxRetries,
      willRetry: false,
      timestamp: new Date()
    })
    
    emitRegistrationCompleted({
      jobId,
      platform,
      phoneNumber,
      success: false,
      error: errorMsg,
      duration,
      timestamp: new Date()
    })
    
    return {
      success: false,
      error: errorMsg,
      stage: 'failed',
      duration,
      retryCount: 0
    }
    
  } finally {
    // Cleanup
    activeJobs.delete(jobId)
    
    if (page) await page.close().catch(() => {})
    if (browser) await browser.close().catch(() => {})
  }
}

/**
 * Launch stealth browser
 */
async function launchStealthBrowser(
  platform: string,
  jobId: string
): Promise<{
  browser: Browser
  page: Page
  proxy: ProxyInfo | null
}> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  
  // Get proxy
  let proxy: ProxyInfo | null = null
  try {
    proxy = await getBestProxyForPlatform(platform)
    if (proxy) {
      logger.info(`[EnhancedRegistration] Using proxy: ${proxy.host}:${proxy.port}`)
    }
  } catch (e) {
    logger.warn('[EnhancedRegistration] No proxy available, using direct connection')
  }
  
  const launchOptions: Parameters<typeof chromium.launch>[0] = {
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
      '--disable-plugins'
    ],
    timeout: 60000
  }
  
  if (proxy) {
    launchOptions.proxy = {
      server: `${proxy.protocol}://${proxy.host}:${proxy.port}`
    }
  }
  
  const browser = await chromium.launch(launchOptions)
  
  const contextOptions: Parameters<typeof browser.newContext>[0] = {
    userAgent,
    viewport: { 
      width: 1280 + Math.floor(Math.random() * 200), 
      height: 800 + Math.floor(Math.random() * 100) 
    },
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
  }
  
  const context = await browser.newContext(contextOptions)
  
  // Inject stealth scripts
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' }
      ]
    })
    Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en'] })
    
    // @ts-expect-error - chrome runtime override
    window.chrome = { runtime: {} }
    
    // WebGL override
    const getParameter = WebGLRenderingContext.prototype.getParameter
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Google Inc. (NVIDIA)'
      if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11)'
      return getParameter.apply(this, [parameter])
    }
  })
  
  const page = await context.newPage()
  
  return { browser, page, proxy }
}

/**
 * Navigate to registration page
 */
async function navigateToRegistration(
  page: Page, 
  config: typeof PLATFORM_CONFIGS[keyof typeof PLATFORM_CONFIGS],
  jobId: string
): Promise<boolean> {
  const urls = [config.url]
  if (config.alternativeUrl) {
    urls.push(config.alternativeUrl)
  }
  
  for (const url of urls) {
    try {
      page.setDefaultTimeout(90000)
      page.setDefaultNavigationTimeout(90000)
      
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 90000
      })
      
      await delay(2000)
      
      // Check for Cloudflare
      const content = await page.content()
      if (content.includes('Cloudflare') && content.includes('challenge')) {
        logger.info('[EnhancedRegistration] Cloudflare challenge detected, waiting...')
        await delay(10000)
      }
      
      // Emit page loaded event
      const title = await page.title()
      emitPageLoaded({
        jobId,
        platform: config.name,
        url,
        title
      })
      
      return true
      
    } catch (error) {
      logger.warn(`[EnhancedRegistration] Navigation failed: ${error}`)
      continue
    }
  }
  
  return false
}

/**
 * Detect and solve captcha
 */
async function detectAndSolveCaptcha(
  page: Page,
  platform: string,
  jobId: string,
  pageUrl: string
): Promise<{ detected: boolean; solved: boolean; type?: string }> {
  const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS]
  if (!config?.selectors.captchaIframe?.length) {
    return { detected: false, solved: true }
  }
  
  // Check for captcha iframes
  for (const selector of config.selectors.captchaIframe) {
    try {
      const iframe = await page.$(selector)
      if (!iframe) continue
      
      // Determine captcha type
      const src = await iframe.getAttribute('src') || ''
      let captchaType = 'unknown'
      
      if (src.includes('recaptcha')) captchaType = 'recaptcha'
      else if (src.includes('hcaptcha')) captchaType = 'hcaptcha'
      else if (src.includes('turnstile')) captchaType = 'turnstile'
      else if (src.includes('arkose')) captchaType = 'arkose'
      
      logger.info(`[EnhancedRegistration] Captcha detected: ${captchaType}`)
      
      emitCaptchaDetected({
        jobId,
        platform,
        captchaType: captchaType as 'recaptcha' | 'hcaptcha' | 'arkose' | 'image' | 'unknown',
        solveAttempts: 0,
        timestamp: new Date()
      })
      
      // Try to solve
      const solver = getCaptchaSolver()
      if (!solver) {
        logger.warn('[EnhancedRegistration] No captcha solver configured')
        return { detected: true, solved: false, type: captchaType }
      }
      
      // Get site key
      const siteKey = await extractSiteKey(page, captchaType)
      if (!siteKey) {
        logger.warn('[EnhancedRegistration] Could not extract site key')
        return { detected: true, solved: false, type: captchaType }
      }
      
      const solveStart = Date.now()
      let solution: string | null = null
      
      try {
        if (captchaType === 'recaptcha') {
          solution = await solveRecaptchaV2(siteKey, pageUrl)
        } else if (captchaType === 'hcaptcha') {
          solution = await solveHCaptcha(siteKey, pageUrl)
        } else if (captchaType === 'turnstile') {
          solution = await solveTurnstile(siteKey, pageUrl)
        }
      } catch (solveError) {
        logger.error(`[EnhancedRegistration] Captcha solve failed: ${solveError}`)
        return { detected: true, solved: false, type: captchaType }
      }
      
      if (solution) {
        // Inject solution
        await injectCaptchaSolution(page, captchaType, solution)
        
        emitCaptchaSolved({
          jobId,
          platform,
          captchaType,
          solveTime: Date.now() - solveStart
        })
        
        return { detected: true, solved: true, type: captchaType }
      }
      
      return { detected: true, solved: false, type: captchaType }
      
    } catch (e) {
      continue
    }
  }
  
  return { detected: false, solved: true }
}

/**
 * Extract site key from page
 */
async function extractSiteKey(page: Page, captchaType: string): Promise<string | null> {
  try {
    if (captchaType === 'recaptcha') {
      const siteKey = await page.evaluate(() => {
        const elem = document.querySelector('[data-sitekey]') as HTMLElement
        return elem?.dataset?.sitekey || null
      })
      return siteKey
    }
    
    if (captchaType === 'hcaptcha') {
      const siteKey = await page.evaluate(() => {
        const elem = document.querySelector('.h-captcha') as HTMLElement
        return elem?.dataset?.sitekey || null
      })
      return siteKey
    }
    
    if (captchaType === 'turnstile') {
      const siteKey = await page.evaluate(() => {
        const elem = document.querySelector('[data-sitekey]') as HTMLElement
        return elem?.dataset?.sitekey || null
      })
      return siteKey
    }
  } catch {
    return null
  }
  
  return null
}

/**
 * Inject captcha solution into page
 */
async function injectCaptchaSolution(
  page: Page, 
  captchaType: string, 
  solution: string
): Promise<void> {
  if (captchaType === 'recaptcha') {
    await page.evaluate((token) => {
      // Try to find and set the response textarea
      const textarea = document.getElementById('g-recaptcha-response') as HTMLTextAreaElement
      if (textarea) {
        textarea.value = token
        textarea.innerHTML = token
      }
      
      // Trigger callback
      // @ts-expect-error - recaptcha callback
      if (window.___grecaptcha_cfg && window.___grecaptcha_cfg.clients) {
        // @ts-expect-error - recaptcha clients
        for (const client of Object.values(window.___grecaptcha_cfg.clients)) {
          if (client && typeof client === 'object') {
            const cb = (client as { callback?: () => void }).callback
            if (cb) cb()
          }
        }
      }
    }, solution)
  } else if (captchaType === 'hcaptcha') {
    await page.evaluate((token) => {
      const textarea = document.querySelector('[name="h-captcha-response"]') as HTMLTextAreaElement
      if (textarea) {
        textarea.value = token
      }
      
      // Trigger callback
      // @ts-expect-error - hcaptcha callback
      if (window.hcaptcha) {
        // @ts-expect-error - hcaptcha setResponse
        window.hcaptcha.setResponse?.(token)
      }
    }, solution)
  }
}

/**
 * Enter phone number
 */
async function enterPhoneNumber(
  page: Page,
  config: typeof PLATFORM_CONFIGS[keyof typeof PLATFORM_CONFIGS],
  phoneNumber: string
): Promise<boolean> {
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
  const selectors = config.selectors.phoneInput || []
  
  for (const selector of selectors) {
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
        
        return true
      }
    } catch {
      continue
    }
  }
  
  return false
}

/**
 * Enter verification code
 */
async function enterVerificationCode(
  page: Page,
  config: typeof PLATFORM_CONFIGS[keyof typeof PLATFORM_CONFIGS],
  code: string
): Promise<boolean> {
  for (const selector of config.selectors.codeInput) {
    try {
      const element = await page.$(selector)
      if (element) {
        await element.click()
        await delay(200)
        
        for (const char of code) {
          await element.press(char, { delay: 80 + Math.random() * 40 })
        }
        
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
async function clickSubmit(
  page: Page,
  config: typeof PLATFORM_CONFIGS[keyof typeof PLATFORM_CONFIGS]
): Promise<void> {
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
  
  // Try Enter key
  await page.keyboard.press('Enter')
  await delay(2000)
}

/**
 * Complete profile
 */
async function completeProfile(
  page: Page,
  config: typeof PLATFORM_CONFIGS[keyof typeof PLATFORM_CONFIGS],
  profile: NonNullable<EnhancedRegistrationParams['profile']>
): Promise<void> {
  // Implementation depends on platform
  logger.debug('[EnhancedRegistration] Profile completion not implemented for this platform')
}

/**
 * Verify success
 */
async function verifySuccess(
  page: Page,
  config: typeof PLATFORM_CONFIGS[keyof typeof PLATFORM_CONFIGS]
): Promise<boolean> {
  // Check success indicators
  for (const selector of config.selectors.successIndicator) {
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
 * Save account to database
 */
async function saveAccountToDatabase(params: {
  platform: string
  phoneNumber: string
  username?: string
  deviceId: string
  jobId: string
}): Promise<string> {
  try {
    const accountId = crypto.randomUUID()
    
    await db.simCardAccount.create({
      data: {
        id: accountId,
        simCardId: params.deviceId,
        jobId: params.jobId,
        platform: params.platform,
        phoneNumber: params.phoneNumber,
        username: params.username,
        status: 'registered',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    return accountId
  } catch (error) {
    logger.error('[EnhancedRegistration] Failed to save account:', error as Error)
    return ''
  }
}

/**
 * Delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get active jobs
 */
export function getActiveRegistrationJobs(): Array<{
  jobId: string
  platform: string
  status: string
  duration: number
}> {
  return Array.from(activeJobs.entries()).map(([jobId, data]) => ({
    jobId,
    platform: data.platform,
    status: data.status,
    duration: Date.now() - data.startTime
  }))
}

/**
 * Cancel registration job
 */
export async function cancelRegistrationJob(jobId: string): Promise<boolean> {
  const job = activeJobs.get(jobId)
  if (!job) return false
  
  try {
    if (job.page) await job.page.close().catch(() => {})
    if (job.browser) await job.browser.close().catch(() => {})
    activeJobs.delete(jobId)
    return true
  } catch {
    return false
  }
}

export default {
  runEnhancedRegistration,
  getActiveRegistrationJobs,
  cancelRegistrationJob,
  PLATFORM_CONFIGS
}

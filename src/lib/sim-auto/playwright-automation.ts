/**
 * Playwright Automation - Stealth Browser Automation for Account Registration
 * Provides browser automation with anti-detection features
 */

import { chromium, Browser, BrowserContext, Page, BrowserContextOptions } from 'playwright'
import type { Platform, PlatformSession } from './session-manager'
import { PLATFORM_REGISTRATION_URLS, sessionManager } from './session-manager'

// Profile data for account setup
export interface ProfileData {
  firstName: string
  lastName: string
  username?: string
  email?: string
  dateOfBirth?: {
    day: number
    month: number
    year: number
  }
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  bio?: string
  avatar?: string // Base64 or URL
  location?: string
  website?: string
}

// Proxy configuration
export interface ProxyConfig {
  type: 'http' | 'https' | 'socks4' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
}

// Browser fingerprint
export interface BrowserFingerprint {
  userAgent: string
  viewport: { width: number; height: number }
  screen: { width: number; height: number; devicePixelRatio: number }
  timezone: string
  locale: string
  platform: string
  webgl: { vendor: string; renderer: string }
  canvas?: string
  audioContext?: string
  fonts?: string[]
  hardwareConcurrency: number
  deviceMemory: number
}

// Stealth configuration
export interface StealthConfig {
  proxy?: ProxyConfig
  fingerprint?: Partial<BrowserFingerprint>
  userAgent?: string
  locale?: string
  timezone?: string
  viewport?: { width: number; height: number }
  blockAnalytics?: boolean
  disableWebRTC?: boolean
  disableNotifications?: boolean
}

// Registration result
export interface RegistrationResult {
  success: boolean
  accountId?: string
  username?: string
  session?: PlatformSession
  error?: string
  retryCount?: number
  requiresManualAction?: boolean
  manualActionType?: 'captcha' | 'sms_verification' | 'email_verification' | '2fa_setup'
}

// Default fingerprints by platform
const DEFAULT_FINGERPRINTS: Record<Platform, Partial<BrowserFingerprint>> = {
  telegram: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    timezone: 'Europe/Moscow',
    locale: 'ru-RU',
    hardwareConcurrency: 8,
    deviceMemory: 8
  },
  instagram: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    timezone: 'Europe/Moscow',
    locale: 'ru-RU',
    hardwareConcurrency: 6,
    deviceMemory: 4
  },
  tiktok: {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    viewport: { width: 360, height: 800 },
    timezone: 'Europe/Moscow',
    locale: 'ru-RU',
    hardwareConcurrency: 8,
    deviceMemory: 6
  },
  twitter: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    timezone: 'Europe/Moscow',
    locale: 'ru-RU',
    hardwareConcurrency: 8,
    deviceMemory: 8
  },
  youtube: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    timezone: 'Europe/Moscow',
    locale: 'ru-RU',
    hardwareConcurrency: 8,
    deviceMemory: 8
  },
  whatsapp: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    timezone: 'Europe/Moscow',
    locale: 'ru-RU',
    hardwareConcurrency: 8,
    deviceMemory: 8
  },
  viber: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    timezone: 'Europe/Moscow',
    locale: 'ru-RU',
    hardwareConcurrency: 8,
    deviceMemory: 8
  },
  signal: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    timezone: 'Europe/Moscow',
    locale: 'ru-RU',
    hardwareConcurrency: 8,
    deviceMemory: 8
  },
  discord: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    timezone: 'Europe/Moscow',
    locale: 'ru-RU',
    hardwareConcurrency: 8,
    deviceMemory: 8
  },
  reddit: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    timezone: 'Europe/Moscow',
    locale: 'ru-RU',
    hardwareConcurrency: 8,
    deviceMemory: 8
  }
}

/**
 * Playwright Automation class for stealth browser automation
 */
export class PlaywrightAutomation {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private platform: Platform
  private config: StealthConfig
  private fingerprint: BrowserFingerprint

  constructor(platform: Platform, config?: StealthConfig) {
    this.platform = platform
    this.config = config || {}
    this.fingerprint = this.generateFingerprint()
  }

  /**
   * Launch browser in stealth mode
   */
  async launchBrowser(): Promise<Browser> {
    try {
      const launchOptions = {
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--allow-running-insecure-content',
          '--disable-webgl',
          '--disable-canvas-aa', // Disable antialiasing for canvas
          '--disable-2d-canvas-clip-aa', // Disable canvas clip antialiasing
          '--disable-gl-drawing-for-tests',
          '--no-first-run',
          '--no-zygote',
          '--deterministic-fetch',
          '--disable-font-subpixel-positioning',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-component-extensions-with-background-pages',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images' // Optional: disable images for speed
        ].filter(Boolean),
        timeout: 60000
      }

      console.log(`[PlaywrightAutomation] Launching Chromium browser for ${this.platform}...`)
      this.browser = await chromium.launch(launchOptions)

      console.log(`[PlaywrightAutomation] Browser launched successfully for ${this.platform}`)

      return this.browser
    } catch (error) {
      console.error('[PlaywrightAutomation] Error launching browser:', error)
      throw new Error(`Failed to launch browser: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create stealth browser context
   */
  async createContext(): Promise<BrowserContext> {
    if (!this.browser) {
      await this.launchBrowser()
    }

    const contextOptions: BrowserContextOptions = {
      userAgent: this.fingerprint.userAgent,
      viewport: this.fingerprint.viewport,
      screen: this.fingerprint.screen,
      locale: this.fingerprint.locale,
      timezoneId: this.fingerprint.timezone,
      // Ignore HTTPS errors for some platforms
      ignoreHTTPSErrors: true,
      // Set permissions
      permissions: ['geolocation', 'notifications'],
      geolocation: { latitude: 55.7558, longitude: 37.6173 }, // Moscow coordinates
      // Extra HTTP headers
      extraHTTPHeaders: {
        'Accept-Language': `${this.fingerprint.locale},ru;q=0.9,en;q=0.8`,
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

    // Add proxy if configured
    if (this.config.proxy) {
      contextOptions.proxy = {
        server: `${this.config.proxy.type}://${this.config.proxy.host}:${this.config.proxy.port}`,
        username: this.config.proxy.username,
        password: this.config.proxy.password
      }
    }

    this.context = await this.browser!.newContext(contextOptions)

    // Inject stealth scripts
    await this.injectStealthScripts()

    return this.context
  }

  /**
   * Navigate to registration page
   */
  async navigateToRegistration(): Promise<Page> {
    if (!this.context) {
      await this.createContext()
    }

    this.page = await this.context!.newPage()

    // Add request interception to block tracking
    if (this.config.blockAnalytics !== false) {
      await this.blockTrackingRequests()
    }

    const url = PLATFORM_REGISTRATION_URLS[this.platform]
    console.log(`[PlaywrightAutomation] Navigating to: ${url}`)

    try {
      // Try with domcontentloaded first (faster)
      console.log(`[PlaywrightAutomation] Loading page (domcontentloaded)...`)
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      
      // Then wait for network to settle
      console.log(`[PlaywrightAutomation] Waiting for network idle...`)
      await this.page.waitForLoadState('networkidle', { timeout: 30000 })

      // Check if page loaded correctly
      const title = await this.page.title()
      console.log(`[PlaywrightAutomation] Page loaded: ${title}`)

      // Check for common error pages
      const content = await this.page.content()
      if (content.includes('404') && content.includes('Not Found')) {
        throw new Error('Page returned 404 Not Found')
      }
      if (content.includes('Access Denied') || content.includes('403')) {
        throw new Error('Access denied - possible IP block')
      }
      if (content.includes('Cloudflare') && content.includes('challenge')) {
        console.warn(`[PlaywrightAutomation] Cloudflare challenge detected`)
        // Wait for Cloudflare to resolve
        await this.page.waitForTimeout(10000)
      }

      console.log(`[PlaywrightAutomation] Successfully navigated to ${url}`)
      return this.page
      
    } catch (error) {
      console.error('[PlaywrightAutomation] Navigation error:', error)
      
      // Try to get more details
      if (this.page) {
        try {
          const screenshot = await this.page.screenshot({ fullPage: false })
          console.log(`[PlaywrightAutomation] Screenshot captured (${screenshot.length} bytes)`)
        } catch {
          // Ignore screenshot errors
        }
      }
      
      throw new Error(`Failed to navigate to registration page: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fill phone number field
   */
  async fillPhoneNumber(phoneNumber: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized. Call navigateToRegistration first.')
    }

    // Platform-specific phone number field selectors
    const selectors = this.getPhoneNumberSelectors()

    for (const selector of selectors) {
      try {
        const element = await this.page.waitForSelector(selector, { timeout: 5000 })
        if (element) {
          // Human-like typing
          await this.humanType(element, phoneNumber)
          console.log(`[PlaywrightAutomation] Phone number filled: ${phoneNumber}`)
          return
        }
      } catch {
        // Try next selector
        continue
      }
    }

    throw new Error('Could not find phone number input field')
  }

  /**
   * Handle SMS verification
   */
  async handleSmsVerification(code: string): Promise<boolean> {
    if (!this.page) {
      throw new Error('Page not initialized')
    }

    const selectors = this.getVerificationCodeSelectors()

    for (const selector of selectors) {
      try {
        const element = await this.page.waitForSelector(selector, { timeout: 5000 })
        if (element) {
          await this.humanType(element, code)

          // Find and click submit button
          const submitSelectors = this.getSubmitButtonSelectors()
          for (const submitSelector of submitSelectors) {
            try {
              const submitBtn = await this.page.$(submitSelector)
              if (submitBtn) {
                await this.humanClick(submitBtn)
                break
              }
            } catch {
              continue
            }
          }

          console.log(`[PlaywrightAutomation] SMS verification code entered: ${code}`)
          return true
        }
      } catch {
        continue
      }
    }

    return false
  }

  /**
   * Complete profile setup
   */
  async completeProfile(data: ProfileData): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized')
    }

    const profileSelectors = this.getProfileSelectors()

    // Fill name fields
    if (profileSelectors.firstName && data.firstName) {
      const firstNameInput = await this.page.$(profileSelectors.firstName)
      if (firstNameInput) {
        await this.humanType(firstNameInput, data.firstName)
      }
    }

    if (profileSelectors.lastName && data.lastName) {
      const lastNameInput = await this.page.$(profileSelectors.lastName)
      if (lastNameInput) {
        await this.humanType(lastNameInput, data.lastName)
      }
    }

    // Fill username
    if (profileSelectors.username && data.username) {
      const usernameInput = await this.page.$(profileSelectors.username)
      if (usernameInput) {
        await this.humanType(usernameInput, data.username)
      }
    }

    // Fill email
    if (profileSelectors.email && data.email) {
      const emailInput = await this.page.$(profileSelectors.email)
      if (emailInput) {
        await this.humanType(emailInput, data.email)
      }
    }

    // Fill date of birth
    if (profileSelectors.dateOfBirth && data.dateOfBirth) {
      await this.fillDateOfBirth(data.dateOfBirth)
    }

    // Fill bio
    if (profileSelectors.bio && data.bio) {
      const bioInput = await this.page.$(profileSelectors.bio)
      if (bioInput) {
        await this.humanType(bioInput, data.bio)
      }
    }

    // Upload avatar
    if (data.avatar && profileSelectors.avatar) {
      await this.uploadAvatar(data.avatar)
    }

    console.log('[PlaywrightAutomation] Profile completed')
  }

  /**
   * Save session/cookies
   */
  async saveSession(accountId: string): Promise<PlatformSession> {
    if (!this.context || !this.page) {
      throw new Error('Browser context not initialized')
    }

    // Get cookies
    const cookies = await this.context.cookies()

    // Get localStorage
    const localStorage = await this.page.evaluate(() => {
      const items: Record<string, string> = {}
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key) {
          items[key] = window.localStorage.getItem(key) || ''
        }
      }
      return items
    })

    // Get sessionStorage
    const sessionStorage = await this.page.evaluate(() => {
      const items: Record<string, string> = {}
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i)
        if (key) {
          items[key] = window.sessionStorage.getItem(key) || ''
        }
      }
      return items
    })

    const session: PlatformSession = {
      platform: this.platform,
      accountId,
      cookies: Object.fromEntries(cookies.map(c => [c.name, c.value])),
      localStorage,
      sessionStorage,
      fingerprint: {
        userAgent: this.fingerprint.userAgent,
        screenResolution: `${this.fingerprint.screen.width}x${this.fingerprint.screen.height}`,
        timezone: this.fingerprint.timezone,
        language: this.fingerprint.locale,
        webglRenderer: this.fingerprint.webgl.renderer
      },
      proxy: this.config.proxy ? {
        type: this.config.proxy.type,
        host: this.config.proxy.host,
        port: this.config.proxy.port,
        username: this.config.proxy.username,
        password: this.config.proxy.password
      } : undefined,
      createdAt: new Date()
    }

    await sessionManager.saveSession(accountId, session)

    console.log(`[PlaywrightAutomation] Session saved for account ${accountId}`)

    return session
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close()
      this.page = null
    }

    if (this.context) {
      await this.context.close()
      this.context = null
    }

    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }

    console.log('[PlaywrightAutomation] Browser closed')
  }

  /**
   * Get current page (for advanced usage)
   */
  getPage(): Page | null {
    return this.page
  }

  /**
   * Get browser context (for advanced usage)
   */
  getContext(): BrowserContext | null {
    return this.context
  }

  /**
   * Wait for selector with retry
   */
  async waitForSelector(selector: string, timeout: number = 30000): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized')
    }

    await this.page.waitForSelector(selector, { timeout })
  }

  /**
   * Click element with human-like behavior
   */
  async humanClick(element: import('playwright').ElementHandle<HTMLElement | SVGElement>): Promise<void> {
    // Random delay before click
    await this.randomDelay(100, 500)

    // Move to element with random offset
    const box = await element.boundingBox()
    if (box) {
      const x = box.x + Math.random() * box.width
      const y = box.y + Math.random() * box.height

      if (this.page) {
        await this.page.mouse.move(x, y, {
          steps: Math.floor(Math.random() * 10) + 5
        })
      }
    }

    await element.click({
      delay: Math.random() * 100 + 50,
      force: false
    })
  }

  /**
   * Type text with human-like behavior
   */
  async humanType(element: import('playwright').ElementHandle<HTMLElement | SVGElement>, text: string): Promise<void> {
    await element.focus()
    await this.randomDelay(50, 150)

    for (const char of text) {
      await element.press(char, {
        delay: Math.random() * 100 + 50
      })
    }
  }

  /**
   * Random delay
   */
  async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  // Private helper methods

  private generateFingerprint(): BrowserFingerprint {
    const defaults = DEFAULT_FINGERPRINTS[this.platform]
    const config = this.config.fingerprint || {}

    return {
      userAgent: config.userAgent || defaults.userAgent || this.getDefaultUserAgent(),
      viewport: config.viewport || defaults.viewport || { width: 1280, height: 800 },
      screen: {
        width: config.screen?.width || defaults.viewport?.width || 1920,
        height: config.screen?.height || defaults.viewport?.height || 1080,
        devicePixelRatio: config.screen?.devicePixelRatio || 1
      },
      timezone: config.timezone || defaults.timezone || 'Europe/Moscow',
      locale: config.locale || defaults.locale || 'ru-RU',
      platform: config.platform || 'Win32',
      webgl: config.webgl || {
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0)'
      },
      hardwareConcurrency: config.hardwareConcurrency || defaults.hardwareConcurrency || 8,
      deviceMemory: config.deviceMemory || defaults.deviceMemory || 8
    }
  }

  private getDefaultUserAgent(): string {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }

  private async injectStealthScripts(): Promise<void> {
    if (!this.context) return

    // Add init script to mask automation detection
    await this.context.addInitScript(() => {
      // Override navigator properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      })

      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ]
      })

      Object.defineProperty(navigator, 'languages', {
        get: () => ['ru-RU', 'ru', 'en']
      })

      // Override permissions
      const originalQuery = window.navigator.permissions.query
      window.navigator.permissions.query = (parameters: PermissionDescriptor) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: 'granted' } as PermissionStatus) :
          originalQuery(parameters)
      )

      // Mask automation in Chrome
      // @ts-expect-error - chrome runtime override
      window.chrome = {
        runtime: {}
      }

      // Override WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return 'Google Inc. (NVIDIA)'
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0)'
        }
        return getParameter.apply(this, [parameter])
      }

      // Randomize canvas fingerprint
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
      HTMLCanvasElement.prototype.toDataURL = function(type?: string) {
        // Add noise to canvas
        const context = this.getContext('2d')
        if (context) {
          const imageData = context.getImageData(0, 0, this.width, this.height)
          for (let i = 0; i < imageData.data.length; i += 4) {
            // Add subtle random noise
            imageData.data[i] = imageData.data[i] ^ (Math.random() * 2)
          }
          context.putImageData(imageData, 0, 0)
        }
        return originalToDataURL.apply(this, [type])
      }
    })
  }

  private async blockTrackingRequests(): Promise<void> {
    if (!this.page) return

    await this.page.route('**/*', (route) => {
      const url = route.request().url()
      const blockedDomains = [
        'google-analytics.com',
        'googletagmanager.com',
        'facebook.com/tr',
        'connect.facebook.net',
        'analytics.',
        'tracking.',
        'pixel.',
        'hotjar.com',
        'mouseflow.com',
        'clicktale.net',
        'fullstory.com',
        'luckyorange.com',
        'inspectlet.com'
      ]

      const shouldBlock = blockedDomains.some(domain => url.includes(domain))

      if (shouldBlock) {
        route.abort()
      } else {
        route.continue()
      }
    })
  }

  private getPhoneNumberSelectors(): string[] {
    const platformSelectors: Record<Platform, string[]> = {
      telegram: [
        'input[placeholder="Phone Number"]',
        'input[type="tel"]',
        'input[name="phone"]',
        '#sign-in-phone-number'
      ],
      instagram: [
        'input[name="phoneNumber"]',
        'input[type="tel"]',
        'input[placeholder*="phone"]'
      ],
      tiktok: [
        'input[type="tel"]',
        'input[name="mobile"]',
        'input[placeholder*="phone"]'
      ],
      twitter: [
        'input[name="phone_number"]',
        'input[type="tel"]',
        'input[data-testid="ocfEnterTextTextInput"]'
      ],
      youtube: [
        'input[type="tel"]',
        'input[name="phoneNumber"]',
        '#phoneNumberId'
      ],
      whatsapp: [
        'input[placeholder="Phone number"]',
        'input[type="tel"]'
      ],
      viber: [
        'input[type="tel"]',
        'input[name="phone"]'
      ],
      signal: [
        'input[type="tel"]',
        'input[name="phone"]'
      ],
      discord: [
        'input[type="tel"]',
        'input[name="phone"]'
      ],
      reddit: [
        'input[type="tel"]',
        'input[name="phoneNumber"]'
      ]
    }

    return platformSelectors[this.platform] || ['input[type="tel"]']
  }

  private getVerificationCodeSelectors(): string[] {
    const platformSelectors: Record<Platform, string[]> = {
      telegram: [
        'input[placeholder="Code"]',
        'input[name="code"]',
        '#sign-in-code'
      ],
      instagram: [
        'input[name="verificationCode"]',
        'input[placeholder*="code"]',
        'input[placeholder*="verification"]'
      ],
      tiktok: [
        'input[name="verify_code"]',
        'input[placeholder*="code"]'
      ],
      twitter: [
        'input[data-testid="ocfEnterTextTextInput"]',
        'input[name="verif_code"]'
      ],
      youtube: [
        'input[name="code"]',
        'input[type="text"][maxlength="6"]'
      ],
      whatsapp: [
        'input[placeholder*="code"]',
        'input[type="text"][maxlength="6"]'
      ],
      viber: [
        'input[name="code"]',
        'input[placeholder*="code"]'
      ],
      signal: [
        'input[name="code"]',
        'input[placeholder*="code"]'
      ],
      discord: [
        'input[name="verification_code"]',
        'input[placeholder*="code"]'
      ],
      reddit: [
        'input[name="otp"]',
        'input[placeholder*="code"]'
      ]
    }

    return platformSelectors[this.platform] || ['input[placeholder*="code"]']
  }

  private getSubmitButtonSelectors(): string[] {
    return [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("Continue")',
      'button:contains("Submit")',
      'button:contains("Verify")',
      'button:contains("Next")',
      '[data-testid="submit"]'
    ]
  }

  private getProfileSelectors(): Record<string, string> {
    const platformSelectors: Record<Platform, Record<string, string>> = {
      telegram: {
        firstName: 'input[name="first_name"]',
        lastName: 'input[name="last_name"]',
        username: 'input[name="username"]',
        bio: 'textarea[name="about"]',
        avatar: 'input[type="file"][accept*="image"]'
      },
      instagram: {
        firstName: 'input[name="first_name"]',
        lastName: 'input[name="last_name"]',
        username: 'input[name="username"]',
        email: 'input[name="email"]',
        bio: 'textarea[name="biography"]',
        avatar: 'input[type="file"]'
      },
      tiktok: {
        firstName: 'input[name="first_name"]',
        username: 'input[name="username"]',
        email: 'input[name="email"]',
        bio: 'textarea[name="signature"]',
        avatar: 'input[type="file"]'
      },
      twitter: {
        firstName: 'input[name="name"]',
        username: 'input[name="screen_name"]',
        email: 'input[name="email"]',
        bio: 'textarea[name="description"]',
        avatar: 'input[type="file"]'
      },
      youtube: {
        firstName: 'input[name="firstName"]',
        lastName: 'input[name="lastName"]',
        username: 'input[name="username"]',
        email: 'input[type="email"]',
        avatar: 'input[type="file"]'
      },
      whatsapp: {
        firstName: 'input[name="pushname"]',
        avatar: 'input[type="file"]'
      },
      viber: {
        firstName: 'input[name="first_name"]',
        lastName: 'input[name="last_name"]',
        avatar: 'input[type="file"]'
      },
      signal: {
        firstName: 'input[name="given_name"]',
        lastName: 'input[name="family_name"]',
        avatar: 'input[type="file"]'
      },
      discord: {
        username: 'input[name="username"]',
        email: 'input[type="email"]',
        avatar: 'input[type="file"]'
      },
      reddit: {
        username: 'input[name="username"]',
        email: 'input[name="email"]',
        avatar: 'input[type="file"]'
      }
    }

    return platformSelectors[this.platform] || {}
  }

  private async fillDateOfBirth(dob: { day: number; month: number; year: number }): Promise<void> {
    if (!this.page) return

    // Try different date picker formats
    const daySelectors = [
      'select[name="day"]',
      'select[name="birthday_day"]',
      'input[name="day"]',
      '#day'
    ]

    const monthSelectors = [
      'select[name="month"]',
      'select[name="birthday_month"]',
      'input[name="month"]',
      '#month'
    ]

    const yearSelectors = [
      'select[name="year"]',
      'select[name="birthday_year"]',
      'input[name="year"]',
      '#year'
    ]

    // Fill day
    for (const selector of daySelectors) {
      const element = await this.page.$(selector)
      if (element) {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase())
        if (tagName === 'select') {
          await element.selectOption(String(dob.day))
        } else {
          await this.humanType(element as import('playwright').ElementHandle<HTMLElement>, String(dob.day))
        }
        break
      }
    }

    // Fill month
    for (const selector of monthSelectors) {
      const element = await this.page.$(selector)
      if (element) {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase())
        if (tagName === 'select') {
          await element.selectOption(String(dob.month))
        } else {
          await this.humanType(element as import('playwright').ElementHandle<HTMLElement>, String(dob.month))
        }
        break
      }
    }

    // Fill year
    for (const selector of yearSelectors) {
      const element = await this.page.$(selector)
      if (element) {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase())
        if (tagName === 'select') {
          await element.selectOption(String(dob.year))
        } else {
          await this.humanType(element as import('playwright').ElementHandle<HTMLElement>, String(dob.year))
        }
        break
      }
    }
  }

  private async uploadAvatar(avatar: string): Promise<void> {
    if (!this.page) return

    const avatarSelector = this.getProfileSelectors().avatar
    if (!avatarSelector) return

    const fileInput = await this.page.$(avatarSelector)
    if (fileInput) {
      if (avatar.startsWith('data:')) {
        // Base64 image - convert to buffer
        const base64Data = avatar.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        await fileInput.setInputFiles({
          name: 'avatar.jpg',
          mimeType: 'image/jpeg',
          buffer
        })
      } else if (avatar.startsWith('http')) {
        // URL - download and upload
        const response = await fetch(avatar)
        const buffer = Buffer.from(await response.arrayBuffer())
        await fileInput.setInputFiles({
          name: 'avatar.jpg',
          mimeType: 'image/jpeg',
          buffer
        })
      }
    }
  }
}

// Export helper functions
export async function launchBrowser(platform: Platform, config?: StealthConfig): Promise<PlaywrightAutomation> {
  const automation = new PlaywrightAutomation(platform, config)
  await automation.launchBrowser()
  return automation
}

export async function navigateToRegistration(automation: PlaywrightAutomation): Promise<Page> {
  return automation.navigateToRegistration()
}

export async function fillPhoneNumber(automation: PlaywrightAutomation, phoneNumber: string): Promise<void> {
  return automation.fillPhoneNumber(phoneNumber)
}

export async function handleSmsVerification(automation: PlaywrightAutomation, code: string): Promise<boolean> {
  return automation.handleSmsVerification(code)
}

export async function completeProfile(automation: PlaywrightAutomation, data: ProfileData): Promise<void> {
  return automation.completeProfile(data)
}

export async function saveSession(automation: PlaywrightAutomation, accountId: string): Promise<PlatformSession> {
  return automation.saveSession(accountId)
}

export default PlaywrightAutomation

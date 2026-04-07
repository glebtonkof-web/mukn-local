/**
 * Registration Automation - Full automated registration with ADB SMS integration
 * Handles the complete registration flow for all platforms
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import type { Platform } from './session-manager'
import { readSms, executeCommand } from './adb-client'

// Platform-specific registration configuration
export interface PlatformConfig {
  url: string
  phoneInputSelector: string[]
  submitButtonSelector: string[]
  codeInputSelector: string[]
  usernameInputSelector: string[]
  passwordInputSelector: string[]
  emailInputSelector: string[]
  dateOfBirthSelectors: {
    day: string
    month: string
    year: string
  }
  successIndicator: string[]
  errorIndicator: string[]
  captchaIndicator: string[]
  maxRetries: number
  timeout: number
}

// Platform configurations with real selectors
const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  telegram: {
    url: 'https://web.telegram.org/a/',
    phoneInputSelector: [
      'input[type="tel"]',
      'input[placeholder*="phone"]',
      'input[autocomplete="tel"]',
      '#sign-in-phone-number'
    ],
    submitButtonSelector: [
      'button[type="submit"]',
      'button.Button.primary',
      'button:has-text("Continue")',
      'button:has-text("Next")'
    ],
    codeInputSelector: [
      'input[type="text"][maxlength="6"]',
      'input[inputmode="numeric"]',
      'input[placeholder*="code"]'
    ],
    usernameInputSelector: [
      'input[name="username"]',
      'input[placeholder*="username"]'
    ],
    passwordInputSelector: [],
    emailInputSelector: [],
    dateOfBirthSelectors: { day: '', month: '', year: '' },
    successIndicator: [
      '.chat-list',
      '[class*="ChatList"]',
      '[class*="MainHeader"]'
    ],
    errorIndicator: [
      '.error',
      '[class*="error"]',
      '[class*="Error"]'
    ],
    captchaIndicator: [],
    maxRetries: 3,
    timeout: 180000
  },
  
  instagram: {
    url: 'https://www.instagram.com/accounts/signup/phone',
    phoneInputSelector: [
      'input[name="tel"]',
      'input[type="tel"]',
      'input[placeholder*="phone"]',
      'input[aria-label*="phone"]'
    ],
    submitButtonSelector: [
      'button[type="submit"]',
      'button:has-text("Send")',
      'button:has-text("Continue")',
      'button:has-text("Next")'
    ],
    codeInputSelector: [
      'input[name="verificationCode"]',
      'input[type="text"][maxlength="6"]',
      'input[placeholder*="code"]'
    ],
    usernameInputSelector: [
      'input[name="username"]',
      'input[placeholder*="username"]'
    ],
    passwordInputSelector: [
      'input[name="password"]',
      'input[type="password"]'
    ],
    emailInputSelector: [],
    dateOfBirthSelectors: {
      day: 'select[name="day"]',
      month: 'select[name="month"]',
      year: 'select[name="year"]'
    },
    successIndicator: [
      '[href*="/accounts/edit"]',
      '[data-testid="user-avatar"]',
      'svg[aria-label="Home"]'
    ],
    errorIndicator: [
      '[class*="error"]',
      '[class*="Error"]',
      '#slfErrorAlert'
    ],
    captchaIndicator: [
      'iframe[src*="recaptcha"]',
      '[class*="captcha"]'
    ],
    maxRetries: 3,
    timeout: 300000
  },
  
  tiktok: {
    url: 'https://www.tiktok.com/signup/phone',
    phoneInputSelector: [
      'input[type="tel"]',
      'input[name="mobile"]',
      'input[placeholder*="phone"]'
    ],
    submitButtonSelector: [
      'button[type="submit"]',
      'button:has-text("Send code")',
      'button:has-text("Continue")'
    ],
    codeInputSelector: [
      'input[name="verify_code"]',
      'input[type="text"][maxlength="6"]',
      'input[placeholder*="code"]'
    ],
    usernameInputSelector: [
      'input[name="username"]'
    ],
    passwordInputSelector: [
      'input[name="password"]',
      'input[type="password"]'
    ],
    emailInputSelector: [],
    dateOfBirthSelectors: {
      day: 'select[name="birthday-day"]',
      month: 'select[name="birthday-month"]',
      year: 'select[name="birthday-year"]'
    },
    successIndicator: [
      '[data-e2e="profile-icon"]',
      '[class*="Avatar"]'
    ],
    errorIndicator: [
      '[class*="error"]',
      '[class*="Error"]'
    ],
    captchaIndicator: [
      'iframe[src*="captcha"]',
      '[class*="captcha"]',
      '[class*="verify"]'
    ],
    maxRetries: 3,
    timeout: 300000
  },
  
  twitter: {
    url: 'https://twitter.com/i/flow/signup',
    phoneInputSelector: [
      'input[name="phone_number"]',
      'input[type="tel"]',
      'input[data-testid="ocfEnterTextTextInput"]'
    ],
    submitButtonSelector: [
      'button[data-testid="ocfEnterTextNextButton"]',
      'button[type="submit"]',
      'button:has-text("Next")'
    ],
    codeInputSelector: [
      'input[data-testid="ocfEnterTextTextInput"]',
      'input[name="verif_code"]',
      'input[type="text"][maxlength="6"]'
    ],
    usernameInputSelector: [
      'input[name="screen_name"]',
      'input[placeholder*="username"]'
    ],
    passwordInputSelector: [
      'input[name="password"]',
      'input[type="password"]'
    ],
    emailInputSelector: [],
    dateOfBirthSelectors: {
      day: 'select[name="day"]',
      month: 'select[name="month"]',
      year: 'select[name="year"]'
    },
    successIndicator: [
      '[data-testid="AppTabBar_Home_Link"]',
      '[data-testid="SideNav_AccountSwitcher_Button"]'
    ],
    errorIndicator: [
      '[data-testid="toast"]',
      '[class*="error"]'
    ],
    captchaIndicator: [
      'iframe[src*="recaptcha"]',
      'iframe[src*="arkose"]'
    ],
    maxRetries: 3,
    timeout: 300000
  },
  
  youtube: {
    url: 'https://accounts.google.com/signup/v2/webcreateaccount?service=youtube',
    phoneInputSelector: [
      'input[type="tel"]',
      'input[name="phoneNumber"]',
      '#phoneNumberId'
    ],
    submitButtonSelector: [
      'button[type="submit"]',
      'button:has-text("Next")',
      '#identifierNext'
    ],
    codeInputSelector: [
      'input[type="text"][maxlength="6"]',
      'input[name="code"]'
    ],
    usernameInputSelector: [
      'input[name="Username"]'
    ],
    passwordInputSelector: [
      'input[name="Passwd"]',
      'input[type="password"]'
    ],
    emailInputSelector: [
      'input[type="email"]',
      'input[name="email"]'
    ],
    dateOfBirthSelectors: {
      day: 'select[name="day"]',
      month: 'select[name="month"]',
      year: 'select[name="year"]'
    },
    successIndicator: [
      'ytd-topbar-logo-renderer',
      '[class*="youtube"]'
    ],
    errorIndicator: [
      '[class*="error"]',
      '.OyEIQb'
    ],
    captchaIndicator: [
      'iframe[src*="recaptcha"]'
    ],
    maxRetries: 3,
    timeout: 600000
  },
  
  whatsapp: {
    url: 'https://web.whatsapp.com/',
    phoneInputSelector: [
      'input[placeholder*="phone"]',
      'input[type="tel"]'
    ],
    submitButtonSelector: [
      'button[type="submit"]',
      'button:has-text("Next")'
    ],
    codeInputSelector: [
      'input[type="text"][maxlength="6"]',
      'input[placeholder*="code"]'
    ],
    usernameInputSelector: [],
    passwordInputSelector: [],
    emailInputSelector: [],
    dateOfBirthSelectors: { day: '', month: '', year: '' },
    successIndicator: [
      '[data-testid="chat-list"]',
      '#side'
    ],
    errorIndicator: [
      '[class*="error"]'
    ],
    captchaIndicator: [],
    maxRetries: 3,
    timeout: 300000
  },
  
  viber: {
    url: 'https://www.viber.com/en/download/',
    phoneInputSelector: [
      'input[type="tel"]',
      'input[name="phone"]'
    ],
    submitButtonSelector: [
      'button[type="submit"]'
    ],
    codeInputSelector: [
      'input[name="code"]',
      'input[type="text"][maxlength="4"]'
    ],
    usernameInputSelector: [],
    passwordInputSelector: [],
    emailInputSelector: [],
    dateOfBirthSelectors: { day: '', month: '', year: '' },
    successIndicator: [],
    errorIndicator: ['[class*="error"]'],
    captchaIndicator: [],
    maxRetries: 2,
    timeout: 180000
  },
  
  signal: {
    url: 'https://signal.org/install',
    phoneInputSelector: [
      'input[type="tel"]',
      'input[name="phone"]'
    ],
    submitButtonSelector: [
      'button[type="submit"]'
    ],
    codeInputSelector: [
      'input[name="code"]',
      'input[type="text"][maxlength="6"]'
    ],
    usernameInputSelector: [],
    passwordInputSelector: [],
    emailInputSelector: [],
    dateOfBirthSelectors: { day: '', month: '', year: '' },
    successIndicator: [],
    errorIndicator: ['[class*="error"]'],
    captchaIndicator: [],
    maxRetries: 2,
    timeout: 180000
  },
  
  discord: {
    url: 'https://discord.com/register',
    phoneInputSelector: [
      'input[name="phone"]',
      'input[type="tel"]',
      'input[placeholder*="phone"]'
    ],
    submitButtonSelector: [
      'button[type="submit"]',
      'button:has-text("Continue")'
    ],
    codeInputSelector: [
      'input[name="verification_code"]',
      'input[type="text"][maxlength="6"]'
    ],
    usernameInputSelector: [
      'input[name="username"]',
      'input[placeholder*="username"]'
    ],
    passwordInputSelector: [
      'input[name="password"]',
      'input[type="password"]'
    ],
    emailInputSelector: [
      'input[type="email"]',
      'input[name="email"]'
    ],
    dateOfBirthSelectors: {
      day: 'select[name="date_of_birth_day"]',
      month: 'select[name="date_of_birth_month"]',
      year: 'select[name="date_of_birth_year"]'
    },
    successIndicator: [
      '[class*="guilds"]',
      '[class*="channels"]'
    ],
    errorIndicator: [
      '[class*="error"]',
      '[class*="Error"]'
    ],
    captchaIndicator: [
      'iframe[src*="hcaptcha"]',
      'iframe[src*="recaptcha"]'
    ],
    maxRetries: 3,
    timeout: 180000
  },
  
  reddit: {
    url: 'https://www.reddit.com/register/',
    phoneInputSelector: [
      'input[type="tel"]',
      'input[name="phoneNumber"]'
    ],
    submitButtonSelector: [
      'button[type="submit"]',
      'button:has-text("Continue")'
    ],
    codeInputSelector: [
      'input[name="otp"]',
      'input[type="text"][maxlength="6"]'
    ],
    usernameInputSelector: [
      'input[name="username"]',
      'input[placeholder*="username"]'
    ],
    passwordInputSelector: [
      'input[name="password"]',
      'input[type="password"]'
    ],
    emailInputSelector: [
      'input[type="email"]',
      'input[name="email"]'
    ],
    dateOfBirthSelectors: { day: '', month: '', year: '' },
    successIndicator: [
      '[class*="Header"]',
      '[class*="profile"]'
    ],
    errorIndicator: [
      '[class*="error"]',
      '[class*="Error"]'
    ],
    captchaIndicator: [
      'iframe[src*="recaptcha"]'
    ],
    maxRetries: 3,
    timeout: 180000
  }
}

// SMS platform keywords
const SMS_KEYWORDS: Record<Platform, string[]> = {
  telegram: ['Telegram', 'telegram', 'TG', 'Teleg'],
  instagram: ['Instagram', 'insta', 'IG'],
  tiktok: ['TikTok', 'tiktok', 'TT'],
  twitter: ['Twitter', 'X.com', 'verify'],
  youtube: ['Google', 'YouTube', 'YT', 'G'],
  whatsapp: ['WhatsApp', 'whatsapp', 'WA'],
  viber: ['Viber', 'viber'],
  signal: ['Signal', 'signal'],
  discord: ['Discord', 'discord'],
  reddit: ['Reddit', 'reddit']
}

/**
 * Registration Automation class
 */
export class RegistrationAutomation {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private platform: Platform
  private deviceId: string | null = null
  
  constructor(platform: Platform, deviceId?: string) {
    this.platform = platform
    this.deviceId = deviceId || null
  }
  
  /**
   * Launch browser with stealth mode
   */
  async launch(): Promise<void> {
    console.log(`[RegistrationAutomation] Launching browser for ${this.platform}`)
    
    this.browser = await chromium.launch({
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
    })
    
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
      ignoreHTTPSErrors: true
    })
    
    // Inject stealth scripts
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
      Object.defineProperty(navigator, 'plugins', { 
        get: () => [
          { name: 'Chrome PDF Plugin' },
          { name: 'Chrome PDF Viewer' }
        ]
      })
      Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en'] })
    })
    
    console.log(`[RegistrationAutomation] Browser launched successfully`)
  }
  
  /**
   * Navigate to registration page
   */
  async navigateToRegistration(): Promise<boolean> {
    const config = PLATFORM_CONFIGS[this.platform]
    
    if (!this.context) {
      await this.launch()
    }
    
    this.page = await this.context!.newPage()
    
    console.log(`[RegistrationAutomation] Navigating to ${config.url}`)
    
    try {
      await this.page.goto(config.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      
      await this.page.waitForLoadState('networkidle', { timeout: 30000 })
      
      const title = await this.page.title()
      console.log(`[RegistrationAutomation] Page loaded: ${title}`)
      
      return true
    } catch (error) {
      console.error(`[RegistrationAutomation] Navigation failed:`, error)
      return false
    }
  }
  
  /**
   * Fill phone number
   */
  async fillPhoneNumber(phoneNumber: string): Promise<boolean> {
    if (!this.page) return false
    
    const config = PLATFORM_CONFIGS[this.platform]
    console.log(`[RegistrationAutomation] Filling phone number: ${phoneNumber}`)
    
    // Format phone number with country code
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
    
    for (const selector of config.phoneInputSelector) {
      try {
        const element = await this.page.waitForSelector(selector, { timeout: 5000 })
        if (element) {
          await element.click()
          await this.page.waitForTimeout(200)
          await element.fill('')
          await this.page.waitForTimeout(100)
          
          // Type with human-like delay
          for (const char of formattedPhone) {
            await element.press(char, { delay: 50 + Math.random() * 50 })
          }
          
          console.log(`[RegistrationAutomation] Phone number filled using selector: ${selector}`)
          return true
        }
      } catch {
        continue
      }
    }
    
    console.error(`[RegistrationAutomation] Could not find phone input`)
    return false
  }
  
  /**
   * Click submit/next button
   */
  async clickSubmit(): Promise<boolean> {
    if (!this.page) return false
    
    const config = PLATFORM_CONFIGS[this.platform]
    console.log(`[RegistrationAutomation] Clicking submit button`)
    
    await this.page.waitForTimeout(1000) // Wait for UI to update
    
    for (const selector of config.submitButtonSelector) {
      try {
        const element = await this.page.$(selector)
        if (element) {
          await element.click()
          console.log(`[RegistrationAutomation] Clicked button: ${selector}`)
          await this.page.waitForTimeout(2000)
          return true
        }
      } catch {
        continue
      }
    }
    
    // Try pressing Enter as fallback
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(2000)
    
    return true
  }
  
  /**
   * Wait for SMS code and fill it
   */
  async waitForSmsAndFillCode(timeout: number = 180000): Promise<string | null> {
    if (!this.page) return null
    
    const config = PLATFORM_CONFIGS[this.platform]
    console.log(`[RegistrationAutomation] Waiting for SMS code (timeout: ${timeout}ms)`)
    
    const startTime = Date.now()
    const pollInterval = 3000
    
    while (Date.now() - startTime < timeout) {
      // Try to read SMS from device
      if (this.deviceId) {
        try {
          const messages = await readSms(this.deviceId, 10)
          const keywords = SMS_KEYWORDS[this.platform] || []
          
          for (const message of messages) {
            const age = Date.now() - (message.timestamp?.getTime() || 0)
            
            // Only check recent messages (last 5 minutes)
            if (age < 300000) {
              const isFromPlatform = keywords.some(kw => 
                message.sender?.toLowerCase().includes(kw.toLowerCase()) ||
                message.body?.toLowerCase().includes(kw.toLowerCase())
              )
              
              if (isFromPlatform) {
                // Extract code
                const codeMatch = message.body?.match(/\b(\d{4,6})\b/)
                if (codeMatch) {
                  const code = codeMatch[1]
                  console.log(`[RegistrationAutomation] Found SMS code: ${code}`)
                  
                  // Fill the code
                  const filled = await this.fillVerificationCode(code)
                  if (filled) {
                    return code
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`[RegistrationAutomation] Error reading SMS:`, error)
        }
      }
      
      // Check if page already shows success
      for (const indicator of config.successIndicator) {
        try {
          const found = await this.page.$(indicator)
          if (found) {
            console.log(`[RegistrationAutomation] Registration appears successful`)
            return 'success'
          }
        } catch {
          continue
        }
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
    
    console.log(`[RegistrationAutomation] SMS code timeout`)
    return null
  }
  
  /**
   * Fill verification code
   */
  async fillVerificationCode(code: string): Promise<boolean> {
    if (!this.page) return false
    
    const config = PLATFORM_CONFIGS[this.platform]
    console.log(`[RegistrationAutomation] Filling verification code: ${code}`)
    
    for (const selector of config.codeInputSelector) {
      try {
        const element = await this.page.$(selector)
        if (element) {
          await element.click()
          await this.page.waitForTimeout(200)
          
          // Type with delay
          for (const char of code) {
            await element.press(char, { delay: 80 + Math.random() * 40 })
          }
          
          console.log(`[RegistrationAutomation] Code filled using selector: ${selector}`)
          
          // Wait and check if need to submit
          await this.page.waitForTimeout(1000)
          await this.clickSubmit()
          
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
  async completeProfile(data: {
    username?: string
    password?: string
    email?: string
    firstName?: string
    lastName?: string
    dateOfBirth?: { day: number; month: number; year: number }
  }): Promise<boolean> {
    if (!this.page) return false
    
    const config = PLATFORM_CONFIGS[this.platform]
    console.log(`[RegistrationAutomation] Completing profile`)
    
    // Fill username
    if (data.username) {
      for (const selector of config.usernameInputSelector) {
        try {
          const element = await this.page.$(selector)
          if (element) {
            await element.fill(data.username)
            console.log(`[RegistrationAutomation] Username filled: ${data.username}`)
            break
          }
        } catch {
          continue
        }
      }
    }
    
    // Fill password
    if (data.password) {
      for (const selector of config.passwordInputSelector) {
        try {
          const element = await this.page.$(selector)
          if (element) {
            await element.fill(data.password)
            console.log(`[RegistrationAutomation] Password filled`)
            break
          }
        } catch {
          continue
        }
      }
    }
    
    // Fill email
    if (data.email) {
      for (const selector of config.emailInputSelector) {
        try {
          const element = await this.page.$(selector)
          if (element) {
            await element.fill(data.email)
            console.log(`[RegistrationAutomation] Email filled: ${data.email}`)
            break
          }
        } catch {
          continue
        }
      }
    }
    
    // Fill date of birth
    if (data.dateOfBirth && config.dateOfBirthSelectors.day) {
      try {
        const daySelect = await this.page.$(config.dateOfBirthSelectors.day)
        const monthSelect = await this.page.$(config.dateOfBirthSelectors.month)
        const yearSelect = await this.page.$(config.dateOfBirthSelectors.year)
        
        if (daySelect) await daySelect.selectOption(String(data.dateOfBirth.day))
        if (monthSelect) await monthSelect.selectOption(String(data.dateOfBirth.month))
        if (yearSelect) await yearSelect.selectOption(String(data.dateOfBirth.year))
        
        console.log(`[RegistrationAutomation] Date of birth filled`)
      } catch (error) {
        console.error(`[RegistrationAutomation] Error filling date of birth:`, error)
      }
    }
    
    await this.clickSubmit()
    return true
  }
  
  /**
   * Check if registration was successful
   */
  async checkSuccess(): Promise<boolean> {
    if (!this.page) return false
    
    const config = PLATFORM_CONFIGS[this.platform]
    
    // Check for success indicators
    for (const indicator of config.successIndicator) {
      try {
        const found = await this.page.$(indicator)
        if (found) {
          console.log(`[RegistrationAutomation] Success indicator found: ${indicator}`)
          return true
        }
      } catch {
        continue
      }
    }
    
    // Check for error indicators
    for (const indicator of config.errorIndicator) {
      try {
        const found = await this.page.$(indicator)
        if (found) {
          const text = await found.textContent()
          console.log(`[RegistrationAutomation] Error indicator found: ${text}`)
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
  async checkCaptcha(): Promise<boolean> {
    if (!this.page) return false
    
    const config = PLATFORM_CONFIGS[this.platform]
    
    for (const indicator of config.captchaIndicator) {
      try {
        const found = await this.page.$(indicator)
        if (found) {
          console.log(`[RegistrationAutomation] Captcha detected`)
          return true
        }
      } catch {
        continue
      }
    }
    
    return false
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
    console.log(`[RegistrationAutomation] Browser closed`)
  }
  
  /**
   * Get current page URL
   */
  getCurrentUrl(): string {
    return this.page?.url() || ''
  }
  
  /**
   * Get page content
   */
  async getPageContent(): Promise<string> {
    if (!this.page) return ''
    return await this.page.content()
  }
  
  /**
   * Take screenshot
   */
  async takeScreenshot(): Promise<Buffer | null> {
    if (!this.page) return null
    return await this.page.screenshot({ fullPage: false })
  }
}

/**
 * Run complete registration flow
 */
export async function runRegistration(params: {
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
}): Promise<{
  success: boolean
  error?: string
  username?: string
  code?: string
}> {
  const { platform, phoneNumber, deviceId, profile } = params
  
  console.log(`[RegistrationAutomation] Starting registration for ${platform}`)
  console.log(`[RegistrationAutomation] Phone: ${phoneNumber}, Device: ${deviceId}`)
  
  const automation = new RegistrationAutomation(platform, deviceId)
  
  try {
    // Step 1: Launch browser
    await automation.launch()
    
    // Step 2: Navigate to registration page
    const navigated = await automation.navigateToRegistration()
    if (!navigated) {
      throw new Error('Failed to navigate to registration page')
    }
    
    // Step 3: Fill phone number
    const phoneFilled = await automation.fillPhoneNumber(phoneNumber)
    if (!phoneFilled) {
      throw new Error('Failed to fill phone number')
    }
    
    // Step 4: Click submit
    await automation.clickSubmit()
    
    // Step 5: Wait for SMS and fill code
    const code = await automation.waitForSmsAndFillCode()
    if (!code) {
      throw new Error('Failed to receive SMS verification code')
    }
    
    // Step 6: Complete profile if needed
    if (profile) {
      await automation.completeProfile({
        username: profile.username,
        password: profile.password,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName
      })
    }
    
    // Step 7: Check success
    const success = await automation.checkSuccess()
    
    if (success) {
      console.log(`[RegistrationAutomation] Registration successful!`)
      return {
        success: true,
        username: profile?.username,
        code
      }
    } else {
      // Check for captcha
      const hasCaptcha = await automation.checkCaptcha()
      if (hasCaptcha) {
        throw new Error('Captcha detected - manual intervention required')
      }
      
      throw new Error('Could not confirm successful registration')
    }
    
  } catch (error) {
    console.error(`[RegistrationAutomation] Registration failed:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  } finally {
    await automation.close()
  }
}

export default RegistrationAutomation

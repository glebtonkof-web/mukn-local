/**
 * Сервис регистрации почтовых аккаунтов
 * 
 * Поддерживаемые сервисы:
 * - Gmail
 * - Yandex Mail
 * - Mail.ru
 * - Outlook/Hotmail
 * - ProtonMail
 * - Rambler
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { EventEmitter } from 'events'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  initCaptchaSolver,
  getCaptchaSolver,
  solveRecaptchaV2,
  solveHCaptcha,
  type CaptchaSolverConfig
} from '@/lib/captcha-solver'
import { getBestProxyForPlatform, type ProxyInfo } from './sim-auto/proxy-manager'

// Типы почтовых сервисов
export type EmailProvider = 'gmail' | 'yandex' | 'mailru' | 'outlook' | 'protonmail' | 'rambler'

export interface EmailRegistrationParams {
  provider: EmailProvider
  firstName?: string
  lastName?: string
  customUsername?: string
  customPassword?: string
  recoveryEmail?: string
  phoneNumber?: string
  deviceId?: string
  captchaConfig?: CaptchaSolverConfig
}

export interface EmailRegistrationResult {
  success: boolean
  email?: string
  password?: string
  accountId?: string
  error?: string
  requiresManualAction?: boolean
  manualActionType?: 'captcha' | 'sms' | 'phone' | 'recovery'
  duration: number
}

// Конфигурации почтовых сервисов
const EMAIL_PROVIDERS_CONFIG: Record<EmailProvider, {
  url: string
  name: string
  domain: string
  requiresPhone: boolean
  captchaTypes: string[]
  selectors: {
    firstName?: string[]
    lastName?: string[]
    username: string[]
    password: string[]
    confirmPassword?: string[]
    email?: string[]
    phone?: string[]
    code?: string[]
    submitBtn: string[]
    successIndicator: string[]
    errorIndicator: string[]
    captchaIframe: string[]
  }
}> = {
  gmail: {
    url: 'https://accounts.google.com/signup',
    name: 'Gmail',
    domain: 'gmail.com',
    requiresPhone: true,
    captchaTypes: ['recaptcha'],
    selectors: {
      firstName: ['input[name="firstName"]', '#firstName'],
      lastName: ['input[name="lastName"]', '#lastName'],
      username: ['input[name="Username"]', '#username', 'input[type="text"][autocomplete="username"]'],
      password: ['input[name="Passwd"]', 'input[type="password"][name="password"]', '#password'],
      confirmPassword: ['input[name="ConfirmPasswd"]'],
      phone: ['input[type="tel"]', '#phoneNumberId'],
      code: ['input[type="text"][maxlength="6"]', '#code'],
      submitBtn: ['button[type="submit"]', '#submitbutton', 'button:has-text("Next")'],
      successIndicator: ['#yDmH0d', '.dashboard-container', '[data-email]'],
      errorIndicator: ['.OZLg5c', '.dEOOab-r4nke', '[class*="error"]'],
      captchaIframe: ['iframe[src*="recaptcha"]']
    }
  },

  yandex: {
    url: 'https://passport.yandex.ru/registration',
    name: 'Yandex Mail',
    domain: 'yandex.ru',
    requiresPhone: true,
    captchaTypes: ['recaptcha', 'smartcaptcha'],
    selectors: {
      firstName: ['input[name="firstname"]', '#firstname'],
      lastName: ['input[name="lastname"]', '#lastname'],
      username: ['input[name="login"]', '#login'],
      password: ['input[name="password"]', '#password'],
      confirmPassword: ['input[name="password_confirm"]', '#password_confirm'],
      phone: ['input[name="phone"]', 'input[type="tel"]'],
      code: ['input[name="code"]', 'input[type="text"][maxlength="6"]'],
      submitBtn: ['button[type="submit"]', '.registration__submit', 'button:has-text("Зарегистрироваться")'],
      successIndicator: ['#passport-content', '.passport-Domik', '.mail-App-Content'],
      errorIndicator: ['.form__error', '[class*="error"]'],
      captchaIframe: ['iframe[src*="recaptcha"]', 'iframe[src*="smartcaptcha"]']
    }
  },

  mailru: {
    url: 'https://account.mail.ru/signup',
    name: 'Mail.ru',
    domain: 'mail.ru',
    requiresPhone: true,
    captchaTypes: ['recaptcha', 'hcaptcha'],
    selectors: {
      firstName: ['input[name="firstname"]', '[data-testid="firstname-input"]'],
      lastName: ['input[name="lastname"]', '[data-testid="lastname-input"]'],
      username: ['input[name="login"]', '[data-testid="login-input"]'],
      password: ['input[name="password"]', '[data-testid="password-input"]'],
      confirmPassword: ['input[name="repeatPassword"]'],
      phone: ['input[name="phone"]', 'input[type="tel"]'],
      code: ['input[name="code"]', 'input[type="text"][maxlength="6"]'],
      submitBtn: ['button[type="submit"]', '[data-testid="submit-button"]'],
      successIndicator: ['.mailbox-root', '.app-root', '[data-testid="mail-app"]'],
      errorIndicator: ['.error', '[class*="error"]', '[data-testid="error-message"]'],
      captchaIframe: ['iframe[src*="recaptcha"]', 'iframe[src*="hcaptcha"]']
    }
  },

  outlook: {
    url: 'https://signup.live.com/signup',
    name: 'Outlook',
    domain: 'outlook.com',
    requiresPhone: true,
    captchaTypes: ['recaptcha', 'hcaptcha'],
    selectors: {
      firstName: ['input[name="FirstName"]', '#MemberName'],
      lastName: ['input[name="LastName"]'],
      username: ['input[name="MemberName"]', '#MemberName', '#usernameInput'],
      password: ['input[name="PasswordInput"]', '#PasswordInput', 'input[type="password"]'],
      phone: ['input[name="PhoneNumber"]', 'input[type="tel"]', '#phoneNumber'],
      code: ['input[name="VerificationCode"]', 'input[type="text"][maxlength="6"]'],
      submitBtn: ['input[type="submit"]', '#iSignupAction', 'button[type="submit"]'],
      successIndicator: ['#maincontent', '.o365cs-nav', '[data-testid="shell-header"]'],
      errorIndicator: ['.alert', '[class*="error"]', '#hipEnforcementErrorMessage'],
      captchaIframe: ['iframe[src*="recaptcha"]', 'iframe[src*="hcaptcha"]']
    }
  },

  protonmail: {
    url: 'https://account.proton.me/signup',
    name: 'ProtonMail',
    domain: 'proton.me',
    requiresPhone: false,
    captchaTypes: ['hcaptcha'],
    selectors: {
      username: ['input[name="username"]', '#username', 'input[id="username"]'],
      password: ['input[name="password"]', '#password', 'input[type="password"]'],
      confirmPassword: ['input[name="confirmPassword"]', '#confirmPassword'],
      email: ['input[name="email"]', 'input[type="email"]'],
      submitBtn: ['button[type="submit"]', '#signup-btn', 'button:has-text("Create account")'],
      successIndicator: ['.ui-prompts-container', '.app-root', '.main-area'],
      errorIndicator: ['.alert-error', '[class*="error"]'],
      captchaIframe: ['iframe[src*="hcaptcha"]']
    }
  },

  rambler: {
    url: 'https://id.rambler.ru/account/registration',
    name: 'Rambler',
    domain: 'rambler.ru',
    requiresPhone: true,
    captchaTypes: ['recaptcha'],
    selectors: {
      firstName: ['input[name="firstname"]', '#firstname'],
      lastName: ['input[name="lastname"]', '#lastname'],
      username: ['input[name="login"]', '#login'],
      password: ['input[name="password"]', '#password'],
      confirmPassword: ['input[name="password.confirm"]', '#confirm-password'],
      phone: ['input[name="phone"]', 'input[type="tel"]'],
      code: ['input[name="code"]', 'input[type="text"][maxlength="6"]'],
      submitBtn: ['button[type="submit"]', '.rui-Button', 'button:has-text("Зарегистрироваться")'],
      successIndicator: ['.mail-app', '.rmail-App', '#mail-app'],
      errorIndicator: ['.rui-Form-fieldError', '[class*="error"]'],
      captchaIframe: ['iframe[src*="recaptcha"]']
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

// Генерация случайных данных
function generateRandomFirstName(): string {
  const names = ['Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Алексей', 'Артём', 'Илья', 'Кирилл', 'Михаил',
                 'Anna', 'Maria', 'Elena', 'Olga', 'Natalia', 'Irina', 'Svetlana', 'Ekaterina', 'Tatiana', 'Julia']
  return names[Math.floor(Math.random() * names.length)]
}

function generateRandomLastName(): string {
  const surnames = ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 'Новиков', 'Фёдоров',
                    'Ivanova', 'Smirnova', 'Kuznetsova', 'Popova', 'Vasilieva', 'Petrova', 'Sokolova', 'Mikhailova', 'Novikova', 'Fedorova']
  return surnames[Math.floor(Math.random() * surnames.length)]
}

function generateUsername(firstName?: string, lastName?: string): string {
  const first = firstName?.toLowerCase().replace(/[^a-z]/g, '') || generateRandomFirstName().toLowerCase().replace(/[^a-z]/g, '')
  const last = lastName?.toLowerCase().replace(/[^a-z]/g, '') || generateRandomLastName().toLowerCase().replace(/[^a-z]/g, '')
  const num = Math.floor(Math.random() * 9999)
  return `${first}.${last}${num}`
}

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Сервис регистрации почтовых аккаунтов
 */
export class EmailRegistrationService extends EventEmitter {
  private activeJobs = new Map<string, {
    provider: string
    status: string
    startTime: number
    browser?: Browser
    page?: Page
  }>()

  /**
   * Зарегистрировать почтовый аккаунт
   */
  async registerEmail(params: EmailRegistrationParams): Promise<EmailRegistrationResult> {
    const { provider, phoneNumber, deviceId, captchaConfig } = params
    const startTime = Date.now()
    const config = EMAIL_PROVIDERS_CONFIG[provider]

    if (!config) {
      return {
        success: false,
        error: `Неподдерживаемый провайдер: ${provider}`,
        duration: Date.now() - startTime
      }
    }

    // Инициализация captcha solver
    if (captchaConfig?.apiKey || process.env.CAPTCHA_API_KEY) {
      initCaptchaSolver({
        provider: captchaConfig?.provider || (process.env.CAPTCHA_PROVIDER as CaptchaSolverConfig['provider']) || '2captcha',
        apiKey: captchaConfig?.apiKey || process.env.CAPTCHA_API_KEY!,
        timeout: 120000,
        pollingInterval: 3000
      })
    }

    const jobId = crypto.randomUUID()
    
    this.emit('registration:started', {
      jobId,
      provider,
      timestamp: new Date()
    })

    this.activeJobs.set(jobId, {
      provider,
      status: 'starting',
      startTime
    })

    let browser: Browser | null = null
    let page: Page | null = null
    let proxy: ProxyInfo | null = null

    try {
      // Генерация данных
      const firstName = params.firstName || generateRandomFirstName()
      const lastName = params.lastName || generateRandomLastName()
      const username = params.customUsername || generateUsername(firstName, lastName)
      const password = params.customPassword || generatePassword()

      // Стадия 1: Запуск браузера
      this.emit('registration:progress', {
        jobId,
        stage: 'launching_browser',
        message: 'Запуск браузера...',
        percent: 5
      })

      const launchResult = await this.launchBrowser(provider, jobId)
      browser = launchResult.browser
      page = launchResult.page
      proxy = launchResult.proxy

      this.activeJobs.set(jobId, {
        ...this.activeJobs.get(jobId)!,
        status: 'browser_launched',
        browser,
        page
      })

      // Стадия 2: Навигация
      this.emit('registration:progress', {
        jobId,
        stage: 'navigating',
        message: `Загрузка страницы регистрации ${config.name}...`,
        percent: 15
      })

      await this.navigate(page, config)

      // Стадия 3: Проверка captcha
      const preCaptcha = await this.detectAndSolveCaptcha(page, provider, config.url)
      if (preCaptcha.detected && !preCaptcha.solved) {
        throw new Error('Не удалось решить captcha')
      }

      // Стадия 4: Ввод данных
      this.emit('registration:progress', {
        jobId,
        stage: 'entering_data',
        message: 'Ввод регистрационных данных...',
        percent: 30
      })

      // Ввод имени и фамилии
      if (config.selectors.firstName) {
        await this.fillField(page, config.selectors.firstName, firstName)
      }
      if (config.selectors.lastName) {
        await this.fillField(page, config.selectors.lastName, lastName)
      }

      // Ввод логина
      await this.fillField(page, config.selectors.username, username)

      // Стадия 5: Проверка доступности логина
      await this.delay(1000)

      // Ввод пароля
      await this.fillField(page, config.selectors.password, password)
      if (config.selectors.confirmPassword) {
        await this.fillField(page, config.selectors.confirmPassword, password)
      }

      // Стадия 6: Проверка captcha
      this.emit('registration:progress', {
        jobId,
        stage: 'checking_captcha',
        message: 'Проверка captcha...',
        percent: 50
      })

      const midCaptcha = await this.detectAndSolveCaptcha(page, provider, config.url)
      if (midCaptcha.detected && !midCaptcha.solved) {
        throw new Error('Не удалось решить captcha')
      }

      // Стадия 7: Отправка формы
      this.emit('registration:progress', {
        jobId,
        stage: 'submitting',
        message: 'Отправка формы регистрации...',
        percent: 60
      })

      await this.clickSubmit(page, config.selectors.submitBtn)
      await this.delay(3000)

      // Стадия 8: Ввод телефона если требуется
      if (config.requiresPhone && phoneNumber) {
        this.emit('registration:progress', {
          jobId,
          stage: 'entering_phone',
          message: 'Ввод номера телефона...',
          percent: 70
        })

        if (config.selectors.phone) {
          await this.fillField(page, config.selectors.phone, phoneNumber)
          await this.clickSubmit(page, config.selectors.submitBtn)
          await this.delay(2000)
        }

        // Ожидание SMS кода
        if (deviceId && config.selectors.code) {
          this.emit('registration:progress', {
            jobId,
            stage: 'waiting_sms',
            message: 'Ожидание SMS кода...',
            percent: 75
          })

          // Интеграция с SMS ридером
          const code = await this.waitForSmsCode(deviceId, provider, 180000)
          if (code) {
            await this.fillField(page, config.selectors.code, code)
            await this.clickSubmit(page, config.selectors.submitBtn)
            await this.delay(2000)
          }
        }
      }

      // Стадия 9: Проверка успеха
      this.emit('registration:progress', {
        jobId,
        stage: 'verifying',
        message: 'Проверка регистрации...',
        percent: 85
      })

      const success = await this.verifySuccess(page, config.selectors.successIndicator)

      if (success) {
        const email = `${username}@${config.domain}`

        // Сохранение в БД
        const accountId = await this.saveAccount({
          email,
          password,
          provider,
          firstName,
          lastName,
          username,
          proxy
        })

        const duration = Date.now() - startTime

        this.emit('registration:completed', {
          jobId,
          provider,
          email,
          success: true,
          duration
        })

        return {
          success: true,
          email,
          password,
          accountId,
          duration
        }
      }

      // Проверка финальной captcha
      const finalCaptcha = await this.detectAndSolveCaptcha(page, provider, config.url)
      if (finalCaptcha.detected) {
        return {
          success: false,
          error: 'Требуется решение captcha',
          requiresManualAction: true,
          manualActionType: 'captcha',
          duration: Date.now() - startTime
        }
      }

      throw new Error('Не удалось подтвердить регистрацию')

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка'
      const duration = Date.now() - startTime

      logger.error(`[EmailRegistration] ${provider} registration failed: ${errorMsg}`)

      this.emit('registration:error', {
        jobId,
        provider,
        error: errorMsg
      })

      return {
        success: false,
        error: errorMsg,
        duration
      }

    } finally {
      this.activeJobs.delete(jobId)
      if (page) await page.close().catch(() => {})
      if (browser) await browser.close().catch(() => {})
    }
  }

  /**
   * Запуск браузера
   */
  private async launchBrowser(provider: string, jobId: string): Promise<{
    browser: Browser
    page: Page
    proxy: ProxyInfo | null
  }> {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

    // Получение proxy
    let proxy: ProxyInfo | null = null
    try {
      proxy = await getBestProxyForPlatform(`email_${provider}`)
      if (proxy) {
        logger.info(`[EmailRegistration] Using proxy: ${proxy.host}:${proxy.port}`)
      }
    } catch (e) {
      logger.warn('[EmailRegistration] No proxy available')
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
        '--disable-features=IsolateOrigins,site-per-process'
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
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
      }
    }

    if (proxy?.username && proxy?.password) {
      contextOptions.httpCredentials = {
        username: proxy.username,
        password: proxy.password
      }
    }

    const context = await browser.newContext(contextOptions)

    // Stealth скрипты
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
      Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en'] })
      // @ts-expect-error - chrome runtime override
      window.chrome = { runtime: {} }
    })

    const page = await context.newPage()

    return { browser, page, proxy }
  }

  /**
   * Навигация
   */
  private async navigate(page: Page, config: typeof EMAIL_PROVIDERS_CONFIG[EmailProvider]): Promise<void> {
    page.setDefaultTimeout(90000)
    page.setDefaultNavigationTimeout(90000)

    await page.goto(config.url, {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    })

    await this.delay(2000)

    // Проверка Cloudflare
    const content = await page.content()
    if (content.includes('Cloudflare') && content.includes('challenge')) {
      logger.info('[EmailRegistration] Cloudflare challenge detected, waiting...')
      await this.delay(10000)
    }
  }

  /**
   * Заполнение поля
   */
  private async fillField(page: Page, selectors: string[], value: string): Promise<void> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector)
        if (element) {
          await element.click()
          await this.delay(200)
          await element.fill('')
          await this.delay(100)

          // Человеко-подобный ввод
          for (const char of value) {
            await element.press(char, { delay: 50 + Math.random() * 50 })
          }
          return
        }
      } catch {
        continue
      }
    }
  }

  /**
   * Клик по кнопке
   */
  private async clickSubmit(page: Page, selectors: string[]): Promise<void> {
    await this.delay(1000)

    for (const selector of selectors) {
      try {
        const element = await page.$(selector)
        if (element) {
          await element.click()
          await this.delay(2000)
          return
        }
      } catch {
        continue
      }
    }

    await page.keyboard.press('Enter')
    await this.delay(2000)
  }

  /**
   * Обнаружение и решение captcha
   */
  private async detectAndSolveCaptcha(
    page: Page,
    provider: string,
    pageUrl: string
  ): Promise<{ detected: boolean; solved: boolean; type?: string }> {
    const config = EMAIL_PROVIDERS_CONFIG[provider as EmailProvider]
    if (!config.selectors.captchaIframe?.length) {
      return { detected: false, solved: true }
    }

    for (const selector of config.selectors.captchaIframe) {
      try {
        const iframe = await page.$(selector)
        if (!iframe) continue

        const src = await iframe.getAttribute('src') || ''
        let captchaType = 'unknown'

        if (src.includes('recaptcha')) captchaType = 'recaptcha'
        else if (src.includes('hcaptcha')) captchaType = 'hcaptcha'
        else if (src.includes('smartcaptcha')) captchaType = 'smartcaptcha'

        logger.info(`[EmailRegistration] Captcha detected: ${captchaType}`)

        const solver = getCaptchaSolver()
        if (!solver) {
          return { detected: true, solved: false, type: captchaType }
        }

        const siteKey = await this.extractSiteKey(page, captchaType)
        if (!siteKey) {
          return { detected: true, solved: false, type: captchaType }
        }

        let solution: string | null = null

        try {
          if (captchaType === 'recaptcha') {
            solution = await solveRecaptchaV2(siteKey, pageUrl)
          } else if (captchaType === 'hcaptcha') {
            solution = await solveHCaptcha(siteKey, pageUrl)
          }
        } catch (solveError) {
          logger.error(`[EmailRegistration] Captcha solve failed: ${solveError}`)
          return { detected: true, solved: false, type: captchaType }
        }

        if (solution) {
          await this.injectCaptchaSolution(page, captchaType, solution)
          return { detected: true, solved: true, type: captchaType }
        }

        return { detected: true, solved: false, type: captchaType }

      } catch {
        continue
      }
    }

    return { detected: false, solved: true }
  }

  /**
   * Извлечение site key
   */
  private async extractSiteKey(page: Page, captchaType: string): Promise<string | null> {
    try {
      return await page.evaluate((type) => {
        const elem = document.querySelector(
          type === 'hcaptcha' ? '.h-captcha' : '[data-sitekey]'
        ) as HTMLElement
        return elem?.dataset?.sitekey || null
      }, captchaType)
    } catch {
      return null
    }
  }

  /**
   * Инъекция решения captcha
   */
  private async injectCaptchaSolution(page: Page, captchaType: string, solution: string): Promise<void> {
    await page.evaluate(({ type, token }) => {
      if (type === 'recaptcha') {
        const textarea = document.getElementById('g-recaptcha-response') as HTMLTextAreaElement
        if (textarea) {
          textarea.value = token
          textarea.innerHTML = token
        }
      } else if (type === 'hcaptcha') {
        const textarea = document.querySelector('[name="h-captcha-response"]') as HTMLTextAreaElement
        if (textarea) {
          textarea.value = token
        }
        // @ts-expect-error - hcaptcha
        if (window.hcaptcha) {
          // @ts-expect-error - hcaptcha
          window.hcaptcha.setResponse?.(token)
        }
      }
    }, { type: captchaType, token: solution })
  }

  /**
   * Проверка успеха
   */
  private async verifySuccess(page: Page, selectors: string[]): Promise<boolean> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector)
        if (element) return true
      } catch {
        continue
      }
    }
    return false
  }

  /**
   * Ожидание SMS кода
   */
  private async waitForSmsCode(deviceId: string, provider: string, timeout: number): Promise<string | null> {
    // Интеграция с improved-sms-reader
    try {
      const { waitForVerificationCode } = await import('./sim-auto/improved-sms-reader')
      const result = await waitForVerificationCode({
        deviceId,
        platform: provider as any,
        timeout
      })
      return result?.code || null
    } catch {
      return null
    }
  }

  /**
   * Сохранение аккаунта в БД
   */
  private async saveAccount(params: {
    email: string
    password: string
    provider: string
    firstName?: string
    lastName?: string
    username?: string
    proxy?: ProxyInfo | null
  }): Promise<string> {
    try {
      // Найти или создать сервис
      let service = await db.emailService.findUnique({
        where: { name: params.provider }
      })

      if (!service) {
        const config = EMAIL_PROVIDERS_CONFIG[params.provider as EmailProvider]
        service = await db.emailService.create({
          data: {
            id: crypto.randomUUID(),
            name: params.provider,
            displayName: config.name,
            domain: config.domain,
            requiresPhone: config.requiresPhone,
            captchaTypes: JSON.stringify(config.captchaTypes)
          }
        })
      }

      const accountId = crypto.randomUUID()

      await db.emailAccount.create({
        data: {
          id: accountId,
          email: params.email,
          password: params.password,
          serviceId: service.id,
          firstName: params.firstName,
          lastName: params.lastName,
          username: params.username,
          proxyHost: params.proxy?.host,
          proxyPort: params.proxy?.port,
          proxyUsername: params.proxy?.username,
          proxyPassword: params.proxy?.password
        }
      })

      // Обновить статистику сервиса
      await db.emailService.update({
        where: { id: service.id },
        data: {
          totalRegistered: { increment: 1 },
          lastUsedAt: new Date()
        }
      })

      return accountId
    } catch (error) {
      logger.error('[EmailRegistration] Failed to save account:', error as Error)
      return ''
    }
  }

  /**
   * Получить доступный email для регистрации
   */
  async getAvailableEmail(service?: EmailProvider): Promise<{
    email: string
    password: string
    accountId: string
  } | null> {
    try {
      const where: any = { status: 'active' }
      if (service) {
        const serviceRecord = await db.emailService.findUnique({
          where: { name: service }
        })
        if (serviceRecord) {
          where.serviceId = serviceRecord.id
        }
      }

      const account = await db.emailAccount.findFirst({
        where,
        orderBy: { usedCount: 'asc' }
      })

      if (!account) return null

      // Увеличить счётчик использований
      await db.emailAccount.update({
        where: { id: account.id },
        data: { usedCount: { increment: 1 } }
      })

      return {
        email: account.email,
        password: account.password,
        accountId: account.id
      }
    } catch (error) {
      logger.error('[EmailRegistration] Failed to get available email:', error as Error)
      return null
    }
  }

  /**
   * Добавить задачу в очередь
   */
  async addToQueue(params: EmailRegistrationParams & { priority?: number }): Promise<string> {
    const jobId = crypto.randomUUID()

    await db.emailRegistrationQueue.create({
      data: {
        id: jobId,
        service: params.provider,
        priority: params.priority || 5,
        firstName: params.firstName,
        lastName: params.lastName,
        customUsername: params.customUsername,
        customPassword: params.customPassword,
        recoveryEmail: params.recoveryEmail
      }
    })

    return jobId
  }

  /**
   * Обработка очереди
   */
  async processQueue(limit: number = 5): Promise<void> {
    const jobs = await db.emailRegistrationQueue.findMany({
      where: { status: 'pending' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit
    })

    for (const job of jobs) {
      await db.emailRegistrationQueue.update({
        where: { id: job.id },
        data: { status: 'in_progress', startedAt: new Date() }
      })

      const result = await this.registerEmail({
        provider: job.service as EmailProvider,
        firstName: job.firstName || undefined,
        lastName: job.lastName || undefined,
        customUsername: job.customUsername || undefined,
        customPassword: job.customPassword || undefined,
        recoveryEmail: job.recoveryEmail || undefined
      })

      await db.emailRegistrationQueue.update({
        where: { id: job.id },
        data: {
          status: result.success ? 'completed' : 'failed',
          resultEmail: result.email,
          resultPassword: result.password,
          accountId: result.accountId,
          errorMessage: result.error,
          completedAt: new Date()
        }
      })
    }
  }

  /**
   * Инициализация сервисов
   */
  async initializeServices(): Promise<void> {
    for (const [name, config] of Object.entries(EMAIL_PROVIDERS_CONFIG)) {
      const existing = await db.emailService.findUnique({
        where: { name }
      })

      if (!existing) {
        await db.emailService.create({
          data: {
            id: crypto.randomUUID(),
            name,
            displayName: config.name,
            domain: config.domain,
            registrationUrl: config.url,
            requiresPhone: config.requiresPhone,
            captchaTypes: JSON.stringify(config.captchaTypes)
          }
        })
        logger.info(`[EmailRegistration] Created service: ${config.name}`)
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton
let emailRegistrationInstance: EmailRegistrationService | null = null

export function getEmailRegistrationService(): EmailRegistrationService {
  if (!emailRegistrationInstance) {
    emailRegistrationInstance = new EmailRegistrationService()
  }
  return emailRegistrationInstance
}

export { EMAIL_PROVIDERS_CONFIG }

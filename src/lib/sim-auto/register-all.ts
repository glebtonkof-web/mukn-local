/**
 * Mass Registration Controller
 * Массовая регистрация аккаунтов с соблюдением антидетект-правил
 * 
 * ГЛАВНЫЕ ПРАВИЛА:
 * 1. Уникальный fingerprint для каждой регистрации
 * 2. Прокси для навигации, БЕЗ прокси для критических данных
 * 3. Паузы между действиями (human_delay)
 * 4. Минимум 30-60 минут между регистрациями одного сервиса
 * 5. Имитация мыши по кривым Безье
 * 6. Печать с ошибками и исправлениями
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { EventEmitter } from 'events'
import { logger } from '@/lib/logger'
import { waitForVerificationCode, startSmsMonitoring } from './improved-sms-reader'
import { getBestProxyForPlatform, type ProxyInfo } from './proxy-manager'
import { SERVICES_REGISTRY, getServiceConfig, type ServiceConfig } from './services-registry'
import {
  humanDelay,
  humanTyping,
  humanClick,
  humanScroll,
  humanMouseMove,
  simulateReading,
  lookAround,
  generateFingerprint,
  generateMobileFingerprint,
  generateName,
  generateUsername,
  generatePassword,
  generateDateOfBirth,
  randomInt,
  randomChoice
} from './human-behavior'

// ==================== ТИПЫ ====================

export interface RegistrationTask {
  id: string
  serviceId: string
  phoneNumber: string
  deviceId: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
  error?: string
  result?: RegistrationResult
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface RegistrationResult {
  success: boolean
  username?: string
  password?: string
  email?: string
  phone?: string
  error?: string
  stage?: string
  requiresManualAction?: boolean
  manualActionType?: 'captcha' | 'sms' | 'email' | 'other'
}

export interface MassRegistrationConfig {
  // Пауза между регистрациями (минуты)
  pauseBetweenRegs: number
  // Максимальное количество попыток
  maxRetries: number
  // Таймаут для SMS (секунды)
  smsTimeout: number
  // Использовать прокси
  useProxy: boolean
  // Пропустить сервисы, требующие VPN
  skipVpnServices: boolean
  // Пропустить экстремистские организации
  skipExtremist: boolean
  // Headless режим
  headless: boolean
  // Режим имитации (без реальной регистрации)
  dryRun: boolean
}

const DEFAULT_CONFIG: MassRegistrationConfig = {
  pauseBetweenRegs: 60,
  maxRetries: 3,
  smsTimeout: 180,
  useProxy: true,
  skipVpnServices: false,
  skipExtremist: true,
  headless: true,
  dryRun: false
}

// ==================== СОБЫТИЯ ====================

const events = new EventEmitter()

export function onMassRegEvent(
  event: 'task_start' | 'task_progress' | 'task_complete' | 'all_complete' | 'error',
  callback: (data: unknown) => void
): () => void {
  events.on(event, callback)
  return () => events.off(event, callback)
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Запуск массовой регистрации
 */
export async function runMassRegistration(params: {
  tasks: Omit<RegistrationTask, 'id' | 'status' | 'createdAt'>[]
  config?: Partial<MassRegistrationConfig>
}): Promise<RegistrationTask[]> {
  const config = { ...DEFAULT_CONFIG, ...params.config }
  const tasks: RegistrationTask[] = params.tasks.map((t, i) => ({
    ...t,
    id: `task-${i}-${Date.now()}`,
    status: 'pending' as const,
    createdAt: new Date()
  }))
  
  logger.info(`[MassReg] Запуск массовой регистрации: ${tasks.length} задач`)
  
  // Группируем задачи по сервисам для соблюдения пауз
  const tasksByService = groupTasksByService(tasks)
  
  for (const [serviceId, serviceTasks] of Object.entries(tasksByService)) {
    const serviceConfig = getServiceConfig(serviceId)
    
    if (!serviceConfig) {
      logger.warn(`[MassReg] Сервис не найден: ${serviceId}`)
      continue
    }
    
    // Проверяем ограничения
    if (config.skipExtremist && serviceConfig.extremistOrganization) {
      logger.warn(`[MassReg] Пропуск экстремистской организации: ${serviceId}`)
      for (const task of serviceTasks) {
        task.status = 'cancelled'
        task.error = 'Организация признана экстремистской в РФ'
      }
      continue
    }
    
    if (config.skipVpnServices && serviceConfig.requiresVpn) {
      logger.info(`[MassReg] Пропуск сервиса, требующего VPN: ${serviceId}`)
      for (const task of serviceTasks) {
        task.status = 'cancelled'
        task.error = 'Требует VPN (skipVpnServices=true)'
      }
      continue
    }
    
    // Запускаем задачи для сервиса
    for (let i = 0; i < serviceTasks.length; i++) {
      const task = serviceTasks[i]
      
      // Пауза между регистрациями одного сервиса
      if (i > 0) {
        const pauseMinutes = Math.max(config.pauseBetweenRegs, serviceConfig.minPauseBetweenRegs)
        logger.info(`[MassReg] Пауза ${pauseMinutes} минут перед следующей регистрацией...`)
        
        events.emit('task_progress', { 
          taskId: task.id, 
          stage: 'waiting',
          message: `Ожидание ${pauseMinutes} минут`
        })
        
        await new Promise(resolve => setTimeout(resolve, pauseMinutes * 60 * 1000))
      }
      
      // Запускаем регистрацию
      task.status = 'running'
      task.startedAt = new Date()
      
      events.emit('task_start', { taskId: task.id, serviceId: task.serviceId })
      
      try {
        const result = await runSingleRegistration({
          serviceId: task.serviceId,
          phoneNumber: task.phoneNumber,
          deviceId: task.deviceId,
          config
        })
        
        task.result = result
        task.status = result.success ? 'success' : 'failed'
        task.error = result.error
        task.completedAt = new Date()
        
        events.emit('task_complete', { 
          taskId: task.id, 
          serviceId: task.serviceId,
          success: result.success,
          error: result.error
        })
        
      } catch (error) {
        task.status = 'failed'
        task.error = error instanceof Error ? error.message : 'Unknown error'
        task.completedAt = new Date()
        
        events.emit('error', { taskId: task.id, error: task.error })
      }
    }
  }
  
  // Итоговая статистика
  const stats = {
    total: tasks.length,
    success: tasks.filter(t => t.status === 'success').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length
  }
  
  logger.info(`[MassReg] Завершено: ${stats.success}/${stats.total} успешно`)
  events.emit('all_complete', stats)
  
  return tasks
}

/**
 * Запуск одиночной регистрации
 */
export async function runSingleRegistration(params: {
  serviceId: string
  phoneNumber: string
  deviceId: string
  config?: Partial<MassRegistrationConfig>
}): Promise<RegistrationResult> {
  const { serviceId, phoneNumber, deviceId } = params
  const config = { ...DEFAULT_CONFIG, ...params.config }
  
  const serviceConfig = getServiceConfig(serviceId)
  
  if (!serviceConfig) {
    return {
      success: false,
      error: `Сервис не найден: ${serviceId}`
    }
  }
  
  logger.info(`[Registration] === ${serviceConfig.nameRu} ===`)
  logger.info(`[Registration] Телефон: ${phoneNumber}`)
  logger.info(`[Registration] Устройство: ${deviceId}`)
  
  // Предупреждения
  for (const warning of serviceConfig.warnings) {
    logger.warn(`[Registration] ${warning}`)
  }
  
  // Запуск мониторинга SMS
  await startSmsMonitoring(deviceId)
  
  let browser: Browser | null = null
  let context: BrowserContext | null = null
  let page: Page | null = null
  let proxy: ProxyInfo | null = null
  
  try {
    // === STAGE 1: Подготовка fingerprint ===
    events.emit('task_progress', { stage: 'fingerprint', serviceId })
    logger.info(`[Registration] Генерация fingerprint...`)
    
    const fingerprint = serviceConfig.requiresMobileFingerprint 
      ? generateMobileFingerprint()
      : generateFingerprint()
    
    logger.debug(`[Registration] Viewport: ${fingerprint.viewport.width}x${fingerprint.viewport.height}`)
    
    // === STAGE 2: Запуск браузера ===
    events.emit('task_progress', { stage: 'launching', serviceId })
    logger.info(`[Registration] Запуск браузера...`)
    
    if (config.useProxy && serviceConfig.requiresProxy) {
      proxy = await getBestProxyForPlatform(serviceId)
      if (proxy) {
        logger.info(`[Registration] Прокси: ${proxy.host}:${proxy.port}`)
      } else {
        logger.warn(`[Registration] Прокси не найден, прямое подключение`)
      }
    }
    
    const launchResult = await launchBrowser({
      fingerprint,
      proxy,
      headless: config.headless,
      mobile: serviceConfig.requiresMobileFingerprint
    })
    
    browser = launchResult.browser
    context = launchResult.context
    page = launchResult.page
    
    // === STAGE 3: Навигация ===
    events.emit('task_progress', { stage: 'navigating', serviceId })
    logger.info(`[Registration] Открытие ${serviceConfig.url}...`)
    
    const urls = [serviceConfig.url, ...(serviceConfig.alternativeUrls || [])]
    let navigated = false
    
    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
        navigated = true
        break
      } catch (error) {
        logger.warn(`[Registration] Не удалось открыть ${url}`)
      }
    }
    
    if (!navigated) {
      throw new Error('Не удалось открыть страницу регистрации')
    }
    
    await humanDelay(2, 4)
    
    // Имитация осмотра страницы
    await lookAround(page)
    await humanScroll(page)
    
    // === STAGE 4: Ввод данных ===
    events.emit('task_progress', { stage: 'entering_data', serviceId })
    
    // Генерация данных профиля
    const name = generateName('ru')
    const username = generateUsername(serviceId)
    const password = generatePassword(12)
    const dob = generateDateOfBirth()
    
    // Ввод телефона (БЕЗ прокси для критических данных!)
    if (serviceConfig.requiresPhone && serviceConfig.selectors.phoneInput) {
      logger.info(`[Registration] Ввод номера телефона (безопасный режим)...`)
      
      const phoneInput = await findElement(page, serviceConfig.selectors.phoneInput)
      if (phoneInput) {
        await humanClick(page, phoneInput)
        await humanDelay(0.2, 0.5)
        await humanTyping(page, phoneInput, phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`)
      } else {
        throw new Error('Не найдено поле ввода телефона')
      }
    }
    
    // Ввод email
    if (serviceConfig.requiresEmail && serviceConfig.selectors.emailInput) {
      const email = `${username}@mail.ru` // или другой email
      logger.info(`[Registration] Ввод email: ${email}`)
      
      const emailInput = await findElement(page, serviceConfig.selectors.emailInput)
      if (emailInput) {
        await humanClick(page, emailInput)
        await humanTyping(page, emailInput, email)
      }
    }
    
    // Ввод имени
    if (serviceConfig.selectors.firstNameInput) {
      const firstNameInput = await findElement(page, serviceConfig.selectors.firstNameInput)
      if (firstNameInput) {
        await humanTyping(page, firstNameInput, name.firstName)
      }
    }
    
    // Ввод фамилии
    if (serviceConfig.selectors.lastNameInput) {
      const lastNameInput = await findElement(page, serviceConfig.selectors.lastNameInput)
      if (lastNameInput) {
        await humanTyping(page, lastNameInput, name.lastName)
      }
    }
    
    // Ввод username
    if (serviceConfig.selectors.usernameInput) {
      const usernameInput = await findElement(page, serviceConfig.selectors.usernameInput)
      if (usernameInput) {
        await humanTyping(page, usernameInput, username)
      }
    }
    
    // Ввод пароля
    if (serviceConfig.selectors.passwordInput) {
      const passwordInput = await findElement(page, serviceConfig.selectors.passwordInput)
      if (passwordInput) {
        await humanTyping(page, passwordInput, password)
      }
    }
    
    // Дата рождения
    if (serviceConfig.selectors.dateOfBirthDay) {
      await selectDateOfBirth(page, serviceConfig, dob)
    }
    
    await humanDelay(1, 2)
    
    // === STAGE 5: Отправка формы ===
    events.emit('task_progress', { stage: 'submitting', serviceId })
    logger.info(`[Registration] Отправка формы...`)
    
    if (serviceConfig.selectors.submitButton) {
      const submitBtn = await findElement(page, serviceConfig.selectors.submitButton)
      if (submitBtn) {
        await humanClick(page, submitBtn)
      } else {
        await page.keyboard.press('Enter')
      }
    }
    
    await humanDelay(2, 5)
    
    // === STAGE 6: Ожидание SMS ===
    if (serviceConfig.requiresSms) {
      events.emit('task_progress', { stage: 'waiting_sms', serviceId })
      logger.info(`[Registration] Ожидание SMS (таймаут: ${config.smsTimeout}сек)...`)
      
      const smsResult = await waitForVerificationCode({
        deviceId,
        platform: serviceId as any,
        timeout: config.smsTimeout * 1000
      })
      
      if (!smsResult) {
        throw new Error('SMS код не получен')
      }
      
      logger.info(`[Registration] SMS код получен`)
      
      // Ввод кода
      events.emit('task_progress', { stage: 'entering_code', serviceId })
      
      const codeInput = await findElement(page, serviceConfig.selectors.codeInput)
      if (codeInput) {
        await humanClick(page, codeInput)
        await humanTyping(page, codeInput, smsResult.code)
      } else {
        throw new Error('Не найдено поле ввода кода')
      }
      
      // Подтверждение
      if (serviceConfig.selectors.submitButton) {
        const submitBtn = await findElement(page, serviceConfig.selectors.submitButton)
        if (submitBtn) {
          await humanClick(page, submitBtn)
        }
      }
      
      await humanDelay(2, 5)
    }
    
    // === STAGE 7: Проверка успеха ===
    events.emit('task_progress', { stage: 'verifying', serviceId })
    logger.info(`[Registration] Проверка результата...`)
    
    // Проверка капчи
    const captchaDetected = await checkForCaptcha(page)
    if (captchaDetected) {
      return {
        success: false,
        error: 'Обнаружена капча - требуется ручное вмешательство',
        requiresManualAction: true,
        manualActionType: 'captcha'
      }
    }
    
    // Проверка индикаторов успеха
    const successIndicator = await findElement(page, serviceConfig.selectors.successIndicator)
    if (successIndicator) {
      logger.info(`[Registration] ✓ Регистрация успешна!`)
      
      // Имитация активности после регистрации
      await simulatePostRegistration(page, serviceId)
      
      return {
        success: true,
        username,
        password,
        phone: phoneNumber
      }
    }
    
    // Проверка индикаторов ошибки
    const errorIndicator = await findElement(page, serviceConfig.selectors.errorIndicator)
    if (errorIndicator) {
      const errorText = await errorIndicator.textContent()
      logger.error(`[Registration] Ошибка: ${errorText}`)
      return {
        success: false,
        error: errorText || 'Ошибка регистрации'
      }
    }
    
    // Не удалось определить результат
    return {
      success: false,
      error: 'Не удалось определить результат регистрации'
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`[Registration] Ошибка: ${errorMsg}`)
    
    return {
      success: false,
      error: errorMsg
    }
    
  } finally {
    // Закрытие браузера
    if (page) await page.close().catch(() => {})
    if (context) await context.close().catch(() => {})
    if (browser) await browser.close().catch(() => {})
  }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Запуск браузера с stealth-конфигурацией
 */
async function launchBrowser(params: {
  fingerprint: ReturnType<typeof generateFingerprint>
  proxy: ProxyInfo | null
  headless: boolean
  mobile: boolean
}): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const { fingerprint, proxy, headless, mobile } = params
  
  const launchOptions: any = {
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-first-run',
      '--no-zygote'
    ]
  }
  
  if (proxy) {
    launchOptions.proxy = {
      server: `${proxy.protocol}://${proxy.host}:${proxy.port}`
    }
  }
  
  const browser = await chromium.launch(launchOptions)
  
  const contextOptions: any = {
    userAgent: fingerprint.userAgent,
    viewport: fingerprint.viewport,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    ignoreHTTPSErrors: true
  }
  
  if (mobile && 'deviceScaleFactor' in fingerprint) {
    contextOptions.deviceScaleFactor = fingerprint.deviceScaleFactor
    contextOptions.isMobile = fingerprint.isMobile
    contextOptions.hasTouch = fingerprint.hasTouch
  }
  
  const context = await browser.newContext(contextOptions)
  
  // Stealth скрипты
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en'] })
    // @ts-expect-error
    window.chrome = { runtime: {} }
    
    // WebGL override
    const getParameter = WebGLRenderingContext.prototype.getParameter
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Google Inc. (NVIDIA)'
      if (parameter === 37446) return 'ANGLE (NVIDIA GeForce GTX 1080)'
      return getParameter.apply(this, [parameter])
    }
  })
  
  const page = await context.newPage()
  
  return { browser, context, page }
}

/**
 * Найти элемент по списку селекторов
 */
async function findElement(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector)
      if (element) {
        return selector
      }
    } catch {
      continue
    }
  }
  return null
}

/**
 * Выбрать дату рождения
 */
async function selectDateOfBirth(
  page: Page,
  config: ServiceConfig,
  dob: { day: number; month: number; year: number }
): Promise<void> {
  if (config.selectors.dateOfBirthDay) {
    for (const selector of config.selectors.dateOfBirthDay) {
      try {
        await page.selectOption(selector, String(dob.day))
        break
      } catch {}
    }
  }
  
  await humanDelay(0.2, 0.5)
  
  if (config.selectors.dateOfBirthMonth) {
    for (const selector of config.selectors.dateOfBirthMonth) {
      try {
        await page.selectOption(selector, String(dob.month))
        break
      } catch {}
    }
  }
  
  await humanDelay(0.2, 0.5)
  
  if (config.selectors.dateOfBirthYear) {
    for (const selector of config.selectors.dateOfBirthYear) {
      try {
        await page.selectOption(selector, String(dob.year))
        break
      } catch {}
    }
  }
}

/**
 * Проверка на капчу
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
      if (element) return true
    } catch {}
  }
  
  return false
}

/**
 * Имитация активности после регистрации
 */
async function simulatePostRegistration(page: Page, serviceId: string): Promise<void> {
  logger.info(`[Registration] Имитация активности после регистрации...`)
  
  // Скролл
  await humanScroll(page)
  await humanDelay(2, 5)
  
  // Случайные движения
  for (let i = 0; i < 3; i++) {
    const x = randomInt(100, 800)
    const y = randomInt(100, 600)
    await humanMouseMove(page, x, y, randomInt(5, 15))
    await humanDelay(1, 3)
  }
  
  // Имитация чтения
  await simulateReading(page)
  
  logger.info(`[Registration] Имитация завершена`)
}

/**
 * Группировка задач по сервисам
 */
function groupTasksByService(tasks: RegistrationTask[]): Record<string, RegistrationTask[]> {
  const grouped: Record<string, RegistrationTask[]> = {}
  
  for (const task of tasks) {
    if (!grouped[task.serviceId]) {
      grouped[task.serviceId] = []
    }
    grouped[task.serviceId].push(task)
  }
  
  return grouped
}

// ==================== ЭКСПОРТ ====================

export default {
  runMassRegistration,
  runSingleRegistration,
  onMassRegEvent,
  SERVICES_REGISTRY
}

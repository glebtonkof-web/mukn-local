/**
 * Human Behavior Simulation for Anti-Bot Detection
 * Полная имитация поведения человека для обхода анти-бот систем
 * 
 * Основные правила:
 * 1. Уникальный fingerprint для каждого сеанса
 * 2. Случайные задержки между действиями
 * 3. Естественное движение мыши по кривым Безье
 * 4. Печать с ошибками и паузами
 * 5. Случайный скролл и "чтение" контента
 */

import { Page } from 'playwright'
import { logger } from '@/lib/logger'

// ==================== КОНФИГУРАЦИЯ ====================

export interface HumanBehaviorConfig {
  // Скорость печати (символов в минуту)
  typingSpeed: { min: number; max: number }
  // Частота ошибок при печати (0-1)
  typingErrorRate: number
  // Пауза между словами (мс)
  wordPause: { min: number; max: number }
  // Пауза между предложениями (мс)
  sentencePause: { min: number; max: number }
  // Скорость чтения (слов в минуту)
  readingSpeed: { min: number; max: number }
  // Вероятность паузы при чтении
  readingPauseProbability: number
  // Скорость движения мыши (пикселей в секунду)
  mouseSpeed: { min: number; max: number }
}

const DEFAULT_CONFIG: HumanBehaviorConfig = {
  typingSpeed: { min: 150, max: 250 },
  typingErrorRate: 0.02,
  wordPause: { min: 100, max: 300 },
  sentencePause: { min: 300, max: 800 },
  readingSpeed: { min: 150, max: 250 },
  readingPauseProbability: 0.15,
  mouseSpeed: { min: 400, max: 800 }
}

// Русские и английские имена для генерации
const RUSSIAN_FIRST_NAMES = ['Иван', 'Алексей', 'Дмитрий', 'Максим', 'Артём', 'Никита', 'Кирилл', 'Андрей', 'Михаил', 'Сергей']
const RUSSIAN_LAST_NAMES = ['Иванов', 'Петров', 'Сидоров', 'Кузнецов', 'Попов', 'Васильев', 'Соколов', 'Михайлов', 'Новиков', 'Фёдоров']
const ENGLISH_FIRST_NAMES = ['John', 'Michael', 'David', 'James', 'Robert', 'William', 'Richard', 'Thomas', 'Daniel', 'Matthew']
const ENGLISH_LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Wilson']

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Случайная задержка как у человека
 * Использует взвешенное распределение для более естественных значений
 */
export function humanDelay(minSec: number = 0.5, maxSec: number = 2.0): Promise<void> {
  const minMs = minSec * 1000
  const maxMs = maxSec * 1000
  
  // Взвешенное распределение - чаще средние значения
  const range = maxMs - minMs
  const random = Math.random()
  const weighted = Math.sin(random * Math.PI) * 0.5 + 0.5
  const delay = Math.floor(minMs + weighted * range)
  
  logger.debug(`[HumanBehavior] Задержка: ${delay}мс`)
  return new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Случайное целое число в диапазоне
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Случайный выбор из массива
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Генерация случайного имени
 */
export function generateName(language: 'ru' | 'en' = 'ru'): { firstName: string; lastName: string } {
  if (language === 'ru') {
    return {
      firstName: randomChoice(RUSSIAN_FIRST_NAMES),
      lastName: randomChoice(RUSSIAN_LAST_NAMES)
    }
  } else {
    return {
      firstName: randomChoice(ENGLISH_FIRST_NAMES),
      lastName: randomChoice(ENGLISH_LAST_NAMES)
    }
  }
}

/**
 * Генерация случайного username
 */
export function generateUsername(prefix?: string): string {
  const adjective = randomChoice(['cool', 'mega', 'super', 'ultra', 'pro', 'best', 'top', 'real'])
  const noun = randomChoice(['user', 'gamer', 'player', 'star', 'hero', 'master', 'king', 'boss'])
  const number = randomInt(100, 9999)
  
  if (prefix) {
    return `${prefix}${randomInt(10, 99)}_${randomInt(100, 999)}`
  }
  
  return `${adjective}_${noun}${number}`
}

/**
 * Генерация надёжного пароля
 */
export function generatePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const special = '!@#$%^&*'
  
  let password = ''
  
  // Гарантируем наличие каждого типа символов
  password += randomChoice(lowercase)
  password += randomChoice(uppercase)
  password += randomChoice(digits)
  password += randomChoice(special)
  
  // Заполняем остальное
  const allChars = lowercase + uppercase + digits + special
  for (let i = 4; i < length; i++) {
    password += randomChoice(allChars)
  }
  
  // Перемешиваем
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Генерация случайной даты рождения (возраст 18-45)
 */
export function generateDateOfBirth(): { day: number; month: number; year: number } {
  const currentYear = new Date().getFullYear()
  const age = randomInt(18, 45)
  
  return {
    day: randomInt(1, 28),
    month: randomInt(1, 12),
    year: currentYear - age
  }
}

// ==================== ПЕЧАТЬ ТЕКСТА ====================

/**
 * Печать текста с имитацией человека
 * Включает случайные ошибки и их исправление
 */
export async function humanTyping(
  page: Page,
  selector: string,
  text: string,
  config: HumanBehaviorConfig = DEFAULT_CONFIG
): Promise<boolean> {
  try {
    // Находим элемент
    const element = await page.$(selector)
    if (!element) {
      logger.warn(`[HumanBehavior] Элемент не найден: ${selector}`)
      return false
    }
    
    // Кликаем на элемент
    await element.click()
    await humanDelay(0.2, 0.5)
    
    // Очищаем поле
    await element.fill('')
    await humanDelay(0.1, 0.3)
    
    // Печатаем посимвольно
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      
      // Случайная ошибка (2% шанс)
      if (Math.random() < config.typingErrorRate && /[a-zA-Zа-яА-Я]/.test(char)) {
        // Печатаем неправильный символ
        const wrongChar = getRandomWrongChar(char)
        await page.keyboard.type(wrongChar, { delay: randomInt(30, 80) })
        await humanDelay(0.1, 0.3)
        
        // Исправляем
        await page.keyboard.press('Backspace')
        await humanDelay(0.05, 0.15)
      }
      
      // Печатаем правильный символ
      await page.keyboard.type(char, { delay: randomInt(30, 80) })
      
      // Пауза после пробела
      if (char === ' ') {
        await humanDelay(config.wordPause.min / 1000, config.wordPause.max / 1000)
      }
      
      // Пауза после конца предложения
      if ('.!?'.includes(char)) {
        await humanDelay(config.sentencePause.min / 1000, config.sentencePause.max / 1000)
      }
    }
    
    await humanDelay(0.2, 0.5)
    return true
    
  } catch (error) {
    logger.error(`[HumanBehavior] Ошибка при печати: ${error}`)
    return false
  }
}

/**
 * Получить случайный "неправильный" символ (опечатка)
 */
function getRandomWrongChar(char: string): string {
  const keyboardRows = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    'йцукенгшщзхъ',
    'фывапролджэ',
    'ячсмитьбю'
  ]
  
  const lowerChar = char.toLowerCase()
  
  for (const row of keyboardRows) {
    const index = row.indexOf(lowerChar)
    if (index !== -1) {
      // Берём соседний символ
      const neighbors = [row[index - 1], row[index + 1]].filter(Boolean)
      if (neighbors.length > 0) {
        const wrongChar = randomChoice(neighbors)
        return char === char.toUpperCase() ? wrongChar.toUpperCase() : wrongChar
      }
    }
  }
  
  // Возвращаем похожий символ
  return char
}

// ==================== ДВИЖЕНИЕ МЫШИ ====================

/**
 * Движение мыши по кривой Безье
 * Естественное движение, не по прямой линии
 */
export async function humanMouseMove(
  page: Page,
  targetX: number,
  targetY: number,
  steps: number = 20
): Promise<void> {
  // Получаем текущую позицию мыши (если возможно)
  let startX = randomInt(100, 500)
  let startY = randomInt(100, 500)
  
  // Контрольные точки для кривой Безье
  const cp1x = startX + (targetX - startX) * 0.25 + randomInt(-50, 50)
  const cp1y = startY + (targetY - startY) * 0.25 + randomInt(-50, 50)
  const cp2x = startX + (targetX - startX) * 0.75 + randomInt(-50, 50)
  const cp2y = startY + (targetY - startY) * 0.75 + randomInt(-50, 50)
  
  // Движемся по кривой
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const t2 = t * t
    const t3 = t2 * t
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    
    // Кубическая кривая Безье
    const x = Math.round(mt3 * startX + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * targetX)
    const y = Math.round(mt3 * startY + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * targetY)
    
    await page.mouse.move(x, y)
    await humanDelay(0.005, 0.02)
  }
}

/**
 * Клик с естественным движением мыши
 */
export async function humanClick(
  page: Page,
  selector: string
): Promise<boolean> {
  try {
    const element = await page.$(selector)
    if (!element) {
      logger.warn(`[HumanBehavior] Элемент не найден для клика: ${selector}`)
      return false
    }
    
    // Получаем позицию элемента
    const box = await element.boundingBox()
    if (!box) {
      logger.warn(`[HumanBehavior] Не удалось получить позицию элемента: ${selector}`)
      return false
    }
    
    // Цель - центр элемента с небольшим смещением
    const targetX = box.x + box.width / 2 + randomInt(-5, 5)
    const targetY = box.y + box.height / 2 + randomInt(-5, 5)
    
    // Двигаемся к элементу
    await humanMouseMove(page, targetX, targetY, randomInt(15, 25))
    
    // Небольшая пауза перед кликом
    await humanDelay(0.1, 0.3)
    
    // Клик
    await page.mouse.click(targetX, targetY)
    
    logger.debug(`[HumanBehavior] Клик по ${selector}`)
    return true
    
  } catch (error) {
    logger.error(`[HumanBehavior] Ошибка при клике: ${error}`)
    return false
  }
}

// ==================== СКРОЛЛ ====================

/**
 * Естественный скролл страницы
 */
export async function humanScroll(page: Page, direction: 'down' | 'up' = 'down'): Promise<void> {
  const scrolls = randomInt(1, 3)
  
  for (let i = 0; i < scrolls; i++) {
    const distance = randomInt(100, 400) * (direction === 'down' ? 1 : -1)
    await page.mouse.wheel(0, distance)
    await humanDelay(0.3, 0.8)
  }
}

/**
 * Скролл к элементу
 */
export async function scrollToElement(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.$(selector)
    if (!element) return false
    
    await element.scrollIntoViewIfNeeded()
    await humanDelay(0.3, 0.6)
    
    return true
  } catch {
    return false
  }
}

// ==================== ЧТЕНИЕ КОНТЕНТА ====================

/**
 * Имитация чтения контента
 */
export async function simulateReading(
  page: Page,
  content?: string,
  config: HumanBehaviorConfig = DEFAULT_CONFIG
): Promise<void> {
  let wordCount: number
  
  if (content) {
    wordCount = content.split(/\s+/).length
  } else {
    // Пытаемся получить текст со страницы
    try {
      const pageContent = await page.textContent('body')
      wordCount = pageContent ? pageContent.split(/\s+/).length : 50
    } catch {
      wordCount = 50
    }
  }
  
  // Время чтения
  const wordsPerMinute = randomInt(config.readingSpeed.min, config.readingSpeed.max)
  const readingTimeMs = (wordCount / wordsPerMinute) * 60000
  
  // Добавляем паузы
  const pauses = Math.floor(wordCount * config.readingPauseProbability)
  const totalPauseTime = pauses * randomInt(500, 2000)
  
  const totalTime = Math.min(readingTimeMs + totalPauseTime, 30000) // Максимум 30 секунд
  
  logger.debug(`[HumanBehavior] Имитация чтения: ${Math.round(totalTime / 1000)}сек`)
  
  // Скроллим во время "чтения"
  const scrollCount = Math.floor(totalTime / 3000)
  for (let i = 0; i < scrollCount; i++) {
    await humanScroll(page, 'down')
    await humanDelay(2, 4)
  }
}

// ==================== СЛУЧАЙНАЯ АКТИВНОСТЬ ====================

/**
 * Случайное движение мыши (имитация неактивности)
 */
export async function randomMouseMovement(page: Page): Promise<void> {
  if (Math.random() < 0.3) {
    const x = randomInt(100, 800)
    const y = randomInt(100, 600)
    await humanMouseMove(page, x, y, randomInt(5, 15))
    await humanDelay(0.1, 0.3)
  }
}

/**
 * Имитация "раздумья" перед действием
 */
export async function simulateDecision(complexity: 'simple' | 'medium' | 'complex' = 'medium'): Promise<void> {
  const times = {
    simple: { min: 0.5, max: 2 },
    medium: { min: 2, max: 8 },
    complex: { min: 5, max: 20 }
  }
  
  const { min, max } = times[complexity]
  await humanDelay(min, max)
}

/**
 * Проверка активности (имитация осмотра страницы)
 */
export async function lookAround(page: Page): Promise<void> {
  // Случайные движения мышью
  for (let i = 0; i < randomInt(2, 5); i++) {
    await randomMouseMovement(page)
    await humanDelay(0.5, 1.5)
  }
  
  // Скролл
  await humanScroll(page)
  await humanDelay(0.5, 1)
}

// ==================== FINGERPRINT ====================

/**
 * Генерация уникального fingerprint для сеанса
 */
export function generateFingerprint(): {
  userAgent: string
  viewport: { width: number; height: number }
  locale: string
  timezone: string
  colorScheme: 'light' | 'dark'
} {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ]
  
  const viewports = [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1920, height: 1080 }
  ]
  
  const timezones = [
    'Europe/Moscow',
    'Europe/Kiev',
    'Europe/Minsk',
    'Europe/Athens',
    'Europe/Istanbul'
  ]
  
  return {
    userAgent: randomChoice(userAgents),
    viewport: randomChoice(viewports),
    locale: 'ru-RU',
    timezone: randomChoice(timezones),
    colorScheme: Math.random() > 0.5 ? 'light' : 'dark'
  }
}

/**
 * Мобильный fingerprint (для TikTok, Instagram)
 */
export function generateMobileFingerprint(): {
  userAgent: string
  viewport: { width: number; height: number }
  deviceScaleFactor: number
  isMobile: boolean
  hasTouch: boolean
} {
  const mobileAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  ]
  
  const mobileViewports = [
    { width: 375, height: 667 },   // iPhone SE
    { width: 390, height: 844 },   // iPhone 12/13
    { width: 393, height: 851 },   // Pixel 7
    { width: 360, height: 800 }    // Samsung
  ]
  
  return {
    userAgent: randomChoice(mobileAgents),
    viewport: randomChoice(mobileViewports),
    deviceScaleFactor: randomInt(2, 3),
    isMobile: true,
    hasTouch: true
  }
}

export default {
  humanDelay,
  humanTyping,
  humanMouseMove,
  humanClick,
  humanScroll,
  scrollToElement,
  simulateReading,
  randomMouseMovement,
  simulateDecision,
  lookAround,
  generateFingerprint,
  generateMobileFingerprint,
  generateName,
  generateUsername,
  generatePassword,
  generateDateOfBirth,
  randomInt,
  randomChoice
}

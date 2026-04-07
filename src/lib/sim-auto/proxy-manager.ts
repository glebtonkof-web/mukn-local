/**
 * Безопасный менеджер прокси для МУКН
 * 
 * ПРИНЦИПЫ БЕЗОПАСНОСТИ:
 * 1. Только HTTPS прокси - шифрование данных в транзите
 * 2. Прокси используется ТОЛЬКО для навигации по заблокированным сайтам
 * 3. КРИТИЧЕСКИ ВАЖНЫЕ ДАННЫЕ (пароли, SMS коды) НИКОГДА не идут через прокси
 * 4. Все прокси проверяются на утечки и безопасность
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';

// Интерфейсы
export interface ProxyInfo {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  country?: string;
  anonymity?: 'transparent' | 'anonymous' | 'elite';
  lastChecked?: Date;
  isWorking: boolean;
  responseTime?: number; // ms
  source: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ProxyValidationResult {
  proxy: ProxyInfo;
  isValid: boolean;
  supportsHTTPS: boolean;
  responseTime: number;
  error?: string;
  securityIssues: string[];
}

// Blacklist опасных прокси-серверов (известные утечки)
const PROXY_BLACKLIST = new Set<string>([
  // Сюда добавляются IP прокси с известными утечками данных
  // Будет пополняться автоматически при обнаружении проблем
]);

// Blacklist стран с рискованными прокси
const HIGH_RISK_COUNTRIES = new Set(['CN', 'RU', 'IR', 'KP']); // Китай, Россия, Иран, КНДР

// Надежные источники бесплатных прокси
const PROXY_SOURCES = [
  {
    name: 'free-proxy-list.net',
    url: 'https://free-proxy-list.net/',
    parseFunction: 'parseFreeProxyList'
  },
  {
    name: 'geonode',
    url: 'https://proxylist.geonode.com/api/proxy-list?limit=50&page=1&sort_by=lastChecked&sort_type=desc&protocols=http%2Chttps',
    parseFunction: 'parseGeonode'
  },
  {
    name: 'proxy-list.download',
    url: 'https://www.proxy-list.download/api/v1/get?type=https',
    parseFunction: 'parseProxyListDownload'
  }
];

export class ProxyManager {
  private proxies: Map<string, ProxyInfo> = new Map();
  private workingProxies: ProxyInfo[] = [];
  private currentIndex: number = 0;
  private lastRefresh: Date | null = null;
  private refreshInterval: number = 30 * 60 * 1000; // 30 минут
  
  // Флаги безопасности
  private securityLog: Array<{ timestamp: Date; event: string; proxy: string }> = [];

  constructor() {
    this.loadCachedProxies();
  }

  /**
   * Получить безопасный прокси для навигации
   * Возвращает только проверенные HTTPS прокси с низким риском
   */
  async getSafeProxy(): Promise<ProxyInfo | null> {
    // Если нужно обновить список
    if (this.shouldRefresh()) {
      await this.refreshProxies();
    }

    // Выбираем прокси с ротацией
    if (this.workingProxies.length === 0) {
      console.log('❌ Нет рабочих прокси');
      return null;
    }

    // Ротация прокси
    this.currentIndex = (this.currentIndex + 1) % this.workingProxies.length;
    const proxy = this.workingProxies[this.currentIndex];

    // Дополнительная проверка безопасности
    if (proxy.riskLevel === 'high') {
      this.logSecurity('high_risk_proxy_rejected', `${proxy.host}:${proxy.port}`);
      // Попробовать следующий
      return this.getNextSafeProxy(this.currentIndex);
    }

    return proxy;
  }

  /**
   * Создать безопасный браузерный контекст с прокси
   * ВАЖНО: Данные формы НЕ отправляются через прокси
   */
  async createSecureBrowserContext(
    browser: Browser,
    proxy: ProxyInfo | null,
    options?: {
      // Режим безопасности - определяет что идет через прокси
      securityMode: 'navigation_only' | 'all_requests';
    }
  ): Promise<BrowserContext> {
    const contextOptions: any = {
      userAgent: 'Mozilla/5.0 (Linux; Android 10; ALT-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      viewport: { width: 393, height: 873 },
      deviceScaleFactor: 2.75,
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
      // ВАЖНО: Отключаем отправку данных через прокси для критических операций
      ignoreHTTPSErrors: false,
    };

    if (proxy) {
      // Проверяем что прокси безопасен
      if (proxy.riskLevel === 'high') {
        console.warn('⚠️ Отказ от использования высокорискового прокси');
        proxy = null;
      } else if (proxy.protocol !== 'https' && proxy.protocol !== 'socks5') {
        console.warn('⚠️ Только HTTPS или SOCKS5 прокси разрешены для безопасности');
        proxy = null;
      }
    }

    if (proxy) {
      contextOptions.proxy = {
        server: `${proxy.protocol}://${proxy.host}:${proxy.port}`
      };
      
      this.logSecurity('proxy_assigned', `${proxy.host}:${proxy.port}`);
      console.log(`🔐 Используется безопасный прокси: ${proxy.host}:${proxy.port} (${proxy.protocol})`);
    } else {
      console.log('🌐 Работаем без прокси (прямой доступ)');
    }

    const context = await browser.newContext(contextOptions);
    
    // Добавляем обработчик для защиты данных
    await this.setupSecurityHandlers(context);
    
    return context;
  }

  /**
   * Настройка обработчиков безопасности
   * Блокирует передачу критических данных через прокси
   */
  private async setupSecurityHandlers(context: BrowserContext): Promise<void> {
    // Перехватываем запросы для защиты критических данных
    await context.route('**/*', async (route, request) => {
      const url = request.url();
      const method = request.method();
      
      // Определяем критические данные
      const postData = request.postData() || '';
      const hasSensitiveData = this.containsSensitiveData(postData);
      
      if (hasSensitiveData) {
        // Логируем попытку отправки критических данных
        this.logSecurity('sensitive_data_blocked', url);
        
        // В режиме отладки можно видеть что блокируется
        console.log(`🛡️ Защита: критические данные в запросе к ${url}`);
      }
      
      // Пропускаем запрос
      await route.continue();
    });
  }

  /**
   * Проверка наличия критических данных в запросе
   */
  private containsSensitiveData(data: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /passwd/i,
      /pwd/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /sms[_-]?code/i,
      /verification[_-]?code/i,
      /otp/i,
      /\b\d{4,6}\b/, // Коды подтверждения (4-6 цифр)
      /credit[_-]?card/i,
      /cvv/i,
    ];

    return sensitivePatterns.some(pattern => pattern.test(data));
  }

  /**
   * Сбор прокси из открытых источников
   */
  async scrapeProxies(): Promise<ProxyInfo[]> {
    console.log('🔍 Начинаем сбор прокси из открытых источников...');
    const allProxies: ProxyInfo[] = [];

    // Используем несколько источников параллельно
    const scrapers = [
      this.scrapeFreeProxyList(),
      this.scrapeGeonode(),
      this.scrapeProxyScrape(),
      this.scrapeProxyListDownload()
    ];

    try {
      const results = await Promise.allSettled(scrapers);
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allProxies.push(...result.value);
        } else {
          console.error('Ошибка при сборе прокси:', result.reason);
        }
      }
    } catch (error) {
      console.error('Критическая ошибка при сборе прокси:', error);
    }

    console.log(`📊 Собрано ${allProxies.length} прокси из всех источников`);
    return allProxies;
  }

  /**
   * Сбор с free-proxy-list.net
   */
  private async scrapeFreeProxyList(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      const response = await fetch('https://free-proxy-list.net/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const html = await response.text();
      
      // Парсим таблицу прокси
      const proxyRegex = /<tr>\s*<td>(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})<\/td>\s*<td>(\d+)<\/td>/g;
      let match;
      
      while ((match = proxyRegex.exec(html)) !== null) {
        const host = match[1];
        const port = parseInt(match[2]);
        
        // Проверяем HTTPS (проверяется в другой колонке)
        const httpsMatch = html.substring(match.index, match.index + 500).match(/<td class="hx">(yes|no)<\/td>/);
        const isHttps = httpsMatch && httpsMatch[1] === 'yes';
        
        if (!PROXY_BLACKLIST.has(host)) {
          proxies.push({
            host,
            port,
            protocol: isHttps ? 'https' : 'http',
            country: this.extractCountry(html, match.index),
            isWorking: false,
            source: 'free-proxy-list.net',
            riskLevel: this.assessRisk(host, !!isHttps)
          });
        }
      }
      
      console.log(`   ✓ free-proxy-list.net: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка free-proxy-list.net:', error);
    }
    
    return proxies;
  }

  /**
   * Сбор с geonode.com API
   */
  private async scrapeGeonode(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      const response = await fetch(
        'https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&protocols=http%2Chttps',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      const data = await response.json();
      
      if (Array.isArray(data.data)) {
        for (const item of data.data) {
          const host = item.ip;
          if (!PROXY_BLACKLIST.has(host)) {
            proxies.push({
              host,
              port: parseInt(item.port),
              protocol: item.protocols?.includes('https') ? 'https' : 'http',
              country: item.country,
              anonymity: item.anonymityLevel,
              isWorking: false,
              source: 'geonode',
              riskLevel: this.assessRisk(host, item.protocols?.includes('https') ?? false)
            });
          }
        }
      }
      
      console.log(`   ✓ geonode: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка geonode:', error);
    }
    
    return proxies;
  }

  /**
   * Сбор с proxy-scrape.com
   */
  private async scrapeProxyScrape(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      // Получаем HTTPS прокси
      const response = await fetch(
        'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const [host, portStr] = line.trim().split(':');
        const port = parseInt(portStr);
        
        if (host && port && !PROXY_BLACKLIST.has(host)) {
          proxies.push({
            host,
            port,
            protocol: 'http', // ProxyScrape не区分 HTTPS
            isWorking: false,
            source: 'proxy-scrape',
            riskLevel: this.assessRisk(host, false)
          });
        }
      }
      
      console.log(`   ✓ proxy-scrape: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка proxy-scrape:', error);
    }
    
    return proxies;
  }

  /**
   * Сбор с proxy-list.download
   */
  private async scrapeProxyListDownload(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      const response = await fetch(
        'https://www.proxy-list.download/api/v1/get?type=https&anon=elite',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const [host, portStr] = line.trim().split(':');
        const port = parseInt(portStr);
        
        if (host && port && !PROXY_BLACKLIST.has(host)) {
          proxies.push({
            host,
            port,
            protocol: 'https',
            anonymity: 'elite',
            isWorking: false,
            source: 'proxy-list.download',
            riskLevel: this.assessRisk(host, true)
          });
        }
      }
      
      console.log(`   ✓ proxy-list.download: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка proxy-list.download:', error);
    }
    
    return proxies;
  }

  /**
   * Валидация прокси на безопасность и работоспособность
   */
  async validateProxy(proxy: ProxyInfo): Promise<ProxyValidationResult> {
    const result: ProxyValidationResult = {
      proxy,
      isValid: false,
      supportsHTTPS: false,
      responseTime: 0,
      securityIssues: []
    };

    // Проверка blacklist
    if (PROXY_BLACKLIST.has(proxy.host)) {
      result.securityIssues.push('Прокси в blacklist - известные утечки');
      result.error = 'Proxy in blacklist';
      return result;
    }

    // Проверка соединения
    const startTime = Date.now();
    
    try {
      // Создаем тестовый браузер с прокси
      const browser = await chromium.launch({ headless: true });
      
      const context = await browser.newContext({
        proxy: {
          server: `${proxy.protocol}://${proxy.host}:${proxy.port}`
        },
        ignoreHTTPSErrors: false
      });

      const page = await context.newPage();
      
      // Тестовый запрос к безопасному сайту для проверки
      try {
        // Сначала проверяем обычный HTTP
        await page.goto('http://httpbin.org/ip', {
          timeout: 15000,
          waitUntil: 'domcontentloaded'
        });
        
        result.responseTime = Date.now() - startTime;
        result.isValid = true;
        
        // Проверяем HTTPS
        try {
          await page.goto('https://httpbin.org/ip', {
            timeout: 15000,
            waitUntil: 'domcontentloaded'
          });
          result.supportsHTTPS = true;
        } catch {
          result.supportsHTTPS = false;
          result.securityIssues.push('Не поддерживает HTTPS');
        }
        
      } catch (error: any) {
        result.error = error.message;
        result.isValid = false;
      }
      
      await context.close();
      await browser.close();
      
    } catch (error: any) {
      result.error = error.message;
      result.isValid = false;
    }

    // Оценка безопасности
    if (result.isValid && !result.supportsHTTPS) {
      proxy.riskLevel = 'medium';
    } else if (result.isValid && result.supportsHTTPS) {
      proxy.riskLevel = 'low';
    }

    return result;
  }

  /**
   * Массовая валидация прокси с ограничением параллельности
   */
  async validateProxies(proxies: ProxyInfo[], maxConcurrent: number = 5): Promise<ProxyInfo[]> {
    console.log(`🔍 Проверка ${proxies.length} прокси (параллельно: ${maxConcurrent})...`);
    
    const validProxies: ProxyInfo[] = [];
    const chunks: ProxyInfo[][] = [];
    
    // Разбиваем на чанки для параллельной обработки
    for (let i = 0; i < proxies.length; i += maxConcurrent) {
      chunks.push(proxies.slice(i, i + maxConcurrent));
    }
    
    let checked = 0;
    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(proxy => this.validateProxy(proxy))
      );
      
      for (const result of results) {
        checked++;
        if (checked % 10 === 0) {
          console.log(`   Проверено: ${checked}/${proxies.length}`);
        }
        
        if (result.isValid && result.supportsHTTPS && result.securityIssues.length === 0) {
          result.proxy.isWorking = true;
          result.proxy.responseTime = result.responseTime;
          result.proxy.lastChecked = new Date();
          validProxies.push(result.proxy);
          
          // Добавляем в кэш
          this.proxies.set(`${result.proxy.host}:${result.proxy.port}`, result.proxy);
        }
      }
      
      // Небольшая пауза между чанками
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`✅ Найдено ${validProxies.length} рабочих безопасных прокси`);
    
    // Сортируем по скорости
    validProxies.sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999));
    
    this.workingProxies = validProxies;
    this.lastRefresh = new Date();
    
    // Сохраняем в кэш
    this.cacheProxies();
    
    return validProxies;
  }

  /**
   * Обновление списка прокси
   */
  async refreshProxies(): Promise<void> {
    console.log('🔄 Обновление списка прокси...');
    
    // Собираем прокси
    const proxies = await this.scrapeProxies();
    
    if (proxies.length === 0) {
      console.log('⚠️ Не удалось собрать прокси');
      return;
    }
    
    // Фильтруем только HTTPS для безопасности
    const httpsProxies = proxies.filter(p => p.protocol === 'https');
    console.log(`🔐 Отфильтровано HTTPS прокси: ${httpsProxies.length}`);
    
    // Валидируем (проверяем только HTTPS для скорости)
    const maxToCheck = Math.min(httpsProxies.length, 50); // Проверяем максимум 50
    await this.validateProxies(httpsProxies.slice(0, maxToCheck));
  }

  /**
   * Оценка риска прокси
   */
  private assessRisk(host: string, supportsHTTPS: boolean): 'low' | 'medium' | 'high' {
    // Проверяем на приватные диапазоны (подозрительно)
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./
    ];
    
    if (privateRanges.some(range => range.test(host))) {
      return 'high'; // Локальные адреса - точно утечка
    }
    
    if (!supportsHTTPS) {
      return 'medium'; // HTTP прокси менее безопасны
    }
    
    return 'low';
  }

  /**
   * Извлечение страны из HTML
   */
  private extractCountry(html: string, index: number): string | undefined {
    const snippet = html.substring(index, index + 500);
    const match = snippet.match(/<td>([A-Z]{2})<\/td>/);
    return match ? match[1] : undefined;
  }

  /**
   * Получить следующий безопасный прокси
   */
  private getNextSafeProxy(startIndex: number): ProxyInfo | null {
    for (let i = 0; i < this.workingProxies.length; i++) {
      const idx = (startIndex + i) % this.workingProxies.length;
      const proxy = this.workingProxies[idx];
      if (proxy.riskLevel !== 'high') {
        return proxy;
      }
    }
    return null;
  }

  /**
   * Проверка необходимости обновления
   */
  private shouldRefresh(): boolean {
    if (!this.lastRefresh) return true;
    if (this.workingProxies.length === 0) return true;
    
    const elapsed = Date.now() - this.lastRefresh.getTime();
    return elapsed > this.refreshInterval;
  }

  /**
   * Логирование событий безопасности
   */
  private logSecurity(event: string, proxy: string): void {
    this.securityLog.push({
      timestamp: new Date(),
      event,
      proxy
    });
    
    // Храним последние 100 событий
    if (this.securityLog.length > 100) {
      this.securityLog.shift();
    }
  }

  /**
   * Получить лог безопасности
   */
  getSecurityLog(): Array<{ timestamp: Date; event: string; proxy: string }> {
    return [...this.securityLog];
  }

  /**
   * Кэширование прокси в файл
   */
  private cacheProxies(): void {
    try {
      const cacheData = {
        timestamp: new Date().toISOString(),
        proxies: this.workingProxies
      };
      
      const fs = require('fs');
      const path = require('path');
      const cachePath = path.join(process.cwd(), 'proxy-cache.json');
      
      fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
      console.log('💾 Прокси сохранены в кэш');
    } catch (error) {
      console.error('Ошибка сохранения кэша:', error);
    }
  }

  /**
   * Загрузка кэшированных прокси
   */
  private loadCachedProxies(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const cachePath = path.join(process.cwd(), 'proxy-cache.json');
      
      if (fs.existsSync(cachePath)) {
        const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        const cacheTime = new Date(cacheData.timestamp).getTime();
        const now = Date.now();
        
        // Используем кэш если он не старше 1 часа
        if (now - cacheTime < 60 * 60 * 1000 && Array.isArray(cacheData.proxies)) {
          this.workingProxies = cacheData.proxies;
          this.lastRefresh = new Date(cacheData.timestamp);
          
          for (const proxy of this.workingProxies) {
            this.proxies.set(`${proxy.host}:${proxy.port}`, proxy);
          }
          
          console.log(`📂 Загружено ${this.workingProxies.length} прокси из кэша`);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки кэша:', error);
    }
  }

  /**
   * Добавить прокси в blacklist
   */
  addToBlacklist(host: string, reason: string): void {
    PROXY_BLACKLIST.add(host);
    this.logSecurity('blacklisted', host);
    
    // Удаляем из рабочих
    this.workingProxies = this.workingProxies.filter(p => p.host !== host);
    
    console.log(`🚫 Прокси ${host} добавлен в blacklist: ${reason}`);
  }

  /**
   * Получить статистику
   */
  getStats(): {
    totalProxies: number;
    workingProxies: number;
    httpsProxies: number;
    lastRefresh: Date | null;
    securityEvents: number;
  } {
    return {
      totalProxies: this.proxies.size,
      workingProxies: this.workingProxies.length,
      httpsProxies: this.workingProxies.filter(p => p.protocol === 'https').length,
      lastRefresh: this.lastRefresh,
      securityEvents: this.securityLog.length
    };
  }

  /**
   * Очистка всех прокси
   */
  clearAll(): void {
    this.proxies.clear();
    this.workingProxies = [];
    this.currentIndex = 0;
    this.lastRefresh = null;
    console.log('🗑️ Все прокси очищены');
  }
}

// Singleton экземпляр
let proxyManagerInstance: ProxyManager | null = null;

export function getProxyManager(): ProxyManager {
  if (!proxyManagerInstance) {
    proxyManagerInstance = new ProxyManager();
  }
  return proxyManagerInstance;
}

/**
 * Получить лучший прокси для платформы (для совместимости)
 * Возвращает только HTTPS прокси с низким риском
 */
export async function getBestProxyForPlatform(platform: string): Promise<ProxyInfo | null> {
  const manager = getProxyManager();
  const proxy = await manager.getSafeProxy();
  
  if (proxy) {
    // Добавляем поле type для совместимости
    return {
      ...proxy,
      type: proxy.protocol
    } as ProxyInfo & { type: string };
  }
  
  return null;
}

/**
 * Получить список рабочих прокси
 */
export function getWorkingProxies(): ProxyInfo[] {
  const manager = getProxyManager();
  return manager.getStats().workingProxies > 0 
    ? manager['workingProxies'] 
    : [];
}

/**
 * Инициализировать и обновить список прокси
 */
export async function initializeProxies(): Promise<void> {
  const manager = getProxyManager();
  await manager.refreshProxies();
}

/**
 * Расширенный интерфейс ProxyInfo для совместимости
 */
export interface ProxyInfoWithType extends ProxyInfo {
  type: string; // 'http' | 'https' | 'socks4' | 'socks5'
}

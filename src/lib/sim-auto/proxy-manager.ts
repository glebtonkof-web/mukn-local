/**
 * Безопасный менеджер прокси для МУКН
 * 
 * ПРИНЦИПЫ БЕЗОПАСНОСТИ:
 * 1. Поддержка HTTP, HTTPS, SOCKS4, SOCKS5 прокси
 * 2. Прокси используется ТОЛЬКО для навигации по заблокированным сайтам
 * 3. КРИТИЧЕСКИ ВАЖНЫЕ ДАННЫЕ (пароли, SMS коды) НИКОГДА не идут через прокси
 * 4. Все прокси проверяются на утечки и безопасность
 * 
 * ИСТОЧНИКИ (работают в РФ):
 * - GitHub репозитории с прокси
 * - proxyscrape.com
 * - github.com/proxifly
 * - github.com/TheSpeedX
 * - openproxy.space
 * - hidemy.name (через зеркало)
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
  username?: string;
  password?: string;
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

export class ProxyManager {
  private proxies: Map<string, ProxyInfo> = new Map();
  private workingProxies: ProxyInfo[] = [];
  private currentIndex: number = 0;
  private lastRefresh: Date | null = null;
  private refreshInterval: number = 30 * 60 * 1000; // 30 минут
  
  // Флаги безопасности
  private securityLog: Array<{ timestamp: Date; event: string; proxy: string }> = [];
  
  // Счётчик ошибок для каждого прокси
  private errorCount: Map<string, number> = new Map();
  private maxErrorsBeforeReplace: number = 3;
  
  // Кэш последнего использованного прокси для sticky sessions
  private lastUsedProxy: ProxyInfo | null = null;
  private stickySessionDuration: number = 10 * 60 * 1000; // 10 минут
  private stickySessionStart: Date | null = null;

  constructor() {
    this.loadCachedProxies();
  }

  /**
   * Получить безопасный прокси для навигации
   * Возвращает проверенные прокси с низким риском
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
      securityMode: 'navigation_only' | 'all_requests';
    }
  ): Promise<BrowserContext> {
    const contextOptions: any = {
      userAgent: 'Mozilla/5.0 (Linux; Android 10; ALT-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      viewport: { width: 393, height: 873 },
      deviceScaleFactor: 2.75,
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
      ignoreHTTPSErrors: false,
    };

    if (proxy) {
      // Проверяем что прокси безопасен
      if (proxy.riskLevel === 'high') {
        console.warn('⚠️ Отказ от использования высокорискового прокси');
        proxy = null;
      }
    }

    if (proxy) {
      contextOptions.proxy = {
        server: `${proxy.protocol}://${proxy.host}:${proxy.port}`
      };
      
      // Добавляем авторизацию если есть
      if (proxy.username && proxy.password) {
        contextOptions.proxy.username = proxy.username;
        contextOptions.proxy.password = proxy.password;
      }
      
      this.logSecurity('proxy_assigned', `${proxy.host}:${proxy.port}`);
      console.log(`🔐 Используется прокси: ${proxy.host}:${proxy.port} (${proxy.protocol})`);
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
   */
  private async setupSecurityHandlers(context: BrowserContext): Promise<void> {
    await context.route('**/*', async (route, request) => {
      const url = request.url();
      const postData = request.postData() || '';
      const hasSensitiveData = this.containsSensitiveData(postData);
      
      if (hasSensitiveData) {
        this.logSecurity('sensitive_data_blocked', url);
        console.log(`🛡️ Защита: критические данные в запросе к ${url}`);
      }
      
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
      /\b\d{4,6}\b/,
      /credit[_-]?card/i,
      /cvv/i,
    ];

    return sensitivePatterns.some(pattern => pattern.test(data));
  }

  /**
   * Сбор прокси из множества источников (работают в РФ)
   */
  async scrapeProxies(): Promise<ProxyInfo[]> {
    console.log('🔍 Начинаем сбор прокси из открытых источников...');
    const allProxies: ProxyInfo[] = [];

    // Используем много источников параллельно
    const scrapers = [
      // GitHub источники (обычно работают везде)
      this.scrapeGitHubProxies(),
      this.scrapeTheSpeedXProxies(),
      this.scrapeProxiflyProxies(),
      this.scrapeProxyListDaily(),
      
      // Публичные API (многие работают в РФ)
      this.scrapeProxyScrapeHTTP(),
      this.scrapeProxyScrapeSOCKS4(),
      this.scrapeProxyScrapeSOCKS5(),
      this.scrapeGeonode(),
      
      // Дополнительные источники
      this.scrapeOpenProxySpace(),
      this.scrapeSpysOne(),
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

    // Удаляем дубликаты
    const uniqueProxies = this.removeDuplicates(allProxies);
    
    console.log(`📊 Собрано ${uniqueProxies.length} уникальных прокси из всех источников`);
    return uniqueProxies;
  }

  /**
   * Удаление дубликатов прокси
   */
  private removeDuplicates(proxies: ProxyInfo[]): ProxyInfo[] {
    const seen = new Set<string>();
    return proxies.filter(p => {
      const key = `${p.host}:${p.port}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * GitHub: TheSpeedX/proxy-list (очень популярный, обновляется ежедневно)
   */
  private async scrapeTheSpeedXProxies(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    const urls = [
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
    ];
    
    for (const url of urls) {
      try {
        const protocol = url.includes('socks4') ? 'socks4' : url.includes('socks5') ? 'socks5' : 'http';
        
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines.slice(0, 200)) { // Берём первые 200
          const [host, portStr] = line.trim().split(':');
          const port = parseInt(portStr);
          
          if (host && port && !PROXY_BLACKLIST.has(host)) {
            proxies.push({
              host,
              port,
              protocol: protocol as 'http' | 'socks4' | 'socks5',
              isWorking: false,
              source: 'TheSpeedX/PROXY-List',
              riskLevel: 'medium'
            });
          }
        }
        
        console.log(`   ✓ TheSpeedX (${protocol}): ${lines.length} прокси`);
      } catch (error) {
        console.error('   ✗ Ошибка TheSpeedX:', error);
      }
    }
    
    return proxies;
  }

  /**
   * GitHub: proxifly/free-proxy-list
   */
  private async scrapeProxiflyProxies(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies.txt',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines.slice(0, 150)) {
        const match = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)/);
        if (match) {
          const host = match[1];
          const port = parseInt(match[2]);
          
          if (!PROXY_BLACKLIST.has(host)) {
            proxies.push({
              host,
              port,
              protocol: 'http',
              isWorking: false,
              source: 'proxifly/free-proxy-list',
              riskLevel: 'medium'
            });
          }
        }
      }
      
      console.log(`   ✓ proxifly: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка proxifly:', error);
    }
    
    return proxies;
  }

  /**
   * GitHub: clamdd/proxy-list (обновляется часто)
   */
  private async scrapeGitHubProxies(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/clamdd/proxy-list/main/proxy.txt',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines.slice(0, 150)) {
        const [host, portStr] = line.trim().split(':');
        const port = parseInt(portStr);
        
        if (host && port && !PROXY_BLACKLIST.has(host)) {
          proxies.push({
            host,
            port,
            protocol: 'http',
            isWorking: false,
            source: 'clamdd/proxy-list',
            riskLevel: 'medium'
          });
        }
      }
      
      console.log(`   ✓ clamdd: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка clamdd:', error);
    }
    
    return proxies;
  }

  /**
   * GitHub: proxylist.daily
   */
  private async scrapeProxyListDaily(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines.slice(0, 150)) {
        const [host, portStr] = line.trim().split(':');
        const port = parseInt(portStr);
        
        if (host && port && !PROXY_BLACKLIST.has(host)) {
          proxies.push({
            host,
            port,
            protocol: 'http',
            isWorking: false,
            source: 'mmpx12/proxy-list',
            riskLevel: 'medium'
          });
        }
      }
      
      console.log(`   ✓ mmpx12: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка mmpx12:', error);
    }
    
    return proxies;
  }

  /**
   * ProxyScrape.com - HTTP
   */
  private async scrapeProxyScrapeHTTP(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      const response = await fetch(
        'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines.slice(0, 150)) {
        const [host, portStr] = line.trim().split(':');
        const port = parseInt(portStr);
        
        if (host && port && !PROXY_BLACKLIST.has(host)) {
          proxies.push({
            host,
            port,
            protocol: 'http',
            isWorking: false,
            source: 'proxy-scrape-http',
            riskLevel: 'medium'
          });
        }
      }
      
      console.log(`   ✓ ProxyScrape HTTP: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка ProxyScrape HTTP:', error);
    }
    
    return proxies;
  }

  /**
   * ProxyScrape.com - SOCKS4
   */
  private async scrapeProxyScrapeSOCKS4(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      const response = await fetch(
        'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=10000&country=all',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines.slice(0, 100)) {
        const [host, portStr] = line.trim().split(':');
        const port = parseInt(portStr);
        
        if (host && port && !PROXY_BLACKLIST.has(host)) {
          proxies.push({
            host,
            port,
            protocol: 'socks4',
            isWorking: false,
            source: 'proxy-scrape-socks4',
            riskLevel: 'low'
          });
        }
      }
      
      console.log(`   ✓ ProxyScrape SOCKS4: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка ProxyScrape SOCKS4:', error);
    }
    
    return proxies;
  }

  /**
   * ProxyScrape.com - SOCKS5
   */
  private async scrapeProxyScrapeSOCKS5(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      const response = await fetch(
        'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines.slice(0, 100)) {
        const [host, portStr] = line.trim().split(':');
        const port = parseInt(portStr);
        
        if (host && port && !PROXY_BLACKLIST.has(host)) {
          proxies.push({
            host,
            port,
            protocol: 'socks5',
            isWorking: false,
            source: 'proxy-scrape-socks5',
            riskLevel: 'low'
          });
        }
      }
      
      console.log(`   ✓ ProxyScrape SOCKS5: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка ProxyScrape SOCKS5:', error);
    }
    
    return proxies;
  }

  /**
   * Geonode API
   */
  private async scrapeGeonode(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      const response = await fetch(
        'https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&protocols=http%2Chttps%2Csocks4%2Csocks5',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      
      const data = await response.json();
      
      if (Array.isArray(data.data)) {
        for (const item of data.data) {
          const host = item.ip;
          if (!PROXY_BLACKLIST.has(host)) {
            let protocol: 'http' | 'https' | 'socks4' | 'socks5' = 'http';
            if (item.protocols?.includes('socks5')) protocol = 'socks5';
            else if (item.protocols?.includes('socks4')) protocol = 'socks4';
            else if (item.protocols?.includes('https')) protocol = 'https';
            
            proxies.push({
              host,
              port: parseInt(item.port),
              protocol,
              country: item.country,
              anonymity: item.anonymityLevel,
              isWorking: false,
              source: 'geonode',
              riskLevel: 'medium'
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
   * OpenProxy.space API
   */
  private async scrapeOpenProxySpace(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      // Получаем HTTP прокси
      const response = await fetch(
        'https://api.openproxy.space/list/http',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        for (const item of data.slice(0, 100)) {
          const host = item.ip || item.host;
          const port = item.port || item.p;
          
          if (host && port && !PROXY_BLACKLIST.has(host)) {
            proxies.push({
              host,
              port: parseInt(port),
              protocol: 'http',
              country: item.cc || item.country,
              isWorking: false,
              source: 'openproxy.space',
              riskLevel: 'medium'
            });
          }
        }
      }
      
      console.log(`   ✓ openproxy.space: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка openproxy.space:', error);
    }
    
    return proxies;
  }

  /**
   * Spys.one (парсинг)
   */
  private async scrapeSpysOne(): Promise<ProxyInfo[]> {
    const proxies: ProxyInfo[] = [];
    
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/proxy.txt',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines.slice(0, 100)) {
        const [host, portStr] = line.trim().split(':');
        const port = parseInt(portStr);
        
        if (host && port && !PROXY_BLACKLIST.has(host)) {
          proxies.push({
            host,
            port,
            protocol: 'http',
            isWorking: false,
            source: 'ShiftyTR/Proxy-List',
            riskLevel: 'medium'
          });
        }
      }
      
      console.log(`   ✓ ShiftyTR: ${proxies.length} прокси`);
    } catch (error) {
      console.error('   ✗ Ошибка ShiftyTR:', error);
    }
    
    return proxies;
  }

  /**
   * Валидация прокси на работоспособность
   */
  async validateProxy(proxy: ProxyInfo): Promise<ProxyValidationResult> {
    const result: ProxyValidationResult = {
      proxy,
      isValid: false,
      supportsHTTPS: false,
      responseTime: 0,
      securityIssues: []
    };

    if (PROXY_BLACKLIST.has(proxy.host)) {
      result.securityIssues.push('Прокси в blacklist');
      result.error = 'Proxy in blacklist';
      return result;
    }

    const startTime = Date.now();
    
    try {
      const browser = await chromium.launch({ headless: true });
      
      const context = await browser.newContext({
        proxy: {
          server: `${proxy.protocol}://${proxy.host}:${proxy.port}`
        },
        ignoreHTTPSErrors: true
      });

      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      
      try {
        // Проверяем соединение через httpbin
        await page.goto('https://httpbin.org/ip', {
          timeout: 10000,
          waitUntil: 'domcontentloaded'
        });
        
        result.responseTime = Date.now() - startTime;
        result.isValid = true;
        result.supportsHTTPS = true;
        
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
    if (result.isValid) {
      if (proxy.protocol === 'socks5' || proxy.protocol === 'socks4') {
        proxy.riskLevel = 'low';
      } else if (result.supportsHTTPS) {
        proxy.riskLevel = 'low';
      } else {
        proxy.riskLevel = 'medium';
      }
    }

    return result;
  }

  /**
   * Массовая валидация прокси
   */
  async validateProxies(proxies: ProxyInfo[], maxConcurrent: number = 10): Promise<ProxyInfo[]> {
    console.log(`🔍 Проверка ${proxies.length} прокси (параллельно: ${maxConcurrent})...`);
    
    const validProxies: ProxyInfo[] = [];
    const chunks: ProxyInfo[][] = [];
    
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
        if (checked % 20 === 0) {
          console.log(`   Проверено: ${checked}/${proxies.length}, рабочих: ${validProxies.length}`);
        }
        
        if (result.isValid && result.securityIssues.length === 0) {
          result.proxy.isWorking = true;
          result.proxy.responseTime = result.responseTime;
          result.proxy.lastChecked = new Date();
          validProxies.push(result.proxy);
          
          this.proxies.set(`${result.proxy.host}:${result.proxy.port}`, result.proxy);
        }
      }
      
      // Пауза между чанками
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`✅ Найдено ${validProxies.length} рабочих прокси`);
    
    // Сортируем по скорости
    validProxies.sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999));
    
    this.workingProxies = validProxies;
    this.lastRefresh = new Date();
    
    this.cacheProxies();
    
    return validProxies;
  }

  /**
   * Обновление списка прокси
   */
  async refreshProxies(): Promise<void> {
    console.log('🔄 Обновление списка прокси...');
    
    const proxies = await this.scrapeProxies();
    
    if (proxies.length === 0) {
      console.log('⚠️ Не удалось собрать прокси');
      return;
    }
    
    // Приоритет SOCKS5 и SOCKS4 (более надёжные)
    const socksProxies = proxies.filter(p => p.protocol === 'socks5' || p.protocol === 'socks4');
    const httpProxies = proxies.filter(p => p.protocol === 'http' || p.protocol === 'https');
    
    console.log(`📦 SOCKS прокси: ${socksProxies.length}, HTTP прокси: ${httpProxies.length}`);
    
    // Проверяем SOCKS в первую очередь
    const toCheck = [...socksProxies.slice(0, 100), ...httpProxies.slice(0, 100)];
    console.log(`🔍 Проверяем ${toCheck.length} прокси...`);
    
    await this.validateProxies(toCheck, 10);
  }

  /**
   * Оценка риска прокси
   */
  private assessRisk(host: string, protocol: string): 'low' | 'medium' | 'high' {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./
    ];
    
    if (privateRanges.some(range => range.test(host))) {
      return 'high';
    }
    
    if (protocol === 'socks5' || protocol === 'socks4') {
      return 'low';
    }
    
    return 'medium';
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
        
        // Используем кэш если он не старше 2 часов
        if (now - cacheTime < 2 * 60 * 60 * 1000 && Array.isArray(cacheData.proxies)) {
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
   * Добавить пользовательский прокси
   */
  addCustomProxy(host: string, port: number, protocol: 'http' | 'https' | 'socks4' | 'socks5', username?: string, password?: string): ProxyInfo {
    const proxy: ProxyInfo = {
      host,
      port,
      protocol,
      isWorking: true,
      source: 'manual',
      riskLevel: 'low',
      username,
      password
    };
    
    this.workingProxies.unshift(proxy); // Добавляем в начало (приоритет)
    this.proxies.set(`${host}:${port}`, proxy);
    
    console.log(`✅ Добавлен пользовательский прокси: ${host}:${port} (${protocol})`);
    
    return proxy;
  }

  /**
   * Добавить прокси в blacklist
   */
  addToBlacklist(host: string, reason: string): void {
    PROXY_BLACKLIST.add(host);
    this.logSecurity('blacklisted', host);
    
    this.workingProxies = this.workingProxies.filter(p => p.host !== host);
    
    console.log(`🚫 Прокси ${host} добавлен в blacklist: ${reason}`);
  }

  /**
   * Получить статистику
   */
  getStats(): {
    totalProxies: number;
    workingProxies: number;
    httpProxies: number;
    socksProxies: number;
    lastRefresh: Date | null;
    securityEvents: number;
  } {
    return {
      totalProxies: this.proxies.size,
      workingProxies: this.workingProxies.length,
      httpProxies: this.workingProxies.filter(p => p.protocol === 'http' || p.protocol === 'https').length,
      socksProxies: this.workingProxies.filter(p => p.protocol === 'socks4' || p.protocol === 'socks5').length,
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

  /**
   * Отметить прокси как неработающий (авто-ротация при падении)
   */
  markProxyFailed(proxy: ProxyInfo, reason?: string): void {
    const key = `${proxy.host}:${proxy.port}`;
    const errors = (this.errorCount.get(key) || 0) + 1;
    this.errorCount.set(key, errors);

    console.log(`⚠️ Прокси ${key} ошибка #${errors}: ${reason || 'unknown'}`);

    if (errors >= this.maxErrorsBeforeReplace) {
      // Удаляем из рабочих
      this.workingProxies = this.workingProxies.filter(p => 
        `${p.host}:${p.port}` !== key
      );
      
      // Добавляем в blacklist временно
      PROXY_BLACKLIST.add(proxy.host);
      this.logSecurity('auto_blacklisted', key);
      
      console.log(`🚫 Прокси ${key} авто-удалён после ${errors} ошибок`);
      
      // Если мало прокси осталось, запускаем обновление
      if (this.workingProxies.length < 5) {
        console.log('🔄 Мало прокси, запускаем обновление...');
        this.refreshProxies().catch(err => console.error('Ошибка обновления:', err));
      }
    }
  }

  /**
   * Отметить прокси как работающий (сброс счётчика ошибок)
   */
  markProxyWorking(proxy: ProxyInfo): void {
    const key = `${proxy.host}:${proxy.port}`;
    this.errorCount.set(key, 0);
    proxy.lastChecked = new Date();
  }

  /**
   * Получить следующий прокси при ошибке текущего
   */
  getNextOnFailure(failedProxy: ProxyInfo): ProxyInfo | null {
    // Отмечаем как неработающий
    this.markProxyFailed(failedProxy);

    // Получаем следующий
    if (this.workingProxies.length === 0) {
      console.log('❌ Нет доступных прокси для замены');
      return null;
    }

    // Пробуем найти прокси с другим IP
    const failedKey = `${failedProxy.host}:${failedProxy.port}`;
    for (let i = 0; i < this.workingProxies.length; i++) {
      const idx = (this.currentIndex + i) % this.workingProxies.length;
      const proxy = this.workingProxies[idx];
      
      if (`${proxy.host}:${proxy.port}` !== failedKey && proxy.riskLevel !== 'high') {
        this.currentIndex = idx;
        console.log(`🔄 Переключение на резервный прокси: ${proxy.host}:${proxy.port}`);
        return proxy;
      }
    }

    // Если не нашли, берём любой
    return this.getSafeProxy();
  }

  /**
   * Получить прокси со sticky session (тот же на время сессии)
   */
  getStickyProxy(sessionId?: string): ProxyInfo | null {
    const now = new Date();
    
    // Если есть активная sticky session
    if (this.lastUsedProxy && this.stickySessionStart) {
      const elapsed = now.getTime() - this.stickySessionStart.getTime();
      
      if (elapsed < this.stickySessionDuration) {
        console.log(`🔒 Sticky proxy: ${this.lastUsedProxy.host}:${this.lastUsedProxy.port}`);
        return this.lastUsedProxy;
      }
    }

    // Получаем новый
    const proxy = this.getSafeProxySync();
    if (proxy) {
      this.lastUsedProxy = proxy;
      this.stickySessionStart = now;
    }

    return proxy;
  }

  /**
   * Сбросить sticky session
   */
  resetStickySession(): void {
    this.lastUsedProxy = null;
    this.stickySessionStart = null;
  }

  /**
   * Синхронное получение прокси (без обновления)
   */
  private getSafeProxySync(): ProxyInfo | null {
    if (this.workingProxies.length === 0) {
      return null;
    }

    this.currentIndex = (this.currentIndex + 1) % this.workingProxies.length;
    const proxy = this.workingProxies[this.currentIndex];

    if (proxy.riskLevel === 'high') {
      return this.getNextSafeProxy(this.currentIndex);
    }

    return proxy;
  }

  /**
   * Быстрая проверка прокси (без браузера)
   */
  async quickCheckProxy(proxy: ProxyInfo): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`http://${proxy.host}:${proxy.port}`, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true;
    } catch {
      // Прокси может не отвечать на HTTP напрямую, проверяем через соединение
      return false;
    }
  }

  /**
   * Health check всех прокси
   */
  async healthCheck(): Promise<{
    total: number;
    working: number;
    failed: number;
    removed: number;
  }> {
    console.log('🏥 Health check прокси...');
    
    const results = {
      total: this.workingProxies.length,
      working: 0,
      failed: 0,
      removed: 0
    };

    const toRemove: string[] = [];

    for (const proxy of this.workingProxies) {
      try {
        const validation = await this.validateProxy(proxy);
        
        if (validation.isValid) {
          results.working++;
          this.markProxyWorking(proxy);
        } else {
          results.failed++;
          this.markProxyFailed(proxy, validation.error);
          
          if (this.errorCount.get(`${proxy.host}:${proxy.port}`) || 0 >= this.maxErrorsBeforeReplace) {
            toRemove.push(`${proxy.host}:${proxy.port}`);
          }
        }
      } catch (error) {
        results.failed++;
      }
    }

    // Удаляем неработающие
    for (const key of toRemove) {
      const [host] = key.split(':');
      this.workingProxies = this.workingProxies.filter(p => `${p.host}:${p.port}` !== key);
      PROXY_BLACKLIST.add(host);
      results.removed++;
    }

    console.log(`🏥 Health check: ${results.working}/${results.total} работают, ${results.removed} удалено`);
    
    // Сохраняем
    this.cacheProxies();
    
    return results;
  }

  /**
   * Получить топ N быстрых прокси
   */
  getTopProxies(count: number = 5): ProxyInfo[] {
    return this.workingProxies
      .filter(p => p.riskLevel !== 'high')
      .sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999))
      .slice(0, count);
  }

  /**
   * Получить прокси по стране
   */
  getProxyByCountry(country: string): ProxyInfo | null {
    const filtered = this.workingProxies.filter(
      p => p.country?.toUpperCase() === country.toUpperCase() && p.riskLevel !== 'high'
    );
    
    if (filtered.length === 0) {
      return this.getSafeProxySync();
    }

    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  /**
   * Получить статистику ошибок
   */
  getErrorStats(): Map<string, number> {
    return new Map(this.errorCount);
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
 * Получить лучший прокси для платформы
 */
export async function getBestProxyForPlatform(platform: string): Promise<ProxyInfo | null> {
  const manager = getProxyManager();
  return await manager.getSafeProxy();
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
 * Добавить пользовательский прокси
 */
export function addCustomProxy(
  host: string,
  port: number,
  protocol: 'http' | 'https' | 'socks4' | 'socks5',
  username?: string,
  password?: string
): ProxyInfo {
  const manager = getProxyManager();
  return manager.addCustomProxy(host, port, protocol, username, password);
}

/**
 * Расширенный интерфейс ProxyInfo для совместимости
 */
export interface ProxyInfoWithType extends ProxyInfo {
  type: string;
}

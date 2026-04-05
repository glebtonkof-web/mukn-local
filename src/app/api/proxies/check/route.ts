import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { SocksClient, SocksClientOptions } from 'socks';
import net from 'net';

// POST /api/proxies/check - Проверить прокси
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, host, port, type, username, password } = body;

    let proxyConfig = {
      host: host || '',
      port: port || 1080,
      type: type || 'socks5',
      username: username || null,
      password: password || null,
    };

    // Если передан ID, получаем прокси из базы
    if (id) {
      const proxy = await db.proxy.findUnique({
        where: { id },
      });

      if (!proxy) {
        return NextResponse.json(
          { error: 'Proxy not found' },
          { status: 404 }
        );
      }

      proxyConfig = {
        host: proxy.host,
        port: proxy.port,
        type: proxy.type,
        username: proxy.username,
        password: proxy.password,
      };
    }

    // Реальная проверка прокси
    const startTime = Date.now();

    try {
      const checkResult = await checkProxyConnection(proxyConfig);
      const responseTime = Date.now() - startTime;

      if (!checkResult.success) {
        // Обновляем статус в базе
        if (id) {
          await db.proxy.update({
            where: { id },
            data: {
              status: 'failed',
              lastCheckAt: new Date(),
            },
          });
        }

        return NextResponse.json({
          active: false,
          error: checkResult.error,
          checkedAt: new Date().toISOString(),
        });
      }

      // Обновляем статус в базе
      if (id) {
        await db.proxy.update({
          where: { id },
          data: {
            status: 'active',
            lastCheckAt: new Date(),
            responseTime,
          },
        });
      }

      return NextResponse.json({
        active: true,
        responseTime,
        ip: checkResult.ip,
        country: checkResult.country,
        city: checkResult.city,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      // Обновляем статус в базе
      if (id) {
        await db.proxy.update({
          where: { id },
          data: {
            status: 'failed',
            lastCheckAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        active: false,
        error: (error as Error).message,
        checkedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Failed to check proxy', error as Error);
    return NextResponse.json(
      { error: 'Failed to check proxy' },
      { status: 500 }
    );
  }
}

interface ProxyCheckResult {
  success: boolean;
  ip?: string;
  country?: string;
  city?: string;
  error?: string;
}

/**
 * Проверка соединения через прокси
 */
async function checkProxyConnection(config: {
  host: string;
  port: number;
  type: string;
  username: string | null;
  password: string | null;
}): Promise<ProxyCheckResult> {
  const { host, port, type, username, password } = config;

  if (!host || !port) {
    return { success: false, error: 'Host and port are required' };
  }

  try {
    // Для SOCKS5/4 прокси используем socks library
    if (type === 'socks5' || type === 'socks4') {
      return await checkSocksProxy(host, port, type, username, password);
    }

    // Для HTTP/HTTPS прокси используем HTTP CONNECT
    if (type === 'http' || type === 'https') {
      return await checkHttpProxy(host, port, username, password);
    }

    return { success: false, error: `Unsupported proxy type: ${type}` };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Проверка SOCKS прокси
 */
async function checkSocksProxy(
  host: string,
  port: number,
  type: string,
  username: string | null,
  password: string | null
): Promise<ProxyCheckResult> {
  const testUrl = 'http://ip-api.com/json';
  const testHost = 'ip-api.com';
  const testPort = 80;

  const options: SocksClientOptions = {
    proxy: {
      host,
      port,
      type: type === 'socks5' ? 5 : 4,
      userId: username || undefined,
      password: password || undefined,
    },
    command: 'connect',
    destination: {
      host: testHost,
      port: testPort,
    },
    timeout: 10000,
  };

  try {
    const { socket } = await SocksClient.createConnection(options);

    // Отправляем HTTP запрос для получения IP
    const httpRequest = `GET /json HTTP/1.1\r\nHost: ${testHost}\r\nConnection: close\r\n\r\n`;
    socket.write(httpRequest);

    // Читаем ответ
    const response = await readSocketResponse(socket, 5000);
    socket.destroy();

    // Парсим ответ
    const body = extractHttpBody(response);
    if (body) {
      try {
        const ipInfo = JSON.parse(body);
        return {
          success: true,
          ip: ipInfo.query,
          country: ipInfo.country,
          city: ipInfo.city,
        };
      } catch {
        // Если не удалось распарсить JSON, просто считаем что прокси работает
        return { success: true };
      }
    }

    return { success: true };
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.warn('SOCKS proxy check failed', { host, port, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Проверка HTTP прокси
 */
async function checkHttpProxy(
  host: string,
  port: number,
  username: string | null,
  password: string | null
): Promise<ProxyCheckResult> {
  const testUrl = 'http://ip-api.com/json';

  try {
    // Формируем URL с авторизацией
    const auth = username && password ? `${username}:${password}@` : '';
    const proxyUrl = `http://${auth}${host}:${port}`;

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      // @ts-ignore - Node.js fetch supports this
      proxy: proxyUrl,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const ipInfo = await response.json();
    return {
      success: true,
      ip: ipInfo.query,
      country: ipInfo.country,
      city: ipInfo.city,
    };
  } catch (error) {
    // Альтернативный метод через CONNECT
    try {
      const result = await checkHttpProxyConnect(host, port, username, password);
      return result;
    } catch (connectError) {
      const errorMessage = (error as Error).message;
      logger.warn('HTTP proxy check failed', { host, port, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }
}

/**
 * Проверка HTTP прокси через CONNECT метод
 */
async function checkHttpProxyConnect(
  host: string,
  port: number,
  username: string | null,
  password: string | null
): Promise<ProxyCheckResult> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 10000;

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    }, timeout);

    socket.connect(port, host, () => {
      clearTimeout(timer);

      // Отправляем CONNECT запрос
      let connectRequest = `CONNECT ip-api.com:80 HTTP/1.1\r\nHost: ip-api.com:80\r\n`;
      
      if (username && password) {
        const credentials = Buffer.from(`${username}:${password}`).toString('base64');
        connectRequest += `Proxy-Authorization: Basic ${credentials}\r\n`;
      }
      
      connectRequest += '\r\n';
      socket.write(connectRequest);
    });

    let response = '';
    socket.on('data', (data) => {
      response += data.toString();
      
      // Проверяем ответ
      if (response.includes('\r\n\r\n')) {
        const statusLine = response.split('\r\n')[0];
        
        if (statusLine.includes('200')) {
          // CONNECT успешен, отправляем HTTP запрос
          const httpRequest = 'GET /json HTTP/1.1\r\nHost: ip-api.com\r\nConnection: close\r\n\r\n';
          socket.write(httpRequest);
        } else {
          socket.destroy();
          resolve({ success: false, error: `Proxy returned: ${statusLine}` });
        }
      }

      // Проверяем полный ответ с IP информацией
      if (response.includes('"query"')) {
        const body = extractHttpBody(response);
        if (body) {
          try {
            const ipInfo = JSON.parse(body);
            socket.destroy();
            resolve({
              success: true,
              ip: ipInfo.query,
              country: ipInfo.country,
              city: ipInfo.city,
            });
          } catch {
            socket.destroy();
            resolve({ success: true });
          }
        }
      }
    });

    socket.on('error', (error) => {
      clearTimeout(timer);
      resolve({ success: false, error: error.message });
    });

    socket.on('close', () => {
      clearTimeout(timer);
      if (!response.includes('"query"')) {
        // Если соединение закрылось без IP информации
        if (response.includes('200')) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: 'Connection closed unexpectedly' });
        }
      }
    });
  });
}

/**
 * Чтение ответа от сокета с таймаутом
 */
function readSocketResponse(socket: net.Socket, timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let response = '';
    const timer = setTimeout(() => {
      resolve(response);
    }, timeout);

    socket.on('data', (data) => {
      response += data.toString();
    });

    socket.on('end', () => {
      clearTimeout(timer);
      resolve(response);
    });

    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

/**
 * Извлечение тела HTTP ответа
 */
function extractHttpBody(response: string): string | null {
  const bodyStart = response.indexOf('\r\n\r\n');
  if (bodyStart === -1) return null;
  return response.substring(bodyStart + 4).trim();
}

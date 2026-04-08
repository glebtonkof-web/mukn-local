/**
 * Sticky Sessions Service
 * 
 * Привязывает прокси к аккаунтам на определенное время.
 * Это важно для регистрации - один аккаунт всегда использует один и тот же IP.
 */

import prisma from './prisma';

export interface StickySession {
  id: string;
  proxyId: string;
  proxyHost: string;
  proxyPort: number;
  accountId?: string;
  platform?: string;
  sessionToken?: string;
  bindDuration: number;
  lastUsedAt?: Date;
  usageCount: number;
  status: 'active' | 'expired' | 'released';
  boundAt: Date;
  expiresAt?: Date;
}

export interface ProxyInfo {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol?: string;
}

class StickySessionsService {
  private defaultBindDuration = 3600; // 1 час

  /**
   * Привязать прокси к аккаунту
   */
  async bind(
    proxyId: string,
    proxyInfo: ProxyInfo,
    options?: {
      accountId?: string;
      platform?: string;
      bindDuration?: number;
    }
  ): Promise<StickySession> {
    const bindDuration = options?.bindDuration || this.defaultBindDuration;
    const expiresAt = new Date(Date.now() + bindDuration * 1000);

    // Проверяем, есть ли уже активная привязка
    const existing = await prisma.proxyStickySession.findFirst({
      where: {
        proxyId,
        status: 'active',
        expiresAt: { gt: new Date() }
      }
    });

    if (existing) {
      // Продлеваем существующую
      const updated = await prisma.proxyStickySession.update({
        where: { id: existing.id },
        data: {
          expiresAt,
          accountId: options?.accountId || existing.accountId,
          platform: options?.platform || existing.platform,
          lastUsedAt: new Date(),
          usageCount: { increment: 1 }
        }
      });

      console.log(`🔗 [Sticky] Продлена привязка: ${proxyId} -> ${options?.accountId || 'no-account'}`);

      return this.toStickySession(updated);
    }

    // Создаем новую
    const session = await prisma.proxyStickySession.create({
      data: {
        id: this.generateId(),
        proxyId,
        proxyHost: proxyInfo.host,
        proxyPort: proxyInfo.port,
        accountId: options?.accountId,
        platform: options?.platform,
        bindDuration,
        status: 'active',
        boundAt: new Date(),
        expiresAt
      }
    });

    console.log(`🔗 [Sticky] Создана привязка: ${proxyId} -> ${options?.accountId || 'no-account'} на ${bindDuration}с`);

    return this.toStickySession(session);
  }

  /**
   * Получить привязку для аккаунта
   */
  async getForAccount(accountId: string): Promise<StickySession | null> {
    const session = await prisma.proxyStickySession.findFirst({
      where: {
        accountId,
        status: 'active',
        expiresAt: { gt: new Date() }
      }
    });

    if (!session) return null;

    // Обновляем lastUsedAt
    await prisma.proxyStickySession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } }
    });

    return this.toStickySession(session);
  }

  /**
   * Получить привязку по прокси
   */
  async getForProxy(proxyId: string): Promise<StickySession | null> {
    const session = await prisma.proxyStickySession.findFirst({
      where: {
        proxyId,
        status: 'active',
        expiresAt: { gt: new Date() }
      }
    });

    return session ? this.toStickySession(session) : null;
  }

  /**
   * Получить или создать привязку
   */
  async getOrBind(
    proxyId: string,
    proxyInfo: ProxyInfo,
    accountId: string,
    options?: {
      platform?: string;
      bindDuration?: number;
    }
  ): Promise<StickySession> {
    // Ищем существующую для этого аккаунта
    const existing = await this.getForAccount(accountId);
    if (existing && existing.proxyId === proxyId) {
      return existing;
    }

    // Создаем новую привязку
    return this.bind(proxyId, proxyInfo, {
      accountId,
      platform: options?.platform,
      bindDuration: options?.bindDuration
    });
  }

  /**
   * Продлить привязку
   */
  async renew(sessionId: string, additionalSeconds?: number): Promise<boolean> {
    const session = await prisma.proxyStickySession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.status !== 'active') {
      return false;
    }

    const addSeconds = additionalSeconds || session.bindDuration;
    const newExpiresAt = new Date(Date.now() + addSeconds * 1000);

    await prisma.proxyStickySession.update({
      where: { id: sessionId },
      data: { expiresAt: newExpiresAt }
    });

    console.log(`🔗 [Sticky] Продлена сессия: ${sessionId} на ${addSeconds}с`);
    return true;
  }

  /**
   * Освободить привязку
   */
  async release(sessionId: string): Promise<boolean> {
    try {
      await prisma.proxyStickySession.update({
        where: { id: sessionId },
        data: {
          status: 'released',
          expiresAt: new Date()
        }
      });

      console.log(`🔗 [Sticky] Освобождена сессия: ${sessionId}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Освободить все привязки аккаунта
   */
  async releaseForAccount(accountId: string): Promise<number> {
    const result = await prisma.proxyStickySession.updateMany({
      where: {
        accountId,
        status: 'active'
      },
      data: {
        status: 'released',
        expiresAt: new Date()
      }
    });

    console.log(`🔗 [Sticky] Освобождено ${result.count} сессий для аккаунта ${accountId}`);
    return result.count;
  }

  /**
   * Получить свободный прокси
   */
  async getAvailableProxy(platform?: string): Promise<ProxyInfo | null> {
    // Ищем прокси без активных привязок
    // Это требует интеграции с ProxyManager

    const { getProxyManager } = await import('./sim-auto/proxy-manager');
    const proxyManager = getProxyManager();

    const proxy = await proxyManager.getWorkingProxy();
    if (!proxy) return null;

    return {
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
      protocol: proxy.protocol
    };
  }

  /**
   * Очистить истекшие сессии
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.proxyStickySession.updateMany({
      where: {
        status: 'active',
        expiresAt: { lt: new Date() }
      },
      data: { status: 'expired' }
    });

    if (result.count > 0) {
      console.log(`🔗 [Sticky] Пометено как expired: ${result.count} сессий`);
    }

    return result.count;
  }

  /**
   * Получить статистику
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    released: number;
    byPlatform: Record<string, number>;
  }> {
    const [total, active, expired, released] = await Promise.all([
      prisma.proxyStickySession.count(),
      prisma.proxyStickySession.count({ where: { status: 'active' } }),
      prisma.proxyStickySession.count({ where: { status: 'expired' } }),
      prisma.proxyStickySession.count({ where: { status: 'released' } })
    ]);

    const byPlatform = await this.getStatsByPlatform();

    return { total, active, expired, released, byPlatform };
  }

  private async getStatsByPlatform(): Promise<Record<string, number>> {
    const entries = await prisma.proxyStickySession.groupBy({
      by: ['platform'],
      _count: { platform: true },
      where: { status: 'active' }
    });

    const result: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.platform) {
        result[entry.platform] = entry._count.platform;
      }
    }

    return result;
  }

  /**
   * Получить все активные сессии
   */
  async listActive(options?: {
    platform?: string;
    accountId?: string;
    limit?: number;
  }): Promise<StickySession[]> {
    const where: any = {
      status: 'active',
      expiresAt: { gt: new Date() }
    };

    if (options?.platform) {
      where.platform = options.platform;
    }

    if (options?.accountId) {
      where.accountId = options.accountId;
    }

    const sessions = await prisma.proxyStickySession.findMany({
      where,
      orderBy: { boundAt: 'desc' },
      take: options?.limit || 50
    });

    return sessions.map(this.toStickySession);
  }

  private toStickySession(session: any): StickySession {
    return {
      id: session.id,
      proxyId: session.proxyId,
      proxyHost: session.proxyHost,
      proxyPort: session.proxyPort,
      accountId: session.accountId || undefined,
      platform: session.platform || undefined,
      sessionToken: session.sessionToken || undefined,
      bindDuration: session.bindDuration,
      lastUsedAt: session.lastUsedAt || undefined,
      usageCount: session.usageCount,
      status: session.status,
      boundAt: session.boundAt,
      expiresAt: session.expiresAt || undefined
    };
  }

  private generateId(): string {
    return `sticky_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton
let stickyInstance: StickySessionsService | null = null;

export function getStickySessions(): StickySessionsService {
  if (!stickyInstance) {
    stickyInstance = new StickySessionsService();
  }
  return stickyInstance;
}

export { StickySessionsService };

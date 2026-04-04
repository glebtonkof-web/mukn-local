import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry, createCircuitBreaker } from '@/lib/resilience';
import { logger } from '@/lib/logger';

const dbCircuitBreaker = createCircuitBreaker('database', { circuitBreakerThreshold: 3 });

// GET /api/antidetect/profiles - List all antidetect browser profiles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const browserType = searchParams.get('browserType');
    const platform = searchParams.get('platform');
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string | undefined> = {};
    if (status) where.status = status;
    if (browserType) where.browserType = browserType;
    if (platform) where.platform = platform;
    if (accountId) where.accountId = accountId;

    const profiles = await dbCircuitBreaker.execute(() =>
      db.antidetectBrowser.findMany({
        where,
        include: {
          Account: {
            select: {
              id: true,
              platform: true,
              username: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })
    );

    const total = await db.antidetectBrowser.count({ where });

    // Calculate resource stats
    const stats = {
      total: profiles.length,
      available: profiles.filter(p => p.status === 'available').length,
      inUse: profiles.filter(p => p.status === 'in_use').length,
      paused: profiles.filter(p => p.status === 'paused').length,
      error: profiles.filter(p => p.status === 'error').length,
      avgCpu: profiles.reduce((acc, p) => acc + (p.cpuUsage || 0), 0) / (profiles.length || 1),
      avgMemory: profiles.reduce((acc, p) => acc + (p.memoryUsage || 0), 0) / (profiles.length || 1),
      totalSessions: profiles.reduce((acc, p) => acc + (p.sessionsCount || 0), 0),
    };

    logger.debug('Antidetect profiles fetched', { count: profiles.length, filters: { status, browserType, platform, accountId } });

    return NextResponse.json({
      profiles,
      stats,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + profiles.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch antidetect profiles', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch antidetect profiles' },
      { status: 500 }
    );
  }
}

// POST /api/antidetect/profiles - Create new antidetect browser profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.browserType) {
      return NextResponse.json(
        { error: 'Тип браузера обязателен' },
        { status: 400 }
      );
    }

    if (!body.profileId) {
      return NextResponse.json(
        { error: 'ID профиля обязателен' },
        { status: 400 }
      );
    }

    // Check if profile ID already exists
    const existing = await db.antidetectBrowser.findUnique({
      where: { profileId: body.profileId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Профиль с таким ID уже существует' },
        { status: 400 }
      );
    }

    // If accountId provided, check if account already has a profile
    if (body.accountId) {
      const existingBinding = await db.antidetectBrowser.findFirst({
        where: { accountId: body.accountId },
      });

      if (existingBinding) {
        return NextResponse.json(
          { error: 'Аккаунт уже привязан к другому профилю' },
          { status: 400 }
        );
      }
    }

    const profile = await withRetry(() =>
      db.antidetectBrowser.create({
        data: {
          id: `ab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          browserType: body.browserType,
          profileId: body.profileId,
          profileName: body.profileName,
          accountId: body.accountId,
          platform: body.platform,
          proxyType: body.proxyType,
          proxyId: body.proxyId,
          proxyHost: body.proxyHost,
          proxyPort: body.proxyPort,
          proxyUsername: body.proxyUsername,
          proxyPassword: body.proxyPassword,
          userAgent: body.userAgent,
          screenResolution: body.screenResolution,
          timezone: body.timezone,
          language: body.language,
          geolocation: body.geolocation,
          webglRenderer: body.webglRenderer,
          fingerprint: body.fingerprint,
          fingerprintSettings: body.fingerprintSettings,
          status: body.status || 'available',
          sessionsCount: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          networkUsage: 0,
          updatedAt: new Date(),
        },
        include: {
          Account: {
            select: {
              id: true,
              platform: true,
              username: true,
              status: true,
            },
          },
        },
      })
    );

    logger.info('Antidetect browser profile created', { profileId: profile.id, browserType: profile.browserType });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create antidetect browser profile', error as Error);
    return NextResponse.json(
      { error: 'Failed to create antidetect browser profile' },
      { status: 500 }
    );
  }
}

// PUT /api/antidetect/profiles - Update antidetect browser profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID профиля обязателен' },
        { status: 400 }
      );
    }

    // If changing accountId, check if account already has a profile
    if (data.accountId) {
      const existingBinding = await db.antidetectBrowser.findFirst({
        where: { 
          accountId: data.accountId,
          NOT: { id }
        },
      });

      if (existingBinding) {
        return NextResponse.json(
          { error: 'Аккаунт уже привязан к другому профилю' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.status === 'in_use') {
      updateData.lastUsedAt = new Date();
      updateData.currentSessionStarted = new Date();
    }

    if (data.status === 'available' || data.status === 'paused' || data.status === 'error') {
      updateData.currentSessionStarted = null;
    }

    const profile = await db.antidetectBrowser.update({
      where: { id },
      data: updateData,
      include: {
        Account: {
          select: {
            id: true,
            platform: true,
            username: true,
            status: true,
          },
        },
      },
    });

    logger.info('Antidetect browser profile updated', { profileId: id });

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error('Failed to update antidetect browser profile', error as Error);
    return NextResponse.json(
      { error: 'Failed to update antidetect browser profile' },
      { status: 500 }
    );
  }
}

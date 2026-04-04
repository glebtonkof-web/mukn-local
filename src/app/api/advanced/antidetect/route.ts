import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry, createCircuitBreaker } from '@/lib/resilience';
import { logger } from '@/lib/logger';

const dbCircuitBreaker = createCircuitBreaker('database', { circuitBreakerThreshold: 3 });

// GET /api/advanced/antidetect - List all antidetect browser profiles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const browserType = searchParams.get('browserType');
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string | undefined> = {};
    if (status) where.status = status;
    if (browserType) where.browserType = browserType;
    if (accountId) where.accountId = accountId;

    const profiles = await dbCircuitBreaker.execute(() =>
      db.antidetectBrowser.findMany({
        where,
        include: {
          account: {
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

    logger.debug('Antidetect browsers fetched', { count: profiles.length, filters: { status, browserType, accountId } });

    return NextResponse.json({
      profiles,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + profiles.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch antidetect browsers', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch antidetect browsers' },
      { status: 500 }
    );
  }
}

// POST /api/advanced/antidetect - Add new antidetect browser profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle assign action
    if (body.action === 'assign') {
      return await handleAssign(body);
    }

    // Validation
    if (!body.browserType) {
      return NextResponse.json(
        { error: 'Browser type is required' },
        { status: 400 }
      );
    }

    if (!body.profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    // Check if profile ID already exists
    const existing = await db.antidetectBrowser.findUnique({
      where: { profileId: body.profileId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Profile ID already exists' },
        { status: 400 }
      );
    }

    const profile = await withRetry(() =>
      db.antidetectBrowser.create({
        data: {
          browserType: body.browserType,
          profileId: body.profileId,
          profileName: body.profileName,
          accountId: body.accountId,
          proxyId: body.proxyId,
          proxyHost: body.proxyHost,
          proxyPort: body.proxyPort,
          proxyUsername: body.proxyUsername,
          proxyPassword: body.proxyPassword,
          userAgent: body.userAgent,
          screenResolution: body.screenResolution,
          timezone: body.timezone,
          language: body.language,
          webglRenderer: body.webglRenderer,
          fingerprint: body.fingerprint,
          status: body.status || 'available',
          sessionsCount: body.sessionsCount || 0,
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

// PUT /api/advanced/antidetect - Update antidetect browser profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    // If updating status to in_use, also update lastUsedAt
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.status === 'in_use') {
      updateData.lastUsedAt = new Date();
    }

    const profile = await db.antidetectBrowser.update({
      where: { id },
      data: updateData,
    });

    // Increment sessions count if status is in_use
    if (data.status === 'in_use') {
      await db.antidetectBrowser.update({
        where: { id },
        data: { sessionsCount: { increment: 1 } },
      });
    }

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

// DELETE /api/advanced/antidetect - Remove antidetect browser profile
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    await db.antidetectBrowser.delete({
      where: { id },
    });

    logger.info('Antidetect browser profile deleted', { profileId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete antidetect browser profile', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete antidetect browser profile' },
      { status: 500 }
    );
  }
}

// Helper function to handle profile assignment
async function handleAssign(body: { profileId?: string; accountId?: string }) {
  const { profileId, accountId } = body;

  if (!profileId) {
    return NextResponse.json(
      { error: 'Profile ID is required' },
      { status: 400 }
    );
  }

  // Find the antidetect browser profile
  const profile = await db.antidetectBrowser.findUnique({
    where: { profileId },
  });

  if (!profile) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404 }
    );
  }

  // If accountId is provided, verify the account exists
  if (accountId) {
    const account = await db.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
  }

  // Update the profile with the account binding
  const updatedProfile = await db.antidetectBrowser.update({
    where: { id: profile.id },
    data: {
      accountId: accountId || null,
      status: accountId ? 'in_use' : 'available',
      lastUsedAt: accountId ? new Date() : profile.lastUsedAt,
      updatedAt: new Date(),
    },
    include: {
      account: {
        select: {
          id: true,
          platform: true,
          username: true,
          status: true,
        },
      },
    },
  });

  logger.info('Antidetect browser profile assigned', { 
    profileId: profile.id, 
    accountId: accountId || 'unassigned' 
  });

  return NextResponse.json({ profile: updatedProfile });
}

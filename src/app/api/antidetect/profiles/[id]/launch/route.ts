import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  createBrowserClient,
  checkBrowserStatus,
  BrowserType,
} from '@/lib/antidetect-browsers';

// GET browser settings from database
async function getBrowserSettings(browserType: string): Promise<{
  apiKey?: string;
  apiUrl?: string;
  port?: number;
}> {
  try {
    const settings = await db.antidetectBrowserSettings.findUnique({
      where: { browserType },
    });
    
    if (settings) {
      return {
        apiKey: settings.apiKey || undefined,
        apiUrl: settings.apiUrl || undefined,
        port: settings.port || undefined,
      };
    }
  } catch (error) {
    logger.error('Failed to get browser settings', error as Error);
  }
  
  return {};
}

// POST /api/antidetect/profiles/[id]/launch - Launch browser profile
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID профиля обязателен' },
        { status: 400 }
      );
    }

    // Get the profile
    const profile = await db.antidetectBrowser.findUnique({
      where: { id },
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

    if (!profile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      );
    }

    // Check if profile is already in use
    if (profile.status === 'in_use') {
      return NextResponse.json(
        { error: 'Профиль уже запущен' },
        { status: 400 }
      );
    }

    // Check if profile has error status
    if (profile.status === 'error') {
      return NextResponse.json(
        { error: 'Профиль в состоянии ошибки. Сначала исправьте проблему.' },
        { status: 400 }
      );
    }

    // Get browser-specific settings
    const browserSettings = await getBrowserSettings(profile.browserType);

    // Check browser connection
    const browserStatus = await checkBrowserStatus(
      profile.browserType as BrowserType,
      browserSettings
    );

    if (!browserStatus.connected) {
      // Browser not running - update profile status to error
      await db.antidetectBrowser.update({
        where: { id },
        data: {
          status: 'error',
          updatedAt: new Date(),
        },
      });

      return NextResponse.json(
        { 
          error: `${getBrowserLabel(profile.browserType)} не запущен или недоступен. ${
            browserStatus.error || 'Убедитесь, что приложение браузера установлено и запущено.'
          }` 
        },
        { status: 503 }
      );
    }

    // Create browser client
    const client = createBrowserClient(
      profile.browserType as BrowserType,
      browserSettings
    );

    // Launch the profile via real browser API
    const launchResult = await client.launchProfile({
      profileId: profile.profileId,
      profileName: profile.profileName || undefined,
      proxyHost: profile.proxyHost || undefined,
      proxyPort: profile.proxyPort || undefined,
      proxyUsername: profile.proxyUsername || undefined,
      proxyPassword: profile.proxyPassword || undefined,
      userAgent: profile.userAgent || undefined,
      screenResolution: profile.screenResolution || undefined,
      timezone: profile.timezone || undefined,
      language: profile.language || undefined,
      geolocation: profile.geolocation || undefined,
      webglRenderer: profile.webglRenderer || undefined,
    });

    if (!launchResult.success) {
      // Update profile status to error
      await db.antidetectBrowser.update({
        where: { id },
        data: {
          status: 'error',
          updatedAt: new Date(),
        },
      });

      return NextResponse.json(
        { error: launchResult.error || 'Ошибка запуска браузера' },
        { status: 500 }
      );
    }

    // Update profile status to in_use
    const updatedProfile = await db.antidetectBrowser.update({
      where: { id },
      data: {
        status: 'in_use',
        lastUsedAt: new Date(),
        currentSessionStarted: new Date(),
        sessionsCount: { increment: 1 },
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
    });

    logger.info('Browser profile launched', { 
      profileId: id, 
      browserType: profile.browserType,
      account: profile.Account?.username || 'none',
      debugPort: launchResult.debugPort,
    });

    return NextResponse.json({ 
      success: true, 
      profile: updatedProfile,
      browserUrl: launchResult.browserUrl,
      debugPort: launchResult.debugPort,
      pid: launchResult.pid,
    });
  } catch (error) {
    logger.error('Failed to launch browser profile', error as Error);
    return NextResponse.json(
      { error: 'Failed to launch browser profile' },
      { status: 500 }
    );
  }
}

// DELETE /api/antidetect/profiles/[id]/launch - Stop browser profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID профиля обязателен' },
        { status: 400 }
      );
    }

    const profile = await db.antidetectBrowser.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      );
    }

    if (profile.status !== 'in_use') {
      return NextResponse.json(
        { error: 'Профиль не запущен' },
        { status: 400 }
      );
    }

    // Get browser-specific settings
    const browserSettings = await getBrowserSettings(profile.browserType);

    // Create browser client and stop the profile
    try {
      const client = createBrowserClient(
        profile.browserType as BrowserType,
        browserSettings
      );
      
      await client.stopProfile(profile.profileId);
    } catch (error) {
      logger.warn('Failed to stop profile via API, continuing with status update', error as Error);
    }

    // Update profile status to available
    const updatedProfile = await db.antidetectBrowser.update({
      where: { id },
      data: {
        status: 'available',
        currentSessionStarted: null,
        updatedAt: new Date(),
      },
    });

    logger.info('Browser profile stopped', { profileId: id });

    return NextResponse.json({ 
      success: true, 
      profile: updatedProfile 
    });
  } catch (error) {
    logger.error('Failed to stop browser profile', error as Error);
    return NextResponse.json(
      { error: 'Failed to stop browser profile' },
      { status: 500 }
    );
  }
}

// Helper function to get browser label
function getBrowserLabel(browserType: string): string {
  const labels: Record<string, string> = {
    'multilogin': 'Multilogin',
    'octo-browser': 'Octo Browser',
    'morelogin': 'MoreLogin',
    'mostlogin': 'MostLogin',
  };
  return labels[browserType] || browserType;
}

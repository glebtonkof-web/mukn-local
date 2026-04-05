import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkBrowserStatus, BrowserType, getDefaultPort } from '@/lib/antidetect-browsers';

// GET /api/antidetect/settings - Get all browser settings
export async function GET() {
  try {
    const settings = await db.antidetectBrowserSettings.findMany();

    const browserSettings: Record<string, { 
      apiKey?: string; 
      apiUrl?: string; 
      port?: number;
      isActive?: boolean;
      lastCheckAt?: string;
    }> = {};

    for (const setting of settings) {
      browserSettings[setting.browserType] = {
        apiKey: setting.apiKey ? '••••••••' + setting.apiKey.slice(-4) : undefined,
        apiUrl: setting.apiUrl || undefined,
        port: setting.port || getDefaultPort(setting.browserType as BrowserType),
        isActive: setting.isActive,
        lastCheckAt: setting.lastCheckAt?.toISOString(),
      };
    }

    // Ensure all browser types are present with defaults
    const allBrowsers = ['mostlogin', 'morelogin', 'multilogin', 'octo-browser'];
    for (const browserType of allBrowsers) {
      if (!browserSettings[browserType]) {
        browserSettings[browserType] = {
          port: getDefaultPort(browserType as BrowserType),
          isActive: false,
        };
      }
    }

    return NextResponse.json({ settings: browserSettings });
  } catch (error) {
    logger.error('Failed to get antidetect settings', error as Error);
    return NextResponse.json(
      { error: 'Failed to get antidetect settings' },
      { status: 500 }
    );
  }
}

// PUT /api/antidetect/settings - Update browser settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { browserType, apiKey, apiUrl, port } = body;

    if (!browserType) {
      return NextResponse.json(
        { error: 'Тип браузера обязателен' },
        { status: 400 }
      );
    }

    // Get existing settings to preserve API key if not provided
    const existing = await db.antidetectBrowserSettings.findUnique({
      where: { browserType },
    });

    // If apiKey is a masked version, keep the existing one
    const actualApiKey = apiKey?.startsWith('••••••••') 
      ? existing?.apiKey 
      : apiKey;

    // Upsert settings
    await db.antidetectBrowserSettings.upsert({
      where: { browserType },
      update: { 
        apiKey: actualApiKey,
        apiUrl,
        port: port || getDefaultPort(browserType as BrowserType),
        updatedAt: new Date(),
      },
      create: {
        id: `abs-${browserType}-${Date.now()}`,
        browserType,
        apiKey: actualApiKey,
        apiUrl,
        port: port || getDefaultPort(browserType as BrowserType),
        updatedAt: new Date(),
      },
    });

    logger.info('Antidetect browser settings updated', { browserType });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to update antidetect settings', error as Error);
    return NextResponse.json(
      { error: 'Failed to update antidetect settings' },
      { status: 500 }
    );
  }
}

// POST /api/antidetect/settings - Test browser connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { browserType } = body;

    if (!browserType) {
      return NextResponse.json(
        { error: 'Тип браузера обязателен' },
        { status: 400 }
      );
    }

    // Get settings for this browser
    const settings = await db.antidetectBrowserSettings.findUnique({
      where: { browserType },
    });

    const config = {
      apiKey: settings?.apiKey || undefined,
      apiUrl: settings?.apiUrl || undefined,
      port: settings?.port || getDefaultPort(browserType as BrowserType),
    };

    const status = await checkBrowserStatus(browserType as BrowserType, config);

    // Update lastCheckAt
    await db.antidetectBrowserSettings.upsert({
      where: { browserType },
      update: { 
        lastCheckAt: new Date(),
        isActive: status.connected,
        updatedAt: new Date(),
      },
      create: {
        id: `abs-${browserType}-${Date.now()}`,
        browserType,
        port: config.port,
        isActive: status.connected,
        lastCheckAt: new Date(),
        updatedAt: new Date(),
      },
    });

    logger.info('Antidetect browser connection test', { 
      browserType, 
      connected: status.connected 
    });

    return NextResponse.json({
      browserType,
      connected: status.connected,
      version: status.version,
      error: status.error,
      port: config.port,
    });
  } catch (error) {
    logger.error('Failed to test browser connection', error as Error);
    return NextResponse.json(
      { error: 'Failed to test browser connection' },
      { status: 500 }
    );
  }
}

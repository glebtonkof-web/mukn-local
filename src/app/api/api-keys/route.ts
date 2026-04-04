import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET - Retrieve API keys for the default user
export async function GET() {
  try {
    // Get or create default user
    let user = await db.user.findFirst();

    if (!user) {
      user = await db.user.create({
        data: {
          id: 'default-user',
          email: 'admin@mukn.local',
          name: 'Admin',
          role: 'admin',
          updatedAt: new Date(),
        },
      });
    }

    // Get API keys for user
    const apiKeys = await db.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        provider: true,
        isActive: true,
        lastUsedAt: true,
        requestsCount: true,
        createdAt: true,
        key: true, // Include key for settings display
      },
    });

    // Build settings object with masked keys for display
    const settings = {
      deepseekApiKey: '',
      replicateApiKey: '',
      telegramApiId: '',
      telegramApiHash: '',
    };

    // Fill in existing keys
    apiKeys.forEach((k) => {
      if (k.provider === 'deepseek') {
        settings.deepseekApiKey = k.key || '';
      } else if (k.provider === 'replicate') {
        settings.replicateApiKey = k.key || '';
      } else if (k.provider === 'telegram') {
        settings.telegramApiHash = k.key || '';
      }
    });

    // Return apiKeys without the actual key for security
    const safeApiKeys = apiKeys.map((k) => ({
      id: k.id,
      name: k.name,
      provider: k.provider,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      requestsCount: k.requestsCount,
      createdAt: k.createdAt,
    }));

    return NextResponse.json({
      apiKeys: safeApiKeys,
      settings,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST - Save API keys
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, name, key } = body;

    if (!provider || !name || !key) {
      return NextResponse.json(
        { error: 'Provider, name, and key are required' },
        { status: 400 }
      );
    }

    // Get or create default user
    let user = await db.user.findFirst();
    
    if (!user) {
      user = await db.user.create({
        data: {
          id: nanoid(),
          email: 'admin@mukn.local',
          name: 'Admin',
          role: 'admin',
          updatedAt: new Date(),
        },
      });
    }

    // Upsert API key
    const existingKey = await db.apiKey.findFirst({
      where: {
        userId: user.id,
        provider,
      },
    });

    let apiKey;
    if (existingKey) {
      apiKey = await db.apiKey.update({
        where: { id: existingKey.id },
        data: {
          name,
          key, // In production, this should be encrypted
          isActive: true,
          updatedAt: new Date(),
        },
      });
    } else {
      apiKey = await db.apiKey.create({
        data: {
          id: nanoid(),
          userId: user.id,
          provider,
          name,
          key, // In production, this should be encrypted
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        provider: apiKey.provider,
        isActive: apiKey.isActive,
      },
    });
  } catch (error) {
    console.error('Error saving API key:', error);
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    await db.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

// PUT - Test API key connection
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, key } = body;

    if (!provider || !key) {
      return NextResponse.json(
        { error: 'Provider and key are required' },
        { status: 400 }
      );
    }

    // Test connection based on provider
    let connected = false;
    let message = '';

    switch (provider) {
      case 'deepseek':
        // Test DeepSeek API
        try {
          const response = await fetch('https://api.deepseek.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${key}`,
            },
          });
          connected = response.ok;
          message = connected ? 'DeepSeek API подключен' : 'Неверный API ключ';
        } catch {
          message = 'Ошибка подключения к DeepSeek API';
        }
        break;

      case 'replicate':
        // Test Replicate API
        try {
          const response = await fetch('https://api.replicate.com/v1/models', {
            headers: {
              'Authorization': `Token ${key}`,
            },
          });
          connected = response.ok;
          message = connected ? 'Replicate API подключен' : 'Неверный API ключ';
        } catch {
          message = 'Ошибка подключения к Replicate API';
        }
        break;

      case 'telegram':
        // For Telegram, just validate format
        connected = key.length >= 32;
        message = connected ? 'Telegram API валиден' : 'Неверный формат API Hash';
        break;

      default:
        message = 'Неизвестный провайдер';
    }

    return NextResponse.json({
      success: true,
      connected,
      message,
    });
  } catch (error) {
    console.error('Error testing API key:', error);
    return NextResponse.json(
      { error: 'Failed to test API key' },
      { status: 500 }
    );
  }
}

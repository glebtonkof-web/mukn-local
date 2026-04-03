// API: Forgetfulness Simulation (УРОВЕНЬ 1, функция 4 - Имитация забывчивости)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Default "forgot" phrases in Russian
const DEFAULT_FORGOT_PHRASES = [
  'Я тут вчера хотел спросить...',
  'Забыл ответить тогда, но...',
  'Вспомнил про этот пост...',
  'Только сейчас увидел, но...',
  'Давно хотел написать...',
  'Блин, совсем вылетело из головы...',
  'Пролистывал ленту и наткнулся...',
  'Пару дней назад видел, решил ответить...',
  'Вспомнилось вдруг...',
  'Случайно наткнулся снова...'
];

interface ForgetfulnessCreateBody {
  campaignId?: string;
  influencerId?: string;
  forgetProbability?: number;
  rememberDelayDays?: number;
  forgotPhrases?: string[];
}

interface ForgetfulnessUpdateBody {
  settingsId: string;
  forgetProbability?: number;
  rememberDelayDays?: number;
  forgotPhrases?: string[];
  enabled?: boolean;
}

interface GeneratePhraseBody {
  settingsId: string;
  context?: string;
  daysSincePost?: number;
}

// GET: Get current settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const settingsId = searchParams.get('settingsId');
    const campaignId = searchParams.get('campaignId');
    const influencerId = searchParams.get('influencerId');
    
    if (settingsId) {
      // Get specific settings
      const settings = await db.forgetfulnessSimulation.findUnique({
        where: { id: settingsId }
      });
      
      if (!settings) {
        return NextResponse.json(
          { error: 'Settings not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        settings: {
          ...settings,
          forgotPhrases: settings.forgotPhrases ? JSON.parse(settings.forgotPhrases) : DEFAULT_FORGOT_PHRASES
        }
      });
    }
    
    // Get settings by campaign or influencer
    const where: any = {};
    if (campaignId) where.campaignId = campaignId;
    if (influencerId) where.influencerId = influencerId;
    
    if (Object.keys(where).length > 0) {
      const settings = await db.forgetfulnessSimulation.findFirst({
        where,
        orderBy: { createdAt: 'desc' }
      });
      
      if (settings) {
        return NextResponse.json({
          success: true,
          settings: {
            ...settings,
            forgotPhrases: settings.forgotPhrases ? JSON.parse(settings.forgotPhrases) : DEFAULT_FORGOT_PHRASES
          }
        });
      }
      
      return NextResponse.json({
        success: true,
        settings: null,
        message: 'No settings found for the specified campaign/influencer'
      });
    }
    
    // List all settings
    const allSettings = await db.forgetfulnessSimulation.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const settingsWithPhrases = allSettings.map(s => ({
      ...s,
      forgotPhrases: s.forgotPhrases ? JSON.parse(s.forgotPhrases) : DEFAULT_FORGOT_PHRASES
    }));
    
    return NextResponse.json({
      success: true,
      settings: settingsWithPhrases,
      total: allSettings.length,
      defaultPhrases: DEFAULT_FORGOT_PHRASES
    });
  } catch (error) {
    console.error('[Forgetfulness API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get forgetfulness settings' },
      { status: 500 }
    );
  }
}

// POST: Configure forgetfulness settings for campaign/influencer
export async function POST(request: NextRequest) {
  try {
    const body: ForgetfulnessCreateBody = await request.json();
    const { 
      campaignId, 
      influencerId, 
      forgetProbability = 0.15, 
      rememberDelayDays = 2, 
      forgotPhrases 
    } = body;
    
    // Validate that at least one target is specified
    if (!campaignId && !influencerId) {
      return NextResponse.json(
        { error: 'Either campaignId or influencerId must be specified' },
        { status: 400 }
      );
    }
    
    // Validate probability range
    if (forgetProbability < 0 || forgetProbability > 1) {
      return NextResponse.json(
        { error: 'forgetProbability must be between 0 and 1 (e.g., 0.15 for 15%)' },
        { status: 400 }
      );
    }
    
    // Validate delay days
    if (rememberDelayDays < 1 || rememberDelayDays > 30) {
      return NextResponse.json(
        { error: 'rememberDelayDays must be between 1 and 30' },
        { status: 400 }
      );
    }
    
    // Check for existing settings
    const where: any = {};
    if (campaignId) where.campaignId = campaignId;
    if (influencerId) where.influencerId = influencerId;
    
    const existing = await db.forgetfulnessSimulation.findFirst({ where });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Settings already exist for this campaign/influencer. Use PUT to update.' },
        { status: 400 }
      );
    }
    
    // Create settings
    const settings = await db.forgetfulnessSimulation.create({
      data: {
        campaignId,
        influencerId,
        forgetProbability,
        rememberDelayDays,
        forgotPhrases: forgotPhrases ? JSON.stringify(forgotPhrases) : JSON.stringify(DEFAULT_FORGOT_PHRASES)
      }
    });
    
    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        forgotPhrases: forgotPhrases || DEFAULT_FORGOT_PHRASES
      },
      message: `Forgetfulness simulation configured with ${(forgetProbability * 100).toFixed(0)}% probability`
    });
  } catch (error) {
    console.error('[Forgetfulness API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to create forgetfulness settings' },
      { status: 500 }
    );
  }
}

// PUT: Update forget probability and phrases
export async function PUT(request: NextRequest) {
  try {
    const body: ForgetfulnessUpdateBody = await request.json();
    const { 
      settingsId, 
      forgetProbability, 
      rememberDelayDays, 
      forgotPhrases,
      enabled
    } = body;
    
    if (!settingsId) {
      return NextResponse.json(
        { error: 'Missing required field: settingsId' },
        { status: 400 }
      );
    }
    
    // Check if settings exist
    const existing = await db.forgetfulnessSimulation.findUnique({
      where: { id: settingsId }
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      );
    }
    
    // Validate probability if provided
    if (forgetProbability !== undefined && (forgetProbability < 0 || forgetProbability > 1)) {
      return NextResponse.json(
        { error: 'forgetProbability must be between 0 and 1' },
        { status: 400 }
      );
    }
    
    // Validate delay days if provided
    if (rememberDelayDays !== undefined && (rememberDelayDays < 1 || rememberDelayDays > 30)) {
      return NextResponse.json(
        { error: 'rememberDelayDays must be between 1 and 30' },
        { status: 400 }
      );
    }
    
    // Build update data
    const updateData: any = {};
    if (forgetProbability !== undefined) updateData.forgetProbability = forgetProbability;
    if (rememberDelayDays !== undefined) updateData.rememberDelayDays = rememberDelayDays;
    if (forgotPhrases) updateData.forgotPhrases = JSON.stringify(forgotPhrases);
    
    // Update settings
    const updated = await db.forgetfulnessSimulation.update({
      where: { id: settingsId },
      data: updateData
    });
    
    return NextResponse.json({
      success: true,
      settings: {
        ...updated,
        forgotPhrases: updated.forgotPhrases ? JSON.parse(updated.forgotPhrases) : DEFAULT_FORGOT_PHRASES
      },
      message: 'Forgetfulness settings updated'
    });
  } catch (error) {
    console.error('[Forgetfulness API] PUT Error:', error);
    return NextResponse.json(
      { error: 'Failed to update forgetfulness settings' },
      { status: 500 }
    );
  }
}

// DELETE: Remove forgetfulness settings
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const settingsId = searchParams.get('settingsId');
    
    if (!settingsId) {
      return NextResponse.json(
        { error: 'Missing required parameter: settingsId' },
        { status: 400 }
      );
    }
    
    await db.forgetfulnessSimulation.delete({
      where: { id: settingsId }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Forgetfulness settings deleted'
    });
  } catch (error) {
    console.error('[Forgetfulness API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete forgetfulness settings' },
      { status: 500 }
    );
  }
}

// PATCH: Generate "forgot" phrase and "remember" delay
export async function PATCH(request: NextRequest) {
  try {
    const body: GeneratePhraseBody = await request.json();
    const { settingsId, context, daysSincePost } = body;
    
    if (!settingsId) {
      // If no settingsId, return a random phrase from defaults
      const randomPhrase = DEFAULT_FORGOT_PHRASES[Math.floor(Math.random() * DEFAULT_FORGOT_PHRASES.length)];
      const randomDelay = Math.floor(Math.random() * 3) + 1; // 1-3 days
      
      return NextResponse.json({
        success: true,
        phrase: randomPhrase,
        delayDays: randomDelay,
        simulatedForgetTime: new Date(Date.now() + randomDelay * 24 * 60 * 60 * 1000).toISOString(),
        usingDefaults: true
      });
    }
    
    // Get settings
    const settings = await db.forgetfulnessSimulation.findUnique({
      where: { id: settingsId }
    });
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      );
    }
    
    // Parse phrases
    const phrases = settings.forgotPhrases 
      ? JSON.parse(settings.forgotPhrases) 
      : DEFAULT_FORGOT_PHRASES;
    
    // Determine if should simulate forgetfulness
    const shouldForget = Math.random() < settings.forgetProbability;
    
    if (!shouldForget) {
      return NextResponse.json({
        success: true,
        shouldForget: false,
        message: 'No forgetfulness simulation triggered this time',
        probability: settings.forgetProbability
      });
    }
    
    // Select random phrase
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    // Calculate delay (use setting or random variation)
    const baseDelay = settings.rememberDelayDays;
    const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
    const delayDays = Math.max(1, baseDelay + variation);
    
    // Calculate simulated "remember" time
    const rememberTime = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);
    
    // If context is provided, could integrate it with AI here
    // For now, just return the phrase as-is
    
    return NextResponse.json({
      success: true,
      shouldForget: true,
      phrase,
      delayDays,
      simulatedForgetTime: rememberTime.toISOString(),
      settings: {
        probability: settings.forgetProbability,
        baseDelayDays: settings.rememberDelayDays
      },
      context: context || null,
      daysSincePost: daysSincePost || null
    });
  } catch (error) {
    console.error('[Forgetfulness API] PATCH Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forgetfulness simulation' },
      { status: 500 }
    );
  }
}

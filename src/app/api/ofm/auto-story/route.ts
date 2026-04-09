import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getZAI } from '@/lib/z-ai';
import { nanoid } from 'nanoid';

// GET /api/ofm/auto-story - Get auto-story rules
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const profileId = searchParams.get('profileId');
    const isActive = searchParams.get('isActive');

    const where: Record<string, string | boolean | undefined> = {};
    if (profileId) where.profileId = profileId;
    if (isActive !== null) where.isActive = isActive === 'true';

    const rules = await db.autoStoryRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Get stats
    const stats = await db.autoStoryRule.aggregate({
      where,
      _sum: {
        triggeredCount: true,
        successCount: true,
      },
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      rules,
      stats: {
        totalRules: stats._count.id,
        totalTriggered: stats._sum.triggeredCount || 0,
        totalSuccess: stats._sum.successCount || 0,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch auto-story rules', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch auto-story rules' },
      { status: 500 }
    );
  }
}

// POST /api/ofm/auto-story - Create auto-story rule or trigger auto-publish
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a rule creation or trigger
    if (body.createRule) {
      // Create new rule
      const rule = await db.autoStoryRule.create({
        data: {
          id: nanoid(),
          profileId: body.profileId,
          minProfileClicks: body.minProfileClicks || 1,
          delayMinutes: body.delayMinutes || 5,
          storyTemplate: body.storyTemplate ? JSON.stringify(body.storyTemplate) : null,
          aiGenerateImage: body.aiGenerateImage ?? true,
          offerLink: body.offerLink,
          linkText: body.linkText,
          isActive: body.isActive ?? true,
          updatedAt: new Date(),
        },
      });

      logger.info('Auto-story rule created', { ruleId: rule.id });

      return NextResponse.json({ success: true, rule });
    }

    // Trigger auto-publish flow
    const { profileId, profileClicks, commentId, channelId } = body;

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    // Get active rule for this profile
    const rule = await db.autoStoryRule.findFirst({
      where: {
        profileId,
        isActive: true,
        minProfileClicks: { lte: profileClicks || 1 },
      },
      orderBy: { minProfileClicks: 'desc' },
    });

    if (!rule) {
      return NextResponse.json({
        shouldPublish: false,
        message: 'No matching rule found for this profile',
      });
    }

    // Check if we should publish a story
    const shouldPublish = profileClicks >= rule.minProfileClicks;

    if (!shouldPublish) {
      return NextResponse.json({
        shouldPublish: false,
        message: `Need ${rule.minProfileClicks} profile clicks, got ${profileClicks}`,
        requiredClicks: rule.minProfileClicks,
        currentClicks: profileClicks,
      });
    }

    // Generate story content
    let storyText = '';
    let storyImageUrl: string | null = null;

    // Get profile for context
    const profile = await db.oFMProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Generate text with AI
    const zai = await getZAI();

    // Use template or generate new
    if (rule.storyTemplate) {
      const template = JSON.parse(rule.storyTemplate as string);
      storyText = template.text || '';
    } else {
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Ты создаёшь короткие тексты для Telegram Stories (3-5 слов).
Стиль: ${profile.style}
Ниша: ${profile.niche}
Цель: пригласить в канал/профиль`,
          },
          {
            role: 'user',
            content: `Создай интригующий текст для Story после того, как пользователь перешёл в профиль из комментария.
Канал-источник: ${channelId || 'неизвестно'}
Текст ссылки: ${rule.linkText || 'Подробнее'}`,
          },
        ],
      });

      storyText = completion.choices[0]?.message?.content || 'Узнай больше 👇';
    }

    // Generate image if needed
    if (rule.aiGenerateImage) {
      try {
        const imageResponse = await zai.images.generations.create({
          prompt: `Aesthetic ${profile.niche} lifestyle photo, soft colors, Instagram style, no text, no faces`,
          size: '1024x1024',
        });

        storyImageUrl = `data:image/png;base64,${imageResponse.data[0]?.base64}`;
      } catch (imgError) {
        logger.error('Failed to generate story image', imgError as Error);
        // Continue without image
      }
    }

    // Calculate publish time (delay)
    const publishAt = new Date();
    publishAt.setMinutes(publishAt.getMinutes() + rule.delayMinutes);

    // Create story
    const story = await db.oFMStory.create({
      data: {
        id: nanoid(),
        OFMProfile: { connect: { id: profileId } },
        text: storyText,
        imageUrl: storyImageUrl,
        linkUrl: rule.offerLink || undefined,
        linkText: rule.linkText || undefined,
        status: 'draft', // Will be published after delay
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        utmSource: 'auto_story',
        utmCampaign: `auto_${channelId || 'unknown'}`,
      },
    });

    // Update rule stats
    await db.autoStoryRule.update({
      where: { id: rule.id },
      data: {
        triggeredCount: { increment: 1 },
      },
    });

    logger.info('Auto-story triggered', {
      ruleId: rule.id,
      profileId,
      storyId: story.id,
      delayMinutes: rule.delayMinutes,
    });

    return NextResponse.json({
      success: true,
      shouldPublish: true,
      story,
      publishAt,
      delayMinutes: rule.delayMinutes,
      rule,
    });
  } catch (error) {
    logger.error('Failed to process auto-story', error as Error);
    return NextResponse.json(
      { error: 'Failed to process auto-story' },
      { status: 500 }
    );
  }
}

// PUT /api/ofm/auto-story - Update rule or mark story success
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.ruleId) {
      // Update rule
      const rule = await db.autoStoryRule.update({
        where: { id: body.ruleId },
        data: {
          minProfileClicks: body.minProfileClicks,
          delayMinutes: body.delayMinutes,
          storyTemplate: body.storyTemplate ? JSON.stringify(body.storyTemplate) : undefined,
          aiGenerateImage: body.aiGenerateImage,
          offerLink: body.offerLink,
          linkText: body.linkText,
          isActive: body.isActive,
        },
      });

      return NextResponse.json({ success: true, rule });
    }

    if (body.storySuccess) {
      // Mark story as successful
      const rule = await db.autoStoryRule.update({
        where: { id: body.ruleId },
        data: {
          successCount: { increment: 1 },
        },
      });

      return NextResponse.json({ success: true, rule });
    }

    return NextResponse.json(
      { error: 'Invalid update request' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Failed to update auto-story rule', error as Error);
    return NextResponse.json(
      { error: 'Failed to update auto-story rule' },
      { status: 500 }
    );
  }
}

// DELETE /api/ofm/auto-story - Delete rule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    await db.autoStoryRule.delete({
      where: { id },
    });

    logger.info('Auto-story rule deleted', { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete auto-story rule', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete auto-story rule' },
      { status: 500 }
    );
  }
}

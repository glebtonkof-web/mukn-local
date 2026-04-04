import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';

// GET /api/ofm/stories - List stories
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const profileId = searchParams.get('profileId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string | undefined> = {};
    if (profileId) where.profileId = profileId;
    if (status) where.status = status;

    const [stories, total] = await Promise.all([
      db.oFMStory.findMany({
        where,
        include: {
          profile: {
            select: {
              id: true,
              name: true,
              niche: true,
              style: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.oFMStory.count({ where }),
    ]);

    logger.debug('OFM stories fetched', { count: stories.length });

    return NextResponse.json({
      stories,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + stories.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch OFM stories', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch OFM stories' },
      { status: 500 }
    );
  }
}

// POST /api/ofm/stories - Generate and publish story
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    // Get profile for context
    const profile = await db.oFMProfile.findUnique({
      where: { id: body.profileId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    let storyText = body.text;

    // Generate text with AI if not provided
    if (!storyText && body.generate !== false) {
      try {
        const zai = await ZAI.create();

        const systemPrompt = profile.storyPrompt || 
          `You are a ${profile.style} ${profile.niche} content creator. Generate engaging story content.`;

        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: body.prompt || 'Generate an engaging story for my followers.',
            },
          ],
        });

        storyText = completion.choices[0]?.message?.content || undefined;
      } catch (aiError) {
        logger.error('Failed to generate story text with AI', aiError as Error);
        // Continue without AI-generated text
      }
    }

    // Calculate expiration
    const expirationHours = body.expirationHours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    const story = await db.oFMStory.create({
      data: {
        profileId: body.profileId,
        text: storyText,
        imageUrl: body.imageUrl,
        videoUrl: body.videoUrl,
        linkUrl: body.linkUrl,
        linkText: body.linkText,
        expirationHours,
        status: body.status || 'draft',
        expiresAt,
        utmSource: body.utmSource,
        utmCampaign: body.utmCampaign,
      },
    });

    // Update profile stories count
    await db.oFMProfile.update({
      where: { id: body.profileId },
      data: {
        storiesCount: { increment: 1 },
      },
    });

    logger.info('OFM story created', { storyId: story.id, profileId: body.profileId });

    return NextResponse.json({ story }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create OFM story', error as Error);
    return NextResponse.json(
      { error: 'Failed to create OFM story' },
      { status: 500 }
    );
  }
}

// PUT /api/ofm/stories - Update story metrics
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    const story = await db.oFMStory.update({
      where: { id },
      data: {
        ...data,
      },
    });

    logger.info('OFM story updated', { storyId: id });

    return NextResponse.json({ story });
  } catch (error) {
    logger.error('Failed to update OFM story', error as Error);
    return NextResponse.json(
      { error: 'Failed to update OFM story' },
      { status: 500 }
    );
  }
}

// DELETE /api/ofm/stories - Remove story
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Get story to update profile count
    const story = await db.oFMStory.findUnique({
      where: { id },
      select: { profileId: true },
    });

    await db.oFMStory.delete({
      where: { id },
    });

    // Update profile stories count
    if (story?.profileId) {
      await db.oFMProfile.update({
        where: { id: story.profileId },
        data: {
          storiesCount: { decrement: 1 },
        },
      });
    }

    logger.info('OFM story deleted', { storyId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete OFM story', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete OFM story' },
      { status: 500 }
    );
  }
}

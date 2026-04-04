import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/ofm/profiles - List OFM profiles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const niche = searchParams.get('niche');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (niche) where.niche = niche;

    const [profiles, total] = await Promise.all([
      db.oFMProfile.findMany({
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
          _count: {
            select: {
              OFMStory: true,
              OFMComment: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.oFMProfile.count({ where }),
    ]);

    logger.debug('OFM profiles fetched', { count: profiles.length });

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
    logger.error('Failed to fetch OFM profiles', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch OFM profiles' },
      { status: 500 }
    );
  }
}

// POST /api/ofm/profiles - Create new OFM profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const profile = await db.oFMProfile.create({
      data: {
        id: nanoid(),
        name: body.name,
        age: body.age || 23,
        bio: body.bio,
        accountId: body.accountId,
        telegramUsername: body.telegramUsername,
        channelId: body.channelId,
        mainChannelId: body.mainChannelId,
        niche: body.niche || 'relationships',
        style: body.style || 'playful',
        commentPrompt: body.commentPrompt,
        storyPrompt: body.storyPrompt,
        status: body.status || 'active',
        updatedAt: new Date(),
      },
    });

    logger.info('OFM profile created', { profileId: profile.id, name: profile.name });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create OFM profile', error as Error);
    return NextResponse.json(
      { error: 'Failed to create OFM profile' },
      { status: 500 }
    );
  }
}

// PUT /api/ofm/profiles - Update OFM profile
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

    const profile = await db.oFMProfile.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    logger.info('OFM profile updated', { profileId: id });

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error('Failed to update OFM profile', error as Error);
    return NextResponse.json(
      { error: 'Failed to update OFM profile' },
      { status: 500 }
    );
  }
}

// DELETE /api/ofm/profiles - Remove OFM profile
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

    // Delete related records first
    await db.oFMStory.deleteMany({
      where: { profileId: id },
    });
    await db.oFMComment.deleteMany({
      where: { profileId: id },
    });

    await db.oFMProfile.delete({
      where: { id },
    });

    logger.info('OFM profile deleted', { profileId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete OFM profile', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete OFM profile' },
      { status: 500 }
    );
  }
}

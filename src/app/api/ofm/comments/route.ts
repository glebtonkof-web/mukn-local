import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';

// GET /api/ofm/comments - List comments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const profileId = searchParams.get('profileId');
    const targetChannelId = searchParams.get('targetChannelId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string | undefined> = {};
    if (profileId) where.profileId = profileId;
    if (targetChannelId) where.targetChannelId = targetChannelId;
    if (status) where.status = status;

    const [comments, total] = await Promise.all([
      db.oFMComment.findMany({
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
      db.oFMComment.count({ where }),
    ]);

    logger.debug('OFM comments fetched', { count: comments.length });

    return NextResponse.json({
      comments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + comments.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch OFM comments', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch OFM comments' },
      { status: 500 }
    );
  }
}

// POST /api/ofm/comments - Generate OFM comment
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

    if (!body.targetChannelId) {
      return NextResponse.json(
        { error: 'Target channel ID is required' },
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

    let commentText = body.text;
    const style = body.style || profile.style;

    // Generate comment with AI if not provided
    if (!commentText && body.generate !== false) {
      try {
        const zai = await ZAI.create();

        const systemPrompt = profile.commentPrompt || 
          `You are a ${style} person engaging in ${profile.niche} discussions. 
          Write short, engaging comments that feel natural and authentic.
          Keep comments brief (1-2 sentences), conversational, and avoid being overly promotional.
          Use the ${style} style: playful, mysterious, friendly, or provocative.`;

        const userPrompt = body.prompt || 
          `Generate a ${style} comment for a post in a ${profile.niche} channel.`;

        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        });

        commentText = completion.choices[0]?.message?.content || undefined;
      } catch (aiError) {
        logger.error('Failed to generate comment with AI', aiError as Error);
        // Continue without AI-generated text
      }
    }

    if (!commentText) {
      return NextResponse.json(
        { error: 'Comment text is required (AI generation failed)' },
        { status: 400 }
      );
    }

    const comment = await db.oFMComment.create({
      data: {
        profileId: body.profileId,
        targetChannelId: body.targetChannelId,
        targetPostId: body.targetPostId,
        targetPostUrl: body.targetPostUrl,
        text: commentText,
        style,
        status: body.status || 'pending',
        utmSource: body.utmSource,
        utmCampaign: body.utmCampaign,
      },
    });

    // Update profile comments count
    await db.oFMProfile.update({
      where: { id: body.profileId },
      data: {
        commentsCount: { increment: 1 },
      },
    });

    logger.info('OFM comment created', { commentId: comment.id, profileId: body.profileId });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create OFM comment', error as Error);
    return NextResponse.json(
      { error: 'Failed to create OFM comment' },
      { status: 500 }
    );
  }
}

// PUT /api/ofm/comments - Update comment status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...data };

    // Handle status changes
    if (data.status === 'posted') {
      updateData.postedAt = new Date();
    } else if (data.status === 'deleted') {
      updateData.deletedAt = new Date();
    }

    const comment = await db.oFMComment.update({
      where: { id },
      data: updateData,
    });

    logger.info('OFM comment updated', { commentId: id });

    return NextResponse.json({ comment });
  } catch (error) {
    logger.error('Failed to update OFM comment', error as Error);
    return NextResponse.json(
      { error: 'Failed to update OFM comment' },
      { status: 500 }
    );
  }
}

// DELETE /api/ofm/comments - Remove comment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    // Get comment to update profile count
    const comment = await db.oFMComment.findUnique({
      where: { id },
      select: { profileId: true },
    });

    await db.oFMComment.delete({
      where: { id },
    });

    // Update profile comments count
    if (comment?.profileId) {
      await db.oFMProfile.update({
        where: { id: comment.profileId },
        data: {
          commentsCount: { decrement: 1 },
        },
      });
    }

    logger.info('OFM comment deleted', { commentId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete OFM comment', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete OFM comment' },
      { status: 500 }
    );
  }
}

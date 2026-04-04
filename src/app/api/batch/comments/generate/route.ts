/**
 * Batch Comments Generate API Endpoint
 * Handles mass comment generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { batchProcessor, BATCH_ACTIONS } from '@/lib/batch-processor';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

/**
 * GET /api/batch/comments/generate
 * Get operation status and history
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    const action = searchParams.get('action');

    // Get operation status
    if (action === 'status') {
      const operationId = searchParams.get('operationId');
      if (!operationId) {
        return NextResponse.json(
          { error: 'Operation ID is required' },
          { status: 400 }
        );
      }

      const status = await batchProcessor.getOperationStatus(operationId);
      return NextResponse.json(status);
    }

    // Get operation history
    if (action === 'history') {
      const history = await batchProcessor.getOperationHistory(userId, {
        type: 'comment_generate',
        status: searchParams.get('status') || undefined,
        limit: parseInt(searchParams.get('limit') || '20'),
        offset: parseInt(searchParams.get('offset') || '0'),
      });

      return NextResponse.json(history);
    }

    // Get influencers for comment generation
    const influencers = await db.influencer.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        niche: true,
        style: true,
        status: true,
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get pending comments
    const pendingComments = await db.comment.findMany({
      where: {
        influencer: { userId },
        status: 'pending',
      },
      include: {
        influencer: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      influencers,
      pendingComments,
      commentActions: BATCH_ACTIONS.comment,
      platforms: [
        { value: 'telegram', label: 'Telegram' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'youtube', label: 'YouTube' },
      ],
      targetTypes: [
        { value: 'post', label: 'Пост' },
        { value: 'reel', label: 'Reels' },
        { value: 'video', label: 'Видео' },
        { value: 'story', label: 'Stories' },
      ],
    });
  } catch (error) {
    logger.error('Batch comments GET error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/batch/comments/generate
 * Start batch comment generation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, commentIds, parameters } = body;

    // Handle different actions
    if (action === 'approve' || action === 'reject' || action === 'delete') {
      // Operations on existing comments
      if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
        return NextResponse.json(
          { error: 'Comment IDs are required' },
          { status: 400 }
        );
      }

      // Validate comments exist
      const existingComments = await db.comment.findMany({
        where: { id: { in: commentIds } },
        select: { id: true, status: true },
      });

      if (existingComments.length !== commentIds.length) {
        const existingIds = existingComments.map(c => c.id);
        const missingIds = commentIds.filter((id: string) => !existingIds.includes(id));
        return NextResponse.json(
          { error: `Some comments not found: ${missingIds.join(', ')}` },
          { status: 400 }
        );
      }

      // Start batch operation
      const result = await batchProcessor.startOperation(
        userId || 'default-user',
        'comment_generate',
        action,
        commentIds,
        parameters
      );

      logger.info('Batch comment operation started', {
        operationId: result.operationId,
        action,
        commentCount: commentIds.length,
      });

      return NextResponse.json({
        success: true,
        operationId: result.operationId,
        status: result.status,
        message: `Started ${action} operation on ${commentIds.length} comments`,
      });
    }

    // Generate new comments
    if (action === 'generate') {
      const {
        influencerIds,
        channels,
        targetPlatform,
        targetType,
        commentsPerChannel,
        style,
        tone,
        keywords,
        useAI,
      } = parameters || {};

      if (!influencerIds || !Array.isArray(influencerIds) || influencerIds.length === 0) {
        return NextResponse.json(
          { error: 'Influencer IDs are required' },
          { status: 400 }
        );
      }

      if (!channels || !Array.isArray(channels) || channels.length === 0) {
        return NextResponse.json(
          { error: 'Target channels are required' },
          { status: 400 }
        );
      }

      // Validate influencers
      const influencers = await db.influencer.findMany({
        where: {
          id: { in: influencerIds },
          userId: userId || 'default-user',
        },
        select: { id: true, name: true, style: true, commentPrompt: true },
      });

      if (influencers.length === 0) {
        return NextResponse.json(
          { error: 'No valid influencers found' },
          { status: 400 }
        );
      }

      // Generate batch targets
      const batchTargets: string[] = [];
      const batchParameters: Record<string, unknown> = {
        targetPlatform: targetPlatform || 'telegram',
        targetType: targetType || 'post',
        style,
        tone,
        keywords,
        useAI,
        commentsPerChannel: commentsPerChannel || 1,
      };

      // Create target entries for each influencer-channel combination
      for (const influencer of influencers) {
        for (const channel of channels) {
          const channelId = typeof channel === 'string' ? channel : channel.id;
          batchTargets.push(`${influencer.id}:${channelId}`);
        }
      }

      if (batchTargets.length === 0) {
        return NextResponse.json(
          { error: 'No batch targets generated' },
          { status: 400 }
        );
      }

      // Start batch operation
      const result = await batchProcessor.startOperation(
        userId || 'default-user',
        'comment_generate',
        'generate',
        batchTargets,
        batchParameters
      );

      logger.info('Batch comment generation started', {
        operationId: result.operationId,
        influencerCount: influencers.length,
        channelCount: channels.length,
        totalTargets: batchTargets.length,
      });

      return NextResponse.json({
        success: true,
        operationId: result.operationId,
        status: result.status,
        message: `Started comment generation for ${influencers.length} influencers across ${channels.length} channels`,
        totalTargets: batchTargets.length,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Batch comments POST error', error as Error);
    return NextResponse.json(
      { error: 'Failed to start batch operation' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/batch/comments/generate
 * Cancel operation or update comments
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { operationId, action, commentIds, status } = body;

    if (operationId && action === 'cancel') {
      const success = await batchProcessor.cancelOperation(operationId, 'User cancelled');

      return NextResponse.json({
        success,
        message: success ? 'Operation cancelled' : 'Cannot cancel operation',
      });
    }

    // Bulk update comment status
    if (commentIds && status) {
      const result = await db.comment.updateMany({
        where: { id: { in: commentIds } },
        data: { status },
      });

      return NextResponse.json({
        success: true,
        updatedCount: result.count,
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Batch comments PUT error', error as Error);
    return NextResponse.json(
      { error: 'Failed to update operation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/batch/comments/generate
 * Delete pending comments
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const commentIds = searchParams.get('ids')?.split(',');

    if (!commentIds || commentIds.length === 0) {
      return NextResponse.json(
        { error: 'Comment IDs are required' },
        { status: 400 }
      );
    }

    // Only delete pending comments
    const result = await db.comment.deleteMany({
      where: {
        id: { in: commentIds },
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    logger.error('Batch comments DELETE error', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete comments' },
      { status: 500 }
    );
  }
}

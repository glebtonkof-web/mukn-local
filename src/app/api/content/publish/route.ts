import { NextRequest, NextResponse } from 'next/server';
import { getSocialMediaPublisher, SocialPlatform } from '@/lib/social-media-publisher';
import { db } from '@/lib/db';

// POST /api/content/publish - Публикация контента на платформы
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, platforms, caption, hashtags, scheduledAt, accountId, campaignId, utmParams } = body;

    if (!contentId) {
      return NextResponse.json(
        { error: 'contentId is required' },
        { status: 400 }
      );
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'platforms array is required' },
        { status: 400 }
      );
    }

    // Получаем контент
    const content = await db.generatedContent.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Публикуем
    const publisher = getSocialMediaPublisher();
    const results = await publisher.publish({
      contentId,
      platforms: platforms as SocialPlatform[],
      caption,
      hashtags,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      accountId,
      campaignId,
      utmParams,
    });

    // Возвращаем результаты
    return NextResponse.json({
      success: results.every(r => r.success),
      results,
      contentId,
      publishedAt: new Date(),
    });
  } catch (error) {
    console.error('[API Content Publish] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/content/publish - Получение статуса публикации
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    const scheduleId = searchParams.get('scheduleId');

    if (contentId) {
      // Получаем статистику публикации для контента
      const publisher = getSocialMediaPublisher();
      const stats = await publisher.getPublishStats(contentId);

      return NextResponse.json({
        contentId,
        stats,
      });
    }

    if (scheduleId) {
      // Получаем конкретное расписание
      const schedule = await db.publicationSchedule.findUnique({
        where: { id: scheduleId },
      });

      if (!schedule) {
        return NextResponse.json(
          { error: 'Schedule not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        schedule: {
          id: schedule.id,
          contentId: schedule.contentId,
          platforms: JSON.parse(schedule.platforms || '[]'),
          scheduledAt: schedule.scheduledAt,
          publishedAt: schedule.publishedAt,
          status: schedule.status,
          results: JSON.parse(schedule.publishResults || '{}'),
        },
      });
    }

    // Получаем список запланированных публикаций
    const schedules = await db.publicationSchedule.findMany({
      where: { status: 'pending' },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    });

    return NextResponse.json({
      schedules: schedules.map(s => ({
        id: s.id,
        contentId: s.contentId,
        platforms: JSON.parse(s.platforms || '[]'),
        scheduledAt: s.scheduledAt,
        status: s.status,
      })),
    });
  } catch (error) {
    console.error('[API Content Publish] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/content/publish - Отмена запланированной публикации
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'scheduleId is required' },
        { status: 400 }
      );
    }

    const schedule = await db.publicationSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    if (schedule.status === 'published') {
      return NextResponse.json(
        { error: 'Cannot cancel already published schedule' },
        { status: 400 }
      );
    }

    await db.publicationSchedule.update({
      where: { id: scheduleId },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({
      success: true,
      message: 'Publication cancelled',
    });
  } catch (error) {
    console.error('[API Content Publish] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

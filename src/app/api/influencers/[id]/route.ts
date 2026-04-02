import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/influencers/[id] - Получить инфлюенсера по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const influencer = await db.influencer.findUnique({
      where: { id },
      include: {
        account: true,
        simCard: true,
        posts: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        directMessages: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        analytics: {
          take: 30,
          orderBy: { date: 'desc' },
        },
        campaigns: {
          include: {
            campaign: true,
          },
        },
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ influencer });
  } catch (error) {
    console.error('Error fetching influencer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch influencer' },
      { status: 500 }
    );
  }
}

// PUT /api/influencers/[id] - Обновить инфлюенсера
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const influencer = await db.influencer.update({
      where: { id },
      data: {
        name: body.name,
        age: body.age,
        gender: body.gender,
        niche: body.niche,
        role: body.role,
        style: body.style,
        country: body.country,
        language: body.language,
        avatarUrl: body.avatarUrl,
        status: body.status,
        telegramUsername: body.telegramUsername,
        telegramChannel: body.telegramChannel,
        instagramUsername: body.instagramUsername,
        tiktokUsername: body.tiktokUsername,
        youtubeChannelId: body.youtubeChannelId,
        accountId: body.accountId,
        simCardId: body.simCardId,
        banRisk: body.banRisk,
        predictedLifeDays: body.predictedLifeDays,
      },
    });

    return NextResponse.json({ influencer });
  } catch (error) {
    console.error('Error updating influencer:', error);
    return NextResponse.json(
      { error: 'Failed to update influencer' },
      { status: 500 }
    );
  }
}

// PATCH /api/influencers/[id] - Частичное обновление инфлюенсера
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Filter out undefined values
    const updateData: Record<string, any> = {};
    const allowedFields = [
      'name', 'age', 'gender', 'niche', 'role', 'style', 'country', 'language',
      'avatarUrl', 'status', 'telegramUsername', 'telegramChannel',
      'instagramUsername', 'tiktokUsername', 'youtubeChannelId',
      'accountId', 'simCardId', 'banRisk', 'predictedLifeDays'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const influencer = await db.influencer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ influencer });
  } catch (error) {
    console.error('Error patching influencer:', error);
    return NextResponse.json(
      { error: 'Failed to update influencer' },
      { status: 500 }
    );
  }
}

// DELETE /api/influencers/[id] - Удалить инфлюенсера
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Удаляем связанные данные
    await db.$transaction([
      db.comment.deleteMany({ where: { influencerId: id } }),
      db.directMessage.deleteMany({ where: { influencerId: id } }),
      db.post.deleteMany({ where: { influencerId: id } }),
      db.influencerAnalytics.deleteMany({ where: { influencerId: id } }),
      db.contentQueue.deleteMany({ where: { influencerId: id } }),
      db.campaignInfluencer.deleteMany({ where: { influencerId: id } }),
      db.influencer.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting influencer:', error);
    return NextResponse.json(
      { error: 'Failed to delete influencer' },
      { status: 500 }
    );
  }
}

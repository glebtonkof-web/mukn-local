import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/dashboard/activities - Get activity feed
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const activities = await db.activityLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });

    const total = await db.activityLog.count();

    return NextResponse.json({
      activities: activities.map(a => ({
        id: a.id,
        type: a.type,
        message: a.message,
        timestamp: a.createdAt,
        campaignId: a.campaignId,
        accountId: a.accountId,
        metadata: a.metadata ? JSON.parse(a.metadata) : null
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + activities.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/activities - Create activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, message, campaignId, accountId, userId, metadata } = body;

    if (!type || !message) {
      return NextResponse.json(
        { error: 'Type and message are required' },
        { status: 400 }
      );
    }

    const activity = await db.activityLog.create({
      data: {
        id: nanoid(),
        type,
        message,
        campaignId,
        accountId,
        userId,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    return NextResponse.json({
      activity: {
        id: activity.id,
        type: activity.type,
        message: activity.message,
        timestamp: activity.createdAt,
        campaignId: activity.campaignId,
        accountId: activity.accountId
      }
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}

/**
 * Rate Limit API Endpoint
 * Check and manage rate limits
 */

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import {
  RateLimitPresets,
  createRateLimiter,
  getRateLimitHeaders,
  CombinedRateLimiter
} from '@/lib/rate-limiter'
import { hasPermission, isValidRole } from '@/lib/rbac'
import { db } from '@/lib/db'

/**
 * Check rate limit status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'api'
    const identifier = searchParams.get('identifier')

    // Get client IP
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const id = identifier || clientIp

    // Select preset
    const presetMap: Record<string, keyof typeof RateLimitPresets> = {
      auth: 'AUTH',
      '2fa': 'TWO_FA',
      api: 'API',
      write: 'WRITE',
      read: 'READ',
      sensitive: 'SENSITIVE'
    }

    const preset = presetMap[type] || 'API'
    const limiter = createRateLimiter(preset)

    const result = limiter.check(id)

    return NextResponse.json({
      identifier: id,
      type,
      ...result
    }, {
      headers: getRateLimitHeaders(result)
    })

  } catch (error) {
    console.error('Rate limit check error:', error)
    return NextResponse.json(
      { error: 'Failed to check rate limit' },
      { status: 500 }
    )
  }
}

/**
 * Check combined rate limit (IP + User)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ipPreset = 'API', userPreset = 'API' } = body

    // Get client IP
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Create combined limiter
    const limiter = new CombinedRateLimiter(
      RateLimitPresets[ipPreset as keyof typeof RateLimitPresets] || RateLimitPresets.API,
      RateLimitPresets[userPreset as keyof typeof RateLimitPresets] || RateLimitPresets.API
    )

    const result = limiter.check(clientIp, userId)

    return NextResponse.json({
      ip: clientIp,
      userId,
      ...result
    }, {
      headers: getRateLimitHeaders(result)
    })

  } catch (error) {
    console.error('Combined rate limit check error:', error)
    return NextResponse.json(
      { error: 'Failed to check rate limit' },
      { status: 500 }
    )
  }
}

/**
 * Reset rate limit (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const identifier = searchParams.get('identifier')
    const adminUserId = searchParams.get('adminUserId')

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'Admin user ID required' },
        { status: 401 }
      )
    }

    // Verify admin permissions
    const adminUser = await db.user.findUnique({
      where: { id: adminUserId }
    })

    if (!adminUser || !isValidRole(adminUser.role) ||
        !hasPermission(adminUser.role, 'admin:system_config')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier required' },
        { status: 400 }
      )
    }

    // Reset rate limit
    const limiter = createRateLimiter('API')
    limiter.reset(identifier)

    // Log action
    await db.actionLog.create({
      data: {
        id: nanoid(),
        userId: adminUserId,
        action: 'RESET_RATE_LIMIT',
        entityType: 'rate_limit',
        details: JSON.stringify({ identifier })
      }
    })

    return NextResponse.json({
      success: true,
      message: `Rate limit reset for ${identifier}`
    })

  } catch (error) {
    console.error('Rate limit reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset rate limit' },
      { status: 500 }
    )
  }
}

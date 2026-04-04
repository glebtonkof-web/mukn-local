/**
 * Session Management API Endpoint
 * Handles session listing, termination, and cleanup
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateSecureToken } from '@/lib/crypto'
import { hasPermission } from '@/lib/rbac'

interface CreateSessionRequest {
  userId: string
  ipAddress?: string
  userAgent?: string
  deviceName?: string
  location?: string
  expiresIn?: number // Session duration in seconds
}

interface TerminateSessionRequest {
  userId: string
  sessionId?: string // Specific session to terminate
  terminateOthers?: boolean // Terminate all other sessions
  currentSessionToken?: string // Current session token (to avoid terminating current session)
}

// Default session duration: 7 days
const DEFAULT_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000

/**
 * Create a new session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateSessionRequest
    const { userId, ipAddress, userAgent, deviceName, location, expiresIn } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate session token
    const token = generateSecureToken(32)
    const expiresAt = new Date(Date.now() + (expiresIn || DEFAULT_SESSION_DURATION))

    // Create session
    const session = await db.session.create({
      data: {
        userId,
        token,
        expiresAt,
        ipAddress,
        userAgent,
        deviceName,
        location
      }
    })

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        token: session.token,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt
      }
    })

  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

/**
 * Get sessions for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const includeExpired = searchParams.get('includeExpired') === 'true'

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const now = new Date()

    // Build query
    const where = {
      userId,
      ...(includeExpired ? {} : { expiresAt: { gt: now } })
    }

    // Get sessions
    const sessions = await db.session.findMany({
      where,
      orderBy: { lastActiveAt: 'desc' }
    })

    // Mark current session (if token provided)
    const currentToken = searchParams.get('currentToken')
    const enrichedSessions = sessions.map(session => ({
      id: session.id,
      deviceName: session.deviceName,
      ipAddress: session.ipAddress,
      location: session.location,
      lastActiveAt: session.lastActiveAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isExpired: session.expiresAt < now,
      isCurrent: currentToken ? session.token === currentToken : false
    }))

    // Get statistics
    const stats = {
      total: sessions.length,
      active: sessions.filter(s => s.expiresAt > now).length,
      expired: sessions.filter(s => s.expiresAt <= now).length
    }

    return NextResponse.json({
      sessions: enrichedSessions,
      stats
    })

  } catch (error) {
    console.error('Session fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

/**
 * Terminate sessions
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as TerminateSessionRequest
    const { userId, sessionId, terminateOthers, currentSessionToken } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let deletedCount = 0

    if (terminateOthers) {
      // Terminate all other sessions (keep current)
      const result = await db.session.deleteMany({
        where: {
          userId,
          ...(currentSessionToken ? { NOT: { token: currentSessionToken } } : {})
        }
      })
      deletedCount = result.count
    } else if (sessionId) {
      // Terminate specific session
      const session = await db.session.findFirst({
        where: { id: sessionId, userId }
      })

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      // Don't allow terminating current session
      if (currentSessionToken && session.token === currentSessionToken) {
        return NextResponse.json(
          { error: 'Cannot terminate current session. Use logout instead.' },
          { status: 400 }
        )
      }

      await db.session.delete({
        where: { id: sessionId }
      })
      deletedCount = 1
    } else {
      return NextResponse.json(
        { error: 'Either sessionId or terminateOthers is required' },
        { status: 400 }
      )
    }

    // Create audit log
    await db.actionLog.create({
      data: {
        userId,
        action: terminateOthers ? 'TERMINATE_OTHER_SESSIONS' : 'TERMINATE_SESSION',
        entityType: 'session',
        details: JSON.stringify({
          deletedCount,
          sessionId
        })
      }
    })

    return NextResponse.json({
      success: true,
      deletedCount,
      message: terminateOthers
        ? `Terminated ${deletedCount} other sessions`
        : 'Session terminated successfully'
    })

  } catch (error) {
    console.error('Session termination error:', error)
    return NextResponse.json(
      { error: 'Failed to terminate session(s)' },
      { status: 500 }
    )
  }
}

/**
 * Update session activity / Clean up expired sessions
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sessionToken, userId } = body

    if (action === 'cleanup') {
      // Clean up expired sessions (admin operation)
      if (userId) {
        const user = await db.user.findUnique({
          where: { id: userId }
        })

        if (!user || !hasPermission(user.role as 'admin' | 'operator' | 'user', 'admin:system_config')) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      }

      const result = await db.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      })

      return NextResponse.json({
        success: true,
        deletedCount: result.count,
        message: `Cleaned up ${result.count} expired sessions`
      })
    }

    if (action === 'activity' && sessionToken) {
      // Update last active timestamp
      const session = await db.session.findUnique({
        where: { token: sessionToken }
      })

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await db.session.delete({
          where: { id: session.id }
        })
        return NextResponse.json(
          { error: 'Session expired', expired: true },
          { status: 401 }
        )
      }

      // Update activity
      await db.session.update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() }
      })

      return NextResponse.json({
        success: true,
        message: 'Activity recorded'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Session update error:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}

/**
 * Validate session token
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!session) {
      return NextResponse.json(
        { valid: false, error: 'Session not found' },
        { status: 401 }
      )
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await db.session.delete({
        where: { id: session.id }
      })
      return NextResponse.json(
        { valid: false, error: 'Session expired', expired: true },
        { status: 401 }
      )
    }

    // Update last active
    await db.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() }
    })

    return NextResponse.json({
      valid: true,
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        twoFactorEnabled: session.user.twoFactorEnabled
      }
    })

  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate session' },
      { status: 500 }
    )
  }
}

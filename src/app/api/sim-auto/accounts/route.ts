/**
 * SIM Auto Accounts API
 * GET: List all registered accounts or get account details
 * DELETE: Delete account
 */

import { NextRequest, NextResponse } from 'next/server'
import { registrationManager } from '@/lib/sim-auto/registration-manager'
import { sessionManager, type Platform } from '@/lib/sim-auto/session-manager'
import { db } from '@/lib/db'

// Valid platforms
const VALID_PLATFORMS: Platform[] = [
  'telegram',
  'instagram',
  'tiktok',
  'twitter',
  'youtube',
  'whatsapp',
  'viber',
  'signal',
  'discord',
  'reddit'
]

// Valid account statuses
const VALID_STATUSES = ['registered', 'warming', 'active', 'banned', 'sold']

/**
 * GET /api/sim-auto/accounts
 * List all registered accounts or get account details
 *
 * Query params:
 * - accountId: string (optional) - Get specific account details
 * - simCardId: string (optional) - Filter by SIM card
 * - platform: string (optional) - Filter by platform
 * - status: string (optional) - Filter by status
 * - page: number (optional) - Page number (default: 1)
 * - limit: number (optional) - Items per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const simCardId = searchParams.get('simCardId')
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Get specific account details
    if (accountId) {
      const account = await db.simCardAccount.findUnique({
        where: { id: accountId },
        include: {
          SimCardWarmingLog: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          SimCardProfitLog: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })

      if (!account) {
        return NextResponse.json(
          { error: 'Account not found' },
          { status: 404 }
        )
      }

      // Validate session
      const sessionValidation = await sessionManager.validateSession(accountId)

      // Get platform config
      const platformConfig = registrationManager.getPlatformConfig(account.platform as Platform)

      // Get platform limits
      const limitCheck = await registrationManager.checkPlatformLimit(
        account.simCardId,
        account.platform as Platform
      )

      return NextResponse.json({
        account: {
          id: account.id,
          platform: account.platform,
          phoneNumber: account.phoneNumber,
          username: account.username,
          email: account.email,
          status: account.status,
          banReason: account.banReason,
          warmingProgress: account.warmingProgress,
          warmingPhase: account.warmingPhase,
          warmingStartedAt: account.warmingStartedAt,
          warmingEndsAt: account.warmingEndsAt,
          lastActivityAt: account.lastActivityAt,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt
        },
        session: {
          valid: sessionValidation.valid,
          reason: sessionValidation.reason,
          lastValidatedAt: sessionValidation.session?.lastValidatedAt
        },
        platformConfig: {
          supportsTwoFA: platformConfig.supportsTwoFA,
          requiresPhoneVerification: platformConfig.requiresPhoneVerification
        },
        limits: {
          current: limitCheck.current,
          max: limitCheck.limit
        },
        warmingLogs: account.SimCardWarmingLog.map(log => ({
          id: log.id,
          actionType: log.actionType,
          target: log.target,
          result: log.result,
          riskScore: log.riskScore,
          createdAt: log.createdAt
        })),
        profitLogs: account.SimCardProfitLog.map(log => ({
          id: log.id,
          revenueType: log.revenueType,
          amount: log.amount,
          currency: log.currency,
          description: log.description,
          createdAt: log.createdAt
        }))
      })
    }

    // Build filter
    const where: Record<string, unknown> = {}

    if (simCardId) {
      where.simCardId = simCardId
    }

    if (platform) {
      if (!VALID_PLATFORMS.includes(platform as Platform)) {
        return NextResponse.json(
          { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` },
          { status: 400 }
        )
      }
      where.platform = platform
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      where.status = status
    }

    // Get total count
    const total = await db.simCardAccount.count({ where })

    // Get accounts with pagination
    const accounts = await db.simCardAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    // Get platform limits
    const platformLimits = registrationManager.getPlatformLimits()

    // Get summary stats
    const stats = await db.simCardAccount.groupBy({
      by: ['platform', 'status'],
      _count: true
    })

    return NextResponse.json({
      accounts: accounts.map(account => ({
        id: account.id,
        simCardId: account.simCardId,
        platform: account.platform,
        phoneNumber: account.phoneNumber,
        username: account.username,
        status: account.status,
        warmingProgress: account.warmingProgress,
        warmingPhase: account.warmingPhase,
        lastActivityAt: account.lastActivityAt,
        createdAt: account.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      platformLimits,
      summary: {
        byPlatform: VALID_PLATFORMS.map(p => ({
          platform: p,
          total: stats.filter(s => s.platform === p).reduce((acc, s) => acc + s._count, 0),
          byStatus: VALID_STATUSES.reduce((acc, st) => {
            const stat = stats.find(s => s.platform === p && s.status === st)
            acc[st] = stat?._count || 0
            return acc
          }, {} as Record<string, number>)
        })),
        totalAccounts: total
      }
    })
  } catch (error) {
    console.error('[API] Get accounts error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sim-auto/accounts
 * Delete account
 *
 * Query params:
 * - accountId: string (required) - Account ID to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing required query param: accountId' },
        { status: 400 }
      )
    }

    // Check if account exists
    const account = await db.simCardAccount.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Delete account
    const deleted = await registrationManager.deleteAccount(accountId)

    if (deleted) {
      return NextResponse.json({
        success: true,
        message: 'Account deleted successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[API] Delete account error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/sim-auto/accounts
 * Update account status or warming progress
 *
 * Body:
 * - accountId: string (required) - Account ID
 * - status?: string - New status
 * - warmingProgress?: number - Update warming progress (0-100)
 * - warmingPhase?: number - Update warming phase (0-4)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, status, warmingProgress, warmingPhase } = body

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing required field: accountId' },
        { status: 400 }
      )
    }

    // Check if account exists
    const existingAccount = await db.simCardAccount.findUnique({
      where: { id: accountId }
    })

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate warming progress if provided
    if (warmingProgress !== undefined && (warmingProgress < 0 || warmingProgress > 100)) {
      return NextResponse.json(
        { error: 'Warming progress must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Validate warming phase if provided
    if (warmingPhase !== undefined && (warmingPhase < 0 || warmingPhase > 4)) {
      return NextResponse.json(
        { error: 'Warming phase must be between 0 and 4' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    }

    if (status) {
      updateData.status = status

      // Set warming timestamps if status changes
      if (status === 'warming' && !existingAccount.warmingStartedAt) {
        updateData.warmingStartedAt = new Date()
      }

      if (status === 'active' && !existingAccount.warmingEndsAt) {
        updateData.warmingEndsAt = new Date()
        updateData.warmingProgress = 100
      }
    }

    if (warmingProgress !== undefined) {
      updateData.warmingProgress = warmingProgress
    }

    if (warmingPhase !== undefined) {
      updateData.warmingPhase = warmingPhase
    }

    // Update account
    const updatedAccount = await db.simCardAccount.update({
      where: { id: accountId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      account: {
        id: updatedAccount.id,
        status: updatedAccount.status,
        warmingProgress: updatedAccount.warmingProgress,
        warmingPhase: updatedAccount.warmingPhase,
        warmingStartedAt: updatedAccount.warmingStartedAt,
        warmingEndsAt: updatedAccount.warmingEndsAt,
        updatedAt: updatedAccount.updatedAt
      }
    })
  } catch (error) {
    console.error('[API] Update account error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/sim-auto/accounts
 * Export session for backup
 *
 * Body:
 * - accountId: string (required) - Account ID
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing required field: accountId' },
        { status: 400 }
      )
    }

    // Check if account exists
    const account = await db.simCardAccount.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Export session
    const exportedSession = await sessionManager.exportSession(accountId)

    return NextResponse.json({
      success: true,
      export: {
        accountId,
        platform: account.platform,
        username: account.username,
        encryptedSession: exportedSession,
        exportedAt: new Date()
      }
    })
  } catch (error) {
    console.error('[API] Export session error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

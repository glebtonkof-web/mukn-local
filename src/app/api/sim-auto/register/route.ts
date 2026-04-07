/**
 * SIM Auto Registration API
 * POST: Start registration for platform
 * GET: Get registration status
 * DELETE: Cancel registration
 */

import { NextRequest, NextResponse } from 'next/server'
import { registrationManager } from '@/lib/sim-auto/registration-manager'
import { type Platform } from '@/lib/sim-auto/session-manager'
import { db } from '@/lib/db'

// Platform validation
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

/**
 * POST /api/sim-auto/register
 * Start registration for a platform
 *
 * Body:
 * - platform: string (required) - Platform to register on
 * - phoneNumber: string (required) - Phone number to register
 * - simCardId: string (required) - SIM card ID
 * - profileData?: object - Optional profile data
 * - proxy?: object - Optional proxy configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { platform, phoneNumber, simCardId, profileData, proxy } = body

    if (!platform || !phoneNumber || !simCardId) {
      return NextResponse.json(
        { error: 'Missing required fields: platform, phoneNumber, simCardId' },
        { status: 400 }
      )
    }

    // Validate platform
    if (!VALID_PLATFORMS.includes(platform as Platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(phoneNumber.replace(/[\s-]/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (e.g., +79001234567)' },
        { status: 400 }
      )
    }

    // Check if SIM card exists
    const simCard = await db.simCardDetected.findUnique({
      where: { id: simCardId }
    })

    if (!simCard) {
      return NextResponse.json(
        { error: 'SIM card not found' },
        { status: 404 }
      )
    }

    // Check platform limits
    const limitCheck = await registrationManager.checkPlatformLimit(simCardId, platform as Platform)

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.reason,
          limits: {
            current: limitCheck.current,
            max: limitCheck.limit
          }
        },
        { status: 400 }
      )
    }

    // Start registration
    const result = await registrationManager.registerAccount(
      platform as Platform,
      phoneNumber,
      simCardId,
      {
        profileData,
        proxy
      }
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        account: {
          id: result.accountId,
          platform,
          username: result.username
        },
        retryCount: result.retryCount
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          requiresManualAction: result.requiresManualAction,
          manualActionType: result.manualActionType,
          retryCount: result.retryCount
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[API] Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sim-auto/register
 * Get registration status
 *
 * Query params:
 * - jobId: string (required) - Registration job ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing required query param: jobId' },
        { status: 400 }
      )
    }

    // Get registration status
    const job = await registrationManager.getRegistrationStatus(jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Registration job not found' },
        { status: 404 }
      )
    }

    // Get platform config
    const platformConfig = registrationManager.getPlatformConfig(job.platform)

    return NextResponse.json({
      job: {
        id: job.id,
        platform: job.platform,
        phoneNumber: job.phoneNumber,
        status: job.status,
        username: job.username,
        errorMessage: job.errorMessage,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      },
      platformConfig: {
        requiresPhoneVerification: platformConfig.requiresPhoneVerification,
        requiresEmailVerification: platformConfig.requiresEmailVerification,
        verificationTimeout: platformConfig.verificationTimeout
      }
    })
  } catch (error) {
    console.error('[API] Get registration status error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sim-auto/register
 * Cancel registration
 *
 * Query params:
 * - jobId: string (required) - Registration job ID to cancel
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing required query param: jobId' },
        { status: 400 }
      )
    }

    const cancelled = await registrationManager.cancelRegistration(jobId)

    if (cancelled) {
      return NextResponse.json({
        success: true,
        message: 'Registration cancelled'
      })
    } else {
      return NextResponse.json(
        { error: 'Could not cancel registration. Job may already be completed or not found.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[API] Cancel registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/sim-auto/register
 * Provide verification code
 *
 * Body:
 * - jobId: string (required) - Registration job ID
 * - code: string (required) - Verification code
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, code } = body

    if (!jobId || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, code' },
        { status: 400 }
      )
    }

    // Validate code format (typically 4-6 digits)
    const codeRegex = /^\d{4,6}$/
    if (!codeRegex.test(code)) {
      return NextResponse.json(
        { error: 'Invalid verification code format. Must be 4-6 digits.' },
        { status: 400 }
      )
    }

    const provided = await registrationManager.provideVerificationCode(jobId, code)

    if (provided) {
      return NextResponse.json({
        success: true,
        message: 'Verification code provided'
      })
    } else {
      return NextResponse.json(
        { error: 'Could not provide verification code. Job may not be in verifying state.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[API] Provide verification code error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

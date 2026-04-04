/**
 * 2FA Verify API Endpoint
 * Verifies TOTP code and enables 2FA for the user
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticator } from 'otplib'
import { db } from '@/lib/db'
import { serverDecrypt, verifyBackupCode } from '@/lib/crypto'
import { twoFaRateLimiter, getRateLimitHeaders, ExponentialBackoffLimiter } from '@/lib/rate-limiter'

interface Verify2FARequest {
  userId: string
  code: string // TOTP code or backup code
  isBackupCode?: boolean
}

// Exponential backoff for failed attempts
const backoffLimiter = new ExponentialBackoffLimiter(1000, 3600000, 2)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Verify2FARequest
    const { userId, code, isBackupCode = false } = body

    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Check rate limit
    const rateResult = twoFaRateLimiter.check(`2fa-verify:${clientIp}:${userId}`)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again later.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateResult)
        }
      )
    }

    // Check exponential backoff
    const backoffResult = backoffLimiter.check(`2fa-verify:${clientIp}:${userId}`)
    if (!backoffResult.success) {
      return NextResponse.json(
        {
          error: 'Account temporarily locked due to too many failed attempts.',
          retryAfter: backoffResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': backoffResult.retryAfter?.toString() || '60'
          }
        }
      )
    }

    // Validate input
    if (!userId || !code) {
      return NextResponse.json(
        { error: 'User ID and verification code are required' },
        { status: 400 }
      )
    }

    // Validate code format
    const cleanCode = code.replace(/\s/g, '')
    if (!isBackupCode && !/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: 'Invalid code format. Please enter a 6-digit code.' },
        { status: 400 }
      )
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if 2FA secret exists
    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'Two-factor authentication not set up. Please enable it first.' },
        { status: 400 }
      )
    }

    // Decrypt secret
    const secret = serverDecrypt(user.twoFactorSecret)

    let isValid = false

    if (isBackupCode) {
      // Verify backup code
      if (user.twoFactorBackupCodes) {
        const hashedCodes = JSON.parse(user.twoFactorBackupCodes) as string[]
        isValid = verifyBackupCode(cleanCode, hashedCodes)

        if (isValid) {
          // Remove used backup code
          const updatedCodes = hashedCodes.filter(
            hashed => !verifyBackupCode(cleanCode, [hashed])
          )
          await db.user.update({
            where: { id: userId },
            data: {
              twoFactorBackupCodes: JSON.stringify(updatedCodes),
              updatedAt: new Date()
            }
          })
        }
      }
    } else {
      // Verify TOTP code
      try {
        isValid = authenticator.check(cleanCode, secret)
      } catch {
        isValid = false
      }
    }

    if (!isValid) {
      // Record failed attempt
      backoffLimiter.recordFailure(`2fa-verify:${clientIp}:${userId}`)
      twoFaRateLimiter.recordFailure(`2fa-verify:${clientIp}:${userId}`)

      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 401 }
      )
    }

    // Record successful attempt (resets backoff)
    backoffLimiter.recordSuccess(`2fa-verify:${clientIp}:${userId}`)

    // Enable 2FA if this is initial verification
    if (!user.twoFactorEnabled) {
      await db.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorVerifiedAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: isBackupCode
        ? 'Backup code verified successfully.'
        : 'Two-factor authentication verified successfully.',
      enabled: true,
      verifiedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json(
      { error: 'Failed to verify two-factor authentication' },
      { status: 500 }
    )
  }
}

/**
 * Validate TOTP code for ongoing authentication
 * This is used during login, not for initial setup
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Verify2FARequest
    const { userId, code, isBackupCode = false } = body

    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Check rate limit
    const rateResult = twoFaRateLimiter.check(`2fa-login:${clientIp}:${userId}`)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Get user with 2FA data
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'Two-factor authentication not configured' },
        { status: 400 }
      )
    }

    const secret = serverDecrypt(user.twoFactorSecret)
    const cleanCode = code.replace(/\s/g, '')
    let isValid = false

    if (isBackupCode && user.twoFactorBackupCodes) {
      const hashedCodes = JSON.parse(user.twoFactorBackupCodes) as string[]
      isValid = verifyBackupCode(cleanCode, hashedCodes)
    } else {
      try {
        isValid = authenticator.check(cleanCode, secret)
      } catch {
        isValid = false
      }
    }

    if (!isValid) {
      twoFaRateLimiter.recordFailure(`2fa-login:${clientIp}:${userId}`)
      return NextResponse.json(
        { valid: false, error: 'Invalid code' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      valid: true,
      message: 'Code verified successfully'
    })

  } catch (error) {
    console.error('2FA validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate code' },
      { status: 500 }
    )
  }
}

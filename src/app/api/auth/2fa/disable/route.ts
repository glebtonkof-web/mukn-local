/**
 * 2FA Disable API Endpoint
 * Disables two-factor authentication for a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { TOTP } from 'otplib'
import { db } from '@/lib/db'
import { serverDecrypt, verifyBackupCode } from '@/lib/crypto'
import { twoFaRateLimiter, getRateLimitHeaders } from '@/lib/rate-limiter'
import { hasPermission, isValidRole } from '@/lib/rbac'

interface Disable2FARequest {
  userId: string
  code?: string // TOTP or backup code for verification
  password?: string // User's password for additional security
  adminUserId?: string // If admin is disabling for another user
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Disable2FARequest
    const { userId, code, password, adminUserId } = body

    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Check rate limit
    const rateResult = twoFaRateLimiter.check(`2fa-disable:${clientIp}`)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateResult)
        }
      )
    }

    // Validate input
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
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

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is not enabled' },
        { status: 400 }
      )
    }

    // If admin is disabling for another user
    if (adminUserId && adminUserId !== userId) {
      const adminUser = await db.user.findUnique({
        where: { id: adminUserId }
      })

      if (!adminUser) {
        return NextResponse.json(
          { error: 'Admin user not found' },
          { status: 404 }
        )
      }

      // Check if admin has permission
      if (!isValidRole(adminUser.role) || !hasPermission(adminUser.role, 'security:update')) {
        return NextResponse.json(
          { error: 'You do not have permission to disable 2FA for other users' },
          { status: 403 }
        )
      }

      // Admin can disable without code verification
      await db.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
          twoFactorVerifiedAt: null,
          updatedAt: new Date()
        }
      })

      // Create audit log
      await db.actionLog.create({
        data: {
          userId: adminUserId,
          action: 'DISABLE_2FA',
          entityType: 'user',
          entityId: userId,
          details: JSON.stringify({
            adminEmail: adminUser.email,
            targetUserEmail: user.email,
            clientIp
          })
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Two-factor authentication disabled by administrator'
      })
    }

    // Self-disable requires verification
    if (!code && !password) {
      return NextResponse.json(
        { error: 'Verification code or password is required to disable 2FA' },
        { status: 400 }
      )
    }

    // Verify code or password
    let isVerified = false

    if (code && user.twoFactorSecret) {
      const secret = serverDecrypt(user.twoFactorSecret)
      const cleanCode = code.replace(/\s/g, '')

      // Check if it's a backup code
      if (user.twoFactorBackupCodes && cleanCode.includes('-')) {
        const hashedCodes = JSON.parse(user.twoFactorBackupCodes) as string[]
        isVerified = verifyBackupCode(cleanCode, hashedCodes)
      } else {
        // Verify TOTP
        try {
          const totp = new TOTP({ secret })
          const result = await totp.verify(cleanCode)
          isVerified = result.valid
        } catch {
          isVerified = false
        }
      }
    } else if (password) {
      // Verify password (placeholder - use proper password verification in production)
      isVerified = user.password === password
    }

    if (!isVerified) {
      twoFaRateLimiter.recordFailure(`2fa-disable:${clientIp}`)
      return NextResponse.json(
        { error: 'Invalid verification code or password' },
        { status: 401 }
      )
    }

    // Disable 2FA
    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorVerifiedAt: null,
        updatedAt: new Date()
      }
    })

    // Create audit log
    await db.actionLog.create({
      data: {
        userId,
        action: 'DISABLE_2FA_SELF',
        entityType: 'user',
        entityId: userId,
        details: JSON.stringify({
          userEmail: user.email,
          clientIp
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    })

  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json(
      { error: 'Failed to disable two-factor authentication' },
      { status: 500 }
    )
  }
}

/**
 * Regenerate backup codes
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Disable2FARequest
    const { userId, code } = body

    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Check rate limit
    const rateResult = twoFaRateLimiter.check(`2fa-regenerate:${clientIp}`)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'User ID and verification code are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'Two-factor authentication not enabled' },
        { status: 400 }
      )
    }

    // Verify current code
    const secret = serverDecrypt(user.twoFactorSecret)
    const cleanCode = code.replace(/\s/g, '')

    let isValid = false
    try {
      const totp = new TOTP({ secret })
      const result = await totp.verify(cleanCode)
      isValid = result.valid
    } catch {
      isValid = false
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      )
    }

    // Generate new backup codes
    const { generateBackupCodes, hashBackupCodes } = await import('@/lib/crypto')
    const backupCodes = generateBackupCodes(10)
    const hashedBackupCodes = hashBackupCodes(backupCodes)

    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      backupCodes,
      message: 'New backup codes generated. Save these codes in a secure location.'
    })

  } catch (error) {
    console.error('Backup code regeneration error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate backup codes' },
      { status: 500 }
    )
  }
}

/**
 * 2FA Enable API Endpoint
 * Generates TOTP secret and QR code for Google Authenticator
 */

import { NextRequest, NextResponse } from 'next/server'
import { TOTP } from 'otplib'
import QRCode from 'qrcode'
import { db } from '@/lib/db'
import { serverEncrypt, generateBackupCodes, hashBackupCodes } from '@/lib/crypto'
import { twoFaRateLimiter, getRateLimitHeaders } from '@/lib/rate-limiter'

interface Enable2FARequest {
  userId: string
  password: string // User's current password for verification
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Enable2FARequest
    const { userId, password } = body

    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Check rate limit
    const rateResult = twoFaRateLimiter.check(`2fa-enable:${clientIp}`)
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
    if (!userId || !password) {
      return NextResponse.json(
        { error: 'User ID and password are required' },
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

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is already enabled' },
        { status: 400 }
      )
    }

    // Verify password (simplified - in production, use proper password verification)
    // Note: In production, you'd use bcrypt.compare(password, user.password)
    // This is a placeholder for the actual password verification logic
    if (user.password !== password) {
      twoFaRateLimiter.recordFailure(`2fa-enable:${clientIp}`)
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Generate TOTP secret
    const totp = new TOTP()
    const secret = totp.options.secret ||= TOTP.generateSecret(20).secret

    // Generate backup codes
    const backupCodes = generateBackupCodes(10)
    const hashedBackupCodes = hashBackupCodes(backupCodes)

    // Create OTP auth URL for QR code
    const appName = encodeURIComponent('МУКН | Трафик')
    const userEmail = encodeURIComponent(user.email)
    const otpAuthUrl = new TOTP({ secret, issuer: appName, label: userEmail }).toString()

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })

    // Store encrypted secret and backup codes (temporarily until verified)
    // In production, these would be stored encrypted with the user's master password
    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: serverEncrypt(secret),
        twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication setup initiated. Please verify with your authenticator app.',
      qrCode: qrCodeDataUrl,
      secret: secret, // Show secret for manual entry
      backupCodes: backupCodes, // Show backup codes once
      otpAuthUrl
    }, {
      headers: getRateLimitHeaders(rateResult)
    })

  } catch (error) {
    console.error('2FA enable error:', error)
    return NextResponse.json(
      { error: 'Failed to enable two-factor authentication' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check 2FA status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorVerifiedAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      enabled: user.twoFactorEnabled,
      verifiedAt: user.twoFactorVerifiedAt
    })

  } catch (error) {
    console.error('2FA status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check 2FA status' },
      { status: 500 }
    )
  }
}

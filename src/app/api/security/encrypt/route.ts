/**
 * Encryption API Endpoint
 * Encrypt and decrypt sensitive data (API keys, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  CryptoService,
  encrypt,
  decrypt,
  serverEncrypt,
  serverDecrypt,
  generateSecureToken,
  hash,
  generateBackupCodes,
  hashBackupCodes
} from '@/lib/crypto'
import { hasPermission, isValidRole } from '@/lib/rbac'
import { db } from '@/lib/db'

interface EncryptRequest {
  userId: string
  masterPassword?: string
  data: string
  action: 'encrypt' | 'decrypt' | 'server-encrypt' | 'server-decrypt' | 'generate-token' | 'hash' | 'generate-backup-codes'
}

/**
 * Encrypt or decrypt data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EncryptRequest
    const { userId, masterPassword, data, action } = body

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

    switch (action) {
      case 'encrypt': {
        if (!masterPassword) {
          return NextResponse.json(
            { error: 'Master password required for encryption' },
            { status: 400 }
          )
        }

        const crypto = new CryptoService(masterPassword)
        const encrypted = crypto.encrypt(data)

        return NextResponse.json({
          success: true,
          encrypted
        })
      }

      case 'decrypt': {
        if (!masterPassword) {
          return NextResponse.json(
            { error: 'Master password required for decryption' },
            { status: 400 }
          )
        }

        try {
          const crypto = new CryptoService(masterPassword)
          const decrypted = crypto.decrypt(data)

          return NextResponse.json({
            success: true,
            decrypted
          })
        } catch {
          return NextResponse.json(
            { error: 'Failed to decrypt. Invalid master password or corrupted data.' },
            { status: 400 }
          )
        }
      }

      case 'server-encrypt': {
        // Server-side encryption (no master password needed)
        const encrypted = serverEncrypt(data)

        // Log action
        await db.actionLog.create({
          data: {
            userId,
            action: 'SERVER_ENCRYPT',
            entityType: 'encryption',
            details: JSON.stringify({ dataType: 'api_key' })
          }
        })

        return NextResponse.json({
          success: true,
          encrypted
        })
      }

      case 'server-decrypt': {
        // Server-side decryption (no master password needed)
        // Only accessible with proper permissions
        if (!isValidRole(user.role) || !hasPermission(user.role, 'security:update')) {
          return NextResponse.json(
            { error: 'Unauthorized to decrypt data' },
            { status: 403 }
          )
        }

        try {
          const decrypted = serverDecrypt(data)

          return NextResponse.json({
            success: true,
            decrypted
          })
        } catch {
          return NextResponse.json(
            { error: 'Failed to decrypt. Corrupted data.' },
            { status: 400 }
          )
        }
      }

      case 'generate-token': {
        const length = parseInt(data) || 32
        const token = generateSecureToken(length)

        return NextResponse.json({
          success: true,
          token
        })
      }

      case 'hash': {
        const hashed = hash(data)

        return NextResponse.json({
          success: true,
          hash: hashed
        })
      }

      case 'generate-backup-codes': {
        const count = parseInt(data) || 10
        const codes = generateBackupCodes(count)
        const hashedCodes = hashBackupCodes(codes)

        return NextResponse.json({
          success: true,
          backupCodes: codes,
          hashedBackupCodes: hashedCodes
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Encryption error:', error)
    return NextResponse.json(
      { error: 'Failed to perform encryption operation' },
      { status: 500 }
    )
  }
}

/**
 * Get encryption status and key info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        masterPassword: true,
        twoFactorEnabled: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      hasMasterPassword: !!user.masterPassword,
      twoFactorEnabled: user.twoFactorEnabled,
      encryptionAvailable: true,
      algorithm: 'AES-256-GCM'
    })

  } catch (error) {
    console.error('Encryption status error:', error)
    return NextResponse.json(
      { error: 'Failed to get encryption status' },
      { status: 500 }
    )
  }
}

/**
 * Set or update master password
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, currentPassword, newMasterPassword } = body

    if (!userId || !newMasterPassword) {
      return NextResponse.json(
        { error: 'User ID and new master password are required' },
        { status: 400 }
      )
    }

    // Validate master password strength
    if (newMasterPassword.length < 8) {
      return NextResponse.json(
        { error: 'Master password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If user has existing master password, require current password
    if (user.masterPassword && user.masterPassword !== currentPassword) {
      return NextResponse.json(
        { error: 'Current master password is incorrect' },
        { status: 401 }
      )
    }

    // In production, you'd hash the master password before storing
    // For now, we store it (it will be used for key derivation)
    await db.user.update({
      where: { id: userId },
      data: {
        masterPassword: hash(newMasterPassword) // Hash for storage
      }
    })

    // Log action
    await db.actionLog.create({
      data: {
        userId,
        action: user.masterPassword ? 'UPDATE_MASTER_PASSWORD' : 'SET_MASTER_PASSWORD',
        entityType: 'user',
        entityId: userId
      }
    })

    return NextResponse.json({
      success: true,
      message: user.masterPassword
        ? 'Master password updated successfully'
        : 'Master password set successfully'
    })

  } catch (error) {
    console.error('Master password error:', error)
    return NextResponse.json(
      { error: 'Failed to set master password' },
      { status: 500 }
    )
  }
}

/**
 * use2FA Hook - Two-Factor Authentication Management
 * Handles 2FA setup, verification, and disable
 */

'use client'

import { useState, useCallback } from 'react'

interface TwoFAStatus {
  enabled: boolean
  verifiedAt: string | null
}

interface Setup2FAResult {
  success: boolean
  qrCode?: string
  secret?: string
  backupCodes?: string[]
  otpAuthUrl?: string
  error?: string
}

interface Verify2FAResult {
  success: boolean
  enabled?: boolean
  verifiedAt?: string
  error?: string
}

interface Use2FAReturn {
  // State
  status: TwoFAStatus | null
  isLoading: boolean
  isEnabling: boolean
  isVerifying: boolean
  isDisabling: boolean
  error: string | null

  // Setup data
  setupData: {
    qrCode: string | null
    secret: string | null
    backupCodes: string[]
  }

  // Actions
  getStatus: (userId: string) => Promise<TwoFAStatus | null>
  enable: (userId: string, password: string) => Promise<Setup2FAResult>
  verify: (userId: string, code: string, isBackupCode?: boolean) => Promise<Verify2FAResult>
  disable: (userId: string, codeOrPassword: string, isCode?: boolean) => Promise<boolean>
  regenerateBackupCodes: (userId: string, code: string) => Promise<string[] | null>

  // Clear error
  clearError: () => void
}

export function use2FA(): Use2FAReturn {
  const [status, setStatus] = useState<TwoFAStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEnabling, setIsEnabling] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setupData, setSetupData] = useState<{
    qrCode: string | null
    secret: string | null
    backupCodes: string[]
  }>({
    qrCode: null,
    secret: null,
    backupCodes: []
  })

  // Get 2FA status
  const getStatus = useCallback(async (userId: string): Promise<TwoFAStatus | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/auth/2fa/enable?userId=${userId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get 2FA status')
      }

      setStatus({
        enabled: data.enabled,
        verifiedAt: data.verifiedAt
      })

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get 2FA status'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Enable 2FA (initiate setup)
  const enable = useCallback(async (
    userId: string,
    password: string
  ): Promise<Setup2FAResult> => {
    setIsEnabling(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enable 2FA')
      }

      // Store setup data
      setSetupData({
        qrCode: data.qrCode,
        secret: data.secret,
        backupCodes: data.backupCodes || []
      })

      return {
        success: true,
        qrCode: data.qrCode,
        secret: data.secret,
        backupCodes: data.backupCodes,
        otpAuthUrl: data.otpAuthUrl
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable 2FA'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsEnabling(false)
    }
  }, [])

  // Verify 2FA code
  const verify = useCallback(async (
    userId: string,
    code: string,
    isBackupCode: boolean = false
  ): Promise<Verify2FAResult> => {
    setIsVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code, isBackupCode })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }

      // Update status
      setStatus({
        enabled: data.enabled,
        verifiedAt: data.verifiedAt
      })

      // Clear setup data after successful verification
      setSetupData({
        qrCode: null,
        secret: null,
        backupCodes: []
      })

      return {
        success: true,
        enabled: data.enabled,
        verifiedAt: data.verifiedAt
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify code'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsVerifying(false)
    }
  }, [])

  // Disable 2FA
  const disable = useCallback(async (
    userId: string,
    codeOrPassword: string,
    isCode: boolean = true
  ): Promise<boolean> => {
    setIsDisabling(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...(isCode ? { code: codeOrPassword } : { password: codeOrPassword })
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA')
      }

      // Update status
      setStatus({
        enabled: false,
        verifiedAt: null
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable 2FA'
      setError(errorMessage)
      return false
    } finally {
      setIsDisabling(false)
    }
  }, [])

  // Regenerate backup codes
  const regenerateBackupCodes = useCallback(async (
    userId: string,
    code: string
  ): Promise<string[] | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate backup codes')
      }

      // Update backup codes
      setSetupData(prev => ({
        ...prev,
        backupCodes: data.backupCodes
      }))

      return data.backupCodes
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate backup codes'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    status,
    isLoading,
    isEnabling,
    isVerifying,
    isDisabling,
    error,
    setupData,
    getStatus,
    enable,
    verify,
    disable,
    regenerateBackupCodes,
    clearError
  }
}

export default use2FA

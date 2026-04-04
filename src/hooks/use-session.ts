/**
 * useSession Hook - Session Management for Client
 * Handles session creation, validation, and termination
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

interface Session {
  id: string
  deviceName?: string
  ipAddress?: string
  location?: string
  lastActiveAt: string
  createdAt: string
  expiresAt: string
  isExpired: boolean
  isCurrent: boolean
}

interface SessionStats {
  total: number
  active: number
  expired: number
}

interface SessionUser {
  id: string
  email: string
  name: string | null
  role: string
  twoFactorEnabled: boolean
}

interface SessionState {
  user: SessionUser | null
  session: { id: string; userId: string; expiresAt: string } | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface UseSessionReturn extends SessionState {
  // Session management
  createSession: (userId: string, options?: {
    ipAddress?: string
    userAgent?: string
    deviceName?: string
  }) => Promise<{ success: boolean; token?: string; error?: string }>
  validateSession: (token: string) => Promise<boolean>
  logout: () => Promise<void>

  // Other sessions
  getSessions: () => Promise<{ sessions: Session[]; stats: SessionStats }>
  terminateSession: (sessionId: string) => Promise<boolean>
  terminateOtherSessions: () => Promise<number>

  // Token management
  getToken: () => string | null
  setToken: (token: string) => void
  clearToken: () => void

  // Activity
  recordActivity: () => Promise<void>
}

const SESSION_TOKEN_KEY = 'mukn_session_token'
const SESSION_USER_KEY = 'mukn_session_user'
const SESSION_EXPIRY_KEY = 'mukn_session_expiry'
const ACTIVITY_INTERVAL = 60000 // 1 minute

export function useSession(): UseSessionReturn {
  const [state, setState] = useState<SessionState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  })

  // Get token from localStorage
  const getToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(SESSION_TOKEN_KEY)
  }, [])

  // Set token in localStorage
  const setToken = useCallback((token: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(SESSION_TOKEN_KEY, token)
  }, [])

  // Clear token from localStorage
  const clearToken = useCallback(() => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(SESSION_TOKEN_KEY)
    localStorage.removeItem(SESSION_USER_KEY)
    localStorage.removeItem(SESSION_EXPIRY_KEY)
  }, [])

  // Create a new session
  const createSession = useCallback(async (
    userId: string,
    options?: {
      ipAddress?: string
      userAgent?: string
      deviceName?: string
    }
  ): Promise<{ success: boolean; token?: string; error?: string }> => {
    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...options,
          userAgent: navigator.userAgent,
          deviceName: options?.deviceName || getDeviceName()
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to create session' }
      }

      // Store token and user info
      setToken(data.session.token)
      localStorage.setItem(SESSION_EXPIRY_KEY, data.session.expiresAt)

      setState(prev => ({
        ...prev,
        session: data.session,
        isAuthenticated: true,
        error: null
      }))

      return { success: true, token: data.session.token }
    } catch (error) {
      console.error('Create session error:', error)
      return { success: false, error: 'Failed to create session' }
    }
  }, [setToken])

  // Validate existing session
  const validateSession = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok || !data.valid) {
        if (data.expired) {
          clearToken()
        }
        setState(prev => ({
          ...prev,
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false
        }))
        return false
      }

      setState(prev => ({
        ...prev,
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }))

      return true
    } catch (error) {
      console.error('Validate session error:', error)
      return false
    }
  }, [clearToken])

  // Logout (terminate current session)
  const logout = useCallback(async (): Promise<void> => {
    try {
      const token = getToken()
      if (token) {
        // Terminate session on server
        await fetch('/api/auth/sessions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: state.user?.id,
            terminateOthers: false
          })
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearToken()
      setState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })
    }
  }, [getToken, clearToken, state.user?.id])

  // Get all sessions for current user
  const getSessions = useCallback(async (): Promise<{ sessions: Session[]; stats: SessionStats }> => {
    try {
      const token = getToken()
      const response = await fetch(
        `/api/auth/sessions?userId=${state.user?.id}&currentToken=${token}`,
        { method: 'GET' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sessions')
      }

      return { sessions: data.sessions, stats: data.stats }
    } catch (error) {
      console.error('Get sessions error:', error)
      return { sessions: [], stats: { total: 0, active: 0, expired: 0 } }
    }
  }, [state.user?.id, getToken])

  // Terminate a specific session
  const terminateSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const token = getToken()
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.user?.id,
          sessionId,
          currentSessionToken: token
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to terminate session')
      }

      return true
    } catch (error) {
      console.error('Terminate session error:', error)
      return false
    }
  }, [state.user?.id, getToken])

  // Terminate all other sessions
  const terminateOtherSessions = useCallback(async (): Promise<number> => {
    try {
      const token = getToken()
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.user?.id,
          terminateOthers: true,
          currentSessionToken: token
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to terminate sessions')
      }

      return data.deletedCount
    } catch (error) {
      console.error('Terminate other sessions error:', error)
      return 0
    }
  }, [state.user?.id, getToken])

  // Record activity
  const recordActivity = useCallback(async (): Promise<void> => {
    try {
      const token = getToken()
      if (!token) return

      await fetch('/api/auth/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activity',
          sessionToken: token
        })
      })
    } catch (error) {
      console.error('Record activity error:', error)
    }
  }, [getToken])

  // Check session on mount
  useEffect(() => {
    const initSession = async () => {
      const token = getToken()
      if (token) {
        await validateSession(token)
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initSession()
  }, [getToken, validateSession])

  // Activity tracking
  useEffect(() => {
    if (!state.isAuthenticated) return

    const interval = setInterval(recordActivity, ACTIVITY_INTERVAL)

    // Also record on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        recordActivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [state.isAuthenticated, recordActivity])

  return {
    ...state,
    createSession,
    validateSession,
    logout,
    getSessions,
    terminateSession,
    terminateOtherSessions,
    getToken,
    setToken,
    clearToken,
    recordActivity
  }
}

// Helper function to get device name
function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown'

  const ua = navigator.userAgent

  // Check for mobile devices
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) return 'Android Phone'
    return 'Android Tablet'
  }

  // Check for desktop browsers
  if (/Windows/.test(ua)) {
    if (/Edg/.test(ua)) return 'Windows - Edge'
    if (/Chrome/.test(ua)) return 'Windows - Chrome'
    if (/Firefox/.test(ua)) return 'Windows - Firefox'
    return 'Windows PC'
  }

  if (/Mac/.test(ua)) {
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Mac - Safari'
    if (/Chrome/.test(ua)) return 'Mac - Chrome'
    return 'Mac'
  }

  if (/Linux/.test(ua)) {
    if (/Chrome/.test(ua)) return 'Linux - Chrome'
    if (/Firefox/.test(ua)) return 'Linux - Firefox'
    return 'Linux'
  }

  return 'Desktop'
}

export default useSession

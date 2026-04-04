/**
 * RateLimiter - In-memory rate limiting for API protection
 * Supports IP-based and User-based rate limiting
 */

interface RateLimitEntry {
  count: number
  resetAt: number
  blocked: boolean
}

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipFailedRequests?: boolean // Don't count failed requests
  keyGenerator?: (identifier: string) => string
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfter?: number
}

// In-memory store
const store = new Map<string, RateLimitEntry>()

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000

// Periodic cleanup of expired entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

/**
 * Default rate limit configurations
 */
export const RateLimitPresets = {
  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10 // 10 attempts per 15 minutes
  },
  // 2FA verification
  TWO_FA: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5 // 5 attempts per 5 minutes
  },
  // API endpoints
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60 // 60 requests per minute
  },
  // Write operations
  WRITE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 writes per minute
  },
  // Read operations
  READ: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120 // 120 reads per minute
  },
  // Sensitive operations
  SENSITIVE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10 // 10 per hour
  }
} as const

/**
 * Rate Limiter class
 */
export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      windowMs: 60 * 1000, // Default: 1 minute
      maxRequests: 60, // Default: 60 per minute
      skipFailedRequests: false,
      ...config
    }
  }

  /**
   * Check rate limit for an identifier
   */
  check(identifier: string): RateLimitResult {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(identifier)
      : `ratelimit:${identifier}`

    const now = Date.now()
    const entry = store.get(key)

    // If no entry or window expired, create new entry
    if (!entry || entry.resetAt < now) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + this.config.windowMs,
        blocked: false
      }
      store.set(key, newEntry)

      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetAt: newEntry.resetAt
      }
    }

    // If blocked, return blocked status
    if (entry.blocked) {
      return {
        success: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      }
    }

    // Increment count
    entry.count++

    // Check if limit exceeded
    if (entry.count > this.config.maxRequests) {
      entry.blocked = true
      return {
        success: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      }
    }

    return {
      success: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - entry.count,
      resetAt: entry.resetAt
    }
  }

  /**
   * Record a failed attempt (for progressive blocking)
   */
  recordFailure(identifier: string): void {
    if (this.config.skipFailedRequests) return

    const key = `failure:${identifier}`
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || entry.resetAt < now) {
      store.set(key, {
        count: 1,
        resetAt: now + this.config.windowMs,
        blocked: false
      })
    } else {
      entry.count++
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(identifier)
      : `ratelimit:${identifier}`
    store.delete(key)
    store.delete(`failure:${identifier}`)
  }

  /**
   * Get current status for an identifier
   */
  getStatus(identifier: string): RateLimitResult {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(identifier)
      : `ratelimit:${identifier}`

    const now = Date.now()
    const entry = store.get(key)

    if (!entry || entry.resetAt < now) {
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetAt: now + this.config.windowMs
      }
    }

    return {
      success: !entry.blocked && entry.count <= this.config.maxRequests,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetAt: entry.resetAt
    }
  }
}

/**
 * Create rate limiter instances for different use cases
 */
export function createRateLimiter(preset: keyof typeof RateLimitPresets): RateLimiter {
  return new RateLimiter(RateLimitPresets[preset])
}

/**
 * Custom rate limiter with specific config
 */
export function createCustomRateLimiter(config: Partial<RateLimitConfig>): RateLimiter {
  return new RateLimiter(config)
}

// Pre-configured instances
export const authRateLimiter = new RateLimiter(RateLimitPresets.AUTH)
export const twoFaRateLimiter = new RateLimiter(RateLimitPresets.TWO_FA)
export const apiRateLimiter = new RateLimiter(RateLimitPresets.API)
export const writeRateLimiter = new RateLimiter(RateLimitPresets.WRITE)
export const readRateLimiter = new RateLimiter(RateLimitPresets.READ)
export const sensitiveRateLimiter = new RateLimiter(RateLimitPresets.SENSITIVE)

/**
 * Rate limit headers helper
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    ...(result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : {})
  }
}

/**
 * Combined rate limiter for IP and User
 */
export class CombinedRateLimiter {
  private ipLimiter: RateLimiter
  private userLimiter: RateLimiter

  constructor(
    ipConfig: Partial<RateLimitConfig> = {},
    userConfig: Partial<RateLimitConfig> = {}
  ) {
    this.ipLimiter = new RateLimiter(ipConfig)
    this.userLimiter = new RateLimiter(userConfig)
  }

  check(ip: string, userId?: string): RateLimitResult {
    // Check IP-based rate limit first
    const ipResult = this.ipLimiter.check(ip)
    if (!ipResult.success) {
      return ipResult
    }

    // If user is authenticated, check user-based rate limit
    if (userId) {
      const userResult = this.userLimiter.check(`user:${userId}`)
      if (!userResult.success) {
        return userResult
      }

      // Return the more restrictive result
      return ipResult.remaining < userResult.remaining ? ipResult : userResult
    }

    return ipResult
  }

  reset(ip: string, userId?: string): void {
    this.ipLimiter.reset(ip)
    if (userId) {
      this.userLimiter.reset(`user:${userId}`)
    }
  }
}

/**
 * Exponential backoff rate limiter
 * Increases wait time after each failed attempt
 */
export class ExponentialBackoffLimiter {
  private baseWindowMs: number
  private maxWindowMs: number
  private multiplier: number
  private failures: Map<string, { count: number; blockedUntil: number }>

  constructor(baseWindowMs = 1000, maxWindowMs = 3600000, multiplier = 2) {
    this.baseWindowMs = baseWindowMs
    this.maxWindowMs = maxWindowMs
    this.multiplier = multiplier
    this.failures = new Map()
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now()
    const failure = this.failures.get(identifier)

    if (failure && failure.blockedUntil > now) {
      return {
        success: false,
        limit: 1,
        remaining: 0,
        resetAt: failure.blockedUntil,
        retryAfter: Math.ceil((failure.blockedUntil - now) / 1000)
      }
    }

    return {
      success: true,
      limit: 1,
      remaining: 1,
      resetAt: now + this.baseWindowMs
    }
  }

  recordFailure(identifier: string): void {
    const now = Date.now()
    const failure = this.failures.get(identifier)

    const count = failure ? failure.count + 1 : 1
    const windowMs = Math.min(
      this.baseWindowMs * Math.pow(this.multiplier, count - 1),
      this.maxWindowMs
    )

    this.failures.set(identifier, {
      count,
      blockedUntil: now + windowMs
    })
  }

  recordSuccess(identifier: string): void {
    this.failures.delete(identifier)
  }

  reset(identifier: string): void {
    this.failures.delete(identifier)
  }
}

export default RateLimiter

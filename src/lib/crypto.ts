/**
 * CryptoService - AES-256-GCM Encryption/Decryption
 * Provides secure encryption for API keys, 2FA secrets, and sensitive data
 */

import * as crypto from 'crypto'

// AES-256-GCM configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32

/**
 * Derives a 256-bit key from master password using PBKDF2
 */
function deriveKey(masterPassword: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    masterPassword,
    salt,
    100000, // iterations
    32, // key length (256 bits)
    'sha256'
  )
}

/**
 * Generates a random encryption key (for use without master password)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Encrypts data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @param masterPassword - User's master password for key derivation
 * @returns Encrypted data in format: salt:iv:authTag:ciphertext (all hex encoded)
 */
export function encrypt(plaintext: string, masterPassword: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = deriveKey(masterPassword, salt)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex')
  ciphertext += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: salt:iv:authTag:ciphertext
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    ciphertext
  ].join(':')
}

/**
 * Decrypts data encrypted with AES-256-GCM
 * @param encryptedData - Encrypted data in format: salt:iv:authTag:ciphertext
 * @param masterPassword - User's master password for key derivation
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string, masterPassword: string): string {
  const parts = encryptedData.split(':')
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format')
  }

  const [saltHex, ivHex, authTagHex, ciphertext] = parts
  const salt = Buffer.from(saltHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const key = deriveKey(masterPassword, salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(ciphertext, 'hex', 'utf8')
  plaintext += decipher.final('utf8')

  return plaintext
}

/**
 * Encrypts with a pre-derived key (for server-side use)
 */
export function encryptWithKey(plaintext: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey, 'hex')
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex')
  ciphertext += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    ciphertext
  ].join(':')
}

/**
 * Decrypts with a pre-derived key (for server-side use)
 */
export function decryptWithKey(encryptedData: string, encryptionKey: string): string {
  const parts = encryptedData.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }

  const [ivHex, authTagHex, ciphertext] = parts
  const key = Buffer.from(encryptionKey, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(ciphertext, 'hex', 'utf8')
  plaintext += decipher.final('utf8')

  return plaintext
}

/**
 * Hash a value using SHA-256
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Constant-time comparison for secure verification
 */
export function secureCompare(a: string, b: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  return codes
}

/**
 * Hash backup codes for storage
 */
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(code => hash(code))
}

/**
 * Verify a backup code against hashed codes
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): boolean {
  const hashedInput = hash(code.toUpperCase())
  return hashedCodes.some(hashed => secureCompare(hashedInput, hashed))
}

/**
 * CryptoService class for object-oriented usage
 */
export class CryptoService {
  private masterPassword: string

  constructor(masterPassword: string) {
    if (!masterPassword || masterPassword.length < 8) {
      throw new Error('Master password must be at least 8 characters')
    }
    this.masterPassword = masterPassword
  }

  encrypt(plaintext: string): string {
    return encrypt(plaintext, this.masterPassword)
  }

  decrypt(encryptedData: string): string {
    return decrypt(encryptedData, this.masterPassword)
  }

  /**
   * Encrypt API key for storage
   */
  encryptApiKey(apiKey: string): string {
    return this.encrypt(apiKey)
  }

  /**
   * Decrypt API key for use
   */
  decryptApiKey(encryptedKey: string): string {
    return this.decrypt(encryptedKey)
  }

  /**
   * Encrypt sensitive data object
   */
  encryptObject<T>(obj: T): string {
    return this.encrypt(JSON.stringify(obj))
  }

  /**
   * Decrypt sensitive data object
   */
  decryptObject<T>(encryptedData: string): T {
    return JSON.parse(this.decrypt(encryptedData)) as T
  }
}

// Server-side encryption key (from environment or generated)
let serverEncryptionKey: string | null = null

/**
 * Get or create server encryption key for system-level encryption
 */
export function getServerEncryptionKey(): string {
  if (!serverEncryptionKey) {
    // In production, this should come from environment variable
    serverEncryptionKey = process.env.ENCRYPTION_KEY || generateEncryptionKey()
  }
  return serverEncryptionKey
}

/**
 * Server-side encryption (no master password required)
 */
export function serverEncrypt(plaintext: string): string {
  return encryptWithKey(plaintext, getServerEncryptionKey())
}

/**
 * Server-side decryption (no master password required)
 */
export function serverDecrypt(encryptedData: string): string {
  return decryptWithKey(encryptedData, getServerEncryptionKey())
}

export default CryptoService

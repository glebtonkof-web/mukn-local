import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

// Prisma 7 client singleton with SQLite adapter
// Updated: 2026-04-09 - Prisma 7 migration with libsql adapter

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Resolve database path - use absolute path as fallback
// DATABASE_URL may not be available in instrumentation context
const DEFAULT_DB_PATH = path.join(process.cwd(), 'db', 'custom.db')
const dbUrl = process.env.DATABASE_URL || `file:${DEFAULT_DB_PATH}`

let libsqlUrl: string
if (dbUrl.startsWith('file:')) {
  const relativePath = dbUrl.replace('file:', '')
  libsqlUrl = path.isAbsolute(relativePath) 
    ? `file:${relativePath}`
    : `file:${path.resolve(process.cwd(), relativePath)}`
} else {
  libsqlUrl = dbUrl
}

console.log('[Prisma] Database URL:', libsqlUrl)

// Create adapter with config (NOT with a pre-created client!)
const adapter = new PrismaLibSql({
  url: libsqlUrl
})

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

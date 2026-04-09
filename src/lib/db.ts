import { PrismaClient } from '@prisma/client'

// Prisma client singleton with Instagram traffic models
// Updated: 2026-04-09 - Prisma 6 stable
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

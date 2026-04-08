/**
 * Re-export Prisma client for compatibility
 */
import { db } from './db';

export default db;
export { db as prisma };

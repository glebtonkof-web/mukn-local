import { defineConfig } from 'prisma/config';

export default defineConfig({
  databaseUrl: process.env.DATABASE_URL || 'file:./db/custom.db',
});

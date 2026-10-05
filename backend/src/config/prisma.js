import 'dotenv/config';
import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const { PrismaClient } = pkg;

// Prevent multiple Prisma Client instances during development hot-reloading.
// Each instance opens its own DB connection pool; without this guard,
// nodemon restarts would leak connections until PostgreSQL refuses new ones.
const globalForPrisma = globalThis;

if (!globalForPrisma.__prisma) {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  globalForPrisma.__prisma = new PrismaClient({ adapter });
}

const prisma = globalForPrisma.__prisma;

export default prisma;

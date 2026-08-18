import { PrismaClient } from '@prisma/client';
import { env, isProduction } from './env.js';

// A single shared instance — Prisma manages its own connection pool internally,
// creating a new client per request would exhaust Postgres connections under load.
//
// datasources.db.url is passed explicitly rather than left for Prisma to
// resolve from process.env.DATABASE_URL itself — the generated client has
// its own built-in .env auto-loader (unconditional, NODE_ENV-unaware) that
// can silently overwrite process.env.DATABASE_URL with the dev value after
// our own NODE_ENV-gated load already set it correctly for tests. Passing
// env.DATABASE_URL here uses the validated snapshot from config/env.js,
// which is immune to whatever Prisma does to process.env afterward.
export const prisma = new PrismaClient({
  datasources: { db: { url: env.DATABASE_URL } },
  log: isProduction ? ['error', 'warn'] : ['error', 'warn', 'query'],
});

export async function connectDb() {
  await prisma.$connect();
}

export async function disconnectDb() {
  await prisma.$disconnect();
}

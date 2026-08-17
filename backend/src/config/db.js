import { PrismaClient } from '@prisma/client';
import { isProduction } from './env.js';

// A single shared instance — Prisma manages its own connection pool internally,
// creating a new client per request would exhaust Postgres connections under load.
export const prisma = new PrismaClient({
  log: isProduction ? ['error', 'warn'] : ['error', 'warn', 'query'],
});

export async function connectDb() {
  await prisma.$connect();
}

export async function disconnectDb() {
  await prisma.$disconnect();
}

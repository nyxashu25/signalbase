import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';

// Deletes in FK-dependency order (children before parents). Used between
// integration tests so each test starts from a clean, known DB state.
export async function resetDb() {
  await prisma.emailReveal.deleteMany();
  await prisma.creditLedgerEntry.deleteMany();
  await prisma.listItem.deleteMany();
  await prisma.list.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.org.deleteMany();
}

// Refresh-token sessions and credit reservations/balances live in Redis,
// not Postgres — clear those too so a leftover session or balance from a
// previous test can't leak into the next one.
export async function resetRedis() {
  const keys = await redis.keys('refresh:active:*');
  keys.push(...(await redis.keys('credits:*')));
  keys.push(...(await redis.keys('idempotency:*')));
  keys.push(...(await redis.keys('ratelimit:*')));
  keys.push(...(await redis.keys('stripe:event:*')));
  if (keys.length) await redis.del(...keys);
}

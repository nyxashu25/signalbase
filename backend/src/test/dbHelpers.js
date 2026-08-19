import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';

// Deletes in FK-dependency order (children before parents). Used between
// integration tests so each test starts from a clean, known DB state.
//
// Must be kept in sync with schema.prisma — a model added there without a
// line here doesn't just leave stale rows, it makes user/workspace/contact
// deletion below throw a foreign-key violation, which aborts resetDb()
// entirely and leaves EVERY subsequent table uncleaned for that test too.
export async function resetDb() {
  await prisma.emailReveal.deleteMany();
  await prisma.companyDetailView.deleteMany();
  await prisma.creditLedgerEntry.deleteMany();
  await prisma.sequenceStepEvent.deleteMany();
  await prisma.sequenceEnrollment.deleteMany();
  await prisma.sequenceStep.deleteMany();
  await prisma.sequence.deleteMany();
  await prisma.suppressionEntry.deleteMany();
  await prisma.listItem.deleteMany();
  await prisma.list.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.org.deleteMany();
  await prisma.dataSubjectOptOut.deleteMany();
  await prisma.superAdmin.deleteMany();
  await prisma.paymentGatewaySettings.deleteMany();
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

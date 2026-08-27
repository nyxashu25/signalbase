import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import {
  grantCredits,
  transferCredits,
  getBalance,
  reserveCredit,
  resolveReservationForCommit,
  releaseReservation,
  reapExpiredReservations,
} from './creditService.js';

const USER_ID = 'user-credit-test';
const OTHER_USER_ID = 'user-credit-test-2';
const WORKSPACE_ID = 'ws-credit-test';

// Pure-Redis seed for the reservation-flow tests (no ledger involvement —
// those flows never write the ledger themselves; their callers do).
async function seedBalance(userId, amount) {
  await redis.set(`credits:balance:user:${userId}`, amount);
}

// grantCredits/transferCredits write real ledger rows, whose workspaceId is
// a hard FK — those tests need a real workspace.
async function makeWorkspace() {
  const org = await prisma.org.create({ data: { slug: 'credit-svc-test', name: 'Credit Svc' } });
  const workspace = await prisma.workspace.create({
    data: { orgId: org.id, name: 'Credit Svc WS' },
  });
  return workspace.id;
}

describe('creditService', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reserveCredit decrements the balance and 402s once it hits zero', async () => {
    await seedBalance(USER_ID, 2);

    await reserveCredit(USER_ID, WORKSPACE_ID, 1);
    expect(await getBalance(USER_ID)).toBe(1);

    await reserveCredit(USER_ID, WORKSPACE_ID, 1);
    expect(await getBalance(USER_ID)).toBe(0);

    await expect(reserveCredit(USER_ID, WORKSPACE_ID, 1)).rejects.toMatchObject({
      statusCode: 402,
    });
  });

  it('two concurrent reservations against a balance of 1 — exactly one succeeds', async () => {
    await seedBalance(USER_ID, 1);

    const results = await Promise.allSettled([
      reserveCredit(USER_ID, WORKSPACE_ID, 1),
      reserveCredit(USER_ID, WORKSPACE_ID, 1),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ statusCode: 402 });
    // The failed attempt must not have taken the credit anyway.
    expect(await getBalance(USER_ID)).toBe(0);
  });

  it("a reservation debits the spender's balance, never someone else's", async () => {
    await seedBalance(USER_ID, 5);
    await seedBalance(OTHER_USER_ID, 5);

    await reserveCredit(USER_ID, WORKSPACE_ID, 2);

    expect(await getBalance(USER_ID)).toBe(3);
    expect(await getBalance(OTHER_USER_ID)).toBe(5);
  });

  it('releaseReservation refunds the balance and is a no-op on a second call', async () => {
    await seedBalance(USER_ID, 5);
    const reservationId = await reserveCredit(USER_ID, WORKSPACE_ID, 1);
    expect(await getBalance(USER_ID)).toBe(4);

    await releaseReservation(reservationId);
    expect(await getBalance(USER_ID)).toBe(5);

    // Idempotent: releasing an already-released reservation must not
    // refund a second time.
    await releaseReservation(reservationId);
    expect(await getBalance(USER_ID)).toBe(5);
  });

  it('resolveReservationForCommit clears the reservation without changing the balance', async () => {
    await seedBalance(USER_ID, 5);
    const reservationId = await reserveCredit(USER_ID, WORKSPACE_ID, 1);
    expect(await getBalance(USER_ID)).toBe(4);

    const { amount } = await resolveReservationForCommit(reservationId, {
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
    });
    expect(amount).toBe(1);
    expect(await getBalance(USER_ID)).toBe(4); // unchanged — spend was already reflected at reserve time

    // Can't be resolved twice.
    await expect(
      resolveReservationForCommit(reservationId, {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("resolveReservationForCommit rejects another user's reservation", async () => {
    await seedBalance(USER_ID, 5);
    const reservationId = await reserveCredit(USER_ID, WORKSPACE_ID, 1);

    await expect(
      resolveReservationForCommit(reservationId, {
        userId: OTHER_USER_ID,
        workspaceId: WORKSPACE_ID,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('reapExpiredReservations refunds a reservation whose logical TTL has passed', async () => {
    await seedBalance(USER_ID, 5);
    const reservationId = await reserveCredit(USER_ID, WORKSPACE_ID, 2);
    expect(await getBalance(USER_ID)).toBe(3);

    // Simulate time passing without waiting out the real 5-minute TTL: push
    // this reservation's zset score into the past.
    await redis.zadd('credits:reservations:pending', Date.now() - 1000, reservationId);

    const reapedCount = await reapExpiredReservations();

    expect(reapedCount).toBe(1);
    expect(await getBalance(USER_ID)).toBe(5);
  });

  it('does not reap a reservation that has not expired yet', async () => {
    await seedBalance(USER_ID, 5);
    await reserveCredit(USER_ID, WORKSPACE_ID, 1);

    const reapedCount = await reapExpiredReservations();

    expect(reapedCount).toBe(0);
    expect(await getBalance(USER_ID)).toBe(4);
  });

  it('grantCredits writes a ledger row and moves the balance together', async () => {
    const workspaceId = await makeWorkspace();

    await grantCredits({ userId: USER_ID, workspaceId, amount: 300, reason: 'ADJUSTMENT' });
    expect(await getBalance(USER_ID)).toBe(300);

    // Negative amounts (admin removal) work symmetrically.
    await grantCredits({ userId: USER_ID, workspaceId, amount: -100, reason: 'ADJUSTMENT' });
    expect(await getBalance(USER_ID)).toBe(200);

    const rows = await prisma.creditLedgerEntry.findMany({ where: { userId: USER_ID } });
    expect(rows).toHaveLength(2);
    expect(rows.reduce((sum, r) => sum + r.delta, 0)).toBe(200);

    await expect(
      grantCredits({ userId: USER_ID, workspaceId, amount: 0, reason: 'ADJUSTMENT' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('transferCredits atomically moves credits and writes a matched ledger pair', async () => {
    const workspaceId = await makeWorkspace();
    await grantCredits({ userId: USER_ID, workspaceId, amount: 100, reason: 'ADJUSTMENT' });

    await transferCredits({
      fromUserId: USER_ID,
      toUserId: OTHER_USER_ID,
      workspaceId,
      amount: 40,
    });

    expect(await getBalance(USER_ID)).toBe(60);
    expect(await getBalance(OTHER_USER_ID)).toBe(40);

    const out = await prisma.creditLedgerEntry.findFirst({
      where: { userId: USER_ID, reason: 'TRANSFER_OUT' },
    });
    const inn = await prisma.creditLedgerEntry.findFirst({
      where: { userId: OTHER_USER_ID, reason: 'TRANSFER_IN' },
    });
    expect(out).toMatchObject({ delta: -40, spentById: USER_ID });
    expect(inn).toMatchObject({ delta: 40, spentById: USER_ID });

    // Insufficient balance → 402, nothing moves.
    await expect(
      transferCredits({ fromUserId: USER_ID, toUserId: OTHER_USER_ID, workspaceId, amount: 61 }),
    ).rejects.toMatchObject({ statusCode: 402 });
    expect(await getBalance(USER_ID)).toBe(60);
    expect(await getBalance(OTHER_USER_ID)).toBe(40);

    // Self-transfer is rejected.
    await expect(
      transferCredits({ fromUserId: USER_ID, toUserId: USER_ID, workspaceId, amount: 1 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

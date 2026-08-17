import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import {
  initializeBalance,
  getBalance,
  reserveCredit,
  resolveReservationForCommit,
  releaseReservation,
  reapExpiredReservations,
} from './creditService.js';

const WORKSPACE_ID = 'ws-credit-test';

describe('creditService', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it('reserveCredit decrements the balance and 402s once it hits zero', async () => {
    await initializeBalance(WORKSPACE_ID, 2);

    await reserveCredit(WORKSPACE_ID, 1);
    expect(await getBalance(WORKSPACE_ID)).toBe(1);

    await reserveCredit(WORKSPACE_ID, 1);
    expect(await getBalance(WORKSPACE_ID)).toBe(0);

    await expect(reserveCredit(WORKSPACE_ID, 1)).rejects.toMatchObject({ statusCode: 402 });
  });

  it('two concurrent reservations against a balance of 1 — exactly one succeeds', async () => {
    await initializeBalance(WORKSPACE_ID, 1);

    const results = await Promise.allSettled([
      reserveCredit(WORKSPACE_ID, 1),
      reserveCredit(WORKSPACE_ID, 1),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ statusCode: 402 });
    // The failed attempt must not have taken the credit anyway.
    expect(await getBalance(WORKSPACE_ID)).toBe(0);
  });

  it('releaseReservation refunds the balance and is a no-op on a second call', async () => {
    await initializeBalance(WORKSPACE_ID, 5);
    const reservationId = await reserveCredit(WORKSPACE_ID, 1);
    expect(await getBalance(WORKSPACE_ID)).toBe(4);

    await releaseReservation(reservationId);
    expect(await getBalance(WORKSPACE_ID)).toBe(5);

    // Idempotent: releasing an already-released reservation must not
    // refund a second time.
    await releaseReservation(reservationId);
    expect(await getBalance(WORKSPACE_ID)).toBe(5);
  });

  it('resolveReservationForCommit clears the reservation without changing the balance', async () => {
    await initializeBalance(WORKSPACE_ID, 5);
    const reservationId = await reserveCredit(WORKSPACE_ID, 1);
    expect(await getBalance(WORKSPACE_ID)).toBe(4);

    const { amount } = await resolveReservationForCommit(reservationId, {
      workspaceId: WORKSPACE_ID,
    });
    expect(amount).toBe(1);
    expect(await getBalance(WORKSPACE_ID)).toBe(4); // unchanged — spend was already reflected at reserve time

    // Can't be resolved twice.
    await expect(
      resolveReservationForCommit(reservationId, { workspaceId: WORKSPACE_ID }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('reapExpiredReservations refunds a reservation whose logical TTL has passed', async () => {
    await initializeBalance(WORKSPACE_ID, 5);
    const reservationId = await reserveCredit(WORKSPACE_ID, 2);
    expect(await getBalance(WORKSPACE_ID)).toBe(3);

    // Simulate time passing without waiting out the real 5-minute TTL: push
    // this reservation's zset score into the past.
    await redis.zadd('credits:reservations:pending', Date.now() - 1000, reservationId);

    const reapedCount = await reapExpiredReservations();

    expect(reapedCount).toBe(1);
    expect(await getBalance(WORKSPACE_ID)).toBe(5);
  });

  it('does not reap a reservation that has not expired yet', async () => {
    await initializeBalance(WORKSPACE_ID, 5);
    await reserveCredit(WORKSPACE_ID, 1);

    const reapedCount = await reapExpiredReservations();

    expect(reapedCount).toBe(0);
    expect(await getBalance(WORKSPACE_ID)).toBe(4);
  });
});

import { randomUUID } from 'node:crypto';
import { redis } from '../config/redis.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';

const BALANCE_KEY = (workspaceId) => `credits:balance:${workspaceId}`;
const RESERVATION_KEY = (id) => `credits:reservation:${id}`;
const PENDING_ZSET = 'credits:reservations:pending';

// The reservation's *logical* lifetime (used for the reaper's due-check) is
// shorter than the Redis key's own TTL. The gap is a safety buffer: the
// reaper must always get a chance to read + refund a reservation before
// Redis itself evicts the key out from under it — otherwise the refund is
// silently lost. reconciliationService (Phase 03) is the backstop if this
// buffer is ever not enough.
const RESERVATION_TTL_SECONDS = 5 * 60;
const REAPER_SAFETY_BUFFER_SECONDS = 2 * 60;

// KEYS[1] balance, KEYS[2] reservation, KEYS[3] pending zset
// ARGV[1] amount, ARGV[2] reservationId, ARGV[3] key TTL seconds,
// ARGV[4] zset score (logical expiry, ms), ARGV[5] workspaceId
const RESERVE_SCRIPT = `
local balance = tonumber(redis.call('GET', KEYS[1]) or '0')
local amount = tonumber(ARGV[1])
if balance < amount then
  return -1
end
redis.call('DECRBY', KEYS[1], amount)
redis.call('SET', KEYS[2], ARGV[5] .. ':' .. ARGV[1], 'EX', ARGV[3])
redis.call('ZADD', KEYS[3], ARGV[4], ARGV[2])
return balance - amount
`;

redis.defineCommand('reserveCreditScript', { numberOfKeys: 3, lua: RESERVE_SCRIPT });

/** Only sets the balance if absent — re-running seed/register must not clobber an already-spent balance. */
export async function initializeBalance(workspaceId, amount) {
  await redis.setnx(BALANCE_KEY(workspaceId), amount);
}

export async function getBalance(workspaceId) {
  const raw = await redis.get(BALANCE_KEY(workspaceId));
  return raw === null ? 0 : Number(raw);
}

/**
 * Atomically checks-and-decrements the balance and records a reservation.
 * Throws 402 if insufficient. The whole check+decrement is one Lua script
 * so two concurrent reveals against the last credit can't both succeed.
 */
export async function reserveCredit(workspaceId, amount = 1) {
  const reservationId = randomUUID();
  const logicalExpiresAtMs = Date.now() + RESERVATION_TTL_SECONDS * 1000;
  const keyTtlSeconds = RESERVATION_TTL_SECONDS + REAPER_SAFETY_BUFFER_SECONDS;

  const result = await redis.reserveCreditScript(
    BALANCE_KEY(workspaceId),
    RESERVATION_KEY(reservationId),
    PENDING_ZSET,
    amount,
    reservationId,
    keyTtlSeconds,
    logicalExpiresAtMs,
    workspaceId,
  );

  if (result === -1) {
    throw new ApiError(402, 'Insufficient credits');
  }

  return reservationId;
}

async function readReservation(reservationId) {
  const raw = await redis.get(RESERVATION_KEY(reservationId));
  if (!raw) return null;
  const [workspaceId, amount] = raw.split(':');
  return { workspaceId, amount: Number(amount) };
}

async function clearReservation(reservationId) {
  await redis.del(RESERVATION_KEY(reservationId));
  await redis.zrem(PENDING_ZSET, reservationId);
}

/**
 * Validates and clears the reservation on the Redis side of a commit, and
 * returns the amount to be spent. Deliberately does NOT write the ledger
 * row itself — callers write that (and whatever else the spend unlocks,
 * e.g. an EmailReveal row) inside one Postgres transaction, so "the credit
 * left Redis" and "the ledger recorded why" can't come apart. Never touches
 * the balance key — it was already decremented at reserve time.
 */
export async function resolveReservationForCommit(reservationId, { workspaceId }) {
  const reservation = await readReservation(reservationId);
  if (!reservation || reservation.workspaceId !== workspaceId) {
    throw new ApiError(
      409,
      'Reservation not found, already resolved, or expired — retry the reveal',
    );
  }

  await clearReservation(reservationId);
  return { amount: reservation.amount };
}

/**
 * Direct balance refund, bypassing the reservation lookup — for the one
 * case where a reservation was already resolved-for-commit (Redis side
 * cleared) but the Postgres write it was paying for then failed/rolled
 * back (e.g. a unique-constraint race with a concurrent identical
 * request). See revealService.js.
 */
export async function refundAmount(workspaceId, amount) {
  await redis.incrby(BALANCE_KEY(workspaceId), amount);
}

/** Cancels the reservation and refunds the balance. Idempotent — a reservation that's already gone is a silent no-op. */
export async function releaseReservation(reservationId) {
  const reservation = await readReservation(reservationId);
  if (!reservation) return;

  await clearReservation(reservationId);
  await redis.incrby(BALANCE_KEY(reservation.workspaceId), reservation.amount);
}

/** Refunds any reservation whose logical TTL has passed without being committed or released — e.g. the process crashed mid-request. */
export async function reapExpiredReservations() {
  const now = Date.now();
  const expiredIds = await redis.zrangebyscore(PENDING_ZSET, '-inf', now);

  for (const reservationId of expiredIds) {
    const reservation = await readReservation(reservationId);
    if (reservation) {
      await redis.incrby(BALANCE_KEY(reservation.workspaceId), reservation.amount);
      await redis.del(RESERVATION_KEY(reservationId));
      logger.warn(
        { reservationId, ...reservation },
        'Reaped an expired, uncommitted credit reservation (refunded)',
      );
    }
    await redis.zrem(PENDING_ZSET, reservationId);
  }

  return expiredIds.length;
}

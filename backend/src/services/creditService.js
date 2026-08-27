import { randomUUID } from 'node:crypto';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';

// Since the per-user migration, credits are PERSONAL: every user has their
// own live balance in Redis and their own slice of the append-only Postgres
// ledger (CreditLedgerEntry.userId). Workspaces no longer hold a balance.
const BALANCE_KEY = (userId) => `credits:balance:user:${userId}`;
const RESERVATION_KEY = (id) => `credits:reservation:${id}`;
const PENDING_ZSET = 'credits:reservations:pending';

// The reservation's *logical* lifetime (used for the reaper's due-check) is
// shorter than the Redis key's own TTL. The gap is a safety buffer: the
// reaper must always get a chance to read + refund a reservation before
// Redis itself evicts the key out from under it — otherwise the refund is
// silently lost. reconciliationService is the backstop if this buffer is
// ever not enough.
const RESERVATION_TTL_SECONDS = 5 * 60;
const REAPER_SAFETY_BUFFER_SECONDS = 2 * 60;

// KEYS[1] user balance, KEYS[2] reservation, KEYS[3] pending zset
// ARGV[1] amount, ARGV[2] reservationId, ARGV[3] key TTL seconds,
// ARGV[4] zset score (logical expiry, ms), ARGV[5] userId, ARGV[6] workspaceId
const RESERVE_SCRIPT = `
local balance = tonumber(redis.call('GET', KEYS[1]) or '0')
local amount = tonumber(ARGV[1])
if balance < amount then
  return -1
end
redis.call('DECRBY', KEYS[1], amount)
redis.call('SET', KEYS[2], ARGV[5] .. ':' .. ARGV[6] .. ':' .. ARGV[1], 'EX', ARGV[3])
redis.call('ZADD', KEYS[3], ARGV[4], ARGV[2])
return balance - amount
`;

redis.defineCommand('reserveCreditScript', { numberOfKeys: 3, lua: RESERVE_SCRIPT });

// KEYS[1] sender balance, KEYS[2] receiver balance; ARGV[1] amount.
// Atomic move so a concurrent spend can't race the sender below zero.
const TRANSFER_SCRIPT = `
local balance = tonumber(redis.call('GET', KEYS[1]) or '0')
local amount = tonumber(ARGV[1])
if balance < amount then
  return -1
end
redis.call('DECRBY', KEYS[1], amount)
redis.call('INCRBY', KEYS[2], amount)
return balance - amount
`;

redis.defineCommand('transferCreditScript', { numberOfKeys: 2, lua: TRANSFER_SCRIPT });

export async function getBalance(userId) {
  const raw = await redis.get(BALANCE_KEY(userId));
  return raw === null ? 0 : Number(raw);
}

/**
 * The single chokepoint for every credit GRANT (and admin deduction): one
 * ledger row, then the matching Redis balance move. Nothing else in the
 * codebase may INCRBY a balance key directly — routing every movement
 * through here is what makes the per-user reconciliation invariant
 * (balance + reservations === Σ ledger.delta) hold.
 *
 * `amount` may be negative (admin "remove credits") — the ledger row and the
 * balance move both carry the sign. Callers are responsible for clamping so
 * a deduction doesn't push a balance below zero.
 */
export async function grantCredits({
  userId,
  workspaceId,
  amount,
  reason,
  contactId = null,
  spentById = null,
  amountCents = null,
}) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new ApiError(400, 'Credit amount must be a non-zero integer');
  }
  const entry = await prisma.creditLedgerEntry.create({
    data: { userId, workspaceId, delta: amount, reason, contactId, spentById, amountCents },
  });
  await redis.incrby(BALANCE_KEY(userId), amount);
  return entry;
}

/**
 * Atomically checks-and-decrements the SPENDER's personal balance and
 * records a reservation. Throws 402 if insufficient. The whole
 * check+decrement is one Lua script so two concurrent reveals against the
 * last credit can't both succeed.
 */
export async function reserveCredit(userId, workspaceId, amount = 1) {
  const reservationId = randomUUID();
  const logicalExpiresAtMs = Date.now() + RESERVATION_TTL_SECONDS * 1000;
  const keyTtlSeconds = RESERVATION_TTL_SECONDS + REAPER_SAFETY_BUFFER_SECONDS;

  const result = await redis.reserveCreditScript(
    BALANCE_KEY(userId),
    RESERVATION_KEY(reservationId),
    PENDING_ZSET,
    amount,
    reservationId,
    keyTtlSeconds,
    logicalExpiresAtMs,
    userId,
    workspaceId,
  );

  if (result === -1) {
    throw new ApiError(402, 'Insufficient credits');
  }

  return reservationId;
}

// Reservation values are "userId:workspaceId:amount" (3 segments). A
// 2-segment value is a legacy shared-pool reservation from before the
// per-user migration — the migration script drains those before cutover, so
// meeting one here means it slipped through; its workspace balance key no
// longer exists, so the only safe move is to log and drop it.
function parseReservation(raw) {
  const parts = raw.split(':');
  if (parts.length === 3) {
    return { userId: parts[0], workspaceId: parts[1], amount: Number(parts[2]) };
  }
  return null;
}

async function readReservation(reservationId) {
  const raw = await redis.get(RESERVATION_KEY(reservationId));
  if (!raw) return null;
  const parsed = parseReservation(raw);
  if (!parsed) {
    logger.error(
      { reservationId, raw },
      'Dropping a legacy-format credit reservation (pre-per-user-migration)',
    );
    await clearReservation(reservationId);
    return null;
  }
  return parsed;
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
export async function resolveReservationForCommit(reservationId, { userId, workspaceId }) {
  const reservation = await readReservation(reservationId);
  if (
    !reservation ||
    reservation.userId !== userId ||
    reservation.workspaceId !== workspaceId
  ) {
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
export async function refundAmount(userId, amount) {
  await redis.incrby(BALANCE_KEY(userId), amount);
}

/** Cancels the reservation and refunds the spender. Idempotent — a reservation that's already gone is a silent no-op. */
export async function releaseReservation(reservationId) {
  const reservation = await readReservation(reservationId);
  if (!reservation) return;

  await clearReservation(reservationId);
  await redis.incrby(BALANCE_KEY(reservation.userId), reservation.amount);
}

/** Refunds any reservation whose logical TTL has passed without being committed or released — e.g. the process crashed mid-request. */
export async function reapExpiredReservations() {
  const now = Date.now();
  const expiredIds = await redis.zrangebyscore(PENDING_ZSET, '-inf', now);

  for (const reservationId of expiredIds) {
    const reservation = await readReservation(reservationId);
    if (reservation) {
      await redis.incrby(BALANCE_KEY(reservation.userId), reservation.amount);
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

/**
 * Owner → member personal credit transfer. Redis first (atomic Lua move so
 * a concurrent spend can't race the sender negative), then one Postgres
 * transaction writing the matched TRANSFER_OUT / TRANSFER_IN pair. If the
 * ledger write fails, the Redis move is compensated in reverse — same
 * pattern as refundAmount after a failed commit.
 */
export async function transferCredits({ fromUserId, toUserId, workspaceId, amount }) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(400, 'Transfer amount must be a positive integer');
  }
  if (fromUserId === toUserId) {
    throw new ApiError(400, 'Cannot transfer credits to yourself');
  }

  const result = await redis.transferCreditScript(
    BALANCE_KEY(fromUserId),
    BALANCE_KEY(toUserId),
    amount,
  );
  if (result === -1) {
    throw new ApiError(402, 'Insufficient credits to transfer');
  }

  try {
    await prisma.$transaction([
      prisma.creditLedgerEntry.create({
        data: {
          userId: fromUserId,
          workspaceId,
          delta: -amount,
          reason: 'TRANSFER_OUT',
          spentById: fromUserId,
        },
      }),
      prisma.creditLedgerEntry.create({
        data: {
          userId: toUserId,
          workspaceId,
          delta: amount,
          reason: 'TRANSFER_IN',
          spentById: fromUserId,
        },
      }),
    ]);
  } catch (err) {
    // Put the credits back where they came from before surfacing the error.
    await redis.transferCreditScript(BALANCE_KEY(toUserId), BALANCE_KEY(fromUserId), amount);
    throw err;
  }

  return { amount };
}

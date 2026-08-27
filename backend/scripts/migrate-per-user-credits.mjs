// One-time migration: shared workspace credit pools -> per-user balances.
//
// Run with the API and worker STOPPED (a short write-freeze), after
// `npx prisma migrate deploy` has applied 20260827160000_per_user_credits_core:
//
//   cd backend && node scripts/migrate-per-user-credits.mjs
//
// Steps (idempotent — safe to re-run; each workspace is keyed off the
// existence of its BALANCE_MIGRATION ledger row):
//   1. Drain every pending credit reservation, refunding the LEGACY
//      workspace balance keys (reservations are short-lived; with the API
//      stopped nothing recreates them).
//   2. Per workspace: move the whole legacy balance to the OWNER's personal
//      balance (Redis INCRBY + a BALANCE_MIGRATION ledger row), then delete
//      the legacy key.
//   3. Stamp every existing user's lastMonthlyGrantAt so the FREE-plan
//      monthly sweep starts one month from now, not immediately.
//
// After it completes: deploy the new code, restart API + worker, and watch
// the first reconciliation run report zero drift.

// bullConnection is created by the redis config module at import time —
// disconnect it too or the script never exits.
import { prisma } from '../src/config/db.js';
import { redis, bullConnection } from '../src/config/redis.js';

const PENDING_ZSET = 'credits:reservations:pending';

// Atomic move: read + delete the legacy workspace key and credit the user
// key in one script, so no crash window can double-apply it. Returns the
// amount moved (0 when the legacy key is already gone).
const MOVE_SCRIPT = `
local bal = redis.call('GET', KEYS[1])
if not bal then return 0 end
redis.call('DEL', KEYS[1])
redis.call('INCRBY', KEYS[2], bal)
return tonumber(bal)
`;
redis.defineCommand('moveLegacyBalance', { numberOfKeys: 2, lua: MOVE_SCRIPT });

async function drainLegacyReservations() {
  const ids = await redis.zrange(PENDING_ZSET, 0, -1);
  let refunded = 0;
  for (const id of ids) {
    const raw = await redis.get(`credits:reservation:${id}`);
    if (raw) {
      const parts = raw.split(':');
      if (parts.length === 2) {
        // Legacy "workspaceId:amount" — refund the workspace pool it came from.
        await redis.incrby(`credits:balance:${parts[0]}`, Number(parts[1]));
        refunded++;
      } else if (parts.length === 3) {
        // Already-new-format (re-run after partial deploy) — refund the user.
        await redis.incrby(`credits:balance:user:${parts[0]}`, Number(parts[2]));
        refunded++;
      }
      await redis.del(`credits:reservation:${id}`);
    }
    await redis.zrem(PENDING_ZSET, id);
  }
  console.log(`[1/3] drained ${ids.length} pending reservations (${refunded} refunded)`);
}

async function moveBalancesToOwners() {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true },
  });

  let moved = 0;
  let skippedDone = 0;
  let skippedNoOwner = 0;
  let skippedEmpty = 0;

  for (const workspace of workspaces) {
    // Idempotency: a BALANCE_MIGRATION row means this workspace is done.
    const already = await prisma.creditLedgerEntry.findFirst({
      where: { workspaceId: workspace.id, reason: 'BALANCE_MIGRATION' },
      select: { id: true },
    });
    if (already) {
      skippedDone++;
      continue;
    }

    const raw = await redis.get(`credits:balance:${workspace.id}`);
    const balance = raw === null ? 0 : Number(raw);
    if (balance <= 0) {
      // Nothing to move — still delete a zero/negative legacy key.
      if (raw !== null) await redis.del(`credits:balance:${workspace.id}`);
      skippedEmpty++;
      continue;
    }

    const owner = await prisma.membership.findFirst({
      where: { workspaceId: workspace.id, role: 'OWNER' },
      select: { userId: true },
    });
    if (!owner) {
      console.warn(`  ! workspace ${workspace.id} (${workspace.name}) has ${balance} credits but no OWNER — left untouched`);
      skippedNoOwner++;
      continue;
    }

    // Ledger marker first, then the ATOMIC Redis move. Crash windows:
    //  - after marker, before move: re-run's recovery pass below performs
    //    the move (legacy key still present) exactly once;
    //  - after move: legacy key is gone, recovery is a no-op.
    // The Lua script means the move itself can never half-apply.
    await prisma.creditLedgerEntry.create({
      data: {
        userId: owner.userId,
        workspaceId: workspace.id,
        delta: balance,
        reason: 'BALANCE_MIGRATION',
      },
    });
    await redis.moveLegacyBalance(
      `credits:balance:${workspace.id}`,
      `credits:balance:user:${owner.userId}`,
    );
    moved++;
    console.log(`  moved ${balance} credits: workspace "${workspace.name}" -> owner ${owner.userId}`);
  }

  // Crash-window recovery: marker written but the move never ran (owner not
  // credited, legacy key still present). The atomic script makes this safe
  // to run unconditionally for every marker.
  const markers = await prisma.creditLedgerEntry.findMany({
    where: { reason: 'BALANCE_MIGRATION' },
    select: { workspaceId: true, userId: true },
  });
  for (const marker of markers) {
    const recovered = await redis.moveLegacyBalance(
      `credits:balance:${marker.workspaceId}`,
      `credits:balance:user:${marker.userId}`,
    );
    if (recovered > 0) {
      console.log(`  recovered interrupted move for workspace ${marker.workspaceId} (${recovered})`);
    }
  }

  console.log(
    `[2/3] balances moved: ${moved}, already done: ${skippedDone}, empty: ${skippedEmpty}, no owner: ${skippedNoOwner}`,
  );
}

async function stampGrantCursors() {
  const result = await prisma.user.updateMany({
    where: { lastMonthlyGrantAt: null },
    data: { lastMonthlyGrantAt: new Date() },
  });
  console.log(`[3/3] stamped lastMonthlyGrantAt on ${result.count} users`);
}

// The shared client has enableOfflineQueue: false — commands issued before
// the connection is up fail instantly, so wait for ready first.
async function waitForRedis() {
  if (redis.status === 'ready') return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Redis not ready after 15s')), 15_000);
    redis.once('ready', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function main() {
  console.log('Per-user credit migration starting…');
  await waitForRedis();
  await drainLegacyReservations();
  await moveBalancesToOwners();
  await stampGrantCursors();
  console.log('Done. Deploy the new code, restart API + worker, and check reconciliation.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    bullConnection.disconnect();
  });

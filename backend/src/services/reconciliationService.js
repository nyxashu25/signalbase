import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

const BALANCE_KEY = (workspaceId) => `credits:balance:${workspaceId}`;
const RESERVATION_KEY = (id) => `credits:reservation:${id}`;
const PENDING_ZSET = 'credits:reservations:pending';

async function activeReservationTotals() {
  const ids = await redis.zrange(PENDING_ZSET, 0, -1);
  const totals = new Map();

  for (const id of ids) {
    const raw = await redis.get(RESERVATION_KEY(id));
    if (!raw) continue;
    const [workspaceId, amount] = raw.split(':');
    totals.set(workspaceId, (totals.get(workspaceId) ?? 0) + Number(amount));
  }

  return totals;
}

/**
 * Compares Redis's view of each workspace's balance (available + actively
 * reserved) against Postgres's ground truth (monthlyGrant + Σledger.delta).
 * They must always match — any gap means a bug in the reserve/commit/
 * release/reap flow let a credit get lost or duplicated. Alert-only: never
 * auto-corrects, since silently "fixing" drift would also hide the bug that
 * caused it.
 */
export async function reconcileAllWorkspaces() {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, monthlyCreditGrant: true },
  });
  const reservedTotals = await activeReservationTotals();

  let driftCount = 0;

  for (const workspace of workspaces) {
    const rawBalance = await redis.get(BALANCE_KEY(workspace.id));
    if (rawBalance === null) continue; // never initialized — nothing to compare yet

    const ledgerSum = await prisma.creditLedgerEntry.aggregate({
      where: { workspaceId: workspace.id },
      _sum: { delta: true },
    });
    const expected = workspace.monthlyCreditGrant + (ledgerSum._sum.delta ?? 0);
    const actual = Number(rawBalance) + (reservedTotals.get(workspace.id) ?? 0);

    if (actual !== expected) {
      driftCount++;
      logger.error(
        { workspaceId: workspace.id, expected, actual, drift: actual - expected },
        'Credit balance drift detected — Redis and Postgres disagree',
      );
    }
  }

  return { checked: workspaces.length, driftCount };
}

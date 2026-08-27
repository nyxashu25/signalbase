import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

const BALANCE_KEY = (userId) => `credits:balance:user:${userId}`;
const RESERVATION_KEY = (id) => `credits:reservation:${id}`;
const PENDING_ZSET = 'credits:reservations:pending';

const PAGE_SIZE = 500;

// Reservation values are "userId:workspaceId:amount" — see creditService.
// Legacy 2-segment values (pre-per-user-migration) are skipped; the
// migration drains them and creditService drops any straggler on read.
async function activeReservationTotalsByUser() {
  const ids = await redis.zrange(PENDING_ZSET, 0, -1);
  const totals = new Map();

  for (const id of ids) {
    const raw = await redis.get(RESERVATION_KEY(id));
    if (!raw) continue;
    const parts = raw.split(':');
    if (parts.length !== 3) continue;
    const [userId, , amount] = parts;
    totals.set(userId, (totals.get(userId) ?? 0) + Number(amount));
  }

  return totals;
}

/**
 * Compares Redis's view of each USER's personal balance (available +
 * actively reserved) against Postgres's ground truth (Σ ledger.delta for
 * that user). They must always match — every balance movement since the
 * per-user migration writes a ledger row (creditService.grantCredits is the
 * single grant chokepoint; spends commit reservations against ledger rows;
 * the migration itself wrote BALANCE_MIGRATION baselines), so any gap means
 * a bug let a credit get lost or duplicated. Legacy rows with userId = null
 * are excluded: their value was absorbed into the baselines. Alert-only:
 * never auto-corrects, since silently "fixing" drift would also hide the
 * bug that caused it.
 */
export async function reconcileAllUsers() {
  const reservedTotals = await activeReservationTotalsByUser();

  let checked = 0;
  let driftCount = 0;
  let cursor;

  for (;;) {
    const users = await prisma.user.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (users.length === 0) break;
    cursor = users[users.length - 1].id;

    for (const user of users) {
      const rawBalance = await redis.get(BALANCE_KEY(user.id));
      const ledgerSum = await prisma.creditLedgerEntry.aggregate({
        where: { userId: user.id },
        _sum: { delta: true },
      });
      const expected = ledgerSum._sum.delta ?? 0;
      // An absent key reads as 0 — correct for a user whose grants and
      // spends net to zero, and for one who never received a grant.
      const actual = Number(rawBalance ?? 0) + (reservedTotals.get(user.id) ?? 0);

      checked++;
      if (actual !== expected) {
        driftCount++;
        logger.error(
          { userId: user.id, expected, actual, drift: actual - expected },
          'Credit balance drift detected — Redis and Postgres disagree',
        );
      }
    }

    if (users.length < PAGE_SIZE) break;
  }

  return { checked, driftCount };
}

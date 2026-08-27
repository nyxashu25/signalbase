import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { grantCredits } from './creditService.js';
import {
  BLOCK_CONFIG,
  FREE_SEAT_MONTHLY_CREDITS,
  FREE_PLAN_MONTHLY_CREDITS,
} from '../config/planConfig.js';

/**
 * The monthly credit distribution for a PAID workspace, fired from Stripe's
 * invoice.paid webhook (stripeService.grantMonthlyCredits). Per active
 * member: PAID seat -> the plan's per-seat rate, FREE seat -> the flat
 * free-seat rate, PENDING -> nothing; plus the plan's flat owner bonus to
 * the OWNER. `months` is the billing interval's length (a quarterly invoice
 * pays 3 months of credits at once — existing convention).
 *
 * Exactly-once comes from the webhook layer's claimEvent dedupe; each grant
 * here is one grantCredits call (ledger row + Redis together), so a partial
 * failure leaves ledger and balances consistent with each other.
 */
export async function distributeWorkspaceGrant(workspaceId, months = 1) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true, blocks: true, suspendedAt: true, deletedAt: true },
  });
  const config = workspace && BLOCK_CONFIG[workspace.plan];
  if (!config) {
    logger.warn({ workspaceId }, 'No block config for this workspace plan — skipping grant');
    return { granted: 0, totalCredits: 0 };
  }
  if (workspace.suspendedAt || workspace.deletedAt) {
    logger.info({ workspaceId }, 'Workspace suspended/deleted — skipping monthly grant');
    return { granted: 0, totalCredits: 0 };
  }

  const memberships = await prisma.membership.findMany({
    where: { workspaceId, user: { deletedAt: null, suspendedAt: null } },
    select: { userId: true, role: true, seatType: true },
  });

  let granted = 0;
  let totalCredits = 0;

  for (const member of memberships) {
    let amount = 0;
    if (member.seatType === 'PAID') amount = config.paidSeatCredits * months;
    else if (member.seatType === 'FREE') amount = FREE_SEAT_MONTHLY_CREDITS * months;
    if (amount > 0) {
      await grantCredits({
        userId: member.userId,
        workspaceId,
        amount,
        reason: 'MONTHLY_GRANT',
      });
      granted++;
      totalCredits += amount;
    }

    if (member.role === 'OWNER' && config.ownerBonus > 0) {
      const bonus = config.ownerBonus * months;
      await grantCredits({
        userId: member.userId,
        workspaceId,
        amount: bonus,
        reason: 'OWNER_BONUS',
      });
      totalCredits += bonus;
    }
  }

  logger.info(
    { workspaceId, plan: workspace.plan, months, granted, totalCredits },
    'Monthly workspace credit distribution complete',
  );
  return { granted, totalCredits };
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const SWEEP_PAGE_SIZE = 200;

/**
 * The FREE-plan monthly sweep (jobs/processors/monthlyGrantProcessor, every
 * 6h): grants FREE_PLAN_MONTHLY_CREDITS to every active user whose last
 * grant is a month or more old and who doesn't earn through a paid/free
 * seat in an active paid workspace. The guarded updateMany on
 * lastMonthlyGrantAt is the exactly-once lock — two overlapping sweeps
 * can't double-grant the same user.
 */
export async function sweepFreeUserGrants(now = new Date()) {
  const due = new Date(now.getTime() - MONTH_MS);
  let grantedCount = 0;

  for (;;) {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        suspendedAt: null,
        OR: [{ lastMonthlyGrantAt: null }, { lastMonthlyGrantAt: { lte: due } }],
        // Anyone covered by a seat in an active paid workspace earns via
        // the invoice-driven distribution instead.
        memberships: {
          none: {
            seatType: { in: ['PAID', 'FREE'] },
            workspace: { plan: { not: 'FREE' }, suspendedAt: null, deletedAt: null },
          },
        },
      },
      select: {
        id: true,
        lastMonthlyGrantAt: true,
        memberships: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { workspaceId: true },
        },
      },
      take: SWEEP_PAGE_SIZE,
    });
    if (users.length === 0) break;

    for (const user of users) {
      // Exactly-once lock: only the process that flips the cursor grants.
      const claimed = await prisma.user.updateMany({
        where: { id: user.id, lastMonthlyGrantAt: user.lastMonthlyGrantAt },
        data: { lastMonthlyGrantAt: now },
      });
      if (claimed.count !== 1) continue;

      const workspaceId = user.memberships[0]?.workspaceId;
      if (!workspaceId) continue; // no workspace to book the ledger row under

      await grantCredits({
        userId: user.id,
        workspaceId,
        amount: FREE_PLAN_MONTHLY_CREDITS,
        reason: 'MONTHLY_GRANT',
      });
      grantedCount++;
    }

    if (users.length < SWEEP_PAGE_SIZE) break;
  }

  if (grantedCount > 0) {
    logger.info({ grantedCount }, 'Free-plan monthly credit sweep granted');
  }
  return { grantedCount };
}

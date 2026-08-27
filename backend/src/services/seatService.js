import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { grantCredits } from './creditService.js';
import {
  BLOCK_CONFIG,
  seatCapacity,
  WELCOME_GIFT_CREDITS,
  planIncludesTeam,
} from '../config/planConfig.js';

/**
 * Occupancy vs capacity for a workspace under block billing:
 * { plan, blocks, capacity: {paid, free}, assigned: {paid, free, pending} }.
 */
export async function seatOverview(workspaceId) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true, blocks: true },
  });
  const memberships = await prisma.membership.findMany({
    where: { workspaceId },
    select: { seatType: true },
  });
  const assigned = { paid: 0, free: 0, pending: 0 };
  for (const m of memberships) {
    if (m.seatType === 'PAID') assigned.paid++;
    else if (m.seatType === 'FREE') assigned.free++;
    else assigned.pending++;
  }
  return {
    plan: workspace.plan,
    blocks: workspace.blocks,
    capacity: seatCapacity(workspace.plan, workspace.blocks),
    assigned,
    memberCount: memberships.length,
  };
}

/**
 * The default block count the Billing page pre-fills: enough total seats
 * (paid + free per block) to cover every current member. Always at least 1;
 * the owner can dial it up or down before checkout.
 */
export function suggestedBlocks(plan, memberCount) {
  const config = BLOCK_CONFIG[plan];
  if (!config) return 1;
  const perBlock = config.paidSeats + config.freeSeats;
  return Math.max(1, Math.ceil(memberCount / perBlock));
}

/**
 * Pays the one-time welcome gift to a membership that just became
 * payment-covered. The guarded updateMany on welcomeGiftAt IS NULL is the
 * exactly-once lock — concurrent webhook redeliveries or repeated seat
 * assignments can never double-grant.
 */
async function payWelcomeGift(membership) {
  const claimed = await prisma.membership.updateMany({
    where: { id: membership.id, welcomeGiftAt: null },
    data: { welcomeGiftAt: new Date() },
  });
  if (claimed.count !== 1) return false;

  await grantCredits({
    userId: membership.userId,
    workspaceId: membership.workspaceId,
    amount: WELCOME_GIFT_CREDITS,
    reason: 'WELCOME_GIFT',
  });
  return true;
}

/**
 * Owner assigns a member to a PAID / FREE / PENDING seat. Capacity-checked
 * against the purchased blocks; first-ever coverage fires the welcome gift.
 */
export async function assignSeat(workspaceId, targetUserId, seatType) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true, blocks: true },
  });
  if (!planIncludesTeam(workspace.plan)) {
    throw new ApiError(403, "Seat assignment isn't available on the Free plan");
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
  });
  if (!membership) throw new ApiError(404, 'That person is not a member of this workspace');
  if (membership.role === 'OWNER' && seatType !== 'PAID') {
    throw new ApiError(409, 'The workspace owner always occupies a paid seat');
  }
  if (membership.seatType === seatType) return membership;

  if (seatType !== 'PENDING') {
    const capacity = seatCapacity(workspace.plan, workspace.blocks);
    const occupied = await prisma.membership.count({
      where: { workspaceId, seatType, NOT: { id: membership.id } },
    });
    const cap = seatType === 'PAID' ? capacity.paid : capacity.free;
    if (occupied >= cap) {
      throw new ApiError(
        409,
        `All ${cap} ${seatType.toLowerCase()} seats are taken — buy another block from Billing or free one up`,
      );
    }
  }

  const updated = await prisma.membership.update({
    where: { id: membership.id },
    data: { seatType },
  });

  if (seatType !== 'PENDING' && !membership.welcomeGiftAt) {
    await payWelcomeGift(updated);
  }
  return updated;
}

/**
 * Runs right after a paid checkout activates (stripeService): makes sure the
 * OWNER holds a paid seat, then promotes PENDING members oldest-first into
 * whatever paid capacity is free, then free capacity. Each member newly
 * covered gets the one-time welcome gift. Returns how many were activated.
 * Idempotent — a redelivered webhook finds nothing left to promote.
 */
export async function activateCoverage(workspaceId) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true, blocks: true },
  });
  if (!BLOCK_CONFIG[workspace.plan]) return { activated: 0 };

  const capacity = seatCapacity(workspace.plan, workspace.blocks);
  const memberships = await prisma.membership.findMany({
    // Soft-deleted accounts never occupy or claim seats.
    where: { workspaceId, user: { deletedAt: null } },
    orderBy: { createdAt: 'asc' },
  });

  let paidUsed = memberships.filter((m) => m.seatType === 'PAID').length;
  let freeUsed = memberships.filter((m) => m.seatType === 'FREE').length;
  let activated = 0;

  // The owner is first in line for a paid seat, then everyone else by join
  // order.
  const pending = memberships
    .filter((m) => m.seatType === 'PENDING')
    .sort((a, b) => (a.role === 'OWNER' ? -1 : b.role === 'OWNER' ? 1 : 0));

  for (const membership of pending) {
    let seatType = null;
    if (paidUsed < capacity.paid) {
      seatType = 'PAID';
      paidUsed++;
    } else if (freeUsed < capacity.free && membership.role !== 'OWNER') {
      seatType = 'FREE';
      freeUsed++;
    }
    if (!seatType) continue; // out of capacity — stays pending

    const updated = await prisma.membership.update({
      where: { id: membership.id },
      data: { seatType },
    });
    activated++;
    if (!membership.welcomeGiftAt) await payWelcomeGift(updated);
  }

  if (activated > 0) {
    logger.info({ workspaceId, activated }, 'Pending members activated into purchased seats');
  }
  return { activated };
}

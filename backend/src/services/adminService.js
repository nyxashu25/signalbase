import { prisma } from '../config/db.js';
import * as creditService from './creditService.js';
import { getBalance } from './creditService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { getStripeSettings } from './paymentSettingsService.js';
import { seatCapacity } from '../config/planConfig.js';
import * as seatService from './seatService.js';
import { activateCoverage } from './seatService.js';
import { invalidateWorkspaceGuardCache } from '../middleware/workspaceGuard.js';
import * as notificationService from './notificationService.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getOverview() {
  const [totalWorkspaces, totalUsers, paidWorkspaces, newUsersLast30Days] = await Promise.all([
    prisma.workspace.count(),
    prisma.user.count(),
    prisma.workspace.count({
      where: {
        OR: [
          { stripeSubscriptionId: { not: null } },
          { creditLedger: { some: { reason: 'TOPUP' } } },
        ],
      },
    }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - THIRTY_DAYS_MS) } } }),
  ]);

  return { totalWorkspaces, totalUsers, paidWorkspaces, newUsersLast30Days };
}

export async function getUsage() {
  const [totalReveals, totalSequenceSends] = await Promise.all([
    prisma.emailReveal.count(),
    prisma.sequenceStepEvent.count({ where: { type: 'SENT' } }),
  ]);

  return { totalReveals, totalSequenceSends };
}

/**
 * Compliance trail for support-desk overrides (see AdminAuditLog in
 * schema.prisma). Fire-and-record, not fire-and-forget — unlike the email
 * notifications elsewhere in this file, a failed audit write should fail
 * the request, since a support action that can't be logged shouldn't
 * silently succeed unlogged.
 */
export async function recordAuditLog({ superAdminId, action, targetUserId = null, metadata }) {
  await prisma.adminAuditLog.create({
    data: { superAdminId, action, targetUserId, metadata },
  });
}

export async function listAuditLog({ page, pageSize, userId }) {
  const where = userId ? { targetUserId: userId } : {};

  const [total, entries] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { superAdmin: { select: { name: true, email: true } } },
    }),
  ]);

  // targetUserId is a soft reference (see the model comment) — batch-look-up
  // the still-existing users' names/emails for display rather than an
  // include, so a since-deleted target doesn't break the whole page.
  const targetIds = [...new Set(entries.map((e) => e.targetUserId).filter(Boolean))];
  const targetUsers = targetIds.length
    ? await prisma.user.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const targetById = new Map(targetUsers.map((u) => [u.id, u]));

  return {
    results: entries.map((e) => ({
      id: e.id,
      action: e.action,
      metadata: e.metadata,
      createdAt: e.createdAt,
      superAdmin: e.superAdmin,
      targetUser: e.targetUserId ? (targetById.get(e.targetUserId) ?? { id: e.targetUserId }) : null,
    })),
    total,
    page,
    pageSize,
  };
}

function primaryMembership(user) {
  // Same convention as authService.login's default-workspace pick — a user
  // created through normal signup has exactly one, so this is unambiguous
  // in practice; multi-workspace users show their oldest membership.
  return user.memberships[0];
}

export async function listUsers({ page, pageSize, search, deleted = false }) {
  // Default view hides soft-deleted accounts — they live in the "Deleted"
  // section (listDeleted) until restored or purged; `deleted: true` flips
  // the filter for the deleted-only listing.
  const where = {
    deletedAt: deleted ? { not: null } : null,
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { memberships: { include: { workspace: true }, orderBy: { createdAt: 'asc' } } },
    }),
  ]);

  const results = users.map((user) => {
    const membership = primaryMembership(user);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      suspendedAt: user.suspendedAt,
      deletedAt: user.deletedAt,
      workspace: membership
        ? { id: membership.workspace.id, name: membership.workspace.name }
        : null,
      role: membership?.role ?? null,
    };
  });

  return { results, total, page, pageSize };
}

async function loadUserWithPrimaryWorkspace(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { workspace: true }, orderBy: { createdAt: 'asc' } } },
  });
  if (!user) throw new ApiError(404, 'User not found');

  const membership = primaryMembership(user);
  if (!membership) throw new ApiError(409, 'User has no workspace membership');

  return { user, membership };
}

export async function getUserDetail(userId) {
  // Tolerates a membership-less user (removed from every workspace, or
  // soft-deleted) — the admin must still be able to inspect and manage them.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { workspace: true }, orderBy: { createdAt: 'asc' } } },
  });
  if (!user) throw new ApiError(404, 'User not found');
  const membership = primaryMembership(user);
  const workspace = membership?.workspace ?? null;

  // Personal balance and personal spend — credits are per-user now.
  const [balance, usedAgg] = await Promise.all([
    getBalance(user.id),
    prisma.creditLedgerEntry.aggregate({
      where: { userId: user.id, delta: { lt: 0 } },
      _sum: { delta: true },
    }),
  ]);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    suspendedAt: user.suspendedAt,
    deletedAt: user.deletedAt,
    role: membership?.role ?? null,
    workspace: workspace
      ? {
          id: workspace.id,
          name: workspace.name,
          plan: workspace.plan,
          seats: workspace.seats,
          blocks: workspace.blocks,
          suspendedAt: workspace.suspendedAt,
          deletedAt: workspace.deletedAt,
          monthlyCreditGrant: workspace.monthlyCreditGrant,
        }
      : null,
    balance,
    creditsUsed: Math.abs(usedAgg._sum.delta ?? 0),
  };
}

/**
 * Support-desk override, not a payment — changes the plan (and its credit
 * grant) directly, same "instant, out of band" spirit as addCredits above.
 * Does not touch Stripe (stripeCustomerId/stripeSubscriptionId), so a
 * workspace with a real subscription would drift from what Stripe thinks
 * it's paying for until the next billing-side sync; acceptable for a
 * support tool used sparingly, not something to build real dunning logic
 * around yet.
 */
export async function updateUserPlan(userId, plan, actorAdminId, blocks) {
  const { user, membership } = await loadUserWithPrimaryWorkspace(userId);
  const workspaceId = membership.workspace.id;
  const previousPlan = membership.workspace.plan;
  const previousBlocks = membership.workspace.blocks;
  // A paid override defaults to one seat block; FREE always means zero. An
  // explicit `blocks` wins for bespoke enterprise deals.
  const nextBlocks = plan === 'FREE' ? 0 : (blocks ?? Math.max(1, previousBlocks));

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { plan, blocks: nextBlocks },
  });
  // A support-granted paid plan should behave like a purchased one: promote
  // pending members into the granted seats (welcome gifts included).
  if (plan !== 'FREE') await seatService.activateCoverage(workspaceId);

  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'UPDATE_PLAN',
    targetUserId: userId,
    metadata: { from: previousPlan, to: plan, fromBlocks: previousBlocks, toBlocks: nextBlocks },
  });
  await notificationService.sendAdminPlanChanged(user, plan);

  return {
    workspaceId,
    plan: workspace.plan,
    blocks: workspace.blocks,
    capacity: seatCapacity(workspace.plan, workspace.blocks),
  };
}

export async function suspendUser(userId, actorAdminId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: new Date() },
  });
  await recordAuditLog({ superAdminId: actorAdminId, action: 'SUSPEND_USER', targetUserId: userId });
  return user;
}

export async function unsuspendUser(userId, actorAdminId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: null },
  });
  await recordAuditLog({ superAdminId: actorAdminId, action: 'UNSUSPEND_USER', targetUserId: userId });
  return user;
}

// ---------------------------------------------------------------------------
// Lifecycle: per-user credit adjustment, workspace suspend, and soft delete
// with restore. Soft-deleted entities are hidden from the product (login/
// refresh/member lists) but fully intact — the deletion-purge job hard-
// deletes them 60 days after deletedAt.
// ---------------------------------------------------------------------------

export const PURGE_AFTER_DAYS = 60;

/**
 * Adjust a USER's personal balance: mode 'add' credits `amount`, 'remove'
 * deducts up to their balance (never below zero), 'set' moves the balance
 * to exactly `amount`. Every mode is one ADJUST_USER_CREDITS ledger row via
 * the grant chokepoint, so reconciliation stays green.
 */
export async function adjustUserCredits(userId, { mode, amount }, actorAdminId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');
  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  const workspaceId = membership?.workspaceId ?? null;
  if (!workspaceId) throw new ApiError(409, 'User has no workspace to book the adjustment under');

  const balance = await getBalance(userId);
  let delta;
  if (mode === 'add') delta = amount;
  else if (mode === 'remove') delta = -Math.min(amount, balance);
  else delta = amount - balance; // 'set'

  if (delta !== 0) {
    await creditService.grantCredits({
      userId,
      workspaceId,
      amount: delta,
      reason: 'ADJUSTMENT',
    });
  }
  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'ADJUST_USER_CREDITS',
    targetUserId: userId,
    metadata: { mode, amount, delta, balanceBefore: balance },
  });
  await notificationService.sendAdminCreditsAdded(user, delta);

  return { userId, balance: await getBalance(userId), delta };
}

export async function suspendWorkspace(workspaceId, actorAdminId) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { suspendedAt: new Date() },
  });
  invalidateWorkspaceGuardCache(workspaceId);
  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'SUSPEND_WORKSPACE',
    metadata: { workspaceId, name: workspace.name },
  });
  return workspace;
}

export async function unsuspendWorkspace(workspaceId, actorAdminId) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { suspendedAt: null },
  });
  invalidateWorkspaceGuardCache(workspaceId);
  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'UNSUSPEND_WORKSPACE',
    metadata: { workspaceId, name: workspace.name },
  });
  return workspace;
}

export async function deleteWorkspace(workspaceId, actorAdminId) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { deletedAt: new Date() },
  });
  invalidateWorkspaceGuardCache(workspaceId);
  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'DELETE_WORKSPACE',
    metadata: { workspaceId, name: workspace.name },
  });
  return workspace;
}

export async function restoreWorkspace(workspaceId, actorAdminId) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { deletedAt: null },
  });
  invalidateWorkspaceGuardCache(workspaceId);
  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'RESTORE_WORKSPACE',
    metadata: { workspaceId, name: workspace.name },
  });
  return workspace;
}

export async function deleteUser(userId, actorAdminId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });
  await recordAuditLog({ superAdminId: actorAdminId, action: 'DELETE_USER', targetUserId: userId });
  return user;
}

export async function restoreUser(userId, actorAdminId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: null },
  });
  await recordAuditLog({ superAdminId: actorAdminId, action: 'RESTORE_USER', targetUserId: userId });
  return user;
}

/** Admin removes a member from a workspace — same semantics as the OWNER's own removal. */
export async function adminRemoveMember(workspaceId, targetUserId, actorAdminId) {
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
  });
  if (!membership) throw new ApiError(404, 'That person is not a member of this workspace');
  if (membership.role === 'OWNER') {
    throw new ApiError(409, 'The workspace owner cannot be removed — delete the workspace instead');
  }
  await prisma.membership.delete({ where: { id: membership.id } });
  await activateCoverage(workspaceId);
  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'REMOVE_MEMBER',
    targetUserId,
    metadata: { workspaceId },
  });
}

/** The admin "Deleted" section: everything soft-deleted, with its purge date. */
export async function listDeleted() {
  const purgeAt = (deletedAt) =>
    new Date(deletedAt.getTime() + PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const [users, workspaces] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, name: true, email: true, deletedAt: true },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.workspace.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, name: true, plan: true, deletedAt: true },
      orderBy: { deletedAt: 'desc' },
    }),
  ]);

  return {
    users: users.map((u) => ({ ...u, purgeAt: purgeAt(u.deletedAt) })),
    workspaces: workspaces.map((w) => ({ ...w, purgeAt: purgeAt(w.deletedAt) })),
  };
}

export async function getBillingOverview() {
  const [revenueAgg, transactionCount, stripeSettings] = await Promise.all([
    prisma.creditLedgerEntry.aggregate({
      where: { reason: 'TOPUP' },
      _sum: { amountCents: true },
    }),
    prisma.creditLedgerEntry.count({ where: { reason: 'TOPUP' } }),
    getStripeSettings(),
  ]);

  return {
    totalRevenueCents: revenueAgg._sum.amountCents ?? 0,
    transactionCount,
    // No key configured in /control/settings means every checkout is
    // simulated — see stripeService.createCheckoutSession. Surfaced so the
    // admin billing screen can say so honestly instead of implying a
    // connected gateway.
    paymentGateway: {
      provider: 'stripe',
      connected: stripeSettings.configured,
    },
  };
}

export async function listTransactions({ page, pageSize }) {
  const where = { reason: { in: ['TOPUP', 'ADJUSTMENT'] } };

  const [total, entries] = await Promise.all([
    prisma.creditLedgerEntry.count({ where }),
    prisma.creditLedgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { workspace: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    results: entries.map((e) => ({
      id: e.id,
      workspace: e.workspace,
      delta: e.delta,
      reason: e.reason,
      amountCents: e.amountCents,
      createdAt: e.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}

/**
 * Admin-composed broadcast (see routes/admin.js POST /promotions) to every
 * user who hasn't unsubscribed and isn't suspended — a suspended account
 * shouldn't hear about product offers it can't act on.
 */
export async function sendPromotionalBroadcast({ subject, body }, actorAdminId) {
  const users = await prisma.user.findMany({
    where: { suspendedAt: null, deletedAt: null, marketingOptOut: false },
    select: { id: true, email: true, name: true },
  });
  await notificationService.sendPromotionalBroadcast(users, subject, body);
  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'SEND_PROMOTION',
    metadata: { subject, recipientCount: users.length },
  });
  return { recipientCount: users.length };
}

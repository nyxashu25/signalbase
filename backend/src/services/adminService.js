import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { getBalance } from './creditService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { getStripeSettings } from './paymentSettingsService.js';
import { PLAN_MONTHLY_CREDITS } from '../config/planConfig.js';
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

export async function listUsers({ page, pageSize, search }) {
  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

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
  const { user, membership } = await loadUserWithPrimaryWorkspace(userId);
  const workspace = membership.workspace;

  const [balance, usedAgg] = await Promise.all([
    getBalance(workspace.id),
    prisma.creditLedgerEntry.aggregate({
      where: { workspaceId: workspace.id, delta: { lt: 0 } },
      _sum: { delta: true },
    }),
  ]);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    suspendedAt: user.suspendedAt,
    role: membership.role,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      plan: workspace.plan,
      monthlyCreditGrant: workspace.monthlyCreditGrant,
    },
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
export async function updateUserPlan(userId, plan, actorAdminId) {
  const { user, membership } = await loadUserWithPrimaryWorkspace(userId);
  const workspaceId = membership.workspace.id;
  const previousPlan = membership.workspace.plan;

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { plan, monthlyCreditGrant: PLAN_MONTHLY_CREDITS[plan] },
  });
  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'UPDATE_PLAN',
    targetUserId: userId,
    metadata: { from: previousPlan, to: plan },
  });
  await notificationService.sendAdminPlanChanged(user, plan);

  return { workspaceId, plan: workspace.plan, monthlyCreditGrant: workspace.monthlyCreditGrant };
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
 * Admin-granted credits, any amount — same symmetric ledger+Redis pattern
 * as a real Stripe top-up (see stripeService.topUpCredits), just with
 * reason: ADJUSTMENT instead of TOPUP so it's distinguishable in the
 * transaction history from an actual payment.
 */
export async function addCredits(userId, amount, actorAdminId) {
  const { user, membership } = await loadUserWithPrimaryWorkspace(userId);
  const workspaceId = membership.workspace.id;

  await prisma.creditLedgerEntry.create({
    data: { workspaceId, delta: amount, reason: 'ADJUSTMENT' },
  });
  await redis.incrby(`credits:balance:${workspaceId}`, amount);
  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'ADD_CREDITS',
    targetUserId: userId,
    metadata: { amount },
  });
  await notificationService.sendAdminCreditsAdded(user, amount);

  return { workspaceId, balance: await getBalance(workspaceId) };
}

/**
 * Admin-composed broadcast (see routes/admin.js POST /promotions) to every
 * user who hasn't unsubscribed and isn't suspended — a suspended account
 * shouldn't hear about product offers it can't act on.
 */
export async function sendPromotionalBroadcast({ subject, body }, actorAdminId) {
  const users = await prisma.user.findMany({
    where: { suspendedAt: null, marketingOptOut: false },
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

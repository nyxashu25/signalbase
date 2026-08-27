import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';
import { signInviteToken } from './tokenService.js';
import * as notificationService from './notificationService.js';
import { toCsv } from '../utils/csv.js';

// Human labels for the spend reasons a teammate can trigger (the audit only
// covers spends — delta < 0 — so grants/top-ups/onboarding aren't here).
const SPEND_REASON_LABELS = {
  EMAIL_REVEAL: 'Email reveal',
  EXTENSION_REVEAL: 'Extension reveal (LinkedIn)',
  COMPANY_VIEW: 'Company view',
  CSV_EXPORT: 'CSV export',
  SEQUENCE_ENROLLMENT: 'Sequence enrollment',
};

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PENDING_INVITES = 20;

function inviteUrl(inviteId) {
  return `${env.CORS_ORIGIN}/accept-invite?token=${signInviteToken(inviteId)}`;
}

function serializeInvite(invite) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    invitedBy: invite.invitedBy
      ? { id: invite.invitedBy.id, name: invite.invitedBy.name }
      : undefined,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    // The same link the email carries — surfaced in Settings so an admin can
    // hand it over directly (chat, etc.), and the only delivery path that
    // works until a sending domain is verified in Resend (TODO.md P0).
    inviteUrl: inviteUrl(invite.id),
  };
}

/** Pending (unaccepted, unexpired) invites for Settings → Users & teams. */
export async function listInvites(workspaceId) {
  const invites = await prisma.workspaceInvite.findMany({
    where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
    include: { invitedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return invites.map(serializeInvite);
}

export async function createInvite(workspaceId, invitedById, { email, role }) {
  // Seat gate first ("block invites over the paid count"): a pending invite
  // reserves a seat, so members + pending is what's compared. Re-inviting an
  // already-invited address doesn't consume another seat and stays allowed.
  const usage = await seatUsage(workspaceId);
  const alreadyInvited = await prisma.workspaceInvite.findUnique({
    where: { workspaceId_email: { workspaceId, email } },
  });
  const reInviting = Boolean(alreadyInvited && !alreadyInvited.acceptedAt);
  if (!reInviting && usage.used >= usage.total) {
    throw new ApiError(
      422,
      usage.plan === 'FREE' && usage.total === 1
        ? 'The Free plan includes 1 seat — upgrade from Billing to invite teammates'
        : `All ${usage.total} seats are in use — revoke a pending invite, or upgrade your plan for more seats`,
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { where: { workspaceId } } },
  });
  if (existingUser?.memberships.length) {
    throw new ApiError(409, 'That person is already a member of this workspace');
  }

  const pendingCount = await prisma.workspaceInvite.count({
    where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (pendingCount >= MAX_PENDING_INVITES) {
    throw new ApiError(422, `A workspace can have at most ${MAX_PENDING_INVITES} pending invites`);
  }

  // Re-inviting the same address refreshes the row (new role/expiry, fresh
  // single-use state) rather than erroring — resending is the common case.
  const invite = await prisma.workspaceInvite.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    update: {
      role,
      invitedById,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      acceptedAt: null,
      createdAt: new Date(),
    },
    create: {
      workspaceId,
      email,
      role,
      invitedById,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
    include: {
      invitedBy: { select: { id: true, name: true } },
      workspace: { select: { name: true } },
    },
  });

  await notificationService.sendWorkspaceInvite({
    email,
    inviterName: invite.invitedBy.name,
    workspaceName: invite.workspace.name,
    role,
    token: signInviteToken(invite.id),
  });

  return serializeInvite(invite);
}

/** Revoke = delete: the emailed link dies with the row. 404 for another workspace's id. */
export async function revokeInvite(workspaceId, inviteId) {
  const { count } = await prisma.workspaceInvite.deleteMany({
    where: { id: inviteId, workspaceId },
  });
  if (count === 0) throw new ApiError(404, 'Invite not found');
}

/** members + pending invites vs. the paid seat count — the invite gate's arithmetic. */
export async function seatUsage(workspaceId) {
  const [workspace, members, pendingInvites] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { seats: true, plan: true } }),
    prisma.membership.count({ where: { workspaceId } }),
    prisma.workspaceInvite.count({
      where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);
  return {
    total: workspace.seats,
    plan: workspace.plan,
    members,
    pendingInvites,
    used: members + pendingInvites,
  };
}

/** Everyone with a seat in this workspace, owner first, then by join date. */
export async function listMembers(workspaceId) {
  const memberships = await prisma.membership.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const rank = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
  return memberships
    .map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.createdAt,
      user: m.user,
    }))
    .sort((a, b) => rank[a.role] - rank[b.role] || a.joinedAt - b.joinedAt);
}

function serializeProfile(w) {
  return { id: w.id, name: w.name, plan: w.plan, motto: w.motto ?? null, logoUrl: w.logoUrl ?? null };
}

/** Branding for Settings → Workspace (name, motto, logo). Free on every plan. */
export async function getWorkspaceProfile(workspaceId) {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new ApiError(404, 'Workspace not found');
  return serializeProfile(workspace);
}

/** Update name + motto. `motto` null/empty clears it. */
export async function updateWorkspace(workspaceId, { name, motto }) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name, motto: motto ? motto : null },
  });
  return serializeProfile(workspace);
}

// Stores the uploaded image inline as a data: URI (see uploadImage.js for
// the size/type caps). Kept off the session/auth-me payloads — only the
// workspace-profile and members endpoints return it.
export async function setLogo(workspaceId, { buffer, mimetype }) {
  const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`;
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { logoUrl: dataUri },
  });
  return serializeProfile(workspace);
}

export async function clearLogo(workspaceId) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { logoUrl: null },
  });
  return serializeProfile(workspace);
}

/**
 * Change a teammate's role between MEMBER ("teammate") and ADMIN. The OWNER
 * is protected — ownership stays with whoever created the workspace until a
 * real transfer flow exists — so the owner can neither be demoted nor be the
 * target's new role. Note: the change takes effect on the member's next
 * access-token refresh (role is a token claim, ≤15 min), not instantly.
 */
export async function changeMemberRole(workspaceId, targetUserId, role) {
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
  });
  if (!membership) throw new ApiError(404, 'That person is not a member of this workspace');
  if (membership.role === 'OWNER') {
    throw new ApiError(409, 'The workspace owner’s role can’t be changed');
  }

  const updated = await prisma.membership.update({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
  });
  return { id: updated.id, role: updated.role, joinedAt: updated.createdAt, user: updated.user };
}

/**
 * Per-teammate credit-usage summary for the admin "team audit". Sums every
 * spend (delta < 0) by the attributed teammate (spentById), broken down by
 * reason. Every current member appears (even zero-spend ones); spends with no
 * attribution — old rows this feature predates, or a member who has since
 * left — are pooled under `unattributed`.
 */
export async function teamAudit(workspaceId) {
  const [members, entries] = await Promise.all([
    listMembers(workspaceId),
    prisma.creditLedgerEntry.findMany({
      where: { workspaceId, delta: { lt: 0 } },
      select: { delta: true, reason: true, spentById: true },
    }),
  ]);

  const byUser = new Map();
  for (const m of members) {
    byUser.set(m.user.id, {
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      totalSpent: 0,
      actionCount: 0,
      byReason: {},
    });
  }
  const unattributed = { totalSpent: 0, actionCount: 0 };
  let totalSpent = 0;

  for (const e of entries) {
    const amount = -e.delta;
    totalSpent += amount;
    const bucket = e.spentById ? byUser.get(e.spentById) : null;
    if (bucket) {
      bucket.totalSpent += amount;
      bucket.actionCount += 1;
      bucket.byReason[e.reason] = (bucket.byReason[e.reason] ?? 0) + amount;
    } else {
      unattributed.totalSpent += amount;
      unattributed.actionCount += 1;
    }
  }

  return {
    members: [...byUser.values()].sort((a, b) => b.totalSpent - a.totalSpent),
    unattributed,
    totalSpent,
    reasonLabels: SPEND_REASON_LABELS,
  };
}

/** One CSV row per spend — the downloadable "download audit of all team". */
export async function teamAuditCsv(workspaceId) {
  const entries = await prisma.creditLedgerEntry.findMany({
    where: { workspaceId, delta: { lt: 0 } },
    orderBy: { createdAt: 'desc' },
    select: { delta: true, reason: true, spentById: true, contactId: true, createdAt: true },
  });

  const userIds = [...new Set(entries.map((e) => e.spentById).filter(Boolean))];
  const contactIds = [...new Set(entries.map((e) => e.contactId).filter(Boolean))];
  const [users, contacts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
    prisma.contact.findMany({
      where: { id: { in: contactIds } },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const contactMap = new Map(contacts.map((c) => [c.id, `${c.firstName} ${c.lastName}`.trim()]));

  const rows = entries.map((e) => {
    const u = e.spentById ? userMap.get(e.spentById) : null;
    return {
      date: e.createdAt.toISOString(),
      member: u ? u.name : e.spentById ? '(former teammate)' : '(unattributed)',
      email: u ? u.email : '',
      action: SPEND_REASON_LABELS[e.reason] ?? e.reason,
      credits: -e.delta,
      detail: e.contactId ? contactMap.get(e.contactId) ?? '' : '',
    };
  });

  return toCsv(rows, [
    { header: 'Date', value: (r) => r.date },
    { header: 'Member', value: (r) => r.member },
    { header: 'Email', value: (r) => r.email },
    { header: 'Action', value: (r) => r.action },
    { header: 'Credits', value: (r) => r.credits },
    { header: 'Detail', value: (r) => r.detail },
  ]);
}

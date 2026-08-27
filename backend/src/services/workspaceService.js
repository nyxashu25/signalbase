import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';
import { signInviteToken } from './tokenService.js';
import * as notificationService from './notificationService.js';

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
        : `All ${usage.total} seats are in use — revoke a pending invite or add seats from Billing`,
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

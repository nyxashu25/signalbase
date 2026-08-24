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

export async function renameWorkspace(workspaceId, name) {
  const workspace = await prisma.workspace.update({ where: { id: workspaceId }, data: { name } });
  if (!workspace) throw new ApiError(404, 'Workspace not found');
  return { id: workspace.id, name: workspace.name, plan: workspace.plan };
}

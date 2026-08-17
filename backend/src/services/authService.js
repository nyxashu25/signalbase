import { prisma } from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { initializeBalance } from './creditService.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  ReplayDetectedError,
} from './tokenService.js';
import { ApiError } from '../middleware/errorHandler.js';

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 8)
  );
}

export async function register({ email, password, name, orgName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);

  const { user, workspace, membership, org } = await prisma.$transaction(async (tx) => {
    const org = await tx.org.create({ data: { name: orgName, slug: slugify(orgName) } });
    const workspace = await tx.workspace.create({
      data: { orgId: org.id, name: `${orgName} Workspace` },
    });
    const user = await tx.user.create({ data: { email, passwordHash, name } });
    const membership = await tx.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
    });
    return { user, workspace, membership, org };
  });

  // Redis isn't part of the Postgres transaction above — this runs
  // immediately after commit, so there's a brief window where the
  // workspace exists without a credit balance yet. Acceptable for MVP;
  // reserveCredit fails closed (missing balance = 0 available) in that gap.
  await initializeBalance(workspace.id, workspace.monthlyCreditGrant);

  return issueSession({
    userId: user.id,
    workspaceId: workspace.id,
    orgId: org.id,
    role: membership.role,
    user,
    workspace,
  });
}

export async function login({ email, password, workspaceId }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { workspace: true }, orderBy: { createdAt: 'asc' } } },
  });

  // Same generic error whether the email doesn't exist or the password is
  // wrong — distinguishing them lets an attacker enumerate registered emails.
  const invalid = () => new ApiError(401, 'Invalid email or password');
  if (!user) throw invalid();
  if (!(await verifyPassword(user.passwordHash, password))) throw invalid();

  const membership = workspaceId
    ? user.memberships.find((m) => m.workspaceId === workspaceId)
    : user.memberships[0];

  if (!membership) {
    throw new ApiError(403, 'This account has no access to that workspace');
  }

  return issueSession({
    userId: user.id,
    workspaceId: membership.workspaceId,
    orgId: membership.workspace.orgId,
    role: membership.role,
    user,
    workspace: membership.workspace,
  });
}

export async function refresh(cookieValue) {
  let result;
  try {
    result = await rotateRefreshToken(cookieValue);
  } catch (err) {
    if (err instanceof ReplayDetectedError) {
      throw new ApiError(401, 'Session revoked — please log in again');
    }
    throw err;
  }

  if (!result) {
    throw new ApiError(401, 'Refresh token missing, expired, or already used');
  }

  // Re-read the membership so a role change (or removal) since the last
  // login takes effect immediately on refresh, not just at next login.
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: result.userId, workspaceId: result.workspaceId } },
    include: { workspace: true },
  });

  if (!membership) {
    throw new ApiError(403, 'This account no longer has access to that workspace');
  }

  const accessToken = signAccessToken({
    userId: result.userId,
    workspaceId: membership.workspaceId,
    orgId: membership.workspace.orgId,
    role: membership.role,
  });

  return { accessToken, refreshCookieValue: result.cookieValue };
}

export async function logout(cookieValue) {
  await revokeRefreshToken(cookieValue);
}

export async function getCurrentUser({ userId, workspaceId }) {
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { user: true, workspace: true },
  });

  if (!membership) throw new ApiError(401, 'Session no longer valid');

  return {
    user: { id: membership.user.id, email: membership.user.email, name: membership.user.name },
    workspace: { id: membership.workspace.id, name: membership.workspace.name },
    role: membership.role,
  };
}

async function issueSession({ userId, workspaceId, orgId, role, user, workspace }) {
  const accessToken = signAccessToken({ userId, workspaceId, orgId, role });
  const { cookieValue } = await issueRefreshToken({ userId, workspaceId });

  return {
    accessToken,
    refreshCookieValue: cookieValue,
    user: { id: user.id, email: user.email, name: user.name },
    workspace: { id: workspace.id, name: workspace.name },
    role,
  };
}

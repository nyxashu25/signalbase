import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { initializeBalance } from './creditService.js';
import { PLAN_MONTHLY_CREDITS } from '../config/planConfig.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  ReplayDetectedError,
} from './tokenService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

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

/**
 * Creates a brand-new org + FREE workspace + user + OWNER membership.
 * Shared by register() (password signup) and loginWithGoogle() (a Google
 * sign-in with no matching existing account) — passwordHash is null for
 * the latter, googleId is null for the former.
 */
async function createAccount({ email, name, passwordHash, googleId, orgName }) {
  const { user, workspace, membership, org } = await prisma.$transaction(async (tx) => {
    const org = await tx.org.create({ data: { name: orgName, slug: slugify(orgName) } });
    const workspace = await tx.workspace.create({
      data: {
        orgId: org.id,
        name: `${orgName} Workspace`,
        plan: 'FREE',
        monthlyCreditGrant: PLAN_MONTHLY_CREDITS.FREE,
      },
    });
    const user = await tx.user.create({ data: { email, passwordHash, googleId, name } });
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

  return { user, workspace, membership, org };
}

export async function register({ email, password, name, orgName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const { user, workspace, membership, org } = await createAccount({
    email,
    name,
    passwordHash,
    googleId: null,
    orgName,
  });

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
  // Checked after password verification (not before) so a suspended
  // account's error message never doubles as a way to test whether a
  // guessed password was actually correct.
  if (user.suspendedAt) throw new ApiError(403, 'This account has been suspended');

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

// Verifies the signature, audience, and expiry of a Google Identity
// Services ID token and returns its payload. Split out as a default so
// tests can inject a fake verifier (same pattern as stripeService's
// makeClient) — actually exchanging a live Google-signed token isn't
// practical in a test suite.
async function verifyGoogleIdToken(idToken) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new ApiError(503, 'Google sign-in is not configured');
  }
  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  return ticket.getPayload();
}

/**
 * Signs in with a Google Identity Services ID token, linking or creating an
 * account as needed:
 *   - googleId already on file -> sign in as that user.
 *   - no googleId match, but an existing account shares the verified email
 *     -> link googleId onto it (lets a password user add Google sign-in).
 *   - neither -> create a brand-new account, same shape as register().
 */
export async function loginWithGoogle(credential, verify = verifyGoogleIdToken) {
  let payload;
  try {
    payload = await verify(credential);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'Invalid Google credential');
  }

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new ApiError(401, 'Invalid or unverified Google account');
  }

  const email = payload.email.toLowerCase();
  const googleId = payload.sub;
  const name = payload.name || email;
  const include = {
    memberships: { include: { workspace: true }, orderBy: { createdAt: 'asc' } },
  };

  let user = await prisma.user.findUnique({ where: { googleId }, include });
  if (!user) {
    const existing = await prisma.user.findUnique({ where: { email }, include });
    if (existing) {
      user = await prisma.user.update({ where: { id: existing.id }, data: { googleId }, include });
    }
  }

  let workspace, membership, orgId;
  if (user) {
    if (user.suspendedAt) throw new ApiError(403, 'This account has been suspended');
    membership = user.memberships[0];
    if (!membership) throw new ApiError(403, 'This account has no access to that workspace');
    workspace = membership.workspace;
    orgId = workspace.orgId;
  } else {
    const created = await createAccount({
      email,
      name,
      passwordHash: null,
      googleId,
      orgName: `${name}'s Workspace`,
    });
    user = created.user;
    workspace = created.workspace;
    membership = created.membership;
    orgId = created.org.id;
  }

  return issueSession({
    userId: user.id,
    workspaceId: workspace.id,
    orgId,
    role: membership.role,
    user,
    workspace,
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
    include: { workspace: true, user: true },
  });

  if (!membership) {
    throw new ApiError(403, 'This account no longer has access to that workspace');
  }
  // A suspension applied mid-session is caught here rather than only at the
  // next login — the access token this issues has a short TTL, so a
  // suspended user's session dies within one refresh cycle, not 30 days.
  if (membership.user.suspendedAt) {
    throw new ApiError(403, 'This account has been suspended');
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
    user: {
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      tutorialCompletedAt: membership.user.tutorialCompletedAt,
    },
    workspace: { id: membership.workspace.id, name: membership.workspace.name },
    role: membership.role,
  };
}

/** Marks the guided first-login tour finished or skipped — never shown again. */
export async function completeTutorial(userId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { tutorialCompletedAt: new Date() },
  });
  return { tutorialCompletedAt: user.tutorialCompletedAt };
}

async function issueSession({ userId, workspaceId, orgId, role, user, workspace }) {
  const accessToken = signAccessToken({ userId, workspaceId, orgId, role });
  const { cookieValue } = await issueRefreshToken({ userId, workspaceId });

  return {
    accessToken,
    refreshCookieValue: cookieValue,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      tutorialCompletedAt: user.tutorialCompletedAt ?? null,
    },
    workspace: { id: workspace.id, name: workspace.name },
    role,
  };
}

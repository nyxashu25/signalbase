import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { initializeBalance } from './creditService.js';
import { PLAN_MONTHLY_CREDITS } from '../config/planConfig.js';
import { createHash } from 'node:crypto';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  signEmailVerificationToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
  verifyInviteToken,
  verifyEmailVerificationToken,
  ReplayDetectedError,
} from './tokenService.js';
import * as notificationService from './notificationService.js';
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
async function createAccount({ email, name, passwordHash, googleId, orgName, emailVerified }) {
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
    const user = await tx.user.create({
      data: { email, passwordHash, googleId, name, emailVerified },
    });
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

/**
 * Creates the account in an unverified state and emails a confirm link —
 * does NOT log the user in. Login only starts once verifyEmail below runs,
 * whether that's from the confirm link or (idempotently) a repeat click.
 */
export async function register({ email, password, name, orgName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const { user } = await createAccount({
    email,
    name,
    passwordHash,
    googleId: null,
    orgName,
    emailVerified: false,
  });

  const token = signEmailVerificationToken(user.id);
  await notificationService.sendEmailVerification(user, token);

  return { pendingVerification: true, email: user.email };
}

/**
 * Verifies the confirm-link token, flips emailVerified, fires the
 * welcome/admin-alert emails (once — no-ops if the account was already
 * verified, e.g. a double-click), then logs the user in exactly like
 * register() used to.
 */
export async function verifyEmail(token) {
  let payload;
  try {
    payload = verifyEmailVerificationToken(token);
  } catch {
    throw new ApiError(400, 'Invalid or expired verification link');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { memberships: { include: { workspace: true }, orderBy: { createdAt: 'asc' } } },
  });
  if (!user) throw new ApiError(400, 'Invalid or expired verification link');

  const membership = user.memberships[0];
  if (!membership) throw new ApiError(409, 'This account has no workspace membership');
  const workspace = membership.workspace;

  if (!user.emailVerified) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    await notificationService.notifyAccountVerified(user, workspace);
  }

  return issueSession({
    userId: user.id,
    workspaceId: workspace.id,
    orgId: workspace.orgId,
    role: membership.role,
    user,
    workspace,
  });
}

/**
 * Fingerprint of the current password hash, baked into every reset token —
 * the moment the password changes, all outstanding reset links die. 'none'
 * covers Google-only accounts, which may use this flow to set a first
 * password (possession of the inbox is the same proof signup used).
 */
function passwordFingerprint(passwordHash) {
  return createHash('sha256').update(passwordHash ?? 'none').digest('hex').slice(0, 16);
}

/** Enumeration-safe: always {sent:true}, whether or not the email exists. */
export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.suspendedAt) {
    const token = signPasswordResetToken(user.id, passwordFingerprint(user.passwordHash));
    await notificationService.sendPasswordReset(user, token);
  }
  return { sent: true };
}

export async function resetPassword(token, newPassword) {
  const invalid = () => new ApiError(400, 'Invalid or expired reset link — request a new one');
  let payload;
  try {
    payload = verifyPasswordResetToken(token);
  } catch {
    throw invalid();
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.suspendedAt) throw invalid();
  // Single-use: the fingerprint stops matching as soon as the password
  // changes (including via this very endpoint).
  if (payload.pwfp !== passwordFingerprint(user.passwordHash)) throw invalid();

  const passwordHash = await hashPassword(newPassword);
  // Proving control of the inbox is exactly what email verification proves —
  // a reset from an unverified account also verifies it.
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, emailVerified: true },
  });
  return { reset: true };
}

/** Silently no-ops for an unknown or already-verified email — never reveals which. */
export async function resendVerificationEmail(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified) {
    const token = signEmailVerificationToken(user.id);
    await notificationService.sendEmailVerification(user, token);
  }
  return { sent: true };
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
  // Checked after password verification (not before) so a suspended/
  // unverified account's error message never doubles as a way to test
  // whether a guessed password was actually correct.
  if (user.suspendedAt) throw new ApiError(403, 'This account has been suspended');
  if (!user.emailVerified) {
    throw new ApiError(403, 'Please verify your email address before signing in');
  }

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
      // The Google credential itself just proved ownership of this email
      // (payload.email_verified was already checked above) — linking it
      // onto a still-unverified password account satisfies the same bar
      // register()'s confirm-link exists to enforce, so mark it verified
      // too rather than leaving password sign-in permanently blocked.
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { googleId, emailVerified: true },
        include,
      });
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
      // Google already verified this email — no confirm-link step needed.
      emailVerified: true,
    });
    user = created.user;
    workspace = created.workspace;
    membership = created.membership;
    orgId = created.org.id;
    await notificationService.notifyAccountVerified(user, workspace);
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

async function loadPendingInvite(token) {
  const invalid = () => new ApiError(400, 'Invalid or expired invite link');
  let payload;
  try {
    payload = verifyInviteToken(token);
  } catch {
    throw invalid();
  }
  const invite = await prisma.workspaceInvite.findUnique({
    where: { id: payload.sub },
    include: { workspace: true, invitedBy: { select: { id: true, name: true, email: true } } },
  });
  // A deleted row is a revoked invite; acceptedAt makes the link single-use.
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) throw invalid();
  return invite;
}

/** What the public accept page shows before the user commits. */
export async function getInviteInfo(token) {
  const invite = await loadPendingInvite(token);
  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  return {
    email: invite.email,
    role: invite.role,
    workspaceName: invite.workspace.name,
    inviterName: invite.invitedBy.name,
    accountExists: Boolean(existing),
    expiresAt: invite.expiresAt,
  };
}

/**
 * Accepts an invite. Possession of the emailed link proves control of the
 * invited address (the same proof signup's confirm link relies on), so:
 *   - no account with that email yet -> `name` + `password` are required and
 *     a User is created (emailVerified: true) with a Membership in the
 *     inviting workspace — never a new org/workspace.
 *   - account exists -> a Membership is added (idempotent if already a
 *     member) and, since the link proves the inbox, emailVerified is set.
 * Either way the session issued is scoped to the inviting workspace.
 */
export async function acceptInvite(token, { name, password } = {}) {
  const invite = await loadPendingInvite(token);
  const workspace = invite.workspace;

  let user = await prisma.user.findUnique({ where: { email: invite.email } });
  if (user?.suspendedAt) throw new ApiError(403, 'This account has been suspended');

  if (!user) {
    if (!name || !password) {
      throw new ApiError(400, 'Name and password are required to create your account');
    }
    const passwordHash = await hashPassword(password);
    user = await prisma.user.create({
      data: { email: invite.email, name, passwordHash, emailVerified: true },
    });
  } else if (!user.emailVerified) {
    user = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  }

  const membership = await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: user.id, workspaceId: workspace.id, role: invite.role },
  });

  await prisma.workspaceInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });
  await notificationService.notifyInviteAccepted(invite.invitedBy, user, workspace);

  return issueSession({
    userId: user.id,
    workspaceId: workspace.id,
    orgId: workspace.orgId,
    role: membership.role,
    user,
    workspace,
  });
}

/** Every workspace this user has a seat in — drives the switcher in ProfileMenu. */
export async function listMyWorkspaces({ userId, workspaceId }) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { workspace: { select: { id: true, name: true, plan: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    plan: m.workspace.plan,
    role: m.role,
    current: m.workspaceId === workspaceId,
  }));
}

/** Re-issues the session scoped to another workspace the user belongs to. */
export async function switchWorkspace(userId, workspaceId) {
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { workspace: true, user: true },
  });
  if (!membership) throw new ApiError(403, 'This account has no access to that workspace');
  return issueSession({
    userId,
    workspaceId,
    orgId: membership.workspace.orgId,
    role: membership.role,
    user: membership.user,
    workspace: membership.workspace,
  });
}

export async function getCurrentUser({ userId, workspaceId }) {
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { user: true, workspace: true },
  });

  if (!membership) throw new ApiError(401, 'Session no longer valid');

  return {
    user: serializeUser(membership.user),
    workspace: {
      id: membership.workspace.id,
      name: membership.workspace.name,
      plan: membership.workspace.plan,
      createdAt: membership.workspace.createdAt,
    },
    role: membership.role,
  };
}

// What /auth/me and the settings routes hand back about the signed-in user.
// `hasPassword`/`googleLinked` drive the Security settings page — a Google-
// only account sets its first password without a "current" one.
function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tutorialCompletedAt: user.tutorialCompletedAt,
    emailVerified: user.emailVerified,
    marketingOptOut: user.marketingOptOut,
    hasPassword: Boolean(user.passwordHash),
    googleLinked: Boolean(user.googleId),
    createdAt: user.createdAt,
  };
}

export async function updateProfile(userId, { name }) {
  const user = await prisma.user.update({ where: { id: userId }, data: { name } });
  return { user: serializeUser(user) };
}

export async function updatePreferences(userId, { marketingOptOut }) {
  const user = await prisma.user.update({ where: { id: userId }, data: { marketingOptOut } });
  return { user: serializeUser(user) };
}

/**
 * Sets a new password. An account that already has one must prove the
 * current one; a Google-only account (no hash) may set its first password
 * with nothing more than its live session — it's already authenticated, and
 * this is how it gains a second way in.
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(401, 'Session no longer valid');
  if (user.passwordHash) {
    if (!currentPassword || !(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new ApiError(400, 'Current password is incorrect');
    }
  }
  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { user: serializeUser(updated) };
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

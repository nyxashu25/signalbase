import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';

const REFRESH_KEY_PREFIX = 'refresh:active:';

export function signAccessToken({ userId, workspaceId, orgId, role }) {
  return jwt.sign({ sub: userId, workspaceId, orgId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token) {
  // Throws on expiry/invalid signature/malformed token — callers treat any
  // throw as "not authenticated", never partially trust the payload.
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Issues a new refresh token "family". The cookie value is `${familyId}.${tokenId}`;
 * Redis holds only the current valid tokenId per family, so rotation is a
 * single key overwrite and reuse of a stale tokenId is detectable.
 */
export async function issueRefreshToken({ userId, workspaceId }) {
  const familyId = randomUUID();
  const tokenId = randomUUID();

  await redis.set(
    REFRESH_KEY_PREFIX + familyId,
    JSON.stringify({ tokenId, userId, workspaceId }),
    'EX',
    env.REFRESH_TOKEN_TTL_SECONDS,
  );

  return { cookieValue: `${familyId}.${tokenId}` };
}

/**
 * Validates + rotates a refresh token. Returns the new cookie value and the
 * session claims on success. Returns null if the token is expired/unknown.
 * Throws ReplayDetectedError if a previously-rotated-away token is replayed —
 * callers must revoke the family and force re-authentication.
 */
export async function rotateRefreshToken(cookieValue) {
  const [familyId, presentedTokenId] = String(cookieValue ?? '').split('.');
  if (!familyId || !presentedTokenId) return null;

  const key = REFRESH_KEY_PREFIX + familyId;
  const raw = await redis.get(key);
  if (!raw) return null;

  const stored = JSON.parse(raw);
  if (stored.tokenId !== presentedTokenId) {
    // The presented token doesn't match the current one for this family —
    // either it was already rotated away (replay) or is forged. Either way,
    // kill the whole family rather than silently rejecting just this call.
    await redis.del(key);
    throw new ReplayDetectedError();
  }

  const newTokenId = randomUUID();
  await redis.set(
    key,
    JSON.stringify({ tokenId: newTokenId, userId: stored.userId, workspaceId: stored.workspaceId }),
    'EX',
    env.REFRESH_TOKEN_TTL_SECONDS,
  );

  return {
    cookieValue: `${familyId}.${newTokenId}`,
    userId: stored.userId,
    workspaceId: stored.workspaceId,
  };
}

export async function revokeRefreshToken(cookieValue) {
  const [familyId] = String(cookieValue ?? '').split('.');
  if (!familyId) return;
  await redis.del(REFRESH_KEY_PREFIX + familyId);
}

export class ReplayDetectedError extends Error {
  constructor() {
    super('Refresh token reuse detected');
  }
}

const EMAIL_VERIFY_PURPOSE = 'verify-email';
const EMAIL_VERIFY_TTL_SECONDS = 24 * 60 * 60;
const UNSUBSCRIBE_PURPOSE = 'unsubscribe';

/**
 * Stateless (no Redis/DB row) tokens for the two public, unauthenticated
 * links this app emails out — the `purpose` claim keeps one from being
 * replayed as the other, and neither can be replayed as a real access token
 * since signAccessToken never sets `purpose`.
 */
export function signEmailVerificationToken(userId) {
  return jwt.sign({ sub: userId, purpose: EMAIL_VERIFY_PURPOSE }, env.JWT_ACCESS_SECRET, {
    expiresIn: EMAIL_VERIFY_TTL_SECONDS,
  });
}

export function verifyEmailVerificationToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (payload.purpose !== EMAIL_VERIFY_PURPOSE) throw new Error('Wrong token purpose');
  return payload;
}

// No expiry — an unsubscribe link that stops working is worse than one that
// works forever; the only thing it can do is flip one user's marketingOptOut.
export function signUnsubscribeToken(userId) {
  return jwt.sign({ sub: userId, purpose: UNSUBSCRIBE_PURPOSE }, env.JWT_ACCESS_SECRET);
}

export function verifyUnsubscribeToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (payload.purpose !== UNSUBSCRIBE_PURPOSE) throw new Error('Wrong token purpose');
  return payload;
}

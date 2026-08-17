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

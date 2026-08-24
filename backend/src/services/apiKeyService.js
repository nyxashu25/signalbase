import { randomBytes } from 'node:crypto';
import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

// Full key: dpk_ + 40 hex chars (20 random bytes). The first 12 characters
// (dpk_ + 8 hex) double as the plaintext lookup prefix — enough entropy
// (32 bits) that collisions are practically impossible at any realistic key
// count, and short enough to show in the UI as the key's identity.
const KEY_BYTES = 20;
const PREFIX_LENGTH = 12;
const MAX_KEYS_PER_USER = 10;

// How stale lastUsedAt may get before a request refreshes it — writing it on
// every call would turn each extension lookup into an extra row update.
const LAST_USED_REFRESH_MS = 5 * 60 * 1000;

function serialize(key) {
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
  };
}

export async function listApiKeys(userId) {
  const keys = await prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  return keys.map(serialize);
}

/** Returns the serialized row PLUS `key` — the only time the full key exists in a response. */
export async function createApiKey(userId, name) {
  const activeCount = await prisma.apiKey.count({ where: { userId, revokedAt: null } });
  if (activeCount >= MAX_KEYS_PER_USER) {
    throw new ApiError(422, `You can hold at most ${MAX_KEYS_PER_USER} active API keys — revoke one first`);
  }

  const fullKey = `dpk_${randomBytes(KEY_BYTES).toString('hex')}`;
  const created = await prisma.apiKey.create({
    data: {
      userId,
      name,
      prefix: fullKey.slice(0, PREFIX_LENGTH),
      // argon2, same as passwords — a DB leak must not leak usable keys.
      keyHash: await hashPassword(fullKey),
    },
  });

  return { ...serialize(created), key: fullKey };
}

export async function revokeApiKey(userId, keyId) {
  // updateMany so the userId scope is part of the write itself — a user can
  // never revoke (or probe the existence of) someone else's key.
  const { count } = await prisma.apiKey.updateMany({
    where: { id: keyId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw new ApiError(404, 'API key not found');
  return { revoked: true };
}

/**
 * Resolves a presented key to its (non-suspended) user + primary workspace,
 * or throws 401. One indexed prefix lookup, one argon2 verify — and the same
 * generic message for every failure mode so a probing client can't tell
 * "no such key" from "revoked" from "wrong secret".
 */
export async function authenticateApiKey(presentedKey) {
  const invalid = () => new ApiError(401, 'Invalid or revoked API key');
  if (typeof presentedKey !== 'string' || !presentedKey.startsWith('dpk_')) throw invalid();

  const row = await prisma.apiKey.findUnique({
    where: { prefix: presentedKey.slice(0, PREFIX_LENGTH) },
    include: {
      user: {
        include: {
          memberships: { include: { workspace: true }, orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });
  if (!row || row.revokedAt) throw invalid();
  if (!(await verifyPassword(row.keyHash, presentedKey))) throw invalid();

  const { user } = row;
  // Suspension must cut off API keys exactly like it cuts off login/refresh.
  if (user.suspendedAt) throw new ApiError(403, 'This account has been suspended');
  const membership = user.memberships[0];
  if (!membership) throw new ApiError(409, 'This account has no workspace membership');

  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > LAST_USED_REFRESH_MS) {
    // Best-effort bookkeeping — a failure here must never fail the request.
    prisma.apiKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
  }

  return {
    userId: user.id,
    workspaceId: membership.workspaceId,
    orgId: membership.workspace.orgId,
    role: membership.role,
  };
}

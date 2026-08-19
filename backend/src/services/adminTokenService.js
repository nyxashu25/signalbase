import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const AUDIENCE = 'superadmin';

export function signAdminToken({ adminId }) {
  return jwt.sign({ sub: adminId, aud: AUDIENCE }, env.ADMIN_JWT_SECRET, {
    expiresIn: env.ADMIN_ACCESS_TOKEN_TTL_SECONDS,
  });
}

/**
 * Throws on expiry/invalid signature/wrong audience — a tenant access token
 * (signed with a different secret entirely) fails at signature verification
 * before the audience check is even reached.
 */
export function verifyAdminToken(token) {
  return jwt.verify(token, env.ADMIN_JWT_SECRET, { audience: AUDIENCE });
}

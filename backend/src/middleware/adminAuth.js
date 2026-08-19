import { verifyAdminToken } from '../services/adminTokenService.js';
import { ApiError } from './errorHandler.js';

/**
 * Verifies an admin access token and attaches `req.superAdmin = { adminId }`.
 * Signed with ADMIN_JWT_SECRET (never JWT_ACCESS_SECRET) — a tenant access
 * token fails signature verification here regardless of any claim it carries.
 */
export function requireSuperAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyAdminToken(header.slice('Bearer '.length));
    req.superAdmin = { adminId: payload.sub };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired admin access token'));
  }
}

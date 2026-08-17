import { ApiError } from './errorHandler.js';

const RANK = { MEMBER: 0, ADMIN: 1, OWNER: 2 };

/**
 * Requires req.auth.role to be at least `minRole` (OWNER > ADMIN > MEMBER).
 * Must run after requireAuth. Role is scoped to the workspace embedded in
 * the access token — a user who is OWNER in workspace A is not implicitly
 * anything in workspace B.
 */
export function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new ApiError(401, 'requireRole used without requireAuth'));
    }
    if (RANK[req.auth.role] === undefined) {
      return next(new ApiError(403, 'Unknown role'));
    }
    if (RANK[req.auth.role] < RANK[minRole]) {
      return next(new ApiError(403, `Requires ${minRole} role or higher`));
    }
    next();
  };
}

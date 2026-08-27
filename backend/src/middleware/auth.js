import { verifyAccessToken } from '../services/tokenService.js';
import { ApiError } from './errorHandler.js';
import { assertWorkspaceActive } from './workspaceGuard.js';

/**
 * Verifies the access token and attaches `req.auth = { userId, workspaceId, orgId, role }`.
 * Every tenant-scoped route MUST read workspaceId from req.auth — never from
 * a request body/query param — or a caller could pass an arbitrary
 * workspaceId and read another org's data.
 *
 * Token verification itself stays a pure JWT check; the one added await is
 * the workspace lifecycle guard, which is an in-process 30s cache in the
 * steady state (see middleware/workspaceGuard.js) — an admin suspending or
 * deleting a workspace cuts its members off within seconds, not at the next
 * token refresh.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  let payload;
  try {
    payload = verifyAccessToken(header.slice('Bearer '.length));
  } catch {
    return next(new ApiError(401, 'Invalid or expired access token'));
  }

  try {
    await assertWorkspaceActive(payload.workspaceId);
  } catch (err) {
    return next(err);
  }

  req.auth = {
    userId: payload.sub,
    workspaceId: payload.workspaceId,
    orgId: payload.orgId,
    role: payload.role,
  };
  next();
}

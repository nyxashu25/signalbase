import { verifyAccessToken } from '../services/tokenService.js';
import { ApiError } from './errorHandler.js';

/**
 * Verifies the access token and attaches `req.auth = { userId, workspaceId, orgId, role }`.
 * Every tenant-scoped route MUST read workspaceId from req.auth — never from
 * a request body/query param — or a caller could pass an arbitrary
 * workspaceId and read another org's data.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.auth = {
      userId: payload.sub,
      workspaceId: payload.workspaceId,
      orgId: payload.orgId,
      role: payload.role,
    };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired access token'));
  }
}

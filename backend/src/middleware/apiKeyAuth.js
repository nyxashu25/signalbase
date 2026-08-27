import { authenticateApiKey } from '../services/apiKeyService.js';
import { ApiError } from './errorHandler.js';
import { assertWorkspaceActive } from './workspaceGuard.js';

/**
 * API-key twin of middleware/auth.js: authenticates `Authorization: Bearer
 * dpk_…` and attaches the exact same `req.auth = { userId, workspaceId,
 * orgId, role }` shape, so every downstream service and middleware
 * (reserveCredits, byWorkspace rate limiting, masking) works unchanged.
 * Used by the extension routes — a JWT presented here fails (no dpk_
 * prefix), and a dpk_ key presented to requireAuth fails JWT verification,
 * so the two credential spaces can't be crossed.
 */
export async function requireApiKey(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  try {
    const auth = await authenticateApiKey(header.slice('Bearer '.length));
    // Same workspace lifecycle guard as requireAuth — a suspended/deleted
    // workspace's API keys stop working within the guard's cache window.
    await assertWorkspaceActive(auth.workspaceId);
    req.auth = auth;
    next();
  } catch (err) {
    next(err);
  }
}

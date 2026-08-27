import { prisma } from '../config/db.js';
import { ApiError } from './errorHandler.js';

// Workspace-level lifecycle enforcement (admin suspend / soft delete).
// requireAuth deliberately does no DB reads — this check runs from there
// (and from apiKeyAuth) through a short in-process cache, so a suspended or
// deleted workspace is cut off within CACHE_TTL_MS on every request path,
// not just at the next token refresh, while the hot path stays one Map hit.
const CACHE_TTL_MS = 30_000;
const cache = new Map(); // workspaceId -> { state: 'active'|'suspended'|'deleted', at: ms }

export function invalidateWorkspaceGuardCache(workspaceId) {
  if (workspaceId) cache.delete(workspaceId);
  else cache.clear();
}

async function workspaceState(workspaceId) {
  const hit = cache.get(workspaceId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.state;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { suspendedAt: true, deletedAt: true },
  });
  // A missing workspace behaves as deleted — fail closed.
  const state = !workspace
    ? 'deleted'
    : workspace.deletedAt
      ? 'deleted'
      : workspace.suspendedAt
        ? 'suspended'
        : 'active';
  cache.set(workspaceId, { state, at: Date.now() });
  return state;
}

/** Throws 403 unless the workspace is active. */
export async function assertWorkspaceActive(workspaceId) {
  const state = await workspaceState(workspaceId);
  if (state === 'suspended') {
    throw new ApiError(403, 'This workspace has been suspended — contact support');
  }
  if (state === 'deleted') {
    throw new ApiError(403, 'This workspace has been deleted');
  }
}

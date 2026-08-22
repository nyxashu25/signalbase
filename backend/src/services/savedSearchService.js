import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

const MAX_PER_TYPE = 50;

function serialize(s) {
  return {
    id: s.id,
    type: s.type,
    name: s.name,
    filters: s.filters,
    createdAt: s.createdAt,
  };
}

// Workspace-scoped, like lists — a saved search is a shared shortcut for
// the team, not a private bookmark. Same "404 rather than 403 for another
// workspace's row" posture as listService so ids can't be probed.
export async function listSavedSearches(workspaceId, { type } = {}) {
  const rows = await prisma.savedSearch.findMany({
    where: { workspaceId, ...(type ? { type } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serialize);
}

export async function createSavedSearch(workspaceId, createdById, { type, name, filters }) {
  const count = await prisma.savedSearch.count({ where: { workspaceId, type } });
  if (count >= MAX_PER_TYPE) {
    throw new ApiError(400, `You can save up to ${MAX_PER_TYPE} ${type.toLowerCase()} searches`);
  }
  const row = await prisma.savedSearch.create({
    data: { workspaceId, createdById, type, name, filters },
  });
  return serialize(row);
}

export async function deleteSavedSearch(workspaceId, id) {
  const { count } = await prisma.savedSearch.deleteMany({ where: { id, workspaceId } });
  if (count === 0) throw new ApiError(404, 'Saved search not found');
}

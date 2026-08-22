import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

/** Everyone with a seat in this workspace, owner first, then by join date. */
export async function listMembers(workspaceId) {
  const memberships = await prisma.membership.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const rank = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
  return memberships
    .map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.createdAt,
      user: m.user,
    }))
    .sort((a, b) => rank[a.role] - rank[b.role] || a.joinedAt - b.joinedAt);
}

export async function renameWorkspace(workspaceId, name) {
  const workspace = await prisma.workspace.update({ where: { id: workspaceId }, data: { name } });
  if (!workspace) throw new ApiError(404, 'Workspace not found');
  return { id: workspace.id, name: workspace.name, plan: workspace.plan };
}

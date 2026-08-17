import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

// Every function takes workspaceId as an explicit parameter and folds it
// into the WHERE clause — never "fetch by id, then check ownership". A
// mismatched id simply doesn't match any row, which is what makes this
// return 404 instead of a distinguishable 403 (see lists.test.js).

export async function listLists(workspaceId) {
  return prisma.list.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  });
}

export async function createList(workspaceId, createdById, { name, type }) {
  return prisma.list.create({
    data: { workspaceId, createdById, name, type },
  });
}

export async function getList(workspaceId, listId) {
  const list = await prisma.list.findFirst({
    where: { id: listId, workspaceId },
    include: { items: true },
  });
  if (!list) throw new ApiError(404, 'List not found');
  return list;
}

export async function deleteList(workspaceId, listId) {
  // deleteMany (not delete) so a cross-tenant id affects zero rows instead
  // of Prisma throwing a "record not found" that could leak existence.
  const { count } = await prisma.list.deleteMany({ where: { id: listId, workspaceId } });
  if (count === 0) throw new ApiError(404, 'List not found');
}

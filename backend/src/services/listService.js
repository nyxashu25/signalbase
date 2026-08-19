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
    include: {
      items: {
        orderBy: { addedAt: 'desc' },
        include: {
          contact: { include: { company: true } },
          company: true,
        },
      },
    },
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

/**
 * Adds a contact or company to a list — exactly one of contactId/companyId,
 * and it must match the list's own type (a CONTACTS list can't hold a
 * company). Idempotent: adding the same item twice is a silent no-op
 * rather than a 409, since "make sure X is on this list" is the more
 * natural operation for a UI button to retry.
 */
export async function addItem(workspaceId, listId, { contactId, companyId }) {
  const list = await prisma.list.findFirst({ where: { id: listId, workspaceId } });
  if (!list) throw new ApiError(404, 'List not found');

  if (list.type === 'CONTACTS' && !contactId) {
    throw new ApiError(400, 'This is a contacts list — contactId is required');
  }
  if (list.type === 'COMPANIES' && !companyId) {
    throw new ApiError(400, 'This is a companies list — companyId is required');
  }

  try {
    return await prisma.listItem.create({
      data: { listId, contactId: contactId ?? null, companyId: companyId ?? null },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      // Already on the list — fetch and return the existing row instead of
      // erroring, matching the idempotent-add contract described above.
      return prisma.listItem.findFirst({
        where: { listId, contactId: contactId ?? null, companyId: companyId ?? null },
      });
    }
    throw err;
  }
}

export async function removeItem(workspaceId, listId, itemId) {
  // Scoped through a join on List so a cross-tenant listId/itemId pair
  // can't delete another workspace's item — same defense-in-depth as the
  // rest of this file, just expressed as a nested relation filter since
  // ListItem itself has no workspaceId column.
  const { count } = await prisma.listItem.deleteMany({
    where: { id: itemId, listId, list: { workspaceId } },
  });
  if (count === 0) throw new ApiError(404, 'List item not found');
}

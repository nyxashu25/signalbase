import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { recordAuditLog } from './adminService.js';
import { enqueueIndex } from './indexerService.js';

// Super-admin side of the Chrome-extension sourcing pipeline (see
// extensionService.js for how rows get here): "Pending peoples" is the
// MissingPerson queue, "Childs found" the LostChild queue. Both lists are
// worked newest-demand-first.

export async function listMissingPersons({ status, page, pageSize }) {
  const where = { status };
  const [total, rows] = await Promise.all([
    prisma.missingPerson.count({ where }),
    prisma.missingPerson.findMany({
      where,
      orderBy: { lastReportedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, missingPersons: rows };
}

export async function resolveMissingPerson(id, resolution, actorAdminId) {
  // Guarded update: only a PENDING row can be resolved, and losing a race
  // against another admin resolves to a clean 409, not a double audit entry.
  const { count } = await prisma.missingPerson.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: resolution },
  });
  if (count === 0) {
    const exists = await prisma.missingPerson.findUnique({ where: { id } });
    if (!exists) throw new ApiError(404, 'Missing-person entry not found');
    throw new ApiError(409, `Already resolved (${exists.status.toLowerCase()})`);
  }

  const row = await prisma.missingPerson.findUnique({ where: { id } });
  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'RESOLVE_MISSING_PERSON',
    metadata: { missingPersonId: id, linkedinSlug: row.linkedinSlug, resolution },
  });
  return row;
}

export async function listLostChildren({ status, page, pageSize }) {
  const where = { status };
  const [total, rows] = await Promise.all([
    prisma.lostChild.count({ where }),
    prisma.lostChild.findMany({
      where,
      orderBy: { lastReportedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            linkedinUrl: true,
            company: { select: { name: true, domain: true } },
          },
        },
      },
    }),
  ]);
  return { total, page, pageSize, lostChildren: rows };
}

export async function resolveLostChild(id, resolution, actorAdminId) {
  const row = await prisma.lostChild.findUnique({ where: { id } });
  if (!row) throw new ApiError(404, 'Lost-child entry not found');
  if (row.status !== 'PENDING') {
    throw new ApiError(409, `Already resolved (${row.status.toLowerCase()})`);
  }

  // Guarded PENDING -> resolved flip first: under two racing admins exactly
  // one wins, the other gets the 409 — and only the winner touches the
  // shared Contact row below.
  const { count } = await prisma.lostChild.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: resolution },
  });
  if (count === 0) throw new ApiError(409, 'Already resolved');

  if (resolution === 'APPLIED') {
    // Apply mutates the SHARED contact row — every workspace sees the new
    // title. That's the point (the dataset stays current), and why the
    // audit entry records both titles.
    await prisma.contact.update({ where: { id: row.contactId }, data: { title: row.newTitle } });
    await enqueueIndex('contact', row.contactId);
  }

  await recordAuditLog({
    superAdminId: actorAdminId,
    action: 'RESOLVE_LOST_CHILD',
    metadata: {
      lostChildId: id,
      contactId: row.contactId,
      oldTitle: row.oldTitle,
      newTitle: row.newTitle,
      resolution,
    },
  });
  return prisma.lostChild.findUnique({ where: { id } });
}

/** Badge counts for the admin nav — one cheap call, polled like tickets. */
export async function pendingSourcingCounts() {
  const [missingPersons, lostChildren] = await Promise.all([
    prisma.missingPerson.count({ where: { status: 'PENDING' } }),
    prisma.lostChild.count({ where: { status: 'PENDING' } }),
  ]);
  return { missingPersons, lostChildren };
}

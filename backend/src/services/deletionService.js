import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

export const PURGE_AFTER_DAYS = 60;

/**
 * The 60-day hard-delete behind the admin "Deleted" section: anything
 * soft-deleted (deletedAt) longer than PURGE_AFTER_DAYS ago is permanently
 * removed. Runs daily (jobs/processors/deletionPurgeProcessor).
 *
 * Users: `prisma.user.delete` cascades Membership/ApiKey/invites and
 * SET-NULLs the seven content references (List.createdBy, EmailReveal.
 * revealedBy, ...) relaxed in the admin_lifecycle migration; the personal
 * Redis balance key is deleted first (no cascade covers Redis). Ledger rows
 * survive — their userId is a soft reference by design.
 *
 * Workspaces: everything tenant-scoped cascades from the workspace row;
 * member users and their personal balances survive (they may belong to
 * other workspaces). Any legacy shared-pool key remnant is cleaned too.
 */
export async function purgeExpiredDeletions(now = new Date()) {
  const cutoff = new Date(now.getTime() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  let purgedUsers = 0;
  let purgedWorkspaces = 0;

  const users = await prisma.user.findMany({
    where: { deletedAt: { not: null, lte: cutoff } },
    select: { id: true, email: true },
  });
  for (const user of users) {
    await redis.del(`credits:balance:user:${user.id}`);
    await prisma.user.delete({ where: { id: user.id } });
    purgedUsers++;
    logger.info({ userId: user.id, email: user.email }, 'Hard-purged a soft-deleted user');
  }

  const workspaces = await prisma.workspace.findMany({
    where: { deletedAt: { not: null, lte: cutoff } },
    select: { id: true, name: true, orgId: true },
  });
  for (const workspace of workspaces) {
    await redis.del(`credits:balance:${workspace.id}`); // legacy pool remnant, if any
    await prisma.workspace.delete({ where: { id: workspace.id } });
    // An org with no workspaces left is an empty shell — remove it too.
    const siblings = await prisma.workspace.count({ where: { orgId: workspace.orgId } });
    if (siblings === 0) {
      await prisma.org.delete({ where: { id: workspace.orgId } }).catch(() => {});
    }
    purgedWorkspaces++;
    logger.info({ workspaceId: workspace.id, name: workspace.name }, 'Hard-purged a soft-deleted workspace');
  }

  return { purgedUsers, purgedWorkspaces };
}

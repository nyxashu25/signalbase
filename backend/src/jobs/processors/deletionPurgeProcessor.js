import { purgeExpiredDeletions } from '../../services/deletionService.js';
import { logger } from '../../config/logger.js';

// Daily (see worker.js): hard-deletes anything soft-deleted 60+ days ago.
export async function deletionPurgeProcessor() {
  const { purgedUsers, purgedWorkspaces } = await purgeExpiredDeletions();
  if (purgedUsers > 0 || purgedWorkspaces > 0) {
    logger.info({ purgedUsers, purgedWorkspaces }, 'deletion-purge sweep complete');
  }
}

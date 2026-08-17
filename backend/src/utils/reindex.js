import { reindexAll } from '../services/indexerService.js';
import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

reindexAll()
  .catch((err) => {
    logger.error({ err }, 'Reindex failed');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

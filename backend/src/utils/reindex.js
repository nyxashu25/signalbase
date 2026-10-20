import { reindexAll } from '../services/indexerService.js';
import { prisma } from '../config/db.js';
import { redis, bullConnection } from '../config/redis.js';
import { es } from '../config/elasticsearch.js';
import { logger } from '../config/logger.js';

// Close every client the indexer opened, or the open Redis and Elasticsearch
// sockets keep the process alive after the reindex is done.
reindexAll()
  .catch((err) => {
    logger.error({ err }, 'Reindex failed');
    process.exitCode = 1;
  })
  .finally(() =>
    Promise.allSettled([prisma.$disconnect(), redis.quit(), bullConnection.quit(), es.close()]),
  );

import { Worker } from 'bullmq';
import { bullConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { ensureIndices } from '../services/indexerService.js';
import { esIndexProcessor } from './processors/esIndexProcessor.js';
import { creditReaperProcessor } from './processors/creditReaperProcessor.js';
import { reconciliationProcessor } from './processors/reconciliationProcessor.js';
import { sequenceProcessor } from './processors/sequenceProcessor.js';
import { databaseImportProcessor } from './processors/databaseImportProcessor.js';
import { monthlyGrantProcessor } from './processors/monthlyGrantProcessor.js';
import {
  creditReaperQueue,
  reconciliationQueue,
  sequenceQueue,
  monthlyGrantQueue,
} from './queues.js';

// Additional queue processors (crm-sync) register here starting in Phase 05.

async function main() {
  await ensureIndices();

  const esIndexWorker = new Worker('es-index', esIndexProcessor, { connection: bullConnection });
  esIndexWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'es-index job completed');
  });
  esIndexWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, data: job?.data, err }, 'es-index job failed');
  });

  const creditReaperWorker = new Worker('credit-reaper', creditReaperProcessor, {
    connection: bullConnection,
  });
  creditReaperWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'credit-reaper job failed');
  });

  const reconciliationWorker = new Worker('credit-reconciliation', reconciliationProcessor, {
    connection: bullConnection,
  });
  reconciliationWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'credit-reconciliation job failed');
  });

  const sequenceWorker = new Worker('sequence-tick', sequenceProcessor, {
    connection: bullConnection,
  });
  sequenceWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'sequence-tick job failed');
  });

  const databaseImportWorker = new Worker('database-import', databaseImportProcessor, {
    connection: bullConnection,
  });
  databaseImportWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, batchId: job?.data?.batchId, err }, 'database-import job failed');
  });

  const monthlyGrantWorker = new Worker('monthly-grant', monthlyGrantProcessor, {
    connection: bullConnection,
  });
  monthlyGrantWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'monthly-grant job failed');
  });

  // Repeatable jobs — BullMQ dedupes by jobId+repeat pattern, so re-running
  // this on every worker boot doesn't stack up duplicate schedules.
  await creditReaperQueue.add(
    'sweep',
    {},
    { repeat: { every: 60_000 }, jobId: 'credit-reaper-sweep' },
  );
  await reconciliationQueue.add(
    'reconcile',
    {},
    { repeat: { every: 15 * 60_000 }, jobId: 'credit-reconciliation-sweep' },
  );
  await sequenceQueue.add('tick', {}, { repeat: { every: 60_000 }, jobId: 'sequence-tick' });
  // FREE-plan personal credit refills — a due-check, not the grant cadence
  // itself (each user's own lastMonthlyGrantAt decides when a month is up),
  // so every 6h just bounds how late a grant can land.
  await monthlyGrantQueue.add(
    'sweep',
    {},
    { repeat: { every: 6 * 60 * 60_000 }, jobId: 'free-monthly-grant-sweep' },
  );

  logger.info(
    'Worker process started (es-index, credit-reaper, credit-reconciliation, sequence-tick, database-import, monthly-grant queues active)',
  );

  const shutdown = async () => {
    await Promise.all([
      esIndexWorker.close(),
      creditReaperWorker.close(),
      reconciliationWorker.close(),
      sequenceWorker.close(),
      databaseImportWorker.close(),
      monthlyGrantWorker.close(),
    ]);
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'Fatal worker startup error');
  process.exit(1);
});

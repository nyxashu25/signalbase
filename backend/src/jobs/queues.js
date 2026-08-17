import { Queue } from 'bullmq';
import { bullConnection } from '../config/redis.js';

// Shared BullMQ-dedicated connection (see config/redis.js) — separate from
// the app's general-purpose Redis client.
export const esIndexQueue = new Queue('es-index', { connection: bullConnection });
export const creditReaperQueue = new Queue('credit-reaper', { connection: bullConnection });
export const reconciliationQueue = new Queue('credit-reconciliation', {
  connection: bullConnection,
});
export const sequenceQueue = new Queue('sequence-tick', { connection: bullConnection });

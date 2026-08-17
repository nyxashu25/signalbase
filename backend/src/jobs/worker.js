import { logger } from '../config/logger.js';

// Queue processors (enrichment, email-verify, crm-sync, sequence-send,
// es-index) register here starting in Phase 03. Kept as a live no-op process
// so `docker-compose up` and the `worker` service topology are correct now.
logger.info('Worker process started (no queues registered yet)');

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

import client from 'prom-client';
import { redis } from './redis.js';
import {
  esIndexQueue,
  creditReaperQueue,
  reconciliationQueue,
  sequenceQueue,
} from '../jobs/queues.js';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

// Async gauges — prom-client calls `collect` on every scrape, so this stays
// live without a separate polling loop.
new client.Gauge({
  name: 'credit_reservations_pending',
  help: 'Count of active (uncommitted, unreleased) credit reservations across all workspaces',
  registers: [registry],
  async collect() {
    const count = await redis.zcard('credits:reservations:pending');
    this.set(count);
  },
});

const QUEUES = {
  'es-index': esIndexQueue,
  'credit-reaper': creditReaperQueue,
  'credit-reconciliation': reconciliationQueue,
  'sequence-tick': sequenceQueue,
};

new client.Gauge({
  name: 'bullmq_queue_waiting_jobs',
  help: 'Jobs waiting to be processed, per queue',
  labelNames: ['queue'],
  registers: [registry],
  async collect() {
    for (const [name, queue] of Object.entries(QUEUES)) {
      const count = await queue.getWaitingCount();
      this.set({ queue: name }, count);
    }
  },
});

import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

// General-purpose client for request-path commands (auth, credits, rate
// limiting, idempotency, webhook dedup). commandTimeout makes a Redis
// outage a fast, visible error on the affected request instead of hanging
// it forever.
export const redis = new Redis(env.REDIS_URL, {
  commandTimeout: 5000,
  // Fail a command immediately with an error while disconnected, rather
  // than queuing it in memory to run once a connection eventually comes
  // back — a request handler should get a fast 5xx during a Redis outage,
  // not hang until some future reconnect.
  enableOfflineQueue: false,
});

redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
redis.on('connect', () => logger.info('Redis connected'));

// Separate connection for BullMQ (jobs/queues.js, jobs/worker.js). Workers
// issue long-lived blocking commands while waiting for jobs — a
// commandTimeout would wrongly kill those, and sharing one connection
// between a blocking wait and regular request-path commands would let the
// wait stall unrelated HTTP requests on the same socket. maxRetriesPerRequest:
// null is required for BullMQ's blocking connections specifically.
export const bullConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

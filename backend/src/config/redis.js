import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

// maxRetriesPerRequest: null is required for BullMQ's blocking connections;
// a finite retry count makes BullMQ throw instead of reconnecting.
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
redis.on('connect', () => logger.info('Redis connected'));

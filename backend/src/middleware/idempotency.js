import { redis } from '../config/redis.js';
import { ApiError } from './errorHandler.js';

const TTL_SECONDS = 24 * 60 * 60;

/**
 * Requires an Idempotency-Key header and replays the cached response for a
 * repeated key instead of re-running the (costly, credit-spending) handler.
 * Must run after requireAuth — the cache key is scoped per workspace so one
 * tenant can't collide with or read another's cached result.
 */
export function idempotent(keyPrefix) {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) {
      return next(new ApiError(400, 'Idempotency-Key header is required for this request'));
    }

    try {
      const redisKey = `idempotency:${keyPrefix}:${req.auth.workspaceId}:${key}`;
      const cached = await redis.get(redisKey);
      if (cached) {
        const { status, body } = JSON.parse(cached);
        return res.status(status).json(body);
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache success responses — a transient 5xx shouldn't be
        // permanently "replayed" for the next 24h if the client retries.
        if (res.statusCode < 500) {
          redis
            .set(redisKey, JSON.stringify({ status: res.statusCode, body }), 'EX', TTL_SECONDS)
            .catch(() => {});
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      // Same reasoning as rateLimit.js — an unhandled rejection here would
      // hang the request instead of surfacing as a 5xx.
      next(err);
    }
  };
}

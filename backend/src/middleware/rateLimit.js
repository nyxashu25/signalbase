import { checkRateLimit } from '../services/rateLimitService.js';
import { ApiError } from './errorHandler.js';

/**
 * `keyFn(req)` picks the bucket — e.g. per-IP for unauthenticated routes
 * like login, per-workspace for authenticated ones like reveal. Two
 * separate rateLimit() calls can be stacked on one route to enforce both.
 */
export function rateLimit({ limit, windowSeconds, prefix, keyFn }) {
  return async (req, res, next) => {
    try {
      const bucket = `ratelimit:${prefix}:${keyFn(req)}`;
      const { allowed, retryAfterSeconds } = await checkRateLimit(bucket, limit, windowSeconds);

      if (!allowed) {
        res.set('Retry-After', String(retryAfterSeconds));
        return next(new ApiError(429, 'Too many requests — please slow down'));
      }
      next();
    } catch (err) {
      // An async middleware's rejection is NOT caught by Express on its
      // own — without this, a Redis error here would hang the request
      // forever instead of surfacing as a 5xx.
      next(err);
    }
  };
}

export const byIp = (req) => req.ip;
export const byWorkspace = (req) => req.auth?.workspaceId ?? req.ip;

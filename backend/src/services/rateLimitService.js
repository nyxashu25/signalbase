import { redis } from '../config/redis.js';

// KEYS[1] = bucket key, ARGV[1] = window seconds, ARGV[2] = limit
// Only the request that creates the key sets its expiry — calling EXPIRE
// on every hit would keep pushing the window out and the limit would never
// actually reset (a classic rate-limiter bug).
const SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
if current > tonumber(ARGV[2]) then
  return 0
end
return 1
`;

redis.defineCommand('rateLimitScript', { numberOfKeys: 1, lua: SCRIPT });

/** Returns { allowed, retryAfterSeconds }. */
export async function checkRateLimit(key, limit, windowSeconds) {
  const allowed = await redis.rateLimitScript(key, windowSeconds, limit);
  if (allowed === 1) return { allowed: true };

  const ttl = await redis.ttl(key);
  return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds };
}

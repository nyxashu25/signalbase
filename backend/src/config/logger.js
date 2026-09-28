import pino from 'pino';
import { env, isProduction } from './env.js';

// Credentials must never reach the logs: pino-http logs every request's
// headers, which carry bearer tokens (sessions and API keys), the refresh
// cookie and Set-Cookie on responses.
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
];

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
});

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { healthRouter } from './routes/health.js';
import { apiRouter } from './routes/index.js';
import { metricsRouter } from './routes/metrics.js';
import { metricsMiddleware } from './middleware/metricsMiddleware.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Trust X-Forwarded-For / -Proto only from a proxy on this machine or a
  // private network: nginx on the VPS proxies to 127.0.0.1:4000 and appends
  // the client address, so req.ip is the real client. The API listens on
  // every interface, though, and with a plain hop count (`1`) a request
  // reaching :4000 directly from the internet could pick its own req.ip —
  // and dodge every per-IP rate limit — with a forged X-Forwarded-For.
  // Private ranges stay trusted so a proxy on a Docker bridge or LAN still
  // works; a public source address never is.
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.headers['x-request-id'] || randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
    }),
  );

  app.use(helmet());
  app.use(
    cors({
      origin: [
        env.CORS_ORIGIN,
        ...env.EXTENSION_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
      ],
      credentials: true,
    }),
  );
  app.use(
    express.json({
      limit: '1mb',
      // Webhook signature verification needs the exact bytes that were
      // signed — re-serializing the parsed object could produce different
      // bytes (key order, whitespace) and break the HMAC comparison.
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(cookieParser());
  app.use(metricsMiddleware);

  app.use(healthRouter);
  app.use('/metrics', metricsRouter);
  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

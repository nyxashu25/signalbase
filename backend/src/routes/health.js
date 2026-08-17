import { Router } from 'express';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { es } from '../config/elasticsearch.js';

export const healthRouter = Router();

// Liveness: is the process up? Never checks dependencies — a slow DB
// should not cause the orchestrator to kill and restart a healthy process.
healthRouter.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Readiness: can this instance actually serve traffic? Used by load
// balancers / k8s readiness probes to pull an instance out of rotation.
healthRouter.get('/health/ready', async (req, res) => {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
    es.ping(),
  ]);

  const [db, redisCheck, elasticsearch] = checks.map((c) => c.status === 'fulfilled');
  const ready = db && redisCheck && elasticsearch;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks: { database: db, redis: redisCheck, elasticsearch },
  });
});

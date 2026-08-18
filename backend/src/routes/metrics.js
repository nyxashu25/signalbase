import { Router } from 'express';
import { registry } from '../config/metrics.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const metricsRouter = Router();

// No auth — standard for Prometheus scrape targets. This MUST be firewalled
// to internal-network-only access in any real deployment (see RUNBOOK.md);
// it is not meant to be internet-reachable.
metricsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  }),
);

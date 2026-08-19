import { Router } from 'express';
import * as revealController from '../controllers/revealController.js';
import { requireAuth } from '../middleware/auth.js';
import { idempotent } from '../middleware/idempotency.js';
import { skipIfAlreadyRevealed } from '../middleware/skipIfAlreadyRevealed.js';
import { reserveCredits, releaseOnError } from '../middleware/reserveCredits.js';
import { rateLimit, byWorkspace } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

// The credit balance already caps how much a compromised token can spend,
// but not how hard it can hammer the DB/ES doing it — rate-limit
// independently of the money check.
const revealLimiter = rateLimit({
  limit: 30,
  windowSeconds: 60,
  prefix: 'reveal',
  keyFn: byWorkspace,
});

contactsRouter.post(
  '/:id/reveal',
  revealLimiter,
  idempotent('reveal'),
  skipIfAlreadyRevealed,
  reserveCredits(CREDIT_COSTS.REVEAL),
  asyncHandler(revealController.reveal),
  releaseOnError,
);

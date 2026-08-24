import { Router } from 'express';
import * as extensionController from '../controllers/extensionController.js';
import { requireApiKey } from '../middleware/apiKeyAuth.js';
import { validateBody } from '../middleware/validate.js';
import { observeSchema } from '../validators/extensionValidators.js';
import { idempotent } from '../middleware/idempotency.js';
import { skipIfAlreadyRevealed } from '../middleware/skipIfAlreadyRevealed.js';
import { reserveCredits, releaseOnError } from '../middleware/reserveCredits.js';
import { rateLimit, byWorkspace } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';

// The Chrome extension's API surface — API-key auth (middleware/
// apiKeyAuth.js), never a browser session. Same req.auth shape as
// requireAuth, so the credit/masking/reveal pipeline below is the exact
// in-app machinery, just priced and rate-limited for extension use.
export const extensionRouter = Router();

extensionRouter.use(requireApiKey);

// A human browses LinkedIn at human speed — 60 profile observations/hour is
// generous headroom; sustained more than that is a scraper, not a person.
const observeLimiter = rateLimit({
  limit: 60,
  windowSeconds: 60 * 60,
  prefix: 'ext-observe',
  keyFn: byWorkspace,
});

// Same posture as the in-app reveal limiter (see routes/contacts.js).
const revealLimiter = rateLimit({
  limit: 30,
  windowSeconds: 60,
  prefix: 'ext-reveal',
  keyFn: byWorkspace,
});

extensionRouter.get('/me', asyncHandler(extensionController.status));

extensionRouter.post(
  '/observe',
  observeLimiter,
  validateBody(observeSchema),
  asyncHandler(extensionController.observe),
);

// Mirrors POST /contacts/:id/reveal exactly, except the reservation is
// EXTENSION_REVEAL (4 credits) and the ledger reason says so. The
// already-revealed short-circuit and idempotency replay both make repeats
// free, same as in-app.
extensionRouter.post(
  '/contacts/:id/reveal',
  revealLimiter,
  idempotent('reveal'),
  skipIfAlreadyRevealed,
  reserveCredits(CREDIT_COSTS.EXTENSION_REVEAL),
  asyncHandler(extensionController.reveal),
  releaseOnError,
);

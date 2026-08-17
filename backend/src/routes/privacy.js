import { Router } from 'express';
import * as privacyController from '../controllers/privacyController.js';
import { validateBody } from '../middleware/validate.js';
import { optOutSchema } from '../validators/privacyValidators.js';
import { rateLimit, byIp } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const privacyRouter = Router();

// Deliberately no requireAuth — a data subject exercising their own rights
// may not have (or want) an account with us at all. Rate-limited instead,
// since that's the relevant abuse control for an unauthenticated endpoint.
const optOutLimiter = rateLimit({
  limit: 5,
  windowSeconds: 60 * 60,
  prefix: 'opt-out',
  keyFn: byIp,
});

privacyRouter.post(
  '/opt-out',
  optOutLimiter,
  validateBody(optOutSchema),
  asyncHandler(privacyController.optOut),
);

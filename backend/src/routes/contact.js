import { Router } from 'express';
import * as contactController from '../controllers/contactController.js';
import { validateBody } from '../middleware/validate.js';
import { contactRequestSchema } from '../validators/contactValidators.js';
import { rateLimit, byIp } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const contactRouter = Router();

// Unauthenticated by design — a prospect filling this out has no account
// yet. Rate-limited against spam instead.
const contactLimiter = rateLimit({
  limit: 5,
  windowSeconds: 60 * 60,
  prefix: 'contact',
  keyFn: byIp,
});

contactRouter.post(
  '/',
  contactLimiter,
  validateBody(contactRequestSchema),
  asyncHandler(contactController.submitContactRequest),
);

import { Router } from 'express';
import * as billingController from '../controllers/billingController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createCheckoutSessionSchema } from '../validators/billingValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const billingRouter = Router();

billingRouter.get('/summary', requireAuth, asyncHandler(billingController.getSummary));

billingRouter.post(
  '/checkout-session',
  requireAuth,
  validateBody(createCheckoutSessionSchema),
  asyncHandler(billingController.createCheckoutSession),
);

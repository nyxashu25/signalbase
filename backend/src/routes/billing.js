import { Router } from 'express';
import * as billingController from '../controllers/billingController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createCheckoutSessionSchema,
  createPlanSubscriptionSchema,
  customCreditsQuerySchema,
  transactionsQuerySchema,
} from '../validators/billingValidators.js';
import { rateLimit, byWorkspace } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const billingRouter = Router();

// Both routes call out to Stripe — per-workspace since a buggy retry loop
// or compromised account hammering checkout is the realistic abuse case
// here, not anonymous traffic (both are already requireAuth-gated).
const checkoutLimiter = rateLimit({
  limit: 10,
  windowSeconds: 60 * 60,
  prefix: 'billing-checkout',
  keyFn: byWorkspace,
});

billingRouter.get('/packages', billingController.getPackages);
billingRouter.get('/credit-costs', billingController.getCreditCosts);
billingRouter.get(
  '/custom-credits-price',
  validateQuery(customCreditsQuerySchema),
  billingController.getCustomCreditsPrice,
);
billingRouter.get('/summary', requireAuth, asyncHandler(billingController.getSummary));
billingRouter.get(
  '/transactions',
  requireAuth,
  validateQuery(transactionsQuerySchema),
  asyncHandler(billingController.listTransactions),
);

billingRouter.post(
  '/checkout-session',
  requireAuth,
  checkoutLimiter,
  validateBody(createCheckoutSessionSchema),
  asyncHandler(billingController.createCheckoutSession),
);
billingRouter.post(
  '/subscribe',
  requireAuth,
  checkoutLimiter,
  validateBody(createPlanSubscriptionSchema),
  asyncHandler(billingController.createPlanSubscriptionSession),
);

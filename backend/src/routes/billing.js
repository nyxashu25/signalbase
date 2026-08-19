import { Router } from 'express';
import * as billingController from '../controllers/billingController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createCheckoutSessionSchema,
  transactionsQuerySchema,
  verifyRazorpayPaymentSchema,
} from '../validators/billingValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const billingRouter = Router();

billingRouter.get('/packages', billingController.getPackages);
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
  validateBody(createCheckoutSessionSchema),
  asyncHandler(billingController.createCheckoutSession),
);
billingRouter.post(
  '/razorpay/verify',
  requireAuth,
  validateBody(verifyRazorpayPaymentSchema),
  asyncHandler(billingController.verifyRazorpayPayment),
);

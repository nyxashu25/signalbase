import { Router } from 'express';
import * as adminAuthController from '../controllers/adminAuthController.js';
import * as adminController from '../controllers/adminController.js';
import { requireSuperAdmin } from '../middleware/adminAuth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { rateLimit, byIp } from '../middleware/rateLimit.js';
import {
  adminLoginSchema,
  listUsersQuerySchema,
  paginationQuerySchema,
  addCreditsSchema,
} from '../validators/adminValidators.js';
import { saveStripeSettingsSchema } from '../validators/billingValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const adminRouter = Router();

// Tighter than the tenant login limiter (10/min) — this route guards a much
// more sensitive credential, and there's no legitimate reason for a real
// admin to attempt more than a handful of logins in a short window.
const adminLoginLimiter = rateLimit({
  limit: 5,
  windowSeconds: 15 * 60,
  prefix: 'admin-login',
  keyFn: byIp,
});

adminRouter.post(
  '/auth/login',
  adminLoginLimiter,
  validateBody(adminLoginSchema),
  asyncHandler(adminAuthController.login),
);

adminRouter.use(requireSuperAdmin);

adminRouter.get('/overview', asyncHandler(adminController.getOverview));
adminRouter.get('/usage', asyncHandler(adminController.getUsage));

adminRouter.get(
  '/users',
  validateQuery(listUsersQuerySchema),
  asyncHandler(adminController.listUsers),
);
adminRouter.get('/users/:userId', asyncHandler(adminController.getUserDetail));
adminRouter.post('/users/:userId/suspend', asyncHandler(adminController.suspendUser));
adminRouter.post('/users/:userId/unsuspend', asyncHandler(adminController.unsuspendUser));
adminRouter.post(
  '/users/:userId/credits',
  validateBody(addCreditsSchema),
  asyncHandler(adminController.addCredits),
);

adminRouter.get('/billing/overview', asyncHandler(adminController.getBillingOverview));
adminRouter.get(
  '/billing/transactions',
  validateQuery(paginationQuerySchema),
  asyncHandler(adminController.listTransactions),
);

adminRouter.get('/settings/stripe', asyncHandler(adminController.getStripeSettings));
adminRouter.put(
  '/settings/stripe',
  validateBody(saveStripeSettingsSchema),
  asyncHandler(adminController.saveStripeSettings),
);

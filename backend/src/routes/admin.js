import { Router } from 'express';
import * as adminAuthController from '../controllers/adminAuthController.js';
import * as adminController from '../controllers/adminController.js';
import * as databaseImportController from '../controllers/databaseImportController.js';
import * as adminTicketController from '../controllers/adminTicketController.js';
import { requireSuperAdmin } from '../middleware/adminAuth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { uploadCsv } from '../middleware/uploadCsv.js';
import { rateLimit, byIp } from '../middleware/rateLimit.js';
import {
  adminLoginSchema,
  listUsersQuerySchema,
  paginationQuerySchema,
  addCreditsSchema,
  updateUserPlanSchema,
  sendPromotionSchema,
  auditLogQuerySchema,
} from '../validators/adminValidators.js';
import { saveStripeSettingsSchema } from '../validators/billingValidators.js';
import {
  adminListTicketsQuerySchema,
  addTicketMessageSchema,
  ticketNotificationsQuerySchema,
} from '../validators/ticketValidators.js';
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
adminRouter.put(
  '/users/:userId/plan',
  validateBody(updateUserPlanSchema),
  asyncHandler(adminController.updateUserPlan),
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

adminRouter.post(
  '/promotions',
  validateBody(sendPromotionSchema),
  asyncHandler(adminController.sendPromotion),
);

adminRouter.get(
  '/audit-log',
  validateQuery(auditLogQuerySchema),
  asyncHandler(adminController.listAuditLog),
);

// Uploads are inherently rarer and heavier than the rest of the admin API —
// capped well below the general admin traffic pattern.
const databaseImportLimiter = rateLimit({
  limit: 10,
  windowSeconds: 60 * 60,
  prefix: 'database-import-upload',
  keyFn: byIp,
});

adminRouter.get('/database-imports', asyncHandler(databaseImportController.list));
adminRouter.get('/database-imports/:batchId', asyncHandler(databaseImportController.detail));
adminRouter.post(
  '/database-imports',
  databaseImportLimiter,
  uploadCsv,
  asyncHandler(databaseImportController.upload),
);
adminRouter.post(
  '/database-imports/:batchId/approve',
  asyncHandler(databaseImportController.approve),
);

// Notifications is polled far more frequently than the list itself (see
// TicketNotifier.jsx) — listed first so it reads as the "live" endpoint of
// this group rather than buried among the CRUD routes below.
adminRouter.get(
  '/tickets/notifications',
  validateQuery(ticketNotificationsQuerySchema),
  asyncHandler(adminTicketController.notifications),
);
adminRouter.get(
  '/tickets',
  validateQuery(adminListTicketsQuerySchema),
  asyncHandler(adminTicketController.index),
);
adminRouter.get('/tickets/:id', asyncHandler(adminTicketController.show));
adminRouter.post(
  '/tickets/:id/messages',
  validateBody(addTicketMessageSchema),
  asyncHandler(adminTicketController.reply),
);
adminRouter.post('/tickets/:id/close', asyncHandler(adminTicketController.close));

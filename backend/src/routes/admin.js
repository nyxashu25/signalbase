import { Router } from 'express';
import * as adminAuthController from '../controllers/adminAuthController.js';
import * as adminController from '../controllers/adminController.js';
import * as databaseImportController from '../controllers/databaseImportController.js';
import * as adminTicketController from '../controllers/adminTicketController.js';
import * as adminSourcingController from '../controllers/adminSourcingController.js';
import { requireSuperAdmin } from '../middleware/adminAuth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { uploadCsv } from '../middleware/uploadCsv.js';
import { rateLimit, byIp } from '../middleware/rateLimit.js';
import {
  adminLoginSchema,
  listUsersQuerySchema,
  paginationQuerySchema,
  adjustCreditsSchema,
  updateUserPlanSchema,
  sendPromotionSchema,
  auditLogQuerySchema,
  missingPersonsQuerySchema,
  resolveMissingPersonSchema,
  lostChildrenQuerySchema,
  resolveLostChildSchema,
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
  validateBody(adjustCreditsSchema),
  asyncHandler(adminController.adjustUserCredits),
);
adminRouter.delete('/users/:userId', asyncHandler(adminController.deleteUser));
adminRouter.post('/users/:userId/restore', asyncHandler(adminController.restoreUser));
adminRouter.put(
  '/users/:userId/plan',
  validateBody(updateUserPlanSchema),
  asyncHandler(adminController.updateUserPlan),
);

// Workspace lifecycle + the "Deleted" section.
adminRouter.post('/workspaces/:workspaceId/suspend', asyncHandler(adminController.suspendWorkspace));
adminRouter.post(
  '/workspaces/:workspaceId/unsuspend',
  asyncHandler(adminController.unsuspendWorkspace),
);
adminRouter.delete('/workspaces/:workspaceId', asyncHandler(adminController.deleteWorkspace));
adminRouter.post(
  '/workspaces/:workspaceId/restore',
  asyncHandler(adminController.restoreWorkspace),
);
adminRouter.delete(
  '/workspaces/:workspaceId/members/:userId',
  asyncHandler(adminController.removeMember),
);
adminRouter.get('/deleted', asyncHandler(adminController.listDeleted));

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

// Extension-sourcing queues: "Pending peoples" (MissingPerson) and "Childs
// found" (LostChild) — see sourcingService.js. Counts is the nav-badge
// endpoint, polled like ticket notifications.
adminRouter.get('/sourcing/counts', asyncHandler(adminSourcingController.counts));
adminRouter.get(
  '/sourcing/missing-persons',
  validateQuery(missingPersonsQuerySchema),
  asyncHandler(adminSourcingController.listMissingPersons),
);
adminRouter.post(
  '/sourcing/missing-persons/:id/resolve',
  validateBody(resolveMissingPersonSchema),
  asyncHandler(adminSourcingController.resolveMissingPerson),
);
adminRouter.get(
  '/sourcing/lost-children',
  validateQuery(lostChildrenQuerySchema),
  asyncHandler(adminSourcingController.listLostChildren),
);
adminRouter.post(
  '/sourcing/lost-children/:id/resolve',
  validateBody(resolveLostChildSchema),
  asyncHandler(adminSourcingController.resolveLostChild),
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

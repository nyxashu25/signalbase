import { Router } from 'express';
import * as listController from '../controllers/listController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { createListSchema, addListItemSchema } from '../validators/listValidators.js';
import { reserveCredits, releaseOnError } from '../middleware/reserveCredits.js';
import { rateLimit, byWorkspace } from '../middleware/rateLimit.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listsRouter = Router();

listsRouter.use(requireAuth);

const createLimiter = rateLimit({
  limit: 30,
  windowSeconds: 60 * 60,
  prefix: 'list-create',
  keyFn: byWorkspace,
});

listsRouter.get('/', asyncHandler(listController.index));
listsRouter.post(
  '/',
  createLimiter,
  validateBody(createListSchema),
  asyncHandler(listController.create),
);
listsRouter.get('/:id', asyncHandler(listController.show));
listsRouter.get(
  '/:id/export',
  reserveCredits(CREDIT_COSTS.CSV_EXPORT),
  asyncHandler(listController.exportCsv),
  releaseOnError,
);
listsRouter.delete('/:id', requireRole('ADMIN'), asyncHandler(listController.destroy));
listsRouter.post(
  '/:id/items',
  validateBody(addListItemSchema),
  asyncHandler(listController.addItem),
);
listsRouter.delete('/:id/items/:itemId', asyncHandler(listController.removeItem));

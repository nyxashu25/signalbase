import { Router } from 'express';
import * as listController from '../controllers/listController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { createListSchema, addListItemSchema } from '../validators/listValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listsRouter = Router();

listsRouter.use(requireAuth);

listsRouter.get('/', asyncHandler(listController.index));
listsRouter.post('/', validateBody(createListSchema), asyncHandler(listController.create));
listsRouter.get('/:id', asyncHandler(listController.show));
listsRouter.delete('/:id', requireRole('ADMIN'), asyncHandler(listController.destroy));
listsRouter.post(
  '/:id/items',
  validateBody(addListItemSchema),
  asyncHandler(listController.addItem),
);
listsRouter.delete('/:id/items/:itemId', asyncHandler(listController.removeItem));

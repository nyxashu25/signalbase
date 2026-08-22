import { Router } from 'express';
import * as workspaceController from '../controllers/workspaceController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { renameWorkspaceSchema } from '../validators/workspaceValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// The signed-in user's *current* workspace (from the access token) — there
// is no :id here by design; cross-workspace access never goes through a URL
// parameter. Seat invites (TODO.md P0) will land on this router when built.
export const workspaceRouter = Router();

workspaceRouter.use(requireAuth);

workspaceRouter.get('/members', asyncHandler(workspaceController.members));
workspaceRouter.patch(
  '/',
  requireRole('ADMIN'),
  validateBody(renameWorkspaceSchema),
  asyncHandler(workspaceController.rename),
);

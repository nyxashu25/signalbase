import { Router } from 'express';
import * as workspaceController from '../controllers/workspaceController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { updateWorkspaceSchema, createInviteSchema } from '../validators/workspaceValidators.js';
import { rateLimit, byWorkspace } from '../middleware/rateLimit.js';
import { uploadImage } from '../middleware/uploadImage.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// The signed-in user's *current* workspace (from the access token) — there
// is no :id here by design; cross-workspace access never goes through a URL
// parameter. Seat invites (TODO.md P0) will land on this router when built.
export const workspaceRouter = Router();

workspaceRouter.use(requireAuth);

// Per-workspace, matching the other authenticated write limiters — the
// abuse case is a compromised admin account spraying invite emails.
const inviteLimiter = rateLimit({
  limit: 20,
  windowSeconds: 60 * 60,
  prefix: 'workspace-invite',
  keyFn: byWorkspace,
});

// Workspace branding — readable by any member, editable by ADMIN+ (free on
// every plan). Logo is a small uploaded image stored inline (uploadImage).
workspaceRouter.get('/', asyncHandler(workspaceController.profile));
workspaceRouter.post('/logo', requireRole('ADMIN'), uploadImage, asyncHandler(workspaceController.uploadLogo));
workspaceRouter.delete('/logo', requireRole('ADMIN'), asyncHandler(workspaceController.removeLogo));

workspaceRouter.get('/members', asyncHandler(workspaceController.members));
workspaceRouter.get('/invites', requireRole('ADMIN'), asyncHandler(workspaceController.listInvites));
workspaceRouter.post(
  '/invites',
  requireRole('ADMIN'),
  inviteLimiter,
  validateBody(createInviteSchema),
  asyncHandler(workspaceController.createInvite),
);
workspaceRouter.delete(
  '/invites/:id',
  requireRole('ADMIN'),
  asyncHandler(workspaceController.revokeInvite),
);
workspaceRouter.patch(
  '/',
  requireRole('ADMIN'),
  validateBody(updateWorkspaceSchema),
  asyncHandler(workspaceController.update),
);

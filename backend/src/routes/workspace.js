import { Router } from 'express';
import * as workspaceController from '../controllers/workspaceController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import {
  updateWorkspaceSchema,
  createInviteSchema,
  bulkInviteSchema,
  changeMemberRoleSchema,
  assignSeatSchema,
  transferCreditsSchema,
} from '../validators/workspaceValidators.js';
import { rateLimit, byWorkspace } from '../middleware/rateLimit.js';
import { uploadImage } from '../middleware/uploadImage.js';
import { requireTeamPlan } from '../middleware/requireTeamPlan.js';
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
// Team features (invite, revoke, change role) are paid-only — requireTeamPlan
// after the role check. Listing invites stays open to ADMIN on any plan so
// the Free UI can render an empty list rather than erroring.
workspaceRouter.get('/invites', requireRole('ADMIN'), asyncHandler(workspaceController.listInvites));
workspaceRouter.post(
  '/invites',
  requireRole('ADMIN'),
  requireTeamPlan,
  inviteLimiter,
  validateBody(createInviteSchema),
  asyncHandler(workspaceController.createInvite),
);
// Bulk add — one request, many addresses, per-email results. Same gates as
// the single-invite route; the rate limiter counts the request, not the
// addresses (a 200-email batch is one action, not 200).
workspaceRouter.post(
  '/invites/bulk',
  requireRole('ADMIN'),
  requireTeamPlan,
  inviteLimiter,
  validateBody(bulkInviteSchema),
  asyncHandler(workspaceController.bulkInvite),
);
workspaceRouter.delete(
  '/invites/:id',
  requireRole('ADMIN'),
  requireTeamPlan,
  asyncHandler(workspaceController.revokeInvite),
);
workspaceRouter.patch(
  '/members/:userId/role',
  requireRole('ADMIN'),
  requireTeamPlan,
  validateBody(changeMemberRoleSchema),
  asyncHandler(workspaceController.changeMemberRole),
);
// Seat assignment, credit transfers, and member removal are the OWNER's
// alone — the first OWNER-gated routes in the app (rbac RANK covers it).
workspaceRouter.patch(
  '/members/:userId/seat',
  requireRole('OWNER'),
  requireTeamPlan,
  validateBody(assignSeatSchema),
  asyncHandler(workspaceController.assignSeat),
);
workspaceRouter.delete(
  '/members/:userId',
  requireRole('OWNER'),
  requireTeamPlan,
  asyncHandler(workspaceController.removeMember),
);
workspaceRouter.post(
  '/credits/transfer',
  requireRole('OWNER'),
  validateBody(transferCreditsSchema),
  asyncHandler(workspaceController.transferCredits),
);

// Team credit audit — who spent which credits on what. Paid-only, ADMIN+.
workspaceRouter.get(
  '/audit',
  requireRole('ADMIN'),
  requireTeamPlan,
  asyncHandler(workspaceController.teamAudit),
);
workspaceRouter.get(
  '/audit/export',
  requireRole('ADMIN'),
  requireTeamPlan,
  asyncHandler(workspaceController.exportTeamAudit),
);
workspaceRouter.patch(
  '/',
  requireRole('ADMIN'),
  validateBody(updateWorkspaceSchema),
  asyncHandler(workspaceController.update),
);

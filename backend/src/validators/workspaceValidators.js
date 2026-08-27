import { z } from 'zod';

// Workspace branding (Settings → Workspace) — name is required, motto is an
// optional one-liner. Sending motto: "" or null clears it.
export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(120),
  motto: z.string().trim().max(140).nullish(),
});

// OWNER is deliberately not invitable — ownership stays with whoever created
// the workspace until a real ownership-transfer flow exists.
export const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

// Bulk add: up to 200 addresses per request (MAX_BULK_INVITE_EMAILS in
// workspaceService). Bad addresses fail per-email, not the whole batch.
export const bulkInviteSchema = z.object({
  emails: z.array(z.string().trim().toLowerCase().email()).min(1).max(200),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

// Owner assigns a member to a paid/free seat (or back to pending). Capacity
// is enforced in seatService.assignSeat where the block count is known.
export const assignSeatSchema = z.object({
  seatType: z.enum(['PAID', 'FREE', 'PENDING']),
});

// Owner -> teammate personal credit transfer. 100k ceiling is a sanity
// bound, not a product rule — the real limit is the owner's own balance.
export const transferCreditsSchema = z.object({
  toUserId: z.string().uuid(),
  amount: z.number().int().min(1).max(100_000),
});

// Change an existing member between teammate (MEMBER) and admin. OWNER can't
// be set or unset here (see workspaceService.changeMemberRole).
export const changeMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

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

// Change an existing member between teammate (MEMBER) and admin. OWNER can't
// be set or unset here (see workspaceService.changeMemberRole).
export const changeMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

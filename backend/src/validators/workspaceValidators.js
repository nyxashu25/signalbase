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

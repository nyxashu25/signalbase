import { z } from 'zod';

export const renameWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(120),
});

// OWNER is deliberately not invitable — ownership stays with whoever created
// the workspace until a real ownership-transfer flow exists.
export const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

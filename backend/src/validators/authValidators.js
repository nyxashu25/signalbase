import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(1).max(120),
  orgName: z.string().trim().min(1).max(120),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  // Optional: disambiguates when a user belongs to more than one workspace.
  // Defaults to the user's oldest membership.
  workspaceId: z.string().uuid().optional(),
});

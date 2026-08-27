import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(1).max(120),
  // Optional — signup no longer asks for a workspace name; one is
  // auto-created and named after the user, renameable later.
  orgName: z.string().trim().min(1).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  // Optional: disambiguates when a user belongs to more than one workspace.
  // Defaults to the user's oldest membership.
  workspaceId: z.string().uuid().optional(),
});

// The ID token (a signed JWT) Google Identity Services hands the frontend
// after the user picks an account — verified server-side in
// authService.loginWithGoogle, never trusted as-is.
export const googleLoginSchema = z.object({
  credential: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
});

export const updatePreferencesSchema = z.object({
  marketingOptOut: z.boolean(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(200),
});

export const inviteInfoQuerySchema = z.object({
  token: z.string().min(1),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200).optional(),
});

export const switchWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

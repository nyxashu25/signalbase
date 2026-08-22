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

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

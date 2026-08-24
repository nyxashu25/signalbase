import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { rateLimit, byIp } from '../middleware/rateLimit.js';
import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  updateProfileSchema,
  updatePreferencesSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteInfoQuerySchema,
  acceptInviteSchema,
  switchWorkspaceSchema,
} from '../validators/authValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRouter = Router();

// Per-IP: these are the two routes a credential-stuffing / signup-spam bot
// actually hits, unlike everything else behind requireAuth already.
const loginLimiter = rateLimit({ limit: 10, windowSeconds: 60, prefix: 'login', keyFn: byIp });
const registerLimiter = rateLimit({
  limit: 5,
  windowSeconds: 60 * 60,
  prefix: 'register',
  keyFn: byIp,
});

authRouter.post(
  '/register',
  registerLimiter,
  validateBody(registerSchema),
  asyncHandler(authController.register),
);
authRouter.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login),
);
authRouter.post(
  '/google',
  loginLimiter,
  validateBody(googleLoginSchema),
  asyncHandler(authController.google),
);
authRouter.post(
  '/verify-email',
  validateBody(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);
// Same limiter budget/prefix as register — the abuse case is identical (a
// bot spamming the mailer), just against a different route.
authRouter.post(
  '/resend-verification',
  registerLimiter,
  validateBody(resendVerificationSchema),
  asyncHandler(authController.resendVerification),
);
// Same budget/prefix as register — the abuse case is a bot spamming the
// mailer with reset requests.
authRouter.post(
  '/forgot-password',
  registerLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);
authRouter.post(
  '/reset-password',
  loginLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);
// Public: the accept page loads this before the user commits. The token is
// the credential; rate-limited against token guessing.
authRouter.get(
  '/invite',
  loginLimiter,
  validateQuery(inviteInfoQuerySchema),
  asyncHandler(authController.inviteInfo),
);
authRouter.post(
  '/accept-invite',
  registerLimiter,
  validateBody(acceptInviteSchema),
  asyncHandler(authController.acceptInvite),
);
authRouter.get('/workspaces', requireAuth, asyncHandler(authController.listWorkspaces));
authRouter.post(
  '/switch-workspace',
  requireAuth,
  validateBody(switchWorkspaceSchema),
  asyncHandler(authController.switchWorkspace),
);
authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.post('/logout', asyncHandler(authController.logout));
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
authRouter.patch(
  '/me',
  requireAuth,
  validateBody(updateProfileSchema),
  asyncHandler(authController.updateProfile),
);
authRouter.patch(
  '/me/preferences',
  requireAuth,
  validateBody(updatePreferencesSchema),
  asyncHandler(authController.updatePreferences),
);
// Same per-IP budget as login — a wrong "current password" is the same
// guessing surface as a wrong login password.
authRouter.post(
  '/change-password',
  requireAuth,
  loginLimiter,
  validateBody(changePasswordSchema),
  asyncHandler(authController.changePassword),
);
authRouter.post('/tutorial-complete', requireAuth, asyncHandler(authController.completeTutorial));

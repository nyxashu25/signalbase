import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { rateLimit, byIp } from '../middleware/rateLimit.js';
import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
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
authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.post('/logout', asyncHandler(authController.logout));
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
authRouter.post('/tutorial-complete', requireAuth, asyncHandler(authController.completeTutorial));

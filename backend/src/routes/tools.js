import { Router } from 'express';
import * as toolsController from '../controllers/toolsController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { checkEmailSchema } from '../validators/toolsValidators.js';
import { rateLimit, byWorkspace } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const toolsRouter = Router();

toolsRouter.use(requireAuth);

// Free (no credit charge), but rate-limited — each call hits the metered
// Hunter.io API (see emailVerifierService.js), so this still needs a ceiling
// even without a credit cost attached to it.
const verifyEmailLimiter = rateLimit({
  limit: 30,
  windowSeconds: 60 * 60,
  prefix: 'verify-email',
  keyFn: byWorkspace,
});

toolsRouter.post(
  '/verify-email',
  verifyEmailLimiter,
  validateBody(checkEmailSchema),
  asyncHandler(toolsController.checkEmail),
);

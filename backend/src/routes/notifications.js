import { Router } from 'express';
import * as notificationsController from '../controllers/notificationsController.js';
import { validateBody } from '../middleware/validate.js';
import { unsubscribeSchema } from '../validators/notificationValidators.js';
import { rateLimit, byIp } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const notificationsRouter = Router();

// Deliberately no requireAuth, same reasoning as privacy.js's opt-out route —
// the token itself (mailed to the user) is the credential here.
const unsubscribeLimiter = rateLimit({
  limit: 20,
  windowSeconds: 60 * 60,
  prefix: 'unsubscribe',
  keyFn: byIp,
});

notificationsRouter.post(
  '/unsubscribe',
  unsubscribeLimiter,
  validateBody(unsubscribeSchema),
  asyncHandler(notificationsController.unsubscribe),
);

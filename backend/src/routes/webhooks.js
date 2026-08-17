import { Router } from 'express';
import * as webhookController from '../controllers/webhookController.js';
import * as billingController from '../controllers/billingController.js';
import { verifyWebhookSignature } from '../middleware/verifyWebhookSignature.js';
import { validateBody } from '../middleware/validate.js';
import { espWebhookSchema } from '../validators/webhookValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const webhooksRouter = Router();

// No requireAuth on either route below — the caller is an external
// provider, not a logged-in user. Authentication is each provider's own
// signature scheme, not a session.
webhooksRouter.post(
  '/esp',
  verifyWebhookSignature,
  validateBody(espWebhookSchema),
  asyncHandler(webhookController.esp),
);

// Stripe verifies + parses the body itself (stripeService.verifyAndParseEvent)
// using its own signature scheme — no shared verifyWebhookSignature/validateBody here.
webhooksRouter.post('/stripe', asyncHandler(billingController.stripeWebhook));

import { Router } from 'express';
import * as apiKeyController from '../controllers/apiKeyController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createApiKeySchema } from '../validators/apiKeyValidators.js';
import { rateLimit, byWorkspace } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const apiKeysRouter = Router();

// Session-authenticated (NOT API-key-authenticated) by design: a leaked API
// key must not be able to mint more keys or revoke its siblings — managing
// keys requires the stronger browser credential.
apiKeysRouter.use(requireAuth);

// Above the 10-active-keys service cap, so the cap's clearer 422 (not this
// limiter's 429) is what a user bumping the ceiling sees.
const createLimiter = rateLimit({
  limit: 20,
  windowSeconds: 60 * 60,
  prefix: 'apikey-create',
  keyFn: byWorkspace,
});

apiKeysRouter.get('/', asyncHandler(apiKeyController.list));
apiKeysRouter.post(
  '/',
  createLimiter,
  validateBody(createApiKeySchema),
  asyncHandler(apiKeyController.create),
);
apiKeysRouter.delete('/:id', asyncHandler(apiKeyController.revoke));

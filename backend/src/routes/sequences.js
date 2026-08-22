import { Router } from 'express';
import * as sequenceController from '../controllers/sequenceController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createSequenceSchema, enrollSchema } from '../validators/sequenceValidators.js';
import { reserveCredits, releaseOnError } from '../middleware/reserveCredits.js';
import { requireSequencesPlan } from '../middleware/requireSequencesPlan.js';
import { rateLimit, byWorkspace } from '../middleware/rateLimit.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const sequencesRouter = Router();

sequencesRouter.use(requireAuth);

const createLimiter = rateLimit({
  limit: 20,
  windowSeconds: 60 * 60,
  prefix: 'sequence-create',
  keyFn: byWorkspace,
});

sequencesRouter.get('/', asyncHandler(sequenceController.index));
// Declared before /:id so the literal path wins.
sequencesRouter.get('/analytics', asyncHandler(sequenceController.workspaceAnalytics));
sequencesRouter.get('/:id', asyncHandler(sequenceController.show));
sequencesRouter.get('/:id/analytics', asyncHandler(sequenceController.analytics));
sequencesRouter.post(
  '/',
  requireSequencesPlan,
  createLimiter,
  validateBody(createSequenceSchema),
  asyncHandler(sequenceController.create),
);
sequencesRouter.post(
  '/:id/activate',
  requireSequencesPlan,
  asyncHandler(sequenceController.activate),
);
sequencesRouter.post(
  '/:id/enrollments',
  requireSequencesPlan,
  validateBody(enrollSchema),
  reserveCredits(CREDIT_COSTS.SEQUENCE_ENROLLMENT),
  asyncHandler(sequenceController.enroll),
  releaseOnError,
);
sequencesRouter.post('/enrollments/:enrollmentId/pause', asyncHandler(sequenceController.pause));
sequencesRouter.post('/enrollments/:enrollmentId/resume', asyncHandler(sequenceController.resume));
sequencesRouter.post(
  '/enrollments/:enrollmentId/unenroll',
  asyncHandler(sequenceController.unenroll),
);

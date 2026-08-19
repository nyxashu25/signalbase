import { Router } from 'express';
import * as sequenceController from '../controllers/sequenceController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createSequenceSchema, enrollSchema } from '../validators/sequenceValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const sequencesRouter = Router();

sequencesRouter.use(requireAuth);

sequencesRouter.get('/', asyncHandler(sequenceController.index));
sequencesRouter.get('/:id', asyncHandler(sequenceController.show));
sequencesRouter.post(
  '/',
  validateBody(createSequenceSchema),
  asyncHandler(sequenceController.create),
);
sequencesRouter.post('/:id/activate', asyncHandler(sequenceController.activate));
sequencesRouter.post(
  '/:id/enrollments',
  validateBody(enrollSchema),
  asyncHandler(sequenceController.enroll),
);
sequencesRouter.post('/enrollments/:enrollmentId/pause', asyncHandler(sequenceController.pause));
sequencesRouter.post('/enrollments/:enrollmentId/resume', asyncHandler(sequenceController.resume));
sequencesRouter.post(
  '/enrollments/:enrollmentId/unenroll',
  asyncHandler(sequenceController.unenroll),
);

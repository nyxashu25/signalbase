import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Home-screen data: the getting-started checklist (which also pays out
// any unpaid rewards — see onboardingService.getProgress) and the stat
// tiles. Both are reads from the client's point of view; GET is correct.
export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/onboarding', asyncHandler(dashboardController.onboarding));
dashboardRouter.get('/stats', asyncHandler(dashboardController.stats));

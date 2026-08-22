import * as onboardingService from '../services/onboardingService.js';

export async function onboarding(req, res) {
  const progress = await onboardingService.getProgress(req.auth.workspaceId, req.auth.userId);
  res.json(progress);
}

export async function stats(req, res) {
  const result = await onboardingService.getStats(req.auth.workspaceId);
  res.json(result);
}

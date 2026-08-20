import { prisma } from '../config/db.js';
import { ApiError } from './errorHandler.js';
import { planIncludesSequences } from '../config/planConfig.js';

/**
 * Gates Sequences (create/activate/enroll) to plans that include it — see
 * config/planConfig.js. Looked up fresh per request rather than trusting a
 * JWT-embedded plan, since a plan can change (upgrade, downgrade, admin
 * override) without the holder re-authenticating.
 */
export async function requireSequencesPlan(req, res, next) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.auth.workspaceId },
      select: { plan: true },
    });
    if (!workspace || !planIncludesSequences(workspace.plan)) {
      throw new ApiError(
        403,
        'Sequences aren’t available on the Free plan. Upgrade your workspace to build and enroll contacts into sequences.',
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

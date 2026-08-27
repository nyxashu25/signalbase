import { prisma } from '../config/db.js';
import { ApiError } from './errorHandler.js';
import { planIncludesTeam } from '../config/planConfig.js';

/**
 * Gates the team features (invite teammates, change roles, team audit) to
 * paid plans — see config/planConfig.js. Looked up fresh per request rather
 * than trusting a JWT-embedded plan, since a plan can change (upgrade,
 * downgrade, admin override) without the holder re-authenticating. Same
 * shape as requireSequencesPlan.
 */
export async function requireTeamPlan(req, res, next) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.auth.workspaceId },
      select: { plan: true },
    });
    if (!workspace || !planIncludesTeam(workspace.plan)) {
      throw new ApiError(
        403,
        'Team features aren’t available on the Free plan. Upgrade your workspace from Billing to invite teammates and manage roles.',
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

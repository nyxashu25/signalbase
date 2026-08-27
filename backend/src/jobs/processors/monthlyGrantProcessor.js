import { sweepFreeUserGrants } from '../../services/creditGrantService.js';
import { logger } from '../../config/logger.js';

// Every 6h (see worker.js): re-grants FREE_PLAN_MONTHLY_CREDITS to free
// users whose last personal grant is a month or more old. Paid-workspace
// grants are NOT swept — they ride Stripe's invoice.paid webhook.
export async function monthlyGrantProcessor() {
  const { grantedCount } = await sweepFreeUserGrants();
  if (grantedCount > 0) {
    logger.info({ grantedCount }, 'monthly-grant sweep granted free-plan credits');
  }
}

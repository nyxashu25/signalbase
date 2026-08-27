import { reconcileAllUsers } from '../../services/reconciliationService.js';
import { logger } from '../../config/logger.js';

export async function reconciliationProcessor() {
  const { checked, driftCount } = await reconcileAllUsers();
  if (driftCount > 0) {
    logger.error({ checked, driftCount }, 'Reconciliation found drifted user balances');
  }
}

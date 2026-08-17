import { reapExpiredReservations } from '../../services/creditService.js';
import { logger } from '../../config/logger.js';

export async function creditReaperProcessor() {
  const count = await reapExpiredReservations();
  if (count > 0) {
    logger.info({ count }, 'Credit reaper refunded expired reservations');
  }
}

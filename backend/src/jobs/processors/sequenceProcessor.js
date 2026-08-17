import { processDueEnrollments } from '../../services/sequenceService.js';
import { logger } from '../../config/logger.js';

export async function sequenceProcessor() {
  const processed = await processDueEnrollments();
  if (processed > 0) {
    logger.info({ processed }, 'Sequence tick advanced enrollments');
  }
}

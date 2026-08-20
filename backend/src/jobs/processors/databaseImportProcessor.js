import { processImportBatch } from '../../services/databaseImportService.js';

export async function databaseImportProcessor(job) {
  await processImportBatch(job.data);
}

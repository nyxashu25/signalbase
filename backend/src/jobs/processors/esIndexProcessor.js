import { indexOne } from '../../services/indexerService.js';

export async function esIndexProcessor(job) {
  const { type, id } = job.data;
  await indexOne(type, id);
}

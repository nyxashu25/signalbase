import { z } from 'zod';

export const createListSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['CONTACTS', 'COMPANIES']),
});

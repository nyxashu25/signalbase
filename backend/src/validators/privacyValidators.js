import { z } from 'zod';

export const optOutSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  reason: z.string().trim().max(500).optional(),
});

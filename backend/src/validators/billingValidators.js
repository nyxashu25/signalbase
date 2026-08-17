import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  credits: z.number().int().positive().max(100_000),
});

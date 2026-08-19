import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  credits: z.number().int().positive().max(100_000),
});

export const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

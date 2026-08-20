import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  credits: z.number().int().positive().max(100_000),
  currency: z.enum(['USD', 'INR']).optional(),
});

export const createPlanSubscriptionSchema = z.object({
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'ORGANIZATION']),
});

export const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

export const saveStripeSettingsSchema = z.object({
  secretKey: z.string().trim().min(1).max(500).optional(),
  webhookSecret: z.string().trim().min(1).max(500).optional(),
});

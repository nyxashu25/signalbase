import { z } from 'zod';

// 200 floor matches CUSTOM_CREDITS_MIN in config/creditPackages.js — every
// preset package is comfortably above it, so this also just works for them.
export const createCheckoutSessionSchema = z.object({
  credits: z.number().int().min(200).max(50_000),
  currency: z.enum(['USD', 'INR']).optional(),
});

export const createPlanSubscriptionSchema = z.object({
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'ORGANIZATION']),
  interval: z.enum(['MONTH', 'QUARTER', 'YEAR']).optional(),
  // Per-plan minimums (Organization: 3) are enforced in stripeService where
  // the plan is known; 50 matches MAX_SEATS in config/planConfig.js.
  seats: z.number().int().min(1).max(50).default(1),
});

// Matches CUSTOM_CREDITS_MIN/MAX in config/creditPackages.js.
export const customCreditsQuerySchema = z.object({
  credits: z.coerce.number().int().min(200).max(50_000),
});

export const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

export const saveStripeSettingsSchema = z.object({
  secretKey: z.string().trim().min(1).max(500).optional(),
  webhookSecret: z.string().trim().min(1).max(500).optional(),
});

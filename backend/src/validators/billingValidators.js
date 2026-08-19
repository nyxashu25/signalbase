import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  credits: z.number().int().positive().max(100_000),
  currency: z.enum(['USD', 'INR']).optional(),
});

export const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

export const verifyRazorpayPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

export const saveRazorpaySettingsSchema = z.object({
  keyId: z.string().trim().min(1).max(200).optional(),
  keySecret: z.string().trim().min(1).max(500).optional(),
  webhookSecret: z.string().trim().min(1).max(500).optional(),
});

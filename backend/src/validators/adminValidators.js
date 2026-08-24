import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().trim().max(200).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

export const addCreditsSchema = z.object({
  amount: z
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((n) => n !== 0, 'amount must not be zero'),
});

export const updateUserPlanSchema = z.object({
  plan: z.enum(['FREE', 'BASIC', 'PROFESSIONAL', 'ORGANIZATION']),
  seats: z.number().int().min(1).max(500).optional(),
});

export const sendPromotionSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  userId: z.string().uuid().optional(),
});

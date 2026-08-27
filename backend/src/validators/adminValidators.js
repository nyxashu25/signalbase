import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().trim().max(200).optional(),
  // 'true' flips the listing to soft-deleted accounts only. (String enum,
  // not z.coerce.boolean() — that would turn the string "false" into true.)
  deleted: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

// Per-user personal credit adjustment: 'add' grants amount, 'remove'
// deducts up to their balance (never below zero), 'set' moves the balance
// to exactly amount. Default 'add' keeps older clients working.
export const adjustCreditsSchema = z.object({
  mode: z.enum(['add', 'remove', 'set']).default('add'),
  amount: z.number().int().min(0).max(1_000_000),
});

export const updateUserPlanSchema = z.object({
  plan: z.enum(['FREE', 'BASIC', 'PROFESSIONAL', 'ORGANIZATION']),
  // Seat blocks (planConfig.BLOCK_CONFIG) — 200 matches MAX_BLOCKS.
  blocks: z.number().int().min(1).max(200).optional(),
});

export const sendPromotionSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
});

// Extension-sourcing queues ("Pending peoples" / "Childs found") — the
// status filter defaults to the actionable queue; ADDED/APPLIED/DISMISSED
// views exist for history.
export const missingPersonsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  status: z.enum(['PENDING', 'ADDED', 'DISMISSED']).default('PENDING'),
});

export const resolveMissingPersonSchema = z.object({
  resolution: z.enum(['ADDED', 'DISMISSED']),
});

export const lostChildrenQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  status: z.enum(['PENDING', 'APPLIED', 'DISMISSED']).default('PENDING'),
});

export const resolveLostChildSchema = z.object({
  resolution: z.enum(['APPLIED', 'DISMISSED']),
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  userId: z.string().uuid().optional(),
});

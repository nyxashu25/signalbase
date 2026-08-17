import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  ELASTICSEARCH_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(30 * 24 * 60 * 60),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Unset in every environment right now — see emailVerifierService.js.
  EMAIL_VERIFIER_API_KEY: z.string().optional(),

  // Unset in every environment right now — see espService.js. When unset,
  // sends are simulated (logged, not delivered) so sequences are fully
  // exercisable in local/demo/test without a real ESP account.
  ESP_API_KEY: z.string().optional(),
  // Always required (unlike the above) — used to verify inbound webhook
  // signatures even while sends themselves are simulated.
  ESP_WEBHOOK_SECRET: z.string().min(16),

  // Optional — see stripeService.js. When unset, checkout session creation
  // is simulated; webhook signature verification still works (it only
  // needs STRIPE_WEBHOOK_SECRET, not a live API key).
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(16),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // Fail fast: a missing/invalid env var should never surface as a runtime crash later.
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

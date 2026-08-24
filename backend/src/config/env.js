import { z } from 'zod';
import dotenv from 'dotenv';

// override: true is required — @prisma/client's generated runtime has its
// own unconditional, NODE_ENV-unaware ".env" auto-loader that can run
// before this line does, depending on module import order across a test
// file's dependency graph. dotenv's default (override: false) would then
// treat DATABASE_URL etc. as "already set" and silently keep Prisma's
// wrong (dev) values instead of ours — pointing tests at the dev database.
// Forcing an override here means this call always wins, regardless of
// what ran first.
dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env', override: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  ELASTICSEARCH_URL: z.string().url(),
  // Prepended to every Elasticsearch index name. Empty in dev/prod; set to
  // "test-" in .env.test so the test suite creates/wipes its own indices
  // instead of the ones `npm run dev` searches (same isolation the test
  // Postgres DB and Redis DB index provide).
  ES_INDEX_PREFIX: z.string().default(''),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  // Deliberately a separate secret from the tenant JWT_ACCESS_SECRET above —
  // a wrong-secret signature failure is a stronger guarantee than an
  // audience-claim check alone. See routes/admin.js.
  ADMIN_JWT_SECRET: z.string().min(32, 'ADMIN_JWT_SECRET must be at least 32 characters'),
  ADMIN_ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(12 * 60 * 60),
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

  // Extra allowed CORS origins for the Chrome extension, comma-separated —
  // e.g. "chrome-extension://abcdefghijklmnop". Empty means none. (MV3
  // background fetches with host_permissions usually bypass CORS anyway;
  // this covers content-script-context calls and other browsers.)
  EXTENSION_ORIGINS: z.string().default(''),

  // Google OAuth client — "Sign in with Google" verifies the ID token
  // Google Identity Services hands the frontend against this audience (see
  // authService.loginWithGoogle). Unset in an environment that hasn't
  // configured it yet: the endpoint responds 503 rather than crashing at
  // boot, same posture as EMAIL_VERIFIER_API_KEY/ESP_API_KEY below.
  GOOGLE_CLIENT_ID: z.string().optional(),

  // Unset in every environment right now — see emailVerifierService.js.
  EMAIL_VERIFIER_API_KEY: z.string().optional(),

  // Unset in every environment right now — see espService.js. When unset,
  // sends are simulated (logged, not delivered) so sequences are fully
  // exercisable in local/demo/test without a real ESP account.
  ESP_API_KEY: z.string().optional(),
  // Required once ESP_API_KEY is set — SendGrid rejects sends whose "from"
  // isn't a verified sender/domain on the account. Validated at call time
  // (not here) since it's only conditionally required.
  ESP_FROM_EMAIL: z.string().email().optional(),
  // Always required (unlike the above) — used to verify inbound webhook
  // signatures even while sends themselves are simulated.
  ESP_WEBHOOK_SECRET: z.string().min(16),

  // Resend — DataPit's own transactional/notification mail (verification,
  // tickets, billing, promotional broadcasts). A separate provider/concern
  // from ESP_API_KEY above (that one is the sequence engine sending to
  // prospects on a workspace's behalf). Same gated posture: unset means
  // simulated sends — see resendService.js.
  RESEND_API_KEY: z.string().optional(),
  // Defaults to Resend's shared sandbox sender, which only delivers to the
  // Resend account's own address until a real domain is verified in Resend —
  // production uses no-reply@datapit.io (domain verified 2026-08-24).
  RESEND_FROM_EMAIL: z.string().email().default('onboarding@resend.dev'),

  // AES-256-GCM key (32 bytes, hex-encoded = 64 chars) for encrypting secrets
  // stored in the database — currently the Stripe secret key and webhook
  // secret an admin pastes into /control/settings (see
  // paymentSettingsService.js/stripeService.js; there are no
  // STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET env vars — Stripe is configured
  // entirely from the admin panel, not deploy-time config). Always required
  // (not gated like the provider keys above) since it's infra, not a
  // provider integration itself. Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  SETTINGS_ENCRYPTION_KEY: z
    .string()
    .length(64, 'SETTINGS_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)')
    .regex(/^[0-9a-f]+$/i, 'SETTINGS_ENCRYPTION_KEY must be hex'),
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

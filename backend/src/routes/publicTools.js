import { Router } from 'express';
import * as publicToolsController from '../controllers/publicToolsController.js';
import { validateBody } from '../middleware/validate.js';
import {
  publicVerifyEmailSchema,
  publicFindEmailSchema,
} from '../validators/publicToolsValidators.js';
import { rateLimit, byIp } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// The free, signed-out tools and email-format pages on datapit.io. No
// auth; the tools are rate-limited per client IP instead (app.js trusts
// X-Forwarded-For only from a loopback/private proxy, so req.ip is the real
// client, not a spoofable header entry). Errors use the usual
// { error: { message } } shape; a 429 carries Retry-After.
//
// POST /public/tools/verify-email   { email }          20 per hour per IP
//   -> { email, verdict: 'valid'|'risky'|'invalid',
//        reason: 'ok'|'invalid_syntax'|'no_domain'|'no_mail_server'|'disposable'|'role_account',
//        checks: { syntax, domainExists, mxRecords, disposable, roleAccount, freeProvider },
//        mxHosts: string[] (<= 5, by priority), note: string }
//   DNS only (MX, A/AAAA) — no SMTP probing; the address is never stored
//   or logged. See services/emailCheckService.js.
//
// POST /public/tools/find-email     { firstName, lastName, domain }   10 per 24h per IP
//   -> { domain, company: { name } | null, found, maskedEmail: 'j***.d**@acme.com' | null,
//        pattern: { pattern, share, sampleSize } | null, suggestion: string | null,
//        signupUrl: '/login?mode=register' }
//   Only ever a masked address; `suggestion` (a pattern guess) is null
//   whenever maskedEmail is set. See services/publicFinderService.js.
//
// GET /public/email-formats          -> { minContacts: 5, generatedAt, companies: CompanyFormat[] }
// GET /public/email-formats/:domain  -> CompanyFormat, or 404
//   CompanyFormat { domain, name, industry, size, location, sampleSize,
//                   patterns: [{ pattern, share, count, example }], updated: 'YYYY-MM-DD' }
//   Shares are two-decimal and add up to exactly 1 (largest remainder).
//   Aggregate counts only; every example is "Jane Doe". Cached in Redis
//   for an hour. See services/emailFormatService.js.
export const publicToolsRouter = Router();

const verifyEmailLimiter = rateLimit({
  limit: 20,
  windowSeconds: 60 * 60,
  prefix: 'public-verify-email',
  keyFn: byIp,
});

const findEmailLimiter = rateLimit({
  limit: 10,
  windowSeconds: 24 * 60 * 60,
  prefix: 'public-find-email',
  keyFn: byIp,
});

publicToolsRouter.post(
  '/tools/verify-email',
  verifyEmailLimiter,
  validateBody(publicVerifyEmailSchema),
  asyncHandler(publicToolsController.verifyEmail),
);

publicToolsRouter.post(
  '/tools/find-email',
  findEmailLimiter,
  validateBody(publicFindEmailSchema),
  asyncHandler(publicToolsController.findEmail),
);

publicToolsRouter.get('/email-formats', asyncHandler(publicToolsController.listFormats));

publicToolsRouter.get('/email-formats/:domain', asyncHandler(publicToolsController.getFormat));

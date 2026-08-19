import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const HUNTER_ENDPOINT = 'https://api.hunter.io/v2/email-verifier';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Hunter.io's email-verifier endpoint, gated behind EMAIL_VERIFIER_API_KEY.
 * Unset key means every pattern-guessed email comes back unchecked — see
 * revealService.js, which only hard-blocks a reveal on an *active* negative
 * confirmation (checked: true, verified: false), never on "unknown".
 */
export async function verifyEmail(email) {
  if (!env.EMAIL_VERIFIER_API_KEY) {
    return { verified: false, checked: false, reason: 'no_provider_configured' };
  }

  const url = new URL(HUNTER_ENDPOINT);
  url.searchParams.set('email', email);
  url.searchParams.set('api_key', env.EMAIL_VERIFIER_API_KEY);

  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = body?.errors?.[0]?.details ?? '';
    throw new Error(`Hunter.io verification request failed: ${res.status} ${detail}`);
  }

  const { status, result } = body.data;
  logger.info({ email, status, result }, 'Email verified via Hunter.io');

  return {
    verified: result === 'deliverable',
    checked: true,
    reason: status,
  };
}

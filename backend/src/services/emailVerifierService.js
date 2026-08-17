import { env } from '../config/env.js';

/**
 * Interface stub — per README, provider lookups return "unknown" until a
 * real key is configured. TODO once a provider is chosen: SMTP handshake,
 * MX record check, catch-all domain detection.
 */
// eslint-disable-next-line no-unused-vars -- part of the real interface; unused only in this stub branch
export async function verifyEmail(email) {
  if (!env.EMAIL_VERIFIER_API_KEY) {
    return { verified: false, checked: false, reason: 'no_provider_configured' };
  }

  throw new Error('Email verification provider integration not implemented yet');
}

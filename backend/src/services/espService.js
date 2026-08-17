import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Interface stub — no real ESP (SendGrid/SES) wired up. Unlike the email
 * finder (Phase 03), there's no meaningful "real" local implementation of
 * actually delivering email, so the stub simulates a successful send
 * (logged, not delivered) rather than erroring — this is what lets the
 * sequence engine be fully exercised locally/in CI without a real account.
 * TODO once a provider is chosen: real API call here, keyed by ESP_API_KEY.
 */
// eslint-disable-next-line no-unused-vars -- body is part of the real interface; unused only in this stub branch
export async function sendEmail({ to, subject, body }) {
  if (!env.ESP_API_KEY) {
    const messageId = `simulated-${randomUUID()}`;
    logger.info({ to, subject, messageId }, 'ESP send simulated (no ESP_API_KEY configured)');
    return { sent: true, provider: 'simulated', messageId };
  }

  throw new Error('ESP provider integration not implemented yet');
}

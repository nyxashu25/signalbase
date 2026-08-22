import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Resend's Emails API, gated behind RESEND_API_KEY — same simulate-when-
 * unconfigured posture as espService.js, but a different concern: this is
 * DataPit's own notification mail (verification, tickets, billing,
 * promotions), not the sequence engine's prospect outreach.
 *
 * Unlike espService, this never throws. A Resend outage must never break
 * registration, a ticket reply, or a checkout — callers fire this and move
 * on regardless of whether delivery actually succeeded.
 */
export async function sendEmail({ to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    const messageId = `simulated-${randomUUID()}`;
    logger.info({ to, subject, messageId }, 'Resend send simulated (no RESEND_API_KEY configured)');
    return { sent: true, provider: 'simulated', messageId };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [to], subject, html }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      logger.error({ to, subject, status: res.status, errBody }, 'Resend send failed');
      return { sent: false, provider: 'resend' };
    }

    const body = await res.json().catch(() => ({}));
    logger.info({ to, subject, messageId: body.id }, 'Notification email delivered via Resend');
    return { sent: true, provider: 'resend', messageId: body.id };
  } catch (err) {
    logger.error({ to, subject, err: err.message }, 'Resend send threw');
    return { sent: false, provider: 'resend' };
  }
}

import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * SendGrid's v3 Mail Send API, gated behind ESP_API_KEY. Unset key means
 * sends are simulated (logged, not delivered) — this is what lets the
 * sequence engine be fully exercised locally/in CI without a real account.
 */
export async function sendEmail({ to, subject, body }) {
  if (!env.ESP_API_KEY) {
    const messageId = `simulated-${randomUUID()}`;
    logger.info({ to, subject, messageId }, 'ESP send simulated (no ESP_API_KEY configured)');
    return { sent: true, provider: 'simulated', messageId };
  }

  if (!env.ESP_FROM_EMAIL) {
    throw new Error('ESP_API_KEY is set but ESP_FROM_EMAIL is not — SendGrid requires a verified sender');
  }

  const res = await fetch(SENDGRID_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.ESP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: env.ESP_FROM_EMAIL },
      subject,
      content: [{ type: 'text/plain', value: body }],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`SendGrid send failed: ${res.status} ${errBody}`);
  }

  // SendGrid returns 202 Accepted with an empty body — the message id comes
  // back in the X-Message-Id response header, not the payload.
  const messageId = res.headers.get('x-message-id') ?? `sendgrid-${randomUUID()}`;
  logger.info({ to, subject, messageId }, 'ESP send delivered via SendGrid');
  return { sent: true, provider: 'sendgrid', messageId };
}

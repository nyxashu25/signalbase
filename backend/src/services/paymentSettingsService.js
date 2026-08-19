import { prisma } from '../config/db.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';

// Single row, id fixed by convention (see schema.prisma comment) rather
// than a real multi-tenant/multi-provider key — there's exactly one
// payment gateway for the whole platform right now.
const SETTINGS_ID = 'stripe';

/**
 * Admin-facing read: never returns the decrypted secret, only whether one
 * is set and its last 4 characters — enough to recognize "yes that's the
 * key I pasted" without ever re-displaying the full secret over the wire.
 */
export async function getStripeSettings() {
  const row = await prisma.paymentGatewaySettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) {
    return { configured: false, keySecretLast4: null, hasWebhookSecret: false };
  }

  return {
    configured: Boolean(row.keySecretEncrypted),
    keySecretLast4: row.keySecretEncrypted ? decryptSecret(row.keySecretEncrypted).slice(-4) : null,
    hasWebhookSecret: Boolean(row.webhookSecretEncrypted),
    updatedAt: row.updatedAt,
  };
}

/**
 * secretKey/webhookSecret are optional on every call — an admin rotating
 * just the webhook secret shouldn't have to re-paste the secret key they
 * already saved. Blank/omitted means "leave as is", not "clear it".
 */
export async function saveStripeSettings({ secretKey, webhookSecret }, updatedById) {
  const data = { updatedById };
  if (secretKey) data.keySecretEncrypted = encryptSecret(secretKey);
  if (webhookSecret) data.webhookSecretEncrypted = encryptSecret(webhookSecret);

  await prisma.paymentGatewaySettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  return getStripeSettings();
}

/**
 * Internal use only (stripeService) — the actual decrypted credentials.
 * secretKey and webhookSecret are independent capabilities (checkout
 * creation vs. webhook verification) — either can be configured without
 * the other, so neither gates the other here. Each null individually.
 */
export async function getDecryptedStripeCredentials() {
  const row = await prisma.paymentGatewaySettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return null;

  return {
    secretKey: row.keySecretEncrypted ? decryptSecret(row.keySecretEncrypted) : null,
    webhookSecret: row.webhookSecretEncrypted ? decryptSecret(row.webhookSecretEncrypted) : null,
  };
}

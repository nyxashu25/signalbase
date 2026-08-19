import { prisma } from '../config/db.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';

// Single row, id fixed by convention (see schema.prisma comment) rather
// than a real multi-tenant/multi-provider key — there's exactly one
// payment gateway for the whole platform right now.
const SETTINGS_ID = 'razorpay';

/**
 * Admin-facing read: never returns the decrypted secret, only whether one
 * is set and its last 4 characters — enough to recognize "yes that's the
 * key I pasted" without ever re-displaying the full secret over the wire.
 */
export async function getRazorpaySettings() {
  const row = await prisma.paymentGatewaySettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) {
    return { configured: false, keyId: null, keySecretLast4: null, hasWebhookSecret: false };
  }

  return {
    configured: Boolean(row.keyId && row.keySecretEncrypted),
    keyId: row.keyId,
    keySecretLast4: row.keySecretEncrypted ? decryptSecret(row.keySecretEncrypted).slice(-4) : null,
    hasWebhookSecret: Boolean(row.webhookSecretEncrypted),
    updatedAt: row.updatedAt,
  };
}

/**
 * keySecret/webhookSecret are optional on every call — an admin updating
 * just the key id (or rotating only the webhook secret) shouldn't have to
 * re-paste a secret they already saved. Blank/omitted means "leave as is",
 * not "clear it" — clearing is a separate explicit action if ever needed.
 */
export async function saveRazorpaySettings({ keyId, keySecret, webhookSecret }, updatedById) {
  const data = { updatedById };
  if (keyId !== undefined) data.keyId = keyId;
  if (keySecret) data.keySecretEncrypted = encryptSecret(keySecret);
  if (webhookSecret) data.webhookSecretEncrypted = encryptSecret(webhookSecret);

  await prisma.paymentGatewaySettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  return getRazorpaySettings();
}

/** Internal use only (razorpayService) — the actual decrypted credentials. */
export async function getDecryptedRazorpayCredentials() {
  const row = await prisma.paymentGatewaySettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row?.keyId || !row?.keySecretEncrypted) return null;

  return {
    keyId: row.keyId,
    keySecret: decryptSecret(row.keySecretEncrypted),
    webhookSecret: row.webhookSecretEncrypted ? decryptSecret(row.webhookSecretEncrypted) : null,
  };
}

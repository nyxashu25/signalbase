import Stripe from 'stripe';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { findPackage } from '../config/creditPackages.js';
import { getDecryptedStripeCredentials } from './paymentSettingsService.js';

const PROCESSED_EVENT_TTL_SECONDS = 30 * 24 * 60 * 60; // Stripe retries for up to ~3 days; comfortable margin

// webhooks.constructEvent is pure local cryptography (HMAC over the payload
// with the signing secret) — it needs no real API key, so a throwaway
// client works for it regardless of whether checkout is configured.
const signatureCheckClient = new Stripe('sk_test_placeholder_unused_for_verification');

export async function verifyAndParseEvent(rawBody, signatureHeader) {
  const credentials = await getDecryptedStripeCredentials();
  if (!credentials?.webhookSecret) {
    throw new ApiError(400, 'Stripe webhook secret is not configured');
  }

  try {
    return signatureCheckClient.webhooks.constructEvent(
      rawBody,
      signatureHeader,
      credentials.webhookSecret,
    );
  } catch {
    throw new ApiError(400, 'Invalid Stripe webhook signature');
  }
}

/** Returns true if this is the first time we've seen this event id (and marks it seen). */
async function claimEvent(eventId) {
  const claimed = await redis.set(
    `stripe:event:${eventId}`,
    '1',
    'EX',
    PROCESSED_EVENT_TTL_SECONDS,
    'NX',
  );
  return claimed === 'OK';
}

async function topUpCredits(session) {
  const { workspaceId, credits, amountCents } = session.metadata ?? {};
  if (!workspaceId || !credits) {
    logger.error({ sessionId: session.id }, 'Stripe session missing workspaceId/credits metadata');
    return;
  }

  const amount = Number(credits);

  // Redis balance and the Postgres ledger move together — a top-up that
  // updated one without the other is exactly the drift reconciliationService
  // watches for, so keep this symmetric with commitReservation's approach.
  await prisma.creditLedgerEntry.create({
    data: {
      workspaceId,
      delta: amount,
      reason: 'TOPUP',
      amountCents: amountCents ? Number(amountCents) : null,
    },
  });
  await redis.incrby(`credits:balance:${workspaceId}`, amount);

  logger.info({ workspaceId, amount, amountCents }, 'Credits topped up from Stripe payment');
}

async function updateSubscriptionState(subscription) {
  await prisma.workspace.updateMany({
    where: { stripeCustomerId: subscription.customer },
    data: {
      stripeSubscriptionId: subscription.status === 'canceled' ? null : subscription.id,
    },
  });
}

export async function handleEvent(event) {
  const isNew = await claimEvent(event.id);
  if (!isNew) {
    logger.info({ eventId: event.id }, 'Stripe event already processed — skipping (redelivery)');
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await topUpCredits(event.data.object);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await updateSubscriptionState(event.data.object);
      break;
    default:
      logger.info({ type: event.type }, 'Unhandled Stripe event type');
  }
}

/**
 * Interface stub, same pattern as espService/emailVerifierService: with no
 * key configured (via /control/settings, not an env var — see
 * paymentSettingsService.js), simulate success so the credit-purchase flow
 * is fully exercisable locally/in demo.
 *
 * makeClient is injectable purely for testing — createCheckoutSession makes
 * a fresh Stripe client per call (the secret key can change at runtime via
 * the admin panel, unlike a boot-time env var), and there's no clean way to
 * mock the Stripe SDK's own HTTP transport, so tests substitute a fake
 * client instead of mocking network calls.
 */
export async function createCheckoutSession(
  { workspaceId, credits, currency = 'USD' },
  makeClient = (key) => new Stripe(key),
) {
  const pkg = findPackage(credits);
  if (!pkg) {
    throw new ApiError(400, 'Unknown credit package');
  }
  const amountMinor = currency === 'INR' ? pkg.inrPaise : pkg.usdCents;

  const credentials = await getDecryptedStripeCredentials();
  if (!credentials?.secretKey) {
    const sessionId = `cs_simulated_${workspaceId}_${Date.now()}`;
    logger.info(
      { workspaceId, credits, amountMinor, currency, sessionId },
      'Stripe checkout session simulated (no key configured in admin settings)',
    );
    return { sessionId, url: `https://billing.simulated.local/checkout/${sessionId}` };
  }

  const stripe = makeClient(credentials.secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: { name: `${credits} DataPit credits` },
          unit_amount: amountMinor,
        },
        quantity: 1,
      },
    ],
    success_url: `${env.CORS_ORIGIN}/app/billing?checkout=success`,
    cancel_url: `${env.CORS_ORIGIN}/app/billing/add-credits?checkout=cancelled`,
    metadata: { workspaceId, credits: String(credits), amountCents: String(amountMinor) },
  });

  return { sessionId: session.id, url: session.url };
}

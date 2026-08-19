import Stripe from 'stripe';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { findPackage } from '../config/creditPackages.js';

// constructEvent is pure local cryptography (HMAC over the payload with the
// webhook signing secret) — it needs no API key and makes no network call,
// so signature verification is fully real and testable even though checkout
// session creation below is stubbed.
const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder_unused_for_verification');

const PROCESSED_EVENT_TTL_SECONDS = 30 * 24 * 60 * 60; // Stripe retries for up to ~3 days; comfortable margin

export function verifyAndParseEvent(rawBody, signatureHeader) {
  try {
    return stripe.webhooks.constructEvent(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);
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
 * key configured, simulate success so the credit-purchase flow is fully
 * exercisable locally. TODO once billing goes live: real
 * stripe.checkout.sessions.create call.
 */
export async function createCheckoutSession({ workspaceId, credits }) {
  const pkg = findPackage(credits);
  if (!pkg) {
    throw new ApiError(400, 'Unknown credit package');
  }
  const amountCents = pkg.usdCents;

  if (!env.STRIPE_SECRET_KEY) {
    const sessionId = `cs_simulated_${workspaceId}_${Date.now()}`;
    logger.info(
      { workspaceId, credits, amountCents, sessionId },
      'Stripe checkout session simulated (no STRIPE_SECRET_KEY)',
    );
    return { sessionId, url: `https://billing.simulated.local/checkout/${sessionId}` };
  }

  // Once wired up for real: stripe.checkout.sessions.create with
  // metadata: { workspaceId, credits, amountCents } — topUpCredits above
  // already reads amountCents back off that metadata.
  throw new Error('Live Stripe checkout integration not implemented yet');
}

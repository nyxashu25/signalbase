import Stripe from 'stripe';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { findPackage, priceCustomCredits } from '../config/creditPackages.js';
import { getDecryptedStripeCredentials } from './paymentSettingsService.js';
import {
  PLAN_MONTHLY_CREDITS,
  PLAN_PRICE_USD_CENTS,
  PLAN_ORDER,
  INTERVAL_MONTHS,
  planPriceForInterval,
} from '../config/planConfig.js';

/** Adds calendar months (not a flat day count) — correct across variable month lengths. */
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

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

// Sets the plan and links the subscription — deliberately does NOT grant
// credits here. Stripe always generates an invoice for a new subscription
// (even a $0 one) and fires invoice.paid for it, same as every renewal, so
// granting only happens in grantMonthlyCredits below. Granting in both
// places would double-credit the first cycle.
async function activatePlanSubscription(session) {
  const { workspaceId, plan, interval } = session.metadata ?? {};
  if (!workspaceId || !plan) {
    logger.error(
      { sessionId: session.id },
      'Stripe plan session missing workspaceId/plan metadata',
    );
    return;
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      plan,
      monthlyCreditGrant: PLAN_MONTHLY_CREDITS[plan],
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      billingInterval: interval || 'MONTH',
      // Starts (or restarts) the minimum commitment — every paid checkout
      // is a fresh subscription, whether it's a first purchase, an
      // upgrade, or a downgrade taken after an earlier lock expired.
      planActivatedAt: new Date(),
    },
  });

  logger.info(
    { workspaceId, plan, interval },
    'Workspace plan activated via Stripe subscription checkout',
  );
}

// Fires for every paid subscription invoice, including the very first one —
// the single source of truth for plan credit grants (see
// activatePlanSubscription above). Looked up by stripeSubscriptionId, which
// activatePlanSubscription sets in the same moment the subscription is
// created; Stripe doesn't strictly guarantee checkout.session.completed
// arrives before this event, so on the rare invoice-first ordering this
// grant is silently skipped rather than crediting the wrong (or no)
// workspace — acceptable for now since this app has no real Stripe traffic
// yet, but worth revisiting (e.g. falling back to a customer-id lookup)
// before this is load-bearing.
async function grantMonthlyCredits(invoice) {
  if (!invoice.subscription) return; // one-off invoice, not a subscription cycle

  const workspace = await prisma.workspace.findFirst({
    where: { stripeSubscriptionId: invoice.subscription },
    select: { id: true, monthlyCreditGrant: true, billingInterval: true },
  });
  if (!workspace) {
    logger.warn(
      { subscriptionId: invoice.subscription },
      'No workspace found for this subscription — skipping credit grant',
    );
    return;
  }

  // A quarterly/annual invoice covers that many months of usage in one
  // charge — grant that many months' worth of credits, not just one, or a
  // quarterly subscriber would get 1/3 the credits of a monthly one for
  // the same money.
  const amount = workspace.monthlyCreditGrant * INTERVAL_MONTHS[workspace.billingInterval];

  await prisma.creditLedgerEntry.create({
    data: {
      workspaceId: workspace.id,
      delta: amount,
      reason: 'MONTHLY_GRANT',
    },
  });
  await redis.incrby(`credits:balance:${workspace.id}`, amount);

  logger.info({ workspaceId: workspace.id, amount }, 'Monthly plan credits granted');
}

export async function handleEvent(event) {
  const isNew = await claimEvent(event.id);
  if (!isNew) {
    logger.info({ eventId: event.id }, 'Stripe event already processed — skipping (redelivery)');
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription') {
        await activatePlanSubscription(session);
      } else {
        await topUpCredits(session);
      }
      break;
    }
    case 'invoice.paid':
      await grantMonthlyCredits(event.data.object);
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
  // An exact package match keeps its own listed price; anything else (a
  // custom amount, validated to 200-50,000 credits by
  // createCheckoutSessionSchema) is priced at the closest package's
  // per-credit rate rather than rejected.
  const priced = findPackage(credits) ?? priceCustomCredits(credits);
  const amountMinor = currency === 'INR' ? priced.inrPaise : priced.usdCents;

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

/**
 * Same simulate-until-a-real-key-exists pattern as createCheckoutSession
 * above, but mode: 'subscription' — recurring monthly billing per seat,
 * matching the Pricing page's per-seat/month tiers. Activation (setting
 * workspace.plan) and the first credit grant both happen off webhooks (see
 * handleEvent), never here, so a browser that never returns to the success
 * URL doesn't leave the workspace stuck half-upgraded.
 */
// Stripe's `recurring` shape per interval — QUARTER isn't a native Stripe
// interval, so it's a month interval with interval_count: 3.
const STRIPE_RECURRING = {
  MONTH: { interval: 'month' },
  QUARTER: { interval: 'month', interval_count: 3 },
  YEAR: { interval: 'year' },
};

const INTERVAL_LABEL = { MONTH: 'monthly', QUARTER: 'quarterly', YEAR: 'annual' };

export async function createPlanSubscriptionSession(
  { workspaceId, plan, interval = 'MONTH' },
  makeClient = (key) => new Stripe(key),
) {
  if (PLAN_PRICE_USD_CENTS[plan] === undefined) {
    throw new ApiError(400, 'Unknown plan');
  }
  if (!STRIPE_RECURRING[interval]) {
    throw new ApiError(400, 'Unknown billing interval');
  }
  const amountMinor = planPriceForInterval(plan, interval);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true, planActivatedAt: true, billingInterval: true },
  });
  const isDowngrade = PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(workspace.plan);
  if (workspace.plan !== 'FREE' && isDowngrade && workspace.planActivatedAt) {
    const lockedUntil = addMonths(
      workspace.planActivatedAt,
      INTERVAL_MONTHS[workspace.billingInterval],
    );
    if (lockedUntil > new Date()) {
      throw new ApiError(
        400,
        `Your ${workspace.plan} plan (billed ${INTERVAL_LABEL[workspace.billingInterval].toLowerCase()}) is locked in until ${lockedUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. You can upgrade to a higher plan any time.`,
      );
    }
  }

  const credentials = await getDecryptedStripeCredentials();
  if (!credentials?.secretKey) {
    const sessionId = `cs_simulated_plan_${workspaceId}_${Date.now()}`;
    logger.info(
      { workspaceId, plan, interval, amountMinor, sessionId },
      'Stripe plan subscription checkout simulated (no key configured in admin settings)',
    );
    return { sessionId, url: `https://billing.simulated.local/checkout/${sessionId}` };
  }

  const stripe = makeClient(credentials.secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `DataPit ${plan} plan (${INTERVAL_LABEL[interval]})` },
          unit_amount: amountMinor,
          recurring: STRIPE_RECURRING[interval],
        },
        quantity: 1,
      },
    ],
    success_url: `${env.CORS_ORIGIN}/app/billing?checkout=success`,
    cancel_url: `${env.CORS_ORIGIN}/app/billing?checkout=cancelled`,
    metadata: { workspaceId, plan, interval },
  });

  return { sessionId: session.id, url: session.url };
}

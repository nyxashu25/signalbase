import Stripe from 'stripe';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { findPackage, priceCustomCredits } from '../config/creditPackages.js';
import { getDecryptedStripeCredentials } from './paymentSettingsService.js';
import * as notificationService from './notificationService.js';
import * as creditService from './creditService.js';
import {
  BLOCK_CONFIG,
  MAX_BLOCKS,
  PLAN_ORDER,
  INTERVAL_MONTHS,
  blockPriceForInterval,
} from '../config/planConfig.js';
import * as seatService from './seatService.js';
import * as creditGrantService from './creditGrantService.js';

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

// Shared by the three webhook handlers below — all three grant credits/
// activate a plan at the workspace level, but the recipient of the email is
// a person, so this resolves the workspace's OWNER membership to a User.
async function getWorkspaceOwnerEmail(workspaceId) {
  const membership = await prisma.membership.findFirst({
    where: { workspaceId, role: 'OWNER' },
    include: { user: true },
  });
  return membership?.user;
}

async function topUpCredits(session) {
  const { workspaceId, credits, amountCents, userId } = session.metadata ?? {};
  if (!workspaceId || !credits) {
    logger.error({ sessionId: session.id }, 'Stripe session missing workspaceId/credits metadata');
    return;
  }

  const amount = Number(credits);

  // Credits are personal: they land on the buyer's balance (metadata.userId,
  // stamped at checkout). Older sessions without it fall back to the owner.
  let recipientId = userId || null;
  if (!recipientId) {
    const owner = await getWorkspaceOwnerEmail(workspaceId);
    recipientId = owner?.id ?? null;
  }
  if (!recipientId) {
    logger.error({ sessionId: session.id, workspaceId }, 'Top-up has no resolvable recipient');
    return;
  }

  await creditService.grantCredits({
    userId: recipientId,
    workspaceId,
    amount,
    reason: 'TOPUP',
    amountCents: amountCents ? Number(amountCents) : null,
  });

  logger.info(
    { workspaceId, userId: recipientId, amount, amountCents },
    'Credits topped up from Stripe payment',
  );

  const owner = await getWorkspaceOwnerEmail(workspaceId);
  if (owner) await notificationService.sendCreditPurchaseReceipt(owner, amount, amountCents);
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
// monthly credits here. Stripe always generates an invoice for a new
// subscription (even a $0 one) and fires invoice.paid for it, same as every
// renewal, so the per-member distribution only happens in
// grantMonthlyCredits below. What DOES happen here is coverage activation:
// pending members promote into the newly purchased seats and receive their
// one-time welcome gift (idempotent — welcomeGiftAt guards + claimEvent).
async function activatePlanSubscription(session, makeClient = (key) => new Stripe(key)) {
  const { workspaceId, plan, interval } = session.metadata ?? {};
  if (!workspaceId || !plan) {
    logger.error(
      { sessionId: session.id },
      'Stripe plan session missing workspaceId/plan metadata',
    );
    return;
  }
  const blocks = Math.max(1, Number(session.metadata?.blocks) || 1);

  const previous = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { stripeSubscriptionId: true },
  });

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      plan,
      blocks,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      billingInterval: interval || 'MONTH',
      // Starts (or restarts) the minimum commitment — every paid checkout
      // is a fresh subscription, whether it's a first purchase, an
      // upgrade, or adding blocks.
      planActivatedAt: new Date(),
    },
  });

  // Every checkout is a FRESH subscription — cancel the one it replaces or
  // the customer would be double-billed from here on.
  if (previous?.stripeSubscriptionId && previous.stripeSubscriptionId !== session.subscription) {
    try {
      const credentials = await getDecryptedStripeCredentials();
      if (credentials?.secretKey) {
        const stripe = makeClient(credentials.secretKey);
        await stripe.subscriptions.cancel(previous.stripeSubscriptionId);
        logger.info(
          { workspaceId, cancelled: previous.stripeSubscriptionId },
          'Cancelled the replaced Stripe subscription',
        );
      }
    } catch (err) {
      // Never fail the activation over this — flag it for support instead.
      logger.error(
        { workspaceId, subscriptionId: previous.stripeSubscriptionId, err: err.message },
        'Could not cancel the replaced Stripe subscription',
      );
    }
  }

  // Promote pending members into the purchased seats + pay welcome gifts.
  const { activated } = await seatService.activateCoverage(workspaceId);

  logger.info(
    { workspaceId, plan, interval, blocks, activated },
    'Workspace plan activated via Stripe subscription checkout',
  );

  const owner = await getWorkspaceOwnerEmail(workspaceId);
  if (owner) await notificationService.sendPlanActivated(owner, plan, interval || 'MONTH');
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
    select: { id: true, billingInterval: true },
  });
  if (!workspace) {
    logger.warn(
      { subscriptionId: invoice.subscription },
      'No workspace found for this subscription — skipping credit grant',
    );
    return;
  }

  // A quarterly/annual invoice covers that many months of usage in one
  // charge — distribute that many months' worth of credits, not just one,
  // or a quarterly subscriber would get 1/3 the credits of a monthly one
  // for the same money.
  const months = INTERVAL_MONTHS[workspace.billingInterval];

  // Per-member distribution: paid seats at the plan rate, free seats at the
  // flat rate, plus the owner bonus — see creditGrantService.
  const { totalCredits } = await creditGrantService.distributeWorkspaceGrant(
    workspace.id,
    months,
  );

  const owner = await getWorkspaceOwnerEmail(workspace.id);
  if (owner && totalCredits > 0) {
    await notificationService.sendMonthlyCreditsRenewed(owner, totalCredits);
  }
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
  { workspaceId, userId, credits, currency = 'USD' },
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
    // userId: credits are personal — the webhook credits the BUYER's balance.
    metadata: {
      workspaceId,
      userId: userId ?? '',
      credits: String(credits),
      amountCents: String(amountMinor),
    },
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
  { workspaceId, plan, interval = 'MONTH', blocks = 1 },
  makeClient = (key) => new Stripe(key),
) {
  if (BLOCK_CONFIG[plan] === undefined) {
    throw new ApiError(400, 'Unknown plan');
  }
  if (!STRIPE_RECURRING[interval]) {
    throw new ApiError(400, 'Unknown billing interval');
  }
  if (!Number.isInteger(blocks) || blocks < 1 || blocks > MAX_BLOCKS) {
    throw new ApiError(400, `Blocks must be between 1 and ${MAX_BLOCKS}`);
  }
  // Per-block price at this interval; Stripe multiplies by quantity=blocks.
  const amountMinor = blockPriceForInterval(plan, interval);

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
      { workspaceId, plan, interval, blocks, amountMinor, sessionId },
      'Stripe plan subscription checkout simulated (no key configured in admin settings)',
    );
    return { sessionId, url: `https://billing.simulated.local/checkout/${sessionId}` };
  }

  const stripe = makeClient(credentials.secretKey);
  const config = BLOCK_CONFIG[plan];
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `DataPit ${plan} — seat block (${config.paidSeats} paid + ${config.freeSeats} free seats, ${INTERVAL_LABEL[interval]})`,
          },
          unit_amount: amountMinor,
          recurring: STRIPE_RECURRING[interval],
        },
        // Block pricing: the checkout charges the per-block price x blocks.
        quantity: blocks,
      },
    ],
    success_url: `${env.CORS_ORIGIN}/app/billing?checkout=success`,
    cancel_url: `${env.CORS_ORIGIN}/app/billing?checkout=cancelled`,
    metadata: { workspaceId, plan, interval, blocks: String(blocks) },
  });

  return { sessionId: session.id, url: session.url };
}

import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../middleware/errorHandler.js';
import { findPackage } from '../config/creditPackages.js';
import { getDecryptedRazorpayCredentials } from './paymentSettingsService.js';

const ORDERS_ENDPOINT = 'https://api.razorpay.com/v1/orders';
const REQUEST_TIMEOUT_MS = 10_000;
const PROCESSED_EVENT_TTL_SECONDS = 30 * 24 * 60 * 60;
// How long a created-but-unpaid order is honored — generous enough that a
// slow checkout still completes, short enough that stale orders don't pile
// up in Redis forever.
const ORDER_TTL_SECONDS = 24 * 60 * 60;

const orderCacheKey = (orderId) => `razorpay:order:${orderId}`;

function amountForCurrency(pkg, currency) {
  return currency === 'INR' ? pkg.inrPaise : pkg.usdCents;
}

/**
 * Creates a real Razorpay Order via the Orders API. Only ever called once
 * the caller (billingController) has confirmed a key is configured — there
 * is no simulated branch here, because "no key configured" already falls
 * back to the existing simulated Stripe flow one level up.
 *
 * The workspaceId/credits/amount this order is *for* are cached server-side
 * (keyed by Razorpay's own orderId) rather than trusted from whatever the
 * client sends back after payment — see verifyAndCreditPayment below.
 */
export async function createOrder({ workspaceId, credits, currency }) {
  const pkg = findPackage(credits);
  if (!pkg) throw new ApiError(400, 'Unknown credit package');
  const amountMinor = amountForCurrency(pkg, currency);

  const credentials = await getDecryptedRazorpayCredentials();
  if (!credentials) throw new ApiError(409, 'Razorpay is not configured');

  const res = await fetch(ORDERS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountMinor,
      currency,
      receipt: `${workspaceId}_${Date.now()}`,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Razorpay order creation failed: ${res.status} ${body?.error?.description ?? ''}`);
  }

  await redis.set(
    orderCacheKey(body.id),
    JSON.stringify({ workspaceId, credits, amountMinor }),
    'EX',
    ORDER_TTL_SECONDS,
  );

  return { provider: 'razorpay', orderId: body.id, keyId: credentials.keyId, amount: amountMinor, currency };
}

async function claimEvent(eventId) {
  const claimed = await redis.set(
    `razorpay:event:${eventId}`,
    '1',
    'EX',
    PROCESSED_EVENT_TTL_SECONDS,
    'NX',
  );
  return claimed === 'OK';
}

async function creditFromPayment({ paymentId, workspaceId, credits, amountMinor }) {
  const isNew = await claimEvent(paymentId);
  if (!isNew) {
    logger.info({ paymentId }, 'Razorpay payment already credited — skipping (redelivery)');
    return;
  }

  await prisma.creditLedgerEntry.create({
    data: { workspaceId, delta: credits, reason: 'TOPUP', amountCents: amountMinor },
  });
  await redis.incrby(`credits:balance:${workspaceId}`, credits);

  logger.info({ workspaceId, credits, amountMinor, paymentId }, 'Credits topped up from Razorpay payment');
}

/**
 * Client-side confirmation path: Razorpay Checkout's success handler hands
 * back these three fields, and this HMAC check (order_id|payment_id signed
 * with the key secret) is Razorpay's documented way to confirm they weren't
 * forged in the browser. workspaceId/credits/amount are read back from the
 * order cache (set at createOrder time), never from this request body — a
 * tampered `credits` field here can't buy extra credits.
 */
export async function verifyAndCreditPayment({ orderId, paymentId, signature, workspaceId }) {
  const credentials = await getDecryptedRazorpayCredentials();
  if (!credentials) throw new ApiError(409, 'Razorpay is not configured');

  const expected = createHmac('sha256', credentials.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const providedBuf = Buffer.from(String(signature), 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    throw new ApiError(400, 'Invalid Razorpay payment signature');
  }

  const cached = await redis.get(orderCacheKey(orderId));
  if (!cached) throw new ApiError(404, 'Unknown or expired order');
  const order = JSON.parse(cached);

  if (order.workspaceId !== workspaceId) {
    throw new ApiError(403, 'This order does not belong to your workspace');
  }

  await creditFromPayment({ paymentId, workspaceId: order.workspaceId, credits: order.credits, amountMinor: order.amountMinor });
  return { credited: true, credits: order.credits };
}

function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const providedBuf = Buffer.from(String(signatureHeader), 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  return providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Server-side backstop for the client-confirmation path above — credits a
 * payment even if the browser tab closed before verifyAndCreditPayment ran.
 * Reads the order's workspaceId/credits from the same cache (keyed by
 * Razorpay's order_id on the payment entity), never from the webhook body,
 * for the same tamper-resistance reason.
 */
export async function handleWebhookEvent(rawBody, signatureHeader) {
  const credentials = await getDecryptedRazorpayCredentials();
  if (!credentials?.webhookSecret) {
    throw new ApiError(400, 'Razorpay webhook secret is not configured');
  }
  if (!verifySignature(rawBody, signatureHeader, credentials.webhookSecret)) {
    throw new ApiError(400, 'Invalid Razorpay webhook signature');
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  if (event.event !== 'payment.captured') {
    logger.info({ type: event.event }, 'Unhandled Razorpay webhook event type');
    return;
  }

  const payment = event.payload.payment.entity;
  const cached = await redis.get(orderCacheKey(payment.order_id));
  if (!cached) {
    logger.error(
      { paymentId: payment.id, orderId: payment.order_id },
      'Razorpay payment.captured references an unknown/expired order — cannot credit',
    );
    return;
  }
  const order = JSON.parse(cached);

  await creditFromPayment({
    paymentId: payment.id,
    workspaceId: order.workspaceId,
    credits: order.credits,
    amountMinor: order.amountMinor,
  });
}

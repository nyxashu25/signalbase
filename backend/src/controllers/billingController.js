import * as stripeService from '../services/stripeService.js';
import * as razorpayService from '../services/razorpayService.js';
import * as creditService from '../services/creditService.js';
import * as paymentSettingsService from '../services/paymentSettingsService.js';
import { CREDIT_PACKAGES } from '../config/creditPackages.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';
import { prisma } from '../config/db.js';

export function getPackages(req, res) {
  res.json({ packages: CREDIT_PACKAGES });
}

export function getCreditCosts(req, res) {
  res.json({ costs: CREDIT_COSTS });
}

export async function getSummary(req, res) {
  const { workspaceId } = req.auth;

  const [balance, workspace, usedAgg] = await Promise.all([
    creditService.getBalance(workspaceId),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { monthlyCreditGrant: true },
    }),
    prisma.creditLedgerEntry.aggregate({
      where: { workspaceId, delta: { lt: 0 } },
      _sum: { delta: true },
    }),
  ]);

  res.json({
    balance,
    monthlyCreditGrant: workspace.monthlyCreditGrant,
    creditsUsed: Math.abs(usedAgg._sum.delta ?? 0),
  });
}

export async function listTransactions(req, res) {
  const { workspaceId } = req.auth;
  const { page, pageSize } = req.validatedQuery;

  const where = { workspaceId };
  const [total, entries] = await Promise.all([
    prisma.creditLedgerEntry.count({ where }),
    prisma.creditLedgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // CreditLedgerEntry.contactId is a bare scalar (no Prisma relation) — a
  // second batched lookup is cheaper than N+1 per-row queries and simpler
  // than adding a relation just for this display.
  const contactIds = [...new Set(entries.map((e) => e.contactId).filter(Boolean))];
  const contacts = contactIds.length
    ? await prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const contactById = new Map(contacts.map((c) => [c.id, c]));

  res.json({
    results: entries.map((e) => ({
      id: e.id,
      delta: e.delta,
      reason: e.reason,
      amountCents: e.amountCents,
      contact: e.contactId ? (contactById.get(e.contactId) ?? null) : null,
      createdAt: e.createdAt,
    })),
    total,
    page,
    pageSize,
  });
}

export async function createCheckoutSession(req, res) {
  const { workspaceId } = req.auth;
  const { credits, currency } = req.body;

  // Razorpay is preferred once an admin has configured it (see
  // /control/settings); until then, checkout falls back to the existing
  // simulated Stripe flow unchanged — same gate-on-configuration pattern as
  // every other integration in this app.
  const razorpaySettings = await paymentSettingsService.getRazorpaySettings();
  if (razorpaySettings.configured) {
    const order = await razorpayService.createOrder({ workspaceId, credits, currency: currency ?? 'INR' });
    return res.status(201).json(order);
  }

  const session = await stripeService.createCheckoutSession({ workspaceId, credits });
  res.status(201).json({ provider: 'stripe', ...session });
}

export async function verifyRazorpayPayment(req, res) {
  const result = await razorpayService.verifyAndCreditPayment({
    orderId: req.body.orderId,
    paymentId: req.body.paymentId,
    signature: req.body.signature,
    workspaceId: req.auth.workspaceId,
  });
  res.json(result);
}

export async function stripeWebhook(req, res) {
  const event = stripeService.verifyAndParseEvent(req.rawBody, req.headers['stripe-signature']);
  await stripeService.handleEvent(event);
  res.status(204).end();
}

export async function razorpayWebhook(req, res) {
  await razorpayService.handleWebhookEvent(req.rawBody, req.headers['x-razorpay-signature']);
  res.status(200).json({ status: 'ok' });
}

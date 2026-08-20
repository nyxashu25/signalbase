import * as stripeService from '../services/stripeService.js';
import * as creditService from '../services/creditService.js';
import {
  CREDIT_PACKAGES,
  CUSTOM_CREDITS_MIN,
  CUSTOM_CREDITS_MAX,
  priceCustomCredits,
} from '../config/creditPackages.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';
import { prisma } from '../config/db.js';

export function getPackages(req, res) {
  res.json({
    packages: CREDIT_PACKAGES,
    customRange: { min: CUSTOM_CREDITS_MIN, max: CUSTOM_CREDITS_MAX },
  });
}

// Lets the frontend show a live price as the user types a custom amount,
// without duplicating priceCustomCredits' per-credit-rate math client-side.
// req.validatedQuery.credits is already range-checked by
// customCreditsQuerySchema (see routes/billing.js).
export function getCustomCreditsPrice(req, res) {
  res.json(priceCustomCredits(req.validatedQuery.credits));
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
      select: {
        plan: true,
        monthlyCreditGrant: true,
        planActivatedAt: true,
        billingInterval: true,
      },
    }),
    prisma.creditLedgerEntry.aggregate({
      where: { workspaceId, delta: { lt: 0 } },
      _sum: { delta: true },
    }),
  ]);

  res.json({
    balance,
    plan: workspace.plan,
    monthlyCreditGrant: workspace.monthlyCreditGrant,
    creditsUsed: Math.abs(usedAgg._sum.delta ?? 0),
    planActivatedAt: workspace.planActivatedAt,
    billingInterval: workspace.billingInterval,
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

  const session = await stripeService.createCheckoutSession({
    workspaceId,
    credits,
    currency: currency ?? 'USD',
  });
  res.status(201).json({ provider: 'stripe', ...session });
}

export async function createPlanSubscriptionSession(req, res) {
  const { workspaceId } = req.auth;
  const { plan, interval } = req.body;

  const session = await stripeService.createPlanSubscriptionSession({
    workspaceId,
    plan,
    interval,
  });
  res.status(201).json({ provider: 'stripe', ...session });
}

export async function stripeWebhook(req, res) {
  const event = await stripeService.verifyAndParseEvent(
    req.rawBody,
    req.headers['stripe-signature'],
  );
  await stripeService.handleEvent(event);
  res.status(204).end();
}

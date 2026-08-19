import * as stripeService from '../services/stripeService.js';
import * as creditService from '../services/creditService.js';
import { prisma } from '../config/db.js';

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
  const session = await stripeService.createCheckoutSession({
    workspaceId: req.auth.workspaceId,
    credits: req.body.credits,
  });
  res.status(201).json(session);
}

export async function stripeWebhook(req, res) {
  const event = stripeService.verifyAndParseEvent(req.rawBody, req.headers['stripe-signature']);
  await stripeService.handleEvent(event);
  res.status(204).end();
}

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

import * as stripeService from '../services/stripeService.js';

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

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Stripe from 'stripe';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { getBalance, initializeBalance } from '../services/creditService.js';

const app = createApp();
// A local Stripe client with a placeholder key, same as stripeService.js —
// generateTestHeaderString is pure local crypto, no network/real key needed.
const stripe = new Stripe('sk_test_placeholder_unused_for_verification');

function signedPayload(event) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: env.STRIPE_WEBHOOK_SECRET,
  });
  return { payload, header };
}

function postStripeWebhook(event) {
  const { payload, header } = signedPayload(event);
  return request(app)
    .post('/api/v1/webhooks/stripe')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', header)
    .send(payload);
}

function checkoutCompletedEvent({ id, workspaceId, credits }) {
  return {
    id,
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', metadata: { workspaceId, credits: String(credits) } } },
  };
}

async function makeWorkspace() {
  const org = await prisma.org.create({ data: { slug: 'billing-test', name: 'Billing Test' } });
  const workspace = await prisma.workspace.create({
    data: { orgId: org.id, name: 'Billing Test WS', monthlyCreditGrant: 100 },
  });
  await initializeBalance(workspace.id, workspace.monthlyCreditGrant);
  return workspace;
}

describe('POST /webhooks/stripe', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects a request with an invalid signature', async () => {
    const workspace = await makeWorkspace();
    const { payload } = signedPayload(
      checkoutCompletedEvent({ id: 'evt_1', workspaceId: workspace.id, credits: 50 }),
    );

    const res = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1,v1=deadbeef')
      .send(payload);

    expect(res.status).toBe(400);
  });

  it('tops up credits on checkout.session.completed', async () => {
    const workspace = await makeWorkspace();
    const before = await getBalance(workspace.id);

    const res = await postStripeWebhook(
      checkoutCompletedEvent({ id: 'evt_2', workspaceId: workspace.id, credits: 50 }),
    );

    expect(res.status).toBe(204);
    expect(await getBalance(workspace.id)).toBe(before + 50);

    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: workspace.id },
    });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ delta: 50, reason: 'TOPUP' });
  });

  it('does not double-credit a redelivered event id', async () => {
    const workspace = await makeWorkspace();
    const event = checkoutCompletedEvent({ id: 'evt_3', workspaceId: workspace.id, credits: 50 });

    await postStripeWebhook(event);
    await postStripeWebhook(event); // Stripe retries on anything but a 2xx, and can also just redeliver

    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: workspace.id },
    });
    expect(ledger).toHaveLength(1);
  });

  it('updates stripeSubscriptionId on customer.subscription.updated', async () => {
    const org = await prisma.org.create({ data: { slug: 'sub-test', name: 'Sub Test' } });
    const workspace = await prisma.workspace.create({
      data: { orgId: org.id, name: 'Sub Test WS', stripeCustomerId: 'cus_123' },
    });

    const res = await postStripeWebhook({
      id: 'evt_4',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_123', customer: 'cus_123', status: 'active' } },
    });

    expect(res.status).toBe(204);
    const updated = await prisma.workspace.findUnique({ where: { id: workspace.id } });
    expect(updated.stripeSubscriptionId).toBe('sub_123');
  });
});

describe('POST /billing/checkout-session', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  it('returns a simulated session when no STRIPE_SECRET_KEY is configured', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      email: 'owner@billing.test',
      password: 'correct-horse-battery',
      name: 'Owner',
      orgName: 'Billing Co',
    });

    const res = await request(app)
      .post('/api/v1/billing/checkout-session')
      .set('Authorization', `Bearer ${registerRes.body.accessToken}`)
      .send({ credits: 250 });

    expect(res.status).toBe(201);
    expect(res.body.sessionId).toMatch(/^cs_simulated_/);
    expect(res.body.url).toContain(res.body.sessionId);
  });
});

describe('GET /billing/transactions', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists this workspace's ledger, newest first, with contact info joined onto reveal rows", async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      email: 'owner@billing.test',
      password: 'correct-horse-battery',
      name: 'Owner',
      orgName: 'Billing Co',
    });
    const workspaceId = registerRes.body.workspace.id;

    const company = await prisma.company.create({
      data: { name: 'Nova Systems', domain: `novasystems-${Date.now()}.com` },
    });
    const contact = await prisma.contact.create({
      data: { companyId: company.id, firstName: 'Jordan', lastName: 'Bennett' },
    });

    await prisma.creditLedgerEntry.create({
      data: { workspaceId, delta: 100, reason: 'MONTHLY_GRANT' },
    });
    await prisma.creditLedgerEntry.create({
      data: { workspaceId, delta: -1, reason: 'EMAIL_REVEAL', contactId: contact.id },
    });
    await prisma.creditLedgerEntry.create({
      data: { workspaceId, delta: 250, reason: 'TOPUP', amountCents: 1500 },
    });

    const res = await request(app)
      .get('/api/v1/billing/transactions')
      .set('Authorization', `Bearer ${registerRes.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.results.map((r) => r.reason)).toEqual(['TOPUP', 'EMAIL_REVEAL', 'MONTHLY_GRANT']);

    const revealRow = res.body.results.find((r) => r.reason === 'EMAIL_REVEAL');
    expect(revealRow.contact).toMatchObject({ firstName: 'Jordan', lastName: 'Bennett' });

    const topupRow = res.body.results.find((r) => r.reason === 'TOPUP');
    expect(topupRow.amountCents).toBe(1500);
    expect(topupRow.contact).toBeNull();
  });

  it("never shows another workspace's ledger", async () => {
    const orgA = await request(app).post('/api/v1/auth/register').send({
      email: 'owner@org-a.test',
      password: 'correct-horse-battery',
      name: 'Owner',
      orgName: 'Org A',
    });
    const orgB = await request(app).post('/api/v1/auth/register').send({
      email: 'owner@org-b.test',
      password: 'correct-horse-battery',
      name: 'Owner',
      orgName: 'Org B',
    });

    await prisma.creditLedgerEntry.create({
      data: { workspaceId: orgA.body.workspace.id, delta: 100, reason: 'MONTHLY_GRANT' },
    });

    const res = await request(app)
      .get('/api/v1/billing/transactions')
      .set('Authorization', `Bearer ${orgB.body.accessToken}`);

    expect(res.body.total).toBe(0);
    expect(res.body.results).toHaveLength(0);
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Stripe from 'stripe';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { getBalance, initializeBalance } from '../services/creditService.js';
import { saveStripeSettings } from '../services/paymentSettingsService.js';
import { createCheckoutSession, createPlanSubscriptionSession } from '../services/stripeService.js';

const app = createApp();
// A local Stripe client with a placeholder key — generateTestHeaderString is
// pure local crypto, no network/real key needed, same as stripeService.js's
// own signature-check client.
const stripe = new Stripe('sk_test_placeholder_unused_for_verification');
const TEST_WEBHOOK_SECRET = 'whsec_test_secret_not_a_real_key';

function signedPayload(event) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: TEST_WEBHOOK_SECRET,
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
    await saveStripeSettings({ webhookSecret: TEST_WEBHOOK_SECRET }, null);
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

  it('rejects a request when no webhook secret is configured', async () => {
    // Overwrite the beforeEach's configured secret with none.
    await resetDb();
    const workspace = await makeWorkspace();
    const { payload } = signedPayload(
      checkoutCompletedEvent({ id: 'evt_1b', workspaceId: workspace.id, credits: 50 }),
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

  it('activates the plan on a subscription checkout, without granting credits yet', async () => {
    const workspace = await makeWorkspace();
    const before = await getBalance(workspace.id);

    const res = await postStripeWebhook({
      id: 'evt_plan_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_plan_1',
          mode: 'subscription',
          customer: 'cus_plan_1',
          subscription: 'sub_plan_1',
          metadata: { workspaceId: workspace.id, plan: 'PROFESSIONAL' },
        },
      },
    });

    expect(res.status).toBe(204);
    const updated = await prisma.workspace.findUnique({ where: { id: workspace.id } });
    expect(updated.plan).toBe('PROFESSIONAL');
    expect(updated.monthlyCreditGrant).toBe(1200);
    expect(updated.stripeCustomerId).toBe('cus_plan_1');
    expect(updated.stripeSubscriptionId).toBe('sub_plan_1');
    // No grant on activation itself — invoice.paid is the only place credits move (below).
    expect(await getBalance(workspace.id)).toBe(before);
  });

  it('grants the plan’s monthly credits on invoice.paid, including the first invoice', async () => {
    const workspace = await makeWorkspace();
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { plan: 'PROFESSIONAL', monthlyCreditGrant: 1200, stripeSubscriptionId: 'sub_plan_2' },
    });
    const before = await getBalance(workspace.id);

    const res = await postStripeWebhook({
      id: 'evt_plan_2',
      type: 'invoice.paid',
      data: { object: { id: 'in_1', subscription: 'sub_plan_2', customer: 'cus_plan_2' } },
    });

    expect(res.status).toBe(204);
    expect(await getBalance(workspace.id)).toBe(before + 1200);
    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: workspace.id },
    });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ delta: 1200, reason: 'MONTHLY_GRANT' });
  });

  it('grants credits again on a second invoice.paid (renewal), not just the first', async () => {
    const workspace = await makeWorkspace();
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { plan: 'BASIC', monthlyCreditGrant: 500, stripeSubscriptionId: 'sub_plan_3' },
    });

    await postStripeWebhook({
      id: 'evt_plan_3a',
      type: 'invoice.paid',
      data: { object: { id: 'in_2', subscription: 'sub_plan_3' } },
    });
    await postStripeWebhook({
      id: 'evt_plan_3b',
      type: 'invoice.paid',
      data: { object: { id: 'in_3', subscription: 'sub_plan_3' } },
    });

    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: workspace.id },
    });
    expect(ledger.filter((e) => e.reason === 'MONTHLY_GRANT')).toHaveLength(2);
  });

  it('ignores a non-subscription invoice (no invoice.subscription)', async () => {
    const workspace = await makeWorkspace();
    const before = await getBalance(workspace.id);

    const res = await postStripeWebhook({
      id: 'evt_plan_4',
      type: 'invoice.paid',
      data: { object: { id: 'in_4', subscription: null } },
    });

    expect(res.status).toBe(204);
    expect(await getBalance(workspace.id)).toBe(before);
  });
});

describe('POST /billing/subscribe', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function registerOwner() {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'owner@subscribe.test',
      password: 'correct-horse-battery',
      name: 'Owner',
      orgName: 'Subscribe Co',
    });
    return { accessToken: res.body.accessToken, workspaceId: res.body.workspace.id };
  }

  it('returns a simulated subscription session when no key is configured', async () => {
    const { accessToken } = await registerOwner();

    const res = await request(app)
      .post('/api/v1/billing/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ plan: 'BASIC' });

    expect(res.status).toBe(201);
    expect(res.body.provider).toBe('stripe');
    expect(res.body.sessionId).toMatch(/^cs_simulated_plan_/);
  });

  it('rejects an unknown plan', async () => {
    const { accessToken } = await registerOwner();

    const res = await request(app)
      .post('/api/v1/billing/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ plan: 'ENTERPRISE_DELUXE' });

    expect(res.status).toBe(400);
  });

  it('rejects subscribing to Free (not a purchasable plan)', async () => {
    const { accessToken } = await registerOwner();

    const res = await request(app)
      .post('/api/v1/billing/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ plan: 'FREE' });

    expect(res.status).toBe(400);
  });

  it('rejects a self-serve downgrade before the 3-month commitment ends', async () => {
    const { accessToken, workspaceId } = await registerOwner();
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { plan: 'PROFESSIONAL', planActivatedAt: new Date() },
    });

    const res = await request(app)
      .post('/api/v1/billing/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ plan: 'BASIC' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/locked in until/);
  });
});

describe('stripeService.createPlanSubscriptionSession (unit, injected client)', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('passes recurring monthly pricing and plan metadata to the Stripe client', async () => {
    const workspace = await makeWorkspace();
    await saveStripeSettings({ secretKey: 'sk_test_configured' }, null);
    const create = async (params) => {
      expect(params.mode).toBe('subscription');
      expect(params.line_items[0].price_data.unit_amount).toBe(5900);
      expect(params.line_items[0].price_data.recurring).toEqual({ interval: 'month' });
      expect(params.metadata).toEqual({ workspaceId: workspace.id, plan: 'PROFESSIONAL' });
      return { id: 'cs_test_sub', url: 'https://checkout.stripe.com/pay/cs_test_sub' };
    };
    const makeClient = (key) => {
      expect(key).toBe('sk_test_configured');
      return { checkout: { sessions: { create } } };
    };

    const session = await createPlanSubscriptionSession(
      { workspaceId: workspace.id, plan: 'PROFESSIONAL' },
      makeClient,
    );

    expect(session).toEqual({
      sessionId: 'cs_test_sub',
      url: 'https://checkout.stripe.com/pay/cs_test_sub',
    });
  });

  it('rejects a downgrade to a lower paid tier within the 3-month commitment', async () => {
    const workspace = await makeWorkspace();
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { plan: 'PROFESSIONAL', planActivatedAt: new Date() },
    });
    await saveStripeSettings({ secretKey: 'sk_test_configured' }, null);

    await expect(
      createPlanSubscriptionSession({ workspaceId: workspace.id, plan: 'BASIC' }),
    ).rejects.toThrow(/locked in until/);
  });

  it('allows a downgrade once the 3-month commitment has elapsed', async () => {
    const workspace = await makeWorkspace();
    const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { plan: 'PROFESSIONAL', planActivatedAt: ninetyOneDaysAgo },
    });
    // No key configured — falls into the simulated-session path, which
    // only runs once the commitment check above has already passed.
    const session = await createPlanSubscriptionSession({
      workspaceId: workspace.id,
      plan: 'BASIC',
    });
    expect(session.sessionId).toMatch(/^cs_simulated_plan_/);
  });

  it('always allows an upgrade, even within the 3-month commitment', async () => {
    const workspace = await makeWorkspace();
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { plan: 'BASIC', planActivatedAt: new Date() },
    });
    const session = await createPlanSubscriptionSession({
      workspaceId: workspace.id,
      plan: 'PROFESSIONAL',
    });
    expect(session.sessionId).toMatch(/^cs_simulated_plan_/);
  });
});

describe('POST /billing/checkout-session', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function registerOwner() {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'owner@billing.test',
      password: 'correct-horse-battery',
      name: 'Owner',
      orgName: 'Billing Co',
    });
    return { accessToken: res.body.accessToken, workspaceId: res.body.workspace.id };
  }

  it('returns a simulated session when no key is configured in admin settings', async () => {
    const { accessToken } = await registerOwner();

    const res = await request(app)
      .post('/api/v1/billing/checkout-session')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ credits: 250 });

    expect(res.status).toBe(201);
    expect(res.body.provider).toBe('stripe');
    expect(res.body.sessionId).toMatch(/^cs_simulated_/);
    expect(res.body.url).toContain(res.body.sessionId);
  });

  // The route always constructs its own real Stripe client from the DB key
  // (no test seam at the HTTP layer) — the "real Stripe API call" path is
  // covered at the service level below via an injected fake client instead
  // of hitting api.stripe.com from the test suite.
});

describe('stripeService.createCheckoutSession (unit, injected client)', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('simulates when no key is configured', async () => {
    const session = await createCheckoutSession({ workspaceId: 'ws_1', credits: 250 });
    expect(session.sessionId).toMatch(/^cs_simulated_/);
  });

  it('prices a non-package amount at the closest package\'s per-credit rate', async () => {
    await saveStripeSettings({ secretKey: 'sk_test_configured' }, null);
    // Closest to 999 is the 600-credit package ($30.00 = 5c/credit) —
    // 300-credit gap vs. 501 to the 1500-credit package.
    const create = async (params) => {
      expect(params.line_items[0].price_data.unit_amount).toBe(4995);
      return { id: 'cs_test_custom', url: 'https://checkout.stripe.com/pay/cs_test_custom' };
    };
    const makeClient = () => ({ checkout: { sessions: { create } } });

    const session = await createCheckoutSession(
      { workspaceId: 'ws_1', credits: 999 },
      makeClient,
    );
    expect(session.sessionId).toBe('cs_test_custom');
  });

  it('passes the right amount/currency/metadata to the Stripe client and returns its session', async () => {
    await saveStripeSettings({ secretKey: 'sk_test_configured' }, null);
    const create = async (params) => {
      expect(params.line_items[0].price_data.currency).toBe('inr');
      expect(params.line_items[0].price_data.unit_amount).toBe(125_000);
      expect(params.metadata).toEqual({
        workspaceId: 'ws_1',
        credits: '250',
        amountCents: '125000',
      });
      return { id: 'cs_test_inr', url: 'https://checkout.stripe.com/pay/cs_test_inr' };
    };
    const makeClient = (key) => {
      expect(key).toBe('sk_test_configured');
      return { checkout: { sessions: { create } } };
    };

    const session = await createCheckoutSession(
      { workspaceId: 'ws_1', credits: 250, currency: 'INR' },
      makeClient,
    );

    expect(session).toEqual({
      sessionId: 'cs_test_inr',
      url: 'https://checkout.stripe.com/pay/cs_test_inr',
    });
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

    // Explicit, deliberately-spaced createdAt — three inserts this close
    // together can otherwise land in the same DB timestamp tick, making
    // "newest first" ordering nondeterministic between ties.
    const now = Date.now();
    await prisma.creditLedgerEntry.create({
      data: { workspaceId, delta: 100, reason: 'MONTHLY_GRANT', createdAt: new Date(now - 2000) },
    });
    await prisma.creditLedgerEntry.create({
      data: {
        workspaceId,
        delta: -1,
        reason: 'EMAIL_REVEAL',
        contactId: contact.id,
        createdAt: new Date(now - 1000),
      },
    });
    await prisma.creditLedgerEntry.create({
      data: {
        workspaceId,
        delta: 250,
        reason: 'TOPUP',
        amountCents: 1500,
        createdAt: new Date(now),
      },
    });

    const res = await request(app)
      .get('/api/v1/billing/transactions')
      .set('Authorization', `Bearer ${registerRes.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.results.map((r) => r.reason)).toEqual([
      'TOPUP',
      'EMAIL_REVEAL',
      'MONTHLY_GRANT',
    ]);

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

describe('GET /billing/packages', () => {
  it('returns the credit package price list, unauthenticated', async () => {
    const res = await request(app).get('/api/v1/billing/packages');

    expect(res.status).toBe(200);
    expect(res.body.packages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ credits: 250, usdCents: 1500, inrPaise: 125_000 }),
      ]),
    );
  });
});

describe('GET /billing/credit-costs', () => {
  it('returns what every credit-spending action costs, unauthenticated', async () => {
    const res = await request(app).get('/api/v1/billing/credit-costs');

    expect(res.status).toBe(200);
    expect(res.body.costs).toEqual({
      REVEAL: 2,
      COMPANY_DETAIL_VIEW: 20,
      CSV_EXPORT: 20,
      SEQUENCE_ENROLLMENT: 250,
    });
  });
});

describe('GET /billing/custom-credits-price', () => {
  it('prices an exact package amount the same as the package price', async () => {
    const res = await request(app).get('/api/v1/billing/custom-credits-price?credits=250');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ usdCents: 1500, inrPaise: 125_000 });
  });

  it('prices a non-package amount at the closest package rate', async () => {
    const res = await request(app).get('/api/v1/billing/custom-credits-price?credits=999');
    expect(res.status).toBe(200);
    expect(res.body.usdCents).toBe(4995);
  });

  it('rejects an amount below the 200 floor', async () => {
    const res = await request(app).get('/api/v1/billing/custom-credits-price?credits=199');
    expect(res.status).toBe(400);
  });

  it('rejects an amount above the 50,000 ceiling', async () => {
    const res = await request(app).get('/api/v1/billing/custom-credits-price?credits=50001');
    expect(res.status).toBe(400);
  });
});

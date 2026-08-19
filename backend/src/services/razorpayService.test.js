import { createHmac } from 'node:crypto';
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { saveRazorpaySettings } from './paymentSettingsService.js';
import { createOrder, verifyAndCreditPayment, handleWebhookEvent } from './razorpayService.js';

async function makeWorkspace() {
  const org = await prisma.org.create({ data: { slug: `rzp-${Date.now()}-${Math.random()}`, name: 'RZP Test' } });
  return prisma.workspace.create({ data: { orgId: org.id, name: 'RZP WS' } });
}

describe('razorpayService', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createOrder', () => {
    it('throws if Razorpay has not been configured yet', async () => {
      const workspace = await makeWorkspace();

      await expect(
        createOrder({ workspaceId: workspace.id, credits: 250, currency: 'INR' }),
      ).rejects.toThrow(/not configured/);
    });

    it('creates a real order via the Razorpay API and caches it for later verification', async () => {
      await saveRazorpaySettings({ keyId: 'rzp_test_key', keySecret: 'test_secret' }, null);
      const workspace = await makeWorkspace();
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ id: 'order_abc123' }), { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      const order = await createOrder({ workspaceId: workspace.id, credits: 250, currency: 'INR' });

      expect(order).toEqual({
        provider: 'razorpay',
        orderId: 'order_abc123',
        keyId: 'rzp_test_key',
        amount: 125_000,
        currency: 'INR',
      });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.razorpay.com/v1/orders');
      expect(options.headers.Authorization).toBe(
        `Basic ${Buffer.from('rzp_test_key:test_secret').toString('base64')}`,
      );
      const body = JSON.parse(options.body);
      expect(body.amount).toBe(125_000);
      expect(body.currency).toBe('INR');
    });

    it('prices in USD cents when currency is USD', async () => {
      await saveRazorpaySettings({ keyId: 'k', keySecret: 's' }, null);
      const workspace = await makeWorkspace();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'order_usd' }), { status: 200 })),
      );

      const order = await createOrder({ workspaceId: workspace.id, credits: 250, currency: 'USD' });

      expect(order.amount).toBe(1500);
      expect(order.currency).toBe('USD');
    });

    it('throws for an unknown credit package', async () => {
      await saveRazorpaySettings({ keyId: 'k', keySecret: 's' }, null);
      const workspace = await makeWorkspace();

      await expect(
        createOrder({ workspaceId: workspace.id, credits: 999, currency: 'INR' }),
      ).rejects.toThrow(/Unknown credit package/);
    });

    it('surfaces a Razorpay API error instead of silently succeeding', async () => {
      await saveRazorpaySettings({ keyId: 'k', keySecret: 's' }, null);
      const workspace = await makeWorkspace();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ error: { description: 'bad request' } }), { status: 400 }),
        ),
      );

      await expect(
        createOrder({ workspaceId: workspace.id, credits: 250, currency: 'INR' }),
      ).rejects.toThrow(/400/);
    });
  });

  describe('verifyAndCreditPayment', () => {
    async function setupOrder(credits = 250) {
      await saveRazorpaySettings({ keyId: 'rzp_test_key', keySecret: 'test_secret' }, null);
      const workspace = await makeWorkspace();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'order_xyz' }), { status: 200 })),
      );
      const order = await createOrder({ workspaceId: workspace.id, credits, currency: 'INR' });
      vi.unstubAllGlobals();
      return { workspace, order };
    }

    function signFor(orderId, paymentId) {
      return createHmac('sha256', 'test_secret').update(`${orderId}|${paymentId}`).digest('hex');
    }

    it('credits the workspace when the signature is valid', async () => {
      const { workspace, order } = await setupOrder();
      const paymentId = 'pay_abc';

      const result = await verifyAndCreditPayment({
        orderId: order.orderId,
        paymentId,
        signature: signFor(order.orderId, paymentId),
        workspaceId: workspace.id,
      });

      expect(result).toEqual({ credited: true, credits: 250 });
      expect(Number(await redis.get(`credits:balance:${workspace.id}`))).toBe(250);
      const ledger = await prisma.creditLedgerEntry.findMany({ where: { workspaceId: workspace.id } });
      expect(ledger).toHaveLength(1);
      expect(ledger[0]).toMatchObject({ delta: 250, reason: 'TOPUP', amountCents: 125_000 });
    });

    it('rejects a forged signature', async () => {
      const { workspace, order } = await setupOrder();

      await expect(
        verifyAndCreditPayment({
          orderId: order.orderId,
          paymentId: 'pay_abc',
          signature: 'a'.repeat(64),
          workspaceId: workspace.id,
        }),
      ).rejects.toThrow(/Invalid Razorpay payment signature/);
    });

    // There is no `credits`/`amount` field accepted by verifyAndCreditPayment
    // at all — this documents that guarantee by confirming the credited
    // amount always matches what createOrder cached server-side, which is
    // the only thing that determines it.
    it('credits exactly the package amount cached at order-creation time, regardless of what else a client might send', async () => {
      const { workspace, order } = await setupOrder(600);
      const paymentId = 'pay_xyz';

      await verifyAndCreditPayment({
        orderId: order.orderId,
        paymentId,
        signature: signFor(order.orderId, paymentId),
        workspaceId: workspace.id,
      });

      const ledger = await prisma.creditLedgerEntry.findMany({ where: { workspaceId: workspace.id } });
      expect(ledger[0].delta).toBe(600);
    });

    it('rejects verification from a workspace the order was not created for', async () => {
      const { order } = await setupOrder();
      const otherOrg = await prisma.org.create({ data: { slug: `other-${Date.now()}`, name: 'Other' } });
      const otherWorkspace = await prisma.workspace.create({
        data: { orgId: otherOrg.id, name: 'Other WS' },
      });
      const paymentId = 'pay_abc';

      await expect(
        verifyAndCreditPayment({
          orderId: order.orderId,
          paymentId,
          signature: signFor(order.orderId, paymentId),
          workspaceId: otherWorkspace.id,
        }),
      ).rejects.toThrow(/does not belong/);
    });

    it('is idempotent — the same payment id is only credited once', async () => {
      const { workspace, order } = await setupOrder();
      const paymentId = 'pay_dup';
      const args = {
        orderId: order.orderId,
        paymentId,
        signature: signFor(order.orderId, paymentId),
        workspaceId: workspace.id,
      };

      await verifyAndCreditPayment(args);
      await verifyAndCreditPayment(args);

      const ledger = await prisma.creditLedgerEntry.findMany({ where: { workspaceId: workspace.id } });
      expect(ledger).toHaveLength(1);
    });

    it('404s for an unknown or expired order id', async () => {
      await saveRazorpaySettings({ keyId: 'k', keySecret: 'test_secret' }, null);

      await expect(
        verifyAndCreditPayment({
          orderId: 'order_never_created',
          paymentId: 'pay_1',
          signature: signFor('order_never_created', 'pay_1'),
          workspaceId: 'irrelevant',
        }),
      ).rejects.toThrow(/Unknown or expired order/);
    });
  });

  describe('handleWebhookEvent', () => {
    async function setupOrderWithWebhookSecret(credits = 600) {
      await saveRazorpaySettings(
        { keyId: 'rzp_test_key', keySecret: 'test_secret', webhookSecret: 'whsec_test' },
        null,
      );
      const workspace = await makeWorkspace();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'order_wh1' }), { status: 200 })),
      );
      await createOrder({ workspaceId: workspace.id, credits, currency: 'INR' });
      vi.unstubAllGlobals();
      return workspace;
    }

    it('credits the workspace on a valid payment.captured event, keyed by order_id not client-sent notes', async () => {
      const workspace = await setupOrderWithWebhookSecret(600);
      const payload = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_wh1', order_id: 'order_wh1', amount: 250_000 } } },
      };
      const rawBody = Buffer.from(JSON.stringify(payload));
      const signature = createHmac('sha256', 'whsec_test').update(rawBody).digest('hex');

      await handleWebhookEvent(rawBody, signature);

      const ledger = await prisma.creditLedgerEntry.findMany({ where: { workspaceId: workspace.id } });
      expect(ledger).toHaveLength(1);
      expect(ledger[0]).toMatchObject({ delta: 600, reason: 'TOPUP' });
    });

    it('rejects an invalid webhook signature', async () => {
      await saveRazorpaySettings({ keyId: 'k', keySecret: 's', webhookSecret: 'whsec_test' }, null);
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: {} }));

      await expect(handleWebhookEvent(rawBody, 'a'.repeat(64))).rejects.toThrow(
        /Invalid Razorpay webhook signature/,
      );
    });

    it('throws if no webhook secret has been configured', async () => {
      await saveRazorpaySettings({ keyId: 'k', keySecret: 's' }, null);
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: {} }));

      await expect(handleWebhookEvent(rawBody, 'a'.repeat(64))).rejects.toThrow(
        /webhook secret is not configured/,
      );
    });

    it('ignores an unknown order_id instead of crediting anything', async () => {
      await saveRazorpaySettings({ keyId: 'k', keySecret: 's', webhookSecret: 'whsec_test' }, null);
      const payload = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_ghost', order_id: 'order_never_created', amount: 1500 } } },
      };
      const rawBody = Buffer.from(JSON.stringify(payload));
      const signature = createHmac('sha256', 'whsec_test').update(rawBody).digest('hex');

      await expect(handleWebhookEvent(rawBody, signature)).resolves.not.toThrow();
    });

    it('ignores event types other than payment.captured', async () => {
      await saveRazorpaySettings({ keyId: 'k', keySecret: 's', webhookSecret: 'whsec_test' }, null);
      const payload = { event: 'order.paid', payload: {} };
      const rawBody = Buffer.from(JSON.stringify(payload));
      const signature = createHmac('sha256', 'whsec_test').update(rawBody).digest('hex');

      await expect(handleWebhookEvent(rawBody, signature)).resolves.not.toThrow();
    });
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { grantCredits } from '../services/creditService.js';

const app = createApp();

const adminCreds = { email: 'root@datapit.io', password: 'super-secret-admin-pw' };

async function loginAsAdmin() {
  const passwordHash = await hashPassword(adminCreds.password);
  await prisma.superAdmin.create({ data: { email: adminCreds.email, passwordHash, name: 'Root' } });
  const res = await request(app).post('/api/v1/admin/auth/login').send(adminCreds);
  return res.body.accessToken;
}

async function createTenantUser({ suspended = false } = {}) {
  const passwordHash = await hashPassword('correct-horse-battery');
  const org = await prisma.org.create({ data: { name: 'Acme', slug: `acme-${Date.now()}` } });
  const workspace = await prisma.workspace.create({
    data: { orgId: org.id, name: 'Acme Workspace', monthlyCreditGrant: 100 },
  });
  const user = await prisma.user.create({
    data: {
      email: `user-${Date.now()}@acme.test`,
      passwordHash,
      name: 'Acme User',
      emailVerified: true,
      suspendedAt: suspended ? new Date() : null,
    },
  });
  await prisma.membership.create({
    data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
  });
  // Credits are personal — seed the user's own balance (ledger + Redis).
  await grantCredits({
    userId: user.id,
    workspaceId: workspace.id,
    amount: workspace.monthlyCreditGrant,
    reason: 'MONTHLY_GRANT',
  });
  return { user, workspace };
}

describe('admin data routes', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects every admin data route without a token', async () => {
    const res = await request(app).get('/api/v1/admin/overview');
    expect(res.status).toBe(401);
  });

  it('reports overview and usage counts', async () => {
    const token = await loginAsAdmin();
    await createTenantUser();
    await createTenantUser();

    const overview = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${token}`);
    expect(overview.status).toBe(200);
    expect(overview.body.totalUsers).toBe(2);
    expect(overview.body.totalWorkspaces).toBe(2);

    const usage = await request(app)
      .get('/api/v1/admin/usage')
      .set('Authorization', `Bearer ${token}`);
    expect(usage.status).toBe(200);
    expect(usage.body).toHaveProperty('totalReveals');
    expect(usage.body).toHaveProperty('totalSequenceSends');
  });

  it('lists users and returns a detail view with balance and credits used', async () => {
    const token = await loginAsAdmin();
    const { user } = await createTenantUser();

    const list = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.results.some((u) => u.id === user.id)).toBe(true);

    const detail = await request(app)
      .get(`/api/v1/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.balance).toBe(100);
    expect(detail.body.creditsUsed).toBe(0);
  });

  it('suspends a user, blocking their login, then unsuspends them', async () => {
    const token = await loginAsAdmin();
    const { user } = await createTenantUser();

    const suspend = await request(app)
      .post(`/api/v1/admin/users/${user.id}/suspend`)
      .set('Authorization', `Bearer ${token}`);
    expect(suspend.status).toBe(204);

    const blockedLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'correct-horse-battery' });
    expect(blockedLogin.status).toBe(403);

    const unsuspend = await request(app)
      .post(`/api/v1/admin/users/${user.id}/unsuspend`)
      .set('Authorization', `Bearer ${token}`);
    expect(unsuspend.status).toBe(204);

    const restoredLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'correct-horse-battery' });
    expect(restoredLogin.status).toBe(200);
  });

  it('grants an arbitrary credit amount as a ledger ADJUSTMENT, not a payment', async () => {
    const token = await loginAsAdmin();
    const { user, workspace } = await createTenantUser();

    const res = await request(app)
      .post(`/api/v1/admin/users/${user.id}/credits`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 250 });

    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(350);

    const ledgerEntry = await prisma.creditLedgerEntry.findFirst({
      where: { workspaceId: workspace.id, reason: 'ADJUSTMENT' },
    });
    expect(ledgerEntry.delta).toBe(250);
    expect(ledgerEntry.amountCents).toBeNull();
  });

  it('changes a workspace plan and its monthly credit grant, without touching the balance', async () => {
    const token = await loginAsAdmin();
    const { user, workspace } = await createTenantUser();
    const balanceBefore = await request(app)
      .get(`/api/v1/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .then((r) => r.body.balance);

    const res = await request(app)
      .put(`/api/v1/admin/users/${user.id}/plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'PROFESSIONAL' });

    expect(res.status).toBe(200);
    // No explicit seats -> defaults to the plan's allotment (Professional = 25),
    // so the grant is 1200 x 25.
    expect(res.body).toEqual({
      workspaceId: workspace.id,
      plan: 'PROFESSIONAL',
      seats: 25,
      monthlyCreditGrant: 30000,
    });

    const updated = await prisma.workspace.findUnique({ where: { id: workspace.id } });
    expect(updated.plan).toBe('PROFESSIONAL');
    expect(updated.monthlyCreditGrant).toBe(30000);

    const detail = await request(app)
      .get(`/api/v1/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.body.workspace.plan).toBe('PROFESSIONAL');
    expect(detail.body.balance).toBe(balanceBefore); // no credits granted just from switching plans
  });

  it('rejects an unknown plan value', async () => {
    const token = await loginAsAdmin();
    const { user } = await createTenantUser();

    const res = await request(app)
      .put(`/api/v1/admin/users/${user.id}/plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'GOLD_TIER' });

    expect(res.status).toBe(400);
  });

  it('billing overview only counts TOPUP amountCents as revenue, never ADJUSTMENT grants', async () => {
    const token = await loginAsAdmin();
    const { user, workspace } = await createTenantUser();

    await request(app)
      .post(`/api/v1/admin/users/${user.id}/credits`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 500 });
    await prisma.creditLedgerEntry.create({
      data: { workspaceId: workspace.id, delta: 600, reason: 'TOPUP', amountCents: 3000 },
    });

    const overview = await request(app)
      .get('/api/v1/admin/billing/overview')
      .set('Authorization', `Bearer ${token}`);
    expect(overview.status).toBe(200);
    expect(overview.body.totalRevenueCents).toBe(3000);
    expect(overview.body.transactionCount).toBe(1);
    expect(overview.body.paymentGateway).toEqual({ provider: 'stripe', connected: false });

    const transactions = await request(app)
      .get('/api/v1/admin/billing/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(transactions.status).toBe(200);
    expect(transactions.body.total).toBe(2); // the ADJUSTMENT and the TOPUP
  });

  describe('/admin/settings/stripe', () => {
    it('reports not configured before anything is saved', async () => {
      const token = await loginAsAdmin();

      const res = await request(app)
        .get('/api/v1/admin/settings/stripe')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        configured: false,
        keySecretLast4: null,
        hasWebhookSecret: false,
      });
    });

    it('saves the secret key, never echoes it back, and reports configured afterward', async () => {
      const token = await loginAsAdmin();

      const saveRes = await request(app)
        .put('/api/v1/admin/settings/stripe')
        .set('Authorization', `Bearer ${token}`)
        .send({ secretKey: 'sk_test_super-secret-key-value' });

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.configured).toBe(true);
      expect(saveRes.body.keySecretLast4).toBe('alue');
      expect(JSON.stringify(saveRes.body)).not.toContain('super-secret-key-value');

      // The secret is genuinely encrypted at rest, not just omitted from the API response.
      const row = await prisma.paymentGatewaySettings.findUnique({ where: { id: 'stripe' } });
      expect(row.keySecretEncrypted).not.toContain('super-secret-key-value');

      const readBack = await request(app)
        .get('/api/v1/admin/settings/stripe')
        .set('Authorization', `Bearer ${token}`);
      expect(readBack.body.configured).toBe(true);
    });

    it('rotating just the webhook secret leaves a previously-saved secret key intact', async () => {
      const token = await loginAsAdmin();
      await request(app)
        .put('/api/v1/admin/settings/stripe')
        .set('Authorization', `Bearer ${token}`)
        .send({ secretKey: 'sk_test_original-secret' });

      const updateRes = await request(app)
        .put('/api/v1/admin/settings/stripe')
        .set('Authorization', `Bearer ${token}`)
        .send({ webhookSecret: 'whsec_rotated' });

      expect(updateRes.body.keySecretLast4).toBe('cret'); // still "sk_test_original-secret"'s last 4
      expect(updateRes.body.hasWebhookSecret).toBe(true);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/admin/settings/stripe');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /promotions', () => {
    it('sends to every non-suspended, non-opted-out user and reports the recipient count', async () => {
      const token = await loginAsAdmin();
      const { user: normal } = await createTenantUser();
      const { user: suspended } = await createTenantUser({ suspended: true });
      const { user: optedOut } = await createTenantUser();
      await prisma.user.update({ where: { id: optedOut.id }, data: { marketingOptOut: true } });

      const res = await request(app)
        .post('/api/v1/admin/promotions')
        .set('Authorization', `Bearer ${token}`)
        .send({ subject: 'A new feature just shipped', body: '<p>Check it out.</p>' });

      expect(res.status).toBe(200);
      // Exactly the eligible user counted — not the suspended or opted-out ones.
      expect(res.body.recipientCount).toBeGreaterThanOrEqual(1);

      const allEligible = await prisma.user.findMany({
        where: { suspendedAt: null, marketingOptOut: false },
      });
      expect(res.body.recipientCount).toBe(allEligible.length);
      expect(allEligible.map((u) => u.id)).toContain(normal.id);
      expect(allEligible.map((u) => u.id)).not.toContain(suspended.id);
      expect(allEligible.map((u) => u.id)).not.toContain(optedOut.id);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/admin/promotions')
        .send({ subject: 'Hi', body: 'Hi' });
      expect(res.status).toBe(401);
    });

    it('rejects an empty subject or body', async () => {
      const token = await loginAsAdmin();
      const res = await request(app)
        .post('/api/v1/admin/promotions')
        .set('Authorization', `Bearer ${token}`)
        .send({ subject: '', body: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /audit-log', () => {
    it('records who did what to whom for suspend/unsuspend/plan-change/add-credits', async () => {
      const token = await loginAsAdmin();
      const { user } = await createTenantUser();

      await request(app)
        .post(`/api/v1/admin/users/${user.id}/suspend`)
        .set('Authorization', `Bearer ${token}`);
      await request(app)
        .post(`/api/v1/admin/users/${user.id}/unsuspend`)
        .set('Authorization', `Bearer ${token}`);
      await request(app)
        .put(`/api/v1/admin/users/${user.id}/plan`)
        .set('Authorization', `Bearer ${token}`)
        .send({ plan: 'BASIC' });
      await request(app)
        .post(`/api/v1/admin/users/${user.id}/credits`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 500 });

      const res = await request(app)
        .get('/api/v1/admin/audit-log')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(4);
      const actions = res.body.results.map((e) => e.action);
      expect(actions).toEqual(['ADD_CREDITS', 'UPDATE_PLAN', 'UNSUSPEND_USER', 'SUSPEND_USER']); // newest first

      const planEntry = res.body.results.find((e) => e.action === 'UPDATE_PLAN');
      expect(planEntry.metadata).toMatchObject({ from: 'FREE', to: 'BASIC' });
      expect(planEntry.targetUser.id).toBe(user.id);
      expect(planEntry.superAdmin.email).toBe(adminCreds.email);

      const creditsEntry = res.body.results.find((e) => e.action === 'ADD_CREDITS');
      expect(creditsEntry.metadata).toEqual({ amount: 500 });
    });

    it('filters by target user', async () => {
      const token = await loginAsAdmin();
      const { user: userA } = await createTenantUser();
      const { user: userB } = await createTenantUser();

      await request(app)
        .post(`/api/v1/admin/users/${userA.id}/suspend`)
        .set('Authorization', `Bearer ${token}`);
      await request(app)
        .post(`/api/v1/admin/users/${userB.id}/suspend`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .get(`/api/v1/admin/audit-log?userId=${userA.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.results[0].targetUser.id).toBe(userA.id);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/admin/audit-log');
      expect(res.status).toBe(401);
    });
  });
});

describe('audit log coverage for settings, imports and promotions', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  it('records SEND_PROMOTION with the subject and recipient count', async () => {
    const token = await loginAsAdmin();
    await createTenantUser();
    const res = await request(app)
      .post('/api/v1/admin/promotions')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Big news', body: '<p>Hi</p>' });
    expect(res.status).toBe(200);

    const log = await request(app).get('/api/v1/admin/audit-log').set('Authorization', `Bearer ${token}`);
    const entry = log.body.results.find((e) => e.action === 'SEND_PROMOTION');
    expect(entry).toBeTruthy();
    expect(entry.metadata).toEqual({ subject: 'Big news', recipientCount: res.body.recipientCount });
    expect(entry.targetUser).toBeFalsy();
  });

  it('records SAVE_STRIPE_SETTINGS naming which fields were set — never the values', async () => {
    const token = await loginAsAdmin();
    const res = await request(app)
      .put('/api/v1/admin/settings/stripe')
      .set('Authorization', `Bearer ${token}`)
      .send({ secretKey: 'sk_test_abc123', webhookSecret: 'whsec_abc123' });
    expect(res.status).toBe(200);

    const log = await request(app).get('/api/v1/admin/audit-log').set('Authorization', `Bearer ${token}`);
    const entry = log.body.results.find((e) => e.action === 'SAVE_STRIPE_SETTINGS');
    expect(entry.metadata).toEqual({ fields: ['secretKey', 'webhookSecret'] });
    expect(JSON.stringify(entry)).not.toContain('sk_test_abc123');
  });
});

describe('admin seats override', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  it('setting seats scales the monthly grant and lands in the audit log', async () => {
    const token = await loginAsAdmin();
    const { user, workspace } = await createTenantUser();

    const res = await request(app)
      .put(`/api/v1/admin/users/${user.id}/plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'BASIC', seats: 4 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      workspaceId: workspace.id,
      plan: 'BASIC',
      seats: 4,
      monthlyCreditGrant: 2000, // 500/seat x 4
    });

    const log = await request(app)
      .get('/api/v1/admin/audit-log')
      .set('Authorization', `Bearer ${token}`);
    const entry = log.body.results.find((e) => e.action === 'UPDATE_PLAN');
    expect(entry.metadata).toMatchObject({ to: 'BASIC', fromSeats: 1, toSeats: 4 });
  });
});

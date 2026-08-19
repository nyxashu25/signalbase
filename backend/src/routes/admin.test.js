import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { initializeBalance } from '../services/creditService.js';

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
      suspendedAt: suspended ? new Date() : null,
    },
  });
  await prisma.membership.create({
    data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
  });
  await initializeBalance(workspace.id, workspace.monthlyCreditGrant);
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
});

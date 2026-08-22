import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { redis } from '../config/redis.js';
import { getBalance } from '../services/creditService.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';

const app = createApp();

async function registerOrg(orgName, email) {
  const res = await registerAndVerify(app, {
    email,
    password: 'correct-horse-battery',
    name: 'Owner',
    orgName,
  });
  return { accessToken: res.body.accessToken, workspaceId: res.body.workspace.id };
}

async function seedContact() {
  const company = await prisma.company.create({
    data: { name: 'Nova Systems', domain: `novasystems-${Date.now()}.com` },
  });
  return prisma.contact.create({
    data: { companyId: company.id, firstName: 'Jordan', lastName: 'Bennett' },
  });
}

describe('lists: multi-tenant isolation + RBAC', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('a user in org B cannot fetch a list belonging to org A, even by guessing its id', async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');

    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ name: "Org A's leads", type: 'CONTACTS' });
    const listId = createRes.body.list.id;

    const crossTenantRead = await request(app)
      .get(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    // 404, not 403 — the response must not distinguish "exists but forbidden"
    // from "does not exist", or it leaks other tenants' resource ids.
    expect(crossTenantRead.status).toBe(404);

    const crossTenantDelete = await request(app)
      .delete(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);
    expect(crossTenantDelete.status).toBe(404);

    // And the list must still be there for its actual owner.
    const ownerRead = await request(app)
      .get(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${orgA.accessToken}`);
    expect(ownerRead.status).toBe(200);
  });

  it("org B's list index never includes org A's lists", async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');

    await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ name: "Org A's leads", type: 'CONTACTS' });

    const indexRes = await request(app)
      .get('/api/v1/lists')
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    expect(indexRes.status).toBe(200);
    expect(indexRes.body.lists).toHaveLength(0);
  });

  it('a MEMBER cannot delete a list; an OWNER can', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');

    const memberEmail = 'member@org-a.test';
    const memberUser = await prisma.user.create({
      data: {
        email: memberEmail,
        passwordHash: await hashPassword('member-pass-1234'),
        name: 'Member',
        emailVerified: true,
      },
    });
    await prisma.membership.create({
      data: { userId: memberUser.id, workspaceId: owner.workspaceId, role: 'MEMBER' },
    });
    const memberLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password: 'member-pass-1234', workspaceId: owner.workspaceId });
    const memberToken = memberLogin.body.accessToken;

    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Shared list', type: 'CONTACTS' });
    const listId = createRes.body.list.id;

    const memberDelete = await request(app)
      .delete(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memberDelete.status).toBe(403);

    const ownerDelete = await request(app)
      .delete(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(ownerDelete.status).toBe(204);
  });
});

describe('list items', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('adds a contact to a CONTACTS list and it shows up in the list detail with company info', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');
    const contact = await seedContact();

    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Leads', type: 'CONTACTS' });
    const listId = createRes.body.list.id;

    const addRes = await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ contactId: contact.id });
    expect(addRes.status).toBe(201);

    const showRes = await request(app)
      .get(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(showRes.body.list.items).toHaveLength(1);
    expect(showRes.body.list.items[0].contact.firstName).toBe('Jordan');
    expect(showRes.body.list.items[0].contact.company.name).toBe('Nova Systems');
  });

  it('rejects adding a company to a CONTACTS list (type mismatch)', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');
    const company = await prisma.company.create({
      data: { name: 'Atlas Labs', domain: `atlaslabs-${Date.now()}.com` },
    });

    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Leads', type: 'CONTACTS' });
    const listId = createRes.body.list.id;

    const addRes = await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ companyId: company.id });
    expect(addRes.status).toBe(400);
  });

  it('adding the same contact twice is idempotent, not an error', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');
    const contact = await seedContact();

    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Leads', type: 'CONTACTS' });
    const listId = createRes.body.list.id;

    const first = await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ contactId: contact.id });
    const second = await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ contactId: contact.id });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const count = await prisma.listItem.count({ where: { listId } });
    expect(count).toBe(1);
  });

  it('removes an item from a list', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');
    const contact = await seedContact();

    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Leads', type: 'CONTACTS' });
    const listId = createRes.body.list.id;

    const addRes = await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ contactId: contact.id });
    const itemId = addRes.body.item.id;

    const removeRes = await request(app)
      .delete(`/api/v1/lists/${listId}/items/${itemId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(removeRes.status).toBe(204);

    const showRes = await request(app)
      .get(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(showRes.body.list.items).toHaveLength(0);
  });

  it('org B cannot add to or remove from org A\'s list', async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');
    const contact = await seedContact();

    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ name: "Org A's leads", type: 'CONTACTS' });
    const listId = createRes.body.list.id;

    const crossTenantAdd = await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .send({ contactId: contact.id });
    expect(crossTenantAdd.status).toBe(404);

    const legitAdd = await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ contactId: contact.id });
    const itemId = legitAdd.body.item.id;

    const crossTenantRemove = await request(app)
      .delete(`/api/v1/lists/${listId}/items/${itemId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);
    expect(crossTenantRemove.status).toBe(404);
  });
});

describe('list export', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('exports a CONTACTS list as CSV with the email masked (not revealed for this workspace)', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');
    const company = await prisma.company.create({
      data: { name: 'Nova Systems', domain: `novasystems-${Date.now()}.com` },
    });
    const contact = await prisma.contact.create({
      data: {
        companyId: company.id,
        firstName: 'Jordan',
        lastName: 'Bennett',
        email: 'jordan.bennett@novasystems.com',
      },
    });

    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Q3 Leads!', type: 'CONTACTS' });
    const listId = createRes.body.list.id;
    await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ contactId: contact.id });

    const res = await request(app)
      .get(`/api/v1/lists/${listId}/export`)
      .set('Authorization', `Bearer ${owner.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    // The list name is slugified into the filename.
    expect(res.headers['content-disposition']).toMatch(/filename="q3-leads\.csv"/);
    expect(res.text).toContain('Jordan,Bennett,,Nova Systems');
    expect(res.text).not.toContain('jordan.bennett@novasystems.com');
    expect(res.text).toContain('Masked');
  });

  it('exports a COMPANIES list as CSV', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');
    const company = await prisma.company.create({
      data: {
        name: 'Atlas Labs',
        domain: `atlaslabs-${Date.now()}.com`,
        industry: 'SaaS',
        techStack: ['React', 'AWS'],
      },
    });

    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Target Accounts', type: 'COMPANIES' });
    const listId = createRes.body.list.id;
    await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ companyId: company.id });

    const res = await request(app)
      .get(`/api/v1/lists/${listId}/export`)
      .set('Authorization', `Bearer ${owner.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Atlas Labs');
    expect(res.text).toContain('React; AWS');
  });

  it('blocks cross-tenant export', async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');
    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ name: "Org A's leads", type: 'CONTACTS' });

    const res = await request(app)
      .get(`/api/v1/lists/${createRes.body.list.id}/export`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    expect(res.status).toBe(404);
  });

  it('charges CREDIT_COSTS.CSV_EXPORT and refunds nothing on a 404 (never reaches the commit)', async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');
    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ name: "Org A's leads", type: 'CONTACTS' });
    const before = await getBalance(orgA.workspaceId);

    const success = await request(app)
      .get(`/api/v1/lists/${createRes.body.list.id}/export`)
      .set('Authorization', `Bearer ${orgA.accessToken}`);
    expect(success.status).toBe(200);
    expect(await getBalance(orgA.workspaceId)).toBe(before - CREDIT_COSTS.CSV_EXPORT);

    const beforeB = await getBalance(orgB.workspaceId);
    const notFound = await request(app)
      .get(`/api/v1/lists/${createRes.body.list.id}/export`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);
    expect(notFound.status).toBe(404);
    // Reserved then released on the 404 — org B's balance is untouched.
    expect(await getBalance(orgB.workspaceId)).toBe(beforeB);
  });

  it('rejects with 402 when the workspace is out of credits', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');
    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Empty list', type: 'CONTACTS' });
    await redis.set(`credits:balance:${owner.workspaceId}`, 0);

    const res = await request(app)
      .get(`/api/v1/lists/${createRes.body.list.id}/export`)
      .set('Authorization', `Bearer ${owner.accessToken}`);

    expect(res.status).toBe(402);
  });
});

describe('list creation rate limit', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rate-limits list creation per workspace (limit 30/hour)', async () => {
    const owner = await registerOrg('Rate Limited Lists', 'owner@list-rate-limit.test');

    for (let i = 0; i < 30; i++) {
      const res = await request(app)
        .post('/api/v1/lists')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: `List ${i}`, type: 'CONTACTS' });
      expect(res.status).toBe(201);
    }

    const overLimit = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'One too many', type: 'CONTACTS' });
    expect(overLimit.status).toBe(429);
  });
});

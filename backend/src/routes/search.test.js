import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { es } from '../config/elasticsearch.js';
import { reindexAll } from '../services/indexerService.js';
import { COMPANIES_INDEX, CONTACTS_INDEX } from '../config/esIndices.js';
import { redis } from '../config/redis.js';
import { getBalance } from '../services/creditService.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';

const app = createApp();

async function registerAndLogin(orgName, email) {
  const res = await registerAndVerify(app, {
    email,
    password: 'correct-horse-battery',
    name: 'Owner',
    orgName,
  });
  return {
    accessToken: res.body.accessToken,
    workspaceId: res.body.workspace.id,
    userId: res.body.user.id,
  };
}

async function seedFixtures() {
  const nova = await prisma.company.create({
    data: {
      name: 'Nova Systems',
      domain: 'novasystems.com',
      industry: 'SaaS',
      location: 'Austin, TX',
      techStack: ['React'],
      headcountMin: 201,
      headcountMax: 500,
    },
  });
  const halo = await prisma.company.create({
    data: {
      name: 'Halo Health',
      domain: 'halohealth.com',
      industry: 'Healthcare',
      location: 'Boston, MA',
      techStack: ['AWS'],
      headcountMin: 11,
      headcountMax: 50,
    },
  });

  const contact = await prisma.contact.create({
    data: {
      companyId: nova.id,
      firstName: 'Jordan',
      lastName: 'Bennett',
      title: 'VP of Sales',
      seniority: 'VP',
      department: 'Sales',
      email: 'jordan.bennett@novasystems.com',
      emailVerified: true,
    },
  });

  await reindexAll();
  return { nova, halo, contact };
}

// A second, deliberately different contact for the filter/sort tests —
// unverified email, a finance title, at the other company.
async function seedSecondContact(halo) {
  const contact = await prisma.contact.create({
    data: {
      companyId: halo.id,
      firstName: 'Avery',
      lastName: 'Chen',
      title: 'Finance Manager',
      seniority: 'Manager',
      department: 'Finance',
      email: 'avery.chen@halohealth.com',
      emailVerified: false,
    },
  });
  await reindexAll();
  return contact;
}

describe('search API', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
    // ES documents from the previous test's reindexAll() must not leak into
    // the next test — Postgres is wiped by resetDb, but ES is a separate
    // store and needs its own reset.
    await es
      .deleteByQuery({ index: COMPANIES_INDEX, query: { match_all: {} }, refresh: true })
      .catch(() => {});
    await es
      .deleteByQuery({ index: CONTACTS_INDEX, query: { match_all: {} }, refresh: true })
      .catch(() => {});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('filters companies by industry facet and returns facet counts', async () => {
    await seedFixtures();
    const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

    const res = await request(app)
      .get('/api/v1/search/companies')
      .query({ industry: 'SaaS' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].name).toBe('Nova Systems');
    expect(res.body.facets.industry).toEqual(expect.arrayContaining([{ value: 'SaaS', count: 1 }]));
  });

  it('full-text matches company name', async () => {
    await seedFixtures();
    const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

    const res = await request(app)
      .get('/api/v1/search/companies')
      .query({ q: 'Nova' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.results.map((r) => r.name)).toEqual(['Nova Systems']);
  });

  it('masks emails in people search results unless the workspace revealed them', async () => {
    const { contact } = await seedFixtures();
    const orgA = await registerAndLogin('Org A', 'owner@org-a.test');
    const orgB = await registerAndLogin('Org B', 'owner@org-b.test');

    await prisma.emailReveal.create({
      data: {
        workspaceId: orgA.workspaceId,
        contactId: contact.id,
        revealedById: (
          await prisma.membership.findFirstOrThrow({ where: { workspaceId: orgA.workspaceId } })
        ).userId,
      },
    });

    const asA = await request(app)
      .get('/api/v1/search/people')
      .set('Authorization', `Bearer ${orgA.accessToken}`);
    const asB = await request(app)
      .get('/api/v1/search/people')
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    expect(asA.body.results[0].revealed).toBe(true);
    expect(asA.body.results[0].email).toBe('jordan.bennett@novasystems.com');

    expect(asB.body.results[0].revealed).toBe(false);
    expect(asB.body.results[0].email).not.toBe('jordan.bennett@novasystems.com');
    expect(asB.body.results[0].email).toMatch(/^j\*+@n\*+\.com$/);
  });

  describe('people filters & sort', () => {
    it('filters by job-title "contains" (prefix phrase match), separately from q', async () => {
      const { halo } = await seedFixtures();
      await seedSecondContact(halo);
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const res = await request(app)
        .get('/api/v1/search/people')
        .query({ title: 'finance man' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results.map((r) => r.lastName)).toEqual(['Chen']);
    });

    it('filters by company name "contains"', async () => {
      const { halo } = await seedFixtures();
      await seedSecondContact(halo);
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const res = await request(app)
        .get('/api/v1/search/people')
        .query({ company: 'Halo' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.body.results.map((r) => r.lastName)).toEqual(['Chen']);
    });

    it('filters by email status and reports per-status facet counts', async () => {
      const { halo } = await seedFixtures();
      await seedSecondContact(halo);
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const all = await request(app)
        .get('/api/v1/search/people')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(all.body.facets.emailStatus).toEqual([
        { value: 'verified', count: 1 },
        { value: 'unverified', count: 1 },
        { value: 'not_found', count: 0 },
      ]);

      const verifiedOnly = await request(app)
        .get('/api/v1/search/people')
        .query({ emailStatus: 'verified' })
        .set('Authorization', `Bearer ${accessToken}`);
      expect(verifiedOnly.body.results.map((r) => r.lastName)).toEqual(['Bennett']);

      const both = await request(app)
        .get('/api/v1/search/people')
        .query({ emailStatus: ['verified', 'unverified'] })
        .set('Authorization', `Bearer ${accessToken}`);
      expect(both.body.total).toBe(2);
    });

    it('sorts by name in both directions', async () => {
      const { halo } = await seedFixtures();
      await seedSecondContact(halo);
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const asc = await request(app)
        .get('/api/v1/search/people')
        .query({ sort: 'name_asc' })
        .set('Authorization', `Bearer ${accessToken}`);
      expect(asc.body.results.map((r) => r.firstName)).toEqual(['Avery', 'Jordan']);

      const desc = await request(app)
        .get('/api/v1/search/people')
        .query({ sort: 'name_desc' })
        .set('Authorization', `Bearer ${accessToken}`);
      expect(desc.body.results.map((r) => r.firstName)).toEqual(['Jordan', 'Avery']);
    });

    it('rejects an unknown sort or email status with 400', async () => {
      await seedFixtures();
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const badSort = await request(app)
        .get('/api/v1/search/people')
        .query({ sort: 'sideways' })
        .set('Authorization', `Bearer ${accessToken}`);
      expect(badSort.status).toBe(400);

      const badStatus = await request(app)
        .get('/api/v1/search/people')
        .query({ emailStatus: 'maybe' })
        .set('Authorization', `Bearer ${accessToken}`);
      expect(badStatus.status).toBe(400);
    });
  });

  describe('company filters & sort', () => {
    it('filters by headcount bucket and reports bucket facet counts in declared order', async () => {
      await seedFixtures();
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const all = await request(app)
        .get('/api/v1/search/companies')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(all.body.facets.headcount.map((b) => b.value)).toEqual([
        '1-10',
        '11-50',
        '51-200',
        '201-500',
        '501-1000',
        '1001-5000',
        '5001+',
      ]);
      expect(all.body.facets.headcount.find((b) => b.value === '11-50').count).toBe(1);
      expect(all.body.facets.headcount.find((b) => b.value === '201-500').count).toBe(1);

      const mid = await request(app)
        .get('/api/v1/search/companies')
        .query({ headcount: '201-500' })
        .set('Authorization', `Bearer ${accessToken}`);
      expect(mid.body.results.map((r) => r.name)).toEqual(['Nova Systems']);
    });

    it('sorts by headcount descending and by name', async () => {
      await seedFixtures();
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const byHeadcount = await request(app)
        .get('/api/v1/search/companies')
        .query({ sort: 'headcount_desc' })
        .set('Authorization', `Bearer ${accessToken}`);
      expect(byHeadcount.body.results.map((r) => r.name)).toEqual(['Nova Systems', 'Halo Health']);

      const byNameDesc = await request(app)
        .get('/api/v1/search/companies')
        .query({ sort: 'name_desc' })
        .set('Authorization', `Bearer ${accessToken}`);
      expect(byNameDesc.body.results.map((r) => r.name)).toEqual(['Nova Systems', 'Halo Health']);

      const byNameAsc = await request(app)
        .get('/api/v1/search/companies')
        .query({ sort: 'name_asc' })
        .set('Authorization', `Bearer ${accessToken}`);
      expect(byNameAsc.body.results.map((r) => r.name)).toEqual(['Halo Health', 'Nova Systems']);
    });
  });

  describe('saved searches', () => {
    it('creates, lists (filtered by type), and deletes a saved search', async () => {
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const created = await request(app)
        .post('/api/v1/search/saved')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'PEOPLE',
          name: 'Finance leaders, Germany',
          filters: { title: 'finance', location: ['Germany'], emailStatus: ['verified'] },
        });
      expect(created.status).toBe(201);
      expect(created.body.savedSearch.name).toBe('Finance leaders, Germany');
      expect(created.body.savedSearch.filters.location).toEqual(['Germany']);

      await request(app)
        .post('/api/v1/search/saved')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'COMPANIES', name: 'Mid-size SaaS', filters: { industry: ['SaaS'] } });

      const peopleOnly = await request(app)
        .get('/api/v1/search/saved?type=PEOPLE')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(peopleOnly.body.savedSearches.map((s) => s.name)).toEqual(['Finance leaders, Germany']);

      const all = await request(app)
        .get('/api/v1/search/saved')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(all.body.savedSearches).toHaveLength(2);

      const del = await request(app)
        .delete(`/api/v1/search/saved/${created.body.savedSearch.id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(del.status).toBe(204);

      const after = await request(app)
        .get('/api/v1/search/saved?type=PEOPLE')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(after.body.savedSearches).toHaveLength(0);
    });

    it("never shows or deletes another workspace's saved searches", async () => {
      const orgA = await registerAndLogin('Org A', 'owner@org-a.test');
      const orgB = await registerAndLogin('Org B', 'owner@org-b.test');

      const created = await request(app)
        .post('/api/v1/search/saved')
        .set('Authorization', `Bearer ${orgA.accessToken}`)
        .send({ type: 'PEOPLE', name: 'A only', filters: {} });

      const asB = await request(app)
        .get('/api/v1/search/saved')
        .set('Authorization', `Bearer ${orgB.accessToken}`);
      expect(asB.body.savedSearches).toHaveLength(0);

      const delAsB = await request(app)
        .delete(`/api/v1/search/saved/${created.body.savedSearch.id}`)
        .set('Authorization', `Bearer ${orgB.accessToken}`);
      expect(delAsB.status).toBe(404);
    });

    it('rejects an empty name or an unknown type', async () => {
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const noName = await request(app)
        .post('/api/v1/search/saved')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'PEOPLE', name: '  ', filters: {} });
      expect(noName.status).toBe(400);

      const badType = await request(app)
        .post('/api/v1/search/saved')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'DEALS', name: 'x', filters: {} });
      expect(badType.status).toBe(400);
    });
  });

  it('paginates results and reports the true total', async () => {
    await seedFixtures();
    const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

    const res = await request(app)
      .get('/api/v1/search/companies')
      .query({ pageSize: 1, page: 1 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.total).toBe(2);
  });

  describe('company detail', () => {
    it('returns the company with its contacts, emails masked by default', async () => {
      const { nova } = await seedFixtures();
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const res = await request(app)
        .get(`/api/v1/search/companies/${nova.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.company.name).toBe('Nova Systems');
      expect(res.body.company.contacts).toHaveLength(1);
      expect(res.body.company.contacts[0].firstName).toBe('Jordan');
      expect(res.body.company.contacts[0].revealed).toBe(false);
      expect(res.body.company.contacts[0].email).not.toBe('jordan.bennett@novasystems.com');
    });

    it('reflects this workspace\'s reveal status on the contact list', async () => {
      const { nova, contact } = await seedFixtures();
      const { accessToken, workspaceId } = await registerAndLogin('Acme', 'owner@acme.test');

      await prisma.emailReveal.create({
        data: {
          workspaceId,
          contactId: contact.id,
          revealedById: (
            await prisma.membership.findFirstOrThrow({ where: { workspaceId } })
          ).userId,
        },
      });

      const res = await request(app)
        .get(`/api/v1/search/companies/${nova.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.body.company.contacts[0].revealed).toBe(true);
      expect(res.body.company.contacts[0].email).toBe('jordan.bennett@novasystems.com');
    });

    it('excludes redacted contacts', async () => {
      const { nova, contact } = await seedFixtures();
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');
      await prisma.contact.update({ where: { id: contact.id }, data: { redactedAt: new Date() } });

      const res = await request(app)
        .get(`/api/v1/search/companies/${nova.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.body.company.contacts).toHaveLength(0);
    });

    it('404s for an unknown company id', async () => {
      await seedFixtures();
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const res = await request(app)
        .get('/api/v1/search/companies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    it('charges once for the first view and nothing for a repeat view', async () => {
      const { nova } = await seedFixtures();
      const { accessToken, workspaceId, userId } = await registerAndLogin('Acme', 'owner@acme.test');
      const before = await getBalance(userId);

      const first = await request(app)
        .get(`/api/v1/search/companies/${nova.id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(first.status).toBe(200);
      expect(await getBalance(userId)).toBe(before - CREDIT_COSTS.COMPANY_DETAIL_VIEW);

      const second = await request(app)
        .get(`/api/v1/search/companies/${nova.id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(second.status).toBe(200);
      expect(await getBalance(userId)).toBe(before - CREDIT_COSTS.COMPANY_DETAIL_VIEW); // unchanged

      const ledger = await prisma.creditLedgerEntry.findMany({
        where: { workspaceId, delta: { lt: 0 } },
      });
      expect(ledger).toHaveLength(1);
      expect(ledger[0]).toMatchObject({ delta: -CREDIT_COSTS.COMPANY_DETAIL_VIEW, reason: 'COMPANY_VIEW' });

      const views = await prisma.companyDetailView.findMany({ where: { workspaceId } });
      expect(views).toHaveLength(1);
    });

    it('rejects with 402 and charges nothing when the workspace is out of credits', async () => {
      const { nova } = await seedFixtures();
      const { accessToken, workspaceId, userId } = await registerAndLogin('Acme', 'owner@acme.test');
      await redis.set(`credits:balance:user:${userId}`, 0);

      const res = await request(app)
        .get(`/api/v1/search/companies/${nova.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(402);
      const ledger = await prisma.creditLedgerEntry.findMany({
        where: { workspaceId, delta: { lt: 0 } },
      });
      expect(ledger).toHaveLength(0);
      const views = await prisma.companyDetailView.findMany({ where: { workspaceId } });
      expect(views).toHaveLength(0);
    });

    it('two different workspaces viewing the same company are each charged independently', async () => {
      const { nova } = await seedFixtures();
      const orgA = await registerAndLogin('Org A', 'owner@org-a.test');
      const orgB = await registerAndLogin('Org B', 'owner@org-b.test');

      await request(app)
        .get(`/api/v1/search/companies/${nova.id}`)
        .set('Authorization', `Bearer ${orgA.accessToken}`);
      await request(app)
        .get(`/api/v1/search/companies/${nova.id}`)
        .set('Authorization', `Bearer ${orgB.accessToken}`);

      const ledgerA = await prisma.creditLedgerEntry.findMany({
        where: { workspaceId: orgA.workspaceId, delta: { lt: 0 } },
      });
      const ledgerB = await prisma.creditLedgerEntry.findMany({
        where: { workspaceId: orgB.workspaceId, delta: { lt: 0 } },
      });
      expect(ledgerA).toHaveLength(1);
      expect(ledgerB).toHaveLength(1);
    });
  });

  describe('CSV export', () => {
    it('exports companies as CSV, respecting the current filters', async () => {
      await seedFixtures();
      const { accessToken } = await registerAndLogin('Acme', 'owner@acme.test');

      const res = await request(app)
        .get('/api/v1/search/companies/export')
        .query({ industry: 'SaaS' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="datapit-companies\.csv"/);
      const lines = res.text.trim().split('\r\n');
      expect(lines[0]).toBe('Name,Domain,Industry,Headcount Min,Headcount Max,Location,Tech Stack,LinkedIn');
      expect(lines).toHaveLength(2); // header + Nova Systems only
      expect(lines[1]).toContain('Nova Systems');
    });

    it('exports people as CSV with emails masked unless revealed for this workspace', async () => {
      const { contact } = await seedFixtures();
      const orgA = await registerAndLogin('Org A', 'owner@org-a.test');
      const orgB = await registerAndLogin('Org B', 'owner@org-b.test');

      await prisma.emailReveal.create({
        data: {
          workspaceId: orgA.workspaceId,
          contactId: contact.id,
          revealedById: (
            await prisma.membership.findFirstOrThrow({ where: { workspaceId: orgA.workspaceId } })
          ).userId,
        },
      });

      const asA = await request(app)
        .get('/api/v1/search/people/export')
        .set('Authorization', `Bearer ${orgA.accessToken}`);
      const asB = await request(app)
        .get('/api/v1/search/people/export')
        .set('Authorization', `Bearer ${orgB.accessToken}`);

      expect(asA.status).toBe(200);
      expect(asA.headers['content-disposition']).toMatch(/filename="datapit-people\.csv"/);
      expect(asA.text).toContain('jordan.bennett@novasystems.com');
      expect(asA.text).toContain('Revealed');

      expect(asB.text).not.toContain('jordan.bennett@novasystems.com');
      expect(asB.text).toContain('Masked');
    });

    it('charges CSV_EXPORT credits per export, every time (no idempotency)', async () => {
      await seedFixtures();
      const { accessToken, workspaceId, userId } = await registerAndLogin('Acme', 'owner@acme.test');
      const before = await getBalance(userId);

      await request(app)
        .get('/api/v1/search/companies/export')
        .set('Authorization', `Bearer ${accessToken}`);
      await request(app)
        .get('/api/v1/search/companies/export')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(await getBalance(userId)).toBe(before - 2 * CREDIT_COSTS.CSV_EXPORT);
      const ledger = await prisma.creditLedgerEntry.findMany({
        where: { workspaceId, reason: 'CSV_EXPORT' },
      });
      expect(ledger).toHaveLength(2);
    });

    it('rejects with 402 and produces no CSV when the workspace is out of credits', async () => {
      await seedFixtures();
      const { accessToken, workspaceId, userId } = await registerAndLogin('Acme', 'owner@acme.test');
      await redis.set(`credits:balance:user:${userId}`, 0);

      const res = await request(app)
        .get('/api/v1/search/companies/export')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(402);
      const ledger = await prisma.creditLedgerEntry.findMany({
        where: { workspaceId, delta: { lt: 0 } },
      });
      expect(ledger).toHaveLength(0);
    });
  });
});

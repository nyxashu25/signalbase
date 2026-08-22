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
  return { accessToken: res.body.accessToken, workspaceId: res.body.workspace.id };
}

async function seedFixtures() {
  const nova = await prisma.company.create({
    data: {
      name: 'Nova Systems',
      domain: 'novasystems.com',
      industry: 'SaaS',
      location: 'Austin, TX',
      techStack: ['React'],
    },
  });
  const halo = await prisma.company.create({
    data: {
      name: 'Halo Health',
      domain: 'halohealth.com',
      industry: 'Healthcare',
      location: 'Boston, MA',
      techStack: ['AWS'],
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
    },
  });

  await reindexAll();
  return { nova, halo, contact };
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
      const { accessToken, workspaceId } = await registerAndLogin('Acme', 'owner@acme.test');
      const before = await getBalance(workspaceId);

      const first = await request(app)
        .get(`/api/v1/search/companies/${nova.id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(first.status).toBe(200);
      expect(await getBalance(workspaceId)).toBe(before - CREDIT_COSTS.COMPANY_DETAIL_VIEW);

      const second = await request(app)
        .get(`/api/v1/search/companies/${nova.id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(second.status).toBe(200);
      expect(await getBalance(workspaceId)).toBe(before - CREDIT_COSTS.COMPANY_DETAIL_VIEW); // unchanged

      const ledger = await prisma.creditLedgerEntry.findMany({ where: { workspaceId } });
      expect(ledger).toHaveLength(1);
      expect(ledger[0]).toMatchObject({ delta: -CREDIT_COSTS.COMPANY_DETAIL_VIEW, reason: 'COMPANY_VIEW' });

      const views = await prisma.companyDetailView.findMany({ where: { workspaceId } });
      expect(views).toHaveLength(1);
    });

    it('rejects with 402 and charges nothing when the workspace is out of credits', async () => {
      const { nova } = await seedFixtures();
      const { accessToken, workspaceId } = await registerAndLogin('Acme', 'owner@acme.test');
      await redis.set(`credits:balance:${workspaceId}`, 0);

      const res = await request(app)
        .get(`/api/v1/search/companies/${nova.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(402);
      const ledger = await prisma.creditLedgerEntry.findMany({ where: { workspaceId } });
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

      const ledgerA = await prisma.creditLedgerEntry.findMany({ where: { workspaceId: orgA.workspaceId } });
      const ledgerB = await prisma.creditLedgerEntry.findMany({ where: { workspaceId: orgB.workspaceId } });
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
      const { accessToken, workspaceId } = await registerAndLogin('Acme', 'owner@acme.test');
      const before = await getBalance(workspaceId);

      await request(app)
        .get('/api/v1/search/companies/export')
        .set('Authorization', `Bearer ${accessToken}`);
      await request(app)
        .get('/api/v1/search/companies/export')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(await getBalance(workspaceId)).toBe(before - 2 * CREDIT_COSTS.CSV_EXPORT);
      const ledger = await prisma.creditLedgerEntry.findMany({
        where: { workspaceId, reason: 'CSV_EXPORT' },
      });
      expect(ledger).toHaveLength(2);
    });

    it('rejects with 402 and produces no CSV when the workspace is out of credits', async () => {
      await seedFixtures();
      const { accessToken, workspaceId } = await registerAndLogin('Acme', 'owner@acme.test');
      await redis.set(`credits:balance:${workspaceId}`, 0);

      const res = await request(app)
        .get('/api/v1/search/companies/export')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(402);
      const ledger = await prisma.creditLedgerEntry.findMany({ where: { workspaceId } });
      expect(ledger).toHaveLength(0);
    });
  });
});

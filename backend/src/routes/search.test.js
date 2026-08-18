import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { es } from '../config/elasticsearch.js';
import { reindexAll } from '../services/indexerService.js';
import { COMPANIES_INDEX, CONTACTS_INDEX } from '../config/esIndices.js';

const app = createApp();

async function registerAndLogin(orgName, email) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'correct-horse-battery', name: 'Owner', orgName });
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
});

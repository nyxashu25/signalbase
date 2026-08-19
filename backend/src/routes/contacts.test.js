import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';

const app = createApp();

async function registerOrg(orgName, email) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'correct-horse-battery', name: 'Owner', orgName });
  return { accessToken: res.body.accessToken, workspaceId: res.body.workspace.id };
}

async function seedContact() {
  const company = await prisma.company.create({
    data: { name: 'Nova Systems', domain: 'novasystems.com' },
  });
  return prisma.contact.create({
    data: { companyId: company.id, firstName: 'Jordan', lastName: 'Bennett' },
  });
}

function reveal(app, token, contactId, idempotencyKey = randomUUID()) {
  return request(app)
    .post(`/api/v1/contacts/${contactId}/reveal`)
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', idempotencyKey);
}

describe('POST /contacts/:id/reveal', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('finds and returns a pattern-guessed email, charging exactly one reveal', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const contact = await seedContact();

    const res = await reveal(app, org.accessToken, contact.id);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('jordan.bennett@novasystems.com');
    expect(res.body.alreadyRevealed).toBe(false);

    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: org.workspaceId },
    });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].delta).toBe(-2);
    expect(ledger[0].reason).toBe('EMAIL_REVEAL');

    const emailReveal = await prisma.emailReveal.findUnique({
      where: { workspaceId_contactId: { workspaceId: org.workspaceId, contactId: contact.id } },
    });
    expect(emailReveal).not.toBeNull();
  });

  it('requires an Idempotency-Key header', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const contact = await seedContact();

    const res = await request(app)
      .post(`/api/v1/contacts/${contact.id}/reveal`)
      .set('Authorization', `Bearer ${org.accessToken}`);

    expect(res.status).toBe(400);
  });

  it('replays the cached response for a repeated Idempotency-Key without charging twice', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const contact = await seedContact();
    const key = randomUUID();

    const first = await reveal(app, org.accessToken, contact.id, key);
    const second = await reveal(app, org.accessToken, contact.id, key);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);

    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: org.workspaceId },
    });
    expect(ledger).toHaveLength(1);
  });

  it('a second reveal (different idempotency key) for an already-revealed contact is free', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const contact = await seedContact();

    await reveal(app, org.accessToken, contact.id);
    const second = await reveal(app, org.accessToken, contact.id);

    expect(second.status).toBe(200);
    expect(second.body.alreadyRevealed).toBe(true);
    expect(second.body.email).toBe('jordan.bennett@novasystems.com');

    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: org.workspaceId },
    });
    expect(ledger).toHaveLength(1); // only the first reveal charged anything
  });

  it('rejects with 402 and charges nothing when the workspace is out of credits', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const contact = await seedContact();
    await redis.set(`credits:balance:${org.workspaceId}`, 0);

    const res = await reveal(app, org.accessToken, contact.id);

    expect(res.status).toBe(402);
    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: org.workspaceId },
    });
    expect(ledger).toHaveLength(0);
  });

  it('two different workspaces revealing the same global contact are each charged independently', async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');
    const contact = await seedContact();

    const resA = await reveal(app, orgA.accessToken, contact.id);
    const resB = await reveal(app, orgB.accessToken, contact.id);

    expect(resA.body.alreadyRevealed).toBe(false);
    expect(resB.body.alreadyRevealed).toBe(false);
    expect(resB.body.email).toBe(resA.body.email); // same underlying contact, same guessed email

    const ledgerA = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: orgA.workspaceId },
    });
    const ledgerB = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: orgB.workspaceId },
    });
    expect(ledgerA).toHaveLength(1);
    expect(ledgerB).toHaveLength(1);
  });
});

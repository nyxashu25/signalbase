import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';

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

describe('POST /privacy/opt-out', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('redacts an existing contact and reports the count', async () => {
    const company = await prisma.company.create({
      data: { name: 'Nova', domain: 'novasystems.com' },
    });
    const contact = await prisma.contact.create({
      data: {
        companyId: company.id,
        firstName: 'Jordan',
        lastName: 'Bennett',
        email: 'jordan.bennett@novasystems.com',
      },
    });

    const res = await request(app)
      .post('/api/v1/privacy/opt-out')
      .send({ email: 'jordan.bennett@novasystems.com', reason: 'GDPR request' });

    expect(res.status).toBe(202);
    expect(res.body.redactedContacts).toBe(1);

    const updated = await prisma.contact.findUnique({ where: { id: contact.id } });
    expect(updated.email).toBeNull();
    expect(updated.firstName).toBe('[redacted]');
    expect(updated.redactedAt).not.toBeNull();
  });

  it('blocks future reveal of an already-redacted contact with 410', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const company = await prisma.company.create({
      data: { name: 'Nova', domain: 'novasystems.com' },
    });
    const contact = await prisma.contact.create({
      data: {
        companyId: company.id,
        firstName: 'Jordan',
        lastName: 'Bennett',
        email: 'jordan.bennett@novasystems.com',
      },
    });
    await request(app)
      .post('/api/v1/privacy/opt-out')
      .send({ email: 'jordan.bennett@novasystems.com' });

    const res = await request(app)
      .post(`/api/v1/contacts/${contact.id}/reveal`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .set('Idempotency-Key', randomUUID());

    expect(res.status).toBe(410);

    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: org.workspaceId, delta: { lt: 0 } },
    });
    expect(ledger).toHaveLength(0);
  });

  it('blocks a reveal whose pattern-guessed email is on the opt-out registry, without charging', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const company = await prisma.company.create({
      data: { name: 'Nova', domain: 'novasystems.com' },
    });
    // No email on file yet — the finder would guess jordan.bennett@novasystems.com.
    const contact = await prisma.contact.create({
      data: { companyId: company.id, firstName: 'Jordan', lastName: 'Bennett' },
    });
    await request(app)
      .post('/api/v1/privacy/opt-out')
      .send({ email: 'jordan.bennett@novasystems.com' });

    const res = await request(app)
      .post(`/api/v1/contacts/${contact.id}/reveal`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .set('Idempotency-Key', randomUUID());

    expect(res.status).toBe(422);

    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: org.workspaceId, delta: { lt: 0 } },
    });
    expect(ledger).toHaveLength(0);
    const unchanged = await prisma.contact.findUnique({ where: { id: contact.id } });
    expect(unchanged.email).toBeNull(); // never persisted the opted-out guess
  });
});

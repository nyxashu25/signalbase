import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { DOM_TEXT_MAX_CHARS } from '../services/extensionService.js';

const app = createApp();

async function registerOrgWithKey(orgName, email) {
  const res = await registerAndVerify(app, {
    email,
    password: 'correct-horse-battery',
    name: 'Owner',
    orgName,
  });
  const created = await request(app)
    .post('/api/v1/api-keys')
    .set('Authorization', `Bearer ${res.body.accessToken}`)
    .send({ name: 'Extension' });
  return {
    accessToken: res.body.accessToken,
    workspaceId: res.body.workspace.id,
    userId: res.body.user.id,
    apiKey: created.body.key,
  };
}

async function seedContact(overrides = {}) {
  const company = await prisma.company.create({
    data: { name: 'Nova Systems', domain: 'novasystems.com', location: 'Austin, TX' },
  });
  return prisma.contact.create({
    data: {
      companyId: company.id,
      firstName: 'Jordan',
      lastName: 'Bennett',
      title: 'VP Engineering',
      email: 'jordan.bennett@novasystems.com',
      phone: '+1 415 555 0132',
      linkedinUrl: 'https://www.linkedin.com/in/jordan-bennett',
      linkedinSlug: 'jordan-bennett',
      ...overrides,
    },
  });
}

function observe(apiKey, body) {
  return request(app)
    .post('/api/v1/extension/observe')
    .set('Authorization', `Bearer ${apiKey}`)
    .send(body);
}

function extReveal(apiKey, contactId, idempotencyKey = randomUUID()) {
  return request(app)
    .post(`/api/v1/extension/contacts/${contactId}/reveal`)
    .set('Authorization', `Bearer ${apiKey}`)
    .set('Idempotency-Key', idempotencyKey);
}

describe('extension: observe + reveal', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects a session JWT — extension routes take API keys only', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');
    const res = await request(app)
      .post('/api/v1/extension/observe')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ linkedinUrl: 'https://www.linkedin.com/in/jordan-bennett' });
    expect(res.status).toBe(401);
  });

  it('classifies a known profile as found, masked, with the 4-credit price', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');
    await seedContact();

    const res = await observe(org.apiKey, {
      linkedinUrl: 'https://www.linkedin.com/in/Jordan-Bennett?utm_source=share',
      jobTitle: 'VP Engineering',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('found');
    expect(res.body.cost).toBe(4);
    expect(res.body.titleChangeReported).toBe(false);
    expect(res.body.contact.firstName).toBe('Jordan');
    expect(res.body.contact.company.name).toBe('Nova Systems');
    // Masked until revealed
    expect(res.body.contact.revealed).toBe(false);
    expect(res.body.contact.email).not.toBe('jordan.bennett@novasystems.com');
    expect(res.body.contact.email).toContain('*');
    expect(res.body.contact.phone).toContain('*');
    expect(res.body.contact.hasPhone).toBe(true);
    // And nothing landed in either sourcing queue
    expect(await prisma.missingPerson.count()).toBe(0);
    expect(await prisma.lostChild.count()).toBe(0);
  });

  it('queues an unknown profile as a MissingPerson and dedups repeat sightings', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');

    const first = await observe(org.apiKey, {
      linkedinUrl: 'https://www.linkedin.com/in/casey-nguyen',
      name: 'Casey Nguyen',
      jobTitle: 'Head of Growth',
      location: 'Denver, CO',
      companyName: 'Skyline Labs',
      domText: 'Casey Nguyen · Head of Growth at Skyline Labs · Denver',
    });
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ status: 'not_found', queued: true });

    // A sparse repeat sighting (parser missed most fields) still counts
    // demand, refreshes only what it captured, and never blanks out data
    // the first sighting recorded.
    const second = await observe(org.apiKey, {
      linkedinUrl: 'https://www.linkedin.com/in/casey-nguyen/',
      jobTitle: 'VP Growth', // fresher sighting wins for this field
    });
    expect(second.body.queued).toBe(true);

    const rows = await prisma.missingPerson.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      linkedinSlug: 'casey-nguyen',
      name: 'Casey Nguyen', // preserved from the first sighting
      jobTitle: 'VP Growth', // refreshed by the second
      location: 'Denver, CO', // preserved
      status: 'PENDING',
      reportCount: 2,
      firstReportedById: org.userId,
    });
  });

  it('a dismissed MissingPerson stays dismissed on re-sighting (but still counts demand)', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');
    await prisma.missingPerson.create({
      data: {
        linkedinSlug: 'casey-nguyen',
        linkedinUrl: 'https://www.linkedin.com/in/casey-nguyen',
        status: 'DISMISSED',
      },
    });

    await observe(org.apiKey, { linkedinUrl: 'https://www.linkedin.com/in/casey-nguyen' });

    const row = await prisma.missingPerson.findUnique({ where: { linkedinSlug: 'casey-nguyen' } });
    expect(row.status).toBe('DISMISSED');
    expect(row.reportCount).toBe(2);
  });

  it('records a LostChild when the observed title differs, updating one PENDING row in place', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');
    const contact = await seedContact();

    const first = await observe(org.apiKey, {
      linkedinUrl: 'https://www.linkedin.com/in/jordan-bennett',
      jobTitle: 'Chief Technology Officer',
      companyName: 'Nova Systems',
    });
    expect(first.body.status).toBe('found');
    expect(first.body.titleChangeReported).toBe(true);

    const second = await observe(org.apiKey, {
      linkedinUrl: 'https://www.linkedin.com/in/jordan-bennett',
      jobTitle: 'CTO & Co-founder',
    });
    expect(second.body.titleChangeReported).toBe(true);

    const rows = await prisma.lostChild.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      contactId: contact.id,
      oldTitle: 'VP Engineering',
      newTitle: 'CTO & Co-founder',
      status: 'PENDING',
      reportCount: 2,
    });
  });

  it('title comparison is case-insensitive — same title reports nothing', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');
    await seedContact();

    const res = await observe(org.apiKey, {
      linkedinUrl: 'https://www.linkedin.com/in/jordan-bennett',
      jobTitle: '  vp engineering ',
    });
    expect(res.body.titleChangeReported).toBe(false);
    expect(await prisma.lostChild.count()).toBe(0);
  });

  it('rejects a non-profile URL with 422', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');
    const res = await observe(org.apiKey, {
      linkedinUrl: 'https://www.linkedin.com/company/nova-systems',
    });
    expect(res.status).toBe(422);
  });

  it('clips oversized domText instead of storing it whole', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');
    await observe(org.apiKey, {
      linkedinUrl: 'https://www.linkedin.com/in/casey-nguyen',
      domText: 'x'.repeat(DOM_TEXT_MAX_CHARS + 5000),
    });
    const row = await prisma.missingPerson.findUnique({ where: { linkedinSlug: 'casey-nguyen' } });
    expect(row.domText).toHaveLength(DOM_TEXT_MAX_CHARS);
  });

  it('reveals through the extension for 4 credits under the EXTENSION_REVEAL reason, phone included', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');
    const contact = await seedContact();

    const res = await extReveal(org.apiKey, contact.id);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('jordan.bennett@novasystems.com');
    expect(res.body.phone).toBe('+1 415 555 0132');
    expect(res.body.alreadyRevealed).toBe(false);

    const ledger = await prisma.creditLedgerEntry.findMany({ where: { workspaceId: org.workspaceId } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].delta).toBe(-4);
    expect(ledger[0].reason).toBe('EXTENSION_REVEAL');
  });

  it('a contact revealed in-app is free in the extension (and vice-versa cost drops to 0)', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');
    const contact = await seedContact();

    // Reveal in-app first (2 credits)
    const inApp = await request(app)
      .post(`/api/v1/contacts/${contact.id}/reveal`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .set('Idempotency-Key', randomUUID());
    expect(inApp.status).toBe(200);

    // Observe now prices the reveal at 0 and returns the clear values
    const seen = await observe(org.apiKey, {
      linkedinUrl: 'https://www.linkedin.com/in/jordan-bennett',
    });
    expect(seen.body.cost).toBe(0);
    expect(seen.body.contact.revealed).toBe(true);
    expect(seen.body.contact.email).toBe('jordan.bennett@novasystems.com');
    expect(seen.body.contact.phone).toBe('+1 415 555 0132');

    // And the extension reveal endpoint short-circuits free, phone included
    const ext = await extReveal(org.apiKey, contact.id);
    expect(ext.body.alreadyRevealed).toBe(true);
    expect(ext.body.phone).toBe('+1 415 555 0132');

    const ledger = await prisma.creditLedgerEntry.findMany({ where: { workspaceId: org.workspaceId } });
    expect(ledger).toHaveLength(1); // only the in-app reveal charged
    expect(ledger[0].delta).toBe(-2);
  });

  it('extension reveal requires an Idempotency-Key and replays repeats without double-charging', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');
    const contact = await seedContact();

    const noKey = await request(app)
      .post(`/api/v1/extension/contacts/${contact.id}/reveal`)
      .set('Authorization', `Bearer ${org.apiKey}`);
    expect(noKey.status).toBe(400);

    const key = randomUUID();
    const first = await extReveal(org.apiKey, contact.id, key);
    const replay = await extReveal(org.apiKey, contact.id, key);
    expect(replay.body).toEqual(first.body);
    expect(await prisma.creditLedgerEntry.count({ where: { workspaceId: org.workspaceId } })).toBe(1);
  });

  it('GET /extension/me reports identity, balance and the reveal price', async () => {
    const org = await registerOrgWithKey('Acme', 'owner@acme.test');
    const res = await request(app)
      .get('/api/v1/extension/me')
      .set('Authorization', `Bearer ${org.apiKey}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('owner@acme.test');
    expect(res.body.workspace.plan).toBe('FREE');
    expect(res.body.balance).toBeGreaterThan(0);
    expect(res.body.revealCost).toBe(4);
  });

  it('workspace isolation: another workspace observing the same contact still sees it masked', async () => {
    const orgA = await registerOrgWithKey('Org A', 'owner@org-a.test');
    const orgB = await registerOrgWithKey('Org B', 'owner@org-b.test');
    const contact = await seedContact();

    await extReveal(orgA.apiKey, contact.id);

    const seenByB = await observe(orgB.apiKey, {
      linkedinUrl: 'https://www.linkedin.com/in/jordan-bennett',
    });
    expect(seenByB.body.contact.revealed).toBe(false);
    expect(seenByB.body.contact.email).toContain('*');
    expect(seenByB.body.cost).toBe(4);
  });
});

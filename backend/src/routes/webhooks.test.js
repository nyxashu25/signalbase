import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

const app = createApp();

function sign(payload) {
  return createHmac('sha256', env.ESP_WEBHOOK_SECRET).update(JSON.stringify(payload)).digest('hex');
}

function postWebhook(payload, signature = sign(payload)) {
  return request(app).post('/api/v1/webhooks/esp').set('X-Signature', signature).send(payload);
}

async function seedSentEnrollment() {
  const org = await prisma.org.create({ data: { slug: 'wh-test', name: 'WH Test' } });
  const workspace = await prisma.workspace.create({ data: { orgId: org.id, name: 'WH Test WS' } });
  const user = await prisma.user.create({
    data: { email: 'owner@wh-test.test', passwordHash: 'x', name: 'Owner' },
  });
  await prisma.membership.create({
    data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
  });
  const company = await prisma.company.create({
    data: { name: 'Nova', domain: 'novasystems.com' },
  });
  const contact = await prisma.contact.create({
    data: {
      companyId: company.id,
      firstName: 'Jordan',
      lastName: 'Bennett',
      email: 'jordan@novasystems.com',
    },
  });
  const sequence = await prisma.sequence.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      name: 'Test',
      status: 'ACTIVE',
      steps: { create: [{ order: 0, type: 'EMAIL', subject: 'Hi', body: 'Body' }] },
    },
  });
  const enrollment = await prisma.sequenceEnrollment.create({
    data: {
      sequenceId: sequence.id,
      workspaceId: workspace.id,
      contactId: contact.id,
      currentStepIndex: 1,
    },
  });
  await prisma.sequenceStepEvent.create({
    data: { enrollmentId: enrollment.id, stepIndex: 0, type: 'SENT', providerEventId: 'msg-1' },
  });
  return { workspace, contact, enrollment };
}

describe('POST /webhooks/esp', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it('rejects a request with no signature', async () => {
    const res = await request(app).post('/api/v1/webhooks/esp').send({ events: [] });
    expect(res.status).toBe(401);
  });

  it('rejects a request with a forged signature', async () => {
    const res = await postWebhook({ events: [] }, 'deadbeef'.repeat(8));
    expect(res.status).toBe(401);
  });

  it('accepts a correctly-signed request', async () => {
    const res = await postWebhook({ events: [] });
    expect(res.status).toBe(204);
  });

  it('a BOUNCED event suppresses the address for that workspace', async () => {
    const { workspace } = await seedSentEnrollment();

    const res = await postWebhook({
      events: [{ id: 'evt-1', messageId: 'msg-1', type: 'BOUNCED' }],
    });
    expect(res.status).toBe(204);

    const suppressed = await prisma.suppressionEntry.findUnique({
      where: { workspaceId_email: { workspaceId: workspace.id, email: 'jordan@novasystems.com' } },
    });
    expect(suppressed).not.toBeNull();
    expect(suppressed.reason).toBe('BOUNCED');
  });

  it('a REPLIED event unenrolls the contact from the sequence', async () => {
    const { enrollment } = await seedSentEnrollment();

    await postWebhook({ events: [{ id: 'evt-2', messageId: 'msg-1', type: 'REPLIED' }] });

    const updated = await prisma.sequenceEnrollment.findUnique({ where: { id: enrollment.id } });
    expect(updated.status).toBe('UNENROLLED');
    expect(updated.unenrolledReason).toBe('replied');
  });

  it('does not double-process a redelivered event with the same id', async () => {
    const { enrollment } = await seedSentEnrollment();
    const payload = { events: [{ id: 'evt-3', messageId: 'msg-1', type: 'OPENED' }] };

    await postWebhook(payload);
    await postWebhook(payload); // ESPs deliver at-least-once — a redelivery must be a no-op

    const openedEvents = await prisma.sequenceStepEvent.findMany({
      where: { enrollmentId: enrollment.id, type: 'OPENED' },
    });
    expect(openedEvents).toHaveLength(1);
  });
});

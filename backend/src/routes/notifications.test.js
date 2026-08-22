import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { signUnsubscribeToken } from '../services/tokenService.js';

const app = createApp();

describe('POST /notifications/unsubscribe', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('flips marketingOptOut for the token-carried user, no auth required', async () => {
    const org = await prisma.org.create({ data: { name: 'Acme', slug: 'acme-unsub' } });
    const workspace = await prisma.workspace.create({ data: { orgId: org.id, name: 'Acme Workspace' } });
    const user = await prisma.user.create({
      data: { email: 'unsub-me@acme.test', name: 'Unsub Me', emailVerified: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
    });

    const token = signUnsubscribeToken(user.id);
    const res = await request(app).post('/api/v1/notifications/unsubscribe').send({ token });

    expect(res.status).toBe(200);
    expect(res.body.unsubscribed).toBe(true);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated.marketingOptOut).toBe(true);
  });

  it('rejects a malformed or forged token', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/unsubscribe')
      .send({ token: 'not-a-real-token' });
    expect(res.status).toBe(400);
  });
});

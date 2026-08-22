import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';

const app = createApp();

async function registerOrg(orgName, email, password = 'correct-horse-battery') {
  const res = await registerAndVerify(app, { email, password, name: 'Owner', orgName });
  return { accessToken: res.body.accessToken, userId: res.body.user.id };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('account settings (auth/me)', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /me exposes the settings-relevant flags', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const res = await request(app).get('/api/v1/auth/me').set(auth(org.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: 'owner@acme.test',
      name: 'Owner',
      emailVerified: true,
      marketingOptOut: false,
      hasPassword: true,
      googleLinked: false,
    });
    expect(res.body.workspace.plan).toBe('FREE');
  });

  it('PATCH /me renames the user and rejects an empty name', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const ok = await request(app)
      .patch('/api/v1/auth/me')
      .set(auth(org.accessToken))
      .send({ name: '  Ada Lovelace ' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.name).toBe('Ada Lovelace');
    const me = await request(app).get('/api/v1/auth/me').set(auth(org.accessToken));
    expect(me.body.user.name).toBe('Ada Lovelace');

    const bad = await request(app).patch('/api/v1/auth/me').set(auth(org.accessToken)).send({ name: '   ' });
    expect(bad.status).toBe(400);
  });

  it('PATCH /me/preferences toggles the marketing opt-out', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const res = await request(app)
      .patch('/api/v1/auth/me/preferences')
      .set(auth(org.accessToken))
      .send({ marketingOptOut: true });
    expect(res.status).toBe(200);
    expect(res.body.user.marketingOptOut).toBe(true);
    const row = await prisma.user.findUnique({ where: { id: org.userId } });
    expect(row.marketingOptOut).toBe(true);
  });

  it('POST /change-password requires the current password, then the new one works for login', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test', 'correct-horse-battery');

    const wrong = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth(org.accessToken))
      .send({ currentPassword: 'nope-nope-nope', newPassword: 'brand-new-password-1' });
    expect(wrong.status).toBe(400);

    const short = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth(org.accessToken))
      .send({ currentPassword: 'correct-horse-battery', newPassword: 'short' });
    expect(short.status).toBe(400);

    const ok = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth(org.accessToken))
      .send({ currentPassword: 'correct-horse-battery', newPassword: 'brand-new-password-1' });
    expect(ok.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@acme.test', password: 'correct-horse-battery' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@acme.test', password: 'brand-new-password-1' });
    expect(newLogin.status).toBe(200);
  });

  it('a Google-only account sets its first password without a current one', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    await prisma.user.update({
      where: { id: org.userId },
      data: { passwordHash: null, googleId: 'google-sub-123' },
    });
    const me = await request(app).get('/api/v1/auth/me').set(auth(org.accessToken));
    expect(me.body.user).toMatchObject({ hasPassword: false, googleLinked: true });

    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth(org.accessToken))
      .send({ newPassword: 'my-first-password-1' });
    expect(res.status).toBe(200);
    expect(res.body.user.hasPassword).toBe(true);
  });
});

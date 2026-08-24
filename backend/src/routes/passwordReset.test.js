import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';

const app = createApp();

async function registerOrg(email, password = 'correct-horse-battery') {
  const res = await registerAndVerify(app, { email, password, name: 'Owner', orgName: 'Acme' });
  return { accessToken: res.body.accessToken, userId: res.body.user.id };
}

// The reset email is simulated in tests (no RESEND_API_KEY) — mint the token
// the same way the service does, off the user's current hash.
async function mintResetToken(email) {
  const { signPasswordResetToken } = await import('../services/tokenService.js');
  const { createHash } = await import('node:crypto');
  const user = await prisma.user.findUnique({ where: { email } });
  const fp = createHash('sha256')
    .update(user.passwordHash ?? 'none')
    .digest('hex')
    .slice(0, 16);
  return signPasswordResetToken(user.id, fp);
}

describe('password reset', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('forgot-password is enumeration-safe: {sent:true} for known and unknown emails', async () => {
    await registerOrg('owner@acme.test');
    const known = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'owner@acme.test' });
    const unknown = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@nowhere.test' });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual({ sent: true });
    expect(unknown.body).toEqual({ sent: true });
  });

  it('resets the password with a valid token; old password stops working, new one logs in', async () => {
    await registerOrg('owner@acme.test', 'correct-horse-battery');
    const token = await mintResetToken('owner@acme.test');

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'a-fresh-password-1' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reset: true });

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@acme.test', password: 'correct-horse-battery' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@acme.test', password: 'a-fresh-password-1' });
    expect(newLogin.status).toBe(200);
  });

  it('a reset link is single-use: the fingerprint dies with the password change', async () => {
    await registerOrg('owner@acme.test');
    const token = await mintResetToken('owner@acme.test');

    const first = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'a-fresh-password-1' });
    expect(first.status).toBe(200);

    const replay = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'attacker-password-1' });
    expect(replay.status).toBe(400);
  });

  it('rejects garbage tokens and short passwords', async () => {
    await registerOrg('owner@acme.test');
    const bad = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'not-a-token', newPassword: 'a-fresh-password-1' });
    expect(bad.status).toBe(400);

    const token = await mintResetToken('owner@acme.test');
    const short = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'short' });
    expect(short.status).toBe(400);
  });

  it('a Google-only account can set its first password via the reset flow', async () => {
    const org = await registerOrg('owner@acme.test');
    await prisma.user.update({
      where: { id: org.userId },
      data: { passwordHash: null, googleId: 'google-sub-1' },
    });
    const token = await mintResetToken('owner@acme.test');
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'my-first-password-1' });
    expect(res.status).toBe(200);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@acme.test', password: 'my-first-password-1' });
    expect(login.status).toBe(200);
  });
});

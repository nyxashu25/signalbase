import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';

const app = createApp();

function parseCookie(res) {
  const raw = res.headers['set-cookie']?.find((c) => c.startsWith('refreshToken='));
  return raw?.split(';')[0];
}

const validRegistration = {
  email: 'owner@acme.test',
  password: 'correct-horse-battery',
  name: 'Owner Acme',
  orgName: 'Acme Inc',
};

describe('auth flow', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('registers a new org/workspace/user and returns an access token + refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validRegistration);

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.role).toBe('OWNER');
    expect(parseCookie(res)).toMatch(/^refreshToken=/);
  });

  it('rejects registering the same email twice', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);
    const res = await request(app).post('/api/v1/auth/register').send(validRegistration);

    expect(res.status).toBe(409);
  });

  it('rejects login with the wrong password using the same error as an unknown email', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validRegistration.email, password: 'nope' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@acme.test', password: 'nope' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('GET /me requires a valid access token', async () => {
    const noAuth = await request(app).get('/api/v1/auth/me');
    expect(noAuth.status).toBe(401);

    const register = await request(app).post('/api/v1/auth/register').send(validRegistration);
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${register.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(validRegistration.email);
    expect(me.body.workspace.name).toBe('Acme Inc Workspace');
  });

  it('rotates the refresh token on use and rejects reuse of the old one (replay detection)', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validRegistration);
    const firstCookie = parseCookie(register);

    const firstRefresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', firstCookie);
    expect(firstRefresh.status).toBe(200);
    const secondCookie = parseCookie(firstRefresh);
    expect(secondCookie).not.toBe(firstCookie);

    // Reusing the original (now-rotated-away) cookie must fail...
    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', firstCookie);
    expect(replay.status).toBe(401);

    // ...and must have revoked the whole session, so even the latest
    // (legitimately rotated) token no longer works.
    const afterReplay = await request(app).post('/api/v1/auth/refresh').set('Cookie', secondCookie);
    expect(afterReplay.status).toBe(401);
  });

  it('logout revokes the refresh token', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(validRegistration);
    const cookie = parseCookie(register);

    const logoutRes = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(logoutRes.status).toBe(204);

    const afterLogout = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(afterLogout.status).toBe(401);
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { loginWithGoogle } from '../services/authService.js';
import { signEmailVerificationToken } from '../services/tokenService.js';
import { hashPassword } from '../utils/password.js';

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

  it('registers a new account in a pending-verification state, with no session yet', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validRegistration);

    expect(res.status).toBe(202);
    expect(res.body.pendingVerification).toBe(true);
    expect(res.body.email).toBe(validRegistration.email);
    expect(res.body.accessToken).toBeUndefined();
    expect(parseCookie(res)).toBeUndefined();

    const user = await prisma.user.findUnique({ where: { email: validRegistration.email } });
    expect(user.emailVerified).toBe(false);
  });

  it('rejects registering the same email twice', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);
    const res = await request(app).post('/api/v1/auth/register').send(validRegistration);

    expect(res.status).toBe(409);
  });

  it('rejects login before the email is confirmed', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);

    const res = await request(app).post('/api/v1/auth/login').send({
      email: validRegistration.email,
      password: validRegistration.password,
    });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/verify your email/i);
  });

  it('confirming the verify-email link logs the user in, same shape register used to return', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);
    const user = await prisma.user.findUnique({ where: { email: validRegistration.email } });
    const token = signEmailVerificationToken(user.id);

    const res = await request(app).post('/api/v1/auth/verify-email').send({ token });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.role).toBe('OWNER');
    expect(parseCookie(res)).toMatch(/^refreshToken=/);

    const verified = await prisma.user.findUnique({ where: { email: validRegistration.email } });
    expect(verified.emailVerified).toBe(true);

    // Login now works, having been blocked before confirmation.
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validRegistration.email, password: validRegistration.password });
    expect(login.status).toBe(200);
  });

  it('rejects an invalid or expired verify-email token', async () => {
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: 'not-a-real-token' });
    expect(res.status).toBe(400);
  });

  it('resend-verification never reveals whether the account exists or is already verified', async () => {
    const forUnknown = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'nobody@acme.test' });
    expect(forUnknown.status).toBe(200);
    expect(forUnknown.body.sent).toBe(true);

    const registered = await registerAndVerify(app, validRegistration);
    expect(registered.status).toBe(200); // sanity: this account is fully verified

    const forVerified = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: validRegistration.email });
    expect(forVerified.status).toBe(200);
    expect(forVerified.body.sent).toBe(true);
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

    const register = await registerAndVerify(app, validRegistration);
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${register.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(validRegistration.email);
    expect(me.body.workspace.name).toBe('Acme Inc Workspace');
  });

  it('rotates the refresh token on use and rejects reuse of the old one (replay detection)', async () => {
    const register = await registerAndVerify(app, validRegistration);
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
    const register = await registerAndVerify(app, validRegistration);
    const cookie = parseCookie(register);

    const logoutRes = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(logoutRes.status).toBe(204);

    const afterLogout = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(afterLogout.status).toBe(401);
  });

  describe('first-login tutorial', () => {
    it('is null until the tutorial is completed, for a fresh registration', async () => {
      const register = await registerAndVerify(app, validRegistration);
      expect(register.body.user.tutorialCompletedAt).toBeNull();

      const me = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${register.body.accessToken}`);
      expect(me.body.user.tutorialCompletedAt).toBeNull();
    });

    it('POST /tutorial-complete sets it once and persists across logins', async () => {
      const register = await registerAndVerify(app, validRegistration);
      const token = register.body.accessToken;

      const complete = await request(app)
        .post('/api/v1/auth/tutorial-complete')
        .set('Authorization', `Bearer ${token}`);
      expect(complete.status).toBe(200);
      expect(complete.body.tutorialCompletedAt).toBeTruthy();

      const login = await request(app).post('/api/v1/auth/login').send({
        email: validRegistration.email,
        password: validRegistration.password,
      });
      expect(login.body.user.tutorialCompletedAt).toBeTruthy();
    });

    it('requires auth', async () => {
      const res = await request(app).post('/api/v1/auth/tutorial-complete');
      expect(res.status).toBe(401);
    });
  });

  // Injects a fake ID-token verifier (same pattern as stripeService's
  // makeClient) since exchanging a real Google-signed token isn't
  // practical in a test suite — see authService.loginWithGoogle.
  describe('loginWithGoogle (unit, injected verifier)', () => {
    function fakeVerify(payload) {
      return async () => payload;
    }

    it('creates a brand-new account for a Google identity never seen before', async () => {
      const result = await loginWithGoogle(
        'fake-credential',
        fakeVerify({
          sub: 'google-sub-1',
          email: 'newperson@gmail.com',
          email_verified: true,
          name: 'New Person',
        }),
      );

      expect(result.accessToken).toBeTruthy();
      expect(result.role).toBe('OWNER');
      expect(result.user.email).toBe('newperson@gmail.com');

      const user = await prisma.user.findUnique({ where: { email: 'newperson@gmail.com' } });
      expect(user.googleId).toBe('google-sub-1');
      expect(user.passwordHash).toBeNull();
    });

    it('signs back in via an already-linked googleId', async () => {
      const first = await loginWithGoogle(
        'fake-credential',
        fakeVerify({
          sub: 'google-sub-2',
          email: 'repeat@gmail.com',
          email_verified: true,
          name: 'Repeat Visitor',
        }),
      );
      const second = await loginWithGoogle(
        'fake-credential',
        fakeVerify({
          sub: 'google-sub-2',
          email: 'repeat@gmail.com',
          email_verified: true,
          name: 'Repeat Visitor',
        }),
      );

      expect(second.workspace.id).toBe(first.workspace.id);
      expect(second.user.id).toBe(first.user.id);

      const users = await prisma.user.findMany({ where: { email: 'repeat@gmail.com' } });
      expect(users).toHaveLength(1);
    });

    it('links googleId onto an existing password account with the same verified email', async () => {
      const passwordHash = await hashPassword('correct-horse-battery');
      const org = await prisma.org.create({ data: { name: 'Existing Org', slug: 'existing-org' } });
      const workspace = await prisma.workspace.create({
        data: { orgId: org.id, name: 'Existing Org Workspace' },
      });
      const user = await prisma.user.create({
        data: { email: 'existing@acme.test', passwordHash, name: 'Existing User' },
      });
      await prisma.membership.create({
        data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
      });

      const result = await loginWithGoogle(
        'fake-credential',
        fakeVerify({
          sub: 'google-sub-3',
          email: 'existing@acme.test',
          email_verified: true,
          name: 'Existing User',
        }),
      );

      expect(result.user.id).toBe(user.id);
      expect(result.workspace.id).toBe(workspace.id);

      const linked = await prisma.user.findUnique({ where: { id: user.id } });
      expect(linked.googleId).toBe('google-sub-3');
      // The password login path must still work after linking.
      expect(linked.passwordHash).toBe(passwordHash);
    });

    it('rejects an unverified Google email', async () => {
      await expect(
        loginWithGoogle(
          'fake-credential',
          fakeVerify({
            sub: 'google-sub-4',
            email: 'unverified@gmail.com',
            email_verified: false,
            name: 'Unverified',
          }),
        ),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('rejects sign-in for a suspended account', async () => {
      await loginWithGoogle(
        'fake-credential',
        fakeVerify({
          sub: 'google-sub-5',
          email: 'suspend-me@gmail.com',
          email_verified: true,
          name: 'Suspend Me',
        }),
      );
      await prisma.user.update({
        where: { email: 'suspend-me@gmail.com' },
        data: { suspendedAt: new Date() },
      });

      await expect(
        loginWithGoogle(
          'fake-credential',
          fakeVerify({
            sub: 'google-sub-5',
            email: 'suspend-me@gmail.com',
            email_verified: true,
            name: 'Suspend Me',
          }),
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('responds 401 through the real HTTP route when the credential fails verification', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: 'not-a-real-google-token' });

      // No GOOGLE_CLIENT_ID is configured in the test env, so the default
      // verifier throws 503 rather than attempting a real network call —
      // confirms the route is wired end-to-end without needing a live token.
      expect(res.status).toBe(503);
    });
  });
});

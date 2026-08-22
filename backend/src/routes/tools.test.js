import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { vi } from 'vitest';

const app = createApp();

async function registerOrg(orgName, email) {
  const res = await registerAndVerify(app, {
    email,
    password: 'correct-horse-battery',
    name: 'Owner',
    orgName,
  });
  return { accessToken: res.body.accessToken };
}

describe('POST /tools/verify-email', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterEach(() => {
    env.EMAIL_VERIFIER_API_KEY = undefined;
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects without authentication', async () => {
    const res = await request(app).post('/api/v1/tools/verify-email').send({ email: 'a@b.com' });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid email shape', async () => {
    const { accessToken } = await registerOrg('Org A', 'owner@org-a.test');

    const res = await request(app)
      .post('/api/v1/tools/verify-email')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('returns unchecked when no verifier provider is configured', async () => {
    const { accessToken } = await registerOrg('Org B', 'owner@org-b.test');

    const res = await request(app)
      .post('/api/v1/tools/verify-email')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'someone@acme.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      email: 'someone@acme.com',
      verified: false,
      checked: false,
      reason: 'no_provider_configured',
    });
  });

  it('returns a deliverable result when the provider confirms it', async () => {
    env.EMAIL_VERIFIER_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { status: 'valid', result: 'deliverable' } }), {
          status: 200,
        }),
      ),
    );
    const { accessToken } = await registerOrg('Org C', 'owner@org-c.test');

    const res = await request(app)
      .post('/api/v1/tools/verify-email')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'real@acme.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      email: 'real@acme.com',
      verified: true,
      checked: true,
      reason: 'valid',
    });
  });
});

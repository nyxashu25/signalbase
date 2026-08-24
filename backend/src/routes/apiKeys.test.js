import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { authenticateApiKey } from '../services/apiKeyService.js';

const app = createApp();

async function registerOrg(orgName, email) {
  const res = await registerAndVerify(app, {
    email,
    password: 'correct-horse-battery',
    name: 'Owner',
    orgName,
  });
  return {
    accessToken: res.body.accessToken,
    workspaceId: res.body.workspace.id,
    userId: res.body.user.id,
  };
}

function createKey(token, name = 'Chrome extension') {
  return request(app)
    .post('/api/v1/api-keys')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
}

describe('api keys: lifecycle', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('requires a session (not an API key) to manage keys', async () => {
    const res = await request(app).get('/api/v1/api-keys');
    expect(res.status).toBe(401);
  });

  it('creates a key, returns the full secret exactly once, and lists it without the secret', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const created = await createKey(org.accessToken, 'Work laptop');

    expect(created.status).toBe(201);
    expect(created.body.key).toMatch(/^dpk_[0-9a-f]{40}$/);
    expect(created.body.prefix).toBe(created.body.key.slice(0, 12));
    expect(created.body.name).toBe('Work laptop');

    const list = await request(app)
      .get('/api/v1/api-keys')
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.keys).toHaveLength(1);
    expect(list.body.keys[0].prefix).toBe(created.body.prefix);
    expect(list.body.keys[0]).not.toHaveProperty('key');
    expect(list.body.keys[0]).not.toHaveProperty('keyHash');

    // The stored hash is argon2, never the plaintext key.
    const row = await prisma.apiKey.findUnique({ where: { prefix: created.body.prefix } });
    expect(row.keyHash).not.toContain(created.body.key);
  });

  it('a created key authenticates to the same auth shape requireAuth produces', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const { key } = (await createKey(org.accessToken)).body;

    const auth = await authenticateApiKey(key);
    expect(auth).toEqual({
      userId: org.userId,
      workspaceId: org.workspaceId,
      orgId: expect.any(String),
      role: 'OWNER',
    });
  });

  it('rejects garbage, wrong-secret, and revoked keys with the same generic 401', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const created = (await createKey(org.accessToken)).body;

    await expect(authenticateApiKey('dpk_' + '0'.repeat(40))).rejects.toMatchObject({ statusCode: 401 });
    await expect(authenticateApiKey('not-a-key')).rejects.toMatchObject({ statusCode: 401 });
    // Right prefix, wrong secret tail
    const tampered = created.key.slice(0, 12) + 'f'.repeat(40 - 8);
    await expect(authenticateApiKey(tampered)).rejects.toMatchObject({ statusCode: 401 });

    const revoke = await request(app)
      .delete(`/api/v1/api-keys/${created.id}`)
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(revoke.status).toBe(200);
    await expect(authenticateApiKey(created.key)).rejects.toMatchObject({ statusCode: 401 });

    // Revoked keys drop out of the list
    const list = await request(app)
      .get('/api/v1/api-keys')
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(list.body.keys).toHaveLength(0);
  });

  it('a suspended user\'s key stops working', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const { key } = (await createKey(org.accessToken)).body;

    await prisma.user.update({ where: { id: org.userId }, data: { suspendedAt: new Date() } });
    await expect(authenticateApiKey(key)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('cannot revoke another user\'s key', async () => {
    const a = await registerOrg('Acme', 'owner@acme.test');
    const b = await registerOrg('Globex', 'owner@globex.test');
    const created = (await createKey(a.accessToken)).body;

    const res = await request(app)
      .delete(`/api/v1/api-keys/${created.id}`)
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(res.status).toBe(404);

    // Still alive for its owner
    await expect(authenticateApiKey(created.key)).resolves.toBeTruthy();
  });

  it('caps active keys at 10 per user', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    for (let i = 0; i < 10; i++) {
      expect((await createKey(org.accessToken, `Key ${i}`)).status).toBe(201);
    }
    const over = await createKey(org.accessToken, 'One too many');
    expect(over.status).toBe(422);
  });
});

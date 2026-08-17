import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { hashPassword } from '../utils/password.js';

const app = createApp();

async function registerOrg(orgName, email) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'correct-horse-battery', name: 'Owner', orgName });
  return { accessToken: res.body.accessToken, workspaceId: res.body.workspace.id };
}

describe('lists: multi-tenant isolation + RBAC', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it('a user in org B cannot fetch a list belonging to org A, even by guessing its id', async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');

    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ name: "Org A's leads", type: 'CONTACTS' });
    const listId = createRes.body.list.id;

    const crossTenantRead = await request(app)
      .get(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    // 404, not 403 — the response must not distinguish "exists but forbidden"
    // from "does not exist", or it leaks other tenants' resource ids.
    expect(crossTenantRead.status).toBe(404);

    const crossTenantDelete = await request(app)
      .delete(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);
    expect(crossTenantDelete.status).toBe(404);

    // And the list must still be there for its actual owner.
    const ownerRead = await request(app)
      .get(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${orgA.accessToken}`);
    expect(ownerRead.status).toBe(200);
  });

  it("org B's list index never includes org A's lists", async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');

    await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ name: "Org A's leads", type: 'CONTACTS' });

    const indexRes = await request(app)
      .get('/api/v1/lists')
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    expect(indexRes.status).toBe(200);
    expect(indexRes.body.lists).toHaveLength(0);
  });

  it('a MEMBER cannot delete a list; an OWNER can', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');

    const memberEmail = 'member@org-a.test';
    const memberUser = await prisma.user.create({
      data: {
        email: memberEmail,
        passwordHash: await hashPassword('member-pass-1234'),
        name: 'Member',
      },
    });
    await prisma.membership.create({
      data: { userId: memberUser.id, workspaceId: owner.workspaceId, role: 'MEMBER' },
    });
    const memberLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password: 'member-pass-1234', workspaceId: owner.workspaceId });
    const memberToken = memberLogin.body.accessToken;

    const createRes = await request(app)
      .post('/api/v1/lists')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Shared list', type: 'CONTACTS' });
    const listId = createRes.body.list.id;

    const memberDelete = await request(app)
      .delete(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memberDelete.status).toBe(403);

    const ownerDelete = await request(app)
      .delete(`/api/v1/lists/${listId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(ownerDelete.status).toBe(204);
  });
});

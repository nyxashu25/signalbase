import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';

const app = createApp();
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function registerOrg(orgName, email) {
  const res = await registerAndVerify(app, {
    email,
    password: 'correct-horse-battery',
    name: 'Owner',
    orgName,
  });
  return { accessToken: res.body.accessToken, workspaceId: res.body.workspace.id, userId: res.body.user.id };
}

// There is no invite flow yet (TODO.md P0) — seat a second member directly.
async function addMember(workspaceId, email, role) {
  const user = await prisma.user.create({
    data: { email, name: 'Teammate', passwordHash: await hashPassword('correct-horse-battery'), emailVerified: true },
  });
  await prisma.membership.create({ data: { userId: user.id, workspaceId, role } });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'correct-horse-battery' });
  return { user, accessToken: login.body.accessToken };
}

describe('workspace', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists members owner-first with roles', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    await addMember(org.workspaceId, 'member@acme.test', 'MEMBER');

    const res = await request(app).get('/api/v1/workspace/members').set(auth(org.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.members.map((m) => [m.user.email, m.role])).toEqual([
      ['owner@acme.test', 'OWNER'],
      ['member@acme.test', 'MEMBER'],
    ]);
  });

  it('renames the workspace for ADMIN+ and refuses a MEMBER', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const member = await addMember(org.workspaceId, 'member@acme.test', 'MEMBER');

    const denied = await request(app)
      .patch('/api/v1/workspace')
      .set(auth(member.accessToken))
      .send({ name: 'Hijacked' });
    expect(denied.status).toBe(403);

    const ok = await request(app)
      .patch('/api/v1/workspace')
      .set(auth(org.accessToken))
      .send({ name: 'Acme Growth' });
    expect(ok.status).toBe(200);
    expect(ok.body.workspace.name).toBe('Acme Growth');

    const me = await request(app).get('/api/v1/auth/me').set(auth(org.accessToken));
    expect(me.body.workspace.name).toBe('Acme Growth');
  });

  it('is isolated — another workspace never sees these members', async () => {
    const a = await registerOrg('Acme', 'owner@acme.test');
    const b = await registerOrg('Globex', 'owner@globex.test');
    await addMember(a.workspaceId, 'member@acme.test', 'MEMBER');
    const res = await request(app).get('/api/v1/workspace/members').set(auth(b.accessToken));
    expect(res.body.members.map((m) => m.user.email)).toEqual(['owner@globex.test']);
  });
});

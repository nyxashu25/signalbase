import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';

const app = createApp();
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function registerOrg(orgName, email, seats = 5) {
  const res = await registerAndVerify(app, {
    email,
    password: 'correct-horse-battery',
    name: 'Owner',
    orgName,
  });
  // Fresh signups are FREE (1 seat) — most invite tests need headroom, so
  // grant a few; the seat-gate tests below set their own counts.
  await prisma.workspace.update({ where: { id: res.body.workspace.id }, data: { seats } });
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

  it('returns branding via GET /workspace and updates name + motto', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');

    const before = await request(app).get('/api/v1/workspace').set(auth(org.accessToken));
    expect(before.status).toBe(200);
    expect(before.body.workspace).toMatchObject({ name: 'Acme', motto: null, logoUrl: null });

    const upd = await request(app)
      .patch('/api/v1/workspace')
      .set(auth(org.accessToken))
      .send({ name: 'Acme Growth', motto: 'We find the people who matter.' });
    expect(upd.status).toBe(200);
    expect(upd.body.workspace).toMatchObject({ name: 'Acme Growth', motto: 'We find the people who matter.' });

    // Clearing the motto (empty/null) wipes it.
    const cleared = await request(app)
      .patch('/api/v1/workspace')
      .set(auth(org.accessToken))
      .send({ name: 'Acme Growth', motto: '' });
    expect(cleared.body.workspace.motto).toBeNull();
  });

  it('uploads and removes a workspace logo (stored inline as a data URI), ADMIN+ only', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const member = await addMember(org.workspaceId, 'member@acme.test', 'MEMBER');
    // A tiny valid 1x1 PNG.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
      'base64',
    );

    const denied = await request(app)
      .post('/api/v1/workspace/logo')
      .set(auth(member.accessToken))
      .attach('logo', png, { filename: 'logo.png', contentType: 'image/png' });
    expect(denied.status).toBe(403);

    const up = await request(app)
      .post('/api/v1/workspace/logo')
      .set(auth(org.accessToken))
      .attach('logo', png, { filename: 'logo.png', contentType: 'image/png' });
    expect(up.status).toBe(200);
    expect(up.body.workspace.logoUrl).toMatch(/^data:image\/png;base64,/);

    const rm = await request(app).delete('/api/v1/workspace/logo').set(auth(org.accessToken));
    expect(rm.status).toBe(200);
    expect(rm.body.workspace.logoUrl).toBeNull();
  });

  it('rejects a non-image logo upload', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const res = await request(app)
      .post('/api/v1/workspace/logo')
      .set(auth(org.accessToken))
      .attach('logo', Buffer.from('not an image'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
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

describe('workspace invites', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  async function invite(org, email, role = 'MEMBER') {
    return request(app)
      .post('/api/v1/workspace/invites')
      .set(auth(org.accessToken))
      .send({ email, role });
  }

  function tokenFromUrl(inviteUrl) {
    return new URL(inviteUrl).searchParams.get('token');
  }

  it('ADMIN+ creates an invite (with a copyable link), MEMBER cannot, and pending invites list', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const member = await addMember(org.workspaceId, 'member@acme.test', 'MEMBER');

    const denied = await invite({ accessToken: member.accessToken }, 'new@hire.test');
    expect(denied.status).toBe(403);

    const created = await invite(org, 'new@hire.test', 'ADMIN');
    expect(created.status).toBe(201);
    expect(created.body.invite).toMatchObject({ email: 'new@hire.test', role: 'ADMIN' });
    expect(created.body.invite.inviteUrl).toContain('/accept-invite?token=');

    const list = await request(app).get('/api/v1/workspace/invites').set(auth(org.accessToken));
    expect(list.body.invites).toHaveLength(1);
    expect(list.body.invites[0].invitedBy.name).toBe('Owner');
  });

  it('rejects inviting an existing member and re-inviting refreshes rather than duplicates', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    await addMember(org.workspaceId, 'member@acme.test', 'MEMBER');

    const dup = await invite(org, 'member@acme.test');
    expect(dup.status).toBe(409);

    await invite(org, 'new@hire.test', 'MEMBER');
    const again = await invite(org, 'new@hire.test', 'ADMIN');
    expect(again.status).toBe(201);
    const list = await request(app).get('/api/v1/workspace/invites').set(auth(org.accessToken));
    expect(list.body.invites).toHaveLength(1);
    expect(list.body.invites[0].role).toBe('ADMIN');
  });

  it('the public info endpoint describes the invite; accepting with a new email creates user + membership, never a new workspace', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const created = await invite(org, 'new@hire.test', 'MEMBER');
    const token = tokenFromUrl(created.body.invite.inviteUrl);

    const info = await request(app).get(`/api/v1/auth/invite?token=${encodeURIComponent(token)}`);
    expect(info.status).toBe(200);
    expect(info.body).toMatchObject({
      email: 'new@hire.test',
      role: 'MEMBER',
      inviterName: 'Owner',
      accountExists: false,
    });

    const orgsBefore = await prisma.org.count();
    const accept = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({ token, name: 'New Hire', password: 'a-solid-password-1' });
    expect(accept.status).toBe(200);
    expect(accept.body.workspace.id).toBe(org.workspaceId);
    expect(accept.body.role).toBe('MEMBER');
    expect(accept.body.user.email).toBe('new@hire.test');
    expect(await prisma.org.count()).toBe(orgsBefore);

    // Their token works against the shared workspace, email pre-verified.
    const me = await request(app).get('/api/v1/auth/me').set(auth(accept.body.accessToken));
    expect(me.body.workspace.id).toBe(org.workspaceId);
    expect(me.body.user.emailVerified).toBe(true);

    const members = await request(app).get('/api/v1/workspace/members').set(auth(org.accessToken));
    expect(members.body.members.map((m) => m.user.email)).toEqual([
      'owner@acme.test',
      'new@hire.test',
    ]);
    // Accepted invites drop off the pending list.
    const list = await request(app).get('/api/v1/workspace/invites').set(auth(org.accessToken));
    expect(list.body.invites).toHaveLength(0);
  });

  it('an invite link is single-use and a missing name/password is rejected for new emails', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const created = await invite(org, 'new@hire.test');
    const token = tokenFromUrl(created.body.invite.inviteUrl);

    const missing = await request(app).post('/api/v1/auth/accept-invite').send({ token });
    expect(missing.status).toBe(400);

    await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({ token, name: 'New Hire', password: 'a-solid-password-1' });
    const replay = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({ token, name: 'Imposter', password: 'another-password-1' });
    expect(replay.status).toBe(400);
  });

  it('an existing account accepts without a password and can then switch between workspaces', async () => {
    const acme = await registerOrg('Acme', 'owner@acme.test');
    const globex = await registerOrg('Globex', 'owner@globex.test');

    const created = await invite(acme, 'owner@globex.test', 'ADMIN');
    const token = tokenFromUrl(created.body.invite.inviteUrl);

    const info = await request(app).get(`/api/v1/auth/invite?token=${encodeURIComponent(token)}`);
    expect(info.body.accountExists).toBe(true);

    const accept = await request(app).post('/api/v1/auth/accept-invite').send({ token });
    expect(accept.status).toBe(200);
    expect(accept.body.workspace.id).toBe(acme.workspaceId);
    expect(accept.body.role).toBe('ADMIN');

    // The switcher lists both seats and re-scopes the session.
    const listWs = await request(app)
      .get('/api/v1/auth/workspaces')
      .set(auth(accept.body.accessToken));
    expect(listWs.body.workspaces).toHaveLength(2);
    expect(listWs.body.workspaces.find((w) => w.id === acme.workspaceId)).toMatchObject({
      role: 'ADMIN',
      current: true,
    });

    const switched = await request(app)
      .post('/api/v1/auth/switch-workspace')
      .set(auth(accept.body.accessToken))
      .send({ workspaceId: globex.workspaceId });
    expect(switched.status).toBe(200);
    expect(switched.body.workspace.id).toBe(globex.workspaceId);
    expect(switched.body.role).toBe('OWNER');

    // No membership -> 403.
    const forbidden = await request(app)
      .post('/api/v1/auth/switch-workspace')
      .set(auth(acme.accessToken))
      .send({ workspaceId: globex.workspaceId });
    expect(forbidden.status).toBe(403);
  });

  it('revoking an invite kills the emailed link', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const created = await invite(org, 'new@hire.test');
    const token = tokenFromUrl(created.body.invite.inviteUrl);

    const revoke = await request(app)
      .delete(`/api/v1/workspace/invites/${created.body.invite.id}`)
      .set(auth(org.accessToken));
    expect(revoke.status).toBe(204);

    const info = await request(app).get(`/api/v1/auth/invite?token=${encodeURIComponent(token)}`);
    expect(info.status).toBe(400);
    const accept = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({ token, name: 'New Hire', password: 'a-solid-password-1' });
    expect(accept.status).toBe(400);
  });

  it('an expired invite is rejected and drops off the pending list', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const created = await invite(org, 'new@hire.test');
    const token = tokenFromUrl(created.body.invite.inviteUrl);
    await prisma.workspaceInvite.update({
      where: { id: created.body.invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const info = await request(app).get(`/api/v1/auth/invite?token=${encodeURIComponent(token)}`);
    expect(info.status).toBe(400);
    const list = await request(app).get('/api/v1/workspace/invites').set(auth(org.accessToken));
    expect(list.body.invites).toHaveLength(0);
  });

  it('is workspace-isolated: another workspace cannot see or revoke the invite', async () => {
    const acme = await registerOrg('Acme', 'owner@acme.test');
    const globex = await registerOrg('Globex', 'owner@globex.test');
    const created = await invite(acme, 'new@hire.test');

    const list = await request(app).get('/api/v1/workspace/invites').set(auth(globex.accessToken));
    expect(list.body.invites).toHaveLength(0);
    const revoke = await request(app)
      .delete(`/api/v1/workspace/invites/${created.body.invite.id}`)
      .set(auth(globex.accessToken));
    expect(revoke.status).toBe(404);
  });
});

describe('seat-count enforcement', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  async function invite(org, email, role = 'MEMBER') {
    return request(app)
      .post('/api/v1/workspace/invites')
      .set(auth(org.accessToken))
      .send({ email, role });
  }

  it('a FREE workspace (1 seat) cannot invite at all, with a plan-aware message', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test', 1);
    const res = await invite(org, 'new@hire.test');
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/Free plan includes 1 seat/);
    // Seat info comes back with the members list for the UI.
    const members = await request(app).get('/api/v1/workspace/members').set(auth(org.accessToken));
    expect(members.body.seats).toMatchObject({ total: 1, members: 1, pendingInvites: 0, used: 1 });
  });

  it('pending invites reserve seats; the invite over the count is blocked; revoking frees it', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test', 2);
    const first = await invite(org, 'one@hire.test');
    expect(first.status).toBe(201);

    const over = await invite(org, 'two@hire.test');
    expect(over.status).toBe(422);
    expect(over.body.error.message).toMatch(/All 2 seats are in use/);

    // Re-inviting the already-invited address is not a new seat.
    const reinvite = await invite(org, 'one@hire.test', 'ADMIN');
    expect(reinvite.status).toBe(201);

    await request(app)
      .delete(`/api/v1/workspace/invites/${first.body.invite.id}`)
      .set(auth(org.accessToken));
    const after = await invite(org, 'two@hire.test');
    expect(after.status).toBe(201);
  });

  it('accepting is blocked when the seats were taken after the invite went out', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test', 2);
    const created = await invite(org, 'new@hire.test');
    const token = new URL(created.body.invite.inviteUrl).searchParams.get('token');
    // Seat disappears before they accept.
    await prisma.workspace.update({ where: { id: org.workspaceId }, data: { seats: 1 } });

    const accept = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({ token, name: 'New Hire', password: 'a-solid-password-1' });
    expect(accept.status).toBe(422);
    expect(accept.body.error.message).toMatch(/No seats left/);

    await prisma.workspace.update({ where: { id: org.workspaceId }, data: { seats: 2 } });
    const retry = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({ token, name: 'New Hire', password: 'a-solid-password-1' });
    expect(retry.status).toBe(200);
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';

const app = createApp();
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function registerOrg(orgName, email, blocks = 1, plan = 'BASIC') {
  const res = await registerAndVerify(app, {
    email,
    password: 'correct-horse-battery',
    name: 'Owner',
    orgName,
  });
  // Fresh signups are FREE. Team features (invite/roles/audit) are
  // paid-only, so default these test workspaces to a paid plan with one
  // seat block; the FREE-gating test overrides plan back to FREE.
  await prisma.workspace.update({
    where: { id: res.body.workspace.id },
    data: { blocks: plan === 'FREE' ? 0 : blocks, plan },
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

  it('team audit summarizes credit spend per teammate and exports CSV (paid, ADMIN+)', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const member = await addMember(org.workspaceId, 'member@acme.test', 'MEMBER');
    const company = await prisma.company.create({ data: { name: 'Nova', domain: 'nova.test' } });
    const contact = await prisma.contact.create({
      data: { companyId: company.id, firstName: 'Jordan', lastName: 'Bennett' },
    });
    // Two spends by the owner, one by the teammate; one unattributed.
    await prisma.creditLedgerEntry.createMany({
      data: [
        { workspaceId: org.workspaceId, delta: -2, reason: 'EMAIL_REVEAL', contactId: contact.id, spentById: org.userId },
        { workspaceId: org.workspaceId, delta: -20, reason: 'CSV_EXPORT', spentById: org.userId },
        { workspaceId: org.workspaceId, delta: -2, reason: 'EMAIL_REVEAL', spentById: member.user.id },
        { workspaceId: org.workspaceId, delta: -20, reason: 'COMPANY_VIEW', spentById: null },
        { workspaceId: org.workspaceId, delta: 100, reason: 'MONTHLY_GRANT' }, // a grant — must be excluded
      ],
    });

    const audit = await request(app).get('/api/v1/workspace/audit').set(auth(org.accessToken));
    expect(audit.status).toBe(200);
    expect(audit.body.totalSpent).toBe(44); // 2 + 20 + 2 + 20, grant excluded
    const owner = audit.body.members.find((m) => m.userId === org.userId);
    expect(owner).toMatchObject({ totalSpent: 22, actionCount: 2, byReason: { EMAIL_REVEAL: 2, CSV_EXPORT: 20 } });
    const teammate = audit.body.members.find((m) => m.userId === member.user.id);
    expect(teammate).toMatchObject({ totalSpent: 2, actionCount: 1 });
    expect(audit.body.unattributed).toMatchObject({ totalSpent: 20, actionCount: 1 });

    // CSV export — one row per spend + a header.
    const csv = await request(app).get('/api/v1/workspace/audit/export').set(auth(org.accessToken));
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.headers['content-disposition']).toMatch(/team-credit-audit\.csv/);
    const lines = csv.text.trim().split('\r\n');
    expect(lines[0]).toBe('Date,Member,Email,Action,Credits,Detail');
    expect(lines).toHaveLength(5); // header + 4 spends
    expect(csv.text).toContain('Jordan Bennett'); // reveal detail resolved
    expect(csv.text).toContain('(unattributed)');
  });

  it('team audit is gated: MEMBER forbidden, FREE plan blocked', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const member = await addMember(org.workspaceId, 'member@acme.test', 'MEMBER');
    const denied = await request(app).get('/api/v1/workspace/audit').set(auth(member.accessToken));
    expect(denied.status).toBe(403);

    const free = await registerOrg('Freebie', 'free@acme.test', 5, 'FREE');
    const gated = await request(app).get('/api/v1/workspace/audit').set(auth(free.accessToken));
    expect(gated.status).toBe(403);
    expect(gated.body.error.message).toMatch(/Team features aren’t available on the Free plan/);
  });

  it('is isolated — another workspace never sees these members', async () => {
    const a = await registerOrg('Acme', 'owner@acme.test');
    const b = await registerOrg('Globex', 'owner@globex.test');
    await addMember(a.workspaceId, 'member@acme.test', 'MEMBER');
    const res = await request(app).get('/api/v1/workspace/members').set(auth(b.accessToken));
    expect(res.body.members.map((m) => m.user.email)).toEqual(['owner@globex.test']);
  });

  it('changes a member between teammate and admin (ADMIN+), protects the owner, blocks a MEMBER, and gates FREE', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const member = await addMember(org.workspaceId, 'member@acme.test', 'MEMBER');

    // Promote the teammate to admin.
    const promote = await request(app)
      .patch(`/api/v1/workspace/members/${member.user.id}/role`)
      .set(auth(org.accessToken))
      .send({ role: 'ADMIN' });
    expect(promote.status).toBe(200);
    expect(promote.body.member).toMatchObject({ role: 'ADMIN', user: { email: 'member@acme.test' } });

    // The owner's role can't be changed.
    const owner = await prisma.membership.findFirst({ where: { workspaceId: org.workspaceId, role: 'OWNER' } });
    const protectOwner = await request(app)
      .patch(`/api/v1/workspace/members/${owner.userId}/role`)
      .set(auth(org.accessToken))
      .send({ role: 'MEMBER' });
    expect(protectOwner.status).toBe(409);

    // A plain MEMBER can't change roles (403 before the plan check).
    const bystander = await addMember(org.workspaceId, 'other@acme.test', 'MEMBER');
    const denied = await request(app)
      .patch(`/api/v1/workspace/members/${member.user.id}/role`)
      .set(auth(bystander.accessToken))
      .send({ role: 'MEMBER' });
    expect(denied.status).toBe(403);

    // On FREE the whole feature is gated.
    const free = await registerOrg('Freebie', 'free@acme.test', 5, 'FREE');
    const freeMember = await addMember(free.workspaceId, 'fm@acme.test', 'MEMBER');
    const gated = await request(app)
      .patch(`/api/v1/workspace/members/${freeMember.user.id}/role`)
      .set(auth(free.accessToken))
      .send({ role: 'ADMIN' });
    expect(gated.status).toBe(403);
    expect(gated.body.error.message).toMatch(/Team features aren’t available on the Free plan/);
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

  it('a FREE workspace cannot use team features at all (plan-gated before the seat check)', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test', 1, 'FREE');
    const res = await invite(org, 'new@hire.test');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/Team features aren’t available on the Free plan/);
    // Seat info still comes back with the members list for the UI.
    const members = await request(app).get('/api/v1/workspace/members').set(auth(org.accessToken));
    expect(members.body.seats).toMatchObject({ total: 1, members: 1, pendingInvites: 0, used: 1 });
  });

  it('invites are uncapped under pay-later billing — no seat gate', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test', 1); // 1 block = 5 paid + 1 free
    // Far more invites than capacity — every one succeeds.
    for (let i = 0; i < 8; i++) {
      const res = await invite(org, `hire-${i}@acme.test`);
      expect(res.status).toBe(201);
    }
    // Re-inviting an already-invited address refreshes it rather than erroring.
    const reinvite = await invite(org, 'hire-0@acme.test', 'ADMIN');
    expect(reinvite.status).toBe(201);
  });

  it('bulk invite returns per-email results and never sinks the batch', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const res = await request(app)
      .post('/api/v1/workspace/invites/bulk')
      .set(auth(org.accessToken))
      .send({
        emails: ['a@hire.test', 'b@hire.test', 'a@hire.test', 'owner@acme.test'],
        role: 'MEMBER',
      });

    expect(res.status).toBe(201);
    expect(res.body.invited).toBe(2); // a + b
    expect(res.body.failed).toBe(2); // in-batch duplicate + already-a-member
    const okEmails = res.body.results.filter((r) => r.ok).map((r) => r.email);
    expect(okEmails).toEqual(['a@hire.test', 'b@hire.test']);
    const failures = res.body.results.filter((r) => !r.ok);
    expect(failures.find((f) => f.email === 'a@hire.test').error).toMatch(/Duplicate/);
    expect(failures.find((f) => f.email === 'owner@acme.test').error).toMatch(/already a member/);
  });

  it('accepting with spare capacity activates the member; beyond capacity they land PENDING', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test', 1); // capacity 5 paid + 1 free
    const created = await invite(org, 'new@hire.test');
    const token = new URL(created.body.invite.inviteUrl).searchParams.get('token');

    const accept = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({ token, name: 'New Hire', password: 'a-solid-password-1' });
    expect(accept.status).toBe(200);

    // Spare paid capacity -> instantly covered + welcome gift.
    const covered = await prisma.membership.findFirst({
      where: { workspaceId: org.workspaceId, user: { email: 'new@hire.test' } },
    });
    expect(covered.seatType).toBe('PAID');
    expect(covered.welcomeGiftAt).not.toBeNull();

    // Fill the workspace past capacity, then accept one more — they stay PENDING.
    for (let i = 0; i < 5; i++) {
      const u = await prisma.user.create({
        data: { email: `filler-${i}@acme.test`, passwordHash: 'x', name: 'Filler' },
      });
      await prisma.membership.create({
        data: {
          userId: u.id,
          workspaceId: org.workspaceId,
          role: 'MEMBER',
          seatType: i < 4 ? 'PAID' : 'FREE',
        },
      });
    }

    const late = await invite(org, 'late@hire.test');
    const lateToken = new URL(late.body.invite.inviteUrl).searchParams.get('token');
    const lateAccept = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({ token: lateToken, name: 'Late Hire', password: 'a-solid-password-1' });
    expect(lateAccept.status).toBe(200);

    const pending = await prisma.membership.findFirst({
      where: { workspaceId: org.workspaceId, user: { email: 'late@hire.test' } },
    });
    expect(pending.seatType).toBe('PENDING');
    expect(pending.welcomeGiftAt).toBeNull();
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';

const app = createApp();

async function registerOrg(orgName, email) {
  const res = await registerAndVerify(app, {
    email,
    password: 'correct-horse-battery',
    name: 'Owner',
    orgName,
  });
  return { accessToken: res.body.accessToken, workspaceId: res.body.workspace.id };
}

const adminCreds = { email: 'root@datapit.io', password: 'super-secret-admin-pw' };

async function seedAdmin() {
  const passwordHash = await hashPassword(adminCreds.password);
  await prisma.superAdmin.create({ data: { email: adminCreds.email, passwordHash, name: 'Root Admin' } });
  const login = await request(app).post('/api/v1/admin/auth/login').send(adminCreds);
  return login.body.accessToken;
}

describe('tickets', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists the predefined subjects for both ticket types', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const res = await request(app)
      .get('/api/v1/tickets/subjects')
      .set('Authorization', `Bearer ${org.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.subjects.SUPPORT).toContain('Bug report');
    expect(res.body.subjects.SALES).toContain('Request a demo');
    expect(res.body.maxWords).toBe(200);
  });

  it('creates a ticket with the opening message as its first thread entry, status UNANSWERED', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ type: 'SUPPORT', subject: 'Bug report', body: 'Search is returning no results.' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('UNANSWERED');
    expect(res.body.type).toBe('SUPPORT');

    const detail = await request(app)
      .get(`/api/v1/tickets/${res.body.id}`)
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(detail.body.messages).toHaveLength(1);
    expect(detail.body.messages[0].authorType).toBe('USER');
    expect(detail.body.messages[0].body).toBe('Search is returning no results.');
  });

  it('rejects a subject that does not belong to the ticket type', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ type: 'SUPPORT', subject: 'Request a demo', body: 'Hello' });

    expect(res.status).toBe(400);
  });

  it('rejects a message over 200 words', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const longBody = Array(201).fill('word').join(' ');
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ type: 'SALES', subject: 'Request a demo', body: longBody });

    expect(res.status).toBe(400);
  });

  it("a workspace's ticket list never includes another workspace's tickets", async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');

    await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ type: 'SUPPORT', subject: 'Bug report', body: 'Org A ticket' });

    const indexRes = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${orgB.accessToken}`);
    expect(indexRes.body.results).toHaveLength(0);
  });

  it('a user in org B cannot fetch or reply to a ticket belonging to org A', async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');

    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ type: 'SUPPORT', subject: 'Bug report', body: 'Org A ticket' });
    const ticketId = createRes.body.id;

    const crossRead = await request(app)
      .get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);
    expect(crossRead.status).toBe(404);

    const crossReply = await request(app)
      .post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .send({ body: 'sneaky reply' });
    expect(crossReply.status).toBe(404);
  });

  it('a user reply re-opens an answered ticket back to UNANSWERED', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const adminToken = await seedAdmin();

    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ type: 'SUPPORT', subject: 'Bug report', body: 'Something is broken' });
    const ticketId = createRes.body.id;

    const adminReply = await request(app)
      .post(`/api/v1/admin/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Looking into it now.' });
    expect(adminReply.body.status).toBe('ANSWERED');

    const userReply = await request(app)
      .post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ body: 'Still broken, any update?' });
    expect(userReply.body.status).toBe('UNANSWERED');

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(detail.body.messages).toHaveLength(3);
    expect(detail.body.messages[1].authorType).toBe('ADMIN');
    expect(detail.body.messages[1].authorName).toBe('Root Admin');
  });

  it('cannot reply to a closed ticket', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const adminToken = await seedAdmin();

    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ type: 'SUPPORT', subject: 'Bug report', body: 'Something is broken' });
    const ticketId = createRes.body.id;

    const closeRes = await request(app)
      .post(`/api/v1/admin/tickets/${ticketId}/close`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(closeRes.body.status).toBe('CLOSED');
    expect(closeRes.body.closedAt).toBeTruthy();

    const userReply = await request(app)
      .post(`/api/v1/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ body: 'hello?' });
    expect(userReply.status).toBe(400);
  });

  it('filters the workspace list by ACTIVE (unanswered + answered, not closed)', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const adminToken = await seedAdmin();

    const t1 = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ type: 'SUPPORT', subject: 'Bug report', body: 'Ticket one' });
    const t2 = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ type: 'SUPPORT', subject: 'Bug report', body: 'Ticket two' });
    await request(app)
      .post(`/api/v1/admin/tickets/${t2.body.id}/close`)
      .set('Authorization', `Bearer ${adminToken}`);

    const activeRes = await request(app)
      .get('/api/v1/tickets?status=ACTIVE')
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(activeRes.body.results.map((t) => t.id)).toEqual([t1.body.id]);

    const closedRes = await request(app)
      .get('/api/v1/tickets?status=CLOSED')
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(closedRes.body.results.map((t) => t.id)).toEqual([t2.body.id]);
  });

  it('admin can list tickets across every workspace and filter by type/status', async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');
    const adminToken = await seedAdmin();

    await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ type: 'SUPPORT', subject: 'Bug report', body: 'From org A' });
    await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${orgB.accessToken}`)
      .send({ type: 'SALES', subject: 'Request a demo', body: 'From org B' });

    const all = await request(app)
      .get('/api/v1/admin/tickets')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(all.body.total).toBe(2);
    expect(all.body.results.map((t) => t.workspace.name).sort()).toEqual([
      'Org A Workspace',
      'Org B Workspace',
    ]);

    const salesOnly = await request(app)
      .get('/api/v1/admin/tickets?type=SALES')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(salesOnly.body.total).toBe(1);
    expect(salesOnly.body.results[0].type).toBe('SALES');
  });

  it('a tenant access token cannot reach admin ticket routes, and vice versa', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');

    const asTenant = await request(app)
      .get('/api/v1/admin/tickets')
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(asTenant.status).toBe(401);

    const adminToken = await seedAdmin();
    const asAdmin = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(asAdmin.status).toBe(401);
  });

  it('the admin notifications endpoint returns only tickets newer than `since`, plus a live unanswered count', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const adminToken = await seedAdmin();

    const first = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ type: 'SUPPORT', subject: 'Bug report', body: 'First ticket' });

    const baseline = await request(app)
      .get('/api/v1/admin/tickets/notifications')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(baseline.body.tickets).toHaveLength(1);
    expect(baseline.body.unansweredCount).toBe(1);

    const since = baseline.body.latestCreatedAt;
    const noNewYet = await request(app)
      .get(`/api/v1/admin/tickets/notifications?since=${encodeURIComponent(since)}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(noNewYet.body.tickets).toHaveLength(0);
    expect(noNewYet.body.unansweredCount).toBe(1);

    await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ type: 'SALES', subject: 'Request a demo', body: 'Second ticket' });

    const afterSecond = await request(app)
      .get(`/api/v1/admin/tickets/notifications?since=${encodeURIComponent(since)}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterSecond.body.tickets).toHaveLength(1);
    expect(afterSecond.body.tickets[0].subject).toBe('Request a demo');
    expect(afterSecond.body.unansweredCount).toBe(2);
  });
});

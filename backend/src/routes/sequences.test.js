import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { processDueEnrollments } from '../services/sequenceService.js';
import { redis } from '../config/redis.js';
import { getBalance } from '../services/creditService.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';

const app = createApp();

async function registerOrg(orgName, email) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'correct-horse-battery', name: 'Owner', orgName });
  const workspaceId = res.body.workspace.id;
  // Sequences are gated to paid plans (see config/planConfig.js) — every
  // test in this file exercises sequence routes, so upgrade past the Free
  // default and give it enough credits for enrollment tests, matching
  // sequenceService.test.js's own approach.
  await prisma.workspace.update({ where: { id: workspaceId }, data: { plan: 'BASIC' } });
  await redis.set(`credits:balance:${workspaceId}`, 10_000);
  return { accessToken: res.body.accessToken, workspaceId };
}

async function seedContact(email = null) {
  const company = await prisma.company.create({
    data: { name: 'Nova Systems', domain: `novasystems-${Date.now()}-${Math.random()}.com` },
  });
  return prisma.contact.create({
    data: { companyId: company.id, firstName: 'Jordan', lastName: 'Bennett', email },
  });
}

const twoStepSequence = {
  name: 'Q3 outbound',
  steps: [
    { type: 'EMAIL', subject: 'Hi there', body: 'Intro email' },
    { type: 'WAIT', waitDays: 3 },
  ],
};

describe('sequences routes', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Free plan gating', () => {
    async function registerFreeOrg(orgName, email) {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: 'correct-horse-battery', name: 'Owner', orgName });
      return { accessToken: res.body.accessToken, workspaceId: res.body.workspace.id };
    }

    it('blocks creating a sequence on the Free plan', async () => {
      const owner = await registerFreeOrg('Free Org', 'owner@free-org.test');

      const res = await request(app)
        .post('/api/v1/sequences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(twoStepSequence);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Upgrade your workspace/);
    });

    it('allows creating a sequence once the workspace is on a paid plan', async () => {
      const owner = await registerFreeOrg('Upgraded Org', 'owner@upgraded-org.test');
      await prisma.workspace.update({ where: { id: owner.workspaceId }, data: { plan: 'BASIC' } });

      const res = await request(app)
        .post('/api/v1/sequences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(twoStepSequence);

      expect(res.status).toBe(201);
    });
  });

  it('creates a DRAFT sequence with ordered steps', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');

    const res = await request(app)
      .post('/api/v1/sequences')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(twoStepSequence);

    expect(res.status).toBe(201);
    expect(res.body.sequence.status).toBe('DRAFT');
    expect(res.body.sequence.steps).toHaveLength(2);
    expect(res.body.sequence.steps[0].type).toBe('EMAIL');
    expect(res.body.sequence.steps[1].type).toBe('WAIT');
  });

  it('lists sequences with step and enrollment counts', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');
    await request(app)
      .post('/api/v1/sequences')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(twoStepSequence);

    const res = await request(app)
      .get('/api/v1/sequences')
      .set('Authorization', `Bearer ${owner.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sequences).toHaveLength(1);
    expect(res.body.sequences[0]._count.steps).toBe(2);
    expect(res.body.sequences[0]._count.enrollments).toBe(0);
  });

  it('a MEMBER of org B never sees org A sequences in the index', async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');
    await request(app)
      .post('/api/v1/sequences')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send(twoStepSequence);

    const res = await request(app)
      .get('/api/v1/sequences')
      .set('Authorization', `Bearer ${orgB.accessToken}`);

    expect(res.body.sequences).toHaveLength(0);
  });

  it('gets a sequence detail with steps and enrollments, and blocks cross-tenant access', async () => {
    const orgA = await registerOrg('Org A', 'owner@org-a.test');
    const orgB = await registerOrg('Org B', 'owner@org-b.test');
    const contact = await seedContact('jordan.bennett@novasystems.com');

    const createRes = await request(app)
      .post('/api/v1/sequences')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send(twoStepSequence);
    const sequenceId = createRes.body.sequence.id;

    await request(app)
      .post(`/api/v1/sequences/${sequenceId}/activate`)
      .set('Authorization', `Bearer ${orgA.accessToken}`);
    await request(app)
      .post(`/api/v1/sequences/${sequenceId}/enrollments`)
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .send({ contactId: contact.id });

    const showRes = await request(app)
      .get(`/api/v1/sequences/${sequenceId}`)
      .set('Authorization', `Bearer ${orgA.accessToken}`);
    expect(showRes.status).toBe(200);
    expect(showRes.body.sequence.enrollments).toHaveLength(1);
    expect(showRes.body.sequence.enrollments[0].contact.firstName).toBe('Jordan');
    expect(showRes.body.sequence.enrollments[0].contact.company.name).toBe('Nova Systems');

    const crossTenant = await request(app)
      .get(`/api/v1/sequences/${sequenceId}`)
      .set('Authorization', `Bearer ${orgB.accessToken}`);
    expect(crossTenant.status).toBe(404);
  });

  it('cannot enroll into a DRAFT sequence, only an ACTIVE one', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');
    const contact = await seedContact();

    const createRes = await request(app)
      .post('/api/v1/sequences')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(twoStepSequence);
    const sequenceId = createRes.body.sequence.id;

    const draftEnroll = await request(app)
      .post(`/api/v1/sequences/${sequenceId}/enrollments`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ contactId: contact.id });
    expect(draftEnroll.status).toBe(409);

    await request(app)
      .post(`/api/v1/sequences/${sequenceId}/activate`)
      .set('Authorization', `Bearer ${owner.accessToken}`);

    const activeEnroll = await request(app)
      .post(`/api/v1/sequences/${sequenceId}/enrollments`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ contactId: contact.id });
    expect(activeEnroll.status).toBe(201);
    expect(activeEnroll.body.enrollment.status).toBe('ACTIVE');
  });

  it('pauses, resumes, and unenrolls an enrollment', async () => {
    const owner = await registerOrg('Org A', 'owner@org-a.test');
    const contact = await seedContact();

    const createRes = await request(app)
      .post('/api/v1/sequences')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(twoStepSequence);
    const sequenceId = createRes.body.sequence.id;
    await request(app)
      .post(`/api/v1/sequences/${sequenceId}/activate`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    const enrollRes = await request(app)
      .post(`/api/v1/sequences/${sequenceId}/enrollments`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ contactId: contact.id });
    const enrollmentId = enrollRes.body.enrollment.id;

    const pauseRes = await request(app)
      .post(`/api/v1/sequences/enrollments/${enrollmentId}/pause`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(pauseRes.status).toBe(204);

    let enrollment = await prisma.sequenceEnrollment.findUnique({ where: { id: enrollmentId } });
    expect(enrollment.status).toBe('PAUSED');

    const resumeRes = await request(app)
      .post(`/api/v1/sequences/enrollments/${enrollmentId}/resume`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(resumeRes.status).toBe(204);

    enrollment = await prisma.sequenceEnrollment.findUnique({ where: { id: enrollmentId } });
    expect(enrollment.status).toBe('ACTIVE');

    const unenrollRes = await request(app)
      .post(`/api/v1/sequences/enrollments/${enrollmentId}/unenroll`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(unenrollRes.status).toBe(204);

    enrollment = await prisma.sequenceEnrollment.findUnique({ where: { id: enrollmentId } });
    expect(enrollment.status).toBe('UNENROLLED');
    expect(enrollment.unenrolledReason).toBe('manual');
  });

  describe('analytics', () => {
    it('returns zeroed totals and rates for a sequence with no sends yet', async () => {
      const owner = await registerOrg('Org A', 'owner@org-a.test');
      const createRes = await request(app)
        .post('/api/v1/sequences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(twoStepSequence);

      const res = await request(app)
        .get(`/api/v1/sequences/${createRes.body.sequence.id}/analytics`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.analytics.totals).toMatchObject({ SENT: 0, OPENED: 0, CLICKED: 0 });
      expect(res.body.analytics.rates).toEqual({
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        bounceRate: 0,
      });
      expect(res.body.analytics.enrollmentFunnel.total).toBe(0);
      expect(res.body.analytics.perStep).toHaveLength(1); // the one EMAIL step
    });

    it('aggregates sent/opened/clicked events into totals, rates, and a per-step breakdown', async () => {
      const owner = await registerOrg('Org A', 'owner@org-a.test');
      const contactA = await seedContact('a@novasystems.com');
      const contactB = await seedContact('b@novasystems.com');

      const createRes = await request(app)
        .post('/api/v1/sequences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(twoStepSequence);
      const sequenceId = createRes.body.sequence.id;
      await request(app)
        .post(`/api/v1/sequences/${sequenceId}/activate`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      const enrollA = await request(app)
        .post(`/api/v1/sequences/${sequenceId}/enrollments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ contactId: contactA.id });
      await request(app)
        .post(`/api/v1/sequences/${sequenceId}/enrollments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ contactId: contactB.id });

      // Sends the EMAIL step (index 0) to both enrollments, then each lands
      // on the WAIT step and stays ACTIVE.
      await processDueEnrollments();

      // Simulate ESP webhook deliveries for contact A's send only — real
      // rows would come through webhookService, but the aggregation only
      // cares about the SequenceStepEvent rows themselves.
      await prisma.sequenceStepEvent.create({
        data: { enrollmentId: enrollA.body.enrollment.id, stepIndex: 0, type: 'OPENED' },
      });
      await prisma.sequenceStepEvent.create({
        data: { enrollmentId: enrollA.body.enrollment.id, stepIndex: 0, type: 'CLICKED' },
      });

      const res = await request(app)
        .get(`/api/v1/sequences/${sequenceId}/analytics`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.analytics.totals).toMatchObject({
        SENT: 2,
        OPENED: 1,
        CLICKED: 1,
        BOUNCED: 0,
        REPLIED: 0,
      });
      expect(res.body.analytics.rates.openRate).toBe(0.5);
      expect(res.body.analytics.rates.clickRate).toBe(0.5);
      expect(res.body.analytics.perStep).toHaveLength(1);
      expect(res.body.analytics.perStep[0]).toMatchObject({
        stepIndex: 0,
        subject: 'Hi there',
        SENT: 2,
        OPENED: 1,
        CLICKED: 1,
      });
      expect(res.body.analytics.enrollmentFunnel).toMatchObject({ total: 2, active: 2 });
    });

    it('blocks cross-tenant access', async () => {
      const orgA = await registerOrg('Org A', 'owner@org-a.test');
      const orgB = await registerOrg('Org B', 'owner@org-b.test');
      const createRes = await request(app)
        .post('/api/v1/sequences')
        .set('Authorization', `Bearer ${orgA.accessToken}`)
        .send(twoStepSequence);

      const res = await request(app)
        .get(`/api/v1/sequences/${createRes.body.sequence.id}/analytics`)
        .set('Authorization', `Bearer ${orgB.accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('enrollment credits', () => {
    it('charges CREDIT_COSTS.SEQUENCE_ENROLLMENT for a successful enrollment', async () => {
      const owner = await registerOrg('Org A', 'owner@org-a.test');
      const contact = await seedContact();
      const createRes = await request(app)
        .post('/api/v1/sequences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(twoStepSequence);
      await request(app)
        .post(`/api/v1/sequences/${createRes.body.sequence.id}/activate`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      const before = await getBalance(owner.workspaceId);

      const res = await request(app)
        .post(`/api/v1/sequences/${createRes.body.sequence.id}/enrollments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ contactId: contact.id });

      expect(res.status).toBe(201);
      expect(await getBalance(owner.workspaceId)).toBe(before - CREDIT_COSTS.SEQUENCE_ENROLLMENT);
      const ledger = await prisma.creditLedgerEntry.findMany({
        where: { workspaceId: owner.workspaceId },
      });
      expect(ledger).toHaveLength(1);
      expect(ledger[0]).toMatchObject({
        delta: -CREDIT_COSTS.SEQUENCE_ENROLLMENT,
        reason: 'SEQUENCE_ENROLLMENT',
      });
    });

    it('charges nothing when enrollment fails because the sequence is still DRAFT', async () => {
      const owner = await registerOrg('Org A', 'owner@org-a.test');
      const contact = await seedContact();
      const createRes = await request(app)
        .post('/api/v1/sequences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(twoStepSequence);
      const before = await getBalance(owner.workspaceId);

      const res = await request(app)
        .post(`/api/v1/sequences/${createRes.body.sequence.id}/enrollments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ contactId: contact.id });

      expect(res.status).toBe(409);
      expect(await getBalance(owner.workspaceId)).toBe(before);
      const ledger = await prisma.creditLedgerEntry.findMany({
        where: { workspaceId: owner.workspaceId },
      });
      expect(ledger).toHaveLength(0);
    });

    it('charges nothing on the second attempt for a contact already enrolled (refunds, does not double-charge)', async () => {
      const owner = await registerOrg('Org A', 'owner@org-a.test');
      const contact = await seedContact();
      const createRes = await request(app)
        .post('/api/v1/sequences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(twoStepSequence);
      await request(app)
        .post(`/api/v1/sequences/${createRes.body.sequence.id}/activate`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      await request(app)
        .post(`/api/v1/sequences/${createRes.body.sequence.id}/enrollments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ contactId: contact.id });
      const afterFirst = await getBalance(owner.workspaceId);

      const second = await request(app)
        .post(`/api/v1/sequences/${createRes.body.sequence.id}/enrollments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ contactId: contact.id });

      expect(second.status).toBe(409);
      expect(await getBalance(owner.workspaceId)).toBe(afterFirst); // unchanged — no double charge
      const ledger = await prisma.creditLedgerEntry.findMany({
        where: { workspaceId: owner.workspaceId, reason: 'SEQUENCE_ENROLLMENT' },
      });
      expect(ledger).toHaveLength(1); // only the first, successful enrollment
    });

    it('rejects with 402 and creates no enrollment when the workspace is out of credits', async () => {
      const owner = await registerOrg('Org A', 'owner@org-a.test');
      const contact = await seedContact();
      const createRes = await request(app)
        .post('/api/v1/sequences')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(twoStepSequence);
      await request(app)
        .post(`/api/v1/sequences/${createRes.body.sequence.id}/activate`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      await redis.set(`credits:balance:${owner.workspaceId}`, 0);

      const res = await request(app)
        .post(`/api/v1/sequences/${createRes.body.sequence.id}/enrollments`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ contactId: contact.id });

      expect(res.status).toBe(402);
      const enrollment = await prisma.sequenceEnrollment.findFirst({
        where: { sequenceId: createRes.body.sequence.id, contactId: contact.id },
      });
      expect(enrollment).toBeNull();
    });
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';

const app = createApp();

async function registerOrg(orgName, email) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'correct-horse-battery', name: 'Owner', orgName });
  return { accessToken: res.body.accessToken, workspaceId: res.body.workspace.id };
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
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { createSequence, enroll, processDueEnrollments } from './sequenceService.js';
import { addSuppression } from './suppressionService.js';

async function makeWorkspaceAndUser() {
  const org = await prisma.org.create({ data: { slug: 'seq-test', name: 'Seq Test' } });
  const workspace = await prisma.workspace.create({ data: { orgId: org.id, name: 'Seq Test WS' } });
  const user = await prisma.user.create({
    data: { email: 'owner@seq-test.test', passwordHash: 'x', name: 'Owner' },
  });
  await prisma.membership.create({
    data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
  });
  return { workspace, user };
}

async function makeContact(email = 'jordan.bennett@novasystems.com') {
  const company = await prisma.company.create({
    data: { name: 'Nova Systems', domain: 'novasystems.com' },
  });
  return prisma.contact.create({
    data: { companyId: company.id, firstName: 'Jordan', lastName: 'Bennett', email },
  });
}

describe('sequenceService', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it('sends the first EMAIL step immediately on enroll, then waits before the next', async () => {
    const { workspace, user } = await makeWorkspaceAndUser();
    const contact = await makeContact();

    const sequence = await createSequence(workspace.id, user.id, {
      steps: [
        { type: 'EMAIL', subject: 'Hi', body: 'Body 1' },
        { type: 'WAIT', waitDays: 3 },
        { type: 'EMAIL', subject: 'Follow up', body: 'Body 2' },
      ],
      name: 'Test sequence',
    });
    await prisma.sequence.update({ where: { id: sequence.id }, data: { status: 'ACTIVE' } });

    const enrollment = await enroll(workspace.id, sequence.id, contact.id);

    const processed = await processDueEnrollments();
    expect(processed).toBe(1);

    const afterFirstTick = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollment.id },
    });
    expect(afterFirstTick.currentStepIndex).toBe(1); // past the EMAIL step, now on WAIT
    expect(afterFirstTick.status).toBe('ACTIVE');
    expect(afterFirstTick.nextStepDueAt.getTime()).toBeGreaterThan(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    const sentEvents = await prisma.sequenceStepEvent.findMany({
      where: { enrollmentId: enrollment.id, type: 'SENT' },
    });
    expect(sentEvents).toHaveLength(1);

    // The WAIT step isn't due yet — a second tick must not advance it.
    const secondProcessed = await processDueEnrollments();
    expect(secondProcessed).toBe(0);
  });

  it('unenrolls (does not send) when the contact has no email on file', async () => {
    const { workspace, user } = await makeWorkspaceAndUser();
    const company = await prisma.company.create({ data: { name: 'Halo', domain: 'halo.com' } });
    const contact = await prisma.contact.create({
      data: { companyId: company.id, firstName: 'No', lastName: 'Email' },
    });

    const sequence = await createSequence(workspace.id, user.id, {
      name: 'Test',
      steps: [{ type: 'EMAIL', subject: 'Hi', body: 'Body' }],
    });
    await prisma.sequence.update({ where: { id: sequence.id }, data: { status: 'ACTIVE' } });
    const enrollment = await enroll(workspace.id, sequence.id, contact.id);

    await processDueEnrollments();

    const result = await prisma.sequenceEnrollment.findUnique({ where: { id: enrollment.id } });
    expect(result.status).toBe('UNENROLLED');
    expect(result.unenrolledReason).toBe('no_email_on_file');
  });

  it('unenrolls instead of sending to a suppressed address', async () => {
    const { workspace, user } = await makeWorkspaceAndUser();
    const contact = await makeContact('jordan.bennett@novasystems.com');
    await addSuppression(workspace.id, 'jordan.bennett@novasystems.com', 'UNSUBSCRIBED');

    const sequence = await createSequence(workspace.id, user.id, {
      name: 'Test',
      steps: [{ type: 'EMAIL', subject: 'Hi', body: 'Body' }],
    });
    await prisma.sequence.update({ where: { id: sequence.id }, data: { status: 'ACTIVE' } });
    const enrollment = await enroll(workspace.id, sequence.id, contact.id);

    await processDueEnrollments();

    const result = await prisma.sequenceEnrollment.findUnique({ where: { id: enrollment.id } });
    expect(result.status).toBe('UNENROLLED');
    expect(result.unenrolledReason).toBe('suppressed');

    const sentEvents = await prisma.sequenceStepEvent.findMany({
      where: { enrollmentId: enrollment.id, type: 'SENT' },
    });
    expect(sentEvents).toHaveLength(0);
  });

  it('marks the enrollment COMPLETED once every step has been processed', async () => {
    const { workspace, user } = await makeWorkspaceAndUser();
    const contact = await makeContact();

    const sequence = await createSequence(workspace.id, user.id, {
      name: 'Test',
      steps: [{ type: 'EMAIL', subject: 'Hi', body: 'Body' }],
    });
    await prisma.sequence.update({ where: { id: sequence.id }, data: { status: 'ACTIVE' } });
    const enrollment = await enroll(workspace.id, sequence.id, contact.id);

    await processDueEnrollments(); // sends the only step, index -> 1, immediately due again
    await processDueEnrollments(); // index 1 has no step -> COMPLETED

    const result = await prisma.sequenceEnrollment.findUnique({ where: { id: enrollment.id } });
    expect(result.status).toBe('COMPLETED');
  });
});

import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { sendEmail } from './espService.js';
import { isSuppressed } from './suppressionService.js';
import { logger } from '../config/logger.js';

export async function createSequence(workspaceId, createdById, { name, steps }) {
  return prisma.sequence.create({
    data: {
      workspaceId,
      createdById,
      name,
      steps: {
        create: steps.map((step, order) => ({
          order,
          type: step.type,
          waitDays: step.type === 'WAIT' ? step.waitDays : null,
          subject: step.type === 'EMAIL' ? step.subject : null,
          body: step.type === 'EMAIL' ? step.body : null,
        })),
      },
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
}

export async function enroll(workspaceId, sequenceId, contactId) {
  const sequence = await prisma.sequence.findFirst({ where: { id: sequenceId, workspaceId } });
  if (!sequence) throw new ApiError(404, 'Sequence not found');
  if (sequence.status !== 'ACTIVE') {
    throw new ApiError(409, 'Sequence must be ACTIVE to enroll contacts');
  }

  try {
    return await prisma.sequenceEnrollment.create({
      data: { sequenceId, workspaceId, contactId, nextStepDueAt: new Date() },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ApiError(409, 'This contact is already enrolled in this sequence');
    }
    throw err;
  }
}

async function setEnrollmentStatus(workspaceId, enrollmentId, status, reason) {
  const { count } = await prisma.sequenceEnrollment.updateMany({
    where: { id: enrollmentId, workspaceId },
    data: {
      status,
      nextStepDueAt: status === 'ACTIVE' ? new Date() : null,
      unenrolledAt: status === 'UNENROLLED' ? new Date() : undefined,
      unenrolledReason: status === 'UNENROLLED' ? reason : undefined,
    },
  });
  if (count === 0) throw new ApiError(404, 'Enrollment not found');
}

export const pauseEnrollment = (workspaceId, id) => setEnrollmentStatus(workspaceId, id, 'PAUSED');
export const resumeEnrollment = (workspaceId, id) => setEnrollmentStatus(workspaceId, id, 'ACTIVE');
export const unenroll = (workspaceId, id, reason = 'manual') =>
  setEnrollmentStatus(workspaceId, id, 'UNENROLLED', reason);

/**
 * The cadence engine's tick: advances every enrollment whose next step is
 * due. Runs on a fixed interval (see worker.js) rather than one delayed
 * BullMQ job per step — simpler to reason about, and pause/resume/unenroll
 * just become a status/timestamp update instead of needing to find and
 * cancel an in-flight delayed job.
 */
export async function processDueEnrollments() {
  const due = await prisma.sequenceEnrollment.findMany({
    where: { status: 'ACTIVE', nextStepDueAt: { lte: new Date() } },
    include: { sequence: { include: { steps: { orderBy: { order: 'asc' } } } }, contact: true },
  });

  let processed = 0;
  for (const enrollment of due) {
    await processOne(enrollment);
    processed++;
  }
  return processed;
}

async function processOne(enrollment) {
  const step = enrollment.sequence.steps[enrollment.currentStepIndex];

  if (!step) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'COMPLETED', nextStepDueAt: null },
    });
    return;
  }

  if (step.type === 'WAIT') {
    const nextStepDueAt = new Date(Date.now() + step.waitDays * 24 * 60 * 60 * 1000);
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { currentStepIndex: enrollment.currentStepIndex + 1, nextStepDueAt },
    });
    return;
  }

  // EMAIL step
  const email = enrollment.contact.email;
  if (!email || (await isSuppressed(enrollment.workspaceId, email))) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'UNENROLLED',
        nextStepDueAt: null,
        unenrolledAt: new Date(),
        unenrolledReason: email ? 'suppressed' : 'no_email_on_file',
      },
    });
    return;
  }

  const result = await sendEmail({ to: email, subject: step.subject, body: step.body });

  await prisma.$transaction([
    prisma.sequenceStepEvent.create({
      data: {
        enrollmentId: enrollment.id,
        stepIndex: enrollment.currentStepIndex,
        type: 'SENT',
        providerEventId: result.messageId,
      },
    }),
    prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { currentStepIndex: enrollment.currentStepIndex + 1, nextStepDueAt: new Date() },
    }),
  ]);

  logger.info(
    { enrollmentId: enrollment.id, stepIndex: enrollment.currentStepIndex },
    'Sequence step sent',
  );
}

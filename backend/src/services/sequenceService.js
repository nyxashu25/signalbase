import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { sendEmail } from './espService.js';
import { isSuppressed } from './suppressionService.js';
import { logger } from '../config/logger.js';
import { resolveReservationForCommit, releaseReservation, refundAmount } from './creditService.js';

export async function listSequences(workspaceId) {
  const sequences = await prisma.sequence.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { steps: true, enrollments: true } },
    },
  });

  return sequences;
}

export async function getSequence(workspaceId, sequenceId) {
  const sequence = await prisma.sequence.findFirst({
    where: { id: sequenceId, workspaceId },
    include: {
      steps: { orderBy: { order: 'asc' } },
      enrollments: {
        orderBy: { enrolledAt: 'desc' },
        include: { contact: { include: { company: true } } },
      },
    },
  });
  if (!sequence) throw new ApiError(404, 'Sequence not found');
  return sequence;
}

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

export async function enroll(workspaceId, sequenceId, contactId, reservationId, userId) {
  const sequence = await prisma.sequence.findFirst({ where: { id: sequenceId, workspaceId } });
  if (!sequence) {
    await releaseReservation(reservationId);
    throw new ApiError(404, 'Sequence not found');
  }
  if (sequence.status !== 'ACTIVE') {
    await releaseReservation(reservationId);
    throw new ApiError(409, 'Sequence must be ACTIVE to enroll contacts');
  }

  const { amount } = await resolveReservationForCommit(reservationId, { workspaceId });

  try {
    const [enrollment] = await prisma.$transaction([
      prisma.sequenceEnrollment.create({
        data: { sequenceId, workspaceId, contactId, nextStepDueAt: new Date() },
      }),
      prisma.creditLedgerEntry.create({
        data: { workspaceId, delta: -amount, reason: 'SEQUENCE_ENROLLMENT', spentById: userId },
      }),
    ]);
    return enrollment;
  } catch (err) {
    if (err.code === 'P2002') {
      // The reservation's Redis side is already cleared by the resolve
      // call above — refund directly rather than double-charge for an
      // enrollment that didn't happen.
      await refundAmount(workspaceId, amount);
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

const EMPTY_EVENT_COUNTS = () => ({
  SENT: 0,
  OPENED: 0,
  CLICKED: 0,
  BOUNCED: 0,
  REPLIED: 0,
  UNSUBSCRIBED: 0,
});

function rate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Every sequence in the workspace rolled up for the Sequences → Analytics
 * tab: one KPI row (totals + rates) plus a per-sequence table. Two grouped
 * queries regardless of how many sequences exist.
 */
export async function getWorkspaceAnalytics(workspaceId) {
  const [sequences, eventGroups, enrollmentGroups] = await Promise.all([
    prisma.sequence.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, status: true },
    }),
    prisma.sequenceStepEvent.groupBy({
      by: ['type'],
      where: { enrollment: { workspaceId } },
      _count: true,
    }),
    prisma.sequenceEnrollment.groupBy({
      by: ['sequenceId', 'status'],
      where: { workspaceId },
      _count: true,
    }),
  ]);

  const totals = EMPTY_EVENT_COUNTS();
  for (const row of eventGroups) totals[row.type] += row._count;

  // Per-sequence event counts need the sequence id, which lives on the
  // enrollment, so group via a raw-ish second pass keyed by enrollment.
  const perSequenceEvents = new Map();
  if (sequences.length > 0) {
    const rows = await prisma.sequenceStepEvent.findMany({
      where: { enrollment: { workspaceId } },
      select: { type: true, enrollment: { select: { sequenceId: true } } },
    });
    for (const row of rows) {
      const key = row.enrollment.sequenceId;
      if (!perSequenceEvents.has(key)) perSequenceEvents.set(key, EMPTY_EVENT_COUNTS());
      perSequenceEvents.get(key)[row.type] += 1;
    }
  }

  const enrolledBySequence = new Map();
  let enrolledTotal = 0;
  let activeEnrollments = 0;
  for (const row of enrollmentGroups) {
    enrolledBySequence.set(row.sequenceId, (enrolledBySequence.get(row.sequenceId) ?? 0) + row._count);
    enrolledTotal += row._count;
    if (row.status === 'ACTIVE') activeEnrollments += row._count;
  }

  return {
    totals,
    rates: {
      openRate: rate(totals.OPENED, totals.SENT),
      clickRate: rate(totals.CLICKED, totals.SENT),
      replyRate: rate(totals.REPLIED, totals.SENT),
      bounceRate: rate(totals.BOUNCED, totals.SENT),
    },
    enrollments: { total: enrolledTotal, active: activeEnrollments },
    sequences: sequences.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      enrolled: enrolledBySequence.get(s.id) ?? 0,
      ...(perSequenceEvents.get(s.id) ?? EMPTY_EVENT_COUNTS()),
    })),
  };
}

export async function getSequenceAnalytics(workspaceId, sequenceId) {
  const sequence = await prisma.sequence.findFirst({
    where: { id: sequenceId, workspaceId },
    include: { steps: { where: { type: 'EMAIL' }, orderBy: { order: 'asc' } } },
  });
  if (!sequence) throw new ApiError(404, 'Sequence not found');

  const [enrollmentGroups, eventGroups] = await Promise.all([
    prisma.sequenceEnrollment.groupBy({
      by: ['status'],
      where: { sequenceId },
      _count: true,
    }),
    prisma.sequenceStepEvent.groupBy({
      by: ['stepIndex', 'type'],
      where: { enrollment: { sequenceId } },
      _count: true,
    }),
  ]);

  const funnel = { ACTIVE: 0, PAUSED: 0, COMPLETED: 0, UNENROLLED: 0 };
  for (const row of enrollmentGroups) funnel[row.status] = row._count;

  const totals = EMPTY_EVENT_COUNTS();
  const perStepCounts = new Map();
  for (const row of eventGroups) {
    totals[row.type] += row._count;
    if (!perStepCounts.has(row.stepIndex)) perStepCounts.set(row.stepIndex, EMPTY_EVENT_COUNTS());
    perStepCounts.get(row.stepIndex)[row.type] += row._count;
  }

  return {
    enrollmentFunnel: {
      total: funnel.ACTIVE + funnel.PAUSED + funnel.COMPLETED + funnel.UNENROLLED,
      active: funnel.ACTIVE,
      paused: funnel.PAUSED,
      completed: funnel.COMPLETED,
      unenrolled: funnel.UNENROLLED,
    },
    totals,
    rates: {
      openRate: rate(totals.OPENED, totals.SENT),
      clickRate: rate(totals.CLICKED, totals.SENT),
      replyRate: rate(totals.REPLIED, totals.SENT),
      bounceRate: rate(totals.BOUNCED, totals.SENT),
    },
    perStep: sequence.steps.map((step) => ({
      stepIndex: step.order,
      subject: step.subject,
      ...(perStepCounts.get(step.order) ?? EMPTY_EVENT_COUNTS()),
    })),
  };
}

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

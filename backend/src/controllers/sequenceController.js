import * as sequenceService from '../services/sequenceService.js';
import { prisma } from '../config/db.js';

export async function create(req, res) {
  const sequence = await sequenceService.createSequence(
    req.auth.workspaceId,
    req.auth.userId,
    req.body,
  );
  res.status(201).json({ sequence });
}

export async function activate(req, res) {
  const { count } = await prisma.sequence.updateMany({
    where: { id: req.params.id, workspaceId: req.auth.workspaceId },
    data: { status: 'ACTIVE' },
  });
  if (count === 0) return res.status(404).json({ error: { message: 'Sequence not found' } });
  res.status(204).end();
}

export async function enroll(req, res) {
  const enrollment = await sequenceService.enroll(
    req.auth.workspaceId,
    req.params.id,
    req.body.contactId,
  );
  res.status(201).json({ enrollment });
}

export async function pause(req, res) {
  await sequenceService.pauseEnrollment(req.auth.workspaceId, req.params.enrollmentId);
  res.status(204).end();
}

export async function resume(req, res) {
  await sequenceService.resumeEnrollment(req.auth.workspaceId, req.params.enrollmentId);
  res.status(204).end();
}

export async function unenroll(req, res) {
  await sequenceService.unenroll(req.auth.workspaceId, req.params.enrollmentId, 'manual');
  res.status(204).end();
}

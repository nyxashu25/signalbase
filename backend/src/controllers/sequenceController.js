import * as sequenceService from '../services/sequenceService.js';
import { prisma } from '../config/db.js';

export async function index(req, res) {
  const sequences = await sequenceService.listSequences(req.auth.workspaceId);
  res.json({ sequences });
}

export async function show(req, res) {
  const sequence = await sequenceService.getSequence(req.auth.workspaceId, req.params.id);
  res.json({ sequence });
}

export async function workspaceAnalytics(req, res) {
  res.json({ analytics: await sequenceService.getWorkspaceAnalytics(req.auth.workspaceId) });
}

export async function analytics(req, res) {
  const analytics = await sequenceService.getSequenceAnalytics(req.auth.workspaceId, req.params.id);
  res.json({ analytics });
}

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
    req.reservationId,
    req.auth.userId,
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

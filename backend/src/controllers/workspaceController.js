import * as workspaceService from '../services/workspaceService.js';
import * as seatService from '../services/seatService.js';
import { ApiError } from '../middleware/errorHandler.js';

export async function members(req, res) {
  const [members, seats] = await Promise.all([
    // Owners see every member's personal balance (drives the transfer UI);
    // everyone else just sees the roster.
    workspaceService.listMembers(req.auth.workspaceId, {
      withBalances: req.auth.role === 'OWNER',
    }),
    workspaceService.seatUsage(req.auth.workspaceId),
  ]);
  res.json({ members, seats });
}

export async function listInvites(req, res) {
  res.json({ invites: await workspaceService.listInvites(req.auth.workspaceId) });
}

export async function createInvite(req, res) {
  const invite = await workspaceService.createInvite(
    req.auth.workspaceId,
    req.auth.userId,
    req.body,
  );
  res.status(201).json({ invite });
}

export async function bulkInvite(req, res) {
  const result = await workspaceService.bulkInvite(
    req.auth.workspaceId,
    req.auth.userId,
    req.body,
  );
  res.status(201).json(result);
}

export async function revokeInvite(req, res) {
  await workspaceService.revokeInvite(req.auth.workspaceId, req.params.id);
  res.status(204).end();
}

export async function changeMemberRole(req, res) {
  const member = await workspaceService.changeMemberRole(
    req.auth.workspaceId,
    req.params.userId,
    req.body.role,
  );
  res.json({ member });
}

export async function assignSeat(req, res) {
  const membership = await seatService.assignSeat(
    req.auth.workspaceId,
    req.params.userId,
    req.body.seatType,
  );
  res.json({ member: { userId: membership.userId, seatType: membership.seatType } });
}

export async function removeMember(req, res) {
  await workspaceService.removeMember(req.auth.workspaceId, req.params.userId, req.auth.userId);
  res.status(204).end();
}

export async function transferCredits(req, res) {
  const result = await workspaceService.transferToMember(
    req.auth.workspaceId,
    req.auth.userId,
    req.body.toUserId,
    req.body.amount,
  );
  res.json({ transferred: result.amount });
}

export async function teamAudit(req, res) {
  res.json(await workspaceService.teamAudit(req.auth.workspaceId));
}

export async function exportTeamAudit(req, res) {
  const csv = await workspaceService.teamAuditCsv(req.auth.workspaceId);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="team-credit-audit.csv"');
  res.send(csv);
}

export async function profile(req, res) {
  res.json({ workspace: await workspaceService.getWorkspaceProfile(req.auth.workspaceId) });
}

export async function update(req, res) {
  res.json({ workspace: await workspaceService.updateWorkspace(req.auth.workspaceId, req.body) });
}

export async function uploadLogo(req, res) {
  if (!req.file) throw new ApiError(400, 'No logo file provided');
  const workspace = await workspaceService.setLogo(req.auth.workspaceId, {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
  });
  res.json({ workspace });
}

export async function removeLogo(req, res) {
  res.json({ workspace: await workspaceService.clearLogo(req.auth.workspaceId) });
}

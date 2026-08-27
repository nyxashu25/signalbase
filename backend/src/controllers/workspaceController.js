import * as workspaceService from '../services/workspaceService.js';
import { ApiError } from '../middleware/errorHandler.js';

export async function members(req, res) {
  const [members, seats] = await Promise.all([
    workspaceService.listMembers(req.auth.workspaceId),
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

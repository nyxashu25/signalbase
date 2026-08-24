import * as workspaceService from '../services/workspaceService.js';

export async function members(req, res) {
  res.json({ members: await workspaceService.listMembers(req.auth.workspaceId) });
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

export async function rename(req, res) {
  res.json({ workspace: await workspaceService.renameWorkspace(req.auth.workspaceId, req.body.name) });
}

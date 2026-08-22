import * as workspaceService from '../services/workspaceService.js';

export async function members(req, res) {
  res.json({ members: await workspaceService.listMembers(req.auth.workspaceId) });
}

export async function rename(req, res) {
  res.json({ workspace: await workspaceService.renameWorkspace(req.auth.workspaceId, req.body.name) });
}

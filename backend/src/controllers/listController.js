import * as listService from '../services/listService.js';

export async function index(req, res) {
  const lists = await listService.listLists(req.auth.workspaceId);
  res.json({ lists });
}

export async function create(req, res) {
  const list = await listService.createList(req.auth.workspaceId, req.auth.userId, req.body);
  res.status(201).json({ list });
}

export async function show(req, res) {
  const list = await listService.getList(req.auth.workspaceId, req.params.id);
  res.json({ list });
}

export async function destroy(req, res) {
  await listService.deleteList(req.auth.workspaceId, req.params.id);
  res.status(204).end();
}

export async function addItem(req, res) {
  const item = await listService.addItem(req.auth.workspaceId, req.params.id, req.body);
  res.status(201).json({ item });
}

export async function removeItem(req, res) {
  await listService.removeItem(req.auth.workspaceId, req.params.id, req.params.itemId);
  res.status(204).end();
}

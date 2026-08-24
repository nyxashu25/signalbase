import * as apiKeyService from '../services/apiKeyService.js';

export async function list(req, res) {
  res.json({ keys: await apiKeyService.listApiKeys(req.auth.userId) });
}

export async function create(req, res) {
  const result = await apiKeyService.createApiKey(req.auth.userId, req.body.name);
  // 201 with the full key — the only response that ever contains it.
  res.status(201).json(result);
}

export async function revoke(req, res) {
  res.json(await apiKeyService.revokeApiKey(req.auth.userId, req.params.id));
}

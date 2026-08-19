import * as adminAuthService from '../services/adminAuthService.js';

export async function login(req, res) {
  const result = await adminAuthService.login(req.body);
  res.json(result);
}

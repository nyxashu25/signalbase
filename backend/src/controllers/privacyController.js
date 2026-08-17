import * as privacyService from '../services/privacyService.js';

export async function optOut(req, res) {
  const result = await privacyService.requestErasure(req.body.email, req.body.reason);
  res.status(202).json({ acknowledged: true, ...result });
}

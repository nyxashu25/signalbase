import * as webhookService from '../services/webhookService.js';

export async function esp(req, res) {
  await webhookService.processWebhookPayload(req.body);
  res.status(204).end();
}

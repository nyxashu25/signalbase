import * as notificationService from '../services/notificationService.js';

export async function unsubscribe(req, res) {
  res.json(await notificationService.unsubscribeUser(req.body.token));
}

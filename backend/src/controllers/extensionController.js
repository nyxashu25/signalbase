import * as extensionService from '../services/extensionService.js';
import * as revealService from '../services/revealService.js';

export async function observe(req, res) {
  res.json(await extensionService.observeProfile(req.auth, req.body));
}

export async function reveal(req, res) {
  const result = await revealService.revealContactEmail({
    workspaceId: req.auth.workspaceId,
    userId: req.auth.userId,
    contactId: req.params.id,
    reservationId: req.reservationId,
    reason: 'EXTENSION_REVEAL',
  });
  res.json(result);
}

export async function status(req, res) {
  res.json(await extensionService.extensionStatus(req.auth));
}

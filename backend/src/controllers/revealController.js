import * as revealService from '../services/revealService.js';

export async function reveal(req, res) {
  const result = await revealService.revealContactEmail({
    workspaceId: req.auth.workspaceId,
    userId: req.auth.userId,
    contactId: req.params.id,
    reservationId: req.reservationId,
  });
  res.json(result);
}

import * as extensionService from '../services/extensionService.js';
import * as revealService from '../services/revealService.js';
import { companyQuerySchema } from '../validators/extensionValidators.js';
import { ApiError } from '../middleware/errorHandler.js';

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

export async function lookup(req, res) {
  res.json(await extensionService.lookupEmails(req.auth, req.body.emails));
}

export async function company(req, res) {
  const parsed = companyQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, 'A website address is required (?domain=acme.com)');
  res.json(await extensionService.lookupCompany(req.auth, parsed.data.domain));
}

export async function person(req, res) {
  res.json(await extensionService.lookupPerson(req.auth, req.body));
}

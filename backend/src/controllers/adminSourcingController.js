import * as sourcingService from '../services/sourcingService.js';

export async function listMissingPersons(req, res) {
  res.json(await sourcingService.listMissingPersons(req.validatedQuery));
}

export async function resolveMissingPerson(req, res) {
  res.json({
    missingPerson: await sourcingService.resolveMissingPerson(
      req.params.id,
      req.body.resolution,
      req.superAdmin.adminId,
    ),
  });
}

export async function listLostChildren(req, res) {
  res.json(await sourcingService.listLostChildren(req.validatedQuery));
}

export async function resolveLostChild(req, res) {
  res.json({
    lostChild: await sourcingService.resolveLostChild(
      req.params.id,
      req.body.resolution,
      req.superAdmin.adminId,
    ),
  });
}

export async function counts(req, res) {
  res.json(await sourcingService.pendingSourcingCounts());
}

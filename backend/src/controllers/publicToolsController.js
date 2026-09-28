import { checkEmail } from '../services/emailCheckService.js';
import { findPublicEmail } from '../services/publicFinderService.js';
import { listEmailFormatsJson, getEmailFormat } from '../services/emailFormatService.js';
import { ApiError } from '../middleware/errorHandler.js';

export async function verifyEmail(req, res) {
  res.json(await checkEmail(req.body.email));
}

export async function findEmail(req, res) {
  res.json(await findPublicEmail(req.body));
}

export async function listFormats(req, res) {
  // Already-serialized JSON straight from the cache (see listEmailFormatsJson).
  res.type('application/json').send(await listEmailFormatsJson());
}

export async function getFormat(req, res) {
  const format = await getEmailFormat(req.params.domain);
  if (!format) throw new ApiError(404, 'No email format data for this domain');
  res.json(format);
}

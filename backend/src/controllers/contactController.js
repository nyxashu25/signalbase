import { logger } from '../config/logger.js';

// No real mail/CRM provider wired up yet — same stub philosophy as
// espService/emailVerifierService: logged, not delivered, so the form is
// fully exercisable without a third-party account. TODO once one exists:
// forward to sales inbox / CRM lead capture.
export async function submitContactRequest(req, res) {
  logger.info({ ...req.body }, 'Contact form submission received');
  res.status(204).end();
}

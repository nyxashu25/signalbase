import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

// No real mail/CRM provider wired up yet — same stub philosophy as
// espService/emailVerifierService: logged, not delivered, so the form is
// fully exercisable without a third-party account. TODO once one exists:
// forward to sales inbox / CRM lead capture.
export async function submitContactRequest(req, res) {
  const { category, email } = req.body;

  // Support/Enterprise tickets (raised from the in-app chat widget) are
  // gated to existing accounts — the general Contact page stays open to
  // anyone, since a prospect filling that one out has no account yet.
  if (category !== 'general') {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      throw new ApiError(
        422,
        'That email isn’t associated with a DataPit account. Use the email registered to your workspace.',
      );
    }
  }

  logger.info({ ...req.body }, 'Contact form submission received');
  res.status(204).end();
}
